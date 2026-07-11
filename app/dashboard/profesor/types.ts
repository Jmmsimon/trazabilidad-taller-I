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

export interface CommitInfo {
  sha: string;
  mensaje: string;
  fecha: string;
  author: string;
  url?: string;
  alineado?: boolean;
  contribucion?: string;
}

export interface ProyectoResumen {
  proyectoId: string;
  nombre: string;
  alumnoId: string;
  alumnoNombre?: string;
  alumnoEmail?: string;
  status: "processing" | "pending_approval" | "active" | "rejected" | "error";
  scoreValidator: number;
  tracking_status: string;
  score_integridad: number;
  alertas_criticas: number;
  porcentaje_competencias: number;
}

export interface Hito {
  nombre: string;
  descripcion: string;
  semana: number;
  tareas: string[];
  evidencias: string[];
  validado_por_profesor?: boolean;
  feedback_profesor?: string;
  estado_hito?: string;
  tareas_estado?: string[];
  tareas_comentarios?: string[];
}

export interface ProyectoDetalle {
  proyectoId: string;
  nombre: string;
  alumnoId: string;
  alumnoNombre?: string;
  alumnoEmail?: string;
  status: string;
  scoreValidator: number;
  comentario_profesor?: string;
  repo_url?: string;
  demo_url?: string;
  propuesta: {
    nombre: string;
    descripcion: string;
    hitos: Hito[];
    backlog: Array<{
      titulo: string;
      prioridad: string;
    }>;
  };
  backlog_scrum?: {
    epicas?: BacklogEpica[];
  };
  tracking?: {
    score_integridad: number;
    diagnostico_riesgo: string;
    resumen_ejecutivo: string;
    alertas: Array<{ tipo: string; mensaje: string; severidad: string }>;
    reporte_competencias?: {
      porcentaje_adquirido: number;
      competencias: Array<{
        id: string;
        nombre: string;
        nivel: string;
        adquirida: boolean;
      }>;
    };
    estado_repo?: {
      repo_url: string | null;
      ci_status: string;
      demo_url: string | null;
      commits?: CommitInfo[];
    };
  };
  tracking_history?: Array<{
    fecha: string;
    score_integridad: number;
    porcentaje_competencias: number;
  }>;
  backlog_audit?: any;
}

export type FilterStatus = "todos" | "pending_approval" | "active" | "rejected";

export const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string }
> = {
  pending_approval: {
    label: "Pendiente",
    cls: "bg-amber-100 text-amber-800 border border-amber-200",
  },
  active: {
    label: "Activo",
    cls: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  },
  rejected: {
    label: "Rechazado",
    cls: "bg-red-100 text-red-800 border border-red-200",
  },
  processing: {
    label: "Procesando",
    cls: "bg-slate-105 text-slate-700 border border-slate-200",
  },
  error: {
    label: "Error",
    cls: "bg-red-100 text-red-800 border border-red-200",
  },
};

export const SEVERIDAD_COLORS: Record<string, string> = {
  baja: "text-blue-700 bg-blue-50 border-blue-100",
  media: "text-amber-700 bg-amber-50 border-amber-100",
  alta: "text-orange-700 bg-orange-50 border-orange-100",
  critica: "text-red-700 bg-red-50 border-red-100",
};

export const NIVEL_COLORS: Record<string, string> = {
  basico: "text-slate-500",
  intermedio: "text-indigo-650 font-semibold",
  avanzado: "text-emerald-700 font-semibold",
};
