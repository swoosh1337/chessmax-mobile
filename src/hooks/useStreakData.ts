import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreakData } from '@/src/services/supabase/trainingService';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('useStreakData');

export interface StreakData {
  currentStreak: number;
  weeklyProgress: boolean[];
  showStreakCelebration: boolean;
}

export interface UseStreakDataOptions {
  userId: string | null;
  enabled?: boolean;
}

export interface UseStreakDataResult {
  currentStreak: number;
  weeklyProgress: boolean[];
  showStreakCelebration: boolean;
  setShowStreakCelebration: (show: boolean) => void;
  markStreakAsShown: () => Promise<void>;
}

/**
 * Hook to manage streak data fetching and celebration display
 */
export function useStreakData({
  userId,
  enabled = true,
}: UseStreakDataOptions): UseStreakDataResult {
  const [currentStreak, setCurrentStreak] = useState(1);
  const [weeklyProgress, setWeeklyProgress] = useState([true, false, false, false, false]);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const streakSavedThisSessionRef = useRef(false);

  // Fetch user's streak data
  useEffect(() => {
    if (!enabled || !userId) return;

    const fetchStreak = async () => {
      try {
        const { data: streakData } = await getStreakData(userId);

        if (streakData) {
          setCurrentStreak(Math.max(1, streakData.currentStreak));

          // Calculate weekly progress based on last training date
          const today = new Date();
          const weekProgress = [false, false, false, false, false];

          if (streakData.lastTrainingDate) {
            const todayStr = today.toISOString().split('T')[0];
            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            // Mark today or yesterday as practiced if streak is active
            if (streakData.currentStreak > 0) {
              if (streakData.lastTrainingDate === todayStr) {
                weekProgress[4] = true; // Sunday (last slot)
              } else if (streakData.lastTrainingDate === yesterdayStr) {
                weekProgress[3] = true; // Saturday
              }
            }
          }

          setWeeklyProgress(weekProgress);
        }
      } catch (err) {
        log.error('Error fetching streak', err);
      }
    };

    fetchStreak();
  }, [userId, enabled]);

  // Check if we should show streak celebration (once per day after 12 PM)
  useEffect(() => {
    if (!enabled) return;

    const checkStreakCelebration = async () => {
      try {
        const lastShownStr = await AsyncStorage.getItem('@last_streak_celebration');
        const now = new Date();

        if (__DEV__) {
          log.debug('Checking streak celebration', {
            currentTime: now.toISOString(),
            lastShown: lastShownStr,
          });
        }

        if (!lastShownStr) {
          // Never shown before, show it
          if (__DEV__) log.debug('Never shown before, showing celebration');
          setShowStreakCelebration(true);
          return;
        }

        const lastShown = new Date(lastShownStr);

        // Get today at 12 PM
        const today12PM = new Date();
        today12PM.setHours(12, 0, 0, 0);

        // Get the date of last shown at 12 PM
        const lastShownDate = new Date(lastShown);
        lastShownDate.setHours(12, 0, 0, 0);

        if (__DEV__) {
          log.debug('Streak celebration check', {
            today12PM: today12PM.toISOString(),
            lastShownDate12PM: lastShownDate.toISOString(),
            isAfter12PM: now >= today12PM,
            isDifferentDay: today12PM.getTime() !== lastShownDate.getTime(),
          });
        }

        // Show if:
        // 1. Current time is after 12 PM today AND
        // 2. Last shown was on a different day (comparing 12 PM timestamps)
        if (now >= today12PM && today12PM.getTime() !== lastShownDate.getTime()) {
          if (__DEV__) log.debug('New day after 12 PM, showing celebration');
          setShowStreakCelebration(true);
        } else {
          if (__DEV__) log.debug('Already shown today or before 12 PM, hiding celebration');
          setShowStreakCelebration(false);
        }
      } catch (error) {
        log.error('Error checking streak celebration', error);
        setShowStreakCelebration(true); // Default to showing it
      }
    };

    checkStreakCelebration();
  }, [enabled]);

  // Mark streak celebration as shown
  const markStreakAsShown = async () => {
    if (streakSavedThisSessionRef.current) return;

    if (__DEV__) log.debug('Saving streak timestamp to AsyncStorage');
    streakSavedThisSessionRef.current = true;

    try {
      await AsyncStorage.setItem('@last_streak_celebration', new Date().toISOString());
      if (__DEV__) log.debug('Saved successfully');
    } catch (error) {
      log.error('Error saving streak celebration timestamp', error);
    }
  };

  return {
    currentStreak,
    weeklyProgress,
    showStreakCelebration,
    setShowStreakCelebration,
    markStreakAsShown,
  };
}
