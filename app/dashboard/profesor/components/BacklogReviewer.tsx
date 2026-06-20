"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, CheckCircle2, AlertCircle } from "lucide-react";
import { ProyectoDetalle, BacklogItem, BacklogEpica } from "../types";
import { BacklogReviewCards } from "./BacklogReviewCards";

interface BacklogReviewerProps {
  detalle: ProyectoDetalle;
  revisandoBacklogItem: BacklogItem | null;
  setRevisandoBacklogItem: (item: BacklogItem | null) => void;
  comentarioBacklog: string;
  setComentarioBacklog: (comment: string) => void;
  estadoBacklog: "aprobado" | "observado";
  setEstadoBacklog: (status: "aprobado" | "observado") => void;
  handleGuardarAuditBacklog: () => Promise<void>;
}

export function BacklogReviewer({
  detalle,
  revisandoBacklogItem,
  setRevisandoBacklogItem,
  comentarioBacklog,
  setComentarioBacklog,
  estadoBacklog,
  setEstadoBacklog,
  handleGuardarAuditBacklog,
}: BacklogReviewerProps) {
  
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
        nivelStyle: "text-purple-750 bg-purple-50 border-purple-100",
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

  const getSprintNum = (sprintVal?: number | null, semanaVal?: number | null) => {
    if (sprintVal === 1 || sprintVal === 2) return sprintVal;
    if (sprintVal) {
      return sprintVal <= 4 ? 1 : 2;
    }
    if (semanaVal) {
      return semanaVal <= 8 ? 1 : 2;
    }
    return 1;
  };

  const epicas = detalle.backlog_scrum?.epicas ?? [];
  const backlogSimple = detalle.propuesta?.backlog ?? [];

  // Group backlog items by sprint
  const allItems: BacklogItem[] = [];
  epicas.forEach((epica) => {
    if (epica.items) {
      epica.items.forEach((item) => {
        allItems.push({ ...item, epicaId: epica.id });
      });
    }
  });

  const sprint1Items = allItems.filter((item) => getSprintNum(item.sprint, item.semana_sugerida) === 1);
  const sprint2Items = allItems.filter((item) => getSprintNum(item.sprint, item.semana_sugerida) === 2);
  const otherItems = allItems.filter(
    (item) => getSprintNum(item.sprint, item.semana_sugerida) !== 1 && getSprintNum(item.sprint, item.semana_sugerida) !== 2
  );

  return (
    <div className="space-y-6">
      {/* Backlog Simple Fallback */}
      {backlogSimple.length > 0 && epicas.length === 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Backlog General (Historias de Usuario)
          </h3>
          <div className="space-y-2">
            {backlogSimple.map((story, i) => {
              const lower = story.prioridad.toLowerCase();
              const pCls =
                lower === "alta"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : lower === "media"
                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                  : "bg-blue-50 text-blue-700 border border-blue-100";

              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 text-xs">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${pCls}`}>
                    {story.prioridad}
                  </span>
                  <span className="text-slate-700 font-semibold flex-1">
                    {story.titulo}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Backlog Scrum Completo */}
      {epicas.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" /> Backlog Scrum del Alumno
            </h3>
            <span className="text-xs text-slate-400 font-bold bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-xl">
              {allItems.length} Historias de Usuario
            </span>
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto border border-slate-150 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] uppercase font-black tracking-wider text-slate-400">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Narrativa (User Story)</th>
                  <th className="px-4 py-3">Criterios de Aceptación</th>
                  <th className="px-4 py-3 text-center">Estimación</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Dependencia</th>
                  <th className="px-4 py-3">Épica</th>
                  <th className="px-4 py-3 text-center">Auditoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                {(() => {
                  const renderGroupRows = (sprintNum: number, itemsSubset: BacklogItem[]) => {
                    const meta = getSprintMetadata(sprintNum);
                    const separatorRow = (
                      <tr key={`header-sprint-${sprintNum}`} className="border-b border-slate-200 bg-indigo-50/20 font-bold">
                        <td colSpan={10} className="px-4 py-2.5 text-indigo-700 text-xs">
                          <div className="flex justify-between items-center">
                            <span>{meta.nombre}: {meta.objetivo} ({meta.rangoSemanas})</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${meta.nivelStyle}`}>
                              {meta.nivel}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );

                    if (itemsSubset.length === 0) {
                      return [
                        separatorRow,
                        <tr key={`empty-sprint-${sprintNum}`} className="border-b border-slate-100">
                          <td colSpan={10} className="px-4 py-3 text-slate-400 text-xs italic">
                            No hay ítems asignados a este Sprint.
                          </td>
                        </tr>
                      ];
                    }

                    return [
                      separatorRow,
                      ...itemsSubset.map((item) => {
                        return (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-400">{item.id}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded bg-slate-100 text-[9px] font-black text-slate-655 border border-slate-200">
                                {item.tipo || "HU"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-750">{item.titulo}</td>
                            <td className="px-4 py-3 text-slate-500 leading-relaxed max-w-xs">
                              {`Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`}
                            </td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs">
                              <ul className="list-disc list-inside space-y-1">
                                {item.criterios?.map((c, idx) => (
                                  <li key={idx} className="line-clamp-2">{c.descripcion}</li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-600">{item.puntos || 0} SP</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full font-black text-[9px] ${
                                item.prioridad === 'Critica' ? 'bg-red-50 text-red-700 border border-red-100' :
                                item.prioridad === 'Alta' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                item.prioridad === 'Media' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                'bg-slate-50 text-slate-500 border border-slate-200'
                              }`}>
                                {item.prioridad || "Media"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">
                              {item.depende_de || "--"}
                            </td>
                            <td className="px-4 py-3 font-mono text-indigo-650">
                              {item.epicaId}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1.5">
                                {item.estado_revision === "aprobado" ? (
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    Aprobado
                                  </span>
                                ) : item.estado_revision === "observado" ? (
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                                    Observado
                                  </span>
                                ) : item.estado_revision === "corregido" ? (
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    Corregido
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200">
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
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                                >
                                  Auditar
                                </button>
                              </div>
                              {item.estado_revision === "observado" && item.comentario_revision && (
                                <p className="text-[9px] text-red-655 italic mt-1 max-w-[150px] truncate" title={item.comentario_revision}>
                                  Obs: {item.comentario_revision}
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ];
                  };

                  return (
                    <>
                      {renderGroupRows(1, sprint1Items)}
                      {renderGroupRows(2, sprint2Items)}
                      {otherItems.length > 0 && renderGroupRows(99, otherItems)}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden">
            <BacklogReviewCards
              detalle={detalle}
              revisandoBacklogItem={revisandoBacklogItem}
              setRevisandoBacklogItem={setRevisandoBacklogItem}
              comentarioBacklog={comentarioBacklog}
              setComentarioBacklog={setComentarioBacklog}
              estadoBacklog={estadoBacklog}
              setEstadoBacklog={setEstadoBacklog}
              handleGuardarAuditBacklog={handleGuardarAuditBacklog}
            />
          </div>
        </section>
      )}

      {/* Modal de Auditoría de Historias de Usuario */}
      <AnimatePresence>
        {revisandoBacklogItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Auditar Historia: {revisandoBacklogItem.id}
              </h3>
              <p className="text-xs text-slate-500 mb-4 truncate font-medium">
                {revisandoBacklogItem.titulo}
              </p>
              
              <div className="space-y-4">
                {/* Selector de estado */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Dictamen de Auditoría
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEstadoBacklog("aprobado")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        estadoBacklog === "aprobado"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstadoBacklog("observado")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        estadoBacklog === "observado"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                    >
                      Observar
                    </button>
                  </div>
                </div>

                {/* Campo de comentario */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Observaciones / Comentarios
                  </label>
                  <textarea
                    value={comentarioBacklog}
                    onChange={(e) => setComentarioBacklog(e.target.value)}
                    placeholder="Detalla qué cambios o correcciones requiere el alumno..."
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                {/* Acciones */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRevisandoBacklogItem(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGuardarAuditBacklog}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-150 cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
