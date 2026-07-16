import os
import json
import uuid
import urllib.request
import urllib.parse
from typing import Dict, List, Optional
from langgraph.graph import StateGraph, END

from schemas import (
    TrackingState,
    Evidencia,
    AlertaDesvio,
    ReporteCompetencias,
    Competencia,
    EstadoRepo,
    CommitInfo,
)
from prompts import COMPETENCY_SYSTEM_PROMPT, ANALYST_SYSTEM_PROMPT, REPORTER_SYSTEM_PROMPT
from llm_client import ask_claude, clean_json_response


def fetch_github_data(repo_url: str, deep: bool = False):
    """Obtiene commits y archivos reales de un repositorio público en GitHub.

    Args:
        repo_url: URL del repositorio de GitHub.
        deep: Si es True, realiza una lectura profunda:
              - Árbol completo de archivos (recursive tree)
              - Snippets de los primeros archivos de código fuente
              - Archivos modificados por commit (primeros 5 commits)
              - Detección de bulk-commit sospechoso
    """
    if not repo_url or "github.com" not in repo_url:
        return {"success": False}

    # Extensions we care about for deep code reading
    CODE_EXTS = {".py", ".ts", ".tsx", ".js", ".jsx", ".html", ".css",
                 ".java", ".go", ".rb", ".php", ".vue", ".svelte",
                 "requirements.txt", "package.json", "Dockerfile"}
    MAX_SNIPPET_FILES = 8
    MAX_SNIPPET_LINES = 250

    try:
        parsed = urllib.parse.urlparse(repo_url)
        path_parts = [p for p in parsed.path.split('/') if p]
        if len(path_parts) < 2:
            return {"success": False}

        owner = path_parts[0]
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]

        headers = {"User-Agent": "Trazabilidad-App-AI-Agent"}

        # ── 1. Commits ──────────────────────────────────────────────
        commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=30"
        req = urllib.request.Request(commits_url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            commits = json.loads(response.read().decode())

        # ── 2. Root contents ─────────────────────────────────────────
        contents_url = f"https://api.github.com/repos/{owner}/{repo}/contents"
        req_cont = urllib.request.Request(contents_url, headers=headers)
        files = []
        try:
            with urllib.request.urlopen(req_cont, timeout=8) as response:
                contents = json.loads(response.read().decode())
                if isinstance(contents, list):
                    files = [f.get("name") for f in contents]
        except Exception:
            pass

        result = {
            "success": True,
            "commits": commits,
            "files": files,
            "owner": owner,
            "repo": repo,
        }

        if not deep:
            return result

        # ── 3. Deep mode: full file tree ─────────────────────────────
        tree_files = []
        snippets = {}
        lenguajes: dict = {}
        bulk_commit_risk = False
        autores_unicos: list = []

        # Get default branch SHA from latest commit
        default_sha = commits[0].get("sha", "") if commits else ""
        if default_sha:
            tree_url = (
                f"https://api.github.com/repos/{owner}/{repo}"
                f"/git/trees/{default_sha}?recursive=1"
            )
            try:
                req_tree = urllib.request.Request(tree_url, headers=headers)
                with urllib.request.urlopen(req_tree, timeout=10) as resp:
                    tree_data = json.loads(resp.read().decode())
                    tree_items = tree_data.get("tree", [])
                    tree_files = [
                        item["path"] for item in tree_items
                        if item.get("type") == "blob"
                    ]

                    # Language stats
                    for path in tree_files:
                        ext = "." + path.rsplit(".", 1)[-1] if "." in path else path.split("/")[-1]
                        ext_lower = ext.lower()
                        lenguajes[ext_lower] = lenguajes.get(ext_lower, 0) + 1

                    # Code snippets — pick up to MAX_SNIPPET_FILES relevant files
                    snippet_candidates = [
                        p for p in tree_files
                        if any(
                            p.endswith(ext) or p.split("/")[-1] == ext
                            for ext in CODE_EXTS
                        )
                        and not any(x in p for x in ["node_modules", ".git", "__pycache__", "dist", "build"])
                    ][:MAX_SNIPPET_FILES]

                    for file_path in snippet_candidates:
                        blob_url = (
                            f"https://api.github.com/repos/{owner}/{repo}"
                            f"/contents/{urllib.parse.quote(file_path)}"
                        )
                        try:
                            req_blob = urllib.request.Request(blob_url, headers=headers)
                            with urllib.request.urlopen(req_blob, timeout=6) as resp_blob:
                                blob_data = json.loads(resp_blob.read().decode())
                                import base64
                                content_b64 = blob_data.get("content", "")
                                if content_b64:
                                    decoded = base64.b64decode(content_b64).decode("utf-8", errors="replace")
                                    lines = decoded.splitlines()[:MAX_SNIPPET_LINES]
                                    snippets[file_path] = "\n".join(lines)
                        except Exception:
                            pass

            except Exception as e:
                print(f"[GITHUB-TREE-WARNING] No se pudo leer árbol recursivo: {e}")

        # ── 4. Per-commit file diffs (first 5 commits) ───────────────
        commits_with_files = []
        for commit in (commits[:5] if deep else []):
            sha = commit.get("sha", "")
            try:
                detail_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"
                req_d = urllib.request.Request(detail_url, headers=headers)
                with urllib.request.urlopen(req_d, timeout=6) as resp_d:
                    detail = json.loads(resp_d.read().decode())
                    changed_files = [f.get("filename", "") for f in detail.get("files", [])]
                    commits_with_files.append({
                        "sha": sha[:7],
                        "message": commit.get("commit", {}).get("message", ""),
                        "date": commit.get("commit", {}).get("author", {}).get("date", ""),
                        "author": commit.get("commit", {}).get("author", {}).get("name", ""),
                        "url": commit.get("html_url", ""),
                        "files_changed": changed_files,
                        "files_count": len(changed_files),
                    })
                    # Bulk-commit detection: first commit that touches >15 files
                    if len(changed_files) > 15 and not bulk_commit_risk:
                        # Sospechoso si es uno de los primeros 2 commits
                        commit_index = commits.index(commit)
                        if commit_index <= 2:
                            bulk_commit_risk = True
            except Exception:
                pass

        # ── 5. Unique authors ─────────────────────────────────────────
        seen_authors = set()
        for c in commits:
            author = c.get("commit", {}).get("author", {}).get("name", "")
            if author and author not in seen_authors:
                seen_authors.add(author)
                autores_unicos.append(author)

        if deep:
            result.update({
                "tree_files": tree_files,
                "snippets": snippets,
                "lenguajes": lenguajes,
                "bulk_commit_risk": bulk_commit_risk,
                "commits_with_files": commits_with_files,
                "total_commits": len(commits),
                "autores_unicos": autores_unicos,
            })

        return result

    except Exception as e:
        print(f"[GITHUB-READER-WARNING] No se pudo leer el repo ({e}). Usando fallback.")
    return {"success": False}



def _default_hito_id(state: TrackingState) -> str:
    """Primer hito de la propuesta, o fallback estable."""
    if state.propuesta_confirmada and state.propuesta_confirmada.hitos:
        h = state.propuesta_confirmada.hitos[0]
        return getattr(h, "id", None) or "hito-001"
    return "hito-001"


def _competencias_from_msg(msg: str) -> List[str]:
    competencias = ["comp-git"]
    msg_lower = msg.lower()
    if any(x in msg_lower for x in ["back", "api", "db", "server", "model"]):
        competencias.append("comp-backend")
    if any(x in msg_lower for x in ["front", "ui", "style", "css", "html", "react", "view"]):
        competencias.append("comp-frontend")
    if "test" in msg_lower:
        competencias.append("comp-testing")
    if any(x in msg_lower for x in ["docker", "deploy", "ci", "cd", "yaml", "yml"]):
        competencias.append("comp-devops")
    return competencias


# ── AG-DEVOPS ────────────────────────────────────────────────────────
async def devops_node(state: TrackingState) -> Dict:
    """
    Recolecta evidencias del repo/deploy del alumno.
    Lectura profunda (deep=True): árbol, snippets y archivos por commit — igual que el auditor docente.
    """
    print("[AG-DEVOPS] Recolectando evidencias profundas de despliegue y commits...")

    repo_url = state.estado_repo.repo_url if state.estado_repo else None
    demo_url = state.estado_repo.demo_url if state.estado_repo else None
    hito_ref = _default_hito_id(state)

    evidencias = []
    commits_info = []
    ultimo_commit_sha = None
    ultimo_commit_fecha = None
    ci_status = "unknown"
    github_context: Dict = {}

    if repo_url:
        github_data = fetch_github_data(repo_url, deep=True)
        if github_data.get("success"):
            commits_list = github_data.get("commits", [])
            files_by_sha = {
                c.get("sha", ""): c.get("files_changed", [])
                for c in github_data.get("commits_with_files", [])
            }
            print(
                f"[AG-DEVOPS] Lectura profunda: {len(commits_list)} commits, "
                f"{len(github_data.get('tree_files', []))} archivos, "
                f"{len(github_data.get('snippets', {}))} snippets."
            )

            for commit in commits_list[:15]:
                sha = commit.get("sha", "")
                commit_info = commit.get("commit", {})
                msg = commit_info.get("message", "")
                fecha = commit_info.get("author", {}).get("date", "")
                author = commit_info.get("author", {}).get("name", "")
                html_url = commit.get("html_url", "")
                formatted_fecha = fecha.replace("T", " ").replace("Z", "")[:16]
                commits_info.append(
                    CommitInfo(
                        sha=sha[:7],
                        mensaje=msg,
                        fecha=formatted_fecha,
                        author=author,
                        url=html_url,
                        files_changed=files_by_sha.get(sha[:7], []),
                    )
                )

            for commit in commits_list[:5]:
                msg = commit.get("commit", {}).get("message", "")
                evidencias.append(
                    Evidencia(
                        id=str(uuid.uuid4()),
                        hito_id=hito_ref,
                        tipo="codigo",
                        url=commit.get("html_url", ""),
                        estado="subida",
                        competencias_ids=_competencias_from_msg(msg),
                    )
                )

            if commits_list:
                ultimo_commit_sha = commits_list[0].get("sha", "")[:7]
                ultimo_commit_fecha = (
                    commits_list[0].get("commit", {}).get("author", {}).get("date", "")[:10]
                )
                ci_status = "pass"

            github_context = {
                "tree_files": github_data.get("tree_files", [])[:120],
                "snippets": github_data.get("snippets", {}),
                "lenguajes": github_data.get("lenguajes", {}),
                "bulk_commit_risk": github_data.get("bulk_commit_risk", False),
                "commits_with_files": github_data.get("commits_with_files", []),
                "total_commits": github_data.get("total_commits", len(commits_list)),
                "autores_unicos": github_data.get("autores_unicos", []),
            }
        else:
            print("[AG-DEVOPS] No se pudo leer GitHub (repo privado o API). Sin evidencias simuladas.")

    if demo_url:
        evidencias.append(
            Evidencia(
                id=str(uuid.uuid4()),
                hito_id=hito_ref,
                tipo="pipeline",
                url=demo_url,
                estado="subida",
                competencias_ids=["comp-devops"],
            )
        )

    estado_repo = EstadoRepo(
        repo_url=repo_url,
        ultimo_commit_sha=ultimo_commit_sha,
        ultimo_commit_fecha=ultimo_commit_fecha,
        ci_status=ci_status,
        demo_url=demo_url,
        demo_activa=True if demo_url else False,
        commits=commits_info,
    )

    return {
        "evidencias": evidencias,
        "estado_repo": estado_repo,
        "github_context": github_context,
    }


def _serialize_backlog_items(backlog_scrum: Optional[Dict]) -> List[Dict]:
    """Aplana ítems del backlog Scrum para el prompt del AG-COMP."""
    items: List[Dict] = []
    if not backlog_scrum or not isinstance(backlog_scrum, dict):
        return items
    for epica in backlog_scrum.get("epicas", []) or []:
        for item in epica.get("items", []) or []:
            items.append({
                "id": item.get("id"),
                "tipo": item.get("tipo"),
                "titulo": item.get("titulo"),
                "quiero": item.get("quiero"),
                "estado_actual": item.get("estado", "backlog"),
                "epica": epica.get("titulo"),
                "criterios": [
                    c.get("descripcion") if isinstance(c, dict) else str(c)
                    for c in (item.get("criterios") or [])
                ][:5],
            })
    return items


# ── AG-COMP ──────────────────────────────────────────────────────────
async def competency_node(state: TrackingState) -> Dict:
    """Mapea evidencias/código/commits a competencias, hitos y estados Kanban."""
    print("[AG-COMP] Analizando competencias, código y commits↔hitos (modo sincero)...")

    evidencias_str = json.dumps(
        [e.model_dump() for e in state.evidencias], ensure_ascii=False
    )
    commits_str = "[]"
    if state.estado_repo and state.estado_repo.commits:
        commits_str = json.dumps(
            [c.model_dump() for c in state.estado_repo.commits], ensure_ascii=False
        )

    hitos_str = "[]"
    if state.propuesta_confirmada:
        hitos_str = json.dumps(
            [h.model_dump() for h in state.propuesta_confirmada.hitos],
            ensure_ascii=False,
        )

    backlog_items = _serialize_backlog_items(state.backlog_scrum)
    backlog_str = json.dumps(backlog_items, ensure_ascii=False)

    ctx = state.github_context or {}
    code_payload = {
        "tree_files": (ctx.get("tree_files") or [])[:80],
        "snippets": {
            k: (v[:1200] if isinstance(v, str) else v)
            for k, v in list((ctx.get("snippets") or {}).items())[:6]
        },
        "lenguajes": ctx.get("lenguajes") or {},
        "bulk_commit_risk": ctx.get("bulk_commit_risk", False),
        "commits_with_files": ctx.get("commits_with_files") or [],
    }
    code_str = json.dumps(code_payload, ensure_ascii=False)

    import datetime
    current_date = datetime.date.today().isoformat()
    repo_url = state.estado_repo.repo_url if state.estado_repo else None
    demo_url = state.estado_repo.demo_url if state.estado_repo else None
    entregables = {
        "repo_url_configurado": bool(repo_url),
        "repo_url": repo_url,
        "demo_url_configurado": bool(demo_url),
        "demo_url": demo_url,
        "total_commits": (ctx.get("total_commits") or len(state.estado_repo.commits or [])) if state.estado_repo else 0,
    }
    user_prompt = (
        f"Fecha actual del sistema: {current_date}\n\n"
        f"ENTREGABLES YA CONFIGURADOS POR EL ESTUDIANTE:\n{json.dumps(entregables, ensure_ascii=False)}\n\n"
        f"Evidencias subidas:\n{evidencias_str}\n\n"
        f"Commits del repositorio:\n{commits_str}\n\n"
        f"HITOS del roadmap:\n{hitos_str}\n\n"
        f"BACKLOG SCRUM (ítems Kanban a mapear TODOS):\n{backlog_str}\n\n"
        f"CÓDIGO REAL DEL REPOSITORIO:\n{code_str}"
    )
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

    VALID_KANBAN = {"backlog", "todo", "in_progress", "done"}
    mapeo_raw = data.get("mapeo_tareas", {}) if isinstance(data.get("mapeo_tareas"), dict) else {}
    mapeo_tareas = {
        str(k): v for k, v in mapeo_raw.items() if v in VALID_KANBAN
    }

    estado_repo = state.estado_repo
    if estado_repo and estado_repo.commits:
        commits_analizados = data.get("commits_analizados", [])
        commits_map = {}
        for ca in commits_analizados:
            if isinstance(ca, dict) and "sha" in ca:
                commits_map[ca["sha"]] = ca

        updated_commits = []
        for commit in estado_repo.commits:
            match = None
            for sha_key, val in commits_map.items():
                if sha_key.startswith(commit.sha) or commit.sha.startswith(sha_key):
                    match = val
                    break
            if match:
                commit.alineado = match.get("alineado", True)
                commit.contribucion = match.get("contribucion", None)
                commit.hito_ref = match.get("hito_ref")
                ids = match.get("item_ids") or []
                commit.item_ids = [str(x) for x in ids] if isinstance(ids, list) else []
            else:
                commit.alineado = True
                commit.contribucion = commit.contribucion or "Sin clasificación explícita de la IA"
            updated_commits.append(commit)

        estado_repo.commits = updated_commits

    return {
        "reporte_competencias": reporte,
        "estado_repo": estado_repo,
        "mapeo_tareas": mapeo_tareas,
    }


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

    import datetime
    current_date = datetime.date.today().isoformat()
    user_prompt = (
        f"Fecha actual del sistema: {current_date}\n\n"
        f"Evidencias:\n{evidencias_str}\n\n"
        f"Estado del repositorio:\n{estado_repo_str}"
    )
    response = await ask_claude(ANALYST_SYSTEM_PROMPT, user_prompt)
    data = clean_json_response(response)

    score = float(data.get("score_integridad", 0.0))

    # Clamp de seguridad: si no hay repo, no hay commits y no hay demo,
    # el score DEBE ser 0.0 independientemente de lo que devolvió el LLM.
    repo_info = state.estado_repo
    sin_repo = not (repo_info and repo_info.repo_url)
    sin_commits = not (repo_info and repo_info.commits)
    sin_demo = not (repo_info and repo_info.demo_url)
    if sin_repo and sin_commits and sin_demo:
        score = 0.0

    # Asegurar rango válido [0, 100]
    score = max(0.0, min(100.0, score))

    allowed_tipos = {"tarea_sin_evidencia", "pipeline_roto", "produccion_inactiva", "commit_inactivo"}
    allowed_severidades = {"baja", "media", "alta", "critica"}

    alertas_raw = data.get("alertas", [])
    alertas = []
    for a in alertas_raw:
        if isinstance(a, dict):
            t = a.get("tipo", "commit_inactivo")
            if t not in allowed_tipos:
                t = "commit_inactivo"
            
            sev = a.get("severidad", "media")
            if sev not in allowed_severidades:
                sev = "media"
                
            alertas.append(
                AlertaDesvio(
                    tipo=t,
                    mensaje=a.get("mensaje", ""),
                    severidad=sev,
                )
            )

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

    import datetime
    current_date = datetime.date.today().isoformat()
    user_prompt = (
        f"Fecha actual del sistema: {current_date}\n\n"
        f"Análisis de integridad:\n{analisis_str}\n\n"
        f"Reporte de competencias:\n{competencias_str}"
    )
    response = await ask_claude(REPORTER_SYSTEM_PROMPT, user_prompt)

    try:
        data = clean_json_response(response)
        resumen_texto = data.get("resumen_ejecutivo", "")
        estado_final = data.get("estado_final", {})
        
        if estado_final and isinstance(estado_final, dict):
            secciones_md = []
            for sec in estado_final.get("secciones", []):
                nombre = sec.get("nombre", "")
                detalles = sec.get("detalles", {})
                if detalles and isinstance(detalles, dict):
                    detalles_str = "\n".join([f"- **{k.replace('_', ' ').capitalize()}:** {v}" for k, v in detalles.items()])
                    secciones_md.append(f"### {nombre}\n{detalles_str}")
            
            resumen = f"{resumen_texto}\n\n" + "\n\n".join(secciones_md)
        else:
            resumen = resumen_texto if resumen_texto else response
    except Exception:
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
