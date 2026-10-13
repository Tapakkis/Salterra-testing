import type { UserProfile } from '@/types/domain';

import { isSupabaseConfigured, supabase } from './supabase';

export async function getMyProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as UserProfile;
}

export async function updateMyProfile(input: Partial<Pick<UserProfile, 'display_name' | 'avatar_path' | 'bio' | 'district' | 'phone' | 'phone_visible'>>) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.from('profiles').update(input).select('*').single();
  if (error) throw error;
  return data as UserProfile;
}
