export interface UserProfile {
  uid: string;
  email: string;
  nombre?: string;
  rol: "estudiante" | "profesor" | "administrador";
  creadoEn?: string;
  deshabilitado?: boolean;
}

export const ROLE_LABELS: Record<string, string> = {
  estudiante: "Estudiante",
  profesor: "Docente",
  administrador: "Administrador",
};

export const ROLE_BADGES: Record<string, string> = {
  estudiante: "bg-blue-50 text-blue-700 border border-blue-200",
  profesor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  administrador: "bg-purple-50 text-purple-700 border border-purple-200",
};
