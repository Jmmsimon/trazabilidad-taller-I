import os
import json
from typing import Dict, List
from langgraph.graph import StateGraph, END

from schemas import (
    DiscoveryState, PropuestaTecnica, Hito,
    propuesta_to_dict, dict_to_propuesta,
)
from prompts import DRAFTER_SYSTEM_PROMPT, VALIDATOR_SYSTEM_PROMPT, PO_SYSTEM_PROMPT
from llm_client import ask_claude, clean_json_response


# ── AG-001 Drafter ────────────────────────────────────────────────────
async def drafter_node(state: DiscoveryState) -> Dict:
    """Diseña la propuesta inicial o itera sobre ella."""
    print(f"\n🤖 [AG-001 Drafter] Iteración {state.iteracion + 1}...")
    
    user_prompt = f"Idea del alumno: {state.idea_alumno}\nStack tentativo: {state.stack_tentativo}\nHistorial de feedback: {state.feedback_validator}"
    
    response = await ask_claude(DRAFTER_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)
    
    if not data:
        print("❌ Error en Drafter: No pude parsear JSON.")
        return {"iteracion": state.iteracion + 1}

    return {
        "propuesta": dict_to_propuesta(data),
        "iteracion": state.iteracion + 1
    }

# ── AG-002 Validator ──────────────────────────────────────────────────
async def validator_node(state: DiscoveryState) -> Dict:
    """Valida la viabilidad técnica y académica."""
    print("🤖 [AG-002 Validator] Validando propuesta...")
    
    prop_dict = propuesta_to_dict(state.propuesta)
    user_prompt = f"Propuesta a validar:\n{json.dumps(prop_dict, indent=2)}"
    
    response = await ask_claude(VALIDATOR_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)
    
    return {
        "score_validator": data.get("score", 0),
        "feedback_validator": data.get("feedback", "No feedback provided."),
        "es_viable": data.get("viable", False)
    }

# ── AG-PO (Product Owner) ──────────────────────────────────────────────
async def po_node(state: DiscoveryState) -> Dict:
    """Genera el backlog de historias de usuario final."""
    print("🤖 [AG-PO] Generando backlog de historias de usuario...")
    
    prop_dict = propuesta_to_dict(state.propuesta)
    user_prompt = f"Propuesta confirmada:\n{json.dumps(prop_dict, indent=2)}"
    
    response = await ask_claude(PO_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)
    
    # Extraemos solo los títulos de las historias para el MVP
    backlog = data.get("user_stories", [])
    if isinstance(backlog, list) and len(backlog) > 0 and isinstance(backlog[0], dict):
        backlog = [f"{s.get('titulo')}: {s.get('quiero')}" for s in backlog]

    return {"backlog_po": backlog}

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
    workflow.add_node("ag_po", po_node)

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
