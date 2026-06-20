"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ShieldAlert, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export function ForcePasswordChange() {
  const { user, setDebeCambiarContrasena, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!user) {
      setError("No hay una sesión activa de usuario.");
      return;
    }

    setLoading(true);
    try {
      // 1. Actualizar la contraseña en Firebase Authentication
      await updatePassword(user, newPassword);

      // 2. Actualizar el flag en Firestore para que no vuelva a pedirlo
      const userRef = doc(db, "usuarios", user.uid);
      await updateDoc(userRef, {
        debeCambiarContrasena: false
      });

      setSuccess(true);
      
      // Esperar 1.5s y permitir el acceso
      setTimeout(() => {
        setDebeCambiarContrasena(false);
      }, 1500);

    } catch (err: any) {
      console.error("Error al actualizar la contraseña:", err);
      if (err.code === "auth/requires-recent-login") {
        setError("Por seguridad, debes cerrar sesión e iniciar sesión nuevamente antes de cambiar tu contraseña.");
      } else {
        setError(err.message || "No se pudo actualizar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden font-sans p-4">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-50 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Actualizar Contraseña</h2>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-[280px]">
            Tu administrador creó esta cuenta con una contraseña temporal. Por seguridad, debes cambiarla para continuar.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
              <CheckCircle2 className="w-5 h-5 animate-bounce" />
            </div>
            <p className="text-emerald-700 text-sm font-bold">Contraseña actualizada</p>
            <p className="text-slate-400 text-xs mt-1">Redirigiéndote a tu entorno...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-150 text-red-655 text-xs font-semibold flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Guardar y Continuar"
                )}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar y Salir
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
