import React from "react";
import { CheckCircle2, Activity, MessageSquare, AlertCircle } from "lucide-react";
import { ProjectPlan } from "../types";
import { getSprintMetadata, getSprintNum } from "../utils";

interface BacklogTableProps {
  isPhaseD: boolean;
  isEditingDraft: boolean;
  editedPlan: ProjectPlan | null;
  plan: ProjectPlan | null;
  updateBacklogItemField: (itemId: string, field: string, value: any) => void;
  editingTasks: Record<string, string>;
  setEditingTasks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleCorregirBacklogItem: (itemId: string) => Promise<void>;
}

export function BacklogTable({
  isPhaseD,
  isEditingDraft,
  editedPlan,
  plan,
  updateBacklogItemField,
  editingTasks,
  setEditingTasks,
  handleCorregirBacklogItem,
}: BacklogTableProps) {
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

  const renderGroupRows = (sprintNum: number, itemsSubset: typeof allItems) => {
    const meta = getSprintMetadata(sprintNum);
    const separatorRow = (
      <tr key={`header-sprint-${sprintNum}`} className="border-b border-slate-200 bg-slate-50 font-bold text-slate-800">
        <td colSpan={isPhaseD ? 8 : 9} className="px-4 py-3 text-xs">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="font-semibold text-slate-700">
              {meta.nombre}: {meta.objetivo} ({meta.rangoSemanas})
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border ${meta.nivelStyle}`}>
              {meta.nivel}
            </span>
          </div>
        </td>
      </tr>
    );

    if (itemsSubset.length === 0) {
      return [
        separatorRow,
        <tr key={`empty-sprint-${sprintNum}`} className="border-b border-slate-150">
          <td colSpan={isPhaseD ? 8 : 9} className="px-4 py-3 text-slate-400 text-xs italic">
            No hay ítems asignados a este Sprint.
          </td>
        </tr>,
      ];
    }

    return [
      separatorRow,
      ...itemsSubset.map((item) => {
        const isObs = isPhaseD && item.estado_revision === "observado";
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
          <tr
            key={item.id}
            className={`border-b border-slate-200 hover:bg-slate-50/70 transition-colors ${
              isObs
                ? "bg-red-50/40 hover:bg-red-50/80"
                : isCor
                ? "bg-indigo-50/30 hover:bg-indigo-50/60"
                : isApr
                ? "bg-emerald-50/20 hover:bg-emerald-50/50"
                : ""
            }`}
          >
            <td className="px-4 py-3 font-mono text-xs text-slate-400">{item.id}</td>
            <td className="px-4 py-3">
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
                <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200/60">
                  {item.tipo || "HU"}
                </span>
              )}
            </td>

            <td className="px-4 py-3 font-medium">
              {isEditingDraft ? (
                <input
                  type="text"
                  value={itemToEdit?.titulo || ""}
                  onChange={(e) => updateBacklogItemField(item.id, "titulo", e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                />
              ) : isObs ? (
                <input
                  type="text"
                  value={editedTitulo}
                  onChange={(e) => setEditingTasks((prev) => ({ ...prev, [tituloKey]: e.target.value }))}
                  className="w-full bg-white border border-red-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                />
              ) : (
                <span className="text-slate-800 text-xs font-semibold">{item.titulo}</span>
              )}
            </td>

            <td className="px-4 py-3 text-xs">
              {isEditingDraft ? (
                <div className="space-y-1.5 py-1">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase min-w-[45px]">Como:</span>
                    <input
                      type="text"
                      value={itemToEdit?.como || ""}
                      onChange={(e) => updateBacklogItemField(item.id, "como", e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase min-w-[45px]">Quiero:</span>
                    <input
                      type="text"
                      value={itemToEdit?.quiero || ""}
                      onChange={(e) => updateBacklogItemField(item.id, "quiero", e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase min-w-[45px]">Para:</span>
                    <input
                      type="text"
                      value={itemToEdit?.para || ""}
                      onChange={(e) => updateBacklogItemField(item.id, "para", e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
              ) : isObs ? (
                <textarea
                  value={editedHu}
                  onChange={(e) => setEditingTasks((prev) => ({ ...prev, [huKey]: e.target.value }))}
                  rows={2}
                  className="w-full bg-white border border-red-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 resize-none"
                />
              ) : (
                <span className="text-slate-650 leading-relaxed font-normal">
                  {`Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`}
                </span>
              )}
            </td>

            <td className="px-4 py-3 text-xs text-slate-500">
              <ul className="list-disc list-inside space-y-0.5">
                {item.criterios?.map((c: { descripcion: string }, cidx: number) => (
                  <li key={cidx} className="line-clamp-2">
                    {c.descripcion}
                  </li>
                ))}
              </ul>
            </td>

            <td className="px-4 py-3 text-center">
              {isEditingDraft ? (
                <select
                  value={itemToEdit?.puntos || 1}
                  onChange={(e) => updateBacklogItemField(item.id, "puntos", parseInt(e.target.value))}
                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-700 focus:outline-none"
                >
                  {[1, 2, 3, 5, 8, 13].map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-mono text-xs text-slate-600 font-semibold">{item.puntos || 0} SP</span>
              )}
            </td>

            <td className="px-4 py-3 text-xs">
              {isEditingDraft ? (
                <select
                  value={itemToEdit?.prioridad || "Media"}
                  onChange={(e) => updateBacklogItemField(item.id, "prioridad", e.target.value)}
                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-600 focus:outline-none"
                >
                  {["Critica", "Alta", "Media", "Baja"].map((prio) => (
                    <option key={prio} value={prio}>
                      {prio}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    item.prioridad === "Critica"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : item.prioridad === "Alta"
                      ? "bg-orange-100 text-orange-700 border border-orange-200"
                      : item.prioridad === "Media"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {item.prioridad}
                </span>
              )}
            </td>

            {!isPhaseD && (
              <td className="px-4 py-3 text-center text-xs">
                {isEditingDraft ? (
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
                ) : (
                  <span className="text-slate-500 font-bold font-mono">Sprint {item.sprint || 1}</span>
                )}
              </td>
            )}

            <td className="px-4 py-3 text-center">
              {isPhaseD ? (
                isApr ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 flex items-center gap-1 justify-center shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprobado
                  </span>
                ) : isCor ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-105 bg-indigo-100 text-indigo-850 border border-indigo-200 flex items-center gap-1 justify-center animate-pulse shadow-sm">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" /> Re-eval.
                  </span>
                ) : isObs ? (
                  <div className="space-y-1.5 min-w-[120px]">
                    {item.comentario_revision && (
                      <div className="flex gap-1 bg-red-50 border border-red-100 rounded-lg p-1.5 text-left">
                        <MessageSquare className="w-3.5 h-3.5 text-red-650 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-700 italic leading-tight">{item.comentario_revision}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleCorregirBacklogItem(item.id)}
                      className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Marcar Corregido
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200/80">
                    Pendiente
                  </span>
                )
              ) : (
                <span className="font-mono text-xs text-indigo-600 font-semibold">{item.epicaId}</span>
              )}
            </td>
          </tr>
        );
      }),
    ];
  };

  return (
    <>
      {renderGroupRows(1, sprint1Items)}
      {renderGroupRows(2, sprint2Items)}
      {otherItems.length > 0 && renderGroupRows(99, otherItems)}
    </>
  );
}
