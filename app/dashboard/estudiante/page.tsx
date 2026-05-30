"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
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
  LogOut,
  Bell,
  MessageSquare,
} from "lucide-react";


type Phase = "A" | "B" | "C" | "D";

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

interface ProjectPlan {
  id: string;
  nombre: string;
  descripcion: string;
  stack: string[];
  scoreValidator: number;
  status?: string;
  motivo_rechazo?: string;
  hitos: {
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
  const { user, logout, loginAsGuest } = useAuth();
  const router = useRouter();
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

  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  // texto editado por alumno por tarea: clave "hitoIdx-tareaIdx"
  const [editingTasks, setEditingTasks] = useState<Record<string, string>>({});


  // Estados para la carga asíncrona con progreso real en Fase B
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationDetail, setGenerationDetail] = useState("Iniciando agentes de co-creación...");
  const [activeAgent, setActiveAgent] = useState<string | null>("drafter");
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ── Fetch active project on mount ──────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const fetchActiveProject = async () => {
      try {
        const res = await fetch(`/api/proyectos/alumno/${user.uid}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.proyectoId) {
          setProjectId(data.proyectoId);
          // Set status/phase depending on the project status
          if (data.status === "processing") {
            setPhase("B");
          } else if (data.status === "pending_approval" || data.status === "rejected") {
            setPlan({
              ...data.propuesta,
              id: data.proyectoId,
              scoreValidator: data.scoreValidator ?? 0,
              backlog_scrum: data.backlog_scrum,
              status: data.status,
              motivo_rechazo: data.motivo_rechazo
            });
            setPhase("C");
          } else if (data.status === "active") {
            setPlan({
              ...data.propuesta,
              id: data.proyectoId,
              scoreValidator: data.scoreValidator ?? 0,
              backlog_scrum: data.backlog_scrum,
              status: data.status,
              repo_url: data.repo_url ?? "",
              demo_url: data.demo_url ?? ""
            });
            setRepoUrl(data.repo_url ?? "");
            setDemoUrl(data.demo_url ?? "");
            setPhase("D");
            if (data.tracking) {
              setTracking({
                status: data.tracking_status || "completed",
                data: data.tracking
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching active project:", err);
      }
    };
    fetchActiveProject();
  }, [user?.uid]);

  // ── Poll discovery (Fase B) ──────────────────────────────
  useEffect(() => {
    if (phase !== "B" || !projectId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGenerationProgress(5);
    setGenerationDetail("Iniciando agentes de co-creación...");
    setActiveAgent("drafter");
    setGenerationError(null);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/proyectos/${projectId}/status`);
        const data = await res.json();
        
        if (data.status === "error") {
          setGenerationError(data.error || "Ocurrió un error inesperado al generar el plan maestro.");
          clearInterval(interval);
          return;
        }

        if (data.progress !== undefined) setGenerationProgress(data.progress);
        if (data.status_detail !== undefined) setGenerationDetail(data.status_detail);
        if (data.active_agent !== undefined) setActiveAgent(data.active_agent);

        if (data.status === "pending_approval") {
          setPlan({ ...data.propuesta, scoreValidator: data.scoreValidator ?? 0, backlog_scrum: data.backlog_scrum });
          setPhase("C");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling discovery:", err);
      }
    }, 2000);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleSaveConfig = async () => {
    if (!projectId) return;
    setIsSavingConfig(true);
    try {
      const resConfig = await fetch(`/api/proyectos/${projectId}/configuracion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, demo_url: demoUrl }),
      });
      if (!resConfig.ok) {
        throw new Error("No se pudo guardar la configuración");
      }

      setPlan((prev) => prev ? { ...prev, repo_url: repoUrl, demo_url: demoUrl } : null);

      setTracking({ status: "processing", data: null });
      const resTracking = await fetch(`/api/proyectos/${projectId}/tracking/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alumnoId: user?.uid ?? "anonimo", proyectoId: projectId }),
      });
      if (!resTracking.ok) {
        throw new Error("No se pudo iniciar el seguimiento");
      }
    } catch (err) {
      console.error("Error saving config and starting tracking:", err);
      alert("Error al guardar y analizar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleEnviarCorreccionHito = async (idx: number) => {
    if (!projectId || !plan) return;
    try {
      // recoger textos editados de las tareas de este hito
      const tareas = plan.hitos[idx].tareas.map((originalText, j) => {
        const key = `${idx}-${j}`;
        return editingTasks[key] !== undefined ? editingTasks[key] : originalText;
      });

      const res = await fetch(`/api/proyectos/${projectId}/hitos/${idx}/enviar-correccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tareas_corregidas: tareas }),
      });
      if (res.ok) {
        // Limpiar ediciones locales de ese hito
        setEditingTasks(prev => {
          const n = { ...prev };
          plan.hitos[idx].tareas.forEach((_, j) => delete n[`${idx}-${j}`]);
          return n;
        });
        const resProj = await fetch(`/api/proyectos/alumno/${user?.uid}`);
        const data = await resProj.json();
        setPlan({
          ...data.propuesta,
          id: data.proyectoId,
          scoreValidator: data.scoreValidator ?? 0,
          backlog_scrum: data.backlog_scrum,
          status: data.status,
          repo_url: data.repo_url ?? "",
          demo_url: data.demo_url ?? ""
        });
      }
    } catch (err) {
      console.error(err);
    }
  };



  const handleCorregirBacklogItem = async (itemId: string) => {
    if (!projectId) return;
    try {
      const tituloKey = `bl-titulo-${itemId}`;
      const huKey = `bl-hu-${itemId}`;
      
      const newTitulo = editingTasks[tituloKey];
      const newHu = editingTasks[huKey];

      const res = await fetch(`/api/proyectos/${projectId}/backlog/${itemId}/corregir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: newTitulo,
          historia_completa: newHu,
        }),
      });
      if (res.ok) {
        setEditingTasks(prev => {
          const n = { ...prev };
          delete n[tituloKey];
          delete n[huKey];
          return n;
        });
        const resProj = await fetch(`/api/proyectos/alumno/${user?.uid}`);
        const data = await resProj.json();
        setPlan({
          ...data.propuesta,
          id: data.proyectoId,
          scoreValidator: data.scoreValidator ?? 0,
          backlog_scrum: data.backlog_scrum,
          status: data.status,
          repo_url: data.repo_url ?? "",
          demo_url: data.demo_url ?? ""
        });
      }
    } catch (err) {
      console.error(err);
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
        {/* Navigation Bar */}
        <div className="backdrop-blur-xl bg-zinc-900/30 border border-zinc-800/40 rounded-2xl px-6 py-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs text-zinc-400 font-medium">
              Sesión activa: <strong className="text-zinc-200">{user?.displayName || user?.email}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] text-indigo-400 font-bold uppercase tracking-wider border border-indigo-950">
              Estudiante
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user?.uid?.startsWith("guest-") && (
              <button
                id="btn-switch-role"
                onClick={async () => {
                  await loginAsGuest("profesor");
                  router.push("/dashboard/profesor");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/5"
              >
                Alternar Vista Docente
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
            <motion.div
              key="phaseB"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto"
            >
              {generationError ? (
                <div className="backdrop-blur-xl bg-red-950/20 border border-red-500/20 rounded-3xl p-8 text-center shadow-2xl space-y-6">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl mx-auto flex items-center justify-center text-red-400">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Error de Generación</h2>
                    <p className="text-zinc-400 text-xs leading-relaxed max-h-48 overflow-y-auto font-mono bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/40 text-left">
                      {generationError}
                    </p>
                  </div>
                  <button
                    onClick={() => setPhase("A")}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3 rounded-xl transition-all border border-zinc-700/50"
                  >
                    Volver al Formulario
                  </button>
                </div>
              ) : (
                <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 shadow-2xl text-center space-y-8">
                  {/* Progress Ring / Percentage */}
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="52"
                        className="stroke-zinc-800/50 fill-none"
                        strokeWidth="6"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="52"
                        className="stroke-indigo-500 fill-none"
                        strokeWidth="6"
                        strokeDasharray={326.7}
                        initial={{ strokeDashoffset: 326.7 }}
                        animate={{ strokeDashoffset: 326.7 - (326.7 * generationProgress) / 100 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-3xl font-extrabold text-white font-mono">
                      {generationProgress}%
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Co-creando plan maestro...</h2>
                    <p className="text-xs text-indigo-400 h-8 flex items-center justify-center font-medium animate-pulse">
                      {generationDetail}
                    </p>
                  </div>

                  {/* Agentes list */}
                  <div className="space-y-3 text-left">
                    {[
                      { id: "drafter", name: "Drafter (AG-001)", desc: "Diseñando arquitectura y roadmap" },
                      { id: "validator", name: "Validator (AG-002)", desc: "Evaluando viabilidad y sílabo" },
                      { id: "po", name: "Product Owner (AG-003)", desc: "Generando Backlog Scrum" }
                    ].map((agent, i) => {
                      const isCompleted = 
                        (agent.id === "drafter" && (activeAgent === "validator" || activeAgent === "po")) ||
                        (agent.id === "validator" && activeAgent === "po") ||
                        (generationProgress >= 90);
                      const isActive = activeAgent === agent.id && !isCompleted;
                      
                      return (
                        <div
                          key={agent.id}
                          className={`border rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 ${
                            isCompleted ? "bg-emerald-500/5 border-emerald-500/10 text-zinc-300" :
                            isActive ? "bg-indigo-500/5 border-indigo-500/20 text-zinc-100 ring-1 ring-indigo-500/10" :
                            "bg-zinc-950/20 border-zinc-800/40 text-zinc-500"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? "bg-emerald-500/10 text-emerald-400" :
                            isActive ? "bg-indigo-500/10 text-indigo-400" :
                            "bg-zinc-900 text-zinc-600"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : isActive ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-current" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold">{agent.name}</div>
                            <div className="text-[11px] opacity-75 truncate">{agent.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── FASE C ─────────────────────────────────────────── */}
          {phase === "C" && plan && (
            <motion.div key="phaseC" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              {/* Alerta de rechazo si aplica */}
              {plan.status === "rejected" && (
                <div className="flex gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Propuesta Rechazada por el Docente</p>
                    {plan.motivo_rechazo && (
                      <p className="text-red-300/70 text-xs mt-1">
                        Motivo: {plan.motivo_rechazo}
                      </p>
                    )}
                    <p className="text-zinc-400 text-xs mt-2">
                      Puedes modificar los detalles de tu idea de proyecto y volver a generar el plan usando el botón a la derecha.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800/50 flex-wrap gap-4">
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
                {plan.status === "rejected" ? (
                  <button
                    onClick={() => {
                      setPhase("A");
                      setIdea(plan.descripcion || "");
                      setNombre(plan.nombre || "");
                      setStack(plan.stack || []);
                      setProjectId(null);
                      setPlan(null);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    Editar y Regenerar
                  </button>
                ) : (
                  <button
                    onClick={() => setPhase("D")}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    Confirmar plan <Send className="w-4 h-4" />
                  </button>
                )}
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
              </div>

              {/* TABLA DEL BACKLOG ÁGIL (FULL WIDTH) */}
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-3xl p-8 overflow-x-auto">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400">
                  <Layers className="w-6 h-6" /> Backlog Ágil (Product Owner)
                </h3>
                
                {plan.backlog_scrum?.epicas?.length ? (
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
                        <th className="px-4 py-3 rounded-tr-xl">Épica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.backlog_scrum.epicas.flatMap((epica: BacklogEpica) => [
                        // Fila de la Épica misma
                        <tr key={epica.id} className="border-b border-zinc-800/50 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-300">{epica.id}</td>
                          <td className="px-4 py-3 font-bold text-indigo-400">EP</td>
                          <td className="px-4 py-3 font-bold text-zinc-200">{epica.titulo}</td>
                          <td className="px-4 py-3 text-zinc-400 text-xs">{epica.descripcion}</td>
                          <td className="px-4 py-3 text-zinc-500 italic text-xs">--</td>
                          <td className="px-4 py-3 text-center text-zinc-500">--</td>
                          <td className="px-4 py-3 font-bold text-orange-400">Crítica</td>
                          <td className="px-4 py-3 text-zinc-500">--</td>
                          <td className="px-4 py-3 text-zinc-500">--</td>
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
                                {item.prioridad}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                              {item.depende_de || "--"}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-indigo-400/70">
                              {epica.id}
                            </td>
                          </tr>
                        )) || [])
                      ])}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-zinc-500 text-sm">El formato antiguo no soporta tabla estructurada. Por favor genera un proyecto nuevo.</p>
                )}
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

                {/* Configuración de Entregables (Repositorio y Despliegue) */}
                <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Code className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">
                      Configuración de Entregables
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Vincula tu repositorio de código y el enlace de producción. Los agentes de la IA de trazabilidad inspeccionarán estas direcciones para medir tu progreso, integridad y competencias académicas.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-450">Repositorio GitHub</label>
                      <input
                        type="url"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/usuario/mi-repositorio"
                        className="w-full bg-zinc-950/40 border border-zinc-800/60 rounded-xl py-2.5 px-3.5 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-650"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-450">Despliegue Vercel / Demo Link</label>
                      <input
                        type="url"
                        value={demoUrl}
                        onChange={(e) => setDemoUrl(e.target.value)}
                        placeholder="https://mi-proyecto.vercel.app"
                        className="w-full bg-zinc-950/40 border border-zinc-800/60 rounded-xl py-2.5 px-3.5 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-650"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950/40 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/10 flex items-center gap-2"
                    >
                      {isSavingConfig ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Guardar y Analizar Repositorio
                    </button>
                  </div>
                </div>

                {/* ── BANNER DE NOTIFICACIONES ── */}
                {(() => {
                  const hitosObservados = plan.hitos.filter(h => h.estado_hito === "observado" || h.estado_hito === "corregido");
                  const backlogObservados = (plan.backlog_scrum?.epicas ?? []).flatMap(e => (e.items ?? []).filter(it => it.estado_revision === "observado"));
                  const total = hitosObservados.length + backlogObservados.length;
                  if (total === 0) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-red-500/25 bg-red-500/8 p-4 flex gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-bold text-red-400">
                            {total} observación{total > 1 ? "es" : ""} pendiente{total > 1 ? "s" : ""} del docente
                          </p>
                          <span className="text-[10px] font-black bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                            {total}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {hitosObservados.map((h, hIdx) => {
                            const realIdx = plan.hitos.indexOf(h);
                            return (
                              <div key={hIdx} className="flex items-start gap-2 text-xs">
                                <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-zinc-300">
                                  <span className="font-bold text-red-400">Hito: </span>
                                  {h.nombre}
                                  {h.estado_hito === "corregido" && (
                                    <span className="ml-2 text-indigo-400 font-bold text-[10px]">(Corrección enviada, esperando re-evaluación)</span>
                                  )}
                                </span>
                                {h.estado_hito !== "corregido" && (
                                  <button
                                    onClick={() => handleEnviarCorreccionHito(realIdx)}
                                    className="ml-auto text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline whitespace-nowrap"
                                  >
                                    ✓ Marcar como Corregido
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {backlogObservados.map((item) => (
                            <div key={item.id} className="flex items-start gap-2 text-xs">
                              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                              <span className="text-zinc-300">
                                <span className="font-bold text-red-400">HU: </span>
                                {item.titulo}
                              </span>
                              <button
                                onClick={() => handleCorregirBacklogItem(item.id)}
                                className="ml-auto text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline whitespace-nowrap"
                              >
                                ✓ Marcar como Corregido
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Hitos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plan.hitos.map((hito, i) => {
                    const isObservado = hito.estado_hito === "observado";
                    const isCorregido = hito.estado_hito === "corregido";
                    const isValidado = hito.estado_hito === "validado";
                    return (
                      <div
                        key={i}
                        className={`rounded-2xl p-5 space-y-3 border transition-all ${
                          isObservado
                            ? "bg-red-500/5 border-red-500/20"
                            : isCorregido
                            ? "bg-indigo-500/5 border-indigo-500/20"
                            : isValidado
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-zinc-900/40 border-zinc-800/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-600 uppercase">Semana {hito.semana}</span>
                            <h4 className="font-bold text-sm text-zinc-100">{hito.nombre}</h4>
                          </div>
                          {isValidado ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Validado
                            </span>
                          ) : isObservado ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3 h-3" /> Observado
                            </span>
                          ) : isCorregido ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center gap-1 animate-pulse">
                              <Activity className="w-3 h-3" /> Re-evaluación
                            </span>
                          ) : null}
                        </div>

                        {/* Tareas con estados */}
                        <ul className="space-y-2 text-xs">
                          {hito.tareas.slice(0, 4).map((t, j) => {
                            const tState = (hito.tareas_estado || [])[j] || "ok";
                            const tComment = (hito.tareas_comentarios || [])[j] || "";
                            const taskKey = `${i}-${j}`;
                            const editedText = editingTasks[taskKey] ?? t;
                            return (
                              <li key={j} className="space-y-1.5">
                                <div className="flex gap-2 items-start">
                                  {tState === "ok" ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-2" />
                                  ) : tState === "corregido" ? (
                                    <Activity className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-2" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-2 animate-pulse" />
                                  )}
                                  {tState === "observado" ? (
                                    <input
                                      type="text"
                                      value={editedText}
                                      onChange={e =>
                                        setEditingTasks(prev => ({ ...prev, [taskKey]: e.target.value }))
                                      }
                                      className="flex-1 bg-zinc-950/80 border border-red-500/30 focus:border-indigo-500/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-medium focus:outline-none transition-colors"
                                    />
                                  ) : (
                                    <span className={tState === "corregido" ? "text-zinc-300" : "text-zinc-400"}>
                                      {editedText}
                                    </span>
                                  )}
                                </div>
                                {tState === "observado" && tComment && (
                                  <div className="ml-5 flex gap-2 bg-red-500/8 border border-red-500/15 rounded-lg p-2">
                                    <MessageSquare className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-red-400 italic">{tComment}</p>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {/* Botón de corrección si el hito está observado */}
                        {isObservado && (
                          <button
                            onClick={() => handleEnviarCorreccionHito(i)}
                            className="w-full mt-1 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como Corregido
                          </button>
                        )}

                        {/* Feedback: ya corregido */}
                        {isCorregido && (
                          <div className="flex gap-2 rounded-xl bg-indigo-500/5 border border-indigo-500/15 p-2.5 text-xs text-indigo-300/80">
                            <Activity className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-400" />
                            Corrección enviada — esperando re-evaluación del docente
                          </div>
                        )}

                        {/* Si está OK o validado */}
                        {!isObservado && !isCorregido && !isValidado && (
                          <button className="w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg text-xs font-bold flex justify-center gap-2 transition-colors">
                            <Plus className="w-3 h-3" /> Subir Evidencia
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── BACKLOG ÁGIL COMPLETO CON REVISIÓN ── */}
                {plan.backlog_scrum?.epicas && plan.backlog_scrum.epicas.length > 0 && (
                  <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 overflow-x-auto space-y-4">
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-base font-bold text-indigo-400">Backlog Ágil — Tu Plan de Desarrollo</h3>
                      {(() => {
                        const n = plan.backlog_scrum!.epicas!.flatMap(e => e.items ?? []).filter(it => it.estado_revision === "observado").length;
                        return n > 0 ? (
                          <span className="text-[10px] font-black bg-red-500/15 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {n} a corregir
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <table className="w-full text-left text-sm text-zinc-300">
                      <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
                        <tr>
                          <th className="px-3 py-2.5 rounded-tl-xl">ID</th>
                          <th className="px-3 py-2.5">Tipo</th>
                          <th className="px-3 py-2.5 min-w-[160px]">Título</th>
                          <th className="px-3 py-2.5 min-w-[220px]">Descripción / HU</th>
                          <th className="px-3 py-2.5 min-w-[180px]">Criterios</th>
                          <th className="px-3 py-2.5 text-center">SP</th>
                          <th className="px-3 py-2.5">Prioridad</th>
                          <th className="px-3 py-2.5 rounded-tr-xl text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.backlog_scrum.epicas.flatMap((epica: BacklogEpica) => [
                          // Fila épica
                          <tr key={epica.id} className="border-b border-zinc-800/50 bg-indigo-500/5">
                            <td className="px-3 py-2.5 font-mono text-xs font-bold text-indigo-300">{epica.id}</td>
                            <td className="px-3 py-2.5 font-bold text-indigo-400 text-xs">EP</td>
                            <td className="px-3 py-2.5 font-bold text-zinc-200" colSpan={2}>{epica.titulo}</td>
                            <td className="px-3 py-2.5 text-zinc-500 text-xs italic">{epica.descripcion}</td>
                            <td className="px-3 py-2.5 text-center text-zinc-500">--</td>
                            <td className="px-3 py-2.5 font-bold text-orange-400 text-xs">Crítica</td>
                            <td className="px-3 py-2.5 text-center text-zinc-500">--</td>
                          </tr>,
                          // Filas de ítems
                          ...(epica.items?.map((item: BacklogItem) => {
                            const isObs = item.estado_revision === "observado";
                            const isCor = item.estado_revision === "corregido";
                            const isApr = item.estado_revision === "aprobado";
                            const tituloKey = `bl-titulo-${item.id}`;
                            const huKey = `bl-hu-${item.id}`;
                            const editedTitulo = editingTasks[tituloKey] ?? item.titulo;
                            const editedHu = editingTasks[huKey] ?? `Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`;
                            return (
                              <tr
                                key={item.id}
                                className={`border-b border-zinc-800/50 transition-colors ${
                                  isObs ? "bg-red-500/5 hover:bg-red-500/8" :
                                  isCor ? "bg-indigo-500/5 hover:bg-indigo-500/8" :
                                  isApr ? "bg-emerald-500/3 hover:bg-emerald-500/5" :
                                  "hover:bg-zinc-800/20"
                                }`}
                              >
                                <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{item.id}</td>
                                <td className="px-3 py-2.5">
                                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-bold text-zinc-300">
                                    {item.tipo || "HU"}
                                  </span>
                                </td>

                                {/* Título — editable si observado */}
                                <td className="px-3 py-2.5 font-medium">
                                  {isObs ? (
                                    <input
                                      type="text"
                                      value={editedTitulo}
                                      onChange={e => setEditingTasks(prev => ({ ...prev, [tituloKey]: e.target.value }))}
                                      className="w-full bg-zinc-950/80 border border-red-500/30 focus:border-indigo-500/60 rounded-lg px-2 py-1 text-xs text-zinc-100 font-medium focus:outline-none transition-colors"
                                    />
                                  ) : (
                                    <span className="text-zinc-300">{item.titulo}</span>
                                  )}
                                </td>

                                {/* HU — editable si observado */}
                                <td className="px-3 py-2.5 text-xs">
                                  {isObs ? (
                                    <textarea
                                      value={editedHu}
                                      onChange={e => setEditingTasks(prev => ({ ...prev, [huKey]: e.target.value }))}
                                      rows={2}
                                      className="w-full bg-zinc-950/80 border border-red-500/30 focus:border-indigo-500/60 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none resize-none transition-colors"
                                    />
                                  ) : (
                                    <span className="text-zinc-400 leading-snug">
                                      {`Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`}
                                    </span>
                                  )}
                                </td>

                                <td className="px-3 py-2.5 text-xs text-zinc-500">
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {item.criterios?.slice(0, 2).map((c: { descripcion: string }, cidx: number) => (
                                      <li key={cidx} className="line-clamp-1">{c.descripcion}</li>
                                    ))}
                                  </ul>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono text-xs">{item.puntos || 0} SP</td>
                                <td className="px-3 py-2.5 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    item.prioridad === "Critica" ? "bg-red-500/20 text-red-400" :
                                    item.prioridad === "Alta" ? "bg-orange-500/20 text-orange-400" :
                                    item.prioridad === "Media" ? "bg-blue-500/20 text-blue-400" :
                                    "bg-zinc-500/20 text-zinc-400"
                                  }`}>
                                    {item.prioridad || "Media"}
                                  </span>
                                </td>

                                {/* Estado + Acción */}
                                <td className="px-3 py-2.5 text-center">
                                  {isApr ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 justify-center">
                                      <CheckCircle2 className="w-3 h-3" /> Aprobado
                                    </span>
                                  ) : isCor ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center gap-1 justify-center animate-pulse">
                                      <Activity className="w-3 h-3" /> Re-eval.
                                    </span>
                                  ) : isObs ? (
                                    <div className="space-y-1.5 min-w-[120px]">
                                      {item.comentario_revision && (
                                        <div className="flex gap-1 bg-red-500/10 border border-red-500/20 rounded-lg p-1.5 text-left">
                                          <MessageSquare className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                                          <p className="text-[10px] text-red-400 italic leading-tight">{item.comentario_revision}</p>
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleCorregirBacklogItem(item.id)}
                                        className="w-full py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                                      >
                                        <CheckCircle2 className="w-3 h-3" /> Marcar Corregido
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
                                      Pendiente
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          }) || [])
                        ])}
                      </tbody>
                    </table>
                  </div>
                )}


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
