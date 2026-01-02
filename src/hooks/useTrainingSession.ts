/**
 * useTrainingSession Hook
 *
 * Manages a training session lifecycle including starting, tracking progress,
 * and completing sessions. Uses the trainingService for persistence.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  startSession,
  endSession,
  recordCompletion,
  getTrainingStatistics,
  getRecentAttempts,
} from '@/src/services/supabase/trainingService';
import { createLogger } from '@/src/utils/logger';
import type {
  TrainingStatistics,
  RecentAttempt,
  RecordCompletionData,
} from '@/src/types/training';

const log = createLogger('useTrainingSession');

interface SessionState {
  /** Current session ID */
  sessionId: string | null;
  /** Opening being practiced */
  openingName: string | null;
  /** Variation being practiced */
  variationName: string | null;
  /** Session start time */
  startTime: number | null;
  /** Current move index */
  currentMove: number;
  /** Total moves in the variation */
  totalMoves: number;
  /** Error count */
  errors: number;
  /** Hints used count */
  hintsUsed: number;
  /** Whether session is active */
  isActive: boolean;
}

interface UseTrainingSessionOptions {
  /** User ID for the session */
  userId: string | null | undefined;
  /** Opening ID for statistics */
  openingId?: string;
  /** Auto-load statistics on mount */
  autoLoadStats?: boolean;
}

interface UseTrainingSessionReturn {
  /** Current session state */
  session: SessionState;
  /** Training statistics for the opening */
  statistics: TrainingStatistics | null;
  /** Recent attempts for the opening */
  recentAttempts: RecentAttempt[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Start a new training session */
  start: (openingName: string, variationName?: string, totalMoves?: number) => Promise<string | null>;
  /** Record an error in the current session */
  recordError: () => void;
  /** Record a hint used in the current session */
  recordHint: () => void;
  /** Advance to the next move */
  nextMove: () => void;
  /** Complete the current session */
  complete: (xpEarned: number) => Promise<boolean>;
  /** Abort the current session */
  abort: () => void;
  /** Get elapsed time in seconds */
  getElapsedTime: () => number;
  /** Refresh statistics */
  refreshStats: () => Promise<void>;
}

const initialSessionState: SessionState = {
  sessionId: null,
  openingName: null,
  variationName: null,
  startTime: null,
  currentMove: 0,
  totalMoves: 0,
  errors: 0,
  hintsUsed: 0,
  isActive: false,
};

/**
 * Hook for managing training sessions
 *
 * @param options - Configuration options
 * @returns Session state and operations
 *
 * @example
 * ```tsx
 * const { session, start, recordError, complete } = useTrainingSession({
 *   userId,
 *   openingId: 'italian-game',
 * });
 *
 * // Start session
 * await start('Italian Game', 'Main Line', 15);
 *
 * // Track errors
 * recordError();
 *
 * // Complete session
 * await complete(50); // 50 XP earned
 * ```
 */
export function useTrainingSession(
  options: UseTrainingSessionOptions
): UseTrainingSessionReturn {
  const { userId, openingId, autoLoadStats = true } = options;

  const [session, setSession] = useState<SessionState>(initialSessionState);
  const [statistics, setStatistics] = useState<TrainingStatistics | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use ref for elapsed time calculations to avoid stale closure issues
  const startTimeRef = useRef<number | null>(null);

  /**
   * Load statistics for the opening
   */
  const loadStatistics = useCallback(async () => {
    if (!userId || !openingId) return;

    try {
      setLoading(true);

      const [statsResult, attemptsResult] = await Promise.all([
        getTrainingStatistics(userId, openingId),
        getRecentAttempts(userId, openingId, 10),
      ]);

      if (statsResult.data) {
        setStatistics(statsResult.data);
      }

      if (attemptsResult.data) {
        setRecentAttempts(attemptsResult.data);
      }
    } catch (err) {
      log.error('Failed to load statistics', err);
    } finally {
      setLoading(false);
    }
  }, [userId, openingId]);

  /**
   * Auto-load statistics on mount
   */
  useEffect(() => {
    if (autoLoadStats && userId && openingId) {
      loadStatistics();
    }
  }, [autoLoadStats, userId, openingId, loadStatistics]);

  /**
   * Start a new training session
   */
  const start = useCallback(
    async (
      openingName: string,
      variationName?: string,
      totalMoves: number = 0
    ): Promise<string | null> => {
      if (!userId) {
        log.warn('Cannot start session: no userId');
        return null;
      }

      try {
        setError(null);

        const result = await startSession(userId, openingName, variationName);

        if (result.error) {
          throw result.error;
        }

        const sessionId = result.data;
        const now = Date.now();
        startTimeRef.current = now;

        setSession({
          sessionId,
          openingName,
          variationName: variationName || null,
          startTime: now,
          currentMove: 0,
          totalMoves,
          errors: 0,
          hintsUsed: 0,
          isActive: true,
        });

        log.info('Training session started', { sessionId, openingName });
        return sessionId;
      } catch (err) {
        log.error('Failed to start session', err);
        setError(err as Error);
        return null;
      }
    },
    [userId]
  );

  /**
   * Record an error
   */
  const recordError = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      errors: prev.errors + 1,
    }));
  }, []);

  /**
   * Record a hint used
   */
  const recordHint = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1,
    }));
  }, []);

  /**
   * Advance to next move
   */
  const nextMove = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      currentMove: prev.currentMove + 1,
    }));
  }, []);

  /**
   * Get elapsed time in seconds
   */
  const getElapsedTime = useCallback((): number => {
    if (!startTimeRef.current) return 0;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  /**
   * Complete the current session
   */
  const complete = useCallback(
    async (xpEarned: number): Promise<boolean> => {
      if (!session.sessionId || !userId) {
        log.warn('Cannot complete session: no active session');
        return false;
      }

      try {
        const timeSeconds = getElapsedTime();

        // End the session in the database
        const endResult = await endSession(
          session.sessionId,
          session.currentMove,
          session.errors,
          xpEarned
        );

        if (endResult.error) {
          throw endResult.error;
        }

        // Record the completion
        if (openingId && session.variationName) {
          const completionData: RecordCompletionData = {
            variationId: `${openingId}:${session.variationName}`,
            errors: session.errors,
            hintsUsed: session.hintsUsed,
            timeSeconds,
            xpEarned,
          };

          await recordCompletion(userId, completionData);
        }

        log.info('Training session completed', {
          sessionId: session.sessionId,
          errors: session.errors,
          hintsUsed: session.hintsUsed,
          timeSeconds,
          xpEarned,
        });

        // Reset session state
        setSession(initialSessionState);
        startTimeRef.current = null;

        // Refresh statistics
        await loadStatistics();

        return true;
      } catch (err) {
        log.error('Failed to complete session', err);
        setError(err as Error);
        return false;
      }
    },
    [session, userId, openingId, getElapsedTime, loadStatistics]
  );

  /**
   * Abort the current session
   */
  const abort = useCallback(() => {
    if (session.isActive) {
      log.info('Training session aborted', { sessionId: session.sessionId });
    }
    setSession(initialSessionState);
    startTimeRef.current = null;
  }, [session.isActive, session.sessionId]);

  /**
   * Refresh statistics
   */
  const refreshStats = useCallback(async () => {
    await loadStatistics();
  }, [loadStatistics]);

  return {
    session,
    statistics,
    recentAttempts,
    loading,
    error,
    start,
    recordError,
    recordHint,
    nextMove,
    complete,
    abort,
    getElapsedTime,
    refreshStats,
  };
}

export default useTrainingSession;
