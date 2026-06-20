"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sparkles, BookOpen, GraduationCap, Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { user, rol, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (rol === "administrador") {
        router.push("/dashboard/admin");
      } else if (rol === "profesor") {
        router.push("/dashboard/profesor");
      } else {
        router.push("/dashboard/estudiante");
      }
    }
  }, [user, rol, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl px-6 py-12 flex flex-col items-center">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mb-16 space-y-4"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-650 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            Trazabilidad Académica
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
            Plataforma inteligente de gestión de proyectos y desarrollo de competencias académicas basada en IA.
          </p>
        </motion.div>

        {/* Portal Selection Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl"
        >
          {/* Student Card */}
          <div
            onClick={() => router.push("/estudiante")}
            className="group backdrop-blur-xl bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800/60 hover:border-indigo-500/40 rounded-3xl p-8 flex flex-col justify-between h-72 shadow-2xl transition-all duration-300 cursor-pointer hover:shadow-indigo-500/5 hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">
                Portal Estudiantes
              </h2>
              <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                Envía tus propuestas borrador, visualiza el tablero kanban de issues y haz seguimiento de tus competencias académicas.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Teacher Card */}
          <div
            onClick={() => router.push("/docente")}
            className="group backdrop-blur-xl bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800/60 hover:border-emerald-500/40 rounded-3xl p-8 flex flex-col justify-between h-72 shadow-2xl transition-all duration-300 cursor-pointer hover:shadow-emerald-500/5 hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">
                Portal Docentes
              </h2>
              <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                Revisa y retroalimenta propuestas, supervisa Sprints e hitos observados, y califica competencias basadas en commits de código.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Admin Card */}
          <div
            onClick={() => router.push("/administrador")}
            className="group backdrop-blur-xl bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800/60 hover:border-purple-500/40 rounded-3xl p-8 flex flex-col justify-between h-72 shadow-2xl transition-all duration-300 cursor-pointer hover:shadow-purple-500/5 hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">
                Administración
              </h2>
              <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                Configura accesos, pre-registra y administra los perfiles de docentes y estudiantes en la base de datos de trazabilidad.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 group-hover:text-purple-300 transition-colors">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
