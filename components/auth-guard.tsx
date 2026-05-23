"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  rolRequerido?: "estudiante" | "profesor";
}

export function AuthGuard({ children, rolRequerido }: AuthGuardProps) {
  const { user, rol, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (rolRequerido && rol !== rolRequerido) {
        // Redirige al dashboard correcto si el rol no coincide
        router.push(
          rol === "profesor" ? "/dashboard/profesor" : "/dashboard/estudiante"
        );
      }
    }
  }, [user, rol, loading, rolRequerido, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
