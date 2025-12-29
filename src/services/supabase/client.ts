/**
 * Supabase Client Service
 *
 * Re-exports the configured Supabase client and provides type-safe helpers.
 * The actual client configuration is in src/lib/supabase.ts
 */

import { supabase } from '@/src/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Re-export the configured client
export { supabase };

// Re-export types for convenience
export type { User, Session };

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session
 * Returns null if no active session
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Subscribe to auth state changes
 * Returns an unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
