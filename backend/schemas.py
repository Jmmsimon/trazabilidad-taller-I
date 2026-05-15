from typing import List, Optional, Literal
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


# ───────────────────────────────────────────────────────────
#  Subgrafo DISCOVERY
# ───────────────────────────────────────────────────────────

class PropuestaTecnica(BaseModel):
    tema: str
    descripcion: str
    stack: List[str] = Field(default_factory=list)
    hitos: List[Hito] = Field(default_factory=list)
    observaciones: Optional[str] = None


class DiscoveryState(BaseModel):
    idea_alumno: str = ""
    stack_tentativo: List[str] = Field(default_factory=list)
    propuesta: Optional[PropuestaTecnica] = None
    score_validator: int = 0
    feedback_validator: str = ""
    es_viable: bool = False
    backlog_po: List[str] = Field(default_factory=list)
    alumno_confirmado: bool = False
    iteracion: int = 0
    max_iteraciones: int = 5


# ───────────────────────────────────────────────────────────
#  Subgrafo TRACKING
# ───────────────────────────────────────────────────────────

class EstadoRepo(BaseModel):
    repo_url: Optional[str] = None
    ultimo_commit_sha: Optional[str] = None
    ultimo_commit_fecha: Optional[str] = None
    ci_status: Literal["pass", "fail", "unknown"] = "unknown"
    demo_url: Optional[str] = None
    demo_activa: bool = False


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
    score_integridad: float = 100.0
    diagnostico_riesgo: str = ""
    resumen_ejecutivo: str = ""
    ciclo_activo: bool = True

# ───────────────────────────────────────────────────────────
#  Helpers de conversión (necesarios para el grafo)
# ───────────────────────────────────────────────────────────

def propuesta_to_dict(p: PropuestaTecnica) -> dict:
    return p.model_dump()

def dict_to_propuesta(d: dict) -> PropuestaTecnica:
    return PropuestaTecnica(**d)

def dict_to_reporte(d: dict) -> ReporteCompetencias:
    return ReporteCompetencias(**d)
