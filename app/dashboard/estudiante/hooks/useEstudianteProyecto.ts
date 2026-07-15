import { useState, useEffect, useCallback } from "react";
import { Phase, ProjectPlan, TrackingState, BacklogEpica, BacklogItem } from "../types";

export function useEstudianteProyecto(user: any) {
  const [phase, setPhase] = useState<Phase>("A");
  const [idea, setIdea] = useState("");
  const [nombre, setNombre] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [tracking, setTracking] = useState<TrackingState>({
    status: "not_started",
    data: null,
  });

  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  // texto editado por alumno por tarea: clave "hitoIdx-tareaIdx"
  const [editingTasks, setEditingTasks] = useState<Record<string, string>>({});
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedPlan, setEditedPlan] = useState<ProjectPlan | null>(null);

  // Estados para la carga asíncrona con progreso real en Fase B
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationDetail, setGenerationDetail] = useState("Iniciando agentes de co-creación...");
  const [activeAgent, setActiveAgent] = useState<string | null>("drafter");
  const [generationError, setGenerationError] = useState<string | null>(null);

  const startEditing = () => {
    if (!plan) return;
    setEditedPlan(JSON.parse(JSON.stringify(plan)));
    setIsEditingDraft(true);
  };

  const updateBacklogItemField = (itemId: string, field: string, value: any) => {
    setEditedPlan((prev) => {
      if (!prev || !prev.backlog_scrum) return prev;
      const updated = { ...prev };
      if (!updated.backlog_scrum) return prev;
      const epicas = updated.backlog_scrum.epicas || [];
      for (const epica of epicas) {
        if (epica.items) {
          const item = epica.items.find((it) => it.id === itemId);
          if (item) {
            (item as any)[field] = value;
            break;
          }
        }
      }
      return updated;
    });
  };

  const handleSaveDraft = async () => {
    if (!projectId || !editedPlan) return;
    setIsSavingConfig(true);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/update-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hitos: editedPlan.hitos,
          backlog_scrum: editedPlan.backlog_scrum,
        }),
      });
      if (!res.ok) throw new Error("Fallo al guardar borrador");

      setPlan(editedPlan);
      setIsEditingDraft(false);
      setEditedPlan(null);
    } catch (err) {
      console.error(err);
      alert("Error al guardar cambios: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ── Fetch active project on mount ──────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const fetchActiveProject = async () => {
      try {
        const res = await fetch(`/api/proyectos/alumno/${user.uid}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.proyectoId) {
          setProjectId(data.proyectoId);
          // Set status/phase depending on the project status
          if (data.status === "processing") {
            setPhase("B");
          } else if (data.status === "pending_approval" || data.status === "rejected") {
            setPlan({
              ...data.propuesta,
              id: data.proyectoId,
              scoreValidator: data.scoreValidator ?? 0,
              backlog_scrum: data.backlog_scrum,
              status: data.status,
              motivo_rechazo: data.motivo_rechazo,
            });
            setPhase("C");
          } else if (data.status === "active") {
            setPlan({
              ...data.propuesta,
              id: data.proyectoId,
              scoreValidator: data.scoreValidator ?? 0,
              backlog_scrum: data.backlog_scrum,
              status: data.status,
              repo_url: data.repo_url ?? "",
              demo_url: data.demo_url ?? "",
            });
            setRepoUrl(data.repo_url ?? "");
            setDemoUrl(data.demo_url ?? "");
            setPhase("D");
            if (data.tracking) {
              setTracking({
                status: data.tracking_status || "completed",
                data: {
                  ...data.tracking,
                  tracking_history: data.tracking_history || []
                },
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching active project:", err);
      }
    };
    fetchActiveProject();
  }, [user?.uid]);

  // ── Poll discovery (Fase B) ──────────────────────────────
  useEffect(() => {
    if (phase !== "B" || !projectId) return;
    setGenerationProgress(5);
    setGenerationDetail("Iniciando agentes de co-creación...");
    setActiveAgent("drafter");
    setGenerationError(null);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/proyectos/${projectId}/status`);
        const data = await res.json();

        if (data.status === "error") {
          setGenerationError(data.error || "Ocurrió un error inesperado al generar el plan maestro.");
          clearInterval(interval);
          return;
        }

        if (data.progress !== undefined) setGenerationProgress(data.progress);
        if (data.status_detail !== undefined) setGenerationDetail(data.status_detail);
        if (data.active_agent !== undefined) setActiveAgent(data.active_agent);

        if (data.status === "pending_approval") {
          setPlan({ ...data.propuesta, scoreValidator: data.scoreValidator ?? 0, backlog_scrum: data.backlog_scrum });
          setPhase("C");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling discovery:", err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [phase, projectId]);

  // ── Poll tracking (Fase D) ───────────────────────────────
  const pollTracking = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/proyectos/${projectId}/tracking/status`);
      const data = await res.json();
      if (data.tracking_status === "completed" && data.tracking) {
        setTracking({
          status: "completed",
          data: data.tracking,
          activeAgent: undefined,
          progress: 100,
          detail: undefined
        });
      } else if (data.tracking_status === "processing") {
        setTracking((prev) => ({
          ...prev,
          status: "processing",
          activeAgent: data.tracking_active_agent,
          progress: data.tracking_progress,
          detail: data.tracking_detail
        }));
      } else if (data.tracking_status === "error") {
        setTracking((prev) => ({ ...prev, status: "error" }));
      }
    } catch (err) {
      console.error("Error polling tracking:", err);
    }
  }, [projectId]);

  useEffect(() => {
    if (phase !== "D" || !projectId) return;
    if (tracking.status === "completed") return;

    // Lanzar tracking al entrar en Fase D
    if (tracking.status === "not_started") {
      setTracking((prev) => ({ ...prev, status: "processing" }));
      fetch(`/api/proyectos/${projectId}/tracking/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alumnoId: user?.uid ?? "anonimo", proyectoId: projectId }),
      }).catch(console.error);
    }

    const interval = setInterval(pollTracking, 3000);
    return () => clearInterval(interval);
  }, [phase, projectId, tracking.status, pollTracking, user?.uid]);

  const handleStartProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.length < 50) return;
    setPhase("B");
    try {
      const res = await fetch("/api/proyectos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, stack, nombre, alumnoId: user?.uid ?? "anonimo" }),
      });
      const data = await res.json();
      setProjectId(data.proyectoId);
    } catch (err) {
      console.error("Error starting project:", err);
    }
  };

  const handleSaveConfig = async () => {
    if (!projectId) return;
    setIsSavingConfig(true);
    try {
      const resConfig = await fetch(`/api/proyectos/${projectId}/configuracion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, demo_url: demoUrl }),
      });
      if (!resConfig.ok) {
        throw new Error("No se pudo guardar la configuración");
      }

      setPlan((prev) => (prev ? { ...prev, repo_url: repoUrl, demo_url: demoUrl } : null));

      setTracking({ status: "processing", data: null });
      const resTracking = await fetch(`/api/proyectos/${projectId}/tracking/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alumnoId: user?.uid ?? "anonimo", proyectoId: projectId }),
      });
      if (!resTracking.ok) {
        throw new Error("No se pudo iniciar el seguimiento");
      }
    } catch (err) {
      console.error("Error saving config and starting tracking:", err);
      alert("Error al guardar y analizar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleEnviarCorreccionHito = async (idx: number) => {
    if (!projectId || !plan) return;
    try {
      const tareas = plan.hitos[idx].tareas.map((originalText, j) => {
        const key = `${idx}-${j}`;
        return editingTasks[key] !== undefined ? editingTasks[key] : originalText;
      });

      const res = await fetch(`/api/proyectos/${projectId}/hitos/${idx}/enviar-correccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tareas_corregidas: tareas }),
      });
      if (res.ok) {
        setEditingTasks((prev) => {
          const n = { ...prev };
          plan.hitos[idx].tareas.forEach((_, j) => delete n[`${idx}-${j}`]);
          return n;
        });
        const resProj = await fetch(`/api/proyectos/alumno/${user?.uid}`);
        const data = await resProj.json();
        setPlan({
          ...data.propuesta,
          id: data.proyectoId,
          scoreValidator: data.scoreValidator ?? 0,
          backlog_scrum: data.backlog_scrum,
          status: data.status,
          repo_url: data.repo_url ?? "",
          demo_url: data.demo_url ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCorregirBacklogItem = async (itemId: string) => {
    if (!projectId) return;
    try {
      const tituloKey = `bl-titulo-${itemId}`;
      const huKey = `bl-hu-${itemId}`;

      const newTitulo = editingTasks[tituloKey];
      const newHu = editingTasks[huKey];

      const res = await fetch(`/api/proyectos/${projectId}/backlog/${itemId}/corregir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: newTitulo,
          historia_completa: newHu,
        }),
      });
      if (res.ok) {
        setEditingTasks((prev) => {
          const n = { ...prev };
          delete n[tituloKey];
          delete n[huKey];
          return n;
        });
        const resProj = await fetch(`/api/proyectos/alumno/${user?.uid}`);
        const data = await resProj.json();
        setPlan({
          ...data.propuesta,
          id: data.proyectoId,
          scoreValidator: data.scoreValidator ?? 0,
          backlog_scrum: data.backlog_scrum,
          status: data.status,
          repo_url: data.repo_url ?? "",
          demo_url: data.demo_url ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateKanbanEstado = async (itemId: string, nuevoEstado: string) => {
    if (!projectId) return;
    setPlan((prev) => {
      if (!prev?.backlog_scrum?.epicas) return prev;
      const updated = {
        ...prev,
        backlog_scrum: {
          ...prev.backlog_scrum,
          epicas: prev.backlog_scrum.epicas.map((e) => ({
            ...e,
            items: (e.items ?? []).map((it) => (it.id === itemId ? { ...it, estado: nuevoEstado } : it)),
          })),
        },
      };
      return updated;
    });
    try {
      await fetch(`/api/proyectos/${projectId}/backlog/${itemId}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
    } catch (err) {
      console.error("Error updating kanban estado:", err);
    }
  };

  const addTag = () => {
    if (currentTag && !stack.includes(currentTag)) {
      setStack([...stack, currentTag]);
      setCurrentTag("");
    }
  };

  const removeTag = (tag: string) => setStack(stack.filter((t) => t !== tag));

  const calcularProgreso = (): number => {
    if (!plan || !plan.backlog_scrum?.epicas) return 0;
    let total = 0;
    let completadas = 0;
    plan.backlog_scrum.epicas.forEach((epica) => {
      if (epica.items) {
        epica.items.forEach((item: any) => {
          total++;
          if (item.estado === "done") {
            completadas++;
          }
        });
      }
    });
    return total === 0 ? 0 : Math.round((completadas / total) * 100);
  };

  const handleDescargarPDF = () => {
    if (!projectId) return;
    window.open(`/api/proyectos/${projectId}/reporte-pdf`, "_blank");
  };

  return {
    phase,
    setPhase,
    idea,
    setIdea,
    nombre,
    setNombre,
    stack,
    setStack,
    currentTag,
    setCurrentTag,
    projectId,
    plan,
    setPlan,
    tracking,
    setTracking,
    repoUrl,
    setRepoUrl,
    demoUrl,
    setDemoUrl,
    isSavingConfig,
    editingTasks,
    setEditingTasks,
    isEditingDraft,
    setIsEditingDraft,
    editedPlan,
    setEditedPlan,
    generationProgress,
    generationDetail,
    activeAgent,
    generationError,
    startEditing,
    updateBacklogItemField,
    handleSaveDraft,
    handleStartProject,
    handleSaveConfig,
    handleEnviarCorreccionHito,
    handleCorregirBacklogItem,
    handleUpdateKanbanEstado,
    addTag,
    removeTag,
    calcularProgreso,
    handleDescargarPDF,
  };
}
