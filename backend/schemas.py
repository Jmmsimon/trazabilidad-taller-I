from typing import List, Optional, Literal, Dict
from enum import Enum
from pydantic import BaseModel, Field


# ───────────────────────────────────────────────────────────
#  Modelos compartidos
# ───────────────────────────────────────────────────────────

class Competencia(BaseModel):
    id: str
    nombre: str
    nivel: Literal["basico", "intermedio", "avanzado"] = "basico"
    adquirida: bool = False


class Evidencia(BaseModel):
    id: str
    hito_id: str
    tipo: Literal["codigo", "documento", "demo", "test", "pipeline"]
    url: Optional[str] = None
    estado: Literal["pendiente", "subida", "validada"] = "pendiente"
    competencias_ids: List[str] = Field(default_factory=list)


class Hito(BaseModel):
    id: str
    nombre: str
    descripcion: str
    tareas: List[str] = Field(default_factory=list)
    evidencias_esperadas: List[str] = Field(default_factory=list)
    completado: bool = False
    semana_sugerida: Optional[int] = None  # sugerencia, no obligatorio
    estado_hito: str = "pendiente"          # "pendiente", "validado", "observado", "corregido"
    tareas_estado: List[str] = Field(default_factory=list)       # ok, observado
    tareas_comentarios: List[str] = Field(default_factory=list)  # retroalimentaciones por tarea


# ───────────────────────────────────────────────────────────
#  Subgrafo DISCOVERY
# ───────────────────────────────────────────────────────────

class PropuestaTecnica(BaseModel):
    tema: str
    descripcion: str
    stack: List[str] = Field(default_factory=list)
    hitos: List[Hito] = Field(default_factory=list)
    observaciones: Optional[str] = None
    backlog_scrum: Optional["BacklogScrum"] = None


class DiscoveryState(BaseModel):
    proyecto_id: str = ""
    idea_alumno: str = ""
    stack_tentativo: List[str] = Field(default_factory=list)
    propuesta: Optional[PropuestaTecnica] = None
    score_validator: int = 0
    feedback_validator: str = ""
    es_viable: bool = False
    backlog_po: List[str] = Field(default_factory=list)  # mantener por compatibilidad
    backlog_scrum: Optional["BacklogScrum"] = None        # nuevo campo estructurado
    alumno_confirmado: bool = False
    iteracion: int = 0
    max_iteraciones: int = 5


# ───────────────────────────────────────────────────────────
#  Subgrafo TRACKING
# ───────────────────────────────────────────────────────────

class CommitInfo(BaseModel):
    sha: str
    mensaje: str
    fecha: str
    author: str
    url: Optional[str] = None
    alineado: bool = True
    contribucion: Optional[str] = None


class EstadoRepo(BaseModel):
    repo_url: Optional[str] = None
    ultimo_commit_sha: Optional[str] = None
    ultimo_commit_fecha: Optional[str] = None
    ci_status: Literal["pass", "fail", "unknown"] = "unknown"
    demo_url: Optional[str] = None
    demo_activa: bool = False
    commits: List[CommitInfo] = Field(default_factory=list)


class ReporteCompetencias(BaseModel):
    alumno_id: str
    competencias: List[Competencia] = Field(default_factory=list)
    porcentaje_adquirido: float = 0.0


class AlertaDesvio(BaseModel):
    tipo: Literal["tarea_sin_evidencia", "pipeline_roto", "demo_caida", "commit_inactivo"]
    mensaje: str
    severidad: Literal["baja", "media", "alta", "critica"] = "media"


class TrackingState(BaseModel):
    alumno_id: str = ""
    propuesta_confirmada: Optional[PropuestaTecnica] = None
    estado_repo: Optional[EstadoRepo] = None
    evidencias: List[Evidencia] = Field(default_factory=list)
    reporte_competencias: Optional[ReporteCompetencias] = None
    alertas: List[AlertaDesvio] = Field(default_factory=list)
    score_integridad: float = 0.0
    diagnostico_riesgo: str = ""
    resumen_ejecutivo: str = ""
    ciclo_activo: bool = True

# ───────────────────────────────────────────────────────────
#  Scrum artifacts
# ───────────────────────────────────────────────────────────

class CriterioAceptacion(BaseModel):
    descripcion: str
    verificable: bool = True


class BacklogItem(BaseModel):
    id: str
    epicaId: str
    tipo: Literal["HU", "SP", "EN", "TA", "RN", "DO"] = "HU"
    titulo: str
    como: str        # "Como [rol]" o equivalente
    quiero: str      # "quiero [acción]" o equivalente
    para: str        # "para [beneficio]" o equivalente
    criterios: List[CriterioAceptacion] = Field(default_factory=list)
    definicion_done: List[str] = Field(default_factory=list)
    puntos: int = 1  # Story Points (1, 2, 3, 5, 8, 13)
    prioridad: Literal["Critica", "Alta", "Media", "Baja"] = "Media"
    depende_de: Optional[str] = None
    sprint: Optional[int] = None  # número de sprint asignado
    estado: Literal["backlog", "todo", "in_progress", "done"] = "backlog"
    estado_revision: str = "pendiente"                  # "pendiente", "aprobado", "observado"
    comentario_revision: Optional[str] = None


class Epica(BaseModel):
    id: str
    titulo: str
    descripcion: str
    items: List[BacklogItem] = Field(default_factory=list)


class Sprint(BaseModel):
    numero: int
    objetivo: str
    items_ids: List[str] = Field(default_factory=list)
    duracion_semanas: int = 2
    puntos_totales: int = 0


class BacklogScrum(BaseModel):
    epicas: List[Epica] = Field(default_factory=list)
    sprints: List[Sprint] = Field(default_factory=list)
    total_puntos: int = 0
    velocidad_estimada: int = 10  # puntos por sprint


# Actualizar referencias forward
PropuestaTecnica.model_rebuild()
DiscoveryState.model_rebuild()


# ───────────────────────────────────────────────────────────
#  Helpers de conversión (necesarios para el grafo)
# ───────────────────────────────────────────────────────────

def propuesta_to_dict(p: PropuestaTecnica) -> dict:
    return p.model_dump()

def dict_to_propuesta(d: dict) -> PropuestaTecnica:
    if isinstance(d, dict):
        if "backlog_scrum" in d and not isinstance(d["backlog_scrum"], dict):
            d.pop("backlog_scrum", None)
        if "hitos" in d:
            import uuid
            for h in d["hitos"]:
                if isinstance(h, dict):
                    if not h.get("id"):
                        h["id"] = f"hito-{uuid.uuid4().hex[:8]}"
                    sem = h.get("semana_sugerida")
                    if sem is not None:
                        if isinstance(sem, str):
                            sem = sem.strip()
                            if "-" in sem:
                                try:
                                    sem = int(sem.split("-")[0].strip())
                                except ValueError:
                                    sem = 1
                            else:
                                import re
                                nums = re.findall(r"\d+", sem)
                                if nums:
                                    sem = int(nums[0])
                                else:
                                    sem = 1
                        elif isinstance(sem, (int, float)):
                            sem = int(sem)
                        else:
                            sem = 1
                        h["semana_sugerida"] = sem
    return PropuestaTecnica(**d)

def dict_to_reporte(d: dict) -> ReporteCompetencias:
    return ReporteCompetencias(**d)


# ───────────────────────────────────────────────────────────
#  Auditoría de Backlog (Agente Auditor)
# ───────────────────────────────────────────────────────────


class SemaforoColor(str, Enum):
    ROJO = "rojo"        # 0–30%  → abandonado / sin código real
    NARANJA = "naranja"  # 31–55% → algo avanzó pero muy desfasado
    AMARILLO = "amarillo"  # 56–80% → avanza, le falta poco
    VERDE = "verde"      # 81–100% → acorde al backlog


class BacklogAuditItem(BaseModel):
    """Ítem normalizado del backlog del alumno (desde CSV o Notion)."""
    id: str
    titulo: str
    tipo: str = "HU"                   # HU, TA, SP, EN, RN, DO…
    estado: str = "To Do"             # To Do | In Progress | Done
    sprint: Optional[int] = None
    prioridad: Optional[str] = None
    descripcion: Optional[str] = None


class CodeSummary(BaseModel):
    """Resumen del repositorio GitHub leído por el agente."""
    archivos: List[str] = Field(default_factory=list)        # árbol completo del repo
    snippets: Dict[str, str] = Field(default_factory=dict)   # path → primeras 250 líneas
    lenguajes: Dict[str, int] = Field(default_factory=dict)  # ext → nro archivos
    bulk_commit_risk: bool = False     # True si hay commit masivo sospechoso
    total_commits: int = 0
    autores_unicos: List[str] = Field(default_factory=list)


class AuditItemResult(BaseModel):
    """Resultado de la auditoría para un ítem del backlog."""
    id: str
    titulo: str
    estado_backlog: str                # lo que dice el backlog (To Do / In Progress / Done)
    tiene_evidencia: bool = False      # ¿hay código que lo respalde?
    evidencia: Optional[str] = None   # archivo/función encontrada
    score_item: float = 0.0           # 0-100
    nota: Optional[str] = None


class BacklogAuditState(BaseModel):
    """Estado del grafo de auditoría de backlog."""
    proyecto_id: str = ""
    repo_url: str = ""
    backlog_raw: str = ""              # CSV string o JSON de Notion
    backlog_source: str = "csv"        # "csv" | "notion"
    # Parsed
    backlog_items: List[BacklogAuditItem] = Field(default_factory=list)
    code_summary: Optional[CodeSummary] = None
    commits_info: List["CommitInfo"] = Field(default_factory=list)
    # Results
    audit_results: List[AuditItemResult] = Field(default_factory=list)
    porcentaje_correspondencia: float = 0.0
    semaforo: SemaforoColor = SemaforoColor.ROJO
    desviaciones: List[str] = Field(default_factory=list)
    reporte_texto: str = ""
    error: Optional[str] = None


# Allow forward refs
BacklogAuditState.model_rebuild()
