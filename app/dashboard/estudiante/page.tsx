"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Send, 
  Code, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  Calendar,
  Layers,
  Activity,
  Trophy
} from "lucide-react";

type Phase = "A" | "B" | "C" | "D";

interface ProjectPlan {
  id: string;
  nombre: string;
  descripcion: string;
  stack: string[];
  scoreValidator: number;
  hitos: {
    nombre: string;
    descripcion: string;
    semana: number;
    tareas: string[];
    evidencias: string[];
  }[];
  backlog: {
    titulo: string;
    como: string;
    quiero: string;
    para: string;
    prioridad: "Alta" | "Media" | "Baja";
  }[];
}

export default function EstudianteDashboard() {
  const [phase, setPhase] = useState<Phase>("A");
  const [idea, setIdea] = useState("");
  const [nombre, setNombre] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ProjectPlan | null>(null);

  // Poll for status in Phase B
  useEffect(() => {
    if (phase === "B" && projectId) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/proyectos/${projectId}/status`);
          const data = await res.json();
          if (data.status === "pending_approval") {
            setPlan({ ...data.propuesta, scoreValidator: data.scoreValidator ?? 0 });
            setPhase("C");
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error polling status:", err);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [phase, projectId]);

  const handleStartProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.length < 50) return;
    
    setPhase("B");
    try {
      const res = await fetch("/api/proyectos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, stack, nombre, alumnoId: "current_user_id" }) 
      });
      const data = await res.json();
      setProjectId(data.proyectoId);
    } catch (err) {
      console.error("Error starting project:", err);
    }
  };

  const addTag = () => {
    if (currentTag && !stack.includes(currentTag)) {
      setStack([...stack, currentTag]);
      setCurrentTag("");
    }
  };

  const removeTag = (tag: string) => {
    setStack(stack.filter(t => t !== tag));
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {phase === "A" && (
            <motion.div
              key="phaseA"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight mb-4">Comienza tu viaje</h1>
                <p className="text-zinc-400">Describe tu idea y deja que nuestra IA genere el plan maestro.</p>
              </div>

              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
                <form onSubmit={handleStartProject} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Nombre del proyecto</label>
                    <input 
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Eco-Tracker App"
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Describe tu idea (mínimo 50 caracteres)</label>
                    <textarea 
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Cuéntanos de qué trata tu proyecto..."
                      className="w-full h-32 bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Stack tecnológico</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {stack.map(tag => (
                        <span key={tag} className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)}><Trash2 className="w-3 h-3 hover:text-red-400" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        placeholder="Ej: React, FastAPI..."
                        className="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 focus:outline-none"
                      />
                      <button type="button" onClick={addTag} className="bg-zinc-800 p-3 rounded-xl"><Plus className="w-5 h-5" /></button>
                    </div>
                  </div>

                  <button type="submit" disabled={idea.length < 50} className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-lg shadow-white/5">
                    Generar plan con IA <ChevronRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {phase === "B" && (
            <motion.div key="phaseB" className="max-w-md mx-auto text-center">
              <div className="mb-12 relative">
                <div className="w-24 h-24 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                <Activity className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-8">Nuestros agentes están trabajando...</h2>
              <div className="space-y-4 text-left">
                {["Drafter", "Validator", "Product Owner", "Sistema"].map((agent, i) => (
                  <div key={agent} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-500">AG-00{i+1} {agent}</div>
                      <div className="text-sm text-zinc-200">Procesando información...</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "C" && plan && (
            <motion.div key="phaseC" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex justify-between items-center bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800/50">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{plan.nombre}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${plan.scoreValidator >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    Score: {plan.scoreValidator}/100
                  </span>
                </div>
                <button onClick={() => setPhase("D")} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
                  Confirmar plan <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <section className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400"><Code className="w-5 h-5" /> Propuesta Técnica</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed">{plan.descripcion}</p>
                  </section>
                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-400"><Calendar className="w-5 h-5" /> Roadmap</h3>
                    {plan.hitos.map((hito, i) => (
                      <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4">
                        <div className="flex justify-between font-bold text-sm mb-2"><span>Semana {hito.semana}: {hito.nombre}</span> <ChevronDown className="w-4 h-4" /></div>
                        <p className="text-xs text-zinc-500 mb-2">{hito.descripcion}</p>
                        <ul className="text-xs space-y-1">{hito.tareas.map((t, j) => <li key={j} className="flex gap-2"><CheckCircle2 className="w-3 h-3 text-indigo-500" /> {t}</li>)}</ul>
                      </div>
                    ))}
                  </section>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-400"><Layers className="w-5 h-5" /> Historias de Usuario</h3>
                  {plan.backlog.map((story, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{story.prioridad}</span>
                      <p className="text-sm font-semibold">{story.titulo}</p>
                      <p className="text-[11px] text-zinc-500">"Como {story.como}, quiero {story.quiero}..."</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {phase === "D" && plan && (
            <motion.div key="phaseD" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-8">
                <div className="bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800/50 flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{plan.nombre}</h1>
                    <div className="flex items-center gap-2 text-emerald-500"><Activity className="w-4 h-4 animate-pulse" /> <span className="text-xs font-bold uppercase">Activo</span></div>
                  </div>
                  <div className="text-right"><div className="text-3xl font-bold text-indigo-400">12%</div><div className="text-[10px] text-zinc-500 uppercase">Progreso</div></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plan.hitos.map((hito, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl space-y-4">
                      <h4 className="font-bold text-sm">Semana {hito.semana}: {hito.nombre}</h4>
                      <ul className="space-y-2 text-xs text-zinc-400">{hito.tareas.slice(0, 3).map((t, j) => <li key={j} className="flex gap-2 items-center"><div className="w-3 h-3 rounded border border-zinc-800" /> {t}</li>)}</ul>
                      <button className="w-full bg-zinc-800 py-2 rounded-lg text-xs font-bold flex justify-center gap-2"><Plus className="w-3 h-3" /> Subir Evidencia</button>
                    </div>
                  ))}
                </div>
              </div>
              <aside className="space-y-6">
                <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Métricas</h3>
                  <div className="flex justify-between text-xs"><span>Integridad</span><span className="text-indigo-400">92/100</span></div>
                  <div className="h-1 bg-zinc-950 rounded-full"><div className="h-full bg-indigo-500 w-[92%]" /></div>
                  <div className="pt-4 border-t border-zinc-800"><div className="text-xs text-zinc-500 mb-2">Competencias</div>{['Backend Architecture', 'Cloud'].map(c => <div key={c} className="flex gap-2 text-xs text-zinc-300"><Trophy className="w-3 h-3 text-amber-500" /> {c}</div>)}</div>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-2xl"><div className="flex gap-2 text-red-400 mb-2"><AlertCircle className="w-4 h-4" /><span className="text-xs font-bold uppercase">DevOps</span></div><p className="text-[11px] text-zinc-500">AG-DEVOPS: Alerta detectada en hito 4.</p></div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
