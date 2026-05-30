"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
  Activity,
  GitCommit,
  Rocket,
  ChevronLeft,
  Loader2,
  RefreshCw,
  MessageSquare,
  Shield,
  BarChart3,
  Layers,
  LogOut,
} from "lucide-react";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface BacklogItem {
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
}

interface BacklogEpica {
  id: string;
  titulo: string;
  descripcion: string;
  items?: BacklogItem[];
}

interface CommitInfo {
  sha: string;
  mensaje: string;
  fecha: string;
  author: string;
  url?: string;
  alineado?: boolean;
  contribucion?: string;
}

interface ProyectoResumen {
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

interface Hito {
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

interface ProyectoDetalle {
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
}

// ─────────────────────────────────────────────
// CONSTANTES DE ESTILO
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string }
> = {
  pending_approval: {
    label: "Pendiente",
    cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
  active: {
    label: "Activo",
    cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  },
  rejected: {
    label: "Rechazado",
    cls: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
  processing: {
    label: "Procesando",
    cls: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
  },
  error: {
    label: "Error",
    cls: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
};

const SEVERIDAD_COLORS: Record<string, string> = {
  baja: "text-blue-400 bg-blue-500/5 border-blue-500/10",
  media: "text-amber-400 bg-amber-500/5 border-amber-500/10",
  alta: "text-orange-400 bg-orange-500/5 border-orange-500/10",
  critica: "text-red-400 bg-red-500/5 border-red-500/10",
};

const NIVEL_COLORS: Record<string, string> = {
  basico: "text-zinc-400",
  intermedio: "text-indigo-400",
  avanzado: "text-emerald-400",
};

const scoreColor = (score: number) =>
  score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";

const scoreBarColor = (score: number) =>
  score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";

const prioridadColor = (p: string) => {
  const lower = p.toLowerCase();
  if (lower === "alta") return "bg-red-500/10 text-red-400 border border-red-500/20";
  if (lower === "media") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
};

// ─────────────────────────────────────────────
// COMPONENTE SKELETON LISTA
// ─────────────────────────────────────────────
function SkeletonList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-zinc-800 rounded-2xl h-48"
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE SKELETON DETALLE
// ─────────────────────────────────────────────
function SkeletonDetail() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="animate-pulse bg-zinc-800 rounded-2xl h-32" />
        <div className="animate-pulse bg-zinc-800 rounded-2xl h-48" />
        <div className="animate-pulse bg-zinc-800 rounded-2xl h-64" />
      </div>
      <div className="space-y-4">
        <div className="animate-pulse bg-zinc-800 rounded-2xl h-40" />
        <div className="animate-pulse bg-zinc-800 rounded-2xl h-40" />
        <div className="animate-pulse bg-zinc-800 rounded-2xl h-40" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VISTA LISTA
// ─────────────────────────────────────────────
type FilterStatus = "todos" | "pending_approval" | "active" | "rejected";

interface ListaViewProps {
  proyectos: ProyectoResumen[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectProject: (id: string) => void;
}

function ListaView({
  proyectos,
  loading,
  error,
  onRetry,
  onSelectProject,
}: ListaViewProps) {
  const [filtro, setFiltro] = useState<FilterStatus>("todos");

  const filtrados =
    filtro === "todos"
      ? proyectos
      : proyectos.filter((p) => p.status === filtro);

  const FILTROS: { key: FilterStatus; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "pending_approval", label: "Pendientes" },
    { key: "active", label: "Activos" },
    { key: "rejected", label: "Rechazados" },
  ];

  return (
    <motion.div
      key="lista"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Panel del Profesor
            </h1>
          </div>
          <p className="text-zinc-400 text-sm ml-13 pl-1">
            Gestión de proyectos académicos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold">
            {proyectos.length} proyecto{proyectos.length !== 1 ? "s" : ""}
          </span>
          {loading && (
            <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(({ key, label }) => (
          <button
            key={key}
            id={`filtro-${key}`}
            onClick={() => setFiltro(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filtro === key
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {error ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-zinc-400">{error}</p>
          <button
            id="btn-reintentar-lista"
            onClick={onRetry}
            className="px-6 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      ) : loading && proyectos.length === 0 ? (
        <SkeletonList />
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <BookOpen className="w-10 h-10 text-zinc-600" />
          <p className="text-zinc-500">No hay proyectos en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((proyecto) => {
            const statusCfg =
              STATUS_CONFIG[proyecto.status] ?? STATUS_CONFIG.processing;
            return (
              <motion.div
                key={proyecto.proyectoId}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 flex flex-col gap-4 hover:border-zinc-700/70 transition-all cursor-pointer"
                onClick={() => onSelectProject(proyecto.proyectoId)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-zinc-100 truncate">
                      {proyecto.nombre}
                    </h3>
                    <p className="text-xs text-zinc-300 font-semibold mt-0.5 truncate">
                      {proyecto.alumnoNombre || proyecto.alumnoId}
                    </p>
                    {proyecto.alumnoNombre && (
                      <p className="text-[10px] text-zinc-500 truncate">
                        {proyecto.alumnoId}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusCfg.cls}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                {/* Score validator */}
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-indigo-400">
                    {proyecto.scoreValidator}
                  </span>
                  <div className="text-[10px] text-zinc-600 uppercase font-semibold leading-tight">
                    Score<br />Validator
                  </div>
                  {proyecto.alertas_criticas > 0 && (
                    <span className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
                      <AlertCircle className="w-3 h-3" />
                      {proyecto.alertas_criticas} crítica
                      {proyecto.alertas_criticas !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Barra integridad */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Integridad</span>
                    <span className={scoreColor(proyecto.score_integridad)}>
                      {proyecto.score_integridad}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(
                        proyecto.score_integridad
                      )}`}
                      style={{
                        width: `${Math.min(proyecto.score_integridad, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Competencias */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    Competencias
                  </span>
                  <span className="text-zinc-300 font-semibold">
                    {proyecto.porcentaje_competencias.toFixed(0)}%
                  </span>
                </div>

                {/* Ver detalle */}
                <button
                  id={`btn-detalle-${proyecto.proyectoId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProject(proyecto.proyectoId);
                  }}
                  className="w-full mt-auto py-2 rounded-xl bg-zinc-800/70 hover:bg-indigo-600 text-zinc-300 hover:text-white text-xs font-bold transition-all group-hover:bg-indigo-600 group-hover:text-white"
                >
                  Ver detalle →
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// VISTA DETALLE
// ─────────────────────────────────────────────
interface DetalleViewProps {
  detalle: ProyectoDetalle | null;
  loadingDetalle: boolean;
  errorDetalle: string | null;
  onVolver: () => void;
  onRefetch: () => void;
}

function DetalleView({
  detalle,
  loadingDetalle,
  errorDetalle,
  onVolver,
  onRefetch,
}: DetalleViewProps) {
  const [comentario, setComentario] = useState("");
  const [motivo, setMotivo] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleReAnalizar = async () => {
    if (!detalle) return;
    setIsAnalyzing(true);
    try {
      await fetch(`/api/proyectos/${detalle.proyectoId}/tracking/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumnoId: detalle.alumnoId,
          proyectoId: detalle.proyectoId,
        }),
      });
      setTimeout(() => {
        onRefetch();
        setIsAnalyzing(false);
      }, 8000);
    } catch (e) {
      console.error("Error al iniciar análisis:", e);
      setIsAnalyzing(false);
    }
  };

  const getCommitChartData = () => {
    if (!detalle) return { days: [], counts: [] };
    const commits = detalle.tracking?.estado_repo?.commits || [];
    const days = [];
    const counts = [];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      
      const count = commits.filter((c) => {
        return c.fecha && c.fecha.startsWith(dateString);
      }).length;
      
      days.push(dayNames[d.getDay()]);
      counts.push(count);
    }
    return { days, counts };
  };
  const [loadingAprobar, setLoadingAprobar] = useState(false);
  const [loadingRechazar, setLoadingRechazar] = useState(false);
  // hito index → { open: bool, feedback: string, loading: bool }
  const [hitoStates, setHitoStates] = useState<
    Record<number, { open: boolean; feedback: string; loading: boolean }>
  >({});

  const setHitoField = (
    idx: number,
    field: "open" | "feedback" | "loading",
    value: boolean | string
  ) => {
    setHitoStates((prev) => {
      const current = prev[idx] ?? { open: false, feedback: "", loading: false };
      return { ...prev, [idx]: { ...current, [field]: value } };
    });
  };

  const [editingTareasEstado, setEditingTareasEstado] = useState<Record<number, string[]>>({});
  const [editingTareasComentarios, setEditingTareasComentarios] = useState<Record<number, string[]>>({});

  const [revisandoBacklogItem, setRevisandoBacklogItem] = useState<BacklogItem | null>(null);
  const [comentarioBacklog, setComentarioBacklog] = useState("");
  const [estadoBacklog, setEstadoBacklog] = useState<"aprobado" | "observado">("aprobado");

  const handleToggleTaskStatus = (hitoIdx: number, taskIdx: number, status: "ok" | "observado") => {
    setEditingTareasEstado((prev) => {
      const hitoStatus = prev[hitoIdx] ? [...prev[hitoIdx]] : [...(hitos[hitoIdx]?.tareas_estado || [])];
      while (hitoStatus.length < hitos[hitoIdx].tareas.length) {
        hitoStatus.push("ok");
      }
      hitoStatus[taskIdx] = status;
      return { ...prev, [hitoIdx]: hitoStatus };
    });
  };

  const handleTaskCommentChange = (hitoIdx: number, taskIdx: number, comment: string) => {
    setEditingTareasComentarios((prev) => {
      const hitoComments = prev[hitoIdx] ? [...prev[hitoIdx]] : [...(hitos[hitoIdx]?.tareas_comentarios || [])];
      while (hitoComments.length < hitos[hitoIdx].tareas.length) {
        hitoComments.push("");
      }
      hitoComments[taskIdx] = comment;
      return { ...prev, [hitoIdx]: hitoComments };
    });
  };

  const handleGuardarRevisionHito = async (idx: number) => {
    if (!detalle) return;
    setHitoField(idx, "loading", true);
    try {
      const currentTasks = hitos[idx].tareas;
      const tEstado = editingTareasEstado[idx] || hitos[idx].tareas_estado || [];
      const tComentarios = editingTareasComentarios[idx] || hitos[idx].tareas_comentarios || [];
      
      const finalEstado = Array.from({ length: currentTasks.length }, (_, i) => tEstado[i] || "ok");
      const finalComentarios = Array.from({ length: currentTasks.length }, (_, i) => tComentarios[i] || "");

      const tieneObservaciones = finalEstado.includes("observado");
      const estadoHito = tieneObservaciones ? "observado" : "validado";

      await fetch(
        `/api/profesor/proyectos/${detalle.proyectoId}/hitos/${idx}/revisar-tareas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estado_hito: estadoHito,
            tareas_estado: finalEstado,
            tareas_comentarios: finalComentarios,
          }),
        }
      );
      onRefetch();
      setHitoField(idx, "open", false);
    } catch (e) {
      console.error("Error al guardar revisión del hito:", e);
    } finally {
      setHitoField(idx, "loading", false);
    }
  };


  const handleAprobar = async () => {
    if (!detalle) return;
    setLoadingAprobar(true);
    try {
      await fetch(`/api/profesor/proyectos/${detalle.proyectoId}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario }),
      });
      onRefetch();
    } finally {
      setLoadingAprobar(false);
    }
  };

  const handleRechazar = async () => {
    if (!detalle) return;
    setLoadingRechazar(true);
    try {
      await fetch(`/api/profesor/proyectos/${detalle.proyectoId}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      onRefetch();
    } finally {
      setLoadingRechazar(false);
    }
  };

  const handleValidarHito = async (idx: number) => {
    if (!detalle) return;
    const fb = hitoStates[idx]?.feedback ?? "";
    setHitoField(idx, "loading", true);
    try {
      await fetch(
        `/api/profesor/proyectos/${detalle.proyectoId}/hitos/${idx}/validar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validado: true, feedback: fb }),
        }
      );
      onRefetch();
      setHitoField(idx, "open", false);
    } finally {
      setHitoField(idx, "loading", false);
    }
  };

  if (loadingDetalle && !detalle) return <SkeletonDetail />;

  if (errorDetalle) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-zinc-400">{errorDetalle}</p>
        <button
          id="btn-reintentar-detalle"
          onClick={onRefetch}
          className="px-6 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  if (!detalle) return null;

  const statusCfg = STATUS_CONFIG[detalle.status] ?? STATUS_CONFIG.processing;
  const tracking = detalle.tracking;
  const hitos = detalle.propuesta?.hitos ?? [];
  const backlog = detalle.propuesta?.backlog ?? [];
  const alertas = tracking?.alertas ?? [];
  const competencias = tracking?.reporte_competencias?.competencias ?? [];
  const competenciasAdquiridas = competencias.filter((c) => c.adquirida);
  const competenciasEnProgreso = competencias.filter((c) => !c.adquirida);

  return (
    <motion.div
      key="detalle"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
    >
      {/* ── COLUMNAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── COLUMNA IZQUIERDA (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
            <button
              id="btn-volver"
              onClick={onVolver}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-200 text-sm font-medium mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">
                  {detalle.nombre}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-zinc-200 font-semibold">
                    {detalle.alumnoNombre || "Alumno"}
                  </span>
                  {detalle.alumnoEmail && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span className="text-zinc-400 text-xs">{detalle.alumnoEmail}</span>
                    </>
                  )}
                </div>
                {(detalle.repo_url || detalle.demo_url) && (
                  <div className="flex gap-4 mt-3 text-xs">
                    {detalle.repo_url && (
                      <a
                        href={detalle.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-indigo-400 hover:underline font-semibold"
                      >
                        <GitCommit className="w-3.5 h-3.5" /> Repositorio
                      </a>
                    )}
                    {detalle.demo_url && (
                      <a
                        href={detalle.demo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-emerald-400 hover:underline font-semibold"
                      >
                        <Rocket className="w-3.5 h-3.5" /> Demo en vivo
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusCfg.cls}`}
                >
                  {statusCfg.label}
                </span>
                {detalle.repo_url && (
                  <button
                    id="btn-re-analizar"
                    onClick={handleReAnalizar}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800/60 disabled:text-zinc-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/10 disabled:shadow-none"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {isAnalyzing ? "Analizando..." : "Analizar Repo"}
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Propuesta técnica */}
          <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Propuesta técnica
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {detalle.propuesta?.descripcion ?? "Sin descripción."}
            </p>
          </section>

          {/* Aprobar / Rechazar roadmap */}
          {detalle.status === "pending_approval" && (
            <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4" /> Revisión del roadmap
              </h3>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium">
                  Comentario / Motivo
                </label>
                <textarea
                  id="textarea-comentario"
                  value={comentario || motivo}
                  onChange={(e) => {
                    setComentario(e.target.value);
                    setMotivo(e.target.value);
                  }}
                  placeholder="Escribe un comentario para el alumno..."
                  className="w-full h-24 bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  id="btn-aprobar"
                  onClick={handleAprobar}
                  disabled={loadingAprobar}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                >
                  {loadingAprobar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Aprobar roadmap
                </button>
                <button
                  id="btn-rechazar"
                  onClick={handleRechazar}
                  disabled={loadingRechazar}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {loadingRechazar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Rechazar
                </button>
              </div>
            </section>
          )}

          {/* Banner aprobado */}
          {detalle.status === "active" && detalle.comentario_profesor && (
            <div className="flex gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Roadmap aprobado</p>
                <p className="text-emerald-300/70 text-xs mt-1">
                  {detalle.comentario_profesor}
                </p>
              </div>
            </div>
          )}

          {/* Hitos */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4" /> Hitos del proyecto
            </h3>
            {hitos.length === 0 && (
              <p className="text-zinc-600 text-sm">Sin hitos definidos.</p>
            )}
            {hitos.map((hito, idx) => {
              const hitoState = hitoStates[idx] ?? {
                open: false,
                feedback: "",
                loading: false,
              };
              return (
                <div
                  key={idx}
                  className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">
                        Semana {hito.semana}
                      </span>
                      <h4 className="font-bold text-zinc-100">{hito.nombre}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {hito.estado_hito === "validado" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Validado
                        </span>
                      ) : hito.estado_hito === "observado" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-405 border border-red-500/20 animate-pulse">
                          <AlertCircle className="w-3 h-3" /> Observado
                        </span>
                      ) : hito.estado_hito === "corregido" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                          <Activity className="w-3 h-3" /> Corregido (Re-evaluar)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                          Pendiente
                        </span>
                      )}

                      <button
                        id={`btn-validar-hito-${idx}`}
                        onClick={() => {
                          if (!editingTareasEstado[idx]) {
                            const initialEstado = hito.tareas_estado || Array.from({ length: hito.tareas.length }, () => "ok");
                            const initialComentarios = hito.tareas_comentarios || Array.from({ length: hito.tareas.length }, () => "");
                            setEditingTareasEstado((prev) => ({ ...prev, [idx]: initialEstado }));
                            setEditingTareasComentarios((prev) => ({ ...prev, [idx]: initialComentarios }));
                          }
                          setHitoField(idx, "open", !hitoState.open);
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-indigo-600 text-zinc-400 hover:text-white transition-all animate-transition"
                      >
                        {hitoState.open ? "Cerrar" : "Auditar Hito"}
                      </button>
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {hito.descripcion}
                  </p>

                  {/* Lista de tareas auditadas */}
                  <div className="space-y-1.5 bg-zinc-950/20 p-3 rounded-xl border border-zinc-850/30">
                    {hito.tareas.map((tarea, j) => {
                      const tState = (hito.tareas_estado || [])[j] || "ok";
                      const tComment = (hito.tareas_comentarios || [])[j] || "";
                      return (
                        <div key={j} className="text-xs space-y-1">
                          <div className="flex gap-2 items-start">
                            {tState === "ok" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            ) : tState === "corregido" ? (
                              <Activity className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
                            )}
                            <span className={`${tState === "observado" ? "text-zinc-300 font-semibold" : "text-zinc-400"}`}>
                              {tarea}
                            </span>
                            {tState === "corregido" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap ml-auto">
                                Corregido
                              </span>
                            )}
                          </div>
                          {tState === "observado" && tComment && (
                            <div className="pl-5 text-[11px] text-red-400 italic">
                              Obs: {tComment}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Panel de auditoría expandible */}
                  <AnimatePresence>
                    {hitoState.open && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden pt-3 border-t border-zinc-800/40"
                      >
                        <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                          Auditoría de tareas del hito
                        </h5>
                        <div className="space-y-3">
                          {hito.tareas.map((tarea, tIdx) => {
                            const taskStatus = (editingTareasEstado[idx] || [])[tIdx] || "ok";
                            const taskComment = (editingTareasComentarios[idx] || [])[tIdx] || "";
                            return (
                              <div key={tIdx} className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex gap-2">
                                    <span className="text-xs font-bold text-zinc-500 mt-0.5">{tIdx + 1}.</span>
                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">{tarea}</p>
                                  </div>
                                  <div className="flex gap-1.5 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTaskStatus(idx, tIdx, "ok")}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                        taskStatus === "ok"
                                          ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                                          : "bg-zinc-900 text-zinc-500 hover:text-zinc-400 border border-transparent"
                                      }`}
                                    >
                                      Aprobado
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTaskStatus(idx, tIdx, "observado")}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                        taskStatus === "observado"
                                          ? "bg-red-600/20 text-red-400 border border-red-500/30"
                                          : "bg-zinc-900 text-zinc-500 hover:text-zinc-400 border border-transparent"
                                      }`}
                                    >
                                      Observar
                                    </button>
                                  </div>
                                </div>
                                {taskStatus === "observado" && (
                                  <input
                                    type="text"
                                    value={taskComment}
                                    onChange={(e) => handleTaskCommentChange(idx, tIdx, e.target.value)}
                                    placeholder="Detalla qué está mal en esta tarea específica..."
                                    className="w-full bg-zinc-950/60 border border-zinc-850 rounded-lg py-1.5 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500/30 placeholder:text-zinc-655"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button
                          id={`btn-confirmar-hito-${idx}`}
                          onClick={() => handleGuardarRevisionHito(idx)}
                          disabled={hitoState.loading}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/10"
                        >
                          {hitoState.loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Confirmar Auditoría de Hito
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </section>

          {/* Backlog simple (fall-back) */}
          {backlog.length > 0 && !detalle.backlog_scrum?.epicas?.length && (
            <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Backlog (Historias de Usuario)
              </h3>
              <div className="space-y-2">
                {backlog.map((story, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2 border-b border-zinc-800/50 last:border-0"
                  >
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prioridadColor(
                        story.prioridad
                      )}`}
                    >
                      {story.prioridad}
                    </span>
                    <span className="text-zinc-300 text-sm flex-1">
                      {story.titulo}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gráfico de Actividad de Commits (Últimos 7 días) */}
          {detalle.tracking?.estado_repo?.commits && (
            (() => {
              const chartData = getCommitChartData();
              const maxCount = Math.max(...chartData.counts, 1);
              return (
                <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Actividad de Commits (Últimos 7 días)
                  </h3>
                  <div className="flex items-end justify-between h-28 pt-4 px-4 bg-zinc-950/20 border border-zinc-850/50 rounded-2xl">
                    {chartData.days.map((day, idx) => {
                      const count = chartData.counts[idx];
                      const percent = (count / maxCount) * 80;
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 group/bar relative h-full justify-end pb-2">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none z-20">
                            {count} commit{count !== 1 ? "s" : ""}
                          </div>
                          {/* Bar */}
                          <div
                            style={{ height: `${percent || 4}%` }}
                            className={`w-1/3 rounded-t transition-all duration-500 ${
                              count > 0
                                ? "bg-gradient-to-t from-indigo-600 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.25)]"
                                : "bg-zinc-800/40"
                            }`}
                          />
                          <span className="text-[10px] text-zinc-500 font-bold mt-2">
                            {day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()
          )}

          {/* Historial de Commits */}
          {detalle.tracking?.estado_repo?.commits && (
            <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <GitCommit className="w-4 h-4" /> Historial de Commits ({detalle.tracking.estado_repo.commits.length})
              </h3>
              {detalle.tracking.estado_repo.commits.length === 0 ? (
                <p className="text-zinc-500 text-xs py-2">No se han registrado commits reales o simulados.</p>
              ) : (
                <div className="relative pl-6 border-l border-zinc-800 space-y-6">
                  {detalle.tracking.estado_repo.commits.map((commit, cIdx) => (
                    <div key={commit.sha || cIdx} className="relative group/commit">
                      {/* Dot/Icon */}
                      <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-zinc-950 border-2 ${
                        commit.alineado !== false ? "border-indigo-500" : "border-red-500 animate-pulse"
                      } flex items-center justify-center`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          commit.alineado !== false ? "bg-indigo-500" : "bg-red-500"
                        }`} />
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                          <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                            {commit.sha}
                          </span>
                          <span className="font-semibold text-zinc-300">
                            {commit.author}
                          </span>
                          <span>
                            {commit.fecha}
                          </span>
                          {commit.url && (
                            <a
                              href={commit.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-indigo-400 hover:underline font-semibold ml-auto flex items-center gap-0.5"
                            >
                              Ver en GitHub →
                            </a>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-zinc-200 leading-snug break-words font-medium">
                            {commit.mensaje}
                          </p>
                          
                          {/* Semantic Alignment Tag */}
                          <div className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl border text-[11px] ${
                            commit.alineado !== false
                              ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-300/80"
                              : "bg-red-500/5 border-red-500/10 text-red-300/80"
                          }`}>
                            <span className={`font-bold uppercase tracking-wider flex items-center gap-1 ${
                              commit.alineado !== false ? "text-emerald-400" : "text-red-400 animate-pulse"
                            }`}>
                              {commit.alineado !== false ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                              )}
                              {commit.alineado !== false ? "Alineado con Hito" : "Alerta de Desvío"}
                            </span>
                            {commit.contribucion && (
                              <>
                                <span className="hidden sm:inline text-zinc-700">•</span>
                                <span className="font-semibold italic">
                                  {commit.contribucion}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── SIDEBAR (1/3) ── */}
        <aside className="space-y-5">
          {/* Métricas de integridad */}
          <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Métricas de integridad
            </h3>
            {tracking ? (
              <>
                <div className="text-center">
                  <div
                    className={`text-4xl font-black ${scoreColor(
                      tracking.score_integridad
                    )}`}
                  >
                    {tracking.score_integridad}
                  </div>
                  <div className="text-[10px] text-zinc-600 uppercase">
                    / 100
                  </div>
                </div>
                <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(
                      tracking.score_integridad
                    )}`}
                    style={{
                      width: `${Math.min(tracking.score_integridad, 100)}%`,
                    }}
                  />
                </div>
                {tracking.diagnostico_riesgo && (
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {tracking.diagnostico_riesgo}
                  </p>
                )}
                {/* Estado repo */}
                {tracking.estado_repo && (
                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600">CI Status</span>
                      <span
                        className={
                          tracking.estado_repo.ci_status === "pass"
                            ? "text-emerald-400 font-bold"
                            : tracking.estado_repo.ci_status === "fail"
                            ? "text-red-400 font-bold"
                            : "text-zinc-500"
                        }
                      >
                        {tracking.estado_repo.ci_status}
                      </span>
                    </div>
                    {tracking.estado_repo.repo_url && (
                      <a
                        href={tracking.estado_repo.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:underline"
                      >
                        <GitCommit className="w-3 h-3" /> Repositorio
                      </a>
                    )}
                    {tracking.estado_repo.demo_url && (
                      <a
                        href={tracking.estado_repo.demo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
                      >
                        <Rocket className="w-3 h-3" /> Demo
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-600 text-center py-2">
                Sin datos de tracking aún.
              </p>
            )}
          </div>

          {/* Alertas DevOps */}
          <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> Alertas DevOps
            </h3>
            {alertas.length === 0 ? (
              <div className="flex items-center gap-2 py-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> Sin alertas
              </div>
            ) : (
              <div className="space-y-3">
                {alertas.map((alerta, i) => {
                  const neonCls = alerta.severidad === "critica"
                    ? "border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse"
                    : alerta.severidad === "alta"
                    ? "border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.2)] animate-pulse"
                    : "border-zinc-800/60";
                  const bgCls = SEVERIDAD_COLORS[alerta.severidad] || SEVERIDAD_COLORS.baja;

                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-3.5 transition-all ${bgCls} ${neonCls}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {alerta.tipo.replace(/_/g, " ")}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          alerta.severidad === "critica" ? "bg-red-500/20 text-red-300" :
                          alerta.severidad === "alta" ? "bg-orange-500/20 text-orange-300" :
                          alerta.severidad === "media" ? "bg-amber-500/20 text-amber-300" :
                          "bg-blue-500/20 text-blue-300"
                        }`}>
                          {alerta.severidad}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed font-medium">
                        {alerta.mensaje}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Competencias */}
          <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5" /> Competencias
            </h3>
            {tracking?.reporte_competencias ? (
              <>
                {/* Circular Gauge */}
                <div className="flex items-center gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/40">
                  <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="#18181b"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="url(#comp-gradient)"
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 32}
                        strokeDashoffset={2 * Math.PI * 32 * (1 - Math.min(tracking.reporte_competencias.porcentaje_adquirido, 100) / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="comp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute text-base font-extrabold text-white">
                      {tracking.reporte_competencias.porcentaje_adquirido.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-bold text-zinc-300">Progreso Total</div>
                    <div className="text-[10px] text-zinc-500 leading-tight">
                      {competenciasAdquiridas.length} de {competencias.length} competencias validadas
                    </div>
                  </div>
                </div>

                {/* List of competencies */}
                <div className="space-y-2">
                  {competencias.map((c) => {
                    const nivelCfg = NIVEL_COLORS[c.nivel] ?? NIVEL_COLORS.basico;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          c.adquirida
                            ? "bg-emerald-500/5 border-emerald-500/20 text-zinc-200"
                            : "bg-zinc-950/30 border-zinc-900 text-zinc-500"
                        }`}
                      >
                        {c.adquirida ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600 flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold truncate ${c.adquirida ? "text-zinc-200" : "text-zinc-500"}`}>
                            {c.nombre}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-bold uppercase ${nivelCfg}`}>
                              {c.nivel}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-600 text-center py-2">
                Sin datos de competencias.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* ── BACKLOG ÁGIL ESTRUCTURADO (FULL WIDTH) ── */}
      {detalle.backlog_scrum?.epicas && detalle.backlog_scrum.epicas.length > 0 && (
        <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 overflow-x-auto">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400">
            <Layers className="w-6 h-6" /> Backlog Ágil Estructurado
          </h3>
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3 rounded-tl-xl">ID</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 min-w-[150px]">Título</th>
                <th className="px-4 py-3 min-w-[250px]">Descripción / HU</th>
                <th className="px-4 py-3 min-w-[200px]">Criterios de aceptación</th>
                <th className="px-4 py-3 text-center">Est.</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Depende de</th>
                <th className="px-4 py-3">Épica</th>
                <th className="px-4 py-3 rounded-tr-xl text-center">Auditoría</th>
              </tr>
            </thead>
            <tbody>
              {detalle.backlog_scrum.epicas.flatMap((epica: BacklogEpica) => [
                // Fila de la Épica misma
                <tr key={epica.id} className="border-b border-zinc-800/50 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-300">{epica.id}</td>
                  <td className="px-4 py-3 font-bold text-indigo-400">EP</td>
                  <td className="px-4 py-3 font-bold text-zinc-200">{epica.titulo}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{epica.descripcion}</td>
                  <td className="px-2 py-1 text-zinc-500 italic text-xs">--</td>
                  <td className="px-4 py-3 text-center text-zinc-500">--</td>
                  <td className="px-4 py-3 font-bold text-orange-400">Crítica</td>
                  <td className="px-4 py-3 text-zinc-500">--</td>
                  <td className="px-4 py-3 text-zinc-500">--</td>
                  <td className="px-4 py-3 text-center text-zinc-500">--</td>
                </tr>,
                // Filas de los Items hijos
                ...(epica.items?.map((item: BacklogItem) => (
                  <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{item.id}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded bg-zinc-800 text-[10px] font-bold text-zinc-300">
                        {item.tipo || "HU"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-300">{item.titulo}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 leading-snug">
                      {`Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      <ul className="list-disc list-inside space-y-1">
                        {item.criterios?.map((c: { descripcion: string }, idx: number) => (
                          <li key={idx} className="line-clamp-2">{c.descripcion}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{item.puntos || 0} SP</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-1 rounded-full font-bold ${
                        item.prioridad === 'Critica' ? 'bg-red-500/20 text-red-400' :
                        item.prioridad === 'Alta' ? 'bg-orange-500/20 text-orange-400' :
                        item.prioridad === 'Media' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {item.prioridad || "Media"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                      {item.depende_de || "--"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-indigo-400/70">
                      {epica.id}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1.5">
                        {item.estado_revision === "aprobado" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            Aprobado
                          </span>
                        ) : item.estado_revision === "observado" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse">
                            Observado
                          </span>
                        ) : item.estado_revision === "corregido" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 animate-pulse">
                            Corregido
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
                            Pendiente
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRevisandoBacklogItem(item);
                            setEstadoBacklog((item.estado_revision === "aprobado" || item.estado_revision === "observado") ? item.estado_revision : "aprobado");
                            setComentarioBacklog(item.comentario_revision || "");
                          }}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Auditar
                        </button>
                      </div>
                      {item.estado_revision === "observado" && item.comentario_revision && (
                        <p className="text-[10px] text-red-450 italic mt-1 max-w-[150px] truncate" title={item.comentario_revision}>
                          Obs: {item.comentario_revision}
                        </p>
                      )}
                    </td>
                  </tr>
                )) || [])
              ])}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Drawer Flotante de Auditoría de Backlog */}
      <AnimatePresence>
        {revisandoBacklogItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden backdrop-blur-2xl bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative"
            >
              <h3 className="text-lg font-bold text-zinc-100 mb-1">
                Auditoría de Item: {revisandoBacklogItem.id}
              </h3>
              <p className="text-xs text-zinc-400 mb-4 truncate font-medium">
                {revisandoBacklogItem.titulo}
              </p>
              
              <div className="space-y-4">
                {/* State selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                    Estado de revisión
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEstadoBacklog("aprobado")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        estadoBacklog === "aprobado"
                          ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-400 border border-transparent"
                      }`}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstadoBacklog("observado")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        estadoBacklog === "observado"
                          ? "bg-red-600/20 text-red-400 border border-red-500/30"
                          : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-400 border border-transparent"
                      }`}
                    >
                      Observar
                    </button>
                  </div>
                </div>

                {/* Comment field */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                    Comentarios / Observaciones
                  </label>
                  <textarea
                    value={comentarioBacklog}
                    onChange={(e) => setComentarioBacklog(e.target.value)}
                    placeholder="Especifica detalladamente los cambios requeridos..."
                    className="w-full h-24 bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRevisandoBacklogItem(null)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-455 hover:text-zinc-300 text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch(`/api/profesor/proyectos/${detalle.proyectoId}/backlog/${revisandoBacklogItem.id}/revisar`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            estado_revision: estadoBacklog,
                            comentario_revision: comentarioBacklog,
                          }),
                        });
                        onRefetch();
                        setRevisandoBacklogItem(null);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/10"
                  >
                    Guardar Auditoría
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function ProfesorDashboard() {
  const { user, logout, loginAsGuest } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<"list" | "detail">("list");
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<ProyectoDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // ── Fetch lista ──────────────────────────────
  const fetchLista = useCallback(async () => {
    try {
      const res = await fetch("/api/profesor/proyectos");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProyectoResumen[] = await res.json();
      setProyectos(data);
      setErrorLista(null);
    } catch {
      setErrorLista("No se pudo cargar la lista de proyectos.");
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLista();
    const interval = setInterval(fetchLista, 10000);
    return () => clearInterval(interval);
  }, [fetchLista]);

  // ── Fetch detalle ────────────────────────────
  const fetchDetalle = useCallback(async (id: string) => {
    setLoadingDetalle(true);
    setErrorDetalle(null);
    try {
      const res = await fetch(`/api/profesor/proyectos/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProyectoDetalle = await res.json();
      setDetalle(data);
    } catch {
      setErrorDetalle("No se pudo cargar el detalle del proyecto.");
    } finally {
      setLoadingDetalle(false);
    }
  }, []);

  const handleSelectProject = (id: string) => {
    setSelectedId(id);
    setDetalle(null);
    setView("detail");
    fetchDetalle(id);
  };

  const handleVolver = () => {
    setView("list");
    setSelectedId(null);
    setDetalle(null);
  };

  const handleRefetchDetalle = () => {
    if (selectedId) fetchDetalle(selectedId);
  };

  return (
    <AuthGuard rolRequerido="profesor">
    <div className="min-h-screen bg-black text-zinc-100 font-sans relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Navigation Bar */}
        <div className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/40 rounded-2xl px-6 py-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-400 font-medium">
              Sesión activa: <strong className="text-zinc-200">{user?.displayName || user?.email}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] text-emerald-400 font-bold uppercase tracking-wider border border-emerald-950">
              Docente
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user?.uid?.startsWith("guest-") && (
              <button
                id="btn-switch-role"
                onClick={async () => {
                  await loginAsGuest("estudiante");
                  router.push("/dashboard/estudiante");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/5"
              >
                Alternar Vista Estudiante
              </button>
            )}
            <button
              id="btn-logout"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-red-950/50 border border-zinc-700/50 hover:border-red-900/50 text-zinc-400 hover:text-red-400 text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === "list" ? (
            <ListaView
              key="lista"
              proyectos={proyectos}
              loading={loadingLista}
              error={errorLista}
              onRetry={fetchLista}
              onSelectProject={handleSelectProject}
            />
          ) : (
            <DetalleView
              key="detalle"
              detalle={detalle}
              loadingDetalle={loadingDetalle}
              errorDetalle={errorDetalle}
              onVolver={handleVolver}
              onRefetch={handleRefetchDetalle}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
    </AuthGuard>
  );
}
