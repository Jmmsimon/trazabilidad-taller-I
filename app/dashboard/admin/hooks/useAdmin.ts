import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "../types";
import { useAuth } from "@/lib/auth-context";

export function useAdmin() {
  const { user, logout } = useAuth();
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNombre, setInviteNombre] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRol, setInviteRol] = useState<"estudiante" | "profesor" | "administrador">("profesor");
  const [inviting, setInviting] = useState(false);

  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usuarios");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UserProfile[] = await res.json();
      setUsuarios(data.filter((u) => u.rol !== "administrador"));
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // ─── Validaciones del formulario de registro ────────────────────────────
  const NOMBRE_REGEX = /^[a-zA-Z\u00C0-\u024F\u00f1\u00d1\s.'\-]+$/;
  const EMAIL_REGEX  = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validar correo ──────────────────────────────────────────────────────
    if (!inviteEmail.trim()) {
      setError("El correo electrónico es obligatorio.");
      return;
    }
    if (!EMAIL_REGEX.test(inviteEmail.trim())) {
      setError("El correo electrónico no tiene un formato válido (ej. usuario@dominio.com).");
      return;
    }

    // ── Validar nombre (opcional pero si se llena, solo letras) ────────────
    if (inviteNombre.trim() && !NOMBRE_REGEX.test(inviteNombre.trim())) {
      setError("El nombre solo puede contener letras y espacios. No se permiten números ni caracteres especiales.");
      return;
    }
    if (inviteNombre.trim() && inviteNombre.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    // ── Validar contraseña (opcional pero si se llena, mín. 6 caracteres) ──
    if (invitePassword && invitePassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (invitePassword && invitePassword.length > 128) {
      setError("La contraseña no puede superar los 128 caracteres.");
      return;
    }

    setInviting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usuarios/invitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          rol: inviteRol,
          nombre: inviteNombre.trim() || undefined,
          password: invitePassword || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || "Fallo al invitar usuario");
      }

      setInviteEmail("");
      setInviteNombre("");
      setInvitePassword("");
      setInviteRol("profesor");
      setIsModalOpen(false);

      setSuccessMessage("Usuario pre-registrado correctamente.");
      setTimeout(() => setSuccessMessage(null), 4000);

      fetchUsuarios();
    } catch (err: any) {
      console.error(err);
      // Mensaje amigable para correo duplicado en Firebase
      const msg: string = err?.message ?? "";
      if (msg.includes("already") || msg.includes("duplicado") || msg.includes("exists")) {
        setError("Este correo ya está registrado en el sistema.");
      } else {
        setError("No se pudo pre-registrar al usuario. Verifica los datos e inténtalo de nuevo.");
      }
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    const targetUser = usuarios.find((u) => u.uid === uid);
    const confirmName = targetUser?.nombre || targetUser?.email;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${confirmName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setUpdatingUid(uid);
    setSuccessMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${uid}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Fallo al eliminar usuario");

      setUsuarios((prev) => prev.filter((u) => u.uid !== uid));
      setSuccessMessage(`Usuario ${confirmName} eliminado correctamente.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar al usuario.");
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleToggleStatus = async (uid: string, currentDeshabilitado: boolean) => {
    const nuevoEstado = !currentDeshabilitado;
    setUpdatingUid(uid);
    setSuccessMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${uid}/estado-cuenta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deshabilitado: nuevoEstado }),
      });

      if (!res.ok) throw new Error("Fallo al cambiar estado de cuenta");

      setUsuarios((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, deshabilitado: nuevoEstado } : u))
      );

      const targetUser = usuarios.find((u) => u.uid === uid);
      const nombre = targetUser?.nombre || targetUser?.email;
      setSuccessMessage(`Cuenta de ${nombre} ${nuevoEstado ? "deshabilitada" : "habilitada"} correctamente.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setError("No se pudo cambiar el estado del usuario.");
    } finally {
      setUpdatingUid(null);
    }
  };

  return {
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
  };
}
