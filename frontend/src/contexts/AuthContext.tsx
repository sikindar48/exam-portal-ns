import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "superadmin" | "clientadmin" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = ["superadmin", "clientadmin", "student"];

const CACHE_KEY_ROLE = "kiro_cached_role";
const CACHE_KEY_CLIENT = "kiro_cached_client_id";

// Read synchronously from localStorage — no network, no delay
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
  const [session, setSession] = useState<Session | null>(null);
  // Only block rendering if there is no cached role at all (first-ever visit)
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
    async (userId: string): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role, client_id")
          .eq("user_id", userId);
        if (!error) applyRole(data ?? []);
      } catch (err) {
        console.error("fetchUserRole error:", err);
      }
    },
    [applyRole],
  );

  const refreshRole = useCallback(async () => {
    if (user) await fetchUserRole(user.id);
  }, [user, fetchUserRole]);

  useEffect(() => {
    let mounted = true;

    // Supabase stores the session in localStorage — getSession() reads it
    // synchronously from storage first, then validates with the server in background.
    // So this resolves almost instantly on return visits.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        if (cache.role === null) {
          // First visit — must fetch role before we can render
          fetchUserRole(session.user.id).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          // Cache hit — render immediately, refresh role silently in background
          setLoading(false);
          fetchUserRole(session.user.id); // background, no await
        }
      } else {
        // No session — clear stale cache and go to login
        clearCache();
        setRole(null);
        setClientId(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // These fire on every page load — handle silently
      if (event === "INITIAL_SESSION") return;
      if (event === "TOKEN_REFRESHED") {
        if (session) {
          setSession(session);
          setUser(session.user);
        }
        return;
      }

      // Actual sign-in / sign-out
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRole(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        clearCache();
        setRole(null);
        setClientId(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    clientId?: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error || !data.user) return { error };

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      name,
      email,
      client_id: clientId ?? null,
    });
    if (profileError) return { error: profileError };

    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: data.user.id,
      role: "student",
      client_id: clientId ?? null,
    });
    if (roleError) return { error: roleError };

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearCache();
    setUser(null);
    setSession(null);
    setRole(null);
    setClientId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        role,
        clientId,
        signIn,
        signUp,
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
