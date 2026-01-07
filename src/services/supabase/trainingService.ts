/**
 * Training Service
 *
 * Handles all training-related database operations.
 * Extracts business logic from components for better testability and reusability.
 */

import { supabase } from './client';
import { createLogger } from '@/src/utils/logger';
import type {
  CalendarDay,
  CalendarData,
  StreakData,
  RecentAttempt,
  RecordCompletionData,
  TrainingStatistics,
} from '@/src/types/training';

const log = createLogger('TrainingService');

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Get all completed variation IDs for a user
 */
export async function getCompletedVariations(
  userId: string
): Promise<ServiceResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('variation_completions')
      .select('variation_id')
      .eq('user_id', userId)
      .eq('xp_earned', 0) // Only count completions where XP was not earned (already completed)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching completed variations', error);
      return { data: null, error: new Error(error.message) };
    }

    // Extract unique variation IDs
    const variationIds = [...new Set(data?.map((d) => d.variation_id) || [])];
    return { data: variationIds, error: null };
  } catch (error) {
    log.error('Error in getCompletedVariations', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all completed variation IDs (with XP earned) for a user
 */
export async function getSuccessfullyCompletedVariations(
  userId: string
): Promise<ServiceResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('variation_completions')
      .select('variation_id')
      .eq('user_id', userId)
      .gt('xp_earned', 0) // Only completions where XP was earned
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching successfully completed variations', error);
      return { data: null, error: new Error(error.message) };
    }

    // Extract unique variation IDs
    const variationIds = [...new Set(data?.map((d) => d.variation_id) || [])];
    return { data: variationIds, error: null };
  } catch (error) {
    log.error('Error in getSuccessfullyCompletedVariations', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get successfully completed variation IDs for a specific opening
 * Returns variations where user completed with no errors
 */
export async function getCompletedVariationsByOpening(
  userId: string,
  openingId: string
): Promise<ServiceResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('variation_completions')
      .select('variation_id')
      .eq('user_id', userId)
      .eq('errors', 0)
      .ilike('variation_id', `${openingId}::%`);

    if (error) {
      log.error('Error fetching completed variations by opening', error);
      return { data: null, error: new Error(error.message) };
    }

    // Extract unique variation IDs
    const variationIds = [...new Set(data?.map((d) => d.variation_id) || [])];
    return { data: variationIds, error: null };
  } catch (error) {
    log.error('Error in getCompletedVariationsByOpening', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Record a variation completion
 */
export async function recordCompletion(
  userId: string,
  data: RecordCompletionData
): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase.from('variation_completions').insert({
      user_id: userId,
      variation_id: data.variationId,
      difficulty: 1, // TODO: Get from opening data
      errors: data.errors,
      hints_used: data.hintsUsed,
      completion_time_seconds: data.timeSeconds,
      xp_earned: data.xpEarned,
    });

    if (error) {
      log.error('Error recording completion', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: undefined, error: null };
  } catch (error) {
    log.error('Error in recordCompletion', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get streak data for a user
 */
export async function getStreakData(
  userId: string
): Promise<ServiceResult<StreakData>> {
  try {
    // Get training sessions from the last 365 days for streak calculation
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data, error } = await supabase
      .from('training_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', oneYearAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching streak data', error);
      return { data: null, error: new Error(error.message) };
    }

    // Calculate streak
    const streakData = calculateStreak(data || []);
    return { data: streakData, error: null };
  } catch (error) {
    log.error('Error in getStreakData', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Calculate streak from session data
 */
function calculateStreak(
  sessions: Array<{ created_at: string }>
): StreakData {
  if (!sessions.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastTrainingDate: null,
    };
  }

  // Get unique dates (in local timezone)
  const uniqueDates = new Set<string>();
  sessions.forEach((s) => {
    const date = new Date(s.created_at);
    const dateStr = date.toISOString().split('T')[0];
    uniqueDates.add(dateStr);
  });

  const sortedDates = Array.from(uniqueDates).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Check if streak is still active (trained today or yesterday)
  const streakActive = sortedDates[0] === today || sortedDates[0] === yesterday;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate streaks
  let previousDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const date = new Date(dateStr);

    if (previousDate === null) {
      tempStreak = 1;
      if (streakActive) currentStreak = 1;
    } else {
      const daysDiff = Math.floor(
        (previousDate.getTime() - date.getTime()) / 86400000
      );

      if (daysDiff === 1) {
        tempStreak++;
        if (streakActive && currentStreak > 0) currentStreak++;
      } else {
        // Streak broken
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        if (currentStreak > 0) {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 0;
        }
      }
    }

    previousDate = date;
  }

  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    currentStreak: streakActive ? currentStreak : 0,
    longestStreak,
    lastTrainingDate: sortedDates[0] || null,
  };
}

/**
 * Get calendar data for a month
 */
export async function getCalendarData(
  userId: string,
  month: number,
  year: number
): Promise<ServiceResult<CalendarData>> {
  try {
    // Get first and last day of month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data: sessions, error } = await supabase
      .from('training_sessions')
      .select('created_at, xp_earned')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      log.error('Error fetching calendar data', error);
      return { data: null, error: new Error(error.message) };
    }

    // Group sessions by date
    const dayMap = new Map<string, CalendarDay>();

    for (const session of sessions || []) {
      const dateStr = session.created_at.split('T')[0];

      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, {
          date: dateStr,
          trained: true,
          completions: 0,
          xp_earned: 0,
        });
      }

      const day = dayMap.get(dateStr)!;
      day.completions++;
      day.xp_earned += session.xp_earned || 0;
    }

    // Get streak data
    const { data: streakData } = await getStreakData(userId);

    return {
      data: {
        month,
        year,
        days: Array.from(dayMap.values()),
        streak: streakData || {
          currentStreak: 0,
          longestStreak: 0,
          lastTrainingDate: null,
        },
      },
      error: null,
    };
  } catch (error) {
    log.error('Error in getCalendarData', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get recent attempts for an opening
 */
export async function getRecentAttempts(
  userId: string,
  openingId: string,
  limit: number = 10
): Promise<ServiceResult<RecentAttempt[]>> {
  try {
    const { data, error } = await supabase
      .from('variation_completions')
      .select('id, variation_id, created_at, xp_earned, errors, completion_time_seconds')
      .eq('user_id', userId)
      .like('variation_id', `${openingId}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('Error fetching recent attempts', error);
      return { data: null, error: new Error(error.message) };
    }

    const attempts: RecentAttempt[] = (data || []).map((d) => ({
      id: d.id,
      variation_id: d.variation_id,
      completed_at: d.created_at,
      xp_earned: d.xp_earned || 0,
      errors: d.errors || 0,
      time_seconds: d.completion_time_seconds || 0,
      perfect: d.errors === 0,
    }));

    return { data: attempts, error: null };
  } catch (error) {
    log.error('Error in getRecentAttempts', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get training statistics for an opening
 */
export async function getTrainingStatistics(
  userId: string,
  openingId: string
): Promise<ServiceResult<TrainingStatistics>> {
  try {
    const { data, error } = await supabase
      .from('variation_completions')
      .select('xp_earned, errors, completion_time_seconds')
      .eq('user_id', userId)
      .like('variation_id', `${openingId}%`);

    if (error) {
      log.error('Error fetching training statistics', error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return {
        data: {
          total_attempts: 0,
          perfect_completions: 0,
          average_time_seconds: 0,
          average_errors: 0,
          best_time_seconds: 0,
          total_xp_earned: 0,
          mastery_level: 'beginner',
        },
        error: null,
      };
    }

    const totalAttempts = data.length;
    const perfectCompletions = data.filter((d) => d.errors === 0).length;
    const totalTime = data.reduce((sum, d) => sum + (d.completion_time_seconds || 0), 0);
    const totalErrors = data.reduce((sum, d) => sum + (d.errors || 0), 0);
    const totalXP = data.reduce((sum, d) => sum + (d.xp_earned || 0), 0);
    const bestTime = Math.min(...data.map((d) => d.completion_time_seconds || Infinity));

    // Calculate mastery level based on perfect completion percentage
    const perfectPercentage = perfectCompletions / totalAttempts;
    let masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'master' = 'beginner';
    if (perfectPercentage >= 0.9 && totalAttempts >= 20) {
      masteryLevel = 'master';
    } else if (perfectPercentage >= 0.7 && totalAttempts >= 10) {
      masteryLevel = 'advanced';
    } else if (perfectPercentage >= 0.5 && totalAttempts >= 5) {
      masteryLevel = 'intermediate';
    }

    return {
      data: {
        total_attempts: totalAttempts,
        perfect_completions: perfectCompletions,
        average_time_seconds: Math.round(totalTime / totalAttempts),
        average_errors: Math.round((totalErrors / totalAttempts) * 10) / 10,
        best_time_seconds: bestTime === Infinity ? 0 : bestTime,
        total_xp_earned: totalXP,
        mastery_level: masteryLevel,
      },
      error: null,
    };
  } catch (error) {
    log.error('Error in getTrainingStatistics', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Start a training session
 */
export async function startSession(
  userId: string,
  openingName: string,
  variationName?: string,
  category?: string
): Promise<ServiceResult<string>> {
  try {
    const { data, error } = await supabase
      .from('training_sessions')
      .insert({
        user_id: userId,
        opening_name: openingName,
        variation_name: variationName,
        category: category,
      })
      .select('id')
      .single();

    if (error) {
      log.error('Error starting session', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data.id, error: null };
  } catch (error) {
    log.error('Error in startSession', error);
    return { data: null, error: error as Error };
  }
}

/**
 * End a training session
 */
export async function endSession(
  sessionId: string,
  movesCompleted: number,
  errors: number,
  xpEarned: number
): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .from('training_sessions')
      .update({
        completed_at: new Date().toISOString(),
        moves_completed: movesCompleted,
        errors,
        xp_earned: xpEarned,
      })
      .eq('id', sessionId);

    if (error) {
      log.error('Error ending session', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: undefined, error: null };
  } catch (error) {
    log.error('Error in endSession', error);
    return { data: null, error: error as Error };
  }
}
