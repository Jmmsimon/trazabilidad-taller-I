"use client";
import { GitCommit, CheckCircle2, AlertCircle, Layers } from "lucide-react";
import { CommitInfo } from "../types";

const ESTADO_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Por Hacer",
  in_progress: "En Progreso",
  done: "Hecho",
};

interface CommitsHitosPanelProps {
  commits: CommitInfo[];
  kanbanUpdates?: Record<string, string>;
}

export function CommitsHitosPanel({ commits, kanbanUpdates }: CommitsHitosPanelProps) {
  const updates = Object.entries(kanbanUpdates || {});

  return (
    <div className="space-y-6">
      {updates.length > 0 && (
        <section className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 space-y-3">
          <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Kanban actualizado por el agente
          </h4>
          <div className="flex flex-wrap gap-2">
            {updates.map(([id, estado]) => (
              <span
                key={id}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-indigo-100 text-slate-700"
              >
                {id} → {ESTADO_LABEL[estado] || estado}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <GitCommit className="w-3.5 h-3.5 text-indigo-500" />
          Commits y alineación con hitos ({commits.length})
        </h4>

        {commits.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">
            Sin commits analizados. Vincula el repo y vuelve a lanzar el tracking.
          </p>
        ) : (
          <div className="relative pl-5 border-l border-slate-200 space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {commits.map((commit, idx) => (
              <div key={`${commit.sha}-${idx}`} className="relative space-y-1.5">
                <div
                  className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-white border-2 ${
                    commit.alineado !== false ? "border-indigo-500" : "border-red-500"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {commit.sha.substring(0, 7)}
                  </span>
                  <span className="font-semibold text-slate-600">{commit.author}</span>
                  <span>{commit.fecha}</span>
                  {commit.url && (
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-indigo-600 font-bold hover:underline"
                    >
                      GitHub →
                    </a>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-snug break-words">
                  {commit.mensaje}
                </p>
                <div
                  className={`flex flex-col gap-1 p-2 rounded-xl border text-[11px] ${
                    commit.alineado !== false
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                      : "bg-red-50 border-red-100 text-red-800"
                  }`}
                >
                  <span className="font-extrabold uppercase tracking-wider flex items-center gap-1">
                    {commit.alineado !== false ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    {commit.alineado !== false ? "Alineado con hito" : "Desvío / sin aporte"}
                  </span>
                  {commit.contribucion && (
                    <span className="font-semibold italic opacity-95">{commit.contribucion}</span>
                  )}
                  {(commit.hito_ref || (commit.item_ids && commit.item_ids.length > 0)) && (
                    <span className="text-[10px] font-bold text-slate-600">
                      {commit.hito_ref ? `Hito: ${commit.hito_ref}` : ""}
                      {commit.item_ids && commit.item_ids.length > 0
                        ? ` · Ítems: ${commit.item_ids.join(", ")}`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
