/**
 * Leaderboard-related type definitions
 */

import { UserProfile } from './user';

/**
 * Leaderboard time period
 */
export type LeaderboardPeriod = 'weekly' | 'allTime' | 'speedrun';

/**
 * Leaderboard entry for XP-based rankings
 */
export interface LeaderboardEntry {
  id: string;
  username: string | null;
  total_xp: number;
  weekly_xp: number;
  level: number;
  rank: number;
  isCurrentUser?: boolean;
}

/**
 * Speedrun leaderboard entry
 */
export interface SpeedrunEntry {
  id: string;
  username: string | null;
  avg_time_seconds: number;
  perfect_completions: number;
  rank: number;
  isCurrentUser?: boolean;
}

/**
 * Combined leaderboard data
 */
export interface LeaderboardData {
  allTime: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  speedrun: SpeedrunEntry[];
  currentUser?: UserProfile;
  currentUserSpeedrun?: SpeedrunEntry;
}

/**
 * Leaderboard context value type
 */
export interface LeaderboardContextValue {
  data: LeaderboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  subscribeToUpdates: (enabled: boolean) => void;
}

/**
 * Leaderboard RPC response from Supabase
 */
export interface LeaderboardRPCResponse {
  user_id: string;
  username: string | null;
  score: number;
  rank: number;
  is_current_user: boolean;
  perfect_completions?: number;
}

/**
 * Leaderboard update queue entry
 */
export interface LeaderboardUpdateQueueEntry {
  id: string;
  leaderboard_type: LeaderboardPeriod;
  user_id: string;
  created_at: string;
}

/**
 * Type guard for LeaderboardEntry
 */
export function isLeaderboardEntry(obj: unknown): obj is LeaderboardEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'rank' in obj &&
    typeof (obj as LeaderboardEntry).rank === 'number'
  );
}

/**
 * Type guard for SpeedrunEntry
 */
export function isSpeedrunEntry(obj: unknown): obj is SpeedrunEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'avg_time_seconds' in obj &&
    typeof (obj as SpeedrunEntry).avg_time_seconds === 'number'
  );
}
