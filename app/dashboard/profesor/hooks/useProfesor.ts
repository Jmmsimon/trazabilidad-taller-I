import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProyectoResumen, ProyectoDetalle, BacklogItem } from "../types";

export function useProfesor() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<"list" | "detail">("list");
  
  // Lista states
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  // Detalle states
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<ProyectoDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Detalle actions & forms
  const [comentario, setComentario] = useState("");
  const [motivo, setMotivo] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [loadingAprobar, setLoadingAprobar] = useState(false);
  const [loadingRechazar, setLoadingRechazar] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Hitos states
  const [hitoStates, setHitoStates] = useState<
    Record<number, { open: boolean; feedback: string; loading: boolean }>
  >({});
  const [editingTareasEstado, setEditingTareasEstado] = useState<Record<number, string[]>>({});
  const [editingTareasComentarios, setEditingTareasComentarios] = useState<Record<number, string[]>>({});

  // Backlog audit states
  const [revisandoBacklogItem, setRevisandoBacklogItem] = useState<BacklogItem | null>(null);
  const [comentarioBacklog, setComentarioBacklog] = useState("");
  const [estadoBacklog, setEstadoBacklog] = useState<"aprobado" | "observado">("aprobado");

  // Fetch lista
  const fetchLista = useCallback(async () => {
    try {
      const res = await fetch("/api/profesor/proyectos");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProyectoResumen[] = await res.json();
      setProyectos(data);
      setErrorLista(null);
    } catch {
      setErrorLista("No se pudo cargar la lista de proyectos.");
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => {
    fetchLista();
    const interval = setInterval(fetchLista, 10000);
    return () => clearInterval(interval);
  }, [fetchLista]);

  // Fetch detalle
  const fetchDetalle = useCallback(async (id: string) => {
    setLoadingDetalle(true);
    setErrorDetalle(null);
    try {
      const res = await fetch(`/api/profesor/proyectos/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProyectoDetalle = await res.json();
      setDetalle(data);
    } catch {
      setErrorDetalle("No se pudo cargar el detalle del proyecto.");
    } finally {
      setLoadingDetalle(false);
    }
  }, []);

  const fetchDetalleSilent = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/profesor/proyectos/${id}`);
      if (res.ok) {
        const data: ProyectoDetalle = await res.json();
        setDetalle(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (view === "detail" && selectedId) {
      const interval = setInterval(() => fetchDetalleSilent(selectedId), 5000);
      return () => clearInterval(interval);
    }
  }, [view, selectedId, fetchDetalleSilent]);

  const handleSelectProject = (id: string) => {
    setSelectedId(id);
    setDetalle(null);
    setView("detail");
    fetchDetalle(id);
  };

  const handleVolver = () => {
    setView("list");
    setSelectedId(null);
    setDetalle(null);
    setComentario("");
    setMotivo("");
  };

  const handleRefetchDetalle = () => {
    if (selectedId) fetchDetalle(selectedId);
  };

  const pollTracking = useCallback(async (projId: string) => {
    let secondsElapsed = 0;
    const messages = [
      "Iniciando análisis asíncrono...",
      "Leyendo repositorio Git y commits...",
      "Extrayendo evidencias y entregables...",
      "Evaluando competencias adquiridas...",
      "Calculando métricas de integridad...",
      "Generando diagnósticos de riesgo de IA..."
    ];

    const check = async () => {
      try {
        const msgIdx = Math.min(Math.floor(secondsElapsed / 3.5), messages.length - 1);
        setAnalysisMessage(messages[msgIdx]);
        secondsElapsed += 2.5;

        const res = await fetch(`/api/proyectos/${projId}/tracking/status`);
        if (!res.ok) {
          setIsAnalyzing(false);
          setAnalysisMessage("");
          return;
        }
        const data = await res.json();
        if (data.tracking_status === "completed") {
          if (selectedId) fetchDetalle(selectedId);
          setIsAnalyzing(false);
          setAnalysisMessage("");
          return;
        } else if (data.tracking_status === "error") {
          setIsAnalyzing(false);
          setAnalysisMessage("");
          return;
        }
        setTimeout(check, 2500);
      } catch {
        setIsAnalyzing(false);
        setAnalysisMessage("");
      }
    };
    check();
  }, [selectedId, fetchDetalle]);

  // Re-analizar DevOps
  const handleReAnalizar = async () => {
    if (!detalle) return;
    setIsAnalyzing(true);
    setAnalysisMessage("Iniciando análisis asíncrono...");
    try {
      await fetch(`/api/proyectos/${detalle.proyectoId}/tracking/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumnoId: detalle.alumnoId,
          proyectoId: detalle.proyectoId,
        }),
      });
      pollTracking(detalle.proyectoId);
    } catch (e) {
      console.error("Error al iniciar análisis:", e);
      setIsAnalyzing(false);
      setAnalysisMessage("");
    }
  };

  // Aprobar/Rechazar Roadmap
  const handleAprobar = async () => {
    if (!detalle) return;
    setLoadingAprobar(true);
    try {
      await fetch(`/api/profesor/proyectos/${detalle.proyectoId}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario }),
      });
      handleRefetchDetalle();
    } catch (e) {
      console.error("Error al aprobar:", e);
    } finally {
      setLoadingAprobar(false);
    }
  };

  const handleRechazar = async () => {
    if (!detalle) return;
    setLoadingRechazar(true);
    try {
      await fetch(`/api/profesor/proyectos/${detalle.proyectoId}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      handleRefetchDetalle();
    } catch (e) {
      console.error("Error al rechazar:", e);
    } finally {
      setLoadingRechazar(false);
    }
  };

  const handleDescargarPDF = () => {
    if (!detalle) return;
    window.open(`/api/proyectos/${detalle.proyectoId}/reporte-pdf`, "_blank");
  };

  const handleExportarJSON = () => {
    if (!detalle) return;
    window.open(`/api/proyectos/${detalle.proyectoId}/exportar`, "_blank");
  };

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const handleArchivarCiclo = async () => {
    if (!detalle) return;
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/proyectos/${detalle.proyectoId}/archivar`, {
        method: "POST"
      });
      if (res.ok) {
        showToast("Ciclo reiniciado exitosamente.", "success");
        handleRefetchDetalle();
      } else {
        showToast("Error al archivar el ciclo.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error de conexión al archivar el ciclo.", "error");
    } finally {
      setIsArchiving(false);
      setShowConfirmReset(false);
    }
  };

  // Hitos audit helpers
  const setHitoField = (
    idx: number,
    field: "open" | "feedback" | "loading",
    value: boolean | string
  ) => {
    setHitoStates((prev) => {
      const current = prev[idx] ?? { open: false, feedback: "", loading: false };
      return { ...prev, [idx]: { ...current, [field]: value } };
    });
  };

  const handleToggleTaskStatus = (hitoIdx: number, taskIdx: number, status: "ok" | "observado") => {
    if (!detalle) return;
    const hitos = detalle.propuesta?.hitos ?? [];
    setEditingTareasEstado((prev) => {
      const hitoStatus = prev[hitoIdx] ? [...prev[hitoIdx]] : [...(hitos[hitoIdx]?.tareas_estado || [])];
      while (hitoStatus.length < hitos[hitoIdx].tareas.length) {
        hitoStatus.push("ok");
      }
      hitoStatus[taskIdx] = status;
      return { ...prev, [hitoIdx]: hitoStatus };
    });
  };

  const handleTaskCommentChange = (hitoIdx: number, taskIdx: number, comment: string) => {
    if (!detalle) return;
    const hitos = detalle.propuesta?.hitos ?? [];
    setEditingTareasComentarios((prev) => {
      const hitoComments = prev[hitoIdx] ? [...prev[hitoIdx]] : [...(hitos[hitoIdx]?.tareas_comentarios || [])];
      while (hitoComments.length < hitos[hitoIdx].tareas.length) {
        hitoComments.push("");
      }
      hitoComments[taskIdx] = comment;
      return { ...prev, [hitoIdx]: hitoComments };
    });
  };

  const handleGuardarRevisionHito = async (idx: number) => {
    if (!detalle) return;
    setHitoField(idx, "loading", true);
    try {
      const hitos = detalle.propuesta?.hitos ?? [];
      const currentTasks = hitos[idx].tareas;
      const tEstado = editingTareasEstado[idx] || hitos[idx].tareas_estado || [];
      const tComentarios = editingTareasComentarios[idx] || hitos[idx].tareas_comentarios || [];
      
      const finalEstado = Array.from({ length: currentTasks.length }, (_, i) => tEstado[i] || "ok");
      const finalComentarios = Array.from({ length: currentTasks.length }, (_, i) => tComentarios[i] || "");

      const tieneObservaciones = finalEstado.includes("observado");
      const estadoHito = tieneObservaciones ? "observado" : "validado";

      await fetch(
        `/api/profesor/proyectos/${detalle.proyectoId}/hitos/${idx}/revisar-tareas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estado_hito: estadoHito,
            tareas_estado: finalEstado,
            tareas_comentarios: finalComentarios,
          }),
        }
      );
      handleRefetchDetalle();
      setHitoField(idx, "open", false);
    } catch (e) {
      console.error("Error al guardar revisión del hito:", e);
    } finally {
      setHitoField(idx, "loading", false);
    }
  };

  const handleGuardarAuditBacklog = async () => {
    if (!detalle || !revisandoBacklogItem) return;
    try {
      await fetch(`/api/profesor/proyectos/${detalle.proyectoId}/backlog/${revisandoBacklogItem.id}/revisar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado_revision: estadoBacklog,
          comentario_revision: comentarioBacklog,
        }),
      });
      handleRefetchDetalle();
      setRevisandoBacklogItem(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Chart data
  const getCommitChartData = () => {
    if (!detalle) return { days: [], counts: [] };
    const commits = detalle.tracking?.estado_repo?.commits || [];
    const days = [];
    const counts = [];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      
      const count = commits.filter((c) => {
        return c.fecha && c.fecha.startsWith(dateString);
      }).length;
      
      days.push(dayNames[d.getDay()]);
      counts.push(count);
    }
    return { days, counts };
  };

  return {
    user,
    logout,
    view,
    setView,
    proyectos,
    loadingLista,
    errorLista,
    selectedId,
    detalle,
    loadingDetalle,
    errorDetalle,
    comentario,
    setComentario,
    motivo,
    setMotivo,
    isAnalyzing,
    analysisMessage,
    loadingAprobar,
    loadingRechazar,
    isArchiving,
    hitoStates,
    editingTareasEstado,
    editingTareasComentarios,
    setEditingTareasEstado,
    setEditingTareasComentarios,
    revisandoBacklogItem,
    setRevisandoBacklogItem,
    comentarioBacklog,
    setComentarioBacklog,
    estadoBacklog,
    setEstadoBacklog,
    handleSelectProject,
    handleVolver,
    handleRefetchDetalle,
    handleReAnalizar,
    handleAprobar,
    handleRechazar,
    handleDescargarPDF,
    handleExportarJSON,
    handleArchivarCiclo,
    setHitoField,
    handleToggleTaskStatus,
    handleTaskCommentChange,
    handleGuardarRevisionHito,
    handleGuardarAuditBacklog,
    getCommitChartData,
    showConfirmReset,
    setShowConfirmReset,
    toast,
    setToast,
    showToast,
  };
}
