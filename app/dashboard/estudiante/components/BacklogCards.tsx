import React from "react";
import { CheckCircle2, Activity, MessageSquare, AlertCircle } from "lucide-react";
import { ProjectPlan } from "../types";
import { getSprintMetadata, getSprintNum } from "../utils";

interface BacklogCardsProps {
  isPhaseD: boolean;
  isEditingDraft: boolean;
  editedPlan: ProjectPlan | null;
  plan: ProjectPlan | null;
  updateBacklogItemField: (itemId: string, field: string, value: any) => void;
  editingTasks: Record<string, string>;
  setEditingTasks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleCorregirBacklogItem: (itemId: string) => Promise<void>;
}

export function BacklogCards({
  isPhaseD,
  isEditingDraft,
  editedPlan,
  plan,
  updateBacklogItemField,
  editingTasks,
  setEditingTasks,
  handleCorregirBacklogItem,
}: BacklogCardsProps) {
  const planToUse = isEditingDraft && editedPlan ? editedPlan : plan;
  if (!planToUse) return null;

  const epicas = planToUse.backlog_scrum?.epicas ?? [];
  const allItems = epicas.flatMap((e) => e.items ?? []);

  const sprint1Items = allItems.filter((it) => getSprintNum(it.sprint, it.semana_sugerida) === 1);
  const sprint2Items = allItems.filter((it) => getSprintNum(it.sprint, it.semana_sugerida) === 2);
  const otherItems = allItems.filter((it) => {
    const s = getSprintNum(it.sprint, it.semana_sugerida);
    return s !== 1 && s !== 2;
  });

  const renderGroupCards = (sprintNum: number, itemsSubset: typeof allItems) => {
    const meta = getSprintMetadata(sprintNum);
    return (
      <div key={`sprint-cards-${sprintNum}`} className="space-y-4">
        {/* Sprint Header */}
        <div className="border-b border-slate-200 pb-2 bg-slate-50 p-3 rounded-xl">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="font-bold text-slate-800 text-xs sm:text-sm">
                {meta.nombre}: {meta.objetivo}
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border font-bold ${meta.nivelStyle}`}>
                {meta.nivel}
              </span>
            </div>
            {meta.rangoSemanas && (
              <span className="text-[11px] text-slate-400 font-bold">{meta.rangoSemanas}</span>
            )}
          </div>
        </div>

        {itemsSubset.length === 0 ? (
          <div className="text-slate-400 text-xs italic py-4 text-center bg-white border border-slate-200/60 rounded-xl">
            No hay ítems asignados a este Sprint.
          </div>
        ) : (
          <div className="space-y-4">
            {itemsSubset.map((item) => {
              const isObs = isPhaseD && (item.estado_revision === "observado" || item.estado_revision === "corregido");
              const isCor = isPhaseD && item.estado_revision === "corregido";
              const isApr = isPhaseD && item.estado_revision === "aprobado";

              const tituloKey = `bl-titulo-${item.id}`;
              const huKey = `bl-hu-${item.id}`;
              const editedTitulo = editingTasks[tituloKey] ?? item.titulo;
              const editedHu =
                editingTasks[huKey] ?? `Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`;

              const itemToEdit =
                isEditingDraft && editedPlan
                  ? (editedPlan.backlog_scrum?.epicas || [])
                      .flatMap((e) => e.items ?? [])
                      .find((it) => it.id === item.id)
                  : null;

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-2xl p-4 space-y-3.5 transition-all shadow-sm ${
                    isObs
                      ? "border-red-200 bg-red-50/20"
                      : isCor
                      ? "border-indigo-200 bg-indigo-50/10"
                      : isApr
                      ? "border-emerald-250 bg-emerald-50/10"
                      : "border-slate-200/80 hover:border-slate-350"
                  }`}
                >
                  {/* Card Header: Type, ID, Priority */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {isEditingDraft ? (
                        <select
                          value={itemToEdit?.tipo || "HU"}
                          onChange={(e) => updateBacklogItemField(item.id, "tipo", e.target.value)}
                          className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {["HU", "SP", "EN", "TA", "RN", "DO"].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-105 text-[10px] font-bold text-slate-500 border border-slate-200/60">
                          {item.tipo || "HU"}
                        </span>
                      )}
                      <span className="font-mono text-xs text-slate-400 font-bold">{item.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Priority */}
                      {isEditingDraft ? (
                        <select
                          value={itemToEdit?.prioridad || "Media"}
                          onChange={(e) => updateBacklogItemField(item.id, "prioridad", e.target.value)}
                          className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-650 focus:outline-none"
                        >
                          {["Critica", "Alta", "Media", "Baja"].map((prio) => (
                            <option key={prio} value={prio}>
                              {prio}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                            item.prioridad === "Critica"
                              ? "bg-red-100 text-red-750 border border-red-200"
                              : item.prioridad === "Alta"
                              ? "bg-orange-100 text-orange-755 border border-orange-200"
                              : item.prioridad === "Media"
                              ? "bg-blue-100 text-blue-750 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {item.prioridad}
                        </span>
                      )}

                      {/* Story Points */}
                      {isEditingDraft ? (
                        <select
                          value={itemToEdit?.puntos || 1}
                          onChange={(e) => updateBacklogItemField(item.id, "puntos", parseInt(e.target.value))}
                          className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none"
                        >
                          {[1, 2, 3, 5, 8, 13].map((pt) => (
                            <option key={pt} value={pt}>
                              {pt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">
                          {item.puntos || 0} SP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Title */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Título</label>
                    {isEditingDraft ? (
                      <input
                        type="text"
                        value={itemToEdit?.titulo || ""}
                        onChange={(e) => updateBacklogItemField(item.id, "titulo", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold"
                      />
                    ) : isObs ? (
                      <input
                        type="text"
                        value={editedTitulo}
                        onChange={(e) => setEditingTasks((prev) => ({ ...prev, [tituloKey]: e.target.value }))}
                        className="w-full bg-white border border-red-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold"
                      />
                    ) : (
                      <h4 className="text-slate-800 text-xs font-bold leading-snug">{item.titulo}</h4>
                    )}
                  </div>

                  {/* Card Story Content */}
                  <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Descripción / HU</label>
                    {isEditingDraft ? (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase min-w-[45px]">Como:</span>
                          <input
                            type="text"
                            value={itemToEdit?.como || ""}
                            onChange={(e) => updateBacklogItemField(item.id, "como", e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-750 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase min-w-[45px]">Quiero:</span>
                          <input
                            type="text"
                            value={itemToEdit?.quiero || ""}
                            onChange={(e) => updateBacklogItemField(item.id, "quiero", e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-750 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase min-w-[45px]">Para:</span>
                          <input
                            type="text"
                            value={itemToEdit?.para || ""}
                            onChange={(e) => updateBacklogItemField(item.id, "para", e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-750 focus:outline-none"
                          />
                        </div>
                      </div>
                    ) : isObs ? (
                      <textarea
                        value={editedHu}
                        onChange={(e) => setEditingTasks((prev) => ({ ...prev, [huKey]: e.target.value }))}
                        rows={3}
                        className="w-full bg-white border border-red-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 resize-none font-semibold leading-relaxed"
                      />
                    ) : (
                      <p className="text-slate-650 text-xs leading-relaxed font-semibold">
                        {`Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`}
                      </p>
                    )}
                  </div>

                  {/* Acceptance Criteria */}
                  {item.criterios && item.criterios.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Criterios de Aceptación</label>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-100">
                        {item.criterios.map((c: { descripcion: string }, cidx: number) => (
                          <li key={cidx} className="leading-relaxed">
                            {c.descripcion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sprint Selection (if phase C and editing) */}
                  {!isPhaseD && isEditingDraft && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Sprint:</span>
                      <select
                        value={itemToEdit?.sprint || 1}
                        onChange={(e) => updateBacklogItemField(item.id, "sprint", parseInt(e.target.value))}
                        className="bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-600 focus:outline-none"
                      >
                        {[1, 2].map((sp) => (
                          <option key={sp} value={sp}>
                            Sprint {sp}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Action / Review Status Panel */}
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center gap-3">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      {!isPhaseD ? `Épica: ${item.epicaId || "-"}` : "Estado de Revisión"}
                    </div>

                    <div className="min-w-0">
                      {isPhaseD ? (
                        isApr ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprobado
                          </span>
                        ) : isCor ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-105 bg-indigo-100 text-indigo-850 border border-indigo-200 flex items-center gap-1 animate-pulse shadow-sm">
                            <Activity className="w-3.5 h-3.5 text-indigo-650" /> Re-eval.
                          </span>
                        ) : isObs ? (
                          <div className="space-y-2 w-full min-w-[200px]">
                            {item.comentario_revision && (
                              <div className="flex gap-2 bg-red-50 border border-red-100 rounded-xl p-2.5">
                                <MessageSquare className="w-4 h-4 text-red-650 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-red-750 italic leading-snug">{item.comentario_revision}</p>
                              </div>
                            )}
                            <button
                              onClick={() => handleCorregirBacklogItem(item.id)}
                              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como Corregido
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200/80">
                            Pendiente
                          </span>
                        )
                      ) : (
                        <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                          {item.epicaId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderGroupCards(1, sprint1Items)}
      {renderGroupCards(2, sprint2Items)}
      {otherItems.length > 0 && renderGroupCards(99, otherItems)}
    </div>
  );
}
