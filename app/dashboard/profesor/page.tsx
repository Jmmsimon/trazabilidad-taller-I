"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  GitCommit,
  Rocket,
  Shield,
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
  LogOut,
  Gauge,
  Bot,
  GitBranch,
  Award,
  Trophy,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useProfesor } from "./hooks/useProfesor";
import { ProjectSelector } from "./components/ProjectSelector";
import { ProfesorMetrics } from "./components/ProfesorMetrics";
import { HitosApprover } from "./components/HitosApprover";
import { BacklogReviewer } from "./components/BacklogReviewer";
import { GitCommitsTracker } from "./components/GitCommitsTracker";
import { BacklogAuditor } from "./components/BacklogAuditor";
import { RadarChart } from "../estudiante/components/RadarChart";
import { NIVEL_COLORS } from "./types";

export default function ProfesorDashboard() {
  const router = useRouter();
  const {
    user,
    logout,
    view,
    proyectos,
    loadingLista,
    errorLista,
    detalle,
    loadingDetalle,
    errorDetalle,
    comentario,
    setComentario,
    motivo,
    setMotivo,
    isAnalyzing,
    analysisMessage,
    loadingAprobar,
    loadingRechazar,
    isArchiving,
    hitoStates,
    editingTareasEstado,
    editingTareasComentarios,
    setEditingTareasEstado,
    setEditingTareasComentarios,
    revisandoBacklogItem,
    setRevisandoBacklogItem,
    comentarioBacklog,
    setComentarioBacklog,
    estadoBacklog,
    setEstadoBacklog,
    handleSelectProject,
    handleVolver,
    handleRefetchDetalle,
    handleReAnalizar,
    handleAprobar,
    handleRechazar,
    handleDescargarPDF,
    handleExportarJSON,
    handleArchivarCiclo,
    setHitoField,
    handleToggleTaskStatus,
    handleTaskCommentChange,
    handleGuardarRevisionHito,
    handleGuardarAuditBacklog,
    getCommitChartData,
    showConfirmReset,
    setShowConfirmReset,
    toast,
    setToast,
  } = useProfesor();

  const [activeTab, setActiveTab] = useState<"hitos" | "backlog" | "commits" | "auditoria" | "analitica">("hitos");

  return (
    <AuthGuard rolRequerido="profesor">
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden">
        {/* Soft decorative background glows */}
        <div className="absolute top-[-25%] left-[-15%] w-[70%] h-[70%] bg-indigo-50/50 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[70%] h-[70%] bg-purple-50/50 rounded-full blur-[150px] pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12 relative z-10">
          {/* Navigation Bar */}
          <div className="backdrop-blur-md bg-white/70 border border-slate-200/60 rounded-2xl px-6 py-4 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-xs text-slate-500 font-semibold">
                Sesión activa: <strong className="text-slate-800 truncate max-w-[120px] sm:max-w-none inline-block align-bottom" title={user?.displayName || user?.email || ""}>{user?.displayName || user?.email}</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-105 text-[10px] text-indigo-600 font-bold uppercase tracking-wider border border-indigo-100">
                Docente
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={async () => {
                  try {
                    await logout();
                  } catch (err) {
                    console.error(err);
                  }
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
            {view === "list" ? (
              <ProjectSelector
                proyectos={proyectos}
                loading={loadingLista}
                error={errorLista}
                onRetry={handleVolver}
                onSelectProject={handleSelectProject}
              />
            ) : (
              <motion.div
                key="detalle"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-6"
              >
                {/* Volver y Header del Proyecto */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <button
                    onClick={handleVolver}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-655 text-xs font-bold mb-4 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Volver a Proyectos
                  </button>
                  
                  {loadingDetalle && !detalle ? (
                    <div className="flex items-center gap-2 text-slate-500 py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Cargando detalles del proyecto...</span>
                    </div>
                  ) : errorDetalle || !detalle ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                      <p className="text-slate-500 font-medium">{errorDetalle || "No se cargaron los datos."}</p>
                      <button
                        onClick={handleRefetchDetalle}
                        className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-200 cursor-pointer"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">
                            {detalle.nombre}
                          </h2>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <span className="text-slate-800 font-semibold">
                              Alumno: {detalle.alumnoNombre || "Sin nombre"}
                            </span>
                            {detalle.alumnoEmail && (
                              <>
                                <span>•</span>
                                <span className="text-xs">{detalle.alumnoEmail}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {detalle.repo_url && (
                            <a
                              href={detalle.repo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-indigo-650 text-xs font-bold transition-all"
                            >
                              <GitCommit className="w-3.5 h-3.5" /> Código Fuente
                            </a>
                          )}
                          {detalle.demo_url && (
                            <a
                              href={detalle.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-emerald-650 text-xs font-bold transition-all"
                            >
                              <Rocket className="w-3.5 h-3.5" /> Demo Online
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Tabs Navigation */}
                      <div className="flex border-b border-slate-150 mt-6 gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
                        {[
                          { key: "hitos", label: "Auditoría Hitos", icon: Activity },
                          { key: "backlog", label: "Historias de Usuario", icon: BarChart3 },
                          { key: "commits", label: "Control Git", icon: GitCommit },
                          { key: "auditoria", label: "Auditoría Avances", icon: Gauge },
                          { key: "analitica", label: "Analítica", icon: BarChart3 },
                        ].map((tab) => {
                          const IconComp = tab.icon;
                          return (
                            <button
                              key={tab.key}
                              onClick={() => setActiveTab(tab.key as any)}
                              className={`flex items-center justify-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition-all cursor-pointer flex-shrink-0 min-w-[120px] sm:min-w-0 ${
                                activeTab === tab.key
                                  ? "border-indigo-650 text-indigo-650"
                                  : "border-transparent text-slate-400 hover:text-slate-655"
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {detalle && (
                  <div className="flex flex-col gap-8">
                    {/* Contenido Principal (Tabs del Proyecto) */}
                    <div className="w-full space-y-6">
                      
                      {activeTab === "hitos" && (
                        <div className="space-y-6">
                          {/* Métricas Inferiores movidas arriba */}
                          <div className="w-full">
                            <ProfesorMetrics
                              detalle={detalle}
                              isAnalyzing={isAnalyzing}
                              analysisMessage={analysisMessage}
                              handleReAnalizar={handleReAnalizar}
                              handleDescargarPDF={handleDescargarPDF}
                              handleExportarJSON={handleExportarJSON}
                              onOpenResetConfirm={() => setShowConfirmReset(true)}
                              isArchiving={isArchiving}
                            />
                          </div>

                          {/* Panel Auditoría de Roadmap */}
                          {detalle.status === "pending_approval" && (
                            <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Aprobación Inicial de Roadmap
                              </h3>
                              <div className="space-y-2">
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                  Comentario / Feedback de Auditoría
                                </label>
                                <textarea
                                  value={comentario || motivo}
                                  onChange={(e) => {
                                    setComentario(e.target.value);
                                    setMotivo(e.target.value);
                                  }}
                                  placeholder="Escribe un comentario sobre la propuesta del alumno..."
                                  className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-3 pt-1 w-full sm:w-auto">
                                <button
                                  onClick={handleAprobar}
                                  disabled={loadingAprobar}
                                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-emerald-100 cursor-pointer w-full sm:w-auto text-center"
                                >
                                  {loadingAprobar ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                  Aprobar Propuesta
                                </button>
                                <button
                                  onClick={handleRechazar}
                                  disabled={loadingRechazar}
                                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-red-100 cursor-pointer w-full sm:w-auto text-center"
                                >
                                  {loadingRechazar ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  Observar / Rechazar
                                </button>
                              </div>
                            </section>
                          )}

                          {/* Banner aprobado */}
                          {detalle.status === "active" && detalle.comentario_profesor && (
                            <div className="flex gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs shadow-sm">
                              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
                              <div>
                                <p className="font-bold">Propuesta / Roadmap Aprobado</p>
                                <p className="opacity-90 mt-1">{detalle.comentario_profesor}</p>
                              </div>
                            </div>
                          )}

                          {/* Hitos List */}
                          <HitosApprover
                            hitos={detalle.propuesta?.hitos ?? []}
                            hitoStates={hitoStates}
                            editingTareasEstado={editingTareasEstado}
                            editingTareasComentarios={editingTareasComentarios}
                            setHitoField={setHitoField}
                            setEditingTareasEstado={setEditingTareasEstado}
                            setEditingTareasComentarios={setEditingTareasComentarios}
                            handleToggleTaskStatus={handleToggleTaskStatus}
                            handleTaskCommentChange={handleTaskCommentChange}
                            handleGuardarRevisionHito={handleGuardarRevisionHito}
                          />
                        </div>
                      )}

                      {activeTab === "backlog" && (
                        <BacklogReviewer
                          detalle={detalle}
                          revisandoBacklogItem={revisandoBacklogItem}
                          setRevisandoBacklogItem={setRevisandoBacklogItem}
                          comentarioBacklog={comentarioBacklog}
                          setComentarioBacklog={setComentarioBacklog}
                          estadoBacklog={estadoBacklog}
                          setEstadoBacklog={setEstadoBacklog}
                          handleGuardarAuditBacklog={handleGuardarAuditBacklog}
                        />
                      )}

                      {activeTab === "commits" && (
                        <GitCommitsTracker
                          detalle={detalle}
                          getCommitChartData={getCommitChartData}
                        />
                      )}

                      {activeTab === "auditoria" && (
                        <BacklogAuditor
                          proyectoId={detalle.proyectoId}
                          repoUrl={detalle.repo_url ?? null}
                          initialAudit={detalle.backlog_audit}
                        />
                      )}

                      {activeTab === "analitica" && (
                        <div className="space-y-6">
                          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
                            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 flex-wrap">
                              <div className="flex items-center gap-2 text-indigo-650">
                                <BarChart3 className="w-6 h-6" />
                                <h3 className="text-xl font-bold">Análisis de Competencias</h3>
                              </div>
                            </div>

                            {detalle.tracking && detalle.tracking.reporte_competencias?.competencias?.length ? (
                              <div className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                  {/* Radar Chart Section */}
                                  {detalle.tracking.reporte_competencias.competencias.length >= 3 && (
                                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center">
                                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Radar de Competencias</h4>
                                      <RadarChart competencias={detalle.tracking.reporte_competencias.competencias as any} />
                                    </div>
                                  )}

                                  {/* Line Chart Section (Historial de Avance) */}
                                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                      <Activity className="w-3.5 h-3.5 text-indigo-500" /> Historial de Desempeño
                                    </h4>
                                    {detalle.tracking_history && detalle.tracking_history.length > 0 ? (
                                      <div className="w-full h-[300px] mt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={detalle.tracking_history} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={9} />
                                            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px' }} />
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

                                {/* Competencies List Section */}
                                <div className="w-full space-y-4">
                                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Resumen Académico</h4>

                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {detalle.tracking.reporte_competencias.competencias.map((c) => {
                                      const levelColor = NIVEL_COLORS[c.nivel] || "text-slate-500";
                                      return (
                                        <div
                                          key={c.id}
                                          className={`flex items-center justify-between border rounded-2xl p-4 transition-all ${c.adquirida
                                              ? "bg-indigo-50/30 border-indigo-150"
                                              : "bg-slate-50/50 border-slate-200"
                                            }`}
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.adquirida ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500"
                                              }`}>
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
                              </div>
                            ) : (
                              <div className="text-center py-10 text-slate-500 italic text-sm">
                                No hay datos de analítica de competencias aún. Completa el análisis de trazabilidad.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal de Carga de Análisis de IA */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center relative overflow-hidden"
          >
            {/* Soft decorative background glows inside modal */}
            <div className="absolute top-[-40%] left-[-40%] w-[80%] h-[80%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-40%] right-[-40%] w-[80%] h-[80%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Radar Animation */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-950 animate-ping opacity-45" />
              <div className="absolute inset-2 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none z-10 animate-bounce">
                <Bot className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Status title */}
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                Ejecutando Agentes de IA
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Auditoría en tiempo real para el proyecto
              </p>
                   {/* Diagrama de Flujo de Agentes Animado */}
            <div className="relative py-8 flex items-center justify-between max-w-[280px] mx-auto z-10 select-none">
              {/* Línea de conexión de fondo */}
              <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
              
              {/* Línea de progreso brillante animada */}
              <motion.div 
                className="absolute top-1/2 left-4 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 -translate-y-1/2 z-0"
                initial={{ width: "0%" }}
                animate={{ 
                  width: 
                    analysisMessage.includes("Git") || analysisMessage.includes("Iniciando") ? "33%" :
                    analysisMessage.includes("evidencias") || analysisMessage.includes("competencias") ? "66%" : "100%"
                }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />

              {/* Glowing data packet particle flowing between active nodes */}
              <motion.div
                className="absolute w-3.5 h-3.5 rounded-full bg-indigo-500 blur-[1px] shadow-[0_0_12px_#6366f1] z-10"
                animate={{
                  x: 
                    analysisMessage.includes("Git") || analysisMessage.includes("Iniciando")
                      ? [4, 86, 4]
                      : analysisMessage.includes("evidencias") || analysisMessage.includes("competencias")
                      ? [86, 172, 86]
                      : [172, 246, 172]
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ top: "calc(50% - 7px)" }}
              />

              {/* Node 1: DevOps */}
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <motion.div 
                  animate={
                    analysisMessage.includes("Git") || analysisMessage.includes("Iniciando") 
                      ? { scale: [1, 1.12, 1] } 
                      : {}
                  }
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    analysisMessage.includes("Git") || analysisMessage.includes("Iniciando")
                      ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                      : analysisMessage.includes("evidencias") || analysisMessage.includes("competencias") || analysisMessage.includes("métricas") || analysisMessage.includes("riesgo")
                      ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
                  }`}
                  title="AG-001 DevOps"
                >
                  {analysisMessage.includes("evidencias") || analysisMessage.includes("competencias") || analysisMessage.includes("métricas") || analysisMessage.includes("riesgo") ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <GitBranch className="w-5 h-5" />
                  )}
                </motion.div>
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">AG-001 (DevOps)</span>
              </div>

              {/* Node 2: Competency */}
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <motion.div 
                  animate={
                    analysisMessage.includes("evidencias") || analysisMessage.includes("competencias")
                      ? { scale: [1, 1.12, 1] } 
                      : {}
                  }
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    analysisMessage.includes("evidencias") || analysisMessage.includes("competencias")
                      ? "bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-200 dark:shadow-none"
                      : analysisMessage.includes("métricas") || analysisMessage.includes("riesgo")
                      ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
                  }`}
                  title="AG-002 Competency"
                >
                  {analysisMessage.includes("métricas") || analysisMessage.includes("riesgo") ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Award className="w-5 h-5" />
                  )}
                </motion.div>
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">AG-002 (Comp)</span>
              </div>

              {/* Node 3: Analyst */}
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <motion.div 
                  animate={
                    analysisMessage.includes("métricas") || analysisMessage.includes("riesgo")
                      ? { scale: [1, 1.12, 1] } 
                      : {}
                  }
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    analysisMessage.includes("métricas") || analysisMessage.includes("riesgo")
                      ? "bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-200 dark:shadow-none"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
                  }`}
                  title="AG-003 Analyst"
                >
                  <Shield className="w-5 h-5" />
                </motion.div>
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">AG-003 (Analyst)</span>
              </div>
            </div>            </div>

            {/* Live Progress Message Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold text-left">
                {analysisMessage || "Ejecutando..."}
              </p>
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal de Confirmación de Reinicio de Ciclo */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden text-center"
          >
            {/* Warning Icon */}
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900 animate-bounce">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                ¿Reiniciar Ciclo Académico?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-normal">
                Esta acción es irreversible. Se eliminará el historial de chat con la IA, las evidencias asociadas al ciclo y se restablecerán todos los hitos del proyecto a pendientes.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleArchivarCiclo}
                disabled={isArchiving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-650 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer border-none"
              >
                {isArchiving ? "Reiniciando..." : "Confirmar Reinicio"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast de Notificación Comercial */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 right-6 z-50 max-w-sm w-full backdrop-blur-md rounded-2xl p-4 shadow-xl border flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 border-slate-200/60 dark:border-slate-850"
        >
          {toast.type === "success" && (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          )}
          {toast.type === "error" && (
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          {toast.type === "info" && (
            <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          )}
          <p className="text-xs text-slate-750 dark:text-slate-350 font-bold flex-1 leading-normal text-left">
            {toast.message}
          </p>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 text-xs font-black cursor-pointer border-none bg-transparent"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AuthGuard>
  );
}
