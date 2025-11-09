import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys
 */
const KEYS = {
  ONBOARDING_SEEN: 'onboarding_seen',
  HAS_RATED: 'has_rated',
  VARIATIONS_COMPLETED: 'variations_completed',
  LAST_RATING_PROMPT: 'last_rating_prompt',
};

/**
 * Onboarding tracking
 */
export const onboardingStorage = {
  /**
   * Check if user has seen onboarding
   */
  async hasSeenOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(KEYS.ONBOARDING_SEEN);
      const result = value === 'true';
      // console.log('[Storage] hasSeenOnboarding:', result, 'raw value:', value);
      return result;
    } catch (error) {
      console.error('[Storage] Error checking onboarding status:', error);
      return false;
    }
  },

  /**
   * Mark onboarding as seen
   */
  async markOnboardingSeen(): Promise<void> {
    try {
      // console.log('[Storage] BEFORE marking onboarding as seen');
      await AsyncStorage.setItem(KEYS.ONBOARDING_SEEN, 'true');
      // console.log('[Storage] AFTER AsyncStorage.setItem');

      // Verify it was saved
      // const check = await AsyncStorage.getItem(KEYS.ONBOARDING_SEEN);
      // console.log('[Storage] Verification - onboarding value:', check);
    } catch (error) {
      console.error('[Storage] Error marking onboarding as seen:', error);
    }
  },

  /**
   * Reset onboarding status (for testing)
   */
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.ONBOARDING_SEEN);
      // console.log('[Storage] Onboarding status reset');
    } catch (error) {
      console.error('[Storage] Error resetting onboarding:', error);
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
      console.error('[Storage] Error checking rating status:', error);
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
      console.error('[Storage] Error marking as rated:', error);
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
      console.error('[Storage] Error getting variations completed:', error);
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
      console.error('[Storage] Error incrementing variations:', error);
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
      console.error('[Storage] Error getting last rating prompt:', error);
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
      console.error('[Storage] Error updating last rating prompt:', error);
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
      console.error('[Storage] Error checking if should show rating prompt:', error);
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
      console.error('[Storage] Error resetting rating data:', error);
    }
  },
};
