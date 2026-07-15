import os
import sys
import uuid
import asyncio
import json
from typing import List, Optional, Dict, Any

import io
import hashlib
from fastapi import FastAPI, BackgroundTasks, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from firebase_client import db  # inicializa Firebase al arrancar
from db import (
    crear_proyecto, actualizar_proyecto, obtener_proyecto,
    listar_proyectos, proyecto_existe,
    guardar_mensaje_chat, obtener_historial_chat,
    obtener_usuario, listar_usuarios, actualizar_rol_usuario,
    crear_o_invitar_usuario, eliminar_usuario, actualizar_estado_usuario,
    obtener_proyecto_por_repo,
    eliminar_chat_proyecto,
)
from discovery_graph import build_discovery_graph
from tracking_graph import build_tracking_graph, simular_evidencias
from schemas import (
    DiscoveryState,
    TrackingState,
    PropuestaTecnica,
    EstadoRepo,
    Hito,
    BacklogScrum,
    propuesta_to_dict,
    dict_to_propuesta,
)

load_dotenv()

app = FastAPI(title="Trazabilidad AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════
# MODELOS DE REQUEST
# ══════════════════════════════════════════════════════════════════════
class ProjectStartRequest(BaseModel):
    idea: str
    stack: List[str]
    alumnoId: str
    nombre: str


class TrackingStartRequest(BaseModel):
    alumnoId: str
    proyectoId: str


class ConfigurationRequest(BaseModel):
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    rol: str


class UpdateUserStatusRequest(BaseModel):
    deshabilitado: bool



class InviteUserRequest(BaseModel):
    email: str
    rol: str
    nombre: Optional[str] = None
    password: Optional[str] = None

# ══════════════════════════════════════════════════════════════════════
# TAREA BACKGROUND — DISCOVERY
# ══════════════════════════════════════════════════════════════════════
async def run_discovery_task(
    proyecto_id: str, idea: str, stack: List[str], nombre: str
):
    try:
        graph = build_discovery_graph()
        initial_state = DiscoveryState(
            proyecto_id=proyecto_id,
            idea_alumno=idea,
            stack_tentativo=stack,
            max_iteraciones=3,
        )
        result_dict = await graph.ainvoke(initial_state)
        result = DiscoveryState(**result_dict)

        propuesta = result.propuesta
        if propuesta:
            propuesta_data = propuesta_to_dict(propuesta)
            hitos_data = propuesta_data.get("hitos", [])

            hitos_formatted = [
                {
                    "nombre": h.get("nombre", "Sin nombre"),
                    "descripcion": h.get("descripcion", ""),
                    "semana": h.get("semana_sugerida", 1),
                    "tareas": h.get("tareas", []),
                    "evidencias": h.get("evidencias_esperadas", []),
                }
                for h in hitos_data
            ]

            backlog_formatted = []
            for story in result.backlog_po or []:
                if isinstance(story, str):
                    backlog_formatted.append(
                        {
                            "titulo": story,
                            "como": "usuario",
                            "quiero": story,
                            "para": "mejorar el sistema",
                            "prioridad": "Media",
                        }
                    )
                elif isinstance(story, dict):
                    backlog_formatted.append(story)

            # Serializar backlog_scrum si el agente lo generó
            backlog_scrum_data = None
            if result.backlog_scrum:
                backlog_scrum_data = result.backlog_scrum.model_dump()

            try:
                actualizar_proyecto(proyecto_id, {
                    "status": "pending_approval",
                    "scoreValidator": result.score_validator or 0,
                    "propuesta": {
                        "nombre": propuesta.tema or nombre,
                        "descripcion": propuesta.descripcion or idea,
                        "hitos": hitos_formatted,
                        "backlog": backlog_formatted,
                    },
                    # Backlog Scrum estructurado (Épicas, HU, Sprints)
                    "backlog_scrum": backlog_scrum_data,
                    # Guardamos la propuesta completa para el tracking
                    "_propuesta_raw": propuesta_data,
                })
            except Exception as db_err:
                print(f"[ERROR] Error al guardar en Firestore: {db_err}")
                raise

            print(f"[OK] Proyecto {proyecto_id} procesado exitosamente.")
        else:
            actualizar_proyecto(proyecto_id, {
                "status": "error",
                "error": "No se pudo generar la propuesta.",
            })

    except Exception as e:
        print(f"[ERROR] Error en discovery task: {e}")
        import traceback
        traceback.print_exc()
        try:
            actualizar_proyecto(proyecto_id, {"status": "error", "error": str(e)})
        except Exception:
            pass


# ══════════════════════════════════════════════════════════════════════
# TAREA BACKGROUND — TRACKING
# ══════════════════════════════════════════════════════════════════════
async def run_tracking_task(proyecto_id: str, alumno_id: str):
    try:
        project = obtener_proyecto(proyecto_id)
        if not project:
            print(f"[ERROR] Tracking: proyecto {proyecto_id} no encontrado.")
            return

        # Reconstruir PropuestaTecnica desde Firestore
        propuesta_confirmada = None
        propuesta_raw = project.get("_propuesta_raw")
        if propuesta_raw:
            propuesta_confirmada = dict_to_propuesta(propuesta_raw)

        repo_url = project.get("repo_url")
        demo_url = project.get("demo_url")

        estado_repo = EstadoRepo(
            repo_url=repo_url,
            demo_url=demo_url,
            ci_status="unknown",
            demo_activa=False
        )

        # Estado inicial para el tracking en Firestore
        actualizar_proyecto(proyecto_id, {
            "tracking_status": "processing",
            "tracking_active_agent": "ag_devops",
            "tracking_progress": 15,
            "tracking_detail": "Inspeccionando commits y repositorio en GitHub..."
        })

        initial_state = TrackingState(
            alumno_id=alumno_id,
            propuesta_confirmada=propuesta_confirmada,
            estado_repo=estado_repo,
        )

        # ── Nodo 1: DevOps ──
        actualizar_proyecto(proyecto_id, {
            "tracking_active_agent": "ag_devops",
            "tracking_progress": 25,
            "tracking_detail": "Agente DevOps analizando integridad de pipelines y ramas..."
        })
        from tracking_graph import devops_node, competency_node, analyst_node, reporter_node
        
        devops_res = await devops_node(initial_state)
        # Mezclamos el estado
        state_after_devops = TrackingState(
            alumno_id=alumno_id,
            propuesta_confirmada=propuesta_confirmada,
            estado_repo=devops_res["estado_repo"],
            evidencias=devops_res["evidencias"]
        )

        # ── Nodo 2: Competencias ──
        actualizar_proyecto(proyecto_id, {
            "tracking_active_agent": "ag_comp",
            "tracking_progress": 50,
            "tracking_detail": "Agente de Competencias validando commits y asociándolos a hitos académicos..."
        })
        comp_res = await competency_node(state_after_devops)
        state_after_comp = TrackingState(
            alumno_id=alumno_id,
            propuesta_confirmada=propuesta_confirmada,
            estado_repo=state_after_devops.estado_repo,
            evidencias=state_after_devops.evidencias,
            reporte_competencias=comp_res["reporte_competencias"]
        )

        # ── Nodo 3: Analista de Integridad ──
        actualizar_proyecto(proyecto_id, {
            "tracking_active_agent": "ag_003_analyst",
            "tracking_progress": 75,
            "tracking_detail": "Agente Analista evaluando el score final de integridad y generando alertas de desvío..."
        })
        analyst_res = await analyst_node(state_after_comp)
        state_after_analyst = TrackingState(
            alumno_id=alumno_id,
            propuesta_confirmada=propuesta_confirmada,
            estado_repo=state_after_comp.estado_repo,
            evidencias=state_after_comp.evidencias,
            reporte_competencias=state_after_comp.reporte_competencias,
            score_integridad=analyst_res["score_integridad"],
            alertas=analyst_res["alertas"],
            diagnostico_riesgo=analyst_res["diagnostico_riesgo"]
        )

        # ── Nodo 4: Reportero Final ──
        actualizar_proyecto(proyecto_id, {
            "tracking_active_agent": "ag_004_reporter",
            "tracking_progress": 90,
            "tracking_detail": "Agente Reportero generando el resumen ejecutivo final y balance del ciclo..."
        })
        reporter_res = await reporter_node(state_after_analyst)
        
        result = TrackingState(
            alumno_id=alumno_id,
            propuesta_confirmada=propuesta_confirmada,
            estado_repo=state_after_analyst.estado_repo,
            evidencias=state_after_analyst.evidencias,
            reporte_competencias=state_after_analyst.reporte_competencias,
            score_integridad=state_after_analyst.score_integridad,
            alertas=state_after_analyst.alertas,
            diagnostico_riesgo=state_after_analyst.diagnostico_riesgo,
            resumen_ejecutivo=reporter_res["resumen_ejecutivo"]
        )

        # Registrar en el historial de avance temporal
        import datetime
        fecha_actual = datetime.datetime.utcnow().isoformat()[:16].replace("T", " ")
        nuevo_historico = {
            "fecha": fecha_actual,
            "score_integridad": float(result.score_integridad),
            "porcentaje_competencias": float(result.reporte_competencias.porcentaje_adquirido) if result.reporte_competencias else 0.0
        }
        
        historial = project.get("tracking_history", [])
        if not isinstance(historial, list):
            historial = []
        historial.append(nuevo_historico)

        # ── AUTO-COMPLETAR TAREAS DEL KANBAN/BACKLOG SCRUM BASADO EN COMMITS ──
        backlog_scrum = project.get("backlog_scrum", {})
        if backlog_scrum and "epicas" in backlog_scrum and result.estado_repo and result.estado_repo.commits:
            commits = result.estado_repo.commits
            for epica in backlog_scrum["epicas"]:
                if "items" in epica:
                    for item in epica["items"]:
                        # Mapear por concordancia de ID de tarea (ej: HU-001) o palabras clave del título en los mensajes de commits
                        match_id = item.get("id", "").lower()
                        match_titulo = item.get("titulo", "").lower()
                        
                        rel_commits = []
                        for c in commits:
                            msg = c.mensaje.lower()
                            # Validamos si menciona el ID de la tarea o palabras clave importantes del título
                            if match_id in msg or (len(match_titulo) > 5 and match_titulo in msg):
                                rel_commits.append(c)
                        
                        if rel_commits:
                            # Si los commits están alineados y son constructivos, marcamos como done
                            all_alineados = all(getattr(c, "alineado", True) for c in rel_commits)
                            if all_alineados:
                                item["estado"] = "done"
                                print(f"[AUTO-KANBAN] Tarea {item.get('id')} marcada como DONE basada en commits.")
                            else:
                                item["estado"] = "in_progress"
                                print(f"[AUTO-KANBAN] Tarea {item.get('id')} marcada como IN_PROGRESS por commits bajo revisión.")
        
        # Serializar resultados a Firestore
        tracking_data = {
            "score_integridad": result.score_integridad,
            "diagnostico_riesgo": result.diagnostico_riesgo,
            "resumen_ejecutivo": result.resumen_ejecutivo,
            "alertas": [a.model_dump() for a in result.alertas],
            "reporte_competencias": (
                result.reporte_competencias.model_dump()
                if result.reporte_competencias
                else None
            ),
            "estado_repo": (
                result.estado_repo.model_dump() if result.estado_repo else None
            ),
            "evidencias": [e.model_dump() for e in result.evidencias],
        }
        try:
            actualizar_proyecto(proyecto_id, {
                "tracking": tracking_data,
                "tracking_status": "completed",
                "tracking_history": historial,
                "backlog_scrum": backlog_scrum
            })
        except Exception as db_err:
            print(f"[ERROR] Error al guardar tracking en Firestore: {db_err}")
            raise

        print(f"[OK] Tracking {proyecto_id} completado.")

    except Exception as e:
        print(f"[ERROR] Error en tracking task: {e}")
        import traceback
        traceback.print_exc()
        try:
            actualizar_proyecto(proyecto_id, {
                "tracking_status": "error",
                "tracking_error": str(e),
            })
        except Exception:
            pass


# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS — DISCOVERY
# ══════════════════════════════════════════════════════════════════════
@app.post("/proyectos/iniciar")
async def iniciar_proyecto(req: ProjectStartRequest, background_tasks: BackgroundTasks):
    proyecto_id = f"proj-{os.urandom(4).hex()}"
    try:
        crear_proyecto(proyecto_id, {
            "status": "processing",
            "progress": 5,
            "status_detail": "Iniciando agentes de co-creación...",
            "active_agent": "drafter",
            "alumnoId": req.alumnoId,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear proyecto: {e}")
    print(f"[START] Proyecto {proyecto_id} iniciado para alumno {req.alumnoId}")
    background_tasks.add_task(
        run_discovery_task, proyecto_id, req.idea, req.stack, req.nombre
    )
    return {"proyectoId": proyecto_id, "status": "processing"}


@app.get("/proyectos/{proyecto_id}/status")
async def get_status(proyecto_id: str):
    try:
        project = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    # No exponemos el raw al frontend
    return {k: v for k, v in project.items() if not k.startswith("_")}


# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS — TRACKING
# ══════════════════════════════════════════════════════════════════════
@app.post("/proyectos/{proyecto_id}/tracking/iniciar")
async def iniciar_tracking(
    proyecto_id: str,
    req: TrackingStartRequest,
    background_tasks: BackgroundTasks,
):
    try:
        project = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    try:
        actualizar_proyecto(proyecto_id, {"tracking_status": "processing"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")

    print(f"[TRACKING] Iniciando tracking para proyecto {proyecto_id}")

    background_tasks.add_task(run_tracking_task, proyecto_id, req.alumnoId)
    return {"proyectoId": proyecto_id, "tracking_status": "processing"}


@app.post("/proyectos/{proyecto_id}/configuracion")
async def guardar_configuracion(proyecto_id: str, req: ConfigurationRequest):
    try:
        project = obtener_proyecto(proyecto_id)
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        actualizar_proyecto(proyecto_id, {
            "repo_url": req.repo_url,
            "demo_url": req.demo_url,
        })
        print(f"[CONFIG] URLs actualizadas para proyecto {proyecto_id}: repo={req.repo_url}, demo={req.demo_url}")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar configuración: {e}")


@app.get("/proyectos/alumno/{alumno_id}")
async def get_proyecto_alumno(alumno_id: str):
    """Busca el proyecto de un alumno por su ID."""
    try:
        from db import obtener_proyecto_por_alumno
        p = obtener_proyecto_por_alumno(alumno_id)
        if not p:
            return {"proyectoId": None}
        return {k: v for k, v in p.items() if not k.startswith("_")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/proyectos/{proyecto_id}/tracking/status")
async def get_tracking_status(proyecto_id: str):
    try:
        project = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    tracking_status = project.get("tracking_status", "not_started")
    tracking_data = project.get("tracking", {})
    if isinstance(tracking_data, dict):
        tracking_data["tracking_history"] = project.get("tracking_history", [])

    return {
        "proyectoId": proyecto_id,
        "tracking_status": tracking_status,
        "tracking": tracking_data,
        "tracking_active_agent": project.get("tracking_active_agent", "ag_devops"),
        "tracking_progress": project.get("tracking_progress", 0),
        "tracking_detail": project.get("tracking_detail", "Cargando análisis..."),
    }


# ══════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════
@app.get("/health")
async def health():
    try:
        count = len(listar_proyectos())
    except Exception:
        count = -1
    return {"status": "ok", "proyectos_en_firestore": count}


# ══════════════════════════════════════════════════════════════════════
# MODELOS DE REQUEST — PROFESOR
# ══════════════════════════════════════════════════════════════════════
class AprobarRoadmapRequest(BaseModel):
    comentario: str


class RechazarRoadmapRequest(BaseModel):
    motivo: str


class ValidarHitoRequest(BaseModel):
    validado: bool
    feedback: str


class RevisarTareasHitoRequest(BaseModel):
    estado_hito: str  # "validado" o "observado"
    tareas_estado: List[str]
    tareas_comentarios: List[str]


class RevisarBacklogRequest(BaseModel):
    estado_revision: str  # "aprobado" o "observado"
    comentario_revision: Optional[str] = None



# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS — PROFESOR
# ══════════════════════════════════════════════════════════════════════
@app.get("/profesor/proyectos")
async def listar_proyectos_profesor():
    """Lista todos los proyectos con resumen para la vista del profesor."""
    try:
        proyectos = listar_proyectos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")

    resultado = []
    for proyecto in proyectos:
        proyecto_id = proyecto.get("proyectoId", "")
        tracking = proyecto.get("tracking", {})
        alertas = tracking.get("alertas", []) if tracking else []
        alertas_criticas = sum(1 for a in alertas if a.get("severidad") == "critica")

        reporte_competencias = tracking.get("reporte_competencias") if tracking else None
        porcentaje_competencias = 0.0
        if reporte_competencias and isinstance(reporte_competencias, dict):
            porcentaje_competencias = float(reporte_competencias.get("porcentaje_adquirido", 0.0))

        alumno_id = proyecto.get("alumnoId", "")
        alumno_nombre = alumno_id
        alumno_email = ""
        if alumno_id:
            try:
                alumno_info = obtener_usuario(alumno_id)
                if alumno_info:
                    alumno_nombre = alumno_info.get("nombre", alumno_id)
                    alumno_email = alumno_info.get("email", "")
            except Exception:
                pass

        resultado.append({
            "proyectoId": proyecto_id,
            "nombre": proyecto.get("propuesta", {}).get("nombre", proyecto_id),
            "alumnoId": alumno_id,
            "alumnoNombre": alumno_nombre,
            "alumnoEmail": alumno_email,
            "status": proyecto.get("status", "processing"),
            "scoreValidator": proyecto.get("scoreValidator", 0),
            "tracking_status": proyecto.get("tracking_status", "not_started"),
            "score_integridad": float(tracking.get("score_integridad", 0.0)) if tracking else 0.0,
            "alertas_criticas": alertas_criticas,
            "porcentaje_competencias": porcentaje_competencias,
        })
    return resultado


@app.get("/profesor/proyectos/{proyecto_id}")
async def detalle_proyecto_profesor(proyecto_id: str):
    """Devuelve el detalle completo de un proyecto (sin campos privados _*)."""
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Excluir campos que empiezan con _
    res = {k: v for k, v in proyecto.items() if not k.startswith("_")}
    
    # Resolver nombre del alumno
    alumno_id = res.get("alumnoId", "")
    res["alumnoNombre"] = alumno_id
    res["alumnoEmail"] = ""
    if alumno_id:
        try:
            alumno_info = obtener_usuario(alumno_id)
            if alumno_info:
                res["alumnoNombre"] = alumno_info.get("nombre", alumno_id)
                res["alumnoEmail"] = alumno_info.get("email", "")
        except Exception:
            pass
            
    return res


@app.post("/profesor/proyectos/{proyecto_id}/aprobar-roadmap")
async def aprobar_roadmap(proyecto_id: str, req: AprobarRoadmapRequest):
    """Aprueba el roadmap de un proyecto, cambia status a 'active'."""
    try:
        if not proyecto_existe(proyecto_id):
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        actualizar_proyecto(proyecto_id, {
            "status": "active",
            "comentario_profesor": req.comentario,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")
    return {"ok": True}


@app.post("/profesor/proyectos/{proyecto_id}/rechazar-roadmap")
async def rechazar_roadmap(proyecto_id: str, req: RechazarRoadmapRequest):
    """Rechaza el roadmap de un proyecto, cambia status a 'rejected'."""
    try:
        if not proyecto_existe(proyecto_id):
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        actualizar_proyecto(proyecto_id, {
            "status": "rejected",
            "motivo_rechazo": req.motivo,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")
    return {"ok": True}


@app.post("/profesor/proyectos/{proyecto_id}/hitos/{hito_index}/validar")
async def validar_hito(proyecto_id: str, hito_index: int, req: ValidarHitoRequest):
    """Valida un hito específico de un proyecto."""
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    hitos = proyecto.get("propuesta", {}).get("hitos", [])
    if hito_index < 0 or hito_index >= len(hitos):
        raise HTTPException(status_code=404, detail="Hito no encontrado")

    # Mutar localmente el array y actualizarlo completo en Firestore
    hitos[hito_index]["validado_por_profesor"] = req.validado
    hitos[hito_index]["feedback_profesor"] = req.feedback

    try:
        actualizar_proyecto(proyecto_id, {"propuesta.hitos": hitos})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")
    return {"ok": True}


@app.post("/profesor/proyectos/{proyecto_id}/hitos/{hito_index}/revisar-tareas")
async def revisar_tareas_hito(proyecto_id: str, hito_index: int, req: RevisarTareasHitoRequest):
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    hitos = proyecto.get("propuesta", {}).get("hitos", [])
    if hito_index < 0 or hito_index >= len(hitos):
        raise HTTPException(status_code=404, detail="Hito no encontrado")

    hitos[hito_index]["estado_hito"] = req.estado_hito
    hitos[hito_index]["tareas_estado"] = req.tareas_estado
    hitos[hito_index]["tareas_comentarios"] = req.tareas_comentarios
    
    if req.estado_hito == "validado":
        hitos[hito_index]["validado_por_profesor"] = True
        hitos[hito_index]["feedback_profesor"] = "Hito validado."
    else:
        hitos[hito_index]["validado_por_profesor"] = False
        obs = [c for c in req.tareas_comentarios if c]
        hitos[hito_index]["feedback_profesor"] = " | ".join(obs) if obs else "Hito observado por el docente."

    try:
        actualizar_proyecto(proyecto_id, {"propuesta.hitos": hitos})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")
    return {"ok": True}


@app.post("/profesor/proyectos/{proyecto_id}/backlog/{item_id}/revisar")
async def revisar_backlog_item(proyecto_id: str, item_id: str, req: RevisarBacklogRequest):
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    backlog_scrum = proyecto.get("backlog_scrum")
    if not backlog_scrum or "epicas" not in backlog_scrum:
        raise HTTPException(status_code=404, detail="Backlog Scrum no encontrado")

    found = False
    for epica in backlog_scrum.get("epicas", []):
        for item in epica.get("items", []):
            if item.get("id") == item_id:
                item["estado_revision"] = req.estado_revision
                item["comentario_revision"] = req.comentario_revision
                found = True
                break
        if found:
            break

    if not found:
        raise HTTPException(status_code=404, detail="Item de backlog no encontrado")

    try:
        actualizar_proyecto(proyecto_id, {"backlog_scrum": backlog_scrum})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")
    return {"ok": True}


class EnviarCorreccionHitoRequest(BaseModel):
    tareas_corregidas: Optional[List[str]] = None


class CorregirBacklogItemRequest(BaseModel):
    titulo: Optional[str] = None
    historia_completa: Optional[str] = None


import re

def parse_historia_usuario(text: str) -> tuple[str, str, str]:
    # Patron regex para "Como [rol], quiero [accion] para [beneficio]"
    patron = r"(?is)^\s*como\s+(.*?)\s*,\s*quiero\s+(.*?)\s+para\s+(.*)$"
    match = re.match(patron, text)
    if match:
        return match.group(1).strip(), match.group(2).strip(), match.group(3).strip()
    return "usuario", text.strip(), "mejorar el sistema"


@app.post("/proyectos/{proyecto_id}/hitos/{hito_index}/enviar-correccion")
async def enviar_correccion_hito(proyecto_id: str, hito_index: int, req: EnviarCorreccionHitoRequest):
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    hitos = proyecto.get("propuesta", {}).get("hitos", [])
    if hito_index < 0 or hito_index >= len(hitos):
        raise HTTPException(status_code=404, detail="Hito no encontrado")

    # Bloqueo de edición post-validación (RN-003)
    current_hito = hitos[hito_index]
    if current_hito.get("validado_por_profesor") is True or current_hito.get("estado_hito") == "validado":
        raise HTTPException(
            status_code=403,
            detail="El hito ya está validado por el docente y no puede ser modificado (inmutabilidad de datos)."
        )

    hitos[hito_index]["estado_hito"] = "corregido"
    if req.tareas_corregidas:
        hitos[hito_index]["tareas"] = req.tareas_corregidas

    if "tareas_estado" in hitos[hito_index]:
        hitos[hito_index]["tareas_estado"] = [
            "corregido" if st == "observado" else st
            for st in hitos[hito_index]["tareas_estado"]
        ]

    try:
        actualizar_proyecto(proyecto_id, {"propuesta.hitos": hitos})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")
    return {"ok": True}


@app.post("/proyectos/{proyecto_id}/backlog/{item_id}/corregir")
async def corregir_backlog_item(proyecto_id: str, item_id: str, req: CorregirBacklogItemRequest):
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    backlog_scrum = proyecto.get("backlog_scrum")
    if not backlog_scrum or "epicas" not in backlog_scrum:
        raise HTTPException(status_code=404, detail="Backlog Scrum no encontrado")

    found = False
    for epica in backlog_scrum.get("epicas", []):
        for item in epica.get("items", []):
            if item.get("id") == item_id:
                # Bloqueo de edición post-validación (RN-003)
                if item.get("estado_revision") == "aprobado":
                    raise HTTPException(
                        status_code=403,
                        detail="El ítem del backlog ya fue aprobado por el docente y no puede ser modificado (inmutabilidad de datos)."
                    )
                item["estado_revision"] = "corregido"
                if req.titulo:
                    item["titulo"] = req.titulo
                if req.historia_completa:
                    como, quiero, para = parse_historia_usuario(req.historia_completa)
                    item["como"] = como
                    item["quiero"] = quiero
                    item["para"] = para
                found = True
                break
        if found:
            break

    if not found:
        raise HTTPException(status_code=404, detail="Item de backlog no encontrado")

    try:
        actualizar_proyecto(proyecto_id, {"backlog_scrum": backlog_scrum})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")
    return {"ok": True}


class UpdateBacklogEstadoRequest(BaseModel):
    estado: str  # "backlog" | "todo" | "in_progress" | "done"


@app.post("/proyectos/{proyecto_id}/backlog/{item_id}/estado")
async def actualizar_estado_backlog_item(proyecto_id: str, item_id: str, req: UpdateBacklogEstadoRequest):
    """Actualiza el campo 'estado' (kanban) de un ítem del backlog."""
    VALID_ESTADOS = {"backlog", "todo", "in_progress", "done"}
    if req.estado not in VALID_ESTADOS:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Debe ser uno de: {VALID_ESTADOS}")

    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    backlog_scrum = proyecto.get("backlog_scrum")
    if not backlog_scrum or "epicas" not in backlog_scrum:
        raise HTTPException(status_code=404, detail="Backlog Scrum no encontrado")

    found = False
    for epica in backlog_scrum.get("epicas", []):
        for item in epica.get("items", []):
            if item.get("id") == item_id:
                item["estado"] = req.estado
                found = True
                break
        if found:
            break

    if not found:
        raise HTTPException(status_code=404, detail="Item de backlog no encontrado")

    try:
        actualizar_proyecto(proyecto_id, {"backlog_scrum": backlog_scrum})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")
    return {"ok": True}



class UpdateDraftRequest(BaseModel):
    hitos: Optional[List[Hito]] = None
    backlog_scrum: Optional[BacklogScrum] = None


@app.post("/proyectos/{proyecto_id}/update-draft")
async def actualizar_borrador_proyecto(proyecto_id: str, req: UpdateDraftRequest):
    try:
        if not proyecto_existe(proyecto_id):
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        updates = {}
        if req.hitos is not None:
            # Serializamos la lista de hitos a diccionarios simples compatibles con firestore
            updates["propuesta.hitos"] = [json.loads(h.model_dump_json()) for h in req.hitos]
        if req.backlog_scrum is not None:
            # Serializamos backlog_scrum a diccionarios simples compatibles con firestore
            updates["backlog_scrum"] = json.loads(req.backlog_scrum.model_dump_json())
            
        if updates:
            print(f"[DRAFT] Actualizando borrador para {proyecto_id} con llaves: {list(updates.keys())}")
            actualizar_proyecto(proyecto_id, updates)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al actualizar borrador en BD: {str(e)}")
    return {"ok": True}



# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS — CHAT
# ══════════════════════════════════════════════════════════════════════
class ChatMensajeRequest(BaseModel):
    role: str  # "user" o "assistant"
    content: str
    timestamp: str  # ISO string


@app.post("/proyectos/{proyecto_id}/chat/mensaje")
async def guardar_mensaje(proyecto_id: str, req: ChatMensajeRequest):
    try:
        if not proyecto_existe(proyecto_id):
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        guardar_mensaje_chat(proyecto_id, req.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar mensaje: {e}")
    return {"ok": True}


@app.get("/proyectos/{proyecto_id}/chat/historial")
async def get_historial(proyecto_id: str):
    try:
        if not proyecto_existe(proyecto_id):
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        historial = obtener_historial_chat(proyecto_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer historial: {e}")
    return {"historial": historial}


# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS — ADMINISTRADOR
# ══════════════════════════════════════════════════════════════════════
@app.get("/admin/usuarios")
async def get_usuarios():
    try:
        return listar_usuarios()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/usuarios/{uid}/rol")
async def update_user_role(uid: str, req: UpdateRoleRequest):
    try:
        actualizar_rol_usuario(uid, req.rol)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/usuarios/invitar")
async def invite_user(req: InviteUserRequest):
    try:
        invited_id = crear_o_invitar_usuario(req.email, req.rol, req.nombre, req.password)
        return {"ok": True, "uid": invited_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/admin/usuarios/{uid}")
async def delete_user(uid: str):
    try:
        eliminar_usuario(uid)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/usuarios/{uid}/estado-cuenta")
async def change_user_status(uid: str, req: UpdateUserStatusRequest):
    try:
        actualizar_estado_usuario(uid, req.deshabilitado)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS — AUDITORÍA DE BACKLOG (DOCENTE)
# ══════════════════════════════════════════════════════════════════════

class BacklogAuditRequest(BaseModel):
    backlog_csv: Optional[str] = None         # Texto CSV completo
    backlog_notion_url: Optional[str] = None  # URL pública de Notion
    repo_url: Optional[str] = None            # Opcional: sobreescribe el del proyecto


async def run_backlog_audit_task(proyecto_id: str, backlog_raw: str, backlog_source: str, repo_url: str):
    """Background task que corre el grafo de auditoría de backlog."""
    try:
        from backlog_audit_graph import build_backlog_audit_graph
        from schemas import BacklogAuditState

        print(f"[BACKLOG-AUDIT] Iniciando auditoría para proyecto {proyecto_id}")

        initial_state = BacklogAuditState(
            proyecto_id=proyecto_id,
            repo_url=repo_url,
            backlog_raw=backlog_raw,
            backlog_source=backlog_source,
        )

        graph = build_backlog_audit_graph()
        result_dict = await graph.ainvoke(initial_state)
        result = BacklogAuditState(**result_dict)

        # Serializar y guardar en Firestore
        audit_data = {
            "audit_status": "error" if result.error else "completed",
            "semaforo": result.semaforo.value if result.semaforo else "rojo",
            "porcentaje_correspondencia": result.porcentaje_correspondencia,
            "audit_results": [r.model_dump() for r in result.audit_results],
            "desviaciones": result.desviaciones,
            "reporte_texto": result.reporte_texto,
            "code_summary": result.code_summary.model_dump() if result.code_summary else None,
            "backlog_items_count": len(result.backlog_items),
            "error": result.error,
        }

        actualizar_proyecto(proyecto_id, {"backlog_audit": audit_data})
        print(f"[BACKLOG-AUDIT] Auditoría {proyecto_id} completada. Semáforo: {result.semaforo}")

    except Exception as e:
        print(f"[BACKLOG-AUDIT-ERROR] {e}")
        import traceback
        traceback.print_exc()
        try:
            actualizar_proyecto(proyecto_id, {
                "backlog_audit": {
                    "audit_status": "error",
                    "error": str(e),
                }
            })
        except Exception:
            pass


@app.post("/profesor/proyectos/{proyecto_id}/backlog-audit")
async def iniciar_backlog_audit(
    proyecto_id: str,
    req: BacklogAuditRequest,
    background_tasks: BackgroundTasks,
):
    """Inicia la auditoría de avances: compara el backlog del alumno con su código GitHub."""
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Determinar source y raw
    if req.backlog_notion_url and req.backlog_notion_url.strip():
        backlog_raw = req.backlog_notion_url.strip()
        backlog_source = "notion"
    elif req.backlog_csv and req.backlog_csv.strip():
        backlog_raw = req.backlog_csv.strip()
        backlog_source = "csv"
    else:
        raise HTTPException(
            status_code=400,
            detail="Debes proveer backlog_csv (texto CSV) o backlog_notion_url (URL de Notion)."
        )

    # Determinar repo_url: el del request sobreescribe al del proyecto
    repo_url = req.repo_url or proyecto.get("repo_url") or ""
    if not repo_url:
        raise HTTPException(
            status_code=400,
            detail="No hay URL de repositorio GitHub configurada para este proyecto."
        )

    # Marcar en Firestore que está en proceso
    try:
        actualizar_proyecto(proyecto_id, {
            "backlog_audit": {"audit_status": "processing"}
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar Firestore: {e}")

    background_tasks.add_task(
        run_backlog_audit_task, proyecto_id, backlog_raw, backlog_source, repo_url
    )

    return {"proyectoId": proyecto_id, "audit_status": "processing"}


@app.get("/profesor/proyectos/{proyecto_id}/backlog-audit/status")
async def get_backlog_audit_status(proyecto_id: str):
    """Devuelve el estado y resultado de la última auditoría de backlog."""
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    audit = proyecto.get("backlog_audit", {})
    return {
        "proyectoId": proyecto_id,
        "audit_status": audit.get("audit_status", "not_started"),
        "semaforo": audit.get("semaforo", None),
        "porcentaje_correspondencia": audit.get("porcentaje_correspondencia", 0.0),
        "audit_results": audit.get("audit_results", []),
        "desviaciones": audit.get("desviaciones", []),
        "reporte_texto": audit.get("reporte_texto", ""),
        "backlog_items_count": audit.get("backlog_items_count", 0),
        "error": audit.get("error", None),
    }


# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS — REPORTES, EXPORTACIÓN Y ARCHIVO (HU-007 / HU-008)
# ══════════════════════════════════════════════════════════════════════

@app.get("/proyectos/{proyecto_id}/reporte-pdf")
async def descargar_reporte_pdf(proyecto_id: str):
    """Genera y descarga el reporte final de desempeño en PDF con firma SHA-256 (HU-007)."""
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    propuesta = proyecto.get("propuesta", {})
    tema = propuesta.get("nombre", "Proyecto de Trazabilidad")
    descripcion = propuesta.get("descripcion", "Sin descripción")
    alumno_id = proyecto.get("alumnoId", "Estudiante")
    
    alumno_nombre = alumno_id
    alumno_email = ""
    if alumno_id:
        try:
            alumno_info = obtener_usuario(alumno_id)
            if alumno_info:
                alumno_nombre = alumno_info.get("nombre", alumno_id)
                alumno_email = alumno_info.get("email", "")
        except Exception:
            pass

    # Generar Hash SHA-256 de los datos clave del proyecto para la firma digital de integridad
    import json
    data_to_hash = {
        "proyectoId": proyecto_id,
        "tema": tema,
        "alumnoId": alumno_id,
        "score_integridad": proyecto.get("tracking", {}).get("score_integridad", 0.0),
        "competencias": proyecto.get("tracking", {}).get("reporte_competencias", {}).get("porcentaje_adquirido", 0.0),
    }
    serialized_data = json.dumps(data_to_hash, sort_keys=True)
    digital_signature = hashlib.sha256(serialized_data.encode("utf-8")).hexdigest().upper()

    # Generar PDF con ReportLab
    buffer = io.BytesIO()
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=15
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#374151')
    )

    label_style = ParagraphStyle(
        'Label_Custom',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#111827')
    )
    
    signature_style = ParagraphStyle(
        'Signature',
        parent=styles['Normal'],
        fontSize=7,
        leading=9,
        fontName='Courier-Bold',
        textColor=colors.HexColor('#DC2626'),
        alignment=1
    )

    elements = []
    
    # 1. Cabecera del Documento
    elements.append(Paragraph("REPORTE FINAL DE DESEMPEÑO Y TRAZABILIDAD ACADÉMICA", title_style))
    elements.append(Paragraph("Generado automáticamente por la plataforma Trazabilidad AI", body_style))
    elements.append(Spacer(1, 10))
    
    # 2. Tabla de Datos Generales
    datos_generales = [
        [Paragraph("Proyecto:", label_style), Paragraph(tema, body_style)],
        [Paragraph("Descripción:", label_style), Paragraph(descripcion, body_style)],
        [Paragraph("Estudiante:", label_style), Paragraph(alumno_nombre, body_style)],
        [Paragraph("Correo:", label_style), Paragraph(alumno_email or "No registrado", body_style)],
        [Paragraph("ID del Proyecto:", label_style), Paragraph(proyecto_id, body_style)]
    ]
    t_generales = Table(datos_generales, colWidths=[110, 420])
    t_generales.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
    ]))
    elements.append(t_generales)
    elements.append(Spacer(1, 15))
    
    # 3. Sección de Analítica e Integridad (Agente Analista)
    elements.append(Paragraph("Análisis de Integridad y Riesgos (IA)", h2_style))
    tracking = proyecto.get("tracking", {})
    score_integridad = tracking.get("score_integridad", 0.0)
    diagnostico = tracking.get("diagnostico_riesgo", "No se detectaron desvíos significativos en este ciclo.")
    
    alertas = tracking.get("alertas", [])
    alertas_criticas = len([a for a in alertas if a.get("severidad") == "critica"])
    
    datos_analisis = [
        [Paragraph("Score de Integridad:", label_style), Paragraph(f"{score_integridad:.1f} / 100.0", body_style)],
        [Paragraph("Alertas Críticas:", label_style), Paragraph(str(alertas_criticas), body_style)],
        [Paragraph("Diagnóstico de Riesgo:", label_style), Paragraph(diagnostico, body_style)]
    ]
    t_analisis = Table(datos_analisis, colWidths=[130, 400])
    t_analisis.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
    ]))
    elements.append(t_analisis)
    elements.append(Spacer(1, 15))
    
    # 4. Sección de Competencias Académicas
    elements.append(Paragraph("Evaluación de Competencias (Acreditación)", h2_style))
    reporte_comp = tracking.get("reporte_competencias", {})
    pct_adquirido = 0.0
    lista_comp = []
    if reporte_comp:
        pct_adquirido = reporte_comp.get("porcentaje_adquirido", 0.0)
        lista_comp = reporte_comp.get("competencias", [])
        
    elements.append(Paragraph(f"Porcentaje total de adquisición: {pct_adquirido:.1f}%", label_style))
    elements.append(Spacer(1, 5))
    
    comp_headers = [Paragraph("Competencia", label_style), Paragraph("Nivel", label_style), Paragraph("Estado", label_style)]
    comp_rows = [comp_headers]
    
    for c in lista_comp:
        estado_text = "Adquirida" if c.get("adquirida") else "En progreso"
        estado_color = '#10B981' if c.get("adquirida") else '#F59E0B'
        
        comp_rows.append([
            Paragraph(c.get("nombre", "Sin nombre"), body_style),
            Paragraph(c.get("nivel", "basico").capitalize(), body_style),
            Paragraph(f"<font color='{estado_color}'><b>{estado_text}</b></font>", body_style)
        ])
        
    t_comp = Table(comp_rows, colWidths=[310, 110, 110])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
    ]))
    elements.append(t_comp)
    elements.append(Spacer(1, 15))
    
    # 5. Sección de Roadmap e Hitos
    elements.append(Paragraph("Roadmap Técnico y Validación Semanal", h2_style))
    hitos = propuesta.get("hitos", [])
    
    hito_headers = [
        Paragraph("Semana", label_style),
        Paragraph("Hito / Entregable", label_style),
        Paragraph("Estado Docente", label_style),
        Paragraph("Observaciones / Feedback", label_style)
    ]
    hito_rows = [hito_headers]
    
    for h in hitos:
        semana = h.get("semana", h.get("semana_sugerida", 1))
        nombre_hito = h.get("nombre", "Sin nombre")
        validado = h.get("validado_por_profesor", False)
        feedback = h.get("feedback_profesor", "Sin comentarios.")
        
        estado_text = "VALIDADO" if validado else "PENDIENTE"
        estado_color = '#10B981' if validado else '#EF4444'
        
        hito_rows.append([
            Paragraph(f"Sem. {semana}", body_style),
            Paragraph(nombre_hito, body_style),
            Paragraph(f"<font color='{estado_color}'><b>{estado_text}</b></font>", body_style),
            Paragraph(feedback, body_style)
        ])
        
    t_hitos = Table(hito_rows, colWidths=[60, 180, 90, 200])
    t_hitos.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
    ]))
    elements.append(t_hitos)
    elements.append(Spacer(1, 20))
    
    # 6. Firma digital e integridad
    elements.append(Paragraph("------------------ CERTIFICADO DE INTEGRIDAD DE DATOS (SHA-256) ------------------", body_style))
    elements.append(Spacer(1, 5))
    elements.append(Paragraph(f"CÓDIGO DE TRAZABILIDAD: {digital_signature}", signature_style))
    elements.append(Paragraph("Este documento es inmutable y representa el avance real del ciclo validado en base de datos y repositorios Git.", body_style))

    doc.build(elements)
    
    pdf_content = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=reporte-trazabilidad-{proyecto_id}.pdf"
        }
    )


@app.get("/proyectos/{proyecto_id}/exportar")
async def exportar_proyecto_json(proyecto_id: str):
    """Exporta el snapshot de datos del proyecto completo a un archivo JSON (HU-008)."""
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Excluir claves que empiecen con _ (credenciales, raw data)
    export_data = {k: v for k, v in proyecto.items() if not k.startswith("_")}
    
    # Intentar adjuntar historial de chat para una exportación completa
    try:
        historial = obtener_historial_chat(proyecto_id)
        export_data["chat_historial"] = historial
    except Exception:
        export_data["chat_historial"] = []

    import json
    json_str = json.dumps(export_data, indent=2, ensure_ascii=False)
    
    return Response(
        content=json_str,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=snapshot-proyecto-{proyecto_id}.json"
        }
    )


@app.post("/proyectos/{proyecto_id}/archivar")
async def archivar_proyecto_ciclo(proyecto_id: str):
    """Resetea el estado de los hitos, backlog y chat para iniciar un nuevo ciclo (HU-008)."""
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # 1. Resetear hitos de la propuesta
    hitos = proyecto.get("propuesta", {}).get("hitos", [])
    for h in hitos:
        h["validado_por_profesor"] = False
        h["estado_hito"] = "pendiente"
        h["feedback_profesor"] = ""
        h["tareas_estado"] = []
        h["tareas_comentarios"] = []

    # 2. Resetear backlog Scrum
    backlog_scrum = proyecto.get("backlog_scrum", {})
    if backlog_scrum and "epicas" in backlog_scrum:
        for epica in backlog_scrum.get("epicas", []):
            for item in epica.get("items", []):
                item["estado"] = "backlog"
                item["estado_revision"] = "pendiente"
                item["comentario_revision"] = None

    # 3. Limpiar subcolección de chat de Firestore
    try:
        eliminar_chat_proyecto(proyecto_id)
    except Exception as chat_err:
        print(f"[ARCHIVE-WARNING] No se pudo limpiar la subcolección de chat: {chat_err}")

    # 4. Guardar datos inicializados en Firestore
    updates = {
        "status": "active",
        "tracking_status": "not_started",
        "tracking": {},
        "propuesta.hitos": hitos,
        "backlog_scrum": backlog_scrum,
    }
    
    try:
        actualizar_proyecto(proyecto_id, updates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar proyecto reiniciado: {e}")

    print(f"[ARCHIVE-SUCCESS] Proyecto {proyecto_id} listo para nuevo ciclo.")
    return {"ok": True}


class GitHubWebhookRequest(BaseModel):
    repository: Dict[str, Any]


@app.post("/github/webhook")
async def github_webhook(req: GitHubWebhookRequest, background_tasks: BackgroundTasks):
    """Webhook para automatizar análisis al recibir un push event de GitHub (HU-008)."""
    repo_url = req.repository.get("html_url")
    if not repo_url:
        raise HTTPException(status_code=400, detail="Falta el campo repository.html_url")

    # Buscar el proyecto
    proyecto = obtener_proyecto_por_repo(repo_url)
    if not proyecto:
        print(f"[WEBHOOK-WARNING] Repositorio {repo_url} no coincide con ningún proyecto registrado.")
        return {"ok": False, "detail": "Repository not matched to any project."}

    proyecto_id = proyecto["proyectoId"]
    alumno_id = proyecto.get("alumnoId", "anonimo")
    
    # Iniciar la tarea en segundo plano
    actualizar_proyecto(proyecto_id, {"tracking_status": "processing"})
    background_tasks.add_task(run_tracking_task, proyecto_id, alumno_id)
    
    print(f"[WEBHOOK-SUCCESS] GitHub Webhook inició tracking para {proyecto_id} ({repo_url})")
    return {"ok": True, "proyectoId": proyecto_id}


@app.get("/proyectos/{proyecto_id}/portfolio")
async def obtener_portfolio_publico(proyecto_id: str):
    """Devuelve los datos esenciales y validados para el portafolio público (acceso libre)."""
    try:
        proyecto = obtener_proyecto(proyecto_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer Firestore: {e}")
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    propuesta = proyecto.get("propuesta", {})
    tracking = proyecto.get("tracking", {})
    
    # Buscar datos del alumno
    alumno_id = proyecto.get("alumnoId", "")
    alumno_nombre = "Estudiante"
    if alumno_id:
        try:
            alumno_info = obtener_usuario(alumno_id)
            if alumno_info:
                alumno_nombre = alumno_info.get("nombre", "Estudiante")
        except Exception:
            pass

    # Generar firma de integridad SHA-256
    import json
    tema = propuesta.get("nombre", "Proyecto de Trazabilidad")
    data_to_hash = {
        "proyectoId": proyecto_id,
        "tema": tema,
        "alumnoId": alumno_id,
        "score_integridad": tracking.get("score_integridad", 0.0),
        "competencias": tracking.get("reporte_competencias", {}).get("porcentaje_adquirido", 0.0),
    }
    serialized_data = json.dumps(data_to_hash, sort_keys=True)
    digital_signature = hashlib.sha256(serialized_data.encode("utf-8")).hexdigest().upper()

    return {
        "proyectoId": proyecto_id,
        "alumnoNombre": alumno_nombre,
        "tema": tema,
        "descripcion": propuesta.get("descripcion", ""),
        "stack": propuesta.get("stack", []),
        "tracking": {
            "score_integridad": tracking.get("score_integridad", 0.0),
            "reporte_competencias": tracking.get("reporte_competencias", {}),
            "estado_repo": {
                "ci_status": tracking.get("estado_repo", {}).get("ci_status", "unknown"),
                "demo_url": tracking.get("estado_repo", {}).get("demo_url", None),
            }
        },
        "hitos": [
            {
                "semana": h.get("semana", h.get("semana_sugerida", 1)),
                "nombre": h.get("nombre", ""),
                "validado": h.get("validado_por_profesor", False)
            }
            for h in propuesta.get("hitos", [])
        ],
        "digitalSignature": digital_signature
    }



if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Servidor de Trazabilidad AI -- FastAPI + LangGraph + Firestore")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)

