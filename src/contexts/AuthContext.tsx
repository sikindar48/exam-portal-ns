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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const fetchUserRole = useCallback(
    async (userId: string, retries = 3): Promise<void> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const { data, error } = await supabase
            .from("user_roles")
            .select("role, client_id")
            .eq("user_id", userId);

          if (error) {
            if (attempt < retries) {
              await new Promise((r) => setTimeout(r, attempt * 500));
              continue;
            }
            console.error("Failed to fetch role after retries:", error);
            setRole(null);
            setClientId(null);
            return;
          }

          if (!data || data.length === 0) {
            setRole(null);
            setClientId(null);
            return;
          }

          const best = [...data].sort(
            (a, b) =>
              ROLE_PRIORITY.indexOf(a.role as AppRole) -
              ROLE_PRIORITY.indexOf(b.role as AppRole),
          )[0];

          setRole(best.role as AppRole);
          setClientId(best.client_id ?? null);
          return;
        } catch (err) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, attempt * 500));
          } else {
            console.error("fetchUserRole exception:", err);
            setRole(null);
            setClientId(null);
          }
        }
      }
    },
    [],
  );

  const refreshRole = useCallback(async () => {
    if (user) await fetchUserRole(user.id);
  }, [user, fetchUserRole]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserRole(session.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        await fetchUserRole(session.user.id);
        if (mounted) setLoading(false);
      } else {
        setRole(null);
        setClientId(null);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

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
