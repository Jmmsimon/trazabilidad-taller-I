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
    s = raw.strip().lower()
    if s in ("done", "terminado", "completado", "listo", "cerrado",
             "finished", "complete", "hecho"):
        return "Done"
    if s in ("in progress", "en progreso", "en curso", "doing", "wip",
             "in_progress", "progreso", "desarrollo"):
        return "In Progress"
    return "To Do"


def _normalize_tipo(raw: str) -> str:
    """Normaliza el tipo de ítem al código de dos letras estándar."""
    s = raw.strip().upper()
    VALID = {"HU", "TA", "SP", "EN", "RN", "DO", "EP"}
    if s in VALID:
        return s
    s_lower = raw.strip().lower()
    if "historia" in s_lower or "user story" in s_lower or "hu" in s_lower:
        return "HU"
    if "tarea" in s_lower or "task" in s_lower or "ta" in s_lower:
        return "TA"
    if "spike" in s_lower or "investigac" in s_lower or "sp" in s_lower:
        return "SP"
    if "habilitador" in s_lower or "enabler" in s_lower or "en" in s_lower:
        return "EN"
    if "no func" in s_lower or "requisito" in s_lower or "rn" in s_lower:
        return "RN"
    if "doc" in s_lower:
        return "DO"
    return "HU"


# ──────────────────────────────────────────────────────────────────────
# Parser CSV
# ──────────────────────────────────────────────────────────────────────

def parse_csv(csv_text: str) -> List[BacklogAuditItem]:
    """
    Parsea un string CSV y devuelve lista de BacklogAuditItem.
    Tolerante a columnas en español/inglés y separadores ; o ,
    """
    items: List[BacklogAuditItem] = []

    # Detectar separador dominante
    first_line = csv_text.strip().splitlines()[0] if csv_text.strip() else ""
    sep = ";" if first_line.count(";") > first_line.count(",") else ","

    reader = csv.DictReader(io.StringIO(csv_text), delimiter=sep)
    headers = list(reader.fieldnames or [])

    col_titulo = _find_col(headers, _COL_TITULO)
    col_tipo   = _find_col(headers, _COL_TIPO)
    col_estado = _find_col(headers, _COL_ESTADO)
    col_sprint = _find_col(headers, _COL_SPRINT)
    col_prior  = _find_col(headers, _COL_PRIORIDAD)
    col_desc   = _find_col(headers, _COL_DESC)
    id_col     = _find_col(headers, ["id", "item_id", "código", "codigo", "code"])

    if not col_titulo:
        raise ValueError(
            f"No se encontró columna de título en el CSV. "
            f"Columnas detectadas: {headers}. "
            "Usa una de: titulo, title, nombre, name, historia, tarea."
        )

    for i, row in enumerate(reader):
        titulo = row.get(col_titulo, "").strip()
        if not titulo:
            continue  # saltar filas vacías

        tipo   = _normalize_tipo(row.get(col_tipo, "HU") if col_tipo else "HU")
        estado = _normalize_estado(row.get(col_estado, "To Do") if col_estado else "To Do")
        desc   = row.get(col_desc, "").strip() if col_desc else None

        sprint_raw = row.get(col_sprint, "") if col_sprint else ""
        sprint: Optional[int] = None
        if sprint_raw:
            try:
                sprint = int(str(sprint_raw).strip())
            except ValueError:
                pass

        prioridad = row.get(col_prior, "Media").strip() if col_prior else "Media"

        item_id = row.get(id_col, "").strip() if id_col else ""
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
