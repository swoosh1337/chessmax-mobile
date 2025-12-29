/**
 * API constants and endpoints
 */

import { BACKEND_URL } from '../config';

// API Configuration
export const API_CONFIG = {
  baseUrl: BACKEND_URL,
  timeout: 30000, // 30 seconds
  retries: 3,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Openings
  openings: {
    list: '/Openings',
    wikiNotes: '/get-wiki-notes',
  },

  // Training
  training: {
    submitAttempt: '/pgn-attempt',
    getStats: '/get-stats',
    recentAttempts: '/recent-attempts',
    recentAttemptsForOpening: '/recent-attempts-for-opening',
    activityCalendar: '/activity-calendar',
  },

  // User
  user: {
    profile: '/user-profile',
    updateUsername: '/update-username',
  },

  // Health
  health: '/health',
} as const;

// Supabase Tables
export const SUPABASE_TABLES = {
  userProfiles: 'user_profiles',
  variationCompletions: 'variation_completions',
  trainingSessions: 'training_sessions',
  speedrunSessions: 'speedrun_sessions',
  leaderboardUpdateQueue: 'leaderboard_update_queue',
} as const;

// Supabase RPC Functions
export const SUPABASE_RPC = {
  getLeaderboardWithUserRank: 'get_leaderboard_with_user_rank',
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  openings: {
    key: '@openings_cache',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  },
  profile: {
    keyPrefix: '@profile_cache_',
    ttl: 5 * 60 * 1000, // 5 minutes
  },
  xpStats: {
    keyPrefix: '@xp_stats_',
    ttl: 5 * 60 * 1000, // 5 minutes
  },
} as const;

// Type exports
export type ApiEndpointsType = typeof API_ENDPOINTS;
export type SupabaseTablesType = typeof SUPABASE_TABLES;
