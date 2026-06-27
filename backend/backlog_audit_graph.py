"""
backlog_audit_graph.py — Grafo LangGraph para auditar el avance real
del alumno comparando su backlog con el código de su repositorio GitHub.

Nodos:
  1. backlog_parser_node    → parsea CSV/Notion → BacklogAuditItem[]
  2. github_deep_reader_node → lee árbol + snippets + commits del repo
  3. semantic_match_node    → Claude compara backlog vs código ítem a ítem
  4. semaforo_node          → calcula % y color del semáforo
"""
import json
import uuid
from typing import Dict

from langgraph.graph import StateGraph, END

from schemas import (
    BacklogAuditState,
    BacklogAuditItem,
    AuditItemResult,
    CodeSummary,
    CommitInfo,
    SemaforoColor,
)
from backlog_parser import parse_backlog
from tracking_graph import fetch_github_data
from prompts import BACKLOG_AUDIT_PROMPT
from llm_client import ask_claude, clean_json_response


# ── Nodo 1: Parser del Backlog ─────────────────────────────────────────

async def backlog_parser_node(state: BacklogAuditState) -> Dict:
    """Parsea el backlog (CSV o Notion) y lo normaliza a BacklogAuditItem[]."""
    print(f"[AUDIT-1] Parseando backlog (source={state.backlog_source}) ...")

    if not state.backlog_raw:
        return {"error": "No se recibió backlog (backlog_raw vacío)."}

    try:
        items = parse_backlog(state.backlog_raw, state.backlog_source)
        if not items:
            return {"error": "El backlog parseado está vacío. Verifica el formato del CSV o la URL de Notion."}
        print(f"[AUDIT-1] {len(items)} ítems parseados del backlog.")
        return {"backlog_items": items}
    except Exception as e:
        return {"error": f"Error parseando backlog: {e}"}


# ── Nodo 2: Lector Profundo de GitHub ─────────────────────────────────

async def github_deep_reader_node(state: BacklogAuditState) -> Dict:
    """Lee el repo GitHub en modo profundo: árbol, snippets, commits detallados."""
    print(f"[AUDIT-2] Leyendo repositorio GitHub: {state.repo_url}")

    if state.error:
        return {"error": state.error}  # propagar error sin romper el grafo

    if not state.repo_url:
        return {"error": "No hay URL de repositorio configurada para este proyecto."}

    github_data = fetch_github_data(state.repo_url, deep=True)

    if not github_data.get("success"):
        # Fallback: intentar sin deep (menos info pero algo)
        github_data = fetch_github_data(state.repo_url, deep=False)
        if not github_data.get("success"):
            return {
                "error": (
                    "No se pudo leer el repositorio de GitHub. "
                    "Verifica que la URL sea pública y correcta."
                )
            }

    # Construir CodeSummary
    code_summary = CodeSummary(
        archivos=github_data.get("tree_files", github_data.get("files", [])),
        snippets=github_data.get("snippets", {}),
        lenguajes=github_data.get("lenguajes", {}),
        bulk_commit_risk=github_data.get("bulk_commit_risk", False),
        total_commits=github_data.get("total_commits", len(github_data.get("commits", []))),
        autores_unicos=github_data.get("autores_unicos", []),
    )

    # Construir CommitInfo[]
    commits_info: list[CommitInfo] = []
    raw_commits = github_data.get("commits", [])
    commits_with_files = github_data.get("commits_with_files", [])

    # Merge: commits_with_files tiene info de archivos modificados (hasta 5),
    # raw_commits tiene todos los mensajes
    files_map = {c["sha"]: c for c in commits_with_files}

    for commit in raw_commits[:20]:
        sha_full = commit.get("sha", "")
        sha = sha_full[:7]
        commit_info = commit.get("commit", {})
        msg = commit_info.get("message", "")
        fecha = commit_info.get("author", {}).get("date", "")
        author = commit_info.get("author", {}).get("name", "")
        html_url = commit.get("html_url", "")

        formatted_fecha = fecha.replace("T", " ").replace("Z", "")[:16]

        # Buscar si tenemos datos detallados de archivos para este commit
        detail = files_map.get(sha, {})
        files_changed = detail.get("files_changed", [])

        commits_info.append(CommitInfo(
            sha=sha,
            mensaje=msg,
            fecha=formatted_fecha,
            author=author,
            url=html_url,
            alineado=True,   # se actualizará en el nodo siguiente
            contribucion=None,
        ))

    print(
        f"[AUDIT-2] Repo leído: {len(code_summary.archivos)} archivos, "
        f"{len(code_summary.snippets)} snippets, {code_summary.total_commits} commits."
    )

    return {
        "code_summary": code_summary,
        "commits_info": commits_info,
    }


# ── Nodo 3: Comparación Semántica (Claude) ────────────────────────────

async def semantic_match_node(state: BacklogAuditState) -> Dict:
    """Envía backlog + código a Claude y obtiene análisis ítem a ítem."""
    print("[AUDIT-3] Comparando semánticamente backlog vs. código (Claude)...")

    if state.error:
        return {"error": state.error}

    if not state.backlog_items:
        return {"error": "No hay ítems de backlog para comparar."}

    # Serializar backlog
    backlog_str = json.dumps(
        [item.model_dump() for item in state.backlog_items],
        ensure_ascii=False, indent=2
    )

    # Serializar código
    code_summary = state.code_summary
    if code_summary:
        code_str = json.dumps({
            "total_archivos": len(code_summary.archivos),
            "arbol_archivos": code_summary.archivos[:200],  # limitar para no superar tokens
            "lenguajes": code_summary.lenguajes,
            "bulk_commit_risk": code_summary.bulk_commit_risk,
            "total_commits": code_summary.total_commits,
            "autores_unicos": code_summary.autores_unicos,
            "snippets_codigo": {
                path: content[:1500]  # ~1500 chars por snippet
                for path, content in list(code_summary.snippets.items())[:6]
            },
        }, ensure_ascii=False, indent=2)
    else:
        code_str = "{}"

    # Serializar commits
    commits_str = json.dumps(
        [
            {
                "sha": c.sha,
                "mensaje": c.mensaje,
                "fecha": c.fecha,
                "author": c.author,
            }
            for c in state.commits_info[:25]
        ],
        ensure_ascii=False, indent=2
    )

    user_prompt = (
        f"=== BACKLOG DEL ALUMNO ({len(state.backlog_items)} ítems) ===\n"
        f"{backlog_str}\n\n"
        f"=== CÓDIGO REAL DEL REPOSITORIO ===\n"
        f"{code_str}\n\n"
        f"=== HISTORIAL DE COMMITS ({len(state.commits_info)} commits) ===\n"
        f"{commits_str}"
    )

    response = await ask_claude(BACKLOG_AUDIT_PROMPT, user_prompt)
    data = clean_json_response(response)

    # Construir AuditItemResult[]
    audit_results: list[AuditItemResult] = []
    for item_data in data.get("items", []):
        if not isinstance(item_data, dict):
            continue
        audit_results.append(AuditItemResult(
            id=item_data.get("id", str(uuid.uuid4())[:8]),
            titulo=item_data.get("titulo", ""),
            estado_backlog=item_data.get("estado_backlog", "To Do"),
            tiene_evidencia=item_data.get("tiene_evidencia", False),
            evidencia=item_data.get("evidencia"),
            score_item=float(item_data.get("score_item", 0.0)),
            nota=item_data.get("nota"),
        ))

    porcentaje = float(data.get("porcentaje_correspondencia", 0.0))
    desviaciones = data.get("desviaciones", [])
    reporte = data.get("reporte_texto", "")

    print(
        f"[AUDIT-3] Análisis completo: {len(audit_results)} ítems auditados, "
        f"{porcentaje:.1f}% correspondencia, {len(desviaciones)} desviaciones."
    )

    return {
        "audit_results": audit_results,
        "porcentaje_correspondencia": porcentaje,
        "desviaciones": desviaciones,
        "reporte_texto": reporte,
    }


# ── Nodo 4: Semáforo ──────────────────────────────────────────────────

async def semaforo_node(state: BacklogAuditState) -> Dict:
    """Calcula el color del semáforo según el porcentaje de correspondencia."""
    print("[AUDIT-4] Calculando semáforo...")

    if state.error:
        return {"semaforo": SemaforoColor.ROJO}

    pct = state.porcentaje_correspondencia

    # Ajuste por bulk-commit: si hay riesgo, reducir el porcentaje efectivo
    if state.code_summary and state.code_summary.bulk_commit_risk:
        pct = max(0.0, pct - 15.0)
        print(f"[AUDIT-4] Bulk-commit detectado → penalización -15%. % efectivo: {pct:.1f}%")

    if pct >= 81:
        color = SemaforoColor.VERDE
    elif pct >= 56:
        color = SemaforoColor.AMARILLO
    elif pct >= 31:
        color = SemaforoColor.NARANJA
    else:
        color = SemaforoColor.ROJO

    print(f"[AUDIT-4] Semáforo: {color.value} ({pct:.1f}%)")
    return {"semaforo": color}


# ── Builder ───────────────────────────────────────────────────────────

def build_backlog_audit_graph():
    """Construye y compila el grafo de auditoría de backlog."""
    workflow = StateGraph(BacklogAuditState)

    workflow.add_node("backlog_parser", backlog_parser_node)
    workflow.add_node("github_deep_reader", github_deep_reader_node)
    workflow.add_node("semantic_match", semantic_match_node)
    workflow.add_node("semaforo_calc", semaforo_node)

    workflow.set_entry_point("backlog_parser")
    workflow.add_edge("backlog_parser", "github_deep_reader")
    workflow.add_edge("github_deep_reader", "semantic_match")
    workflow.add_edge("semantic_match", "semaforo_calc")
    workflow.add_edge("semaforo_calc", END)

    return workflow.compile()
