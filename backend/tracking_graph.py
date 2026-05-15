import os
import json
from typing import Dict, List
from langgraph.graph import StateGraph, END

from schemas import TrackingState, Evidencia, AnalisisIntegridad
from prompts import COMPETENCY_SYSTEM_PROMPT, ANALYST_SYSTEM_PROMPT, REPORTER_SYSTEM_PROMPT
from llm_client import ask_claude, clean_json_response


# ── AG-DEVOPS ────────────────────────────────────────────────────────
async def devops_node(state: TrackingState) -> Dict:
    """Simula la recolección de evidencias de GitHub/Vercel."""
    print("🤖 [AG-DEVOPS] Recolectando evidencias de despliegue y commits...")
    # Mock de evidencias
    evidencias = [
        Evidencia(tipo="commit", descripcion="Initial repo setup", link="https://github.com/..."),
        Evidencia(tipo="deploy", descripcion="Vercel deployment success", link="https://app.vercel.app")
    ]
    return {"evidencias_recogidas": evidencias}

# ── AG-COMP ──────────────────────────────────────────────────────────
async def competency_node(state: TrackingState) -> Dict:
    """Mapea evidencias con competencias académicas."""
    print("🤖 [AG-COMP] Analizando competencias alcanzadas...")
    
    user_prompt = f"Evidencias: {state.evidencias_recogidas}\nBacklog: {state.backlog_referencia}"
    response = await ask_claude(COMPETENCY_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)
    
    return {"competencias_detectadas": data.get("competencias", [])}

# ── AG-003 Analyst ───────────────────────────────────────────────────
async def analyst_node(state: TrackingState) -> Dict:
    """Detecta riesgos de integridad y plagio."""
    print("🤖 [AG-003 Analyst] Evaluando integridad y riesgos...")
    
    user_prompt = f"Evidencias: {state.evidencias_recogidas}"
    response = await ask_claude(ANALYST_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)
    
    analisis = AnalisisIntegridad(
        score_integridad=data.get("score", 100),
        alertas=data.get("alertas", []),
        comentarios=data.get("comentarios", "")
    )
    return {"analisis_integridad": analisis}

# ── AG-004 Reporter ──────────────────────────────────────────────────
async def reporter_node(state: TrackingState) -> Dict:
    """Genera el informe final del ciclo."""
    print("🤖 [AG-004 Reporter] Generando informe ejecutivo...")
    
    user_prompt = f"Analisis: {state.analisis_integridad}\nCompetencias: {state.competencias_detectadas}"
    response = await ask_claude(REPORTER_SYSTEM_PROMPT, user_prompt)
    
    return {"informe_final": response or "Error al generar informe."}

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

def simular_evidencias() -> List[Evidencia]:
    return [
        Evidencia(tipo="commit", descripcion="Fix auth bug", link="github.com/commit/1"),
        Evidencia(tipo="doc", descripcion="Technical spec", link="drive.com/doc/1")
    ]
