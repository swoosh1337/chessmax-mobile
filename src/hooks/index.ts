/**
 * Custom Hooks
 *
 * Centralized exports for all custom hooks.
 * These hooks provide reusable business logic using the services layer.
 *
 * Usage:
 * ```tsx
 * import { useUserProfile, useOpenings, useCalendar } from '@/src/hooks';
 * ```
 */

// User Profile
export { useUserProfile } from './useUserProfile';
export type { default as UseUserProfileReturn } from './useUserProfile';

// Openings
export { useOpenings } from './useOpenings';
export type { default as UseOpeningsReturn } from './useOpenings';

// Training Session
export { useTrainingSession } from './useTrainingSession';
export type { default as UseTrainingSessionReturn } from './useTrainingSession';

// Leaderboard
export { useLeaderboardData } from './useLeaderboardData';
export type { default as UseLeaderboardDataReturn } from './useLeaderboardData';

// Calendar & Streaks
export { useCalendar } from './useCalendar';
export type { default as UseCalendarReturn } from './useCalendar';
