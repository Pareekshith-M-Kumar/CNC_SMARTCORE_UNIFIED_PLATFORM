import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type UserRole = "designer" | "cam_engineer" | "approver" | "operator" | "customer" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
}

export const DEFAULT_MASTER_CREDENTIALS = {
  email: "cnc@gmail.com",
  password: "Pareekshith",
  fullName: "Pareekshith M Kumar",
  role: "admin" as UserRole,
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInAsDemo: (role?: UserRole) => Promise<void>;
  signInWithDefaultAdmin: () => Promise<void>;
  activateLocalSession: (email: string, fullName: string, role?: UserRole, password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not load profile from profiles table:", error.message);
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        // Fallback default role while profile trigger completes
        setProfile({
          id: userId,
          email,
          role: "admin",
          is_active: true,
        });
      }
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      setProfile({
        id: userId,
        email,
        role: "admin",
        is_active: true,
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error.message);
        }

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchProfile(initialSession.user.id, initialSession.user.email || "");
          } else {
            const demoRaw = typeof localStorage !== "undefined" ? localStorage.getItem("cnc_demo_user") : null;
            if (demoRaw) {
              try {
                const parsed = JSON.parse(demoRaw);
                setUser(parsed.user);
                setProfile(parsed.profile);
                setSession(parsed.session);
              } catch {
                // Ignore
              }
            }
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        await fetchProfile(newSession.user.id, newSession.user.email || "");
      } else {
        const demoRaw = typeof localStorage !== "undefined" ? localStorage.getItem("cnc_demo_user") : null;
        if (!demoRaw) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const activateLocalSession = async (
    email: string,
    fullName: string,
    targetRole: UserRole = "admin",
    plainPassword?: string
  ) => {
    const customUser: User = {
      id: "00000000-0000-0000-0000-000000000009",
      app_metadata: { provider: "email", role: targetRole },
      user_metadata: { full_name: fullName, role: targetRole },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email,
    } as any;

    const customSession: Session = {
      access_token: "local-eval-session-token",
      token_type: "bearer",
      expires_in: 86400 * 7,
      refresh_token: "local-refresh-token",
      user: customUser,
    };

    const profileObj: UserProfile = {
      id: customUser.id,
      email,
      full_name: fullName,
      role: targetRole,
      is_active: true,
    };

    try {
      const payload = JSON.stringify(customSession);
      localStorage.setItem("sb-tlqdmyzpooiadaqnzowc-auth-token", payload);
      localStorage.setItem("supabase.auth.token", payload);
      localStorage.setItem("cnc_demo_user", JSON.stringify({ user: customUser, profile: profileObj, session: customSession }));
      localStorage.setItem("cnc_dev_mode", "true");
      localStorage.setItem("cnc_dev_role", targetRole);

      // Save credentials registry for later retrieval as requested
      if (plainPassword) {
        const existingCreds = JSON.parse(localStorage.getItem("cnc_stored_credentials") || "{}");
        existingCreds[email] = {
          email,
          password: plainPassword,
          fullName,
          role: targetRole,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem("cnc_stored_credentials", JSON.stringify(existingCreds));
      }
    } catch {
      // Ignore
    }

    setSession(customSession);
    setUser(customUser);
    setProfile(profileObj);
  };

  const signInWithDefaultAdmin = async () => {
    await activateLocalSession(
      DEFAULT_MASTER_CREDENTIALS.email,
      DEFAULT_MASTER_CREDENTIALS.fullName,
      DEFAULT_MASTER_CREDENTIALS.role,
      DEFAULT_MASTER_CREDENTIALS.password
    );
  };

  const signInAsDemo = async (targetRole: UserRole = "admin") => {
    await activateLocalSession("engineer@cnc-smartcore.local", "Lead Engineer (Demo)", targetRole);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      try {
        localStorage.removeItem("sb-tlqdmyzpooiadaqnzowc-auth-token");
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("cnc_demo_user");
        localStorage.removeItem("cnc_dev_mode");
        localStorage.removeItem("cnc_dev_role");
      } catch {
        // Ignore
      }
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email || "");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
        signInAsDemo,
        signInWithDefaultAdmin,
        activateLocalSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
