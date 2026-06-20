"use client";
import { CheckCircle2, AlertCircle, Activity, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Hito } from "../types";

interface HitosApproverProps {
  hitos: Hito[];
  hitoStates: Record<number, { open: boolean; feedback: string; loading: boolean }>;
  editingTareasEstado: Record<number, string[]>;
  editingTareasComentarios: Record<number, string[]>;
  setHitoField: (idx: number, field: "open" | "feedback" | "loading", value: boolean | string) => void;
  setEditingTareasEstado: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
  setEditingTareasComentarios: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
  handleToggleTaskStatus: (hitoIdx: number, taskIdx: number, status: "ok" | "observado") => void;
  handleTaskCommentChange: (hitoIdx: number, taskIdx: number, comment: string) => void;
  handleGuardarRevisionHito: (idx: number) => Promise<void>;
}

export function HitosApprover({
  hitos,
  hitoStates,
  editingTareasEstado,
  editingTareasComentarios,
  setHitoField,
  setEditingTareasEstado,
  setEditingTareasComentarios,
  handleToggleTaskStatus,
  handleTaskCommentChange,
  handleGuardarRevisionHito,
}: HitosApproverProps) {
  
  const getSprintMetadata = (sprintNum: number) => {
    if (sprintNum === 1) {
      return {
        nombre: "Sprint 1",
        rangoSemanas: "Semanas 1-8",
        nivel: "Nivel Básico / Intermedio",
        nivelStyle: "text-indigo-700 bg-indigo-50 border-indigo-100",
        objetivo: "MVP funcional y desarrollo inicial"
      };
    } else if (sprintNum === 2) {
      return {
        nombre: "Sprint 2",
        rangoSemanas: "Semanas 9-16",
        nivel: "Nivel Avanzado",
        nivelStyle: "text-purple-700 bg-purple-50 border-purple-100",
        objetivo: "Integración, desarrollo avanzado y cierre"
      };
    }
    return {
      nombre: "Otros / Backlog General",
      rangoSemanas: "",
      nivel: "Sin asignar",
      nivelStyle: "text-slate-500 bg-slate-50 border-slate-200",
      objetivo: "Tareas pendientes de priorización"
    };
  };

  const getSprintNum = (semanaVal?: number | null) => {
    if (semanaVal) {
      return semanaVal <= 8 ? 1 : 2;
    }
    return 1;
  };

  const renderHitosGroup = (sprintNum: number, hitosSubset: Array<{ hito: Hito; originalIdx: number }>) => {
    const meta = getSprintMetadata(sprintNum);
    return (
      <div key={sprintNum} className="space-y-4 pt-4 first:pt-0">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{meta.nombre}</span>
            <span className="text-xs text-slate-400 font-semibold">({meta.rangoSemanas})</span>
            <span className="text-xs text-slate-500 italic">— {meta.objetivo}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${meta.nivelStyle}`}>
            {meta.nivel}
          </span>
        </div>
        {hitosSubset.length === 0 ? (
          <p className="text-slate-400 text-xs italic py-2 pl-2">No hay hitos programados en este Sprint.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hitosSubset.map(({ hito, originalIdx }) => {
              const hitoState = hitoStates[originalIdx] ?? {
                open: false,
                feedback: "",
                loading: false,
              };
              return (
                <div
                  key={originalIdx}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Semana {hito.semana}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm">{hito.nombre}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {hito.estado_hito === "validado" ? (
                        <span className="flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3" /> Validado
                        </span>
                      ) : hito.estado_hito === "observado" ? (
                        <span className="flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                          <AlertCircle className="w-3 h-3" /> Observado
                        </span>
                      ) : hito.estado_hito === "corregido" ? (
                        <span className="flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-750 border border-indigo-100">
                          <Activity className="w-3 h-3" /> Corregido
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                          Pendiente
                        </span>
                      )}

                      <button
                        onClick={() => {
                          if (!editingTareasEstado[originalIdx]) {
                            const initialEstado = hito.tareas_estado || Array.from({ length: hito.tareas.length }, () => "ok");
                            const initialComentarios = hito.tareas_comentarios || Array.from({ length: hito.tareas.length }, () => "");
                            setEditingTareasEstado((prev) => ({ ...prev, [originalIdx]: initialEstado }));
                            setEditingTareasComentarios((prev) => ({ ...prev, [originalIdx]: initialComentarios }));
                          }
                          setHitoField(originalIdx, "open", !hitoState.open);
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 border border-slate-200 hover:border-indigo-650 text-slate-600 hover:text-white transition-all cursor-pointer"
                      >
                        {hitoState.open ? "Cerrar" : "Auditar Hito"}
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {hito.descripcion}
                  </p>

                  {/* Lista de tareas auditadas */}
                  <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    {hito.tareas.map((tarea, j) => {
                      const tState = (hito.tareas_estado || [])[j] || "ok";
                      const tComment = (hito.tareas_comentarios || [])[j] || "";
                      return (
                        <div key={j} className="text-xs space-y-1">
                          <div className="flex gap-2 items-start">
                            {tState === "ok" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            ) : tState === "corregido" ? (
                              <Activity className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5 animate-pulse" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={`${tState === "observado" ? "text-slate-700 font-bold" : "text-slate-655"}`}>
                              {tarea}
                            </span>
                            {tState === "corregido" && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap ml-auto">
                                Corregido
                              </span>
                            )}
                          </div>
                          {tState === "observado" && tComment && (
                            <div className="pl-5 text-[11px] text-red-600 italic">
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
                        className="space-y-4 overflow-hidden pt-3 border-t border-slate-150"
                      >
                        <h5 className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest">
                          Auditoría de tareas del hito
                        </h5>
                        <div className="space-y-3">
                          {hito.tareas.map((tarea, tIdx) => {
                            const taskStatus = (editingTareasEstado[originalIdx] || [])[tIdx] || "ok";
                            const taskComment = (editingTareasComentarios[originalIdx] || [])[tIdx] || "";
                            return (
                              <div key={tIdx} className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex gap-2">
                                    <span className="text-xs font-bold text-slate-400 mt-0.5">{tIdx + 1}.</span>
                                    <p className="text-xs text-slate-700 font-semibold leading-relaxed">{tarea}</p>
                                  </div>
                                  <div className="flex gap-1.5 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTaskStatus(originalIdx, tIdx, "ok")}
                                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                                        taskStatus === "ok"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-white text-slate-400 hover:text-slate-655 border border-slate-200"
                                      }`}
                                    >
                                      Aprobado
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTaskStatus(originalIdx, tIdx, "observado")}
                                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                                        taskStatus === "observado"
                                          ? "bg-red-50 text-red-700 border border-red-200"
                                          : "bg-white text-slate-400 hover:text-slate-655 border border-slate-200"
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
                                    onChange={(e) => handleTaskCommentChange(originalIdx, tIdx, e.target.value)}
                                    placeholder="Detalla qué está mal en esta tarea específica..."
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-750 focus:outline-none focus:ring-2 focus:ring-red-500/20 placeholder:text-slate-400"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => handleGuardarRevisionHito(originalIdx)}
                          disabled={hitoState.loading}
                          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-indigo-100 cursor-pointer"
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
          </div>
        )}
      </div>
    );
  };

  const mappedHitos = hitos.map((hito, idx) => ({ hito, originalIdx: idx }));
  const sprint1Hitos = mappedHitos.filter(item => getSprintNum(item.hito.semana) === 1);
  const sprint2Hitos = mappedHitos.filter(item => getSprintNum(item.hito.semana) === 2);

  return (
    <div className="space-y-6">
      {renderHitosGroup(1, sprint1Hitos)}
      {renderHitosGroup(2, sprint2Hitos)}
    </div>
  );
}
