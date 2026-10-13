import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    let authEventReceived = false;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && !authEventReceived) {
        setSession(data.session);
        setLoading(false);
      }
    }).catch(() => { if (mounted) setLoading(false); });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      if (mounted) { setSession(nextSession); setLoading(false); }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, configured: isSupabaseConfigured };
}
