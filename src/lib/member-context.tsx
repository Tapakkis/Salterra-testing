import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getMyProfile } from './profile';
import { supabase } from './supabase';
import { canCreateAuctions, type ProfessionalApproval, type UserProfile } from '@/types/domain';

type Application = ProfessionalApproval & { rejection_reason: string | null };
type Member = { profile: UserProfile | null; application: Application | null; loading: boolean; error: boolean; refresh: () => Promise<void>; session: Session };
const Context = createContext<Member | null>(null);

export function MemberProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [state, setState] = useState({ profile: null as UserProfile | null, application: null as Application | null, loading: true, error: false });
  const request = useRef({ version: 0 });
  const load = useCallback(async () => {
    try {
      const profile = await getMyProfile(session.user.id);
      if (!profile) throw new Error('Profile unavailable');
      let application: Application | null = null;
      if (profile.role === 'professional') {
        const result = await supabase!.from('professional_applications').select('status, license_expires_at, rejection_reason').eq('user_id', session.user.id).maybeSingle();
        if (result.error) throw result.error;
        application = result.data as Application | null;
      }
      return { profile, application, loading: false, error: false };
    } catch {
      return { profile: null, application: null, loading: false, error: true };
    }
  }, [session.user.id]);
  const refresh = useCallback(async () => {
    setState(previous => ({ ...previous, loading: true, error: false }));
    const version = ++request.current.version;
    const result = await load();
    if (version === request.current.version) setState(result);
  }, [load]);
  useEffect(() => {
    const tracker = request.current;
    const version = ++tracker.version;
    void load().then(result => { if (version === tracker.version) setState(result); });
    return () => { tracker.version++; };
  }, [load]);
  return <Context.Provider value={{ ...state, refresh, session }}>{children}</Context.Provider>;
}

export function useMember() {
  const value = useContext(Context);
  if (!value) throw new Error('MemberProvider is required');
  return value;
}

export function hasProfessionalApproval(profile: UserProfile, application: Application | null) {
  return canCreateAuctions(profile, application);
}
