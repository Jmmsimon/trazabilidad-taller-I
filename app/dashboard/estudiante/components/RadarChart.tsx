import React from "react";
import { Competencia } from "../types";

interface RadarChartProps {
  competencias: Competencia[];
}

export function RadarChart({ competencias }: RadarChartProps) {
  const N = competencias.length;
  if (N < 3) return null;

  const CX = 200, CY = 200, R = 150;
  const angles = competencias.map((_, i) => (2 * Math.PI * i) / N - Math.PI / 2);
  const nivelR = (nivel: string) => (nivel === "avanzado" ? R : nivel === "intermedio" ? R * 0.66 : R * 0.33);
  const toXY = (r: number, a: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)] as [number, number];

  const gridLevels = [R, R * 0.66, R * 0.33];
  const gridPolygons = gridLevels.map((r) =>
    angles
      .map((a) => toXY(r, a))
      .map(([x, y]) => `${x},${y}`)
      .join(" ")
  );

  const filledPoints = competencias.map((c, i) => {
    const r = c.adquirida ? nivelR(c.nivel) : 6;
    return toXY(r, angles[i]);
  });
  const filledPolygon = filledPoints.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <svg width="100%" height="400" viewBox="0 0 400 400" className="overflow-visible" preserveAspectRatio="xMidYMid meet">
        {gridPolygons.map((pts, gi) => (
          <polygon
            key={gi}
            points={pts}
            fill="none"
            stroke={gi === 0 ? "#cbd5e1" : "#e2e8f0"}
            strokeWidth="1.5"
            strokeDasharray={gi > 0 ? "4 4" : undefined}
          />
        ))}
        {angles.map((a, i) => {
          const [x, y] = toXY(R, a);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1.5" />;
        })}
        <polygon points={filledPolygon} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="2" />
        {competencias.map((c, i) => {
          const r = c.adquirida ? nivelR(c.nivel) : 4;
          const [x, y] = toXY(r, angles[i]);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={c.adquirida ? 4 : 3}
              fill={c.adquirida ? "#6366f1" : "#94a3b8"}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          );
        })}
        {competencias.map((c, i) => {
          const [lx, ly] = toXY(R + 25, angles[i]);
          const anchor = lx < CX - 5 ? "end" : lx > CX + 5 ? "start" : "middle";
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="12"
              fill={c.adquirida ? "#334155" : "#94a3b8"}
              className={c.adquirida ? "font-semibold" : "font-normal"}
            >
              {c.nombre.length > 20 ? c.nombre.slice(0, 19) + "…" : c.nombre}
            </text>
          );
        })}
        {[{ r: R, label: "Avz" }, { r: R * 0.66, label: "Int" }, { r: R * 0.33, label: "Bás" }].map(({ r, label }) => (
          <text key={label} x={CX + 4} y={CY - r + 4} fontSize="11" fill="#94a3b8" className="font-bold">
            {label}
          </text>
        ))}
      </svg>
      <div className="flex gap-4 text-[10px] text-slate-500 font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Adquirida
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Pendiente
        </div>
      </div>
    </div>
  );
}
