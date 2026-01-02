/**
 * useCalendar Hook
 *
 * Provides training calendar data and streak tracking using the trainingService.
 * Useful for displaying training history, streaks, and activity calendars.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getCalendarData,
  getStreakData,
} from '@/src/services/supabase/trainingService';
import { createLogger } from '@/src/utils/logger';
import type {
  CalendarData,
  CalendarDay,
  StreakData,
} from '@/src/types/training';

const log = createLogger('useCalendar');

interface UseCalendarOptions {
  /** User ID for calendar data */
  userId: string | null | undefined;
  /** Initial month (1-12) */
  initialMonth?: number;
  /** Initial year */
  initialYear?: number;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

interface UseCalendarReturn {
  /** Calendar data for current month */
  calendarData: CalendarData | null;
  /** Training days in current month */
  trainingDays: CalendarDay[];
  /** Streak data */
  streak: StreakData | null;
  /** Current month being viewed */
  currentMonth: number;
  /** Current year being viewed */
  currentYear: number;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Navigate to previous month */
  previousMonth: () => void;
  /** Navigate to next month */
  nextMonth: () => void;
  /** Navigate to specific month */
  goToMonth: (month: number, year: number) => void;
  /** Go to current month */
  goToToday: () => void;
  /** Refresh calendar data */
  refresh: () => Promise<void>;
  /** Check if a specific date was trained */
  wasTrainedOn: (date: string) => boolean;
  /** Get XP earned on a specific date */
  getXPForDate: (date: string) => number;
  /** Total XP earned in current month */
  monthlyXP: number;
  /** Total training days in current month */
  monthlyTrainingDays: number;
}

/**
 * Hook for managing training calendar and streak data
 *
 * @param options - Configuration options
 * @returns Calendar data and operations
 *
 * @example
 * ```tsx
 * const {
 *   trainingDays,
 *   streak,
 *   currentMonth,
 *   nextMonth,
 *   previousMonth,
 * } = useCalendar({ userId });
 *
 * return (
 *   <Calendar
 *     month={currentMonth}
 *     trainedDays={trainingDays}
 *     onPrev={previousMonth}
 *     onNext={nextMonth}
 *   />
 * );
 * ```
 */
export function useCalendar(options: UseCalendarOptions): UseCalendarReturn {
  const {
    userId,
    initialMonth = new Date().getMonth() + 1,
    initialYear = new Date().getFullYear(),
    autoFetch = true,
  } = options;

  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch calendar data for current month
   */
  const fetchCalendarData = useCallback(async () => {
    if (!userId) {
      setCalendarData(null);
      setStreak(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getCalendarData(userId, currentMonth, currentYear);

      if (result.error) {
        throw result.error;
      }

      if (result.data) {
        setCalendarData(result.data);
        setStreak(result.data.streak);
      }

      log.debug('Calendar data fetched', { month: currentMonth, year: currentYear });
    } catch (err) {
      log.error('Failed to fetch calendar data', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, currentMonth, currentYear]);

  /**
   * Fetch streak data separately (for quick updates)
   */
  const fetchStreakData = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await getStreakData(userId);
      if (result.data) {
        setStreak(result.data);
      }
    } catch (err) {
      log.warn('Failed to fetch streak data', { error: err });
    }
  }, [userId]);

  /**
   * Auto-fetch on mount and when month/year changes
   */
  useEffect(() => {
    if (autoFetch) {
      fetchCalendarData();
    }
  }, [autoFetch, fetchCalendarData]);

  /**
   * Training days in current month
   */
  const trainingDays = useMemo(() => {
    return calendarData?.days || [];
  }, [calendarData]);

  /**
   * Navigate to previous month
   */
  const previousMonth = useCallback(() => {
    setCurrentMonth((prevMonth) => {
      if (prevMonth === 1) {
        setCurrentYear((y) => y - 1);
        return 12;
      }
      return prevMonth - 1;
    });
  }, []);

  /**
   * Navigate to next month
   */
  const nextMonth = useCallback(() => {
    setCurrentMonth((prevMonth) => {
      if (prevMonth === 12) {
        setCurrentYear((y) => y + 1);
        return 1;
      }
      return prevMonth + 1;
    });
  }, []);

  /**
   * Navigate to specific month
   */
  const goToMonth = useCallback((month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  }, []);

  /**
   * Go to current month
   */
  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now.getMonth() + 1);
    setCurrentYear(now.getFullYear());
  }, []);

  /**
   * Refresh calendar data
   */
  const refresh = useCallback(async () => {
    await fetchCalendarData();
  }, [fetchCalendarData]);

  /**
   * Check if a specific date was trained
   */
  const wasTrainedOn = useCallback(
    (date: string): boolean => {
      return trainingDays.some((day) => day.date === date && day.trained);
    },
    [trainingDays]
  );

  /**
   * Get XP earned on a specific date
   */
  const getXPForDate = useCallback(
    (date: string): number => {
      const day = trainingDays.find((d) => d.date === date);
      return day?.xp_earned || 0;
    },
    [trainingDays]
  );

  /**
   * Total XP earned in current month
   */
  const monthlyXP = useMemo(() => {
    return trainingDays.reduce((sum, day) => sum + (day.xp_earned || 0), 0);
  }, [trainingDays]);

  /**
   * Total training days in current month
   */
  const monthlyTrainingDays = useMemo(() => {
    return trainingDays.filter((day) => day.trained).length;
  }, [trainingDays]);

  return {
    calendarData,
    trainingDays,
    streak,
    currentMonth,
    currentYear,
    loading,
    error,
    previousMonth,
    nextMonth,
    goToMonth,
    goToToday,
    refresh,
    wasTrainedOn,
    getXPForDate,
    monthlyXP,
    monthlyTrainingDays,
  };
}

export default useCalendar;
