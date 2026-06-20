import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Loader2 } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteEmail: string;
  setInviteEmail: (val: string) => void;
  inviteNombre: string;
  setInviteNombre: (val: string) => void;
  invitePassword?: string;
  setInvitePassword?: (val: string) => void;
  inviteRol: "estudiante" | "profesor" | "administrador";
  setInviteRol: (val: "estudiante" | "profesor" | "administrador") => void;
  inviting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function InviteModal({
  isOpen,
  onClose,
  inviteEmail,
  setInviteEmail,
  inviteNombre,
  setInviteNombre,
  invitePassword,
  setInvitePassword,
  inviteRol,
  setInviteRol,
  inviting,
  onSubmit
}: InviteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-md overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Pre-registrar Usuario
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              El usuario podrá iniciar sesión con Google (se vinculará a este correo) o usando la contraseña que definas aquí.
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="correo@institucion.edu.pe"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Nombre Opcional */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Nombre (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Dr. Juan Pérez"
                  value={inviteNombre}
                  onChange={(e) => setInviteNombre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Contraseña Opcional */}
              {setInvitePassword && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Contraseña (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Dejar en blanco para acceso solo con Google"
                    value={invitePassword || ""}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              )}

              {/* Rol */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Rol a Asignar
                </label>
                <select
                  value={inviteRol}
                  onChange={(e) => setInviteRol(e.target.value as "estudiante" | "profesor" | "administrador")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="profesor">Docente</option>
                  <option value="estudiante">Estudiante</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                    </>
                  ) : (
                    "Registrar Usuario"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
