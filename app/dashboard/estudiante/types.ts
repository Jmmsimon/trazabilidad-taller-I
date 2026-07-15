import { ReactNode } from "react";

export type Phase = "A" | "B" | "C" | "D";

export interface BacklogItem {
  id: string;
  tipo?: string;
  titulo: string;
  como?: string;
  quiero?: string;
  para?: string;
  criterios?: Array<{ descripcion: string }>;
  puntos?: number;
  prioridad?: string;
  depende_de?: string;
  estado_revision?: string;
  comentario_revision?: string;
  sprint?: number;
  semana_sugerida?: number;
  epicaId?: string;
  estado?: string;
}

export interface BacklogEpica {
  id: string;
  titulo: string;
  descripcion: string;
  items?: BacklogItem[];
}

export interface ProjectPlan {
  id: string;
  nombre: string;
  descripcion: string;
  stack: string[];
  scoreValidator: number;
  status?: string;
  motivo_rechazo?: string;
  hitos: {
    id?: string;
    nombre: string;
    descripcion: string;
    semana: number;
    tareas: string[];
    evidencias: string[];
    estado_hito?: string;
    tareas_estado?: string[];
    tareas_comentarios?: string[];
  }[];
  backlog: {
    titulo: string;
    como: string;
    quiero: string;
    para: string;
    prioridad: "Alta" | "Media" | "Baja";
  }[];
  backlog_scrum?: {
    epicas?: BacklogEpica[];
  };
  repo_url?: string;
  demo_url?: string;
}

export interface Competencia {
  id: string;
  nombre: string;
  nivel: "basico" | "intermedio" | "avanzado";
  adquirida: boolean;
}

export interface Alerta {
  tipo: string;
  mensaje: string;
  severidad: "baja" | "media" | "alta" | "critica";
}

export interface CommitInfo {
  sha: string;
  mensaje: string;
  fecha: string;
  author: string;
  url?: string;
  alineado?: boolean;
  contribucion?: string;
}

export interface EstadoRepo {
  repo_url: string | null;
  ultimo_commit_sha: string | null;
  ultimo_commit_fecha: string | null;
  ci_status: "pass" | "fail" | "unknown";
  demo_url: string | null;
  demo_activa: boolean;
  commits?: CommitInfo[];
}

export interface ReporteCompetencias {
  alumno_id: string;
  competencias: Competencia[];
  porcentaje_adquirido: number;
}

export interface TrackingData {
  score_integridad: number;
  diagnostico_riesgo: string;
  resumen_ejecutivo: string;
  alertas: Alerta[];
  reporte_competencias: ReporteCompetencias | null;
  estado_repo: EstadoRepo | null;
  evidencias: unknown[];
  tracking_history?: Array<{
    fecha: string;
    score_integridad: number;
    porcentaje_competencias: number;
  }>;
}

export interface TrackingState {
  status: "not_started" | "processing" | "completed" | "error";
  data: TrackingData | null;
  activeAgent?: string;
  progress?: number;
  detail?: string;
}
