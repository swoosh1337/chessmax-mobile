import { useState, useEffect, useCallback, useRef } from 'react';
import { getCompletedVariationsByOpening } from '@/src/services/supabase/trainingService';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('useVariationManager');

export type VariationStatus = 'pending' | 'success' | 'error';

export interface Variation {
  name?: string;
  pgn?: string;
  [key: string]: any;
}

export interface Opening {
  id?: string;
  name?: string;
  color?: 'w' | 'b';
  level?: number;
  variations?: Variation[];
  [key: string]: any;
}

export interface UseVariationManagerOptions {
  initialOpening: Opening | null;
  userId: string | null;
  trainingModeId: 'learn' | 'drill';
}

export interface UseVariationManagerResult {
  currentOpening: Opening | null;
  currentVariationIndex: number;
  currentMode: 'series' | 'random';
  studiedVariationStatuses: VariationStatus[];
  drilledVariationStatuses: VariationStatus[];
  variationStatuses: VariationStatus[];
  completedVariationIds: Set<string>;

  // Actions
  switchToVariation: (index: number) => void;
  handleNextVariation: () => void;
  setCurrentMode: (mode: 'series' | 'random') => void;
  markVariationComplete: (success: boolean) => void;
  getUniqueVariationId: (index: number) => string;
  addCompletedVariation: (variationId: string) => void;
}

/**
 * Hook to manage variation state, switching, and completion tracking
 */
export function useVariationManager({
  initialOpening,
  userId,
  trainingModeId,
}: UseVariationManagerOptions): UseVariationManagerResult {
  // Current opening state
  const [currentOpening, setCurrentOpening] = useState<Opening | null>(() => {
    if (initialOpening && !initialOpening.pgn && initialOpening.variations?.length) {
      return { ...initialOpening, ...initialOpening.variations[0] };
    }
    return initialOpening;
  });

  // Variation tracking
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState<'series' | 'random'>('series');

  // Completion statuses - separate tracking for each mode
  const [studiedVariationStatuses, setStudiedVariationStatuses] = useState<VariationStatus[]>([]);
  const [drilledVariationStatuses, setDrilledVariationStatuses] = useState<VariationStatus[]>([]);

  // Completed variation IDs from database
  const [completedVariationIds, setCompletedVariationIds] = useState<Set<string>>(new Set());

  // Auto-advance flag
  const hasAutoAdvanced = useRef(false);

  // Get unique variation ID
  const getUniqueVariationId = useCallback((index: number) => {
    if (!currentOpening?.id) return `unknown_${index}`;
    const vName = currentOpening?.variations?.[index]?.name || `var_${index}`;
    return `${currentOpening.id}::${vName}`;
  }, [currentOpening?.id, currentOpening?.variations]);

  // Current mode statuses
  const variationStatuses = trainingModeId === 'learn' ? studiedVariationStatuses : drilledVariationStatuses;

  // Fetch completed variations from database
  useEffect(() => {
    if (!userId || !currentOpening?.id) return;

    const fetchCompletions = async () => {
      try {
        const { data: variationIds } = await getCompletedVariationsByOpening(userId, currentOpening.id!);

        if (variationIds) {
          const completedSet = new Set(variationIds);
          setCompletedVariationIds(completedSet);

          // Auto-advance to first uncompleted variation (only once per mount)
          if (!hasAutoAdvanced.current && currentOpening?.variations?.length) {
            hasAutoAdvanced.current = true;

            let firstUncompletedIndex = 0;
            const variations = currentOpening.variations;

            for (let i = 0; i < variations.length; i++) {
              const vName = variations[i].name || `var_${i}`;
              const uid = `${currentOpening.id}::${vName}`;

              if (!completedSet.has(uid)) {
                firstUncompletedIndex = i;
                break;
              }
            }

            // If found an uncompleted variation (and it's not first), switch to it
            if (firstUncompletedIndex > 0) {
              log.debug('Auto-advancing to variation index', { firstUncompletedIndex });
              switchToVariation(firstUncompletedIndex);
            }
          }
        }
      } catch (err) {
        log.error('Error fetching completions', err);
      }
    };

    fetchCompletions();
  }, [userId, currentOpening?.id]);

  // Initialize variation statuses
  useEffect(() => {
    if (!currentOpening?.variations?.length) return;

    const variationCount = currentOpening.variations.length;

    // Initialize studied statuses
    setStudiedVariationStatuses(prev => {
      const next = new Array(variationCount).fill('pending');
      prev.forEach((status, idx) => {
        if (idx < next.length && status !== 'pending') {
          next[idx] = status;
        }
      });
      if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
      return next;
    });

    // Initialize drilled statuses
    setDrilledVariationStatuses(prev => {
      const next = new Array(variationCount).fill('pending');
      prev.forEach((status, idx) => {
        if (idx < next.length && status !== 'pending') {
          next[idx] = status;
        }
      });
      // Mark historically completed variations
      if (completedVariationIds.size > 0) {
        currentOpening.variations.forEach((_, idx) => {
          const uid = getUniqueVariationId(idx);
          if (completedVariationIds.has(uid)) {
            next[idx] = 'success';
          }
        });
      }
      if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
      return next;
    });
  }, [currentOpening?.variations?.length, currentOpening?.id, completedVariationIds, getUniqueVariationId]);

  // Switch to a specific variation
  const switchToVariation = useCallback((index: number) => {
    if (!currentOpening?.variations) return;
    if (index < 0 || index >= currentOpening.variations.length) return;

    const newVariation = currentOpening.variations[index];
    log.debug('switchToVariation', { index, variationName: newVariation?.name });

    setCurrentVariationIndex(index);
    setCurrentOpening(prev => ({
      ...prev,
      ...newVariation,
      name: prev?.name || newVariation?.name,
    }));
  }, [currentOpening?.variations, currentOpening?.name]);

  // Handle next variation (series or random mode)
  const handleNextVariation = useCallback(() => {
    const variations = currentOpening?.variations || [];
    if (!variations.length) return;

    let nextIndex: number;

    if (currentMode === 'series') {
      nextIndex = (currentVariationIndex + 1) % variations.length;
    } else {
      // Random mode: prioritize incomplete variations
      const incompleteIndices = variationStatuses
        .map((status, idx) => ({ status, idx }))
        .filter(({ status }) => status === 'pending')
        .map(({ idx }) => idx);

      if (incompleteIndices.length > 0) {
        const randomIdx = Math.floor(Math.random() * incompleteIndices.length);
        nextIndex = incompleteIndices[randomIdx];
      } else {
        nextIndex = Math.floor(Math.random() * variations.length);
      }
    }

    switchToVariation(nextIndex);
  }, [currentOpening?.variations, currentMode, currentVariationIndex, variationStatuses, switchToVariation]);

  // Mark current variation as complete
  const markVariationComplete = useCallback((success: boolean) => {
    const status: VariationStatus = success ? 'success' : 'error';

    if (trainingModeId === 'learn') {
      setStudiedVariationStatuses(prev => {
        const next = [...prev];
        next[currentVariationIndex] = 'success'; // Learn mode always marks success
        return next;
      });
    } else {
      // Drill mode: update both
      setDrilledVariationStatuses(prev => {
        const next = [...prev];
        next[currentVariationIndex] = status;
        return next;
      });
      setStudiedVariationStatuses(prev => {
        const next = [...prev];
        if (success || next[currentVariationIndex] === 'pending') {
          next[currentVariationIndex] = status;
        }
        return next;
      });
    }
  }, [currentVariationIndex, trainingModeId]);

  // Add a completed variation to the set
  const addCompletedVariation = useCallback((variationId: string) => {
    setCompletedVariationIds(prev => new Set(prev).add(variationId));
  }, []);

  return {
    currentOpening,
    currentVariationIndex,
    currentMode,
    studiedVariationStatuses,
    drilledVariationStatuses,
    variationStatuses,
    completedVariationIds,
    switchToVariation,
    handleNextVariation,
    setCurrentMode,
    markVariationComplete,
    getUniqueVariationId,
    addCompletedVariation,
  };
}
