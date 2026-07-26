"""
backlog_parser.py — Normaliza el backlog del alumno desde CSV o Notion público
a una lista de BacklogAuditItem.
"""
import io
import csv
import uuid
import urllib.request
from typing import List, Optional

from schemas import BacklogAuditItem


# ──────────────────────────────────────────────────────────────────────
# Mapeo flexible de columnas (español + inglés)
# ──────────────────────────────────────────────────────────────────────
_COL_TITULO    = ["titulo", "título", "title", "nombre", "name", "historia", "tarea", "item",
                  "descripción", "descripcion", "feature"]
_COL_TIPO      = ["tipo", "type", "categoria", "category"]
_COL_ESTADO    = ["estado", "status", "state", "estatus"]
_COL_SPRINT    = ["sprint", "sprint_numero", "sprint_num", "iteration", "iteracion"]
_COL_PRIORIDAD = ["prioridad", "priority", "prioritad"]
_COL_DESC      = ["descripcion", "descripción", "description", "detalle", "detail",
                  "criterios", "criteria"]


def _find_col(headers: List[str], candidates: List[str]) -> Optional[str]:
    """Busca en los headers la primera columna que coincida con alguno de los candidatos."""
    headers_lower = [h.strip().lower() for h in headers]
    for cand in candidates:
        if cand in headers_lower:
            return headers[headers_lower.index(cand)]
    return None


def _normalize_estado(raw: str) -> str:
    """Normaliza el estado a 'To Do', 'In Progress' o 'Done'."""
    s = raw.strip().lower().replace("_", " ").replace("-", " ")
    if s in (
        "done", "terminado", "completado", "listo", "cerrado",
        "finished", "complete", "hecho", "finalizado", "ready",
    ):
        return "Done"
    if s in (
        "in progress", "en progreso", "en curso", "doing", "wip",
        "progreso", "desarrollo", "working", "activo",
    ):
        return "In Progress"
    # Alias Kanban / español frecuente → To Do
    if s in (
        "to do", "todo", "por hacer", "pendiente", "backlog",
        "sin asignar", "nuevo", "new", "pending", "open",
    ):
        return "To Do"
    return "To Do"


def _normalize_tipo(raw: str) -> str:
    """Normaliza el tipo de ítem al código de dos letras estándar."""
    s = raw.strip().upper()
    VALID = {"HU", "TA", "SP", "EN", "RN", "DO", "EP", "AG"}
    if s in VALID:
        return "TA" if s == "AG" else s  # AG (agente/tarea técnica) → TA
    s_lower = raw.strip().lower()
    # Palabras completas primero (evitar falsos positivos: "ta" en "habilitador")
    if "historia" in s_lower or "user story" in s_lower or "h. usuario" in s_lower:
        return "HU"
    if "habilitador" in s_lower or "enabler" in s_lower:
        return "EN"
    if "spike" in s_lower or "investigac" in s_lower:
        return "SP"
    if "no func" in s_lower or "requisito" in s_lower:
        return "RN"
    if "document" in s_lower or s_lower.startswith("doc"):
        return "DO"
    if "tarea" in s_lower or "task" in s_lower or "técnica" in s_lower or "tecnica" in s_lower:
        return "TA"
    return "HU"


# ──────────────────────────────────────────────────────────────────────
# Parser CSV
# ──────────────────────────────────────────────────────────────────────

def _strip_bom(text: str) -> str:
    """Elimina BOM UTF-8 / UTF-16 residuales de Excel."""
    if not text:
        return text
    return text.lstrip("\ufeff").lstrip("\ufffe")


def _read_csv_rows(csv_text: str):
    """Detecta separador y devuelve (headers, rows). Reintenta con el otro sep si falla."""
    text = _strip_bom(csv_text).strip()
    if not text:
        raise ValueError("El CSV está vacío.")

    first_line = text.splitlines()[0]
    preferred = ";" if first_line.count(";") > first_line.count(",") else ","
    candidates = [preferred, "," if preferred == ";" else ";"]

    last_headers: List[str] = []
    for sep in candidates:
        reader = csv.DictReader(io.StringIO(text), delimiter=sep)
        headers = [((h or "").strip()) for h in (reader.fieldnames or [])]
        headers = [h for h in headers if h]
        last_headers = headers
        if not headers:
            continue
        # Si solo hay 1 columna y el otro sep existe en la cabecera, probar siguiente
        if len(headers) == 1 and ("," in first_line or ";" in first_line) and sep == preferred:
            continue
        rows = list(reader)
        if rows or _find_col(headers, _COL_TITULO):
            return headers, rows

    raise ValueError(
        f"No se pudo interpretar el CSV. Columnas detectadas: {last_headers}. "
        "Usa cabeceras como: id,titulo,tipo,estado,sprint (separadas por , o ;)."
    )


def parse_csv(csv_text: str) -> List[BacklogAuditItem]:
    """
    Parsea un string CSV y devuelve lista de BacklogAuditItem.
    Tolerante a BOM, columnas en español/inglés, estados Kanban y separadores ; o ,
    """
    items: List[BacklogAuditItem] = []
    headers, rows = _read_csv_rows(csv_text)

    col_titulo = _find_col(headers, _COL_TITULO)
    col_tipo = _find_col(headers, _COL_TIPO)
    col_estado = _find_col(headers, _COL_ESTADO)
    col_sprint = _find_col(headers, _COL_SPRINT)
    col_prior = _find_col(headers, _COL_PRIORIDAD)
    col_desc = _find_col(headers, _COL_DESC)
    id_col = _find_col(headers, ["id", "item_id", "código", "codigo", "code", "key"])

    if not col_titulo:
        raise ValueError(
            f"No se encontró columna de título en el CSV. "
            f"Columnas detectadas: {headers}. "
            "Usa una de: titulo, title, nombre, name, historia, tarea."
        )

    for i, row in enumerate(rows):
        # DictReader puede dejar claves None; normalizar acceso
        def cell(col: Optional[str]) -> str:
            if not col:
                return ""
            return str(row.get(col, "") or "").strip()

        titulo = cell(col_titulo)
        if not titulo:
            continue

        tipo = _normalize_tipo(cell(col_tipo) or "HU")
        estado = _normalize_estado(cell(col_estado) or "To Do")
        desc = cell(col_desc) or None

        sprint: Optional[int] = None
        sprint_raw = cell(col_sprint)
        if sprint_raw:
            try:
                sprint = int("".join(ch for ch in sprint_raw if ch.isdigit()) or "0") or None
            except ValueError:
                pass

        prioridad = cell(col_prior) or "Media"
        item_id = cell(id_col)
        if not item_id:
            item_id = f"{tipo}-{str(i + 1).zfill(3)}"

        items.append(BacklogAuditItem(
            id=item_id,
            titulo=titulo,
            tipo=tipo,
            estado=estado,
            sprint=sprint,
            prioridad=prioridad,
            descripcion=desc,
        ))

    if not items:
        raise ValueError(
            "El CSV no tiene filas con título válido. "
            "Revisa que haya datos debajo de la cabecera."
        )

    return items


# ──────────────────────────────────────────────────────────────────────
# Parser Notion (URL pública — scraping HTML)
# ──────────────────────────────────────────────────────────────────────

def fetch_notion_public(url: str) -> List[BacklogAuditItem]:
    """
    Intenta leer una página pública de Notion y extraer ítems del backlog.
    Usa scraping HTML ya que Notion no tiene API pública sin token.
    """
    items: List[BacklogAuditItem] = []
    try:
        headers_req = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        req = urllib.request.Request(url, headers=headers_req)
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8", errors="replace")

        import re

        # ── Método 1: tablas HTML estándar ────────────────────────────
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL | re.IGNORECASE)
        parsed_via_table = False

        if len(rows) > 1:
            header_cells = re.findall(r"<th[^>]*>(.*?)</th>", rows[0], re.DOTALL | re.IGNORECASE)
            headers_text = [re.sub(r"<[^>]+>", "", h).strip() for h in header_cells]

            col_titulo_i = col_estado_i = col_tipo_i = col_sprint_i = None
            for idx, h in enumerate(headers_text):
                h_lower = h.lower()
                if any(c in h_lower for c in _COL_TITULO) and col_titulo_i is None:
                    col_titulo_i = idx
                if any(c in h_lower for c in _COL_ESTADO) and col_estado_i is None:
                    col_estado_i = idx
                if any(c in h_lower for c in _COL_TIPO) and col_tipo_i is None:
                    col_tipo_i = idx
                if any(c in h_lower for c in _COL_SPRINT) and col_sprint_i is None:
                    col_sprint_i = idx

            if col_titulo_i is not None:
                parsed_via_table = True
                for i, row_html in enumerate(rows[1:], 1):
                    cells = re.findall(r"<td[^>]*>(.*?)</td>", row_html, re.DOTALL | re.IGNORECASE)
                    cells_text = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]

                    if col_titulo_i >= len(cells_text):
                        continue
                    titulo = cells_text[col_titulo_i]
                    if not titulo:
                        continue

                    estado_raw = (cells_text[col_estado_i]
                                  if col_estado_i is not None and col_estado_i < len(cells_text)
                                  else "To Do")
                    tipo_raw = (cells_text[col_tipo_i]
                                if col_tipo_i is not None and col_tipo_i < len(cells_text)
                                else "HU")
                    sprint_raw = (cells_text[col_sprint_i]
                                  if col_sprint_i is not None and col_sprint_i < len(cells_text)
                                  else "")

                    sprint: Optional[int] = None
                    try:
                        sprint = int(sprint_raw.strip()) if sprint_raw.strip() else None
                    except ValueError:
                        pass

                    items.append(BacklogAuditItem(
                        id=f"N-{str(i).zfill(3)}",
                        titulo=titulo,
                        tipo=_normalize_tipo(tipo_raw),
                        estado=_normalize_estado(estado_raw),
                        sprint=sprint,
                    ))

        # ── Método 2: fallback — bloques de texto de Notion ──────────
        if not parsed_via_table or not items:
            text_blocks = re.findall(
                r'class="[^"]*notion[^"]*"[^>]*>\s*([^<]{10,120})\s*<',
                html, re.IGNORECASE
            )
            seen: set = set()
            for i, text in enumerate(text_blocks[:60]):
                clean = re.sub(r"\s+", " ", text).strip()
                if clean and clean not in seen and len(clean) > 5:
                    seen.add(clean)
                    items.append(BacklogAuditItem(
                        id=f"N-{str(i + 1).zfill(3)}",
                        titulo=clean,
                        tipo="HU",
                        estado="To Do",
                    ))

    except Exception as e:
        print(f"[NOTION-PARSER-WARNING] Error al leer Notion: {e}")

    return items


# ──────────────────────────────────────────────────────────────────────
# Función unificada de entrada
# ──────────────────────────────────────────────────────────────────────

def parse_backlog(raw: str, source: str = "csv") -> List[BacklogAuditItem]:
    """
    Entry point unificado.

    Args:
        raw:    Texto CSV completo OR URL pública de Notion.
        source: "csv" | "notion"

    Returns:
        Lista normalizada de BacklogAuditItem.
    """
    if source == "notion":
        return fetch_notion_public(raw.strip())
    return parse_csv(raw)
