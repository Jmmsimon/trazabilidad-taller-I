import React from "react";
import { BarChart3, CheckCircle2, AlertCircle, Activity } from "lucide-react";
import { ProyectoDetalle, BacklogItem } from "../types";

interface BacklogReviewCardsProps {
  detalle: ProyectoDetalle;
  revisandoBacklogItem: BacklogItem | null;
  setRevisandoBacklogItem: (item: BacklogItem | null) => void;
  comentarioBacklog: string;
  setComentarioBacklog: (comment: string) => void;
  estadoBacklog: "aprobado" | "observado";
  setEstadoBacklog: (status: "aprobado" | "observado") => void;
  handleGuardarAuditBacklog: () => Promise<void>;
}

export function BacklogReviewCards({
  detalle,
  revisandoBacklogItem,
  setRevisandoBacklogItem,
  comentarioBacklog,
  setComentarioBacklog,
  estadoBacklog,
  setEstadoBacklog,
  handleGuardarAuditBacklog,
}: BacklogReviewCardsProps) {
  
  const getSprintMetadata = (sprintNum: number) => {
    if (sprintNum === 1) {
      return {
        nombre: "Sprint 1",
        rangoSemanas: "Semanas 1-8",
        nivel: "Nivel Básico / Intermedio",
        nivelStyle: "text-indigo-750 bg-indigo-50 border-indigo-100",
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
    if (sprintVal) return sprintVal <= 4 ? 1 : 2;
    if (semanaVal) return semanaVal <= 8 ? 1 : 2;
    return 1;
  };

  const epicas = detalle.backlog_scrum?.epicas ?? [];
  
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

  const renderGroupCards = (sprintNum: number, itemsSubset: BacklogItem[]) => {
    const meta = getSprintMetadata(sprintNum);
    return (
      <div key={`review-sprint-cards-${sprintNum}`} className="space-y-4 pt-2">
        {/* Sprint Header */}
        <div className="border-b border-slate-200 pb-2 bg-slate-50 p-3 rounded-xl">
          <div className="flex flex-col gap-1">
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
              const isObs = item.estado_revision === "observado";
              const isCor = item.estado_revision === "corregido";
              const isApr = item.estado_revision === "aprobado";

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
                      <span className="px-2 py-0.5 rounded bg-slate-105 text-[10px] font-bold text-slate-500 border border-slate-200/60">
                        {item.tipo || "HU"}
                      </span>
                      <span className="font-mono text-xs text-slate-400 font-bold">{item.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          item.prioridad === 'Critica' ? 'bg-red-105 bg-red-100 text-red-750 border border-red-200' :
                          item.prioridad === 'Alta' ? 'bg-orange-100 text-orange-755 border border-orange-200' :
                          item.prioridad === 'Media' ? 'bg-blue-100 text-blue-750 border border-blue-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.prioridad || "Media"}
                      </span>
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        {item.puntos || 0} SP
                      </span>
                    </div>
                  </div>

                  {/* Card Title */}
                  <div className="space-y-1">
                    <h4 className="text-slate-800 text-xs font-bold leading-snug">{item.titulo}</h4>
                  </div>

                  {/* User Story */}
                  <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Narrativa (User Story)</label>
                    <p className="text-slate-655 text-xs leading-relaxed font-semibold">
                      {`Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`}
                    </p>
                  </div>

                  {/* Acceptance Criteria */}
                  {item.criterios && item.criterios.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Criterios de Aceptación</label>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-100">
                        {item.criterios.map((c, idx) => (
                          <li key={idx} className="leading-relaxed">{c.descripcion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Dependency & Epica */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-2.5 flex-wrap gap-2">
                    <div>
                      <span>Depende de: </span>
                      <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {item.depende_de || "--"}
                      </span>
                    </div>
                    <div>
                      <span>Épica: </span>
                      <span className="font-mono text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {item.epicaId}
                      </span>
                    </div>
                  </div>

                  {/* Action / Review Status Panel */}
                  <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center gap-3 flex-wrap">
                    <div className="min-w-0">
                      {isApr ? (
                        <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprobado
                        </span>
                      ) : isObs ? (
                        <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-650" /> Observado
                        </span>
                      ) : isCor ? (
                        <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-755 border border-indigo-200 flex items-center gap-1 animate-pulse shadow-sm">
                          <Activity className="w-3.5 h-3.5 text-indigo-600" /> Corregido
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          Pendiente
                        </span>
                      )}
                      
                      {isObs && item.comentario_revision && (
                        <p className="text-[10px] text-red-650 italic mt-1.5 font-semibold leading-snug">
                          Obs: {item.comentario_revision}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRevisandoBacklogItem(item);
                        setEstadoBacklog((item.estado_revision === "aprobado" || item.estado_revision === "observado") ? item.estado_revision : "aprobado");
                        setComentarioBacklog(item.comentario_revision || "");
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-750 border border-indigo-650 text-white transition-all cursor-pointer shadow-md shadow-indigo-100 ml-auto"
                    >
                      Auditar Item
                    </button>
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
    <div className="space-y-6">
      {renderGroupCards(1, sprint1Items)}
      {renderGroupCards(2, sprint2Items)}
      {otherItems.length > 0 && renderGroupCards(99, otherItems)}
    </div>
  );
}
