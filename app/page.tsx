"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Lock, Mail, ChevronRight, User, ShieldAlert, Sparkles, Loader2 } from "lucide-react";

// Form validation schema using Zod
const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, ingresa un correo válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type Role = "Estudiante" | "Profesor" | "Administrador";

const roles: { id: Role; icon: React.ReactNode; color: string }[] = [
  { id: "Estudiante", icon: <User className="w-4 h-4" />, color: "text-blue-400" },
  { id: "Profesor", icon: <GraduationCap className="w-4 h-4" />, color: "text-emerald-400" },
  { id: "Administrador", icon: <ShieldAlert className="w-4 h-4" />, color: "text-purple-400" },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>("Estudiante");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Login data:", { ...data, role: selectedRole });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Gradients & Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md p-8 relative z-10"
      >
        {/* Glassmorphism Container */}
        <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Inner ambient glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-500/50 to-transparent" />
          
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Trazabilidad Académica</h1>
            <p className="text-zinc-400 text-sm">Ingresa a tu cuenta para continuar</p>
          </div>

          {/* Role Selection */}
          <div className="mb-8">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 block">
              Selecciona tu rol
            </label>
            <div className="flex gap-2 p-1 bg-zinc-950/50 rounded-xl border border-zinc-800/50 relative">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 relative z-10
                    ${selectedRole === role.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                >
                  <span className={`mb-1 ${selectedRole === role.id ? role.color : ''}`}>
                    {role.icon}
                  </span>
                  <span className="text-[10px] font-medium">{role.id}</span>
                  {selectedRole === role.id && (
                    <motion.div 
                      layoutId="roleIndicator"
                      className="absolute inset-0 bg-zinc-800 rounded-lg shadow-md -z-10 border border-zinc-700/50"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="Correo institucional"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-xs px-1"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="Contraseña"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-xs px-1"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-950 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors" />
                  <svg className="absolute w-3 h-3 left-0.5 top-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Recordarme</span>
              </label>
              <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-black font-semibold rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed group mt-4 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>
          
        </div>
        
        {/* Footer info */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          Plataforma Segura • Sistema de Trazabilidad 2026
        </p>
      </motion.div>
    </div>
  );
}
