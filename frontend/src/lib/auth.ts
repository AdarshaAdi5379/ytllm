import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

function getRedirectUrl(): string {
  return window.location.origin;
}

export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (err) {
    console.error('getSupabaseSession failed:', err);
    return null;
  }
}

export async function handleOAuthCallback(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('OAuth callback session error:', error);
      return false;
    }
    return !!data.session;
  } catch (err) {
    console.error('handleOAuthCallback failed:', err);
    return false;
  }
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
      scopes: 'email profile',
    },
  });
  if (error) throw error;
}

export async function signInWithGitHub(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: getRedirectUrl(),
      scopes: 'read:user user:email',
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password.');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Please verify your email before signing in.');
    }
    throw new Error(error.message || 'Sign in failed. Please try again.');
  }
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  });
  if (error) {
    if (error.message.includes('already registered')) {
      throw new Error('An account with this email already exists.');
    }
    throw new Error(error.message || 'Sign up failed. Please try again.');
  }
  return data;
}

export async function resetPasswordForEmail(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl(),
  });
  if (error) throw new Error(error.message || 'Failed to send reset email.');
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message || 'Failed to update password.');
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getOAuthProvider(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const identities = user.identities || [];
  const appIdentity = identities.find((id) => id.provider !== 'email');
  return appIdentity?.provider || 'email';
}
