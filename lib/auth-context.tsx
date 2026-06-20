"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

interface AuthContextType {
  user: User | null;
  rol: "estudiante" | "profesor" | "administrador" | null;
  loading: boolean;
  debeCambiarContrasena: boolean | null;
  setDebeCambiarContrasena: React.Dispatch<React.SetStateAction<boolean | null>>;
  loginGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginAsGuest: (role: "estudiante" | "profesor" | "administrador") => Promise<void>;
  logout: () => Promise<void>;
}

const ADMIN_EMAILS = [
  "jeansimon176@gmail.com",
  "administrador@upao.edu.pe"
];

const AuthContext = createContext<AuthContextType>({
  user: null,
  rol: null,
  loading: true,
  debeCambiarContrasena: null,
  setDebeCambiarContrasena: () => {},
  loginGoogle: async () => {},
  loginWithEmail: async () => {},
  loginAsGuest: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<"estudiante" | "profesor" | "administrador" | null>(null);
  const [loading, setLoading] = useState(true);
  const [debeCambiarContrasena, setDebeCambiarContrasena] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          localStorage.removeItem("guest_session");
          setUser(firebaseUser);
          
          // Configurar cookie para el middleware de Next.js
          const token = await firebaseUser.getIdToken();
          await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
          });

          // Obtener o crear perfil en Firestore
          const ref = doc(db, "usuarios", firebaseUser.uid);
          try {
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const uData = snap.data();
              if (uData.deshabilitado === true) {
                await signOut(auth);
                await fetch("/api/auth/logout", { method: "POST" });
                setUser(null);
                setRol(null);
                setDebeCambiarContrasena(null);
                window.location.href = "/?error=account_disabled";
                return;
              }
              setRol(uData.rol ?? "estudiante");
              setDebeCambiarContrasena(!!uData.debeCambiarContrasena);
            } else {
              // Verificar si es administrador configurado por defecto
              const isAdminEmail = ADMIN_EMAILS.includes(firebaseUser.email ?? "");
              
              if (isAdminEmail) {
                await setDoc(ref, {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  nombre: firebaseUser.displayName,
                  rol: "administrador",
                  creadoEn: new Date().toISOString(),
                });
                setRol("administrador");
                setDebeCambiarContrasena(false);
              } else {
                // Importar dinámicamente métodos de consulta para verificar si fue invitado por correo
                const { collection, query, where, getDocs, deleteDoc } = await import("firebase/firestore");
                const q = query(collection(db, "usuarios"), where("email", "==", firebaseUser.email));
                const querySnap = await getDocs(q);

                if (!querySnap.empty) {
                  const preRegDoc = querySnap.docs[0];
                  const preRegData = preRegDoc.data();

                  // Enlazar al UID real
                  await setDoc(ref, {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    nombre: firebaseUser.displayName || preRegData.nombre || "Usuario Invitado",
                    rol: preRegData.rol ?? "estudiante",
                    creadoEn: preRegData.creadoEn || new Date().toISOString(),
                    debeCambiarContrasena: preRegData.debeCambiarContrasena ?? false,
                  });

                  // Eliminar el documento temporal (si tiene un ID temporal generado con prefijo 'invited-')
                  if (preRegDoc.id !== firebaseUser.uid) {
                    await deleteDoc(preRegDoc.ref);
                  }

                  setRol(preRegData.rol ?? "estudiante");
                  setDebeCambiarContrasena(!!preRegData.debeCambiarContrasena);
                } else {
                  // Primer login común: crear como estudiante por defecto
                  await setDoc(ref, {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    nombre: firebaseUser.displayName,
                    rol: "estudiante",
                    creadoEn: new Date().toISOString(),
                  });
                  setRol("estudiante");
                  setDebeCambiarContrasena(false);
                }
              }
            }
          } catch (firestoreError) {
            console.error("Firestore error (ignoring for login):", firestoreError);
            setRol("estudiante"); // Default fallback so user is not blocked
            setDebeCambiarContrasena(false);
          }
        } else {
          // Check if there is a guest session
          const savedGuest = localStorage.getItem("guest_session");
          if (savedGuest) {
            try {
              const { user: guestUser, rol: guestRol } = JSON.parse(savedGuest);
              setUser(guestUser);
              setRol(guestRol);
              setDebeCambiarContrasena(false);
            } catch {
              localStorage.removeItem("guest_session");
              setUser(null);
              setRol(null);
              setDebeCambiarContrasena(null);
            }
          } else {
            setUser(null);
            setRol(null);
            setDebeCambiarContrasena(null);
          }
        }
      } catch (err) {
        console.error("Auth context error:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loginGoogle = async () => {
    // Errors are intentionally NOT caught here so the UI can handle them
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginAsGuest = async (role: "estudiante" | "profesor" | "administrador") => {
    setLoading(true);
    try {
      const displayLabel = role === "profesor" ? "Docente" : role === "administrador" ? "Administrador" : "Estudiante";
      const mockUser = {
        uid: `guest-${role}`,
        email: `invitado-${role}@trazabilidad.edu`,
        displayName: `Invitado (${displayLabel})`,
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        tenantId: null,
      } as unknown as User;

      // Set cookie for Next.js middleware using our login API
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: `mock-token-${role}` }),
      });

      // Save to localStorage
      localStorage.setItem(
        "guest_session",
        JSON.stringify({ user: mockUser, rol: role })
      );

      setUser(mockUser);
      setRol(role);
      setDebeCambiarContrasena(false);
    } catch (err) {
      console.error("Error logging in as guest:", err);
    } finally {
      setLoading(false);
    }
  };  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error during API logout:", err);
    }
    localStorage.removeItem("guest_session");
    await signOut(auth);
    setUser(null);
    setRol(null);
    setDebeCambiarContrasena(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        rol,
        loading,
        debeCambiarContrasena,
        setDebeCambiarContrasena,
        loginGoogle,
        loginWithEmail,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
