/**
 * useLeaderboardData Hook
 *
 * Provides leaderboard data using the leaderboardService.
 * This is a lightweight alternative to LeaderboardContext when you only need
 * read access to leaderboard data without real-time subscriptions.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getLeaderboardData,
  getWeeklyLeaderboard,
  getAllTimeLeaderboard,
  getSpeedrunLeaderboard,
  getUserRank,
  subscribeToLeaderboard,
} from '@/src/services/supabase/leaderboardService';
import { createLogger } from '@/src/utils/logger';
import type {
  LeaderboardEntry,
  SpeedrunEntry,
  LeaderboardData,
  LeaderboardPeriod,
} from '@/src/types/leaderboard';

const log = createLogger('useLeaderboardData');

interface UseLeaderboardDataOptions {
  /** User ID for getting user-specific data */
  userId?: string | null;
  /** Which leaderboard to fetch (defaults to all) */
  period?: LeaderboardPeriod | 'all';
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Enable real-time subscription */
  realtime?: boolean;
  /** Limit number of entries */
  limit?: number;
}

interface UseLeaderboardDataReturn {
  /** Complete leaderboard data */
  data: LeaderboardData | null;
  /** All-time leaderboard entries */
  allTime: LeaderboardEntry[];
  /** Weekly leaderboard entries */
  weekly: LeaderboardEntry[];
  /** Speedrun leaderboard entries */
  speedrun: SpeedrunEntry[];
  /** Current user's rank in the selected period */
  userRank: number | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh leaderboard data */
  refresh: () => Promise<void>;
  /** Get rank for a specific period */
  getRank: (period: LeaderboardPeriod) => Promise<number | null>;
}

/**
 * Hook for fetching leaderboard data
 *
 * @param options - Configuration options
 * @returns Leaderboard data and operations
 *
 * @example
 * ```tsx
 * // Fetch all leaderboards
 * const { allTime, weekly, speedrun, loading } = useLeaderboardData();
 *
 * // Fetch only weekly leaderboard
 * const { weekly, userRank } = useLeaderboardData({
 *   userId: currentUserId,
 *   period: 'weekly',
 * });
 * ```
 */
export function useLeaderboardData(
  options: UseLeaderboardDataOptions = {}
): UseLeaderboardDataReturn {
  const {
    userId,
    period = 'all',
    autoFetch = true,
    realtime = false,
    limit = 100,
  } = options;

  const [data, setData] = useState<LeaderboardData | null>(null);
  const [allTime, setAllTime] = useState<LeaderboardEntry[]>([]);
  const [weekly, setWeekly] = useState<LeaderboardEntry[]>([]);
  const [speedrun, setSpeedrun] = useState<SpeedrunEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch leaderboard data
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (period === 'all') {
        // Fetch all leaderboards
        const result = await getLeaderboardData(userId || undefined);

        if (result.error) {
          throw result.error;
        }

        if (result.data) {
          setData(result.data);
          setAllTime(result.data.allTime);
          setWeekly(result.data.weekly);
          setSpeedrun(result.data.speedrun);
        }
      } else {
        // Fetch specific leaderboard
        switch (period) {
          case 'weekly':
            const weeklyResult = await getWeeklyLeaderboard(limit);
            if (weeklyResult.error) throw weeklyResult.error;
            setWeekly(weeklyResult.data || []);
            break;

          case 'all_time':
            const allTimeResult = await getAllTimeLeaderboard(limit);
            if (allTimeResult.error) throw allTimeResult.error;
            setAllTime(allTimeResult.data || []);
            break;

          case 'speedrun':
            const speedrunResult = await getSpeedrunLeaderboard(limit);
            if (speedrunResult.error) throw speedrunResult.error;
            setSpeedrun(speedrunResult.data || []);
            break;
        }
      }

      // Fetch user rank if userId provided
      if (userId && period !== 'all') {
        const rankResult = await getUserRank(userId, period as LeaderboardPeriod);
        setUserRank(rankResult.data);
      }

      log.debug('Leaderboard data fetched', { period });
    } catch (err) {
      log.error('Failed to fetch leaderboard', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, period, limit]);

  /**
   * Auto-fetch on mount
   */
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  /**
   * Real-time subscription
   */
  useEffect(() => {
    if (!realtime) return;

    log.debug('Setting up real-time subscription');

    const unsubscribe = subscribeToLeaderboard((newData) => {
      setData(newData);
      setAllTime(newData.allTime);
      setWeekly(newData.weekly);
      setSpeedrun(newData.speedrun);
      log.debug('Leaderboard updated via subscription');
    });

    return () => {
      log.debug('Cleaning up real-time subscription');
      unsubscribe();
    };
  }, [realtime]);

  /**
   * Refresh leaderboard data
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  /**
   * Get rank for a specific period
   */
  const getRank = useCallback(
    async (rankPeriod: LeaderboardPeriod): Promise<number | null> => {
      if (!userId) return null;

      const result = await getUserRank(userId, rankPeriod);
      return result.data;
    },
    [userId]
  );

  return {
    data,
    allTime,
    weekly,
    speedrun,
    userRank,
    loading,
    error,
    refresh,
    getRank,
  };
}

export default useLeaderboardData;
