"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  Calendar,
  Layers,
  Activity,
  Trophy,
  RefreshCw,
  GitCommit,
  Rocket,
  FileText,
  LogOut,
  MessageSquare,
  BarChart3,
  Shield,
  Copy,
  ArrowUp,
  ArrowRight,
} from "lucide-react";

import { useEstudianteProyecto } from "./hooks/useEstudianteProyecto";
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { HitosGroup } from "./components/HitosGroup";
import { BacklogTable } from "./components/BacklogTable";
import { KanbanBoard } from "./components/KanbanBoard";
import { RadarChart } from "./components/RadarChart";
import { BacklogCards } from "./components/BacklogCards";
import { CommitsHitosPanel } from "./components/CommitsHitosPanel";
import { TIPO_ICONS, SEVERIDAD_COLORS, NIVEL_COLORS, scoreColor, barWidth, getSprintNum } from "./utils";

export default function EstudianteDashboard() {
  const { user, logout, loginAsGuest } = useAuth();
  const router = useRouter();

  const {
    phase,
    setPhase,
    idea,
    setIdea,
    nombre,
    setNombre,
    stack,
    setStack,
    currentTag,
    setCurrentTag,
    projectId,
    plan,
    tracking,
    setTracking,
    repoUrl,
    setRepoUrl,
    demoUrl,
    setDemoUrl,
    isSavingConfig,
    editingTasks,
    setEditingTasks,
    isEditingDraft,
    setIsEditingDraft,
    editedPlan,
    setEditedPlan,
    generationProgress,
    generationDetail,
    activeAgent,
    generationError,
    startEditing,
    updateBacklogItemField,
    handleSaveDraft,
    handleStartProject,
    handleSaveConfig,
    handleEnviarCorreccionHito,
    handleCorregirBacklogItem,
    handleUpdateKanbanEstado,
    addTag,
    removeTag,
    calcularProgreso,
    handleDescargarPDF,
  } = useEstudianteProyecto(user);

  const [activeTab, setActiveTab] = useState<"roadmap" | "backlog" | "analitica">("roadmap");
  const [activeTabC, setActiveTabC] = useState<"propuesta" | "roadmap" | "backlog">("propuesta");

  const [copiedLink, setCopiedLink] = useState(false);
  const handleCopyLink = () => {
    if (!projectId) return;
    const url = `${window.location.origin}/portfolio/${projectId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const calcularSemanasTranscurridas = () => {
    return plan?.hitos?.filter(h => h.estado_hito === "aprobado").length || 0;
  };

  const calcularTotalTareas = () => {
    return plan?.backlog_scrum?.epicas?.flatMap(e => e.items).length || 0;
  };

  const calcularTareasCompletadas = () => {
    return plan?.backlog_scrum?.epicas?.flatMap(e => e.items).filter(i => i?.estado === "done").length || 0;
  };

  return (
    <AuthGuard rolRequerido="estudiante">
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden">
        {/* Soft elegant background glows (light theme friendly) */}
        <div className="absolute top-[-25%] left-[-15%] w-[70%] h-[70%] bg-indigo-50/50 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[70%] h-[70%] bg-purple-50/50 rounded-full blur-[150px] pointer-events-none" />

        <div className="w-full max-w-[95%] sm:max-w-[90%] lg:max-w-[85%] mx-auto px-4 sm:px-6 py-6 sm:py-12 relative z-10">
          {/* Navigation Bar */}
          <div className="backdrop-blur-md bg-white/70 border border-slate-200/60 rounded-2xl px-6 py-4 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-xs text-slate-500 font-semibold">
                Sesión activa: <strong className="text-slate-800 truncate max-w-[120px] sm:max-w-none inline-block align-bottom" title={user?.displayName || user?.email || ""}>{user?.displayName || user?.email}</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-[10px] text-indigo-600 font-bold uppercase tracking-wider border border-indigo-100">
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
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all shadow-sm"
                >
                  Alternar Vista Docente
                </button>
              )}
              <ThemeToggle />
              <button
                id="btn-logout"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-650 text-xs font-bold transition-all shadow-sm cursor-pointer"
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
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-xl mx-auto"
              >
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-md shadow-indigo-100">
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Comienza tu viaje</h1>
                  <p className="text-slate-500 text-xs font-medium">Ingresa los datos de tu idea de proyecto y la tecnología que usarás para empezar.</p>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                  <form onSubmit={handleStartProject} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nombre del proyecto</label>
                      <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Eco-Tracker App"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Describe tu idea (mínimo 50 caracteres)
                      </label>
                      <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="Cuéntanos de qué trata tu proyecto, público objetivo y problemas que resuelve..."
                        className="w-full h-20 bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Stack tecnológico</label>
                      {stack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {stack.map((tag) => (
                            <span
                              key={tag}
                              className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-750 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            >
                              {tag}
                              <button type="button" onClick={() => removeTag(tag)} className="cursor-pointer">
                                <Trash2 className="w-3 h-3 hover:text-red-500" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={currentTag}
                          onChange={(e) => setCurrentTag(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                          placeholder="Ej: React, FastAPI, PostgreSQL..."
                          className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button type="button" onClick={addTag} className="bg-slate-105 hover:bg-slate-200 border border-slate-200 px-3.5 rounded-xl cursor-pointer">
                          <Plus className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={idea.length < 50}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Crear Proyecto y Roadmap <ArrowRight className="w-4 h-4" />
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
                  <div className="bg-white border border-red-200 rounded-3xl p-8 text-center shadow-lg space-y-6">
                    <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl mx-auto flex items-center justify-center text-red-600">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-red-650 mb-2">Error de Generación</h2>
                      <p className="text-slate-500 text-xs leading-relaxed max-h-48 overflow-y-auto font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-left">
                        {generationError}
                      </p>
                    </div>
                    <button
                      onClick={() => setPhase("A")}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all border border-slate-200"
                    >
                      Volver al Formulario
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg text-center space-y-8">
                    {/* Progress Ring / Percentage */}
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="46"
                          className="stroke-slate-100 fill-none"
                          strokeWidth="5"
                        />
                        <motion.circle
                          cx="56"
                          cy="56"
                          r="46"
                          className="stroke-indigo-650 fill-none"
                          strokeWidth="5"
                          strokeDasharray={289}
                          initial={{ strokeDashoffset: 289 }}
                          animate={{ strokeDashoffset: 289 - (289 * generationProgress) / 100 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-2xl font-black text-slate-800 font-mono">
                        {generationProgress}%
                      </div>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-800 mb-1">Co-creando plan de estudios...</h2>
                      <p className="text-xs text-indigo-700 h-6 flex items-center justify-center font-bold animate-pulse">
                        {generationDetail}
                      </p>
                    </div>

                    {/* CSS Flow and Ring Keyframes */}
                    <style dangerouslySetInnerHTML={{
                      __html: `
                      @keyframes flow-down {
                        to { stroke-dashoffset: -20; }
                      }
                      @keyframes flow-up {
                        to { stroke-dashoffset: 20; }
                      }
                      .flow-line-active {
                        stroke-dasharray: 6, 4;
                        animation: flow-down 1s linear infinite;
                      }
                      .flow-line-loopback {
                        stroke-dasharray: 6, 4;
                        animation: flow-up 1s linear infinite;
                      }
                      @keyframes pulse-ring-blue {
                        0%, 100% { border-color: rgba(99, 102, 241, 0.3); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.1); }
                        50% { border-color: rgba(99, 102, 241, 0.8); box-shadow: 0 0 10px 2px rgba(99, 102, 241, 0.15); }
                      }
                      .ring-pulse-blue {
                        animation: pulse-ring-blue 1.5s infinite ease-in-out;
                      }
                      @keyframes pulse-ring-amber {
                        0%, 100% { border-color: rgba(245, 158, 11, 0.3); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.1); }
                        50% { border-color: rgba(245, 158, 11, 0.8); box-shadow: 0 0 10px 2px rgba(245, 158, 11, 0.15); }
                      }
                      .ring-pulse-amber {
                        animation: pulse-ring-amber 1.5s infinite ease-in-out;
                      }
                      @keyframes scan-line {
                        0% { transform: translateY(-100%); opacity: 0; }
                        15% { opacity: 0.8; }
                        85% { opacity: 0.8; }
                        100% { transform: translateY(100%); opacity: 0; }
                      }
                      .scanner-effect {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 2px;
                        background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.8), transparent);
                        animation: scan-line 2.5s infinite ease-in-out;
                        pointer-events: none;
                      }
                      .scanner-effect-amber {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 2px;
                        background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.8), transparent);
                        animation: scan-line 2.5s infinite ease-in-out;
                        pointer-events: none;
                      }
                      @media (max-width: 400px) {
                        .agent-flow-container {
                          transform: scale(0.85);
                          transform-origin: top center;
                        }
                      }
                    `}} />

                    {/* Animated Multi-Agent Flow Diagram */}
                    {(() => {
                      const matchIter = generationDetail.match(/Iteración\s+(\d+)/i);
                      const iteracion = matchIter ? parseInt(matchIter[1], 10) : 1;
                      const esLoopback = iteracion > 1 || generationDetail.toLowerCase().includes("ajustando");

                      const isDrafterCompleted = (activeAgent === "validator" || activeAgent === "po") && !esLoopback;
                      const isDrafterActive = activeAgent === "drafter";

                      const isValidatorCompleted = activeAgent === "po";
                      const isValidatorActive = activeAgent === "validator";
                      const isValidatorRefuted = isDrafterActive && esLoopback;

                      const isPoCompleted = generationProgress >= 90;
                      const isPoActive = activeAgent === "po" && !isPoCompleted;

                      return (
                          <div className="w-full overflow-hidden flex justify-center py-2">
                            <div className="agent-flow-container relative w-[360px] h-[324px] flex flex-col items-center flex-shrink-0">
                          {/* SVG Flow Canvas */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
                            <defs>
                              <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                              <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Line 1: Drafter -> Validator */}
                            <line
                              x1="180"
                              y1="76"
                              x2="180"
                              y2="124"
                              stroke={
                                isValidatorCompleted || isPoActive || isPoCompleted ? "#10b981" :
                                  isDrafterActive && esLoopback ? "#cbd5e1" :
                                    isValidatorActive || isDrafterActive ? "#6366f1" :
                                      "#e2e8f0"
                              }
                              strokeWidth="3"
                              strokeDasharray={isValidatorActive || (isDrafterActive && !esLoopback) ? "6, 4" : "none"}
                              className={isValidatorActive || (isDrafterActive && !esLoopback) ? "flow-line-active" : ""}
                              filter={isValidatorActive || (isDrafterActive && !esLoopback) ? "url(#glow-indigo)" : "none"}
                            />

                            {/* Line 2: Validator -> Product Owner */}
                            <line
                              x1="180"
                              y1="200"
                              x2="180"
                              y2="248"
                              stroke={
                                isPoCompleted ? "#10b981" :
                                  isPoActive ? "#6366f1" :
                                    "#e2e8f0"
                              }
                              strokeWidth="3"
                              strokeDasharray={isPoActive ? "6, 4" : "none"}
                              className={isPoActive ? "flow-line-active" : ""}
                              filter={isPoActive ? "url(#glow-indigo)" : "none"}
                            />

                            {/* Loopback Path: Validator -> Drafter */}
                            <path
                              d="M 320 162 C 365 162, 365 38, 320 38"
                              fill="none"
                              stroke={isDrafterActive && esLoopback ? "#f59e0b" : "#e2e8f0"}
                              strokeWidth="3"
                              strokeDasharray={isDrafterActive && esLoopback ? "6, 4" : "none"}
                              className={isDrafterActive && esLoopback ? "flow-line-loopback" : ""}
                              filter={isDrafterActive && esLoopback ? "url(#glow-amber)" : "none"}
                            />
                          </svg>

                          {/* Loopback Badge */}
                          {isDrafterActive && esLoopback && (
                            <span className="absolute left-[310px] top-[90px] bg-amber-50 border border-amber-200 text-amber-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full z-20 animate-pulse shadow-sm">
                              Ajustando
                            </span>
                          )}

                          {/* Nodes container */}
                          <div className="flex flex-col gap-12 relative z-10 w-full items-center">
                            {/* NODE 1: DRAFTER */}
                            <div
                              className={`w-[280px] h-[76px] relative overflow-hidden border rounded-2xl p-3.5 flex items-center gap-3.5 transition-all duration-300 ${isDrafterCompleted ? "bg-emerald-50/90 border-emerald-250 text-slate-800 shadow-sm" :
                                  isDrafterActive && esLoopback ? "bg-amber-50 border-amber-200 text-slate-800 ring-2 ring-amber-500/20 shadow-md ring-pulse-amber" :
                                    isDrafterActive ? "bg-indigo-50 border-indigo-200 text-slate-800 ring-2 ring-indigo-500/20 shadow-md ring-pulse-blue" :
                                      "bg-slate-50/50 border-slate-200 text-slate-400"
                                }`}
                            >
                              {isDrafterActive && (
                                <div className={esLoopback ? "scanner-effect-amber" : "scanner-effect"} />
                              )}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDrafterCompleted ? "bg-emerald-100 text-emerald-600" :
                                  isDrafterActive && esLoopback ? "bg-amber-100 text-amber-600" :
                                    isDrafterActive ? "bg-indigo-100 text-indigo-650" :
                                      "bg-slate-200 text-slate-400"
                                }`}>
                                {isDrafterCompleted ? (
                                  <CheckCircle2 className="w-4.5 h-4.5" />
                                ) : isDrafterActive ? (
                                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                ) : (
                                  <FileText className="w-4.5 h-4.5" />
                                )}
                              </div>
                              <div className="text-left min-w-0">
                                <div className="text-xs font-bold">Drafter (AG-001)</div>
                                <div className="text-[10px] opacity-75 truncate">
                                  {isDrafterActive && esLoopback ? `Ajustando propuesta técnica (Iteración ${iteracion})` : "Diseñando arquitectura y roadmap"}
                                </div>
                              </div>
                            </div>

                            {/* NODE 2: VALIDATOR */}
                            <div
                              className={`w-[280px] h-[76px] relative overflow-hidden border rounded-2xl p-3.5 flex items-center gap-3.5 transition-all duration-300 ${isValidatorCompleted || isPoCompleted || isPoActive ? "bg-emerald-50/90 border-emerald-250 text-slate-800 shadow-sm" :
                                  isValidatorActive ? "bg-indigo-50 border-indigo-200 text-slate-800 ring-2 ring-indigo-500/20 shadow-md ring-pulse-blue" :
                                    isValidatorRefuted ? "bg-amber-50 border-amber-200 text-slate-800 ring-2 ring-amber-500/20 shadow-md" :
                                      "bg-slate-50/50 border-slate-200 text-slate-400"
                                }`}
                            >
                              {isValidatorActive && (
                                <div className="scanner-effect" />
                              )}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isValidatorCompleted || isPoCompleted || isPoActive ? "bg-emerald-100 text-emerald-600" :
                                  isValidatorActive ? "bg-indigo-100 text-indigo-650" :
                                    isValidatorRefuted ? "bg-amber-100 text-amber-600 animate-pulse" :
                                      "bg-slate-200 text-slate-400"
                                }`}>
                                {isValidatorCompleted || isPoCompleted || isPoActive ? (
                                  <CheckCircle2 className="w-4.5 h-4.5" />
                                ) : isValidatorActive ? (
                                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                ) : isValidatorRefuted ? (
                                  <AlertCircle className="w-4.5 h-4.5 text-amber-650" />
                                ) : (
                                  <Shield className="w-4.5 h-4.5" />
                                )}
                              </div>
                              <div className="text-left min-w-0">
                                <div className="text-xs font-bold">Validator (AG-002)</div>
                                <div className="text-[10px] opacity-75 truncate">
                                  {isValidatorRefuted ? "Propuesta observada, solicitando cambios..." : "Evaluando viabilidad"}
                                </div>
                              </div>
                            </div>

                            {/* NODE 3: PRODUCT OWNER */}
                            <div
                              className={`w-[280px] h-[76px] relative overflow-hidden border rounded-2xl p-3.5 flex items-center gap-3.5 transition-all duration-300 ${isPoCompleted ? "bg-emerald-50/90 border-emerald-250 text-slate-800 shadow-sm" :
                                  isPoActive ? "bg-indigo-50 border-indigo-200 text-slate-800 ring-2 ring-indigo-500/20 shadow-md ring-pulse-blue" :
                                    "bg-slate-50/50 border-slate-200 text-slate-400"
                                }`}
                            >
                              {isPoActive && (
                                <div className="scanner-effect" />
                              )}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPoCompleted ? "bg-emerald-100 text-emerald-600" :
                                  isPoActive ? "bg-indigo-100 text-indigo-650" :
                                    "bg-slate-200 text-slate-400"
                                }`}>
                                {isPoCompleted ? (
                                  <CheckCircle2 className="w-4.5 h-4.5" />
                                ) : isPoActive ? (
                                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                ) : (
                                  <Trophy className="w-4.5 h-4.5" />
                                )}
                              </div>
                              <div className="text-left min-w-0">
                                <div className="text-xs font-bold">Product Owner (AG-003)</div>
                                <div className="text-[10px] opacity-75 truncate">Generando backlog Scrum de HUs</div>
                              </div>
                            </div>
                          </div>
                        </div>
                          </div>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── FASE C ─────────────────────────────────────────── */}
            {phase === "C" && plan && (
              <motion.div key="phaseC" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                {/* Alerta de rechazo si aplica */}
                {plan.status === "rejected" && (
                  <div className="flex gap-3 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Propuesta Rechazada por el Docente</p>
                      {plan.motivo_rechazo && (
                        <p className="text-red-650/80 text-xs mt-1">
                          Motivo: {plan.motivo_rechazo}
                        </p>
                      )}
                      <p className="text-slate-500 text-xs mt-2">
                        Puedes modificar los detalles de tu idea de proyecto y volver a generar el plan usando el botón a la derecha.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 gap-4 shadow-sm w-full">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-2">{plan.nombre}</h1>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${plan.scoreValidator >= 80
                          ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                          : "bg-amber-50 text-amber-705 border-amber-150"
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
                        setEditedPlan(null);
                      }}
                      className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-650 px-8 py-3 border border-red-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      Editar y Regenerar
                    </button>
                  ) : isEditingDraft ? (
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleSaveDraft}
                        className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-100"
                      >
                        Guardar Cambios
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingDraft(false);
                          setEditedPlan(null);
                        }}
                        className="w-full sm:w-auto justify-center bg-slate-100 hover:bg-slate-200 text-slate-650 px-6 py-3 rounded-xl font-bold transition-all border border-slate-250 cursor-pointer shadow-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <button
                        onClick={startEditing}
                        className="w-full sm:w-auto justify-center bg-white hover:bg-slate-50 border border-slate-200 text-indigo-600 hover:text-indigo-700 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        Editar Borrador
                      </button>
                      <button
                        onClick={() => setPhase("D")}
                        className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-100"
                      >
                        Confirmar plan <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Tabs Switcher for Phase C */}
                <div className="bg-slate-100/80 border border-slate-200/60 p-1 flex gap-1 rounded-2xl w-full max-w-md shadow-sm overflow-x-auto scrollbar-none">
                  {[
                    { id: "propuesta", label: "Propuesta Técnica", icon: Code },
                    { id: "roadmap", label: "Roadmap e Hitos", icon: Calendar },
                    { id: "backlog", label: "Backlog Scrum", icon: Layers }
                  ].map(tab => {
                    const isActive = activeTabC === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabC(tab.id as any)}
                        className={`flex-1 min-w-[110px] sm:min-w-0 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer flex-shrink-0 ${isActive
                            ? "bg-white border border-slate-200 text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        <Icon className="w-4 h-4 text-indigo-500" />
                        <span>{tab.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {activeTabC === "propuesta" && (
                    <motion.div
                      key="propuestaC"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <section className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-650">
                          <Code className="w-6 h-6" /> Propuesta Técnica
                        </h3>
                        <p className="text-slate-650 text-sm leading-relaxed">{plan.descripcion}</p>

                        <div className="pt-4 border-t border-slate-150">
                          <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">Stack Tecnológico Generado</h4>
                          <div className="flex flex-wrap gap-2">
                            {plan.stack?.map((tag) => (
                              <span
                                key={tag}
                                className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeTabC === "roadmap" && (
                    <motion.div
                      key="roadmapC"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <section className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-6 shadow-sm">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-650">
                          <Calendar className="w-6 h-6" /> Roadmap del Proyecto
                        </h3>
                        {(() => {
                          const planToUse = isEditingDraft && editedPlan ? editedPlan : plan;
                          const mappedHitos = planToUse.hitos.map((h, idx) => ({ hito: h, originalIdx: idx }));
                          const sprint1Hitos = mappedHitos.filter(item => getSprintNum(null, item.hito.semana) === 1);
                          const sprint2Hitos = mappedHitos.filter(item => getSprintNum(null, item.hito.semana) === 2);
                          return (
                            <div className="space-y-8">
                              <HitosGroup
                                sprintNum={1}
                                hitosSubset={sprint1Hitos}
                                isPhaseD={false}
                                isEditingDraft={isEditingDraft}
                                editedPlan={editedPlan}
                                plan={plan}
                                setEditedPlan={setEditedPlan}
                                editingTasks={editingTasks}
                                setEditingTasks={setEditingTasks}
                                handleEnviarCorreccionHito={handleEnviarCorreccionHito}
                              />
                              <HitosGroup
                                sprintNum={2}
                                hitosSubset={sprint2Hitos}
                                isPhaseD={false}
                                isEditingDraft={isEditingDraft}
                                editedPlan={editedPlan}
                                plan={plan}
                                setEditedPlan={setEditedPlan}
                                editingTasks={editingTasks}
                                setEditingTasks={setEditingTasks}
                                handleEnviarCorreccionHito={handleEnviarCorreccionHito}
                              />
                            </div>
                          );
                        })()}
                      </section>
                    </motion.div>
                  )}

                  {activeTabC === "backlog" && (
                    <motion.div
                      key="backlogC"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-650">
                          <Layers className="w-6 h-6" /> Backlog Ágil (Product Owner)
                        </h3>

                        {plan.backlog_scrum?.epicas?.length ? (
                          <>
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/20">
                              <table className="w-full text-left text-sm text-slate-700 min-w-[950px]">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200/80 font-bold">
                                  <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3 min-w-[150px]">Título</th>
                                    <th className="px-4 py-3 min-w-[250px]">Descripción / HU</th>
                                    <th className="px-4 py-3 min-w-[200px]">Criterios de aceptación</th>
                                    <th className="px-4 py-3 text-center">Est.</th>
                                    <th className="px-4 py-3">Prioridad</th>
                                    <th className="px-4 py-3 text-center">Sprint</th>
                                    <th className="px-4 py-3 text-center">Épica</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150">
                                  <BacklogTable
                                    isPhaseD={false}
                                    isEditingDraft={isEditingDraft}
                                    editedPlan={editedPlan}
                                    plan={plan}
                                    updateBacklogItemField={updateBacklogItemField}
                                    editingTasks={editingTasks}
                                    setEditingTasks={setEditingTasks}
                                    handleCorregirBacklogItem={handleCorregirBacklogItem}
                                  />
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile View */}
                            <div className="block md:hidden">
                              <BacklogCards
                                isPhaseD={false}
                                isEditingDraft={isEditingDraft}
                                editedPlan={editedPlan}
                                plan={plan}
                                updateBacklogItemField={updateBacklogItemField}
                                editingTasks={editingTasks}
                                setEditingTasks={setEditingTasks}
                                handleCorregirBacklogItem={handleCorregirBacklogItem}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="text-slate-400 text-sm">El formato antiguo no soporta tabla estructurada. Por favor genera un proyecto nuevo.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── FASE D ─────────────────────────────────────────── */}
            {phase === "D" && plan && (
              <motion.div
                key="phaseD"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8 animate-fadeIn mx-auto w-full"
              >
                {/* Modal de Agentes de Tracking en ejecución */}
                {tracking.status === "processing" && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl max-w-md w-full text-center space-y-6"
                    >
                      {/* Progress Ring */}
                      <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="56"
                            cy="56"
                            r="46"
                            className="stroke-slate-100 fill-none"
                            strokeWidth="5"
                          />
                          <motion.circle
                            cx="56"
                            cy="56"
                            r="46"
                            className="stroke-indigo-650 fill-none"
                            strokeWidth="5"
                            strokeDasharray={289}
                            initial={{ strokeDashoffset: 289 }}
                            animate={{ strokeDashoffset: 289 - (289 * (tracking.progress ?? 0)) / 100 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute text-2xl font-black text-slate-800 font-mono">
                          {tracking.progress ?? 0}%
                        </div>
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Auditoría de Trazabilidad Activa</h2>
                        <p className="text-xs text-indigo-700 h-10 flex items-center justify-center font-bold animate-pulse px-4">
                          {tracking.detail || "Analizando el avance del proyecto..."}
                        </p>
                      </div>

                      {/* Agentes List */}
                      <div className="flex flex-col gap-3 max-w-xs mx-auto text-left pt-2">
                        {[
                          { id: "ag_devops", label: "DevOps Auditor (AG-002)", desc: "Validando commits de GitHub y pipeline" },
                          { id: "ag_comp", label: "Competency Analyzer", desc: "Vinculando commits con habilidades académicas" },
                          { id: "ag_003_analyst", label: "Integrity Analyst (AG-003)", desc: "Calculando score final y detectando riesgos" },
                          { id: "ag_004_reporter", label: "Executive Reporter (AG-004)", desc: "Redactando reporte ejecutivo final" }
                        ].map((ag) => {
                          const isCompleted = 
                            ag.id === "ag_devops" && (tracking.activeAgent === "ag_comp" || tracking.activeAgent === "ag_003_analyst" || tracking.activeAgent === "ag_004_reporter") ||
                            ag.id === "ag_comp" && (tracking.activeAgent === "ag_003_analyst" || tracking.activeAgent === "ag_004_reporter") ||
                            ag.id === "ag_003_analyst" && (tracking.activeAgent === "ag_004_reporter");
                          
                          const isActive = tracking.activeAgent === ag.id;

                          return (
                            <div
                              key={ag.id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                isCompleted
                                  ? "bg-emerald-50 border-emerald-200 text-slate-800"
                                  : isActive
                                  ? "bg-indigo-50 border-indigo-200 text-slate-800 ring-2 ring-indigo-500/20 shadow-sm"
                                  : "bg-slate-50 border-slate-200 text-slate-400"
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isCompleted ? "bg-emerald-100 text-emerald-600" :
                                isActive ? "bg-indigo-100 text-indigo-600" :
                                "bg-slate-200 text-slate-400"
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : isActive ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Activity className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold">{ag.label}</div>
                                <div className="text-[8px] opacity-75 truncate">{ag.desc}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Header Container */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-2">{plan.nombre}</h1>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Activity className="w-4 h-4 animate-pulse text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Activo</span>
                    </div>
                  </div>

                  {/* Metrics Row under Header Title */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-center sm:text-left">
                      <div className="text-3xl font-black text-indigo-600">{calcularProgreso()}%</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Progreso</div>
                    </div>
                    <div className="text-center sm:text-left border-l border-slate-200 sm:border-l-0 pl-4 sm:pl-0">
                      <div className="text-2xl font-bold text-slate-700">{calcularSemanasTranscurridas()}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Semanas</div>
                    </div>
                    <div className="text-center sm:text-left border-t border-slate-200 sm:border-t-0 pt-4 sm:pt-0">
                      <div className="text-2xl font-bold text-slate-700">{plan.hitos?.length || 0}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hitos</div>
                    </div>
                    <div className="text-center sm:text-left border-t border-l border-slate-200 sm:border-t-0 sm:border-l-0 pt-4 pl-4 sm:pt-0 sm:pl-0">
                      <div className="text-2xl font-bold text-slate-700">{calcularTareasCompletadas()}/{calcularTotalTareas()}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tareas</div>
                    </div>
                  </div>
                </div>

                {/* Tracking Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Card 1: Integridad */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-3 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <span>Integridad</span>
                      {tracking.status === "processing" && (
                        <RefreshCw className="w-3.5 h-3.5 text-slate-450 animate-spin" />
                      )}
                    </div>

                    {tracking.status === "not_started" || tracking.status === "processing" ? (
                      <div className="space-y-3 flex-1 justify-center flex flex-col">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>Integridad</span>
                          <span className="text-slate-400">Analizando...</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full">
                          <div className="h-full bg-slate-300 w-full animate-pulse rounded-full" />
                        </div>
                      </div>
                    ) : tracking.status === "error" ? (
                      <p className="text-xs text-red-500 font-bold">Error al cargar.</p>
                    ) : (
                      <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between text-xs font-semibold text-slate-650">
                          <span>Integridad:</span>
                          <span className={`${scoreColor(tracking.data?.score_integridad ?? 0)} font-bold`}>
                            {tracking.data?.score_integridad ?? 0}/100
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                            style={{ width: barWidth(tracking.data?.score_integridad ?? 0) }}
                          />
                        </div>
                        {tracking.data?.diagnostico_riesgo && (
                          <p className="text-[10px] text-slate-500 pt-0.5 line-clamp-2 leading-relaxed">
                            {tracking.data.diagnostico_riesgo}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 2: Competencias Adquiridas */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-3 shadow-sm flex flex-col justify-between">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Competencias</div>
                    {tracking.status === "completed" &&
                      tracking.data?.reporte_competencias?.competencias?.length ? (
                      <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1 flex-grow justify-center flex flex-col">
                        {tracking.data.reporte_competencias.competencias
                          .filter((c) => c.adquirida)
                          .slice(0, 3)
                          .map((c) => (
                            <div key={c.id} className="flex gap-2 text-xs items-center font-bold">
                              <Trophy className={`w-3 h-3 ${NIVEL_COLORS[c.nivel]} flex-shrink-0`} />
                              <span className="text-slate-700 truncate flex-grow">{c.nombre}</span>
                              <span className={`text-[9px] ml-auto uppercase ${NIVEL_COLORS[c.nivel]}`}>
                                {c.nivel.slice(0, 3)}
                              </span>
                            </div>
                          ))}
                        {tracking.data.reporte_competencias.competencias.filter((c) => !c.adquirida)
                          .length > 0 && (
                            <p className="text-[9px] text-slate-400 font-bold">
                              +{tracking.data.reporte_competencias.competencias.filter((c) => !c.adquirida).length} en progreso
                            </p>
                          )}
                      </div>
                    ) : tracking.status === "processing" ? (
                      <div className="space-y-1.5 animate-pulse flex-grow justify-center flex flex-col">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-4 bg-slate-100 rounded" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-semibold flex-grow flex items-center">Sin competencias aún.</p>
                    )}
                  </div>

                  {/* Card 3: Alertas DevOps */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2.5 shadow-sm max-h-[140px] overflow-y-auto flex flex-col justify-between">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alertas DevOps</div>
                    {tracking.status === "processing" && (
                      <div className="flex gap-2 text-slate-450 items-center text-[10px] animate-pulse flex-grow">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                        <span className="font-bold">Analizando...</span>
                      </div>
                    )}

                    {tracking.status === "completed" && (
                      <div className="space-y-1.5 flex-grow overflow-y-auto">
                        {tracking.data?.alertas?.length ? (
                          tracking.data.alertas.map((alerta, i) => (
                            <div
                              key={i}
                              className={`border p-2 rounded-xl text-[10px] leading-snug flex gap-1.5 ${SEVERIDAD_COLORS[alerta.severidad]}`}
                            >
                              <AlertCircle className="w-3 h-3 text-current mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-black uppercase tracking-wider text-[8px] flex justify-between mb-0.5">
                                  <span className="truncate">
                                    {(() => {
                                      const map: Record<string, string> = {
                                        produccion_inactiva: "DESPLIEGUE INACTIVO",
                                        demo_caida: "DESPLIEGUE INACTIVO",
                                        tarea_sin_evidencia: "TAREA SIN RESPALDO",
                                        pipeline_roto: "PIPELINE CAÍDO",
                                        commit_inactivo: "INACTIVIDAD EN GIT",
                                      };
                                      return map[alerta.tipo] || alerta.tipo.replace(/_/g, " ");
                                    })()}
                                  </span>
                                  <span>{alerta.severidad}</span>
                                </div>
                                <p className="opacity-85 truncate" title={alerta.mensaje}>{alerta.mensaje}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-150 p-2 rounded-xl text-[10px] flex gap-1.5 items-center font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>DevOps en orden</span>
                          </div>
                        )}
                      </div>
                    )}

                    {tracking.status === "error" && (
                      <p className="text-[10px] text-red-500 font-bold flex-grow flex items-center">Error de conexión.</p>
                    )}
                  </div>

                  {/* Card 4: Evidencias Recientes */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2.5 shadow-sm max-h-[140px] overflow-y-auto flex flex-col justify-between">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evidencias</div>
                    {tracking.status === "completed" &&
                      (tracking.data?.evidencias?.length ?? 0) > 0 ? (
                      <div className="space-y-1.5 flex-grow overflow-y-auto">
                        {(tracking.data?.evidencias as Array<{ tipo: string; url?: string }> ?? [])
                          .slice(0, 3)
                          .map((ev, i) => (
                            <div key={i} className="flex gap-1.5 items-center text-[10px] font-semibold text-slate-600">
                              <span className="text-indigo-655 flex-shrink-0">
                                {TIPO_ICONS[ev.tipo] ?? <FileText className="w-3.5 h-3.5" />}
                              </span>
                              <a
                                href={ev.url ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate hover:text-indigo-600 hover:underline flex-grow"
                              >
                                {ev.url ?? ev.tipo}
                              </a>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-semibold flex-grow flex items-center">Sin evidencias.</p>
                    )}
                  </div>
                </div>

                {/* Executive Summary (when tracking is completed) */}
                {tracking.status === "completed" && tracking.data?.resumen_ejecutivo && (
                  <div className="bg-indigo-50/25 border border-indigo-100 p-6 rounded-3xl space-y-3 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-100/30 rounded-full blur-2xl pointer-events-none" />
                    <h3 className="text-[10px] font-bold text-indigo-750 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Resumen Ejecutivo (AI Agent AG-004)
                    </h3>
                    <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                      {tracking.data.resumen_ejecutivo}
                    </p>

                    {tracking.data.estado_repo && (
                      <div className="flex gap-4 pt-3 text-xs text-slate-500 font-semibold border-t border-slate-200/60 mt-3 flex-wrap">
                        {tracking.data.estado_repo.repo_url && (
                          <a
                            href={tracking.data.estado_repo.repo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-indigo-650 hover:text-indigo-750 hover:underline"
                          >
                            <GitCommit className="w-3.5 h-3.5" /> Repositorio
                          </a>
                        )}
                        {tracking.data.estado_repo.demo_url && (
                          <a
                            href={tracking.data.estado_repo.demo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:underline"
                          >
                            <Rocket className="w-3.5 h-3.5" /> Producción en Vivo
                          </a>
                        )}
                        <button
                          onClick={handleDescargarPDF}
                          className="flex items-center gap-1.5 text-indigo-650 hover:text-indigo-750 hover:underline cursor-pointer font-semibold border-none bg-transparent"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-500" /> Reporte PDF
                        </button>
                        <span className="flex items-center gap-1">
                          CI Status:
                          <span className={`font-bold uppercase ${tracking.data.estado_repo.ci_status === "pass"
                              ? "text-emerald-600"
                              : tracking.data.estado_repo.ci_status === "fail"
                                ? "text-red-650"
                                : "text-slate-500"
                            }`}>
                            {tracking.data.estado_repo.ci_status}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tabs Bar */}
                <div className="bg-slate-100/80 border border-slate-200/60 p-1 flex gap-1 rounded-2xl w-full shadow-sm overflow-x-auto scrollbar-none">
                  {[
                    { id: "roadmap", label: "Roadmap e Hitos", icon: Calendar },
                    { id: "backlog", label: "Kanban y Backlog", icon: Layers },
                    { id: "analitica", label: "Analítica y Competencias", icon: BarChart3 }
                  ].map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[110px] sm:min-w-0 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer flex-shrink-0 ${isActive
                            ? "bg-white border border-slate-200 text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        <Icon className="w-4 h-4 text-indigo-500" />
                        <span>{tab.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {/* Tab 1: Roadmap */}
                  {activeTab === "roadmap" && (
                    <motion.div
                      key="roadmapD"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-8"
                    >
                      {/* Configuración de Entregables (Repositorio y Despliegue) */}
                      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-indigo-650">
                          <Code className="w-5 h-5" />
                          <h3 className="text-sm font-bold uppercase tracking-widest">
                            Configuración de Entregables
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                          Vincula tu repositorio de código y el enlace de producción. Los agentes de la IA de trazabilidad inspeccionarán estas direcciones para medir tu progreso, integridad y competencias académicas.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-450 uppercase tracking-wider">Repositorio de Git</label>
                            <input
                              value={repoUrl}
                              onChange={(e) => setRepoUrl(e.target.value)}
                              placeholder="Ej: https://github.com/usuario/repo"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-450 uppercase tracking-wider">Enlace de Producción</label>
                            <input
                              value={demoUrl}
                              onChange={(e) => setDemoUrl(e.target.value)}
                              placeholder="Ej: https://mi-proyecto.vercel.app"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          {(() => {
                            const urlsChanged =
                              repoUrl.trim() !== (plan.repo_url || "").trim() ||
                              demoUrl.trim() !== (plan.demo_url || "").trim();
                            const alreadyConfigured = Boolean(plan.repo_url);
                            return (
                              <button
                                onClick={handleSaveConfig}
                                disabled={isSavingConfig || !repoUrl.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-100"
                              >
                                {isSavingConfig ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    {urlsChanged ? "Guardando..." : "Analizando..."}
                                  </>
                                ) : urlsChanged && alreadyConfigured ? (
                                  "Guardar y Analizar"
                                ) : (
                                  "Analizar"
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Milestones grouped by Sprint */}
                      {(() => {
                        const mappedHitos = plan.hitos.map((h, idx) => ({ hito: h, originalIdx: idx }));
                        const sprint1Hitos = mappedHitos.filter(item => getSprintNum(null, item.hito.semana) === 1);
                        const sprint2Hitos = mappedHitos.filter(item => getSprintNum(null, item.hito.semana) === 2);
                        return (
                          <div className="space-y-8 bg-white border border-slate-200/80 p-8 rounded-3xl shadow-sm">
                            <div className="flex items-center gap-2 text-indigo-650 mb-2">
                              <Calendar className="w-6 h-6" />
                              <h3 className="text-lg font-bold">Planificación de Hitos</h3>
                            </div>
                            <HitosGroup
                              sprintNum={1}
                              hitosSubset={sprint1Hitos}
                              isPhaseD={true}
                              isEditingDraft={false}
                              editedPlan={null}
                              plan={plan}
                              setEditedPlan={() => { }}
                              editingTasks={editingTasks}
                              setEditingTasks={setEditingTasks}
                              handleEnviarCorreccionHito={handleEnviarCorreccionHito}
                            />
                            <HitosGroup
                              sprintNum={2}
                              hitosSubset={sprint2Hitos}
                              isPhaseD={true}
                              isEditingDraft={false}
                              editedPlan={null}
                              plan={plan}
                              setEditedPlan={() => { }}
                              editingTasks={editingTasks}
                              setEditingTasks={setEditingTasks}
                              handleEnviarCorreccionHito={handleEnviarCorreccionHito}
                            />
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* Tab 2: Kanban y Backlog */}
                  {activeTab === "backlog" && (
                    <motion.div
                      key="backlogD"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-650">
                            <Layers className="w-6 h-6" /> Backlog de Desarrollo (Scrum)
                          </h3>
                        </div>

                        {plan.backlog_scrum?.epicas?.length ? (
                          <div className="space-y-8">
                            {/* Kanban Board */}
                            <div>
                              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Kanban</h4>
                              {tracking.data?.kanban_updates &&
                                Object.keys(tracking.data.kanban_updates).length > 0 && (
                                  <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mb-3 font-semibold">
                                    El agente actualizó {Object.keys(tracking.data.kanban_updates).length} tarjeta(s)
                                    según commits y código del repo. Detalle en Analítica.
                                  </p>
                                )}
                              <KanbanBoard
                                items={plan.backlog_scrum.epicas.flatMap(e => e.items ?? [])}
                                onItemMove={(itemId, newEstado) => {
                                  handleUpdateKanbanEstado(itemId, newEstado);
                                }}
                              />
                            </div>

                            {/* Backlog Table */}
                            <div>
                              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Vista Tabla</h4>
                              
                              {/* Desktop View */}
                              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/20">
                                <table className="w-full text-left text-sm text-slate-700 min-w-[950px]">
                                  <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200/80 font-bold">
                                    <tr>
                                      <th className="px-4 py-3">ID</th>
                                      <th className="px-4 py-3">Tipo</th>
                                      <th className="px-4 py-3 min-w-[150px]">Título</th>
                                      <th className="px-4 py-3 min-w-[250px]">Descripción / HU</th>
                                      <th className="px-4 py-3 min-w-[200px]">Criterios de aceptación</th>
                                      <th className="px-4 py-3 text-center">Est.</th>
                                      <th className="px-4 py-3">Prioridad</th>
                                      <th className="px-4 py-3 text-center">Estado / Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150">
                                    <BacklogTable
                                      isPhaseD={true}
                                      isEditingDraft={false}
                                      editedPlan={null}
                                      plan={plan}
                                      updateBacklogItemField={updateBacklogItemField}
                                      editingTasks={editingTasks}
                                      setEditingTasks={setEditingTasks}
                                      handleCorregirBacklogItem={handleCorregirBacklogItem}
                                    />
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile View */}
                              <div className="block md:hidden">
                                <BacklogCards
                                  isPhaseD={true}
                                  isEditingDraft={false}
                                  editedPlan={null}
                                  plan={plan}
                                  updateBacklogItemField={updateBacklogItemField}
                                  editingTasks={editingTasks}
                                  setEditingTasks={setEditingTasks}
                                  handleCorregirBacklogItem={handleCorregirBacklogItem}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">El formato antiguo no soporta tabla estructurada. Por favor genera un proyecto nuevo.</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 3: Analítica y Competencias */}
                  {activeTab === "analitica" && (
                    <motion.div
                      key="analiticaD"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 flex-wrap">
                          <div className="flex items-center gap-2 text-indigo-650">
                            <BarChart3 className="w-6 h-6" />
                            <h3 className="text-xl font-bold">Análisis de Competencias</h3>
                          </div>
                          {projectId && (
                            <button
                              onClick={handleCopyLink}
                              className="py-2 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                            >
                              <Copy className="w-4 h-4 text-emerald-500" />
                              {copiedLink ? "¡Enlace Copiado!" : "Compartir Portafolio"}
                            </button>
                          )}
                        </div>

                        {tracking.status === "completed" && tracking.data ? (
                          <div className="space-y-8">
                            <CommitsHitosPanel
                              commits={tracking.data.estado_repo?.commits || []}
                              kanbanUpdates={tracking.data.kanban_updates}
                            />

                            {tracking.data.reporte_competencias?.competencias?.length ? (
                              <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                  {tracking.data.reporte_competencias.competencias.length >= 3 && (
                                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center">
                                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Radar de Competencias</h4>
                                      <RadarChart competencias={tracking.data.reporte_competencias.competencias} />
                                    </div>
                                  )}

                                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                      <Activity className="w-3.5 h-3.5 text-indigo-500" /> Historial de Desempeño
                                    </h4>
                                    {tracking.data.tracking_history && tracking.data.tracking_history.length > 0 ? (
                                      <div className="w-full h-[300px] mt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={tracking.data.tracking_history} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={9} />
                                            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                                            <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                                            <Legend wrapperStyle={{ fontSize: "10px" }} />
                                            <Line name="Score Integridad" type="monotone" dataKey="score_integridad" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                                            <Line name="% Competencias" type="monotone" dataKey="porcentaje_competencias" stroke="#10b981" strokeWidth={2.5} />
                                          </LineChart>
                                        </ResponsiveContainer>
                                      </div>
                                    ) : (
                                      <div className="h-[300px] flex items-center justify-center text-slate-450 text-xs italic">
                                        Historial insuficiente. Realiza más análisis para visualizar la línea de tiempo.
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="w-full space-y-4">
                                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Resumen Académico</h4>
                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {tracking.data.reporte_competencias.competencias.map((c) => {
                                      const levelColor = NIVEL_COLORS[c.nivel];
                                      return (
                                        <div
                                          key={c.id}
                                          className={`flex items-center justify-between border rounded-2xl p-4 transition-all ${
                                            c.adquirida
                                              ? "bg-indigo-50/30 border-indigo-150"
                                              : "bg-slate-50/50 border-slate-200"
                                          }`}
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div
                                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                c.adquirida ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500"
                                              }`}
                                            >
                                              <Trophy className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-bold text-slate-800 truncate">{c.nombre}</p>
                                              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                Nivel: <span className={`${levelColor} font-bold`}>{c.nivel}</span>
                                              </p>
                                            </div>
                                          </div>
                                          <div>
                                            {c.adquirida ? (
                                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                Adquirida
                                              </span>
                                            ) : (
                                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                                En progreso
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            ) : null}
                          </div>
                        ) : tracking.status === "processing" ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            <p className="text-xs text-slate-500 font-medium">Analizando tus evidencias de código...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Trophy className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-sm text-slate-500 font-semibold">No se han analizado competencias todavía.</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                              Vincula tu repositorio Git y realiza commits para que la IA evalúe tus competencias técnicas.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AuthGuard>
  );
}
