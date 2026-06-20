import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Users, UserCheck, UserX, Trash2 } from "lucide-react";
import { UserProfile, ROLE_LABELS, ROLE_BADGES } from "../types";

interface AdminTableProps {
  loading: boolean;
  filteredUsers: UserProfile[];
  updatingUid: string | null;
  currentUserId?: string;
  handleToggleStatus: (uid: string, currentDeshabilitado: boolean) => void;
  handleDeleteUser: (uid: string) => void;
}

export function AdminTable({
  loading,
  filteredUsers,
  updatingUid,
  currentUserId,
  handleToggleStatus,
  handleDeleteUser
}: AdminTableProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
      {loading && filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-500 text-sm">Cargando usuarios registrados...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Users className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 text-sm">No se encontraron usuarios coincidentes.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">ID de Registro / Correo</th>
                <th className="px-6 py-4">Rol de Sistema</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredUsers.map((userProfile) => {
                  const defaultNombre = userProfile.rol === "administrador" ? "Administrador del Sistema" : "Invitado sin nombre";
                  const nombreAMostrar = userProfile.nombre || defaultNombre;
                  return (
                    <motion.tr
                      key={userProfile.uid}
                      layout
                      className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                        userProfile.deshabilitado ? "opacity-60 bg-slate-100/50" : ""
                      }`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold uppercase text-xs">
                            {nombreAMostrar.charAt(0)}
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${userProfile.deshabilitado ? "text-slate-500 line-through" : "text-slate-800"}`}>
                              {nombreAMostrar}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {userProfile.creadoEn ? `Creado: ${new Date(userProfile.creadoEn).toLocaleDateString()}` : "Pre-registro (Pendiente login)"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-slate-600 text-sm">{userProfile.email}</div>
                        <div className="text-[10px] text-slate-400 select-all font-mono mt-0.5">{userProfile.uid}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${ROLE_BADGES[userProfile.rol]}`}>
                            {ROLE_LABELS[userProfile.rol]}
                          </span>
                          {userProfile.deshabilitado && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
                              Suspendido
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {updatingUid === userProfile.uid ? (
                          <div className="flex items-center justify-end gap-1.5 py-1 text-slate-500 text-xs">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                            <span>Actualizando...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2.5">
                            {userProfile.uid === currentUserId && (
                              <span className="text-[10px] text-slate-500 italic pr-1">
                                (Tú)
                              </span>
                            )}

                            {/* Acciones de Cuenta (Deshabilitar / Eliminar) */}
                            {userProfile.uid !== currentUserId && (
                              <div className="flex items-center gap-1.5 pl-2.5">
                                {/* Habilitar / Deshabilitar */}
                                <button
                                  onClick={() => handleToggleStatus(userProfile.uid, !!userProfile.deshabilitado)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    userProfile.deshabilitado
                                      ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600"
                                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500"
                                  }`}
                                  title={userProfile.deshabilitado ? "Habilitar Cuenta" : "Deshabilitar Cuenta"}
                                >
                                  {userProfile.deshabilitado ? (
                                    <UserCheck className="w-4 h-4" />
                                  ) : (
                                    <UserX className="w-4 h-4" />
                                  )}
                                </button>

                                {/* Eliminar */}
                                <button
                                  onClick={() => handleDeleteUser(userProfile.uid)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 text-red-500 transition-all cursor-pointer"
                                  title="Eliminar Usuario"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
