import React, { useState } from "react";
import { BacklogItem } from "../types";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface KanbanBoardProps {
  items: BacklogItem[];
  onItemMove?: (itemId: string, newEstado: string) => void;
}

export function KanbanBoard({ items, onItemMove }: KanbanBoardProps) {
  // Local state to allow immediate drag-and-drop feedback if onItemMove is not fully reactive
  const [localItems, setLocalItems] = useState<BacklogItem[]>(items);

  // Sync with props when they change
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const columns = [
    { id: "backlog", title: "Backlog (Sin asignar)", icon: Circle, color: "text-slate-400", bg: "bg-slate-50/50" },
    { id: "todo", title: "Por Hacer", icon: Circle, color: "text-blue-400", bg: "bg-blue-50/50" },
    { id: "in_progress", title: "En Progreso", icon: Clock, color: "text-indigo-500", bg: "bg-indigo-50/50" },
    { id: "done", title: "Hecho", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50/50" },
  ];

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newEstado: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;

    setLocalItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, estado: newEstado } : item))
    );

    if (onItemMove) {
      onItemMove(itemId, newEstado);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full h-full min-h-[500px]">
      {columns.map((col) => {
        const colItems = localItems.filter((item) => {
          const estado = item.estado || "backlog";
          if (col.id === "backlog") {
            return estado !== "todo" && estado !== "in_progress" && estado !== "done";
          }
          return estado === col.id;
        });
        const Icon = col.icon;

        return (
          <div
            key={col.id}
            className={`flex-1 rounded-2xl border border-slate-200/60 p-4 flex flex-col ${col.bg}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${col.color}`} />
                <h3 className="font-bold text-slate-700">{col.title}</h3>
              </div>
              <span className="bg-white text-slate-500 text-xs font-bold px-2 py-1 rounded-full border border-slate-200 shadow-sm">
                {colItems.length}
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {colItems.map((item) => {
                const isApproved = item.estado_revision === "aprobado";
                return (
                  <div
                    key={item.id}
                    draggable={!isApproved}
                    onDragStart={(e) => {
                      if (isApproved) {
                        e.preventDefault();
                        return;
                      }
                      handleDragStart(e, item.id);
                    }}
                    className={`bg-white border p-4 rounded-xl shadow-sm transition-all ${
                      isApproved
                        ? "border-emerald-200 bg-emerald-50/5 opacity-80 cursor-not-allowed"
                        : "border-slate-200 hover:shadow-md cursor-move"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                        {item.tipo || "HU"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          item.prioridad === "Critica"
                            ? "bg-red-100 text-red-700"
                            : item.prioridad === "Alta"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.prioridad || "Media"}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 leading-tight">
                      {item.titulo}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {`Como ${item.como || ""}, quiero ${item.quiero || ""} para ${item.para || ""}`}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      {isApproved ? (
                        <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Aprobado
                        </span>
                      ) : (
                        <span />
                      )}
                      {item.puntos && (
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded">
                          {item.puntos} SP
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {colItems.length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs font-semibold">
                  Arrastra ítems aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
