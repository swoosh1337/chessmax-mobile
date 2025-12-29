/**
 * Supabase Services
 *
 * Centralized exports for all Supabase-related services.
 */

// Client
export { supabase, getCurrentUser, getSession, isAuthenticated, onAuthStateChange } from './client';
export type { User, Session } from './client';

// User Service
export * from './userService';

// Training Service
export * from './trainingService';

// Leaderboard Service
export * from './leaderboardService';
