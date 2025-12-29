/**
 * Chess API
 *
 * API endpoints for chess-related operations.
 */

import apiClient from './apiClient';
import type { Opening } from '@/src/types/opening';

/**
 * Attempt result for API submission
 */
export interface AttemptResult {
  success: boolean;
  errors: number;
  hints_used: number;
  time_seconds: number;
}

/**
 * Statistics response from API
 */
export interface StatisticsResponse {
  total_attempts: number;
  successful_attempts: number;
  average_time_seconds: number;
  best_time_seconds: number;
  total_xp: number;
}

/**
 * Recent attempt response
 */
export interface RecentAttemptResponse {
  id: string;
  created_at: string;
  result: AttemptResult;
  xp_earned: number;
}

/**
 * Wiki notes response
 */
export interface WikiNotesResponse {
  notes: string;
  source?: string;
}

export const chessApi = {
  /**
   * Get all chess openings
   */
  getOpenings: (): Promise<Opening[]> => apiClient.get('/Openings'),

  /**
   * Get wiki notes for a specific PGN
   */
  getWikiNotes: (pgn: string): Promise<WikiNotesResponse> =>
    apiClient.get('/get-wiki-notes', { params: { pgn } }),

  /**
   * Submit an attempt for a variation
   */
  submitAttempt: (
    userId: string,
    openingId: string,
    pgnId: string,
    result: AttemptResult
  ): Promise<{ xp_earned: number }> =>
    apiClient.post('/pgn-attempt', {
      user_id: userId,
      opening_id: openingId,
      pgn_id: pgnId,
      result,
    }),

  /**
   * Get statistics for a specific opening
   */
  getStatistics: (
    userId: string,
    openingId: string
  ): Promise<StatisticsResponse> =>
    apiClient.get('/get-stats', {
      params: { user_id: userId, opening_id: openingId },
    }),

  /**
   * Get recent attempts for a specific PGN
   */
  getRecentAttempts: (
    userId: string,
    openingId: string,
    pgnId: string,
    limit: number = 5
  ): Promise<RecentAttemptResponse[]> =>
    apiClient.get('/recent-attempts', {
      params: { user_id: userId, opening_id: openingId, pgn_id: pgnId, limit },
    }),

  /**
   * Get recent attempts for an opening (all variations)
   */
  getRecentAttemptsForOpening: (
    userId: string,
    openingId: string,
    limit: number = 5
  ): Promise<RecentAttemptResponse[]> =>
    apiClient.get('/recent-attempts-for-opening', {
      params: { user_id: userId, opening_id: openingId, limit },
    }),
};
