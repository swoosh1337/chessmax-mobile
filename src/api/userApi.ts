/**
 * User API
 *
 * API endpoints for user-related operations.
 */

import apiClient from './apiClient';

/**
 * User stats response
 */
export interface UserStatsResponse {
  total_xp: number;
  weekly_xp: number;
  level: number;
  rank?: number;
  total_attempts: number;
  successful_attempts: number;
}

/**
 * Activity calendar day
 */
export interface CalendarDayResponse {
  date: string;
  count: number;
  xp: number;
}

/**
 * Chess.com game response
 */
export interface ChesscomGameResponse {
  id: string;
  white: string;
  black: string;
  result: string;
  time_class: string;
  url: string;
  pgn?: string;
  end_time: number;
}

/**
 * User connections response
 */
export interface UserConnectionsResponse {
  chesscom_username?: string;
  lichess_username?: string;
}

/**
 * Lichess stats response
 */
export interface LichessStatsResponse {
  username: string;
  perfs: Record<string, { rating: number; games: number }>;
}

/**
 * Auth verification response
 */
export interface AuthVerifyResponse {
  valid: boolean;
  user_id?: string;
}

export const userApi = {
  /**
   * Get user statistics
   */
  getUserStats: (userId: string): Promise<UserStatsResponse> =>
    apiClient.get('/get-stats', {
      params: { user_id: userId, _t: Date.now() },
    }),

  /**
   * Get activity calendar data
   */
  getActivityCalendar: (userId: string): Promise<CalendarDayResponse[]> =>
    apiClient.get('/activity-calendar', {
      params: { user_id: userId, _t: Date.now() },
    }),

  /**
   * Get recent games from Chess.com
   */
  getChesscomRecentGames: (
    username: string,
    limit: number = 8,
    offset: number = 0
  ): Promise<ChesscomGameResponse[]> =>
    apiClient.get(`/chesscom-recent-games/${username}`, {
      params: { limit, offset, _t: Date.now() },
    }),

  /**
   * Get user's connected accounts
   */
  getUserConnections: (userId: string): Promise<UserConnectionsResponse> =>
    apiClient.get('/user-connections', {
      params: { user_id: userId, _t: Date.now() },
    }),

  /**
   * Update user's connected accounts
   */
  updateUserConnections: (
    userId: string,
    connections: { chesscomUsername?: string; lichessUsername?: string }
  ): Promise<void> =>
    apiClient.put('/user-connections', {
      user_id: userId,
      chesscomUsername: connections.chesscomUsername,
      lichessUsername: connections.lichessUsername,
    }),

  /**
   * Get Lichess stats for a user
   */
  getLichessStats: (username: string): Promise<LichessStatsResponse | []> => {
    const trimmed = (username || '').trim();
    if (!trimmed) return Promise.resolve([]);
    return apiClient.get('/lichess/stats', {
      params: { username: trimmed, _t: Date.now() },
    });
  },

  /**
   * Authenticate with Google token
   */
  authenticateWithGoogle: (
    token: string
  ): Promise<{ user_id: string; token: string }> =>
    apiClient.post('/auth/google/callback', { token }),

  /**
   * Verify authentication status
   */
  verifyAuthStatus: (token: string): Promise<AuthVerifyResponse> =>
    apiClient.post('/auth/verify', { token }),
};
