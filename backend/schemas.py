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
