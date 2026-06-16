import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { apiClient } from "@/integrations/turso/client";

type AppRole = "superadmin" | "clientadmin" | "student";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: AppRole | null;
  clientId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    clientId?: string,
  ) => Promise<{ error: any }>;
  signInWithGoogle: (clientId?: string) => Promise<{ error: any }>;
  signInAnonymously: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = ["superadmin", "clientadmin", "student"];

const CACHE_KEY_ROLE = "kiro_cached_role";
const CACHE_KEY_CLIENT = "kiro_cached_client_id";

function readCache(): { role: AppRole | null; clientId: string | null } {
  return {
    role: (localStorage.getItem(CACHE_KEY_ROLE) as AppRole | null) ?? null,
    clientId: localStorage.getItem(CACHE_KEY_CLIENT) ?? null,
  };
}

function writeCache(role: AppRole, clientId: string | null) {
  localStorage.setItem(CACHE_KEY_ROLE, role);
  if (clientId) localStorage.setItem(CACHE_KEY_CLIENT, clientId);
  else localStorage.removeItem(CACHE_KEY_CLIENT);
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY_ROLE);
  localStorage.removeItem(CACHE_KEY_CLIENT);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cache = readCache();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(cache.role === null);
  const [role, setRole] = useState<AppRole | null>(cache.role);
  const [clientId, setClientId] = useState<string | null>(cache.clientId);

  const applyRole = useCallback(
    (data: { role: string; client_id: string | null }[]) => {
      if (!data || data.length === 0) {
        clearCache();
        setRole(null);
        setClientId(null);
        return;
      }
      const best = [...data].sort(
        (a, b) =>
          ROLE_PRIORITY.indexOf(a.role as AppRole) -
          ROLE_PRIORITY.indexOf(b.role as AppRole),
      )[0];
      const r = best.role as AppRole;
      const c = best.client_id ?? null;
      writeCache(r, c);
      setRole(r);
      setClientId(c);
    },
    [],
  );

  const fetchUserRole = useCallback(
    async (firebaseUser: User): Promise<void> => {
      try {
        const token = await firebaseUser.getIdToken();
        const res = await apiClient("/api/user-roles", { token });
        applyRole(res ?? []);
      } catch (err) {
        console.error("fetchUserRole error:", err);
      }
    },
    [applyRole],
  );

  const refreshRole = useCallback(async () => {
    if (user) await fetchUserRole(user);
  }, [user, fetchUserRole]);

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase auth not initialized");
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          if (cache.role === null) {
            await fetchUserRole(firebaseUser);
            setLoading(false);
          } else {
            setLoading(false);
            fetchUserRole(firebaseUser); // background refresh
          }
        } else {
          clearCache();
          setRole(null);
          setClientId(null);
          setLoading(false);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (!auth) throw new Error("Firebase not initialized");
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err: any) {
      console.error("Sign in error:", err);
      return { error: { message: friendlyFirebaseError(err.code) } };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    clientId?: string,
  ) => {
    try {
      if (!auth) throw new Error("Firebase not initialized");
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Set display name in Firebase
      await updateProfile(newUser, { displayName: name });

      // Store profile + role in Turso via backend API
      const token = await newUser.getIdToken();
      await apiClient("/api/profiles", {
        token,
        method: "POST",
        body: { id: newUser.uid, name, email, client_id: clientId ?? null },
      });
      await apiClient("/api/user-roles", {
        token,
        method: "POST",
        body: {
          user_id: newUser.uid,
          role: "student",
          client_id: clientId ?? null,
        },
      });

      return { error: null };
    } catch (err: any) {
      console.error("Sign up error:", err);
      return { error: { message: friendlyFirebaseError(err.code) } };
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    clearCache();
    setUser(null);
    setRole(null);
    setClientId(null);
  };

  const signInWithGoogle = async (clientId?: string) => {
    try {
      if (!auth) throw new Error("Firebase not initialized");
      const provider = new GoogleAuthProvider();
      const { user: googleUser } = await signInWithPopup(auth, provider);

      // Check if user exists in Turso, if not create profile
      const token = await googleUser.getIdToken();
      try {
        // Try to fetch existing profile
        await apiClient("/api/profiles", { token });
      } catch {
        // Profile doesn't exist, create it
        await apiClient("/api/profiles", {
          token,
          method: "POST",
          body: {
            id: googleUser.uid,
            name: googleUser.displayName || "Google User",
            email: googleUser.email,
            client_id: clientId ?? null,
          },
        });

        // Create student role
        await apiClient("/api/user-roles", {
          token,
          method: "POST",
          body: {
            user_id: googleUser.uid,
            role: "student",
            client_id: clientId ?? null,
          },
        });
      }

      await fetchUserRole(googleUser);
      return { error: null };
    } catch (err: any) {
      console.error("Google sign in error:", err);
      return { error: { message: friendlyFirebaseError(err.code) } };
    }
  };

  const signInAnonymously = async () => {
    try {
      if (!auth) throw new Error("Firebase not initialized");
      const { signInAnonymously: firebaseSignInAnonymously } = await import("firebase/auth");
      const { user: anonUser } = await firebaseSignInAnonymously(auth);
      // Anonymous users get student role by default
      setRole("student");
      writeCache("student", null);
      return { error: null };
    } catch (err: any) {
      console.error("Anonymous sign in error:", err);
      return { error: { message: friendlyFirebaseError(err.code) } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        clientId,
        signIn,
        signUp,
        signInWithGoogle,
        signInAnonymously,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

// Convert Firebase error codes to readable messages
function friendlyFirebaseError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
