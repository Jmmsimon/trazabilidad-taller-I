"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ForcePasswordChange } from "./ForcePasswordChange";

interface AuthGuardProps {
  children: React.ReactNode;
  rolRequerido?: "estudiante" | "profesor" | "administrador";
}

export function AuthGuard({ children, rolRequerido }: AuthGuardProps) {
  const { user, rol, loading, debeCambiarContrasena } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      } else if (rolRequerido && rol !== rolRequerido) {
        // Redirige al dashboard correcto si el rol no coincide
        if (rol === "administrador") {
          router.push("/dashboard/admin");
        } else if (rol === "profesor") {
          router.push("/dashboard/profesor");
        } else {
          router.push("/dashboard/estudiante");
        }
      }
    }
  }, [user, rol, loading, rolRequerido, router]);

  if (loading || !user || (rolRequerido && rol !== rolRequerido)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (debeCambiarContrasena === true) {
    return <ForcePasswordChange />;
  }

  return <>{children}</>;
}
