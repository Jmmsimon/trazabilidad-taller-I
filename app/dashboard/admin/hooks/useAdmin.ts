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

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usuarios/invitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          rol: inviteRol,
          nombre: inviteNombre || undefined,
          password: invitePassword || undefined,
        }),
      });

      if (!res.ok) throw new Error("Fallo al invitar usuario");

      setInviteEmail("");
      setInviteNombre("");
      setInvitePassword("");
      setInviteRol("profesor");
      setIsModalOpen(false);

      setSuccessMessage("Usuario pre-registrado correctamente.");
      setTimeout(() => setSuccessMessage(null), 4000);
      
      fetchUsuarios();
    } catch (err) {
      console.error(err);
      setError("No se pudo pre-registrar al usuario.");
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
