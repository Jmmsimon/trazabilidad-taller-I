"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithRedirect,
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
      setUser(firebaseUser);
      if (firebaseUser) {
        // Obtener o crear perfil en Firestore
        const ref = doc(db, "usuarios", firebaseUser.uid);
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
      } else {
        setRol(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loginGoogle = async () => {
    // Errors are intentionally NOT caught here so the UI can handle them
    await signInWithRedirect(auth, googleProvider);
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
