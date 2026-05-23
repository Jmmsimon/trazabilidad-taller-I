"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  Send,
  Code,
  CheckCircle2,
  Loader2,
  ChevronRight,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  Calendar,
  Layers,
  Activity,
  Trophy,
  RefreshCw,
  GitCommit,
  Rocket,
  FileText,
  TestTube,
} from "lucide-react";

type Phase = "A" | "B" | "C" | "D";

interface ProjectPlan {
  id: string;
  nombre: string;
  descripcion: string;
  stack: string[];
  scoreValidator: number;
  hitos: {
    nombre: string;
    descripcion: string;
    semana: number;
    tareas: string[];
    evidencias: string[];
  }[];
  backlog: {
    titulo: string;
    como: string;
    quiero: string;
    para: string;
    prioridad: "Alta" | "Media" | "Baja";
  }[];
}

interface Competencia {
  id: string;
  nombre: string;
  nivel: "basico" | "intermedio" | "avanzado";
  adquirida: boolean;
}

interface Alerta {
  tipo: string;
  mensaje: string;
  severidad: "baja" | "media" | "alta" | "critica";
}

interface EstadoRepo {
  repo_url: string | null;
  ultimo_commit_sha: string | null;
  ultimo_commit_fecha: string | null;
  ci_status: "pass" | "fail" | "unknown";
  demo_url: string | null;
  demo_activa: boolean;
}

interface ReporteCompetencias {
  alumno_id: string;
  competencias: Competencia[];
  porcentaje_adquirido: number;
}

interface TrackingData {
  score_integridad: number;
  diagnostico_riesgo: string;
  resumen_ejecutivo: string;
  alertas: Alerta[];
  reporte_competencias: ReporteCompetencias | null;
  estado_repo: EstadoRepo | null;
  evidencias: unknown[];
}

interface TrackingState {
  status: "not_started" | "processing" | "completed" | "error";
  data: TrackingData | null;
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  codigo: <GitCommit className="w-3 h-3" />,
  pipeline: <Rocket className="w-3 h-3" />,
  documento: <FileText className="w-3 h-3" />,
  test: <TestTube className="w-3 h-3" />,
  demo: <Activity className="w-3 h-3" />,
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

export default function EstudianteDashboard() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("A");
  const [idea, setIdea] = useState("");
  const [nombre, setNombre] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [tracking, setTracking] = useState<TrackingState>({
    status: "not_started",
    data: null,
  });

  // ── Poll discovery (Fase B) ──────────────────────────────
  useEffect(() => {
    if (phase !== "B" || !projectId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/proyectos/${projectId}/status`);
        const data = await res.json();
        if (data.status === "pending_approval") {
          setPlan({ ...data.propuesta, scoreValidator: data.scoreValidator ?? 0 });
          setPhase("C");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling discovery:", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, projectId]);

  // ── Poll tracking (Fase D) ───────────────────────────────
  const pollTracking = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/proyectos/${projectId}/tracking/status`);
      const data = await res.json();
      if (data.tracking_status === "completed" && data.tracking) {
        setTracking({ status: "completed", data: data.tracking });
      } else if (data.tracking_status === "error") {
        setTracking((prev) => ({ ...prev, status: "error" }));
      }
    } catch (err) {
      console.error("Error polling tracking:", err);
    }
  }, [projectId]);

  useEffect(() => {
    if (phase !== "D" || !projectId) return;
    if (tracking.status === "completed") return;

    // Lanzar tracking al entrar en Fase D
    if (tracking.status === "not_started") {
      setTracking((prev) => ({ ...prev, status: "processing" }));
      fetch(`/api/proyectos/${projectId}/tracking/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alumnoId: user?.uid ?? "anonimo", proyectoId: projectId }),
      }).catch(console.error);
    }

    const interval = setInterval(pollTracking, 3000);
    return () => clearInterval(interval);
  }, [phase, projectId, tracking.status, pollTracking]);

  // ── Helpers ─────────────────────────────────────────────
  const calcularProgreso = (): number => {
    if (!plan) return 0;
    const totalHitos = plan.hitos.length;
    if (totalHitos === 0) return 0;
    const evidenciasSubidas = tracking.data?.evidencias?.length ?? 0;
    return Math.min(Math.round((evidenciasSubidas / (totalHitos * 2)) * 100), 100);
  };

  const handleStartProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.length < 50) return;
    setPhase("B");
    try {
      const res = await fetch("/api/proyectos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, stack, nombre, alumnoId: user?.uid ?? "anonimo" }),
      });
      const data = await res.json();
      setProjectId(data.proyectoId);
    } catch (err) {
      console.error("Error starting project:", err);
    }
  };

  const addTag = () => {
    if (currentTag && !stack.includes(currentTag)) {
      setStack([...stack, currentTag]);
      setCurrentTag("");
    }
  };

  const removeTag = (tag: string) => setStack(stack.filter((t) => t !== tag));

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";

  const barWidth = (score: number) => `${Math.min(score, 100)}%`;

  return (
    <AuthGuard rolRequerido="estudiante">
    <div className="min-h-screen bg-black text-zinc-100 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">

          {/* ── FASE A ─────────────────────────────────────────── */}
          {phase === "A" && (
            <motion.div
              key="phaseA"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight mb-4">Comienza tu viaje</h1>
                <p className="text-zinc-400">Describe tu idea y deja que nuestra IA genere el plan maestro.</p>
              </div>
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
                <form onSubmit={handleStartProject} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Nombre del proyecto</label>
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Eco-Tracker App"
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Describe tu idea (mínimo 50 caracteres)
                    </label>
                    <textarea
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Cuéntanos de qué trata tu proyecto..."
                      className="w-full h-32 bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Stack tecnológico</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {stack.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs"
                        >
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)}>
                            <Trash2 className="w-3 h-3 hover:text-red-400" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                        placeholder="Ej: React, FastAPI..."
                        className="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none"
                      />
                      <button type="button" onClick={addTag} className="bg-zinc-800 p-3 rounded-xl">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={idea.length < 50}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-lg shadow-white/5 disabled:opacity-40"
                  >
                    Generar plan con IA <ChevronRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── FASE B ─────────────────────────────────────────── */}
          {phase === "B" && (
            <motion.div key="phaseB" className="max-w-md mx-auto text-center">
              <div className="mb-12 relative">
                <div className="w-24 h-24 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                <Activity className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-8">Nuestros agentes están trabajando...</h2>
              <div className="space-y-4 text-left">
                {["Drafter", "Validator", "Product Owner", "Sistema"].map((agent, i) => (
                  <div
                    key={agent}
                    className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-500">AG-00{i + 1} {agent}</div>
                      <div className="text-sm text-zinc-200">Procesando información...</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── FASE C ─────────────────────────────────────────── */}
          {phase === "C" && plan && (
            <motion.div key="phaseC" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex justify-between items-center bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800/50">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{plan.nombre}</h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      plan.scoreValidator >= 80
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    Score: {plan.scoreValidator}/100
                  </span>
                </div>
                <button
                  onClick={() => setPhase("D")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  Confirmar plan <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <section className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
                      <Code className="w-5 h-5" /> Propuesta Técnica
                    </h3>
                    <p className="text-zinc-300 text-sm leading-relaxed">{plan.descripcion}</p>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                      <Calendar className="w-5 h-5" /> Roadmap
                    </h3>
                    {plan.hitos.map((hito, i) => (
                      <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4">
                        <div className="flex justify-between font-bold text-sm mb-2">
                          <span>Semana {hito.semana}: {hito.nombre}</span>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-zinc-500 mb-2">{hito.descripcion}</p>
                        <ul className="text-xs space-y-1">
                          {hito.tareas.map((t, j) => (
                            <li key={j} className="flex gap-2">
                              <CheckCircle2 className="w-3 h-3 text-indigo-500" /> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                    <Layers className="w-5 h-5" /> Historias de Usuario
                  </h3>
                  {plan.backlog.map((story, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                        {story.prioridad}
                      </span>
                      <p className="text-sm font-semibold">{story.titulo}</p>
                      <p className="text-[11px] text-zinc-500">
                        "Como {story.como}, quiero {story.quiero}..."
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── FASE D ─────────────────────────────────────────── */}
          {phase === "D" && plan && (
            <motion.div
              key="phaseD"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-8"
            >
              {/* Panel principal */}
              <div className="lg:col-span-3 space-y-8">
                {/* Header */}
                <div className="bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800/50 flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{plan.nombre}</h1>
                    <div className="flex items-center gap-2 text-emerald-500">
                      <Activity className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-bold uppercase">Activo</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-400">{calcularProgreso()}%</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Progreso</div>
                  </div>
                </div>

                {/* Hitos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plan.hitos.map((hito, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl space-y-4">
                      <h4 className="font-bold text-sm">Semana {hito.semana}: {hito.nombre}</h4>
                      <ul className="space-y-2 text-xs text-zinc-400">
                        {hito.tareas.slice(0, 3).map((t, j) => (
                          <li key={j} className="flex gap-2 items-center">
                            <div className="w-3 h-3 rounded border border-zinc-800 flex-shrink-0" /> {t}
                          </li>
                        ))}
                      </ul>
                      <button className="w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg text-xs font-bold flex justify-center gap-2 transition-colors">
                        <Plus className="w-3 h-3" /> Subir Evidencia
                      </button>
                    </div>
                  ))}
                </div>

                {/* Resumen ejecutivo (cuando tracking está listo) */}
                {tracking.status === "completed" && tracking.data?.resumen_ejecutivo && (
                  <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl space-y-2">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      Resumen ejecutivo — AG-004
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {tracking.data.resumen_ejecutivo}
                    </p>
                    {tracking.data.estado_repo && (
                      <div className="flex gap-4 pt-2 text-xs text-zinc-500 flex-wrap">
                        {tracking.data.estado_repo.repo_url && (
                          <a
                            href={tracking.data.estado_repo.repo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-indigo-400 hover:underline"
                          >
                            <GitCommit className="w-3 h-3" /> Repositorio
                          </a>
                        )}
                        {tracking.data.estado_repo.demo_url && (
                          <a
                            href={tracking.data.estado_repo.demo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            <Rocket className="w-3 h-3" /> Demo
                          </a>
                        )}
                        <span
                          className={
                            tracking.data.estado_repo.ci_status === "pass"
                              ? "text-emerald-400"
                              : tracking.data.estado_repo.ci_status === "fail"
                              ? "text-red-400"
                              : "text-zinc-500"
                          }
                        >
                          CI: {tracking.data.estado_repo.ci_status}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Métricas de integridad */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Métricas</h3>
                    {tracking.status === "processing" && (
                      <RefreshCw className="w-3 h-3 text-zinc-600 animate-spin" />
                    )}
                  </div>

                  {tracking.status === "not_started" || tracking.status === "processing" ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span>Integridad</span>
                        <span className="text-zinc-600">Analizando...</span>
                      </div>
                      <div className="h-1 bg-zinc-950 rounded-full">
                        <div className="h-full bg-zinc-800 w-full animate-pulse rounded-full" />
                      </div>
                    </div>
                  ) : tracking.status === "error" ? (
                    <p className="text-xs text-red-400">Error al cargar métricas.</p>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs">
                        <span>Integridad</span>
                        <span className={scoreColor(tracking.data?.score_integridad ?? 0)}>
                          {tracking.data?.score_integridad ?? 0}/100
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-950 rounded-full">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                          style={{ width: barWidth(tracking.data?.score_integridad ?? 0) }}
                        />
                      </div>
                      {tracking.data?.diagnostico_riesgo && (
                        <p className="text-[11px] text-zinc-500 pt-1">
                          {tracking.data.diagnostico_riesgo}
                        </p>
                      )}
                    </>
                  )}

                  {/* Competencias */}
                  <div className="pt-4 border-t border-zinc-800">
                    <div className="text-xs text-zinc-500 mb-2">Competencias</div>
                    {tracking.status === "completed" &&
                    tracking.data?.reporte_competencias?.competencias?.length ? (
                      <div className="space-y-1">
                        {tracking.data.reporte_competencias.competencias
                          .filter((c) => c.adquirida)
                          .slice(0, 5)
                          .map((c) => (
                            <div key={c.id} className="flex gap-2 text-xs items-center">
                              <Trophy className={`w-3 h-3 ${NIVEL_COLORS[c.nivel]} flex-shrink-0`} />
                              <span className="text-zinc-300 truncate">{c.nombre}</span>
                              <span className={`text-[10px] ml-auto ${NIVEL_COLORS[c.nivel]}`}>
                                {c.nivel}
                              </span>
                            </div>
                          ))}
                        {tracking.data.reporte_competencias.competencias.filter((c) => !c.adquirida)
                          .length > 0 && (
                          <p className="text-[10px] text-zinc-600 pt-1">
                            +{tracking.data.reporte_competencias.competencias.filter((c) => !c.adquirida).length} en progreso
                          </p>
                        )}
                      </div>
                    ) : tracking.status === "processing" ? (
                      <div className="space-y-1">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-600">Sin competencias aún.</p>
                    )}
                  </div>
                </div>

                {/* Alertas DevOps */}
                <div className="space-y-3">
                  {tracking.status === "processing" && (
                    <div className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl">
                      <div className="flex gap-2 text-zinc-500 mb-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-bold uppercase">Analizando DevOps...</span>
                      </div>
                    </div>
                  )}

                  {tracking.status === "completed" &&
                    (tracking.data?.alertas?.length ? (
                      tracking.data.alertas.map((alerta, i) => (
                        <div
                          key={i}
                          className={`border p-4 rounded-2xl ${SEVERIDAD_COLORS[alerta.severidad]}`}
                        >
                          <div className="flex gap-2 mb-1 items-center">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">{alerta.tipo}</span>
                            <span className="ml-auto text-[10px] font-bold uppercase opacity-60">
                              {alerta.severidad}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-70">{alerta.mensaje}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                        <div className="flex gap-2 text-emerald-400 mb-1 items-center">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase">DevOps OK</span>
                        </div>
                        <p className="text-[11px] text-zinc-500">Sin alertas detectadas.</p>
                      </div>
                    ))}

                  {tracking.status === "error" && (
                    <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl">
                      <div className="flex gap-2 text-red-400 mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Error tracking</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        No se pudo conectar con los agentes.
                      </p>
                      <button
                        onClick={() => {
                          setTracking({ status: "not_started", data: null });
                        }}
                        className="mt-2 text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Reintentar
                      </button>
                    </div>
                  )}

                  {/* Evidencias subidas */}
                  {tracking.status === "completed" &&
                    (tracking.data?.evidencias?.length ?? 0) > 0 && (
                      <div className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">
                          Evidencias recientes
                        </h4>
                        <div className="space-y-1">
                          {(tracking.data?.evidencias as Array<{tipo: string; url?: string}> ?? [])
                            .slice(0, 4)
                            .map((ev, i) => (
                              <div key={i} className="flex gap-2 items-center text-xs text-zinc-400">
                                <span className="text-indigo-400">
                                  {TIPO_ICONS[ev.tipo] ?? <FileText className="w-3 h-3" />}
                                </span>
                                <a
                                  href={ev.url ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="truncate hover:text-indigo-400 transition-colors"
                                >
                                  {ev.url ?? ev.tipo}
                                </a>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </AuthGuard>
  );
}
