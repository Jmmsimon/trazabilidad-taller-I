import React from "react";
import { CheckCircle2, AlertCircle, Activity, Plus, MessageSquare } from "lucide-react";
import { ProjectPlan } from "../types";
import { getSprintMetadata, getSprintNum } from "../utils";

interface HitosGroupProps {
  sprintNum: number;
  hitosSubset: Array<{ hito: any; originalIdx: number }>;
  isPhaseD: boolean;
  isEditingDraft: boolean;
  editedPlan: ProjectPlan | null;
  plan: ProjectPlan | null;
  setEditedPlan: React.Dispatch<React.SetStateAction<ProjectPlan | null>>;
  editingTasks: Record<string, string>;
  setEditingTasks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleEnviarCorreccionHito: (idx: number) => Promise<void>;
}

export function HitosGroup({
  sprintNum,
  hitosSubset,
  isPhaseD,
  isEditingDraft,
  editedPlan,
  plan,
  setEditedPlan,
  editingTasks,
  setEditingTasks,
  handleEnviarCorreccionHito,
}: HitosGroupProps) {
  const meta = getSprintMetadata(sprintNum);
  const planToUse = isEditingDraft && editedPlan ? editedPlan : plan;
  if (!planToUse) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-150 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">{meta.nombre}</span>
          <span className="text-xs text-slate-400 font-medium">({meta.rangoSemanas})</span>
          <span className="text-xs text-slate-500 italic">— {meta.objetivo}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${meta.nivelStyle}`}>
          {meta.nivel}
        </span>
      </div>
      {hitosSubset.length === 0 ? (
        <p className="text-slate-400 text-xs italic py-2 pl-2">No hay hitos programados en este Sprint.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hitosSubset.map(({ hito, originalIdx }) => {
            const i = originalIdx;

            const isObservado = hito.estado_hito === "observado";
            const isCorregido = hito.estado_hito === "corregido";
            const isValidado = hito.estado_hito === "validado";
            return (
              <div
                key={originalIdx}
                className={`rounded-2xl p-5 space-y-3 border transition-all duration-300 shadow-sm ${
                  isObservado
                    ? "bg-red-50/50 border-red-200 shadow-red-50"
                    : isCorregido
                    ? "bg-indigo-50/50 border-indigo-200 shadow-indigo-50"
                    : isValidado
                    ? "bg-emerald-50/50 border-emerald-200 shadow-emerald-50"
                    : "bg-white border-slate-200/80 hover:border-slate-350 hover:shadow-md"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Semana {hito.semana}</span>
                    {isEditingDraft ? (
                      <input
                        type="text"
                        value={editedPlan?.hitos[i]?.nombre || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedPlan((prev) => {
                            if (!prev) return prev;
                            const updated = { ...prev };
                            updated.hitos[i].nombre = val;
                            return updated;
                          });
                        }}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : (
                      <h4 className="font-bold text-sm text-slate-800 mt-0.5">{hito.nombre}</h4>
                    )}
                  </div>
                  {isPhaseD && (
                    <div className="flex items-center sm:justify-end flex-shrink-0">
                      {isValidado ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Validado
                        </span>
                      ) : isObservado ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 animate-pulse shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Observado
                        </span>
                      ) : isCorregido ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-850 border border-indigo-200 flex items-center gap-1 animate-pulse shadow-sm">
                          <Activity className="w-3.5 h-3.5 text-indigo-650" /> Re-evaluación
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <div>
                  {isEditingDraft ? (
                    <textarea
                      value={editedPlan?.hitos[i]?.descripcion || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditedPlan((prev) => {
                          if (!prev) return prev;
                          const updated = { ...prev };
                          updated.hitos[i].descripcion = val;
                          return updated;
                        });
                      }}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-500 mb-2">{hito.descripcion}</p>
                  )}
                </div>

                <ul className="space-y-2 text-xs">
                  {hito.tareas.map((t: string, j: number) => {
                    const tState = isPhaseD ? (hito.tareas_estado || [])[j] || "ok" : "ok";
                    const tComment = isPhaseD ? (hito.tareas_comentarios || [])[j] || "" : "";
                    const taskKey = `${i}-${j}`;
                    const editedText = editingTasks[taskKey] ?? t;

                    return (
                      <li key={j} className="space-y-1.5">
                        <div className="flex gap-2 items-start">
                          {isPhaseD ? (
                            tState === "ok" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            ) : tState === "corregido" ? (
                              <Activity className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
                            )
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                          )}

                          {isEditingDraft ? (
                            <input
                              type="text"
                              value={editedPlan?.hitos[i]?.tareas[j] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditedPlan((prev) => {
                                  if (!prev) return prev;
                                  const updated = { ...prev };
                                  updated.hitos[i].tareas[j] = val;
                                  return updated;
                                });
                              }}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : isPhaseD && (tState === "observado" || tState === "corregido") ? (
                            <input
                              type="text"
                              value={editedText}
                              onChange={(e) =>
                                setEditingTasks((prev) => ({ ...prev, [taskKey]: e.target.value }))
                              }
                              className="flex-1 bg-white border border-indigo-350 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none transition-colors"
                            />
                          ) : (
                            <span className={tState === "corregido" ? "text-slate-700 font-medium" : "text-slate-600"}>
                              {t}
                            </span>
                          )}
                        </div>
                        {isPhaseD && tState === "observado" && tComment && (
                          <div className="ml-6 flex gap-2 bg-red-50 border border-red-100 rounded-lg p-2.5">
                            <MessageSquare className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-700 italic leading-snug">{tComment}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {isPhaseD && (
                  <>
                    {isObservado && (
                      <button
                        onClick={() => handleEnviarCorreccionHito(i)}
                        className="w-full mt-2 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-750 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como Corregido
                      </button>
                    )}
                    {isCorregido && (
                      <div className="flex gap-2 rounded-xl bg-indigo-50 border border-indigo-100 p-2.5 text-xs text-indigo-800">
                        <Activity className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-600 animate-pulse" />
                        Corrección enviada — esperando re-evaluación
                      </div>
                    )}
                    {!isObservado && !isCorregido && !isValidado && (
                      <button className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200/70 py-2 rounded-xl text-xs font-bold text-slate-700 flex justify-center gap-2 transition-colors cursor-pointer shadow-sm">
                        <Plus className="w-3.5 h-3.5 mt-0.5" /> Subir Evidencia
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
