import os
import json
from typing import Dict, List
from langgraph.graph import StateGraph, END

from schemas import (
    DiscoveryState, PropuestaTecnica, Hito,
    propuesta_to_dict, dict_to_propuesta,
    BacklogItem, Epica, Sprint, BacklogScrum,
)
from prompts import DRAFTER_SYSTEM_PROMPT, VALIDATOR_SYSTEM_PROMPT, PO_SYSTEM_PROMPT
from llm_client import ask_claude, clean_json_response
from db import actualizar_proyecto


# ── AG-001 Drafter ────────────────────────────────────────────────────
async def drafter_node(state: DiscoveryState) -> Dict:
    """Diseña la propuesta inicial o itera sobre ella."""
    print(f"\n[AG-001 Drafter] Iteracion {state.iteracion + 1}...")
    try:
        actualizar_proyecto(state.proyecto_id, {
            "status_detail": f"Drafter: Creando o ajustando propuesta de proyecto (Iteración {state.iteracion + 1})...",
            "progress": min(10 + state.iteracion * 20, 70),
            "active_agent": "drafter"
        })
    except Exception as e:
        print(f"[WARNING] Falló actualización de progreso: {e}")
    
    user_prompt = f"Idea del alumno: {state.idea_alumno}\nStack tentativo: {state.stack_tentativo}\nHistorial de feedback: {state.feedback_validator}"
    
    response = await ask_claude(DRAFTER_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)
    
    if not data:
        print("[ERROR] Error en Drafter: No pude parsear JSON.")
        return {"iteracion": state.iteracion + 1}

    return {
        "propuesta": dict_to_propuesta(data),
        "iteracion": state.iteracion + 1
    }

# ── AG-002 Validator ──────────────────────────────────────────────────
async def validator_node(state: DiscoveryState) -> Dict:
    """Valida la viabilidad técnica y académica."""
    print("[AG-002 Validator] Validando propuesta...")
    try:
        actualizar_proyecto(state.proyecto_id, {
            "status_detail": f"Validator: Evaluando viabilidad técnica, arquitectura y cobertura del sílabo...",
            "progress": min(20 + state.iteracion * 20, 80),
            "active_agent": "validator"
        })
    except Exception as e:
        print(f"[WARNING] Falló actualización de progreso: {e}")
    
    prop_dict = propuesta_to_dict(state.propuesta)
    user_prompt = f"Propuesta a validar:\n{json.dumps(prop_dict, indent=2)}"
    
    response = await ask_claude(VALIDATOR_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)
    
    feedback = data.get("feedback", "No feedback provided.")
    if isinstance(feedback, (dict, list)):
        feedback_str = ""
        if isinstance(feedback, dict):
            for k, v in feedback.items():
                if isinstance(v, list):
                    v_str = "\n".join([f"- {item}" for item in v])
                    feedback_str += f"**{k.capitalize()}:**\n{v_str}\n\n"
                else:
                    feedback_str += f"**{k.capitalize()}:** {v}\n\n"
        else:
            feedback_str = json.dumps(feedback, indent=2, ensure_ascii=False)
        feedback = feedback_str.strip()
    elif not isinstance(feedback, str):
        feedback = str(feedback)

    return {
        "score_validator": data.get("score", 0),
        "feedback_validator": feedback,
        "es_viable": data.get("viable", False)
    }

# ── AG-PO (Product Owner) ────────────────────────────────────────────
async def ag_po_node(state: DiscoveryState) -> Dict:
    """Genera el backlog Scrum completo: Épicas, HU, Sprint Planning, DoD y puntos."""
    print("[AG-PO] Generando backlog Scrum completo...")
    try:
        actualizar_proyecto(state.proyecto_id, {
            "status_detail": "Product Owner: Creando el backlog ágil de Scrum, definiendo historias de usuario y estimando puntos...",
            "progress": 85,
            "active_agent": "po"
        })
    except Exception as e:
        print(f"[WARNING] Falló actualización de progreso: {e}")

    propuesta = state.propuesta
    if not propuesta:
        return {"backlog_scrum": None, "backlog_po": []}

    user_prompt = (
        f"Proyecto: {propuesta.tema}\n"
        f"Descripción: {propuesta.descripcion}\n"
        f"Stack: {', '.join(propuesta.stack)}\n"
        f"Hitos del roadmap:\n"
        + "\n".join([f"- Semana {h.semana_sugerida}: {h.nombre}" for h in propuesta.hitos])
    )

    response = await ask_claude(PO_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)

    try:
        # Construir BacklogScrum desde el JSON del LLM
        epicas = []
        for ep in data.get("epicas", []):
            items = [BacklogItem(**item) for item in ep.get("items", [])]
            epicas.append(Epica(
                id=ep["id"],
                titulo=ep["titulo"],
                descripcion=ep["descripcion"],
                items=items,
            ))

        sprints = [Sprint(**sp) for sp in data.get("sprints", [])]

        backlog_scrum = BacklogScrum(
            epicas=epicas,
            sprints=sprints,
            total_puntos=data.get("total_puntos", 0),
            velocidad_estimada=data.get("velocidad_estimada", 10),
        )

        # Compatibilidad: backlog_po como lista de títulos
        backlog_simple = [
            item.titulo
            for ep in epicas
            for item in ep.items
        ]

        return {
            "backlog_scrum": backlog_scrum,
            "backlog_po": backlog_simple,
        }
    except Exception as e:
        print(f"[ERROR] Error construyendo BacklogScrum: {e}")
        return {"backlog_scrum": None, "backlog_po": []}

# ── Router Logic ──────────────────────────────────────────────────────
def should_continue(state: DiscoveryState):
    """Decide si seguir iterando o pasar al PO."""
    if state.es_viable or state.iteracion >= state.max_iteraciones:
        return "ag_po"
    return "ag_001_drafter"

# ── Builder ───────────────────────────────────────────────────────────
def build_discovery_graph():
    workflow = StateGraph(DiscoveryState)

    workflow.add_node("ag_001_drafter", drafter_node)
    workflow.add_node("ag_002_validator", validator_node)
    workflow.add_node("ag_po", ag_po_node)

    workflow.set_entry_point("ag_001_drafter")
    workflow.add_edge("ag_001_drafter", "ag_002_validator")
    
    workflow.add_conditional_edges(
        "ag_002_validator",
        should_continue,
        {
            "ag_001_drafter": "ag_001_drafter",
            "ag_po": "ag_po"
        }
    )
    
    workflow.add_edge("ag_po", END)

    return workflow.compile()
