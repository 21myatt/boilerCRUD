import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getPermissionMapFromSession, type PermissionMap } from "./permissions";
import { getCmsRoleForUser, type CmsRole } from "./roles";

export type AuthStatus = "loading" | "signed_out" | "signed_in";

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  viewerEmail: string | null;
  role: CmsRole;
  disabled: boolean;
  permissionMap: PermissionMap;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

type AuthProfile = {
  role: CmsRole;
  disabled: boolean;
} | null;

export const createSupabaseAuthBindings = (supabase: SupabaseClient) => {
  const AuthContext = createContext<AuthState | null>(null);

  const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<AuthProfile>(null);
    const [status, setStatus] = useState<AuthStatus>("loading");

    useEffect(() => {
      let active = true;

      void supabase.auth.getSession().then(({ data }) => {
        if (!active) {
          return;
        }

        setSession(data.session ?? null);
        setStatus(data.session ? "signed_in" : "signed_out");
      });

      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    }, []);

    useEffect(() => {
      let active = true;

      if (!session?.user) {
        setProfile(null);
        setStatus("signed_out");
        return () => {
          active = false;
        };
      }

      setStatus("loading");

      void (async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("role, disabled")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!active) {
            return;
          }

          setProfile(data ? {
            role: data.role,
            disabled: Boolean(data.disabled)
          } : null);
          setStatus("signed_in");
        } catch {
          if (!active) {
            return;
          }

          setProfile(null);
          setStatus("signed_in");
        }
      })();

      return () => {
        active = false;
      };
    }, [session, supabase]);

    const value = useMemo<AuthState>(() => ({
      status,
      session,
      viewerEmail: session?.user.email ?? null,
      role: getCmsRoleForUser({
        email: session?.user.email,
        profileRole: profile?.role,
        appMetadata: session?.user.app_metadata,
        fallbackRole: "viewer"
      }),
      disabled: profile?.disabled ?? false,
      permissionMap: getPermissionMapFromSession(session, profile),
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        return error?.message ?? null;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      }
    }), [profile, session, status, supabase]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
      throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
  };

  return {
    AuthProvider,
    useAuth
  };
};
