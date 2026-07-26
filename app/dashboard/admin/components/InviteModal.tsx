import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Loader2, AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteEmail: string;
  setInviteEmail: (val: string) => void;
  inviteNombre: string;
  setInviteNombre: (val: string) => void;
  invitePassword: string;
  setInvitePassword: (val: string) => void;
  inviteRol: "estudiante" | "profesor" | "administrador";
  setInviteRol: (val: "estudiante" | "profesor" | "administrador") => void;
  inviting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

// ─── Regex de validaciones ───────────────────────────────────────────────────
/** Solo letras (incluyendo tildes, ñ y diéresis) y espacios */
const NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

/**
 * Correo válido estricto:
 * - parte local: letras, dígitos, . _ % + -
 * - @ obligatorio
 * - dominio: letras, dígitos, - .
 * - TLD: mínimo 2 letras
 * Rechaza: acentos raros, ´ { } [ ] ! # $ & etc.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/** Caracteres permitidos en el campo email (uno a uno, mientras se escribe) */
const EMAIL_ALLOWED_CHARS = /^[a-zA-Z0-9._%+\-@]$/;

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
  onSubmit,
}: InviteModalProps) {
  // ─── Modo de Autenticación ─────────────────────────────────────────────
  const [authMethod, setAuthMethod] = useState<"google" | "manual">("google");

  // ─── Estado de errores por campo ─────────────────────────────────────────
  const [errEmail,    setErrEmail]    = useState<string | null>(null);
  const [errNombre,   setErrNombre]   = useState<string | null>(null);
  const [errPassword, setErrPassword] = useState<string | null>(null);
  const [touched,     setTouched]     = useState({ email: false, nombre: false, password: false });

  // Limpiar formulario y errores al abrir/cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      setAuthMethod("google");
      setErrEmail(null);
      setErrNombre(null);
      setErrPassword(null);
      setTouched({ email: false, nombre: false, password: false });
      setInviteEmail("");
      setInviteNombre("");
      setInvitePassword("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─── Validaciones individuales ────────────────────────────────────────────
  const validateEmail = (val: string) => {
    if (!val.trim()) return "El correo electrónico es obligatorio.";
    if (!EMAIL_REGEX.test(val.trim())) return "Ingresa un correo electrónico válido (ej. usuario@dominio.com).";
    return null;
  };

  const validateNombre = (val: string) => {
    if (!val.trim()) return null; // campo opcional
    if (val.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
    if (!NOMBRE_REGEX.test(val.trim()))
      return "El nombre solo puede contener letras (con tilde) y espacios. No se permiten números ni caracteres especiales.";
    return null;
  };

  const validatePassword = (val: string, method: "google" | "manual") => {
    if (method === "google") return null; // En modo Google no se usa contraseña
    if (!val) return "La contraseña es obligatoria para el registro con correo y contraseña.";
    if (val.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (val.length > 128) return "La contraseña no puede superar los 128 caracteres.";
    return null;
  };

  // ─── Handlers Correo ─────────────────────────────────────────────────────
  const handleEmailChange = (val: string) => {
    const clean = val.split("").filter((ch) => EMAIL_ALLOWED_CHARS.test(ch)).join("");
    setInviteEmail(clean);
    if (touched.email) setErrEmail(validateEmail(clean));
  };

  const handleEmailBlur = () => {
    setTouched((t) => ({ ...t, email: true }));
    setErrEmail(validateEmail(inviteEmail));
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key.length > 1 || 
      e.ctrlKey ||
      e.metaKey
    ) return;
    if (!EMAIL_ALLOWED_CHARS.test(e.key)) {
      e.preventDefault();
    }
  };

  // ─── Handlers Nombre ─────────────────────────────────────────────────────
  const handleNombreChange = (val: string) => {
    setInviteNombre(val);
    // Mostrar u ocultar el error inmediatamente mientras el usuario escribe
    setErrNombre(validateNombre(val));
  };

  const handleNombreBlur = () => {
    setTouched((t) => ({ ...t, nombre: true }));
    setErrNombre(validateNombre(inviteNombre));
  };

  // ─── Handlers Contraseña ──────────────────────────────────────────────────
  const handlePasswordChange = (val: string) => {
    setInvitePassword(val);
    if (touched.password) setErrPassword(validatePassword(val, authMethod));
  };

  const handlePasswordBlur = () => {
    setTouched((t) => ({ ...t, password: true }));
    setErrPassword(validatePassword(invitePassword, authMethod));
  };

  const handleMethodSwitch = (method: "google" | "manual") => {
    setAuthMethod(method);
    if (method === "google") {
      setInvitePassword("");
      setErrPassword(null);
    } else if (touched.password) {
      setErrPassword(validatePassword(invitePassword, "manual"));
    }
  };

  // ─── Submit: re-validar todo antes de enviar ──────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eEmail    = validateEmail(inviteEmail);
    const eNombre   = validateNombre(inviteNombre);
    const ePassword = validatePassword(invitePassword ?? "", authMethod);
    setErrEmail(eEmail);
    setErrNombre(eNombre);
    setErrPassword(ePassword);
    setTouched({ email: true, nombre: true, password: true });
    if (eEmail || eNombre || ePassword) return; // bloquear envío si hay errores
    onSubmit(e);
  };

  const isFormValid =
    !validateEmail(inviteEmail) &&
    !validateNombre(inviteNombre) &&
    !validatePassword(invitePassword ?? "", authMethod);

  // ─── Render ───────────────────────────────────────────────────────────────
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
            <p className="text-xs text-slate-500 mb-5 font-medium">
              Selecciona cómo se autenticará el usuario en la plataforma.
            </p>

            {/* ── Tabs Selector: Método de Autenticación ── */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 text-xs font-bold border border-slate-200/60">
              <button
                type="button"
                onClick={() => handleMethodSwitch("google")}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMethod === "google"
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50 font-extrabold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Acceso Google
              </button>
              <button
                type="button"
                onClick={() => handleMethodSwitch("manual")}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMethod === "manual"
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50 font-extrabold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <KeyRound className="w-4 h-4 text-indigo-500" />
                Correo y Contraseña
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* ── Correo Electrónico ── */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="correo@institucion.edu.pe"
                  value={inviteEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={handleEmailBlur}
                  onKeyDown={handleEmailKeyDown}
                  className={`w-full bg-slate-50 border rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errEmail
                      ? "border-red-400 focus:ring-red-300/50"
                      : "border-slate-200 focus:ring-indigo-500/50"
                  }`}
                />
                {errEmail && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errEmail}
                  </p>
                )}
              </div>

              {/* ── Nombre ── */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Nombre completo <span className="text-slate-400 font-normal normal-case">(Opcional)</span>
                </label>
                <input
                  id="invite-nombre"
                  type="text"
                  placeholder="Ej: Dr. Juan Pérez"
                  value={inviteNombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  onBlur={handleNombreBlur}
                  className={`w-full bg-slate-50 border rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errNombre
                      ? "border-red-400 focus:ring-red-300/50"
                      : "border-slate-200 focus:ring-indigo-500/50"
                  }`}
                />
                {errNombre && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errNombre}
                  </p>
                )}
              </div>

              {/* ── Campo Contraseña según el modo ── */}
              {authMethod === "google" ? (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-indigo-900 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    El usuario iniciará sesión vinculando su <strong>cuenta de Google</strong> con este correo. No requiere contraseña inicial.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Contraseña inicial <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="invite-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={invitePassword || ""}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={handlePasswordBlur}
                    className={`w-full bg-slate-50 border rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      errPassword
                        ? "border-red-400 focus:ring-red-300/50"
                        : "border-slate-200 focus:ring-indigo-500/50"
                    }`}
                  />
                  {errPassword && (
                    <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errPassword}
                    </p>
                  )}
                </div>
              )}

              {/* ── Rol ── */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Rol a Asignar <span className="text-red-500">*</span>
                </label>
                <select
                  id="invite-rol"
                  value={inviteRol}
                  onChange={(e) =>
                    setInviteRol(e.target.value as "estudiante" | "profesor" | "administrador")
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="profesor">Docente</option>
                  <option value="estudiante">Estudiante</option>
                </select>
              </div>

              {/* ── Botón Submit ── */}
              <div className="pt-2">
                <button
                  id="btn-registrar-usuario"
                  type="submit"
                  disabled={inviting || !isFormValid}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
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
