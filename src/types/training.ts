/**
 * Training-related type definitions
 */

// Re-export existing training mode types from their original location
export type {
  TrainingModeId,
  MoveExplanation,
  EnhancedMove,
  MoveResult,
  TrainingModeConfig,
} from './trainingModes';

export { TrainingMode, TRAINING_MODES } from './trainingModes';

/**
 * A single training session
 */
export interface TrainingSession {
  id: string;
  user_id: string;
  opening_id: string;
  variation_id: string;
  mode: 'learn' | 'drill';
  started_at: string;
  completed_at?: string;
  xp_earned: number;
  errors: number;
  hints_used: number;
  time_seconds: number;
}

/**
 * Variation completion record from database
 */
export interface VariationCompletion {
  id: string;
  user_id: string;
  variation_id: string;
  opening_id: string;
  completed_at: string;
  xp_earned: number;
  errors: number;
  hints_used: number;
  time_seconds: number;
  perfect: boolean;
}

/**
 * Streak data for calendar display
 */
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastTrainingDate: string | null;
}

/**
 * Calendar day data for training calendar
 */
export interface CalendarDay {
  date: string; // YYYY-MM-DD format
  trained: boolean;
  completions: number;
  xp_earned: number;
}

/**
 * Calendar data for a month
 */
export interface CalendarData {
  month: number;
  year: number;
  days: CalendarDay[];
  streak: StreakData;
}

/**
 * Training attempt result
 */
export interface AttemptResult {
  success: boolean;
  xp_earned: number;
  errors: number;
  hints_used: number;
  time_seconds: number;
  perfect: boolean;
}

/**
 * Recent attempt for statistics
 */
export interface RecentAttempt {
  id: string;
  variation_id: string;
  completed_at: string;
  xp_earned: number;
  errors: number;
  time_seconds: number;
  perfect: boolean;
}

/**
 * Training statistics for an opening
 */
export interface TrainingStatistics {
  total_attempts: number;
  perfect_completions: number;
  average_time_seconds: number;
  average_errors: number;
  best_time_seconds: number;
  total_xp_earned: number;
  mastery_level: 'beginner' | 'intermediate' | 'advanced' | 'master';
}

/**
 * Training context value type
 */
export interface TrainingContextValue {
  streak: number;
  longestStreak: number;
  totalMinutes: number;
  isLoading: boolean;
  calendarData: CalendarDay[];
  refetch: () => Promise<void>;
  recordCompletion: (data: RecordCompletionData) => Promise<void>;
}

/**
 * Data for recording a completion
 */
export interface RecordCompletionData {
  openingId: string;
  variationId: string;
  xpEarned: number;
  errors: number;
  hintsUsed: number;
  timeSeconds: number;
  perfect: boolean;
}

/**
 * Type guard for TrainingSession
 */
export function isTrainingSession(obj: unknown): obj is TrainingSession {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj &&
    'opening_id' in obj &&
    'variation_id' in obj
  );
}

/**
 * Type guard for VariationCompletion
 */
export function isVariationCompletion(obj: unknown): obj is VariationCompletion {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'variation_id' in obj &&
    'completed_at' in obj
  );
}
