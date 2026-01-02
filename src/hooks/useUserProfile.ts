/**
 * useUserProfile Hook
 *
 * Provides user profile data and operations using the userService.
 * This is a standalone hook that doesn't require context - useful for
 * components that need profile data without the full auth context.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getUserProfile,
  updateUserProfile,
  updateUsername,
  getXPStats,
  addXP,
  ensureUserProfile,
} from '@/src/services/supabase/userService';
import { createLogger } from '@/src/utils/logger';
import type { UserProfile, UserProfileUpdate, XPStats } from '@/src/types/user';

const log = createLogger('useUserProfile');

interface UseUserProfileOptions {
  /** Auto-fetch profile on mount */
  autoFetch?: boolean;
  /** Create profile if it doesn't exist */
  createIfMissing?: boolean;
}

interface UseUserProfileReturn {
  /** User profile data */
  profile: UserProfile | null;
  /** XP statistics */
  xpStats: XPStats | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh profile data */
  refresh: () => Promise<void>;
  /** Update profile fields */
  update: (updates: UserProfileUpdate) => Promise<boolean>;
  /** Update username with validation */
  setUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
  /** Add XP to user */
  earnXP: (amount: number) => Promise<boolean>;
}

/**
 * Hook for managing user profile data
 *
 * @param userId - The user ID to fetch profile for
 * @param options - Configuration options
 * @returns Profile data and operations
 *
 * @example
 * ```tsx
 * const { profile, loading, error, update } = useUserProfile(userId);
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return <Text>Welcome, {profile?.username || 'Guest'}</Text>;
 * ```
 */
export function useUserProfile(
  userId: string | null | undefined,
  options: UseUserProfileOptions = {}
): UseUserProfileReturn {
  const { autoFetch = true, createIfMissing = false } = options;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [xpStats, setXpStats] = useState<XPStats | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch profile data
   */
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setXpStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch or create profile
      const profileResult = createIfMissing
        ? await ensureUserProfile(userId)
        : await getUserProfile(userId);

      if (profileResult.error) {
        throw profileResult.error;
      }

      setProfile(profileResult.data);

      // Fetch XP stats
      const xpResult = await getXPStats(userId);
      if (!xpResult.error) {
        setXpStats(xpResult.data);
      }
    } catch (err) {
      log.error('Failed to fetch profile', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, createIfMissing]);

  /**
   * Auto-fetch on mount and userId change
   */
  useEffect(() => {
    if (autoFetch) {
      fetchProfile();
    }
  }, [autoFetch, fetchProfile]);

  /**
   * Refresh profile data
   */
  const refresh = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  /**
   * Update profile fields
   */
  const update = useCallback(
    async (updates: UserProfileUpdate): Promise<boolean> => {
      if (!userId) {
        log.warn('Cannot update profile: no userId');
        return false;
      }

      try {
        const result = await updateUserProfile(userId, updates);

        if (result.error) {
          log.error('Failed to update profile', result.error);
          setError(result.error);
          return false;
        }

        // Update local state
        if (result.data) {
          setProfile(result.data);
        }

        return true;
      } catch (err) {
        log.error('Error updating profile', err);
        setError(err as Error);
        return false;
      }
    },
    [userId]
  );

  /**
   * Update username with validation
   */
  const setUsername = useCallback(
    async (username: string): Promise<{ success: boolean; error?: string }> => {
      if (!userId) {
        return { success: false, error: 'Not authenticated' };
      }

      const result = await updateUsername(userId, username);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      // Update local state
      if (result.data) {
        setProfile(result.data);
      }

      return { success: true };
    },
    [userId]
  );

  /**
   * Add XP to user
   */
  const earnXP = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!userId) {
        log.warn('Cannot add XP: no userId');
        return false;
      }

      try {
        const result = await addXP(userId, amount);

        if (result.error) {
          log.error('Failed to add XP', result.error);
          return false;
        }

        // Update local state
        if (result.data) {
          setProfile(result.data);
        }

        // Refresh XP stats
        const xpResult = await getXPStats(userId);
        if (!xpResult.error) {
          setXpStats(xpResult.data);
        }

        return true;
      } catch (err) {
        log.error('Error adding XP', err);
        return false;
      }
    },
    [userId]
  );

  return {
    profile,
    xpStats,
    loading,
    error,
    refresh,
    update,
    setUsername,
    earnXP,
  };
}

export default useUserProfile;
