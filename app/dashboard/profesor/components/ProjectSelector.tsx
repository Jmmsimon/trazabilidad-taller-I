"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, AlertCircle, RefreshCw, Trophy } from "lucide-react";
import { ProyectoResumen, FilterStatus, STATUS_CONFIG } from "../types";

interface ProjectSelectorProps {
  proyectos: ProyectoResumen[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectProject: (id: string) => void;
}

export function ProjectSelector({
  proyectos,
  loading,
  error,
  onRetry,
  onSelectProject,
}: ProjectSelectorProps) {
  const [filtro, setFiltro] = useState<FilterStatus>("todos");

  const filtrados =
    filtro === "todos"
      ? proyectos
      : proyectos.filter((p) => p.status === filtro);

  const FILTROS: { key: FilterStatus; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "pending_approval", label: "Pendientes" },
    { key: "active", label: "Activos" },
    { key: "rejected", label: "Rechazados" },
  ];

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-600 font-bold" : score >= 60 ? "text-amber-600 font-bold" : "text-red-600 font-bold";

  const scoreBarColor = (score: number) =>
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <motion.div
      key="lista"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
              Panel del Docente
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-13 pl-1 font-medium">
            Gestión y supervisión de proyectos académicos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 shadow-sm">
            {proyectos.length} proyecto{proyectos.length !== 1 ? "s" : ""}
          </span>
          {loading && (
            <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              filtro === key
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {error ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-slate-500 font-medium">{error}</p>
          <button
            onClick={onRetry}
            className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      ) : loading && proyectos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-100 border border-slate-200/60 rounded-2xl h-52" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <BookOpen className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 font-medium">No hay proyectos en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((proyecto) => {
            const statusCfg =
              STATUS_CONFIG[proyecto.status] ?? STATUS_CONFIG.processing;
            return (
              <motion.div
                key={proyecto.proyectoId}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col gap-4 hover:border-slate-350 hover:shadow-md transition-all cursor-pointer shadow-sm relative"
                onClick={() => onSelectProject(proyecto.proyectoId)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 group-hover:text-indigo-650 transition-colors truncate">
                      {proyecto.nombre}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                      {proyecto.alumnoNombre || proyecto.alumnoId}
                    </p>
                  </div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Score validator */}
                <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-100 rounded-xl p-2.5">
                  <span className="text-3xl font-black text-indigo-600">
                    {proyecto.scoreValidator}
                  </span>
                  <div className="text-[9px] text-slate-400 uppercase font-extrabold leading-none tracking-wider">
                    Score<br />Validator
                  </div>
                  {proyecto.alertas_criticas > 0 && (
                    <span className="ml-auto flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-700 text-[9px] font-black uppercase tracking-wider">
                      {proyecto.alertas_criticas} críticas
                    </span>
                  )}
                </div>

                {/* Barra integridad */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Integridad DevOps</span>
                    <span className={scoreColor(proyecto.score_integridad)}>
                      {proyecto.score_integridad}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(
                        proyecto.score_integridad
                      )}`}
                      style={{
                        width: `${Math.min(proyecto.score_integridad, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Competencias */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Competencias Adquiridas
                  </span>
                  <span className="text-slate-700 font-bold">
                    {proyecto.porcentaje_competencias.toFixed(0)}%
                  </span>
                </div>

                {/* Ver detalle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProject(proyecto.proyectoId);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-indigo-600 hover:border-indigo-600 text-slate-600 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Ver Detalles →
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
