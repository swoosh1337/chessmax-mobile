import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { createLogger } from './logger';

const log = createLogger('Storage');

/**
 * Storage keys
 */
const KEYS = {
  HAS_RATED: 'has_rated',
  VARIATIONS_COMPLETED: 'variations_completed',
  LAST_RATING_PROMPT: 'last_rating_prompt',
};

/**
 * Onboarding tracking - Now stored in Supabase user_profiles table
 */
export const onboardingStorage = {
  /**
   * Check if user has seen onboarding (from Supabase)
   */
  async hasSeenOnboarding(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return false; // Not logged in, show onboarding
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('seen_onboarding')
        .eq('id', user.id)
        .single();

      if (error) {
        log.error('Error checking onboarding status', error);
        // If profile doesn't exist, create it with seen_onboarding = false
        if (error.code === 'PGRST116') {
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              username: null,
              total_xp: 0,
              weekly_xp: 0,
              level: 1,
              seen_onboarding: false,
              paywall_seen: false,
            });
          
          if (createError) {
            log.error('Error creating profile', createError);
          }
        }
        return false; // Default to showing onboarding on error
      }

      return profile?.seen_onboarding ?? false;
    } catch (error) {
      log.error('Error checking onboarding status', error);
      return false; // Default to showing onboarding on error
    }
  },

  /**
   * Mark onboarding as seen (update Supabase)
   */
  async markOnboardingSeen(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        log.warn('Cannot mark onboarding as seen: user not authenticated');
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ seen_onboarding: true })
        .eq('id', user.id);

      if (error) {
        log.error('Error marking onboarding as seen', error);
        // If profile doesn't exist, create it with seen_onboarding = true
        if (error.code === 'PGRST116') {
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              username: null,
              total_xp: 0,
              weekly_xp: 0,
              level: 1,
              seen_onboarding: true,
              paywall_seen: false, // They haven't seen paywall yet
            });
          
          if (createError) {
            log.error('Error creating profile', createError);
          }
        }
      }
    } catch (error) {
      log.error('Error marking onboarding as seen', error);
    }
  },

  /**
   * Reset onboarding status (for testing) - updates Supabase
   */
  async resetOnboarding(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ seen_onboarding: false })
        .eq('id', user.id);

      if (error) {
        log.error('Error resetting onboarding', error);
      }
    } catch (error) {
      log.error('Error resetting onboarding', error);
    }
  },
};

/**
 * Rating tracking
 */
export const ratingStorage = {
  /**
   * Check if user has rated the app
   */
  async hasRated(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(KEYS.HAS_RATED);
      return value === 'true';
    } catch (error) {
      log.error('Error checking rating status', error);
      return false;
    }
  },

  /**
   * Mark app as rated
   */
  async markAsRated(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.HAS_RATED, 'true');
      // console.log('[Storage] App marked as rated');
    } catch (error) {
      log.error('Error marking as rated', error);
    }
  },

  /**
   * Get number of variations completed
   */
  async getVariationsCompleted(): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(KEYS.VARIATIONS_COMPLETED);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      log.error('Error getting variations completed', error);
      return 0;
    }
  },

  /**
   * Increment variations completed count
   */
  async incrementVariationsCompleted(): Promise<number> {
    try {
      const current = await this.getVariationsCompleted();
      const newCount = current + 1;
      await AsyncStorage.setItem(KEYS.VARIATIONS_COMPLETED, newCount.toString());
      // console.log('[Storage] Variations completed:', newCount);
      return newCount;
    } catch (error) {
      log.error('Error incrementing variations', error);
      return 0;
    }
  },

  /**
   * Get last rating prompt count (at which variation count was user last prompted)
   */
  async getLastRatingPrompt(): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(KEYS.LAST_RATING_PROMPT);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      log.error('Error getting last rating prompt', error);
      return 0;
    }
  },

  /**
   * Update last rating prompt count
   */
  async updateLastRatingPrompt(count: number): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_RATING_PROMPT, count.toString());
      // console.log('[Storage] Last rating prompt updated:', count);
    } catch (error) {
      log.error('Error updating last rating prompt', error);
    }
  },

  /**
   * Check if we should show rating prompt
   * Shows:
   * - First time: after first variation completion
   * - Subsequent: every 10 variations if not rated
   */
  async shouldShowRatingPrompt(): Promise<boolean> {
    try {
      const hasRated = await this.hasRated();
      if (hasRated) {
        return false;
      }

      const variationsCompleted = await this.getVariationsCompleted();
      const lastPrompt = await this.getLastRatingPrompt();

      // First time: show after first variation
      if (lastPrompt === 0 && variationsCompleted >= 1) {
        return true;
      }

      // Subsequent: show every 10 variations
      if (variationsCompleted - lastPrompt >= 10) {
        return true;
      }

      return false;
    } catch (error) {
      log.error('Error checking if should show rating prompt', error);
      return false;
    }
  },

  /**
   * Reset rating data (for testing)
   */
  async resetRatingData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.HAS_RATED,
        KEYS.VARIATIONS_COMPLETED,
        KEYS.LAST_RATING_PROMPT,
      ]);
      // console.log('[Storage] Rating data reset');
    } catch (error) {
      log.error('Error resetting rating data', error);
    }
  },
};
