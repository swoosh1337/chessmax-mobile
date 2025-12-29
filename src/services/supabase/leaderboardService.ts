/**
 * Leaderboard Service
 *
 * Handles all leaderboard-related database operations.
 * Extracts business logic from LeaderboardContext for better testability and reusability.
 */

import { supabase } from './client';
import { createLogger } from '@/src/utils/logger';
import type {
  LeaderboardEntry,
  SpeedrunEntry,
  LeaderboardData,
  LeaderboardPeriod,
} from '@/src/types/leaderboard';
import type { UserProfile } from '@/src/types/user';

const log = createLogger('LeaderboardService');

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Default limit for leaderboard entries
 */
const DEFAULT_LIMIT = 100;

/**
 * Get weekly XP leaderboard
 */
export async function getWeeklyLeaderboard(
  limit: number = DEFAULT_LIMIT
): Promise<ServiceResult<LeaderboardEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, total_xp, weekly_xp, level')
      .gt('weekly_xp', 0)
      .order('weekly_xp', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('Error fetching weekly leaderboard', error);
      return { data: null, error: new Error(error.message) };
    }

    // Add rank to each entry
    const entries: LeaderboardEntry[] = (data || []).map((entry, index) => ({
      id: entry.id,
      username: entry.username,
      total_xp: entry.total_xp,
      weekly_xp: entry.weekly_xp,
      level: entry.level,
      rank: index + 1,
    }));

    return { data: entries, error: null };
  } catch (error) {
    log.error('Error in getWeeklyLeaderboard', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all-time XP leaderboard
 */
export async function getAllTimeLeaderboard(
  limit: number = DEFAULT_LIMIT
): Promise<ServiceResult<LeaderboardEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, total_xp, weekly_xp, level')
      .gt('total_xp', 0)
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('Error fetching all-time leaderboard', error);
      return { data: null, error: new Error(error.message) };
    }

    // Add rank to each entry
    const entries: LeaderboardEntry[] = (data || []).map((entry, index) => ({
      id: entry.id,
      username: entry.username,
      total_xp: entry.total_xp,
      weekly_xp: entry.weekly_xp,
      level: entry.level,
      rank: index + 1,
    }));

    return { data: entries, error: null };
  } catch (error) {
    log.error('Error in getAllTimeLeaderboard', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get speedrun leaderboard (fastest perfect completions)
 */
export async function getSpeedrunLeaderboard(
  limit: number = 20
): Promise<ServiceResult<SpeedrunEntry[]>> {
  try {
    // Use RPC function if available, otherwise fall back to query
    const { data, error } = await supabase.rpc('get_speedrun_leaderboard', {
      limit_count: limit,
    });

    if (error) {
      // Fall back to direct query if RPC doesn't exist
      if (error.code === 'PGRST202') {
        log.warn('Speedrun RPC not found, using fallback query');
        return getSpeedrunLeaderboardFallback(limit);
      }
      log.error('Error fetching speedrun leaderboard', error);
      return { data: null, error: new Error(error.message) };
    }

    const entries: SpeedrunEntry[] = (data || []).map(
      (entry: any, index: number) => ({
        id: entry.user_id || entry.id,
        username: entry.username,
        avg_time_seconds: entry.avg_time_seconds || entry.score,
        perfect_completions: entry.perfect_completions || 0,
        rank: entry.rank || index + 1,
      })
    );

    return { data: entries, error: null };
  } catch (error) {
    log.error('Error in getSpeedrunLeaderboard', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Fallback query for speedrun leaderboard when RPC is not available
 */
async function getSpeedrunLeaderboardFallback(
  limit: number
): Promise<ServiceResult<SpeedrunEntry[]>> {
  try {
    // Get users with perfect completions (errors = 0)
    const { data, error } = await supabase
      .from('variation_completions')
      .select('user_id, completion_time_seconds, errors')
      .eq('errors', 0)
      .order('completion_time_seconds', { ascending: true });

    if (error) {
      log.error('Error in speedrun fallback', error);
      return { data: null, error: new Error(error.message) };
    }

    // Aggregate by user
    const userStats = new Map<
      string,
      { times: number[]; count: number }
    >();

    for (const completion of data || []) {
      const userId = completion.user_id;
      if (!userStats.has(userId)) {
        userStats.set(userId, { times: [], count: 0 });
      }
      const stats = userStats.get(userId)!;
      stats.times.push(completion.completion_time_seconds || 0);
      stats.count++;
    }

    // Get usernames
    const userIds = Array.from(userStats.keys());
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username')
      .in('id', userIds);

    const usernameMap = new Map<string, string | null>();
    for (const profile of profiles || []) {
      usernameMap.set(profile.id, profile.username);
    }

    // Build entries with average times
    const entries: SpeedrunEntry[] = Array.from(userStats.entries())
      .filter(([, stats]) => stats.count >= 3) // Require at least 3 perfect completions
      .map(([userId, stats]) => {
        const avgTime =
          stats.times.reduce((a, b) => a + b, 0) / stats.times.length;
        return {
          id: userId,
          username: usernameMap.get(userId) || null,
          avg_time_seconds: Math.round(avgTime * 100) / 100,
          perfect_completions: stats.count,
          rank: 0, // Will be set below
        };
      })
      .sort((a, b) => a.avg_time_seconds - b.avg_time_seconds)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return { data: entries, error: null };
  } catch (error) {
    log.error('Error in getSpeedrunLeaderboardFallback', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get user's rank in a leaderboard
 */
export async function getUserRank(
  userId: string,
  period: LeaderboardPeriod
): Promise<ServiceResult<number>> {
  try {
    if (period === 'speedrun') {
      // Special handling for speedrun rank
      const { data: entries } = await getSpeedrunLeaderboard(1000);
      const userEntry = entries?.find((e) => e.id === userId);
      return { data: userEntry?.rank || null, error: null };
    }

    // Get user's XP
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(period === 'weekly' ? 'weekly_xp' : 'total_xp')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return { data: null, error: null }; // User not found
      }
      log.error('Error fetching user profile for rank', profileError);
      return { data: null, error: new Error(profileError.message) };
    }

    const xpField = period === 'weekly' ? 'weekly_xp' : 'total_xp';
    const userXP = userProfile[xpField] || 0;

    if (userXP === 0) {
      return { data: null, error: null };
    }

    // Count users with higher XP
    const { count, error: countError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gt(xpField, userXP);

    if (countError) {
      log.error('Error counting users for rank', countError);
      return { data: null, error: new Error(countError.message) };
    }

    return { data: (count || 0) + 1, error: null };
  } catch (error) {
    log.error('Error in getUserRank', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get current user's leaderboard data
 */
export async function getCurrentUserData(
  userId: string
): Promise<ServiceResult<UserProfile>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      log.error('Error fetching current user data', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    log.error('Error in getCurrentUserData', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get complete leaderboard data (all boards + current user)
 */
export async function getLeaderboardData(
  currentUserId?: string
): Promise<ServiceResult<LeaderboardData>> {
  try {
    // Fetch all leaderboards in parallel
    const [allTimeResult, weeklyResult, speedrunResult] = await Promise.all([
      getAllTimeLeaderboard(),
      getWeeklyLeaderboard(),
      getSpeedrunLeaderboard(),
    ]);

    let currentUser: UserProfile | undefined;
    let currentUserSpeedrun: SpeedrunEntry | undefined;

    if (currentUserId) {
      const { data: userData } = await getCurrentUserData(currentUserId);
      if (userData) {
        currentUser = userData;

        // Get user's speedrun entry if not in top 20
        const speedrunEntry = speedrunResult.data?.find(
          (e) => e.id === currentUserId
        );
        if (!speedrunEntry) {
          // User not in top 20, calculate their stats
          const { data: userSpeedrun } = await getUserSpeedrunStats(
            currentUserId
          );
          if (userSpeedrun) {
            currentUserSpeedrun = userSpeedrun;
          }
        }
      }
    }

    return {
      data: {
        allTime: allTimeResult.data || [],
        weekly: weeklyResult.data || [],
        speedrun: speedrunResult.data || [],
        currentUser,
        currentUserSpeedrun,
      },
      error: null,
    };
  } catch (error) {
    log.error('Error in getLeaderboardData', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get user's speedrun statistics
 */
async function getUserSpeedrunStats(
  userId: string
): Promise<ServiceResult<SpeedrunEntry>> {
  try {
    const { data, error } = await supabase
      .from('variation_completions')
      .select('completion_time_seconds')
      .eq('user_id', userId)
      .eq('errors', 0);

    if (error) {
      log.error('Error fetching user speedrun stats', error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data || data.length < 3) {
      return { data: null, error: null }; // Not enough completions
    }

    const times = data.map((d) => d.completion_time_seconds || 0);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    // Get user's rank
    const { data: rank } = await getUserRank(userId, 'speedrun');

    // Get username
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', userId)
      .single();

    return {
      data: {
        id: userId,
        username: profile?.username || null,
        avg_time_seconds: Math.round(avgTime * 100) / 100,
        perfect_completions: data.length,
        rank: rank || 999,
      },
      error: null,
    };
  } catch (error) {
    log.error('Error in getUserSpeedrunStats', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Subscribe to leaderboard updates
 * Returns an unsubscribe function
 */
export function subscribeToLeaderboard(
  callback: (data: LeaderboardData) => void
): () => void {
  const channel = supabase
    .channel('leaderboard-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
      },
      async () => {
        // Refetch leaderboard on any profile update
        const { data } = await getLeaderboardData();
        if (data) {
          callback(data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
