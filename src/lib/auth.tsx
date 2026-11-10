import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;

type AuthContextValue = {
  session: Session | null;
  /** Perfil del usuario (nombre y rol). Null mientras carga o sin sesión. */
  profile: Profile | null;
  /** True hasta conocer si hay una sesión guardada. */
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedProfile, setLoadedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLoadedProfile(data);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Evita mostrar el perfil de una sesión anterior tras cambiar de usuario.
  const profile = loadedProfile && loadedProfile.id === userId ? loadedProfile : null;

  return <AuthContext value={{ session, profile, isLoading }}>{children}</AuthContext>;
}
