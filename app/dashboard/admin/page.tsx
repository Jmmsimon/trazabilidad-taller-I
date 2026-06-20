"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/auth-guard";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, Search, Shield, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { useAdmin } from "./hooks/useAdmin";
import { AdminMetrics } from "./components/AdminMetrics";
import { AdminTable } from "./components/AdminTable";
import { InviteModal } from "./components/InviteModal";
import { ROLE_LABELS } from "./types";

export default function AdminDashboard() {
  const router = useRouter();
  const {
    user,
    logout,
    usuarios,
    loading,
    error,
    isModalOpen,
    setIsModalOpen,
    inviteEmail,
    setInviteEmail,
    inviteNombre,
    setInviteNombre,
    invitePassword,
    setInvitePassword,
    inviteRol,
    setInviteRol,
    inviting,
    updatingUid,
    successMessage,
    fetchUsuarios,
    handleInviteUser,
    handleDeleteUser,
    handleToggleStatus,
  } = useAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("todos");

  // Filters
  const filteredUsers = usuarios.filter((u) => {
    const matchesSearch =
      (u.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "todos" || u.rol === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Count summaries
  const totalCount = usuarios.length;
  const estudiantesCount = usuarios.filter((u) => u.rol === "estudiante").length;
  const docentesCount = usuarios.filter((u) => u.rol === "profesor").length;

  return (
    <AuthGuard rolRequerido="administrador">
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden">
        {/* Soft elegant background glows (light theme friendly) */}
        <div className="absolute top-[-25%] left-[-15%] w-[70%] h-[70%] bg-indigo-50/50 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[70%] h-[70%] bg-purple-50/50 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
          {/* Navigation Bar */}
          <div className="backdrop-blur-md bg-white/70 border border-slate-200/60 rounded-2xl px-6 py-4 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-xs text-slate-500 font-semibold">
                Sesión activa: <strong className="text-slate-800">{user?.displayName || user?.email}</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-[10px] text-indigo-600 font-bold uppercase tracking-wider border border-indigo-100">
                Administrador
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-logout"
                onClick={async () => {
                  try {
                    await logout();
                  } catch (err) {
                    console.error("Error signing out:", err);
                  }
                  router.push("/");
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-650 text-xs font-bold transition-all shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir al Inicio
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                  Panel de Administración
                </h1>
              </div>
              <p className="text-slate-500 text-sm ml-13 pl-1 font-medium">
                Gestión de accesos y roles del sistema de trazabilidad
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Registrar Usuario
              </button>
              <button
                onClick={fetchUsuarios}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Sincronizar
              </button>
            </div>
          </div>

          <AdminMetrics 
            totalCount={totalCount} 
            estudiantesCount={estudiantesCount} 
            docentesCount={docentesCount} 
          />

          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 text-sm font-medium"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400 shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              {["todos", "estudiante", "profesor"].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                    roleFilter === role
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm"
                  }`}
                >
                  {role === "profesor" ? "Docentes" : role === "todos" ? "Todos" : ROLE_LABELS[role] + "s"}
                </button>
              ))}
            </div>
          </div>

          <AdminTable 
            loading={loading}
            filteredUsers={filteredUsers}
            updatingUid={updatingUid}
            currentUserId={user?.uid}
            handleToggleStatus={handleToggleStatus}
            handleDeleteUser={handleDeleteUser}
          />
        </div>

        <InviteModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          inviteNombre={inviteNombre}
          setInviteNombre={setInviteNombre}
          invitePassword={invitePassword}
          setInvitePassword={setInvitePassword}
          inviteRol={inviteRol}
          setInviteRol={setInviteRol}
          inviting={inviting}
          onSubmit={handleInviteUser}
        />
      </div>
    </AuthGuard>
  );
}
