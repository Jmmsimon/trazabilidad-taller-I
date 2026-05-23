import os
import json
import uuid
from typing import Dict, List
from langgraph.graph import StateGraph, END

from schemas import (
    TrackingState,
    Evidencia,
    AlertaDesvio,
    ReporteCompetencias,
    Competencia,
    EstadoRepo,
)
from prompts import COMPETENCY_SYSTEM_PROMPT, ANALYST_SYSTEM_PROMPT, REPORTER_SYSTEM_PROMPT
from llm_client import ask_claude, clean_json_response


# ── AG-DEVOPS ────────────────────────────────────────────────────────
async def devops_node(state: TrackingState) -> Dict:
    """
    Recolecta evidencias del repo/deploy del alumno.
    Por ahora usa mocks; conectar a GitHub/Vercel API aquí cuando esté listo.
    """
    print("[AG-DEVOPS] Recolectando evidencias de despliegue y commits...")

    hito_ref = "hito-001"  # En producción vendrá de state.propuesta_confirmada

    evidencias_mock = [
        Evidencia(
            id=str(uuid.uuid4()),
            hito_id=hito_ref,
            tipo="codigo",
            url="https://github.com/alumno/proyecto/commit/abc123",
            estado="subida",
            competencias_ids=["comp-git", "comp-backend"],
        ),
        Evidencia(
            id=str(uuid.uuid4()),
            hito_id=hito_ref,
            tipo="pipeline",
            url="https://vercel.app/deploy/xyz",
            estado="subida",
            competencias_ids=["comp-devops"],
        ),
    ]

    # Actualiza también el estado del repo
    estado_repo = EstadoRepo(
        repo_url="https://github.com/alumno/proyecto",
        ultimo_commit_sha="abc123",
        ultimo_commit_fecha="2025-05-21",
        ci_status="pass",
        demo_url="https://proyecto.vercel.app",
        demo_activa=True,
    )

    return {
        "evidencias": evidencias_mock,
        "estado_repo": estado_repo,
    }


# ── AG-COMP ──────────────────────────────────────────────────────────
async def competency_node(state: TrackingState) -> Dict:
    """Mapea las evidencias subidas con competencias académicas."""
    print("[AG-COMP] Analizando competencias alcanzadas...")

    # Serializa evidencias para el prompt
    evidencias_str = json.dumps(
        [e.model_dump() for e in state.evidencias], ensure_ascii=False
    )

    # Referencia del backlog desde la propuesta confirmada
    backlog_str = ""
    if state.propuesta_confirmada:
        hitos = [h.model_dump() for h in state.propuesta_confirmada.hitos]
        backlog_str = json.dumps(hitos, ensure_ascii=False)

    user_prompt = f"Evidencias subidas:\n{evidencias_str}\n\nBacklog del proyecto:\n{backlog_str}"
    response = await ask_claude(COMPETENCY_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)

    competencias_raw = data.get("competencias", [])
    competencias = [
        Competencia(
            id=c.get("id", str(uuid.uuid4())),
            nombre=c.get("nombre", "Sin nombre"),
            nivel=c.get("nivel", "basico"),
            adquirida=c.get("adquirida", False),
        )
        for c in competencias_raw
        if isinstance(c, dict)
    ]

    reporte = ReporteCompetencias(
        alumno_id=state.alumno_id,
        competencias=competencias,
        porcentaje_adquirido=data.get("porcentaje_adquirido", 0.0),
    )

    return {"reporte_competencias": reporte}


# ── AG-003 Analyst ───────────────────────────────────────────────────
async def analyst_node(state: TrackingState) -> Dict:
    """Detecta riesgos de integridad, plagio e inactividad."""
    print("[AG-003 Analyst] Evaluando integridad y riesgos...")

    evidencias_str = json.dumps(
        [e.model_dump() for e in state.evidencias], ensure_ascii=False
    )
    estado_repo_str = (
        json.dumps(state.estado_repo.model_dump(), ensure_ascii=False)
        if state.estado_repo
        else "{}"
    )

    user_prompt = (
        f"Evidencias:\n{evidencias_str}\n\nEstado del repositorio:\n{estado_repo_str}"
    )
    response = await ask_claude(ANALYST_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)

    score = float(data.get("score_integridad", 100.0))

    alertas_raw = data.get("alertas", [])
    alertas = [
        AlertaDesvio(
            tipo=a.get("tipo", "commit_inactivo"),
            mensaje=a.get("mensaje", ""),
            severidad=a.get("severidad", "media"),
        )
        for a in alertas_raw
        if isinstance(a, dict)
    ]

    diagnostico = data.get("diagnostico_riesgo", "Sin riesgos detectados.")

    return {
        "score_integridad": score,
        "alertas": alertas,
        "diagnostico_riesgo": diagnostico,
    }


# ── AG-004 Reporter ──────────────────────────────────────────────────
async def reporter_node(state: TrackingState) -> Dict:
    """Genera el resumen ejecutivo del ciclo de seguimiento."""
    print("[AG-004 Reporter] Generando informe ejecutivo...")

    analisis_str = json.dumps(
        {
            "score_integridad": state.score_integridad,
            "diagnostico_riesgo": state.diagnostico_riesgo,
            "alertas": [a.model_dump() for a in state.alertas],
        },
        ensure_ascii=False,
    )

    competencias_str = (
        json.dumps(state.reporte_competencias.model_dump(), ensure_ascii=False)
        if state.reporte_competencias
        else "{}"
    )

    user_prompt = (
        f"Análisis de integridad:\n{analisis_str}\n\n"
        f"Reporte de competencias:\n{competencias_str}"
    )
    response = await ask_claude(REPORTER_SYSTEM_PROMPT, user_prompt)

    resumen = response if response else "Error al generar el resumen ejecutivo."

    return {"resumen_ejecutivo": resumen}


# ── Builder ───────────────────────────────────────────────────────────
def build_tracking_graph():
    workflow = StateGraph(TrackingState)

    workflow.add_node("ag_devops", devops_node)
    workflow.add_node("ag_comp", competency_node)
    workflow.add_node("ag_003_analyst", analyst_node)
    workflow.add_node("ag_004_reporter", reporter_node)

    workflow.set_entry_point("ag_devops")
    workflow.add_edge("ag_devops", "ag_comp")
    workflow.add_edge("ag_comp", "ag_003_analyst")
    workflow.add_edge("ag_003_analyst", "ag_004_reporter")
    workflow.add_edge("ag_004_reporter", END)

    return workflow.compile()


# ── Helper de simulación (para tests sin LLM) ────────────────────────
def simular_evidencias(hito_id: str = "hito-001") -> List[Evidencia]:
    return [
        Evidencia(
            id=str(uuid.uuid4()),
            hito_id=hito_id,
            tipo="codigo",
            url="https://github.com/alumno/proyecto/commit/mock",
            estado="subida",
            competencias_ids=["comp-git"],
        ),
        Evidencia(
            id=str(uuid.uuid4()),
            hito_id=hito_id,
            tipo="documento",
            url="https://drive.google.com/doc/mock",
            estado="subida",
            competencias_ids=["comp-doc"],
        ),
    ]
