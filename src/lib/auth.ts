import type { AuthResponse, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { isSupabaseConfigured, supabase } from './supabase';

export type SignupCategory = 'buyer' | 'amateur' | 'professional';

export function getAuthRedirectUrl(next?: 'reset-password'): string {
  return Linking.createURL('auth/callback', {
    queryParams: next ? { next } : undefined,
  });
}

function getSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the values from .env.example first.');
  }
  return supabase;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  return getSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
}

export async function signUpWithEmail(input: {
  displayName: string;
  email: string;
  password: string;
  category: SignupCategory;
}): Promise<AuthResponse> {
  return getSupabase().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        display_name: input.displayName.trim(),
        requested_category: input.category,
      },
    },
  });
}

export async function verifySignupCode(email: string, token: string): Promise<AuthResponse> {
  return getSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
}

export async function resendSignupCode(email: string): Promise<{ error: Error | null }> {
  return getSupabase().auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
}

export async function signOut(): Promise<{ error: Error | null }> {
  return getSupabase().auth.signOut();
}

export async function sendPasswordResetEmail(email: string, redirectTo: string): Promise<{ error: Error | null }> {
  return getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
}

export async function updatePassword(password: string): Promise<{ error: Error | null }> {
  const { error } = await getSupabase().auth.updateUser({ password });
  return { error };
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}
