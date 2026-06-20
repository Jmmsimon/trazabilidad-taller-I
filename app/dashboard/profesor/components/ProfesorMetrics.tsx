"use client";
import { Shield, AlertCircle, CheckCircle2, GitCommit, Rocket } from "lucide-react";
import { ProyectoDetalle, SEVERIDAD_COLORS } from "../types";

interface ProfesorMetricsProps {
  detalle: ProyectoDetalle;
  isAnalyzing: boolean;
  handleReAnalizar: () => void;
}

export function ProfesorMetrics({ detalle, isAnalyzing, handleReAnalizar }: ProfesorMetricsProps) {
  const tracking = detalle.tracking;
  const alertas = tracking?.alertas ?? [];

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

  const scoreBarColor = (score: number) =>
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-5">
      {/* Integridad Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> Métricas de integridad
        </h3>
        {tracking ? (
          <>
            <div className="text-center py-2">
              <div className={`text-5xl font-black ${scoreColor(tracking.score_integridad)}`}>
                {tracking.score_integridad}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">/ 100 Puntos</div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(
                  tracking.score_integridad
                )}`}
                style={{
                  width: `${Math.min(tracking.score_integridad, 100)}%`,
                }}
              />
            </div>
            {tracking.diagnostico_riesgo && (
              <p className="text-[11px] text-slate-500 leading-relaxed text-justify">
                {tracking.diagnostico_riesgo}
              </p>
            )}

            {/* Repositorio y CI/CD */}
            {tracking.estado_repo && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">CI Status</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                      tracking.estado_repo.ci_status === "pass"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-red-50 text-red-700 border border-red-100"
                    }`}
                  >
                    {tracking.estado_repo.ci_status}
                  </span>
                </div>
                {tracking.estado_repo.repo_url && (
                  <a
                    href={tracking.estado_repo.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-indigo-650 hover:underline font-semibold"
                  >
                    <GitCommit className="w-3.5 h-3.5" /> Repositorio GitHub
                  </a>
                )}
                {tracking.estado_repo.demo_url && (
                  <a
                    href={tracking.estado_repo.demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-emerald-650 hover:underline font-semibold"
                  >
                    <Rocket className="w-3.5 h-3.5" /> Aplicación en Vivo (Demo)
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2 italic">Sin datos de tracking.</p>
        )}

        <button
          onClick={handleReAnalizar}
          disabled={isAnalyzing}
          className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isAnalyzing ? "Analizando repositorio..." : "Iniciar Análisis Trazabilidad"}
        </button>
      </div>

      {/* Alertas DevOps */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" /> Alertas DevOps
        </h3>
        {alertas.length === 0 ? (
          <div className="flex items-center gap-2 py-2 text-emerald-600 text-xs font-bold bg-emerald-50/50 border border-emerald-100 rounded-xl px-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sin alertas críticas reportadas
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map((alerta, i) => {
              const severityCls =
                alerta.severidad === "critica"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : alerta.severidad === "alta"
                  ? "bg-orange-50 border-orange-200 text-orange-850"
                  : alerta.severidad === "media"
                  ? "bg-amber-50 border-amber-200 text-amber-850"
                  : "bg-blue-50 border-blue-200 text-blue-800";

              return (
                <div key={i} className={`rounded-xl border p-3.5 transition-all text-xs ${severityCls}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">
                      {alerta.tipo.replace(/_/g, " ")}
                    </span>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-white/60 border border-black/5">
                      {alerta.severidad}
                    </span>
                  </div>
                  <p className="opacity-90 leading-relaxed font-medium">{alerta.mensaje}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
