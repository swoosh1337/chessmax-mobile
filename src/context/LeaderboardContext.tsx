import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import { createLogger } from '../utils/logger';

const log = createLogger('LeaderboardContext');

export interface UserProfile {
  id: string;
  username: string | null;
  total_xp: number;
  weekly_xp: number;
  level: number;
  rank?: number; // Calculated rank in leaderboard
}

export interface SpeedrunProfile {
  id: string;
  username: string | null;
  avg_time_seconds: number;
  perfect_completions: number;
  rank?: number;
}

interface LeaderboardData {
  allTime: UserProfile[];
  weekly: UserProfile[];
  speedrun: SpeedrunProfile[];
  currentUser?: UserProfile;
  currentUserSpeedrun?: SpeedrunProfile;
}

interface LeaderboardContextType {
  data: LeaderboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  subscribeToUpdates: (enabled: boolean) => void;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(undefined);

export function LeaderboardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);

  /**
   * Fetch leaderboard data from Supabase
   * OPTIMIZED: Uses server-side RPC with window functions to calculate ranks efficiently
   */
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch all-time leaderboard with ranks (single RPC call)
      const { data: allTimeData, error: allTimeError } = await supabase
        .rpc('get_leaderboard_with_user_rank', {
          user_id_param: user?.id || null,
          leaderboard_type: 'all_time'
        });

      if (allTimeError) throw allTimeError;

      // Fetch weekly leaderboard with ranks (single RPC call)
      const { data: weeklyData, error: weeklyError } = await supabase
        .rpc('get_leaderboard_with_user_rank', {
          user_id_param: user?.id || null,
          leaderboard_type: 'weekly'
        });

      if (weeklyError) throw weeklyError;

      // Fetch speedrun leaderboard with ranks (single RPC call)
      const { data: speedrunData, error: speedrunError } = await supabase
        .rpc('get_leaderboard_with_user_rank', {
          user_id_param: user?.id || null,
          leaderboard_type: 'speedrun'
        });

      if (speedrunError) {
        log.error('Speedrun leaderboard error', speedrunError);
        // Don't throw - continue with other leaderboards
      }

      // Separate current user from leaderboard data
      let currentUserProfile: UserProfile | undefined;
      let currentUserSpeedrun: SpeedrunProfile | undefined;

      // Extract current user from all-time data FIRST
      const currentUserInAllTime = (allTimeData || []).find((p: any) => p.is_current_user);
      if (currentUserInAllTime) {
        currentUserProfile = {
          id: currentUserInAllTime.user_id,
          username: currentUserInAllTime.username,
          total_xp: currentUserInAllTime.score,
          weekly_xp: 0, // Will fetch complete profile below
          level: 1,
          rank: currentUserInAllTime.rank
        };
      }

      // Extract top 20 for all-time leaderboard
      // If current user is in top 20, include them in the list
      let allTimeTop20: UserProfile[];
      if (currentUserInAllTime && currentUserInAllTime.rank <= 20) {
        // Current user is in top 20, include them
        allTimeTop20 = (allTimeData || [])
          .slice(0, 20)
          .map((p: any) => ({
            id: p.user_id,
            username: p.username,
            total_xp: p.score,
            weekly_xp: 0,
            level: 1,
            rank: p.rank
          }));
      } else {
        // Current user is not in top 20, show top 20 others
        allTimeTop20 = (allTimeData || [])
          .filter((p: any) => !p.is_current_user)
          .slice(0, 20)
          .map((p: any) => ({
            id: p.user_id,
            username: p.username,
            total_xp: p.score,
            weekly_xp: 0,
            level: 1,
            rank: p.rank
          }));
      }

      // Extract top 20 for weekly leaderboard
      // If current user is in top 20, include them in the list
      let weeklyTop20: UserProfile[];
      const currentUserRankWeekly = currentUserInAllTime?.rank; // Using all-time for now since we don't track weekly rank separately
      if (currentUserInAllTime && currentUserRankWeekly && currentUserRankWeekly <= 20) {
        // Current user is in top 20, include them
        weeklyTop20 = (weeklyData || [])
          .slice(0, 20)
          .map((p: any) => ({
            id: p.user_id,
            username: p.username,
            total_xp: 0,
            weekly_xp: p.score,
            level: 1,
            rank: p.rank
          }));
      } else {
        // Current user is not in top 20, show top 20 others
        weeklyTop20 = (weeklyData || [])
          .filter((p: any) => !p.is_current_user)
          .slice(0, 20)
          .map((p: any) => ({
            id: p.user_id,
            username: p.username,
            total_xp: 0,
            weekly_xp: p.score,
            level: 1,
            rank: p.rank
          }));
      }

      // Extract current user from speedrun data FIRST
      const currentUserInSpeedrun = (speedrunData || []).find((p: any) => p.is_current_user);
      if (currentUserInSpeedrun) {
        currentUserSpeedrun = {
          id: currentUserInSpeedrun.user_id,
          username: currentUserInSpeedrun.username,
          avg_time_seconds: currentUserInSpeedrun.score,
          perfect_completions: currentUserInSpeedrun.perfect_completions || 3,
          rank: currentUserInSpeedrun.rank
        };
      }

      // Extract top 20 for display
      // If current user is in top 20, include them in the list
      let speedrunTop20: SpeedrunProfile[];
      if (currentUserInSpeedrun && currentUserInSpeedrun.rank <= 20) {
        // Current user is in top 20, include them
        speedrunTop20 = (speedrunData || [])
          .slice(0, 20)
          .map((p: any) => ({
            id: p.user_id,
            username: p.username,
            avg_time_seconds: p.score,
            perfect_completions: p.perfect_completions || 3,
            rank: p.rank
          }));
      } else {
        // Current user is not in top 20, show top 20 others
        speedrunTop20 = (speedrunData || [])
          .filter((p: any) => !p.is_current_user)
          .slice(0, 20)
          .map((p: any) => ({
            id: p.user_id,
            username: p.username,
            avg_time_seconds: p.score,
            perfect_completions: p.perfect_completions || 3,
            rank: p.rank
          }));
      }

      // Get complete current user profile with all fields if user is authenticated
      if (user && currentUserProfile) {
        const { data: userProfile, error: userError } = await supabase
          .from('user_profiles')
          .select('id, username, total_xp, weekly_xp, level')
          .eq('id', user.id)
          .single();

        if (!userError && userProfile) {
          currentUserProfile = {
            ...userProfile,
            rank: currentUserProfile.rank // Preserve rank from RPC
          };
        }
      }

      setData({
        allTime: allTimeTop20,
        weekly: weeklyTop20,
        speedrun: speedrunTop20,
        currentUser: currentUserProfile,
        currentUserSpeedrun,
      });
    } catch (err: any) {
      log.error('Failed to fetch leaderboard', err);
      setError(err.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refetch leaderboard data (pull-to-refresh)
   */
  const refetch = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  /**
   * Invalidate cache and clear data
   */
  const invalidateCache = useCallback(() => {
    // console.log('[LeaderboardContext] Cache invalidated');
    setData(null);
  }, []);

  /**
   * Optimistically update current user's profile in cache
   */
  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setData(prevData => {
      if (!prevData?.currentUser) return prevData;

      const updatedUser = { ...prevData.currentUser, ...updates };

      // Update user in all-time leaderboard
      const allTimeIndex = prevData.allTime.findIndex(p => p.id === updatedUser.id);
      const newAllTime = [...prevData.allTime];
      if (allTimeIndex !== -1) {
        newAllTime[allTimeIndex] = { ...newAllTime[allTimeIndex], ...updates };
      }

      // Update user in weekly leaderboard
      const weeklyIndex = prevData.weekly.findIndex(p => p.id === updatedUser.id);
      const newWeekly = [...prevData.weekly];
      if (weeklyIndex !== -1) {
        newWeekly[weeklyIndex] = { ...newWeekly[weeklyIndex], ...updates };
      }

      return {
        ...prevData,
        currentUser: updatedUser,
        allTime: newAllTime,
        weekly: newWeekly,
      };
    });
  }, []);

  /**
   * Debounced refetch function (waits 2 seconds before refetching)
   * Prevents multiple rapid refetches
   */
  const debouncedRefetch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (leaderboardType: string) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          log.debug('Debounced refetch triggered', { leaderboardType });
          fetchLeaderboard();
        }, 2000); // 2 second delay
      };
    })(),
    [fetchLeaderboard]
  );

  /**
   * Subscribe/unsubscribe to real-time updates
   * OPTIMIZED: Only listens to leaderboard_update_queue (filters out non-top-20 changes)
   */
  const subscribeToUpdates = useCallback((enabled: boolean) => {
    if (enabled && !subscription) {
      log.debug('Subscribing to optimized real-time updates');

      const channel = supabase
        .channel('leaderboard_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'leaderboard_update_queue',
          },
          (payload) => {
            log.debug('Leaderboard update queued', { payload: payload.new });
            const leaderboardType = payload.new?.leaderboard_type;

            // Debounced refetch (only when top 20 changes)
            if (leaderboardType) {
              debouncedRefetch(leaderboardType);
            }
          }
        )
        .subscribe();

      setSubscription(channel);
    } else if (!enabled && subscription) {
      log.debug('Unsubscribing from real-time updates');
      subscription.unsubscribe();
      setSubscription(null);
    }
  }, [subscription, debouncedRefetch]);

  // Clear cache and refetch when user changes (sign in/out)
  useEffect(() => {
    // When user changes, clear cached data and refetch
    setData(null);
    if (user) {
      // Only refetch if user is authenticated
      fetchLeaderboard();
    }
  }, [user?.id, fetchLeaderboard]); // Refetch when user.id changes

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [subscription]);

  const value: LeaderboardContextType = {
    data,
    loading,
    error,
    refetch,
    invalidateCache,
    updateUserProfile,
    subscribeToUpdates,
  };

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useLeaderboard() {
  const context = useContext(LeaderboardContext);
  if (context === undefined) {
    throw new Error('useLeaderboard must be used within a LeaderboardProvider');
  }
  return context;
}
