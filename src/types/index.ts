/**
 * Central type exports
 *
 * Import types from here for consistency:
 * import { UserProfile, Opening, LeaderboardEntry } from '@/src/types';
 */

// User types
export type {
  UserProfile,
  XPStats,
  AuthState,
  Session,
  AuthUser,
  AuthContextValue,
  UserProfileUpdate,
} from './user';

export { isUserProfile } from './user';

// Training types
export type {
  TrainingSession,
  VariationCompletion,
  StreakData,
  CalendarDay,
  CalendarData,
  AttemptResult,
  RecentAttempt,
  TrainingStatistics,
  TrainingContextValue,
  RecordCompletionData,
} from './training';

export {
  isTrainingSession,
  isVariationCompletion,
} from './training';

// Re-export training modes from their original location
export type {
  TrainingModeId,
  MoveExplanation as TrainingMoveExplanation,
  EnhancedMove,
  MoveResult,
  TrainingModeConfig,
} from './trainingModes';

export { TrainingMode, TRAINING_MODES } from './trainingModes';

// Opening types
export type {
  Category,
  Opening,
  Variation,
  MoveExplanation,
  OpeningWithProgress,
  OpeningGroup,
  ParsedPGN,
  OpeningFilters,
  OpeningCacheEntry,
} from './opening';

export { isOpening, isVariation } from './opening';

// Leaderboard types
export type {
  LeaderboardPeriod,
  LeaderboardEntry,
  SpeedrunEntry,
  LeaderboardData,
  LeaderboardContextValue,
  LeaderboardRPCResponse,
  LeaderboardUpdateQueueEntry,
} from './leaderboard';

export { isLeaderboardEntry, isSpeedrunEntry } from './leaderboard';

// API types
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  ApiRequestConfig,
  GetOpeningsResponse,
  GetStatisticsResponse,
  GetRecentAttemptsResponse,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  GetWikiNotesResponse,
  SupabaseError,
} from './api';

export {
  isApiError,
  isSupabaseError,
  createSuccessResponse,
  createErrorResponse,
} from './api';
