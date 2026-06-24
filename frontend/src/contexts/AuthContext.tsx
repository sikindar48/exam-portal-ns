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
  signInAnonymously as firebaseSignInAnonymously,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { apiClient } from "@/services/api/client";

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
const CACHE_KEY_UID = "kiro_cached_uid";

function readCache(): { role: AppRole | null; clientId: string | null; uid: string | null } {
  return {
    role: (localStorage.getItem(CACHE_KEY_ROLE) as AppRole | null) ?? null,
    clientId: localStorage.getItem(CACHE_KEY_CLIENT) ?? null,
    uid: localStorage.getItem(CACHE_KEY_UID) ?? null,
  };
}

function writeCache(role: AppRole, clientId: string | null, uid: string | null) {
  localStorage.setItem(CACHE_KEY_ROLE, role);
  if (clientId) localStorage.setItem(CACHE_KEY_CLIENT, clientId);
  else localStorage.removeItem(CACHE_KEY_CLIENT);
  if (uid) localStorage.setItem(CACHE_KEY_UID, uid);
  else localStorage.removeItem(CACHE_KEY_UID);
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY_ROLE);
  localStorage.removeItem(CACHE_KEY_CLIENT);
  localStorage.removeItem(CACHE_KEY_UID);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cache = readCache();

  // If cache has role="student" but no clientId, it's likely a stale anonymous guest
  // session. Treat as unresolved (loading=true) so onAuthStateChanged can validate it.
  const isLikelyStaleGuestCache = cache.role === "student" && !cache.clientId
    && sessionStorage.getItem("guest_session_active") !== "1";

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(isLikelyStaleGuestCache ? null : cache.role);
  const [clientId, setClientId] = useState<string | null>(cache.clientId);

  const applyRole = useCallback(
    (data: { role: string; client_id: string | null }[], uid: string) => {
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
      writeCache(r, c, uid);
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
        applyRole(res ?? [], firebaseUser.uid);
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
        if (firebaseUser?.isAnonymous) {
          // Only keep anonymous users alive if they intentionally started a guest session
          // in this tab (flag is set by signInAnonymously and cleared on signOut/tab close).
          const isActiveGuestSession = sessionStorage.getItem("guest_session_active") === "1";
          if (!isActiveGuestSession) {
            // Stale anonymous session from a previous visit — evict silently
            await firebaseSignOut(auth);
            clearCache();
            setUser(null);
            setRole(null);
            setClientId(null);
            setLoading(false);
            return;
          }
          // Active guest session — restore in-memory state without touching localStorage
          setUser(firebaseUser);
          setRole("student");
          setClientId(null);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);

        if (firebaseUser) {
          const cacheMatches = cache.uid === firebaseUser.uid;
          if (cache.role === null || !cacheMatches) {
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
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserRole(firebaseUser);
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

      // Update state and cache immediately to prevent race conditions with routing redirects
      writeCache("student", clientId ?? null, newUser.uid);
      setRole("student");
      setClientId(clientId ?? null);

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
    sessionStorage.removeItem("guest_session_active");
    setUser(null);
    setRole(null);
    setClientId(null);
  };

  const signInWithGoogle = async (clientId?: string) => {
    try {
      if (!auth) throw new Error("Firebase not initialized");
      const provider = new GoogleAuthProvider();
      const { user: googleUser } = await signInWithPopup(auth, provider);
      const token = await googleUser.getIdToken();

      // Check if this user already has a profile in Turso (GET ?id=uid)
      let existingData = null;
      try {
        existingData = await apiClient(`/profiles?id=${googleUser.uid}`, { token });
      } catch (err) {
        // profile not found or network error, proceed with creation
      }

      if (!existingData) {
        // First-time Google sign-in: create profile (upsert)
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

        // Only create a student role if they selected an org (clientId provided)
        // Admins are created by superadmin — don't auto-assign student role without an org
        if (clientId) {
          await apiClient("/api/user-roles", {
            token,
            method: "POST",
            body: { user_id: googleUser.uid, role: "student", client_id: clientId },
          });
        }
      }

      // Always fetch role from DB (handles existing admins correctly)
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
      // Mark this tab as having an intentional active guest session BEFORE signing in,
      // so that onAuthStateChanged will detect it immediately when it fires.
      sessionStorage.setItem("guest_session_active", "1");

      await firebaseSignInAnonymously(auth);
      setRole("student");
      // Deliberately skip writeCache() — no localStorage pollution for guests
      return { error: null };
    } catch (err: any) {
      sessionStorage.removeItem("guest_session_active");
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
