import os
import sys
import uuid
import asyncio
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, BackgroundTasks, HTTPException
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

        initial_state = TrackingState(
            alumno_id=alumno_id,
            propuesta_confirmada=propuesta_confirmada,
            estado_repo=estado_repo,
        )

        graph = build_tracking_graph()
        result_dict = await graph.ainvoke(initial_state)
        result = TrackingState(**result_dict)

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

    return {
        "proyectoId": proyecto_id,
        "tracking_status": tracking_status,
        "tracking": tracking_data,
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
            updates["propuesta.hitos"] = [h.model_dump() for h in req.hitos]
        if req.backlog_scrum is not None:
            updates["backlog_scrum"] = req.backlog_scrum.model_dump()
            
        if updates:
            actualizar_proyecto(proyecto_id, updates)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar borrador: {e}")
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


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Servidor de Trazabilidad AI -- FastAPI + LangGraph + Firestore")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)

