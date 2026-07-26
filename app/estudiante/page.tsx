"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, AlertCircle, Loader2, Lock, Mail, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Regex de validaciones ───────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const EMAIL_ALLOWED_CHARS = /^[a-zA-Z0-9._%+\-@]$/;

export function validateEmail(val: string) {
  if (!val.trim()) return "El correo electrónico es obligatorio.";
  if (!EMAIL_REGEX.test(val.trim())) return "Ingresa un correo electrónico válido (ej. usuario@dominio.com).";
  return null;
}

export function validatePassword(val: string) {
  if (!val) return "La contraseña es obligatoria.";
  if (val.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  return null;
}

export default function EstudianteLoginPage() {
  const { user, rol, loading, loginGoogle, loginWithEmail, logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Form states & validation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [errPassword, setErrPassword] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    if (!loading && user) {
      if (rol === "estudiante") {
        router.push("/dashboard/estudiante");
      } else if (rol) {
        logout();
        setError("Esta cuenta no está registrada como Estudiante.");
      }
    }
  }, [user, rol, loading, router, logout]);

  // ── Handlers Correo ──
  const handleEmailChange = (val: string) => {
    const clean = val.split("").filter((ch) => EMAIL_ALLOWED_CHARS.test(ch)).join("");
    setEmail(clean);
    if (touched.email) setErrEmail(validateEmail(clean));
  };

  const handleEmailBlur = () => {
    setTouched((t) => ({ ...t, email: true }));
    setErrEmail(validateEmail(email));
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
    if (!EMAIL_ALLOWED_CHARS.test(e.key)) {
      e.preventDefault();
    }
  };

  // ── Handlers Contraseña ──
  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (touched.password) setErrPassword(validatePassword(val));
  };

  const handlePasswordBlur = () => {
    setTouched((t) => ({ ...t, password: true }));
    setErrPassword(validatePassword(password));
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await loginGoogle();
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/popup-blocked") {
        setError("El navegador bloqueó la ventana emergente. Permite los popups e intenta de nuevo.");
      } else if (code === "auth/unauthorized-domain") {
        setError("Dominio no autorizado en Firebase.");
      } else if (code === "auth/popup-closed-by-user") {
        setError(null);
      } else {
        setError(`Error: ${code || err.message}`);
      }
      setIsSigningIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const eEmail = validateEmail(email);
    const ePassword = validatePassword(password);
    setErrEmail(eEmail);
    setErrPassword(ePassword);
    setTouched({ email: true, password: true });

    if (eEmail || ePassword) return;

    setError(null);
    setIsSigningIn(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        setError("Correo electrónico o contraseña incorrectos.");
      } else {
        setError(`Error: ${code || err.message}`);
      }
      setIsSigningIn(false);
    }
  };

  const isFormInvalid = !!validateEmail(email) || !!validatePassword(password);

  if (loading || (user && rol === "estudiante")) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-650/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Back navigation */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-650 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Portal de Estudiantes</h1>
          <p className="text-zinc-400 text-xs mt-1.5">
            Ingresa a tu entorno de trazabilidad académica
          </p>
        </div>

        {/* Form Card */}
        <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 shadow-2xl space-y-6">
          {error && (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800/50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300 leading-snug">{error}</p>
            </div>
          )}

          {/* Google Access */}
          <button
            disabled={isSigningIn}
            onClick={handleGoogleLogin}
            className="w-full bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-sm"
          >
            {isSigningIn ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {isSigningIn ? "Conectando..." : "Continuar con Google"}
          </button>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-800/80"></div>
            <span className="flex-shrink mx-4 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">o iniciar con correo</span>
            <div className="flex-grow border-t border-zinc-800/80"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLogin} noValidate className="space-y-4">
            {/* ── Email Field ── */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-600" />
                <input
                  id="email-student"
                  type="email"
                  required
                  placeholder="alumno@institucion.edu.pe"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={handleEmailBlur}
                  onKeyDown={handleEmailKeyDown}
                  className={`w-full bg-zinc-950/60 border rounded-xl py-3 pl-11 pr-4 text-zinc-200 text-xs sm:text-sm focus:outline-none focus:ring-2 transition-colors placeholder:text-zinc-700 ${
                    errEmail
                      ? "border-red-500/80 focus:ring-red-500/30"
                      : "border-zinc-800 focus:ring-indigo-500/50"
                  }`}
                />
              </div>
              {errEmail && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errEmail}
                </p>
              )}
            </div>

            {/* ── Password Field ── */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-600" />
                <input
                  id="password-student"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={handlePasswordBlur}
                  className={`w-full bg-zinc-950/60 border rounded-xl py-3 pl-11 pr-4 text-zinc-200 text-xs sm:text-sm focus:outline-none focus:ring-2 transition-colors placeholder:text-zinc-700 ${
                    errPassword
                      ? "border-red-500/80 focus:ring-red-500/30"
                      : "border-zinc-800 focus:ring-indigo-500/50"
                  }`}
                />
              </div>
              {errPassword && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errPassword}
                </p>
              )}
            </div>

            <button
              id="btn-login-student"
              type="submit"
              disabled={isSigningIn || isFormInvalid}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              {isSigningIn && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSigningIn ? "Iniciando Sesión..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
