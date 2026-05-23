"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";

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

export default function LoginPage() {
  const { user, rol, loading, loginGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Redirigir según rol
      if (rol === "profesor") {
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
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Trazabilidad Académica</h1>
          <p className="text-zinc-400 text-sm">
            Plataforma de gestión de proyectos con IA
          </p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          <p className="text-zinc-400 text-sm text-center mb-6">
            Inicia sesión con tu cuenta institucional de Google
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-950/50 border border-red-800/50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300 leading-snug">{error}</p>
            </div>
          )}

          <button
            id="btn-google-login"
            disabled={isSigningIn}
            onClick={async () => {
              setError(null);
              setIsSigningIn(true);
              try {
                await loginGoogle();
              } catch (err: unknown) {
                const code = (err as { code?: string })?.code ?? "";
                if (code === "auth/popup-blocked") {
                  setError("El navegador bloqueó la ventana emergente. Permite los popups para este sitio e intenta de nuevo.");
                } else if (code === "auth/unauthorized-domain") {
                  setError(`Dominio no autorizado en Firebase. Agrega "${window.location.hostname}" en Firebase Console → Authentication → Settings → Authorized domains.`);
                } else if (code === "auth/popup-closed-by-user") {
                  setError(null); // El usuario cerró el popup, no es un error real
                } else {
                  setError(`Error: ${code || (err as Error).message}`);
                }
              } finally {
                setIsSigningIn(false);
              }
            }}
            className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {isSigningIn ? "Conectando..." : "Continuar con Google"}
          </button>

          <div className="mt-4">
            <button
              id="btn-guest-bypass"
              onClick={() => router.push("/dashboard/estudiante")}
              className="w-full bg-transparent text-zinc-500 text-xs py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 transition-all"
            >
              Probar como Invitado (Bypass)
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            {/* The role is automatically assigned based on the user account */}
          </div>

          <p className="text-[11px] text-zinc-600 text-center mt-4">
            El rol (estudiante / profesor) se asigna automáticamente según tu cuenta.
          </p>
        </div>
      </div>
    </div>
  );
}
