"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
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
} from "lucide-react";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface ProyectoResumen {
  proyectoId: string;
  nombre: string;
  alumnoId: string;
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
}

interface ProyectoDetalle {
  proyectoId: string;
  nombre: string;
  alumnoId: string;
  status: string;
  scoreValidator: number;
  comentario_profesor?: string;
  propuesta: {
    nombre: string;
    descripcion: string;
    hitos: Hito[];
    backlog: Array<{
      titulo: string;
      prioridad: string;
    }>;
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
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                      {proyecto.alumnoId}
                    </p>
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
                <p className="text-sm text-zinc-500 mt-1">{detalle.alumnoId}</p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusCfg.cls}`}
              >
                {statusCfg.label}
              </span>
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
                    {hito.validado_por_profesor ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Validado
                      </span>
                    ) : (
                      <button
                        id={`btn-validar-hito-${idx}`}
                        onClick={() => setHitoField(idx, "open", !hitoState.open)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-indigo-600 text-zinc-400 hover:text-white transition-all"
                      >
                        Validar hito
                      </button>
                    )}
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {hito.descripcion}
                  </p>
                  <ul className="space-y-1">
                    {hito.tareas.slice(0, 3).map((tarea, j) => (
                      <li
                        key={j}
                        className="flex gap-2 items-start text-xs text-zinc-400"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                        {tarea}
                      </li>
                    ))}
                  </ul>
                  {hito.validado_por_profesor && hito.feedback_profesor && (
                    <div className="flex gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-xs text-emerald-300/80">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                      {hito.feedback_profesor}
                    </div>
                  )}
                  {/* Expandible validar */}
                  <AnimatePresence>
                    {hitoState.open && !hito.validado_por_profesor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <textarea
                          id={`textarea-feedback-hito-${idx}`}
                          value={hitoState.feedback}
                          onChange={(e) =>
                            setHitoField(idx, "feedback", e.target.value)
                          }
                          placeholder="Escribe tu feedback para este hito..."
                          className="w-full h-20 bg-zinc-950/50 border border-zinc-800 rounded-xl py-2 px-3 text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                        />
                        <button
                          id={`btn-confirmar-hito-${idx}`}
                          onClick={() => handleValidarHito(idx)}
                          disabled={hitoState.loading}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {hitoState.loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Confirmar validación
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </section>

          {/* Backlog */}
          {backlog.length > 0 && (
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
              <div className="space-y-2">
                {alertas.map((alerta, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-3 ${
                      SEVERIDAD_COLORS[alerta.severidad] ??
                      SEVERIDAD_COLORS.baja
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase">
                        {alerta.tipo}
                      </span>
                      <span className="text-[9px] font-bold uppercase opacity-60">
                        {alerta.severidad}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-70 leading-relaxed">
                      {alerta.mensaje}
                    </p>
                  </div>
                ))}
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
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Adquiridas</span>
                    <span className="text-zinc-300 font-bold">
                      {tracking.reporte_competencias.porcentaje_adquirido.toFixed(
                        0
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          tracking.reporte_competencias.porcentaje_adquirido,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {competenciasAdquiridas.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Trophy
                        className={`w-3 h-3 flex-shrink-0 ${
                          NIVEL_COLORS[c.nivel] ?? "text-zinc-400"
                        }`}
                      />
                      <span className="text-zinc-300 flex-1 truncate">
                        {c.nombre}
                      </span>
                      <span
                        className={`text-[10px] ${
                          NIVEL_COLORS[c.nivel] ?? "text-zinc-400"
                        }`}
                      >
                        {c.nivel}
                      </span>
                    </div>
                  ))}
                </div>
                {competenciasEnProgreso.length > 0 && (
                  <p className="text-[10px] text-zinc-600">
                    +{competenciasEnProgreso.length} en progreso
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-600 text-center py-2">
                Sin datos de competencias.
              </p>
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function ProfesorDashboard() {
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
