"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

interface AuthContextType {
  user: User | null;
  rol: "estudiante" | "profesor" | null;
  loading: boolean;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rol: null,
  loading: true,
  loginGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<"estudiante" | "profesor" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
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
              setRol(snap.data().rol ?? "estudiante");
            } else {
              // Primer login: crear como estudiante por defecto
              await setDoc(ref, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                nombre: firebaseUser.displayName,
                rol: "estudiante",
                creadoEn: new Date().toISOString(),
              });
              setRol("estudiante");
            }
          } catch (firestoreError) {
            console.error("Firestore error (ignoring for login):", firestoreError);
            setRol("estudiante"); // Default fallback so user is not blocked
          }
        } else {
          setUser(null);
          setRol(null);
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

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRol(null);
  };

  return (
    <AuthContext.Provider value={{ user, rol, loading, loginGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
