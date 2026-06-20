import React from "react";
import { GitCommit, Rocket, FileText, TestTube, Activity } from "lucide-react";

export const TIPO_ICONS: Record<string, React.ReactNode> = {
  codigo: <GitCommit className="w-3.5 h-3.5" />,
  pipeline: <Rocket className="w-3.5 h-3.5" />,
  documento: <FileText className="w-3.5 h-3.5" />,
  test: <TestTube className="w-3.5 h-3.5" />,
  demo: <Activity className="w-3.5 h-3.5" />,
};

export const SEVERIDAD_COLORS: Record<string, string> = {
  baja: "text-blue-600 bg-blue-50/70 border-blue-100",
  media: "text-amber-700 bg-amber-50/70 border-amber-100",
  alta: "text-orange-700 bg-orange-50/70 border-orange-100",
  critica: "text-red-700 bg-red-50/70 border-red-100",
};

export const NIVEL_COLORS: Record<string, string> = {
  basico: "text-slate-500",
  intermedio: "text-indigo-650",
  avanzado: "text-emerald-600",
};

export const getSprintMetadata = (sprintNum: number) => {
  if (sprintNum === 1) {
    return {
      nombre: "Sprint 1",
      rangoSemanas: "Semanas 1-8",
      nivel: "Nivel Básico / Intermedio",
      nivelStyle: "text-blue-600 bg-blue-50 border-blue-100",
      objetivo: "MVP funcional y desarrollo inicial",
    };
  } else if (sprintNum === 2) {
    return {
      nombre: "Sprint 2",
      rangoSemanas: "Semanas 9-16",
      nivel: "Nivel Avanzado",
      nivelStyle: "text-purple-600 bg-purple-50 border-purple-100",
      objetivo: "Integración, desarrollo avanzado y cierre",
    };
  }
  return {
    nombre: "Otros / Backlog General",
    rangoSemanas: "",
    nivel: "Sin asignar",
    nivelStyle: "text-slate-400 bg-slate-50 border-slate-200",
    objetivo: "Tareas pendientes de priorización",
  };
};

export const getSprintNum = (sprintVal?: number | null, semanaVal?: number | null) => {
  if (sprintVal === 1 || sprintVal === 2) return sprintVal;
  if (sprintVal) {
    return sprintVal <= 4 ? 1 : 2;
  }
  if (semanaVal) {
    return semanaVal <= 8 ? 1 : 2;
  }
  return 1;
};

export const scoreColor = (score: number) =>
  score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

export const barWidth = (score: number) => `${Math.min(score, 100)}%`;
