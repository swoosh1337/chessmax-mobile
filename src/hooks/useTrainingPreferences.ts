import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrainingModeId } from '@/src/types/trainingModes';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('useTrainingPreferences');

const TRAINING_MODE_KEY = '@training_mode';

export interface UseTrainingPreferencesOptions {
  hasMovesWithExplanations?: boolean;
}

export interface UseTrainingPreferencesResult {
  trainingModeId: TrainingModeId;
  setTrainingModeId: (mode: TrainingModeId) => void;
  isLoading: boolean;
}

/**
 * Hook to persist and load training mode preference
 */
export function useTrainingPreferences({
  hasMovesWithExplanations = true,
}: UseTrainingPreferencesOptions = {}): UseTrainingPreferencesResult {
  const [trainingModeId, setTrainingModeIdState] = useState<TrainingModeId>('drill');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved training mode preference on mount
  useEffect(() => {
    const loadTrainingMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(TRAINING_MODE_KEY);
        if (savedMode && (savedMode === 'learn' || savedMode === 'drill')) {
          // Only set 'learn' mode if explanations are available
          if (savedMode === 'learn' && !hasMovesWithExplanations) {
            setTrainingModeIdState('drill');
          } else {
            setTrainingModeIdState(savedMode as TrainingModeId);
          }
        }
      } catch (error) {
        log.error('Error loading training mode', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrainingMode();
  }, [hasMovesWithExplanations]);

  // Save training mode preference when it changes
  const setTrainingModeId = useCallback((mode: TrainingModeId) => {
    setTrainingModeIdState(mode);

    // Save asynchronously
    AsyncStorage.setItem(TRAINING_MODE_KEY, mode).catch((error) => {
      log.error('Error saving training mode', error);
    });
  }, []);

  return {
    trainingModeId,
    setTrainingModeId,
    isLoading,
  };
}
