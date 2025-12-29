/**
 * User Service
 *
 * Handles all user profile operations with Supabase.
 * Extracts business logic from components for better testability and reusability.
 */

import { supabase } from './client';
import { createLogger } from '@/src/utils/logger';
import type { UserProfile, UserProfileUpdate, XPStats } from '@/src/types/user';
import { calculateLevel, getLevelProgress } from '@/src/utils/xp';

const log = createLogger('UserService');

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(
  userId: string
): Promise<ServiceResult<UserProfile>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // Profile doesn't exist yet
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      log.error('Error fetching profile', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    log.error('Error in getUserProfile', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create a new user profile
 */
export async function createUserProfile(
  userId: string,
  initialData?: Partial<UserProfile>
): Promise<ServiceResult<UserProfile>> {
  try {
    const profileData = {
      id: userId,
      username: initialData?.username || null,
      total_xp: initialData?.total_xp || 0,
      weekly_xp: initialData?.weekly_xp || 0,
      level: initialData?.level || 1,
      seen_onboarding: initialData?.seen_onboarding || false,
      paywall_seen: initialData?.paywall_seen || false,
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      log.error('Error creating profile', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    log.error('Error in createUserProfile', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Ensure user profile exists, creating if necessary
 */
export async function ensureUserProfile(
  userId: string
): Promise<ServiceResult<UserProfile>> {
  const { data: existing, error: fetchError } = await getUserProfile(userId);

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  if (existing) {
    return { data: existing, error: null };
  }

  // Profile doesn't exist, create it
  return createUserProfile(userId);
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<ServiceResult<UserProfile>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      log.error('Error updating profile', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    log.error('Error in updateUserProfile', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update username with uniqueness check
 */
export async function updateUsername(
  userId: string,
  username: string
): Promise<ServiceResult<UserProfile>> {
  // Validate username
  if (username.length < 3 || username.length > 20) {
    return {
      data: null,
      error: new Error('Username must be between 3 and 20 characters'),
    };
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ username })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return {
          data: null,
          error: new Error('Username is already taken'),
        };
      }
      log.error('Error updating username', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    log.error('Error in updateUsername', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get XP stats for a user
 */
export async function getXPStats(userId: string): Promise<ServiceResult<XPStats>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('total_xp, weekly_xp, level')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile doesn't exist
        return {
          data: {
            total_xp: 0,
            weekly_xp: 0,
            level: 1,
            level_progress: 0,
            xp_to_next_level: 100, // Base XP for level 1
          },
          error: null,
        };
      }
      log.error('Error fetching XP stats', error);
      return { data: null, error: new Error(error.message) };
    }

    const levelProgress = getLevelProgress(data.total_xp);

    return {
      data: {
        total_xp: data.total_xp,
        weekly_xp: data.weekly_xp,
        level: data.level,
        level_progress: levelProgress.progress,
        xp_to_next_level: levelProgress.xpNeededForNextLevel - levelProgress.xpInCurrentLevel,
      },
      error: null,
    };
  } catch (error) {
    log.error('Error in getXPStats', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Add XP to user profile
 */
export async function addXP(
  userId: string,
  xpToAdd: number
): Promise<ServiceResult<UserProfile>> {
  try {
    // Get current XP
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('total_xp, weekly_xp')
      .eq('id', userId)
      .single();

    if (fetchError) {
      log.error('Error fetching profile for XP update', fetchError);
      return { data: null, error: new Error(fetchError.message) };
    }

    const newTotalXP = (profile?.total_xp || 0) + xpToAdd;
    const newWeeklyXP = (profile?.weekly_xp || 0) + xpToAdd;
    const newLevel = calculateLevel(newTotalXP);

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        total_xp: newTotalXP,
        weekly_xp: newWeeklyXP,
        level: newLevel,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      log.error('Error updating XP', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    log.error('Error in addXP', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Mark onboarding as seen
 */
export async function markOnboardingSeen(
  userId: string
): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ seen_onboarding: true })
      .eq('id', userId);

    if (error) {
      log.error('Error marking onboarding seen', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: undefined, error: null };
  } catch (error) {
    log.error('Error in markOnboardingSeen', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Mark paywall as seen
 */
export async function markPaywallSeen(
  userId: string
): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ paywall_seen: true })
      .eq('id', userId);

    if (error) {
      log.error('Error marking paywall seen', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: undefined, error: null };
  } catch (error) {
    log.error('Error in markPaywallSeen', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete user account (calls RPC function)
 */
export async function deleteUserAccount(): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase.rpc('delete_user_account');

    if (error) {
      log.error('Error deleting account', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: undefined, error: null };
  } catch (error) {
    log.error('Error in deleteUserAccount', error);
    return { data: null, error: error as Error };
  }
}
