/**
 * User-related type definitions
 */

/**
 * User profile from Supabase database
 */
export interface UserProfile {
  id: string;
  username: string | null;
  total_xp: number;
  weekly_xp: number;
  level: number;
  rank?: number; // Calculated rank in leaderboard
  seen_onboarding?: boolean;
  paywall_seen?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * XP statistics for a user
 */
export interface XPStats {
  total_xp: number;
  weekly_xp: number;
  level: number;
  rank?: number;
  level_progress: number; // 0-1 progress to next level
  xp_to_next_level: number;
}

/**
 * Authentication state
 */
export interface AuthState {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Supabase session object
 */
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type: string;
  user: AuthUser;
}

/**
 * Supabase auth user object
 */
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
}

/**
 * Auth context value type
 */
export interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
}

/**
 * User profile update payload
 */
export interface UserProfileUpdate {
  username?: string;
  total_xp?: number;
  weekly_xp?: number;
  level?: number;
  seen_onboarding?: boolean;
  paywall_seen?: boolean;
}

/**
 * Type guard for UserProfile
 */
export function isUserProfile(obj: unknown): obj is UserProfile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as UserProfile).id === 'string' &&
    'total_xp' in obj &&
    typeof (obj as UserProfile).total_xp === 'number'
  );
}
