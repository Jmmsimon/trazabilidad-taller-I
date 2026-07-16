"use client";
import { GitCommit, BarChart3, CheckCircle2, AlertCircle } from "lucide-react";
import { ProyectoDetalle } from "../types";

interface GitCommitsTrackerProps {
  detalle: ProyectoDetalle;
  getCommitChartData: () => { days: string[]; counts: number[] };
}

export function GitCommitsTracker({ detalle, getCommitChartData }: GitCommitsTrackerProps) {
  const commits = detalle.tracking?.estado_repo?.commits || [];

  const chartData = getCommitChartData();
  const maxCount = Math.max(...chartData.counts, 1);

  return (
    <div className="space-y-6">
      {/* Gráfico de Actividad de Commits */}
      {detalle.tracking?.estado_repo && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Actividad de Commits (Últimos 7 días)
          </h3>
          <div className="flex items-end justify-between h-28 pt-4 px-4 bg-slate-50 border border-slate-150 rounded-2xl">
            {chartData.days.map((day, idx) => {
              const count = chartData.counts[idx];
              const percent = (count / maxCount) * 80;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group/bar relative h-full justify-end pb-2">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-20">
                    {count} commit{count !== 1 ? "s" : ""}
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${percent || 4}%` }}
                    className={`w-1/3 rounded-t transition-all duration-500 ${
                      count > 0
                        ? "bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                        : "bg-slate-200"
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 font-bold mt-2">
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Historial de Commits */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-indigo-500" /> Historial de Commits ({commits.length})
        </h3>
        {commits.length === 0 ? (
          <p className="text-slate-450 text-xs py-2 italic text-center">No se han registrado commits para este proyecto.</p>
        ) : (
          <div className="relative pl-6 border-l border-slate-200 space-y-6">
            {commits.map((commit, cIdx) => (
              <div key={commit.sha || cIdx} className="relative group/commit">
                {/* Dot/Icon */}
                <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 ${
                  commit.alineado !== false ? "border-indigo-500" : "border-red-500 animate-pulse"
                } flex items-center justify-center`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    commit.alineado !== false ? "bg-indigo-500" : "bg-red-500"
                  }`} />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {commit.sha.substring(0, 7)}
                    </span>
                    <span className="font-bold text-slate-655">
                      {commit.author}
                    </span>
                    <span>
                      {commit.fecha}
                    </span>
                    {commit.url && (
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-650 hover:underline font-bold ml-auto flex items-center gap-0.5"
                      >
                        Ver en GitHub →
                      </a>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-slate-700 leading-snug break-words font-semibold">
                      {commit.mensaje}
                    </p>
                    
                    {/* Semantic Alignment Tag */}
                    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl border text-[11px] ${
                      commit.alineado !== false
                        ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                        : "bg-red-50 border-red-100 text-red-800"
                    }`}>
                      <span className={`font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                        commit.alineado !== false ? "text-emerald-700" : "text-red-700 animate-pulse"
                      }`}>
                        {commit.alineado !== false ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        {commit.alineado !== false ? "Alineado con Hito" : "Alerta de Desvío"}
                      </span>
                      {commit.contribucion && (
                        <>
                          <span className="hidden sm:inline text-slate-300">•</span>
                          <span className="font-semibold italic opacity-95">
                            {commit.contribucion}
                          </span>
                        </>
                      )}
                      {(commit.hito_ref || (commit.item_ids && commit.item_ids.length > 0)) && (
                        <span className="text-[10px] font-bold text-slate-600 w-full">
                          {commit.hito_ref ? `Hito: ${commit.hito_ref}` : ""}
                          {commit.item_ids && commit.item_ids.length > 0
                            ? ` · Ítems: ${commit.item_ids.join(", ")}`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
