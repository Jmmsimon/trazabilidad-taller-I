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
  loginAsGuest: (role: "estudiante" | "profesor") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  rol: null,
  loading: true,
  loginGoogle: async () => {},
  loginAsGuest: async () => {},
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
          // Check if there is a guest session
          const savedGuest = localStorage.getItem("guest_session");
          if (savedGuest) {
            try {
              const { user: guestUser, rol: guestRol } = JSON.parse(savedGuest);
              setUser(guestUser);
              setRol(guestRol);
            } catch {
              localStorage.removeItem("guest_session");
              setUser(null);
              setRol(null);
            }
          } else {
            setUser(null);
            setRol(null);
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

  const loginAsGuest = async (role: "estudiante" | "profesor") => {
    setLoading(true);
    try {
      const mockUser = {
        uid: `guest-${role}`,
        email: `invitado-${role}@trazabilidad.edu`,
        displayName: `Invitado (${role === "profesor" ? "Docente" : "Estudiante"})`,
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
    } catch (err) {
      console.error("Error logging in as guest:", err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error during API logout:", err);
    }
    localStorage.removeItem("guest_session");
    await signOut(auth);
    setUser(null);
    setRol(null);
  };

  return (
    <AuthContext.Provider value={{ user, rol, loading, loginGoogle, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
