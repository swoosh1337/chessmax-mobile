/**
 * Tests for trainingService
 */

// Mock Supabase client before importing the service
jest.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { supabase } from '@/src/services/supabase/client';
import {
  getCompletedVariations,
  getSuccessfullyCompletedVariations,
  getCompletedVariationsByOpening,
  recordCompletion,
  getStreakData,
  getCalendarData,
  getRecentAttempts,
  getTrainingStatistics,
  startSession,
  endSession,
} from '@/src/services/supabase/trainingService';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('trainingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create mock query builder
  const createMockQueryBuilder = (data: any, error: any = null) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    then: jest.fn((resolve) => resolve({ data, error })),
  });

  describe('getCompletedVariations', () => {
    it('should return variation IDs for user', async () => {
      const mockData = [
        { variation_id: 'opening1::var1' },
        { variation_id: 'opening1::var2' },
        { variation_id: 'opening1::var1' }, // duplicate
      ];

      const mockBuilder = createMockQueryBuilder(mockData);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCompletedVariations('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('variation_completions');
      expect(mockBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockBuilder.eq).toHaveBeenCalledWith('xp_earned', 0);
      expect(result.data).toEqual(['opening1::var1', 'opening1::var2']); // deduplicated
      expect(result.error).toBeNull();
    });

    it('should return empty array when no completions', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCompletedVariations('user-123');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should return error when query fails', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'DB error' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCompletedVariations('user-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('DB error');
    });
  });

  describe('getSuccessfullyCompletedVariations', () => {
    it('should return variations with XP earned', async () => {
      const mockData = [
        { variation_id: 'opening1::var1' },
        { variation_id: 'opening1::var2' },
      ];

      const mockBuilder = createMockQueryBuilder(mockData);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getSuccessfullyCompletedVariations('user-123');

      expect(mockBuilder.gt).toHaveBeenCalledWith('xp_earned', 0);
      expect(result.data).toEqual(['opening1::var1', 'opening1::var2']);
      expect(result.error).toBeNull();
    });
  });

  describe('getCompletedVariationsByOpening', () => {
    it('should return variations for specific opening', async () => {
      const mockData = [
        { variation_id: 'italian-game::mainline' },
        { variation_id: 'italian-game::giuoco-piano' },
      ];

      const mockBuilder = createMockQueryBuilder(mockData);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCompletedVariationsByOpening('user-123', 'italian-game');

      expect(mockBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockBuilder.eq).toHaveBeenCalledWith('errors', 0);
      expect(mockBuilder.ilike).toHaveBeenCalledWith('variation_id', 'italian-game::%');
      expect(result.data).toEqual(['italian-game::mainline', 'italian-game::giuoco-piano']);
      expect(result.error).toBeNull();
    });

    it('should return empty array when no completions for opening', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCompletedVariationsByOpening('user-123', 'unknown-opening');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('recordCompletion', () => {
    it('should insert completion record', async () => {
      const mockBuilder = createMockQueryBuilder(null);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await recordCompletion('user-123', {
        variationId: 'opening1::var1',
        errors: 2,
        hintsUsed: 1,
        timeSeconds: 120,
        xpEarned: 50,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('variation_completions');
      expect(mockBuilder.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        variation_id: 'opening1::var1',
        difficulty: 1,
        errors: 2,
        hints_used: 1,
        completion_time_seconds: 120,
        xp_earned: 50,
      });
      expect(result.error).toBeNull();
    });

    it('should return error when insert fails', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'Insert failed' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await recordCompletion('user-123', {
        variationId: 'opening1::var1',
        errors: 0,
        hintsUsed: 0,
        timeSeconds: 60,
        xpEarned: 100,
      });

      expect(result.error?.message).toBe('Insert failed');
    });
  });

  describe('getStreakData', () => {
    it('should return streak data for user with sessions', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockData = [
        { created_at: today.toISOString() },
        { created_at: yesterday.toISOString() },
      ];

      const mockBuilder = createMockQueryBuilder(mockData);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getStreakData('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('training_sessions');
      expect(result.data).toBeDefined();
      expect(result.data?.currentStreak).toBeGreaterThanOrEqual(0);
      expect(result.data?.longestStreak).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeNull();
    });

    it('should return zero streak when no sessions', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getStreakData('user-123');

      expect(result.data?.currentStreak).toBe(0);
      expect(result.data?.longestStreak).toBe(0);
      expect(result.data?.lastTrainingDate).toBeNull();
    });
  });

  describe('getCalendarData', () => {
    it('should return calendar data for month', async () => {
      const mockSessions = [
        { created_at: '2026-01-01T10:00:00Z', xp_earned: 50 },
        { created_at: '2026-01-01T14:00:00Z', xp_earned: 30 },
        { created_at: '2026-01-02T10:00:00Z', xp_earned: 100 },
      ];

      // Mock for calendar data query
      const mockBuilder = createMockQueryBuilder(mockSessions);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCalendarData('user-123', 1, 2026);

      expect(mockSupabase.from).toHaveBeenCalledWith('training_sessions');
      expect(result.data?.month).toBe(1);
      expect(result.data?.year).toBe(2026);
      expect(result.data?.days).toBeDefined();
      expect(result.error).toBeNull();
    });
  });

  describe('getRecentAttempts', () => {
    it('should return recent attempts for opening', async () => {
      const mockData = [
        {
          id: '1',
          variation_id: 'italian::var1',
          created_at: '2026-01-01T10:00:00Z',
          xp_earned: 50,
          errors: 0,
          completion_time_seconds: 60,
        },
        {
          id: '2',
          variation_id: 'italian::var2',
          created_at: '2026-01-01T09:00:00Z',
          xp_earned: 30,
          errors: 2,
          completion_time_seconds: 90,
        },
      ];

      const mockBuilder = createMockQueryBuilder(mockData);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getRecentAttempts('user-123', 'italian', 10);

      expect(mockBuilder.like).toHaveBeenCalledWith('variation_id', 'italian%');
      expect(mockBuilder.limit).toHaveBeenCalledWith(10);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].perfect).toBe(true);
      expect(result.data?.[1].perfect).toBe(false);
    });
  });

  describe('getTrainingStatistics', () => {
    it('should return statistics for opening', async () => {
      const mockData = [
        { xp_earned: 100, errors: 0, completion_time_seconds: 60 },
        { xp_earned: 50, errors: 2, completion_time_seconds: 90 },
        { xp_earned: 80, errors: 1, completion_time_seconds: 75 },
      ];

      const mockBuilder = createMockQueryBuilder(mockData);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getTrainingStatistics('user-123', 'opening-id');

      expect(result.data?.total_attempts).toBe(3);
      expect(result.data?.perfect_completions).toBe(1);
      expect(result.data?.total_xp_earned).toBe(230);
      expect(result.error).toBeNull();
    });

    it('should return default stats when no attempts', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getTrainingStatistics('user-123', 'new-opening');

      expect(result.data?.total_attempts).toBe(0);
      expect(result.data?.perfect_completions).toBe(0);
      expect(result.data?.mastery_level).toBe('beginner');
    });
  });

  describe('startSession', () => {
    it('should create new training session', async () => {
      const mockBuilder = {
        ...createMockQueryBuilder({ id: 'session-123' }),
        single: jest.fn().mockResolvedValue({ data: { id: 'session-123' }, error: null }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await startSession('user-123', 'Italian Game', 'Giuoco Piano', 'e4');

      expect(mockBuilder.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        opening_name: 'Italian Game',
        variation_name: 'Giuoco Piano',
        category: 'e4',
      });
      expect(result.data).toBe('session-123');
      expect(result.error).toBeNull();
    });
  });

  describe('endSession', () => {
    it('should update session with completion data', async () => {
      const mockBuilder = createMockQueryBuilder(null);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await endSession('session-123', 10, 2, 75);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          moves_completed: 10,
          errors: 2,
          xp_earned: 75,
        })
      );
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'session-123');
      expect(result.error).toBeNull();
    });
  });
});
