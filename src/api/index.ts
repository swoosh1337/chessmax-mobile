/**
 * API Layer
 *
 * Centralized exports for all API modules.
 */

export { default as apiClient, setAuth } from './apiClient';
export { chessApi } from './chessApi';
export { userApi } from './userApi';

// Re-export types
export type {
  AttemptResult,
  StatisticsResponse,
  RecentAttemptResponse,
  WikiNotesResponse,
} from './chessApi';

export type {
  UserStatsResponse,
  CalendarDayResponse,
  ChesscomGameResponse,
  UserConnectionsResponse,
  LichessStatsResponse,
  AuthVerifyResponse,
} from './userApi';
