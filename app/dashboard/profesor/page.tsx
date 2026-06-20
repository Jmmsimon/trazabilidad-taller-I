"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
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
} from "lucide-react";
import { useProfesor } from "./hooks/useProfesor";
import { ProjectSelector } from "./components/ProjectSelector";
import { ProfesorMetrics } from "./components/ProfesorMetrics";
import { HitosApprover } from "./components/HitosApprover";
import { BacklogReviewer } from "./components/BacklogReviewer";
import { GitCommitsTracker } from "./components/GitCommitsTracker";

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
    loadingAprobar,
    loadingRechazar,
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
    setHitoField,
    handleToggleTaskStatus,
    handleTaskCommentChange,
    handleGuardarRevisionHito,
    handleGuardarAuditBacklog,
    getCommitChartData,
  } = useProfesor();

  const [activeTab, setActiveTab] = useState<"hitos" | "backlog" | "commits">("hitos");

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
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Columna Izquierda (Tabs del Proyecto) */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {activeTab === "hitos" && (
                        <div className="space-y-6">
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
                    </div>

                    {/* Columna Derecha (Sidebar de Métricas) */}
                    <div className="space-y-6">
                      <ProfesorMetrics
                        detalle={detalle}
                        isAnalyzing={isAnalyzing}
                        handleReAnalizar={handleReAnalizar}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AuthGuard>
  );
}
