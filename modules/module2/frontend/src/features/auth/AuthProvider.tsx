import React, { useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/apiClient';
import { AuthContext } from './AuthContext';
import { UserProfile, UserRole } from './types';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setProfile(null);
      return;
    }

    try {
      const data = await api.get<UserProfile>('/me');
      setProfile(data);
    } catch {
      // Fallback profile if backend /me is not yet reached or during signup
      const fallbackRole: UserRole = (currentSession.user.user_metadata?.role as UserRole) || 'designer';
      setProfile({
        id: currentSession.user.id,
        email: currentSession.user.email || '',
        fullName: currentSession.user.user_metadata?.full_name || '',
        role: fallbackRole,
        isActive: true,
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchProfile(initialSession);
          } else {
            const demoRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('cnc_demo_user') : null;
            if (demoRaw) {
              try {
                const parsed = JSON.parse(demoRaw);
                if (parsed.user) {
                  setUser(parsed.user);
                  setSession(parsed.session);
                  setProfile({
                    id: parsed.user.id,
                    email: parsed.user.email || '',
                    fullName: parsed.user.user_metadata?.full_name || '',
                    role: (parsed.profile?.role || parsed.user.user_metadata?.role || 'admin') as UserRole,
                    isActive: true,
                  });
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth session:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user || null);
        if (newSession) {
          await fetchProfile(newSession);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      setSession(data.session);
      setUser(data.user);
      await fetchProfile(data.session);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: Error | null }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) return { error };
      setSession(data.session);
      setUser(data.user);
      if (data.session) {
        await fetchProfile(data.session);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (session) {
      await fetchProfile(session);
    }
  };

  const role: UserRole = profile?.role || 'designer';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        role,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
