/**
 * Tests for leaderboardService
 */

// Mock Supabase client before importing the service
jest.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
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
  getWeeklyLeaderboard,
  getAllTimeLeaderboard,
  getSpeedrunLeaderboard,
  getUserRank,
  getCurrentUserData,
  getLeaderboardData,
  subscribeToLeaderboard,
} from '@/src/services/supabase/leaderboardService';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('leaderboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create a thenable mock query builder
  const createMockQueryBuilder = (data: any, error: any = null, count: number | null = null) => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data, error }),
      // Make the builder thenable for await support
      then: jest.fn((resolve) => Promise.resolve(resolve({ data, error, count }))),
    };
    return builder;
  };

  const mockLeaderboardEntries = [
    { id: 'user-1', username: 'player1', total_xp: 1000, weekly_xp: 200, level: 10 },
    { id: 'user-2', username: 'player2', total_xp: 800, weekly_xp: 150, level: 8 },
    { id: 'user-3', username: 'player3', total_xp: 600, weekly_xp: 100, level: 6 },
  ];

  describe('getWeeklyLeaderboard', () => {
    it('should return weekly leaderboard with ranks', async () => {
      const mockBuilder = createMockQueryBuilder(mockLeaderboardEntries);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getWeeklyLeaderboard();

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockBuilder.gt).toHaveBeenCalledWith('weekly_xp', 0);
      expect(mockBuilder.order).toHaveBeenCalledWith('weekly_xp', { ascending: false });
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].rank).toBe(1);
      expect(result.data?.[1].rank).toBe(2);
      expect(result.data?.[2].rank).toBe(3);
      expect(result.error).toBeNull();
    });

    it('should respect limit parameter', async () => {
      const mockBuilder = createMockQueryBuilder([mockLeaderboardEntries[0]]);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      await getWeeklyLeaderboard(1);

      expect(mockBuilder.limit).toHaveBeenCalledWith(1);
    });

    it('should return error when query fails', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'DB error' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getWeeklyLeaderboard();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('DB error');
    });

    it('should return empty array when no entries', async () => {
      const mockBuilder = createMockQueryBuilder([]);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getWeeklyLeaderboard();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getAllTimeLeaderboard', () => {
    it('should return all-time leaderboard with ranks', async () => {
      const mockBuilder = createMockQueryBuilder(mockLeaderboardEntries);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getAllTimeLeaderboard();

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockBuilder.gt).toHaveBeenCalledWith('total_xp', 0);
      expect(mockBuilder.order).toHaveBeenCalledWith('total_xp', { ascending: false });
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].rank).toBe(1);
      expect(result.error).toBeNull();
    });

    it('should return error when query fails', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'Connection error' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getAllTimeLeaderboard();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Connection error');
    });
  });

  describe('getSpeedrunLeaderboard', () => {
    it('should return speedrun leaderboard from RPC', async () => {
      const mockSpeedrunData = [
        { user_id: 'user-1', username: 'speedy', avg_time_seconds: 30, perfect_completions: 10, rank: 1 },
        { user_id: 'user-2', username: 'quick', avg_time_seconds: 45, perfect_completions: 8, rank: 2 },
      ];

      (mockSupabase.rpc as jest.Mock).mockResolvedValue({ data: mockSpeedrunData, error: null });

      const result = await getSpeedrunLeaderboard();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_speedrun_leaderboard', { limit_count: 20 });
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].avg_time_seconds).toBe(30);
      expect(result.error).toBeNull();
    });

    it('should return error for RPC errors', async () => {
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database unavailable' }
      });

      const result = await getSpeedrunLeaderboard();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Database unavailable');
    });

    it('should return empty array when RPC returns null data', async () => {
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      const result = await getSpeedrunLeaderboard();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getUserRank', () => {
    it('should return null when user not found', async () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getUserRank('nonexistent', 'weekly');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should return null when user has zero XP', async () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { weekly_xp: 0 }, error: null }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getUserRank('user-123', 'weekly');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should return error on database failure', async () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getUserRank('user-123', 'weekly');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('DB error');
    });
  });

  describe('getCurrentUserData', () => {
    const mockUserProfile = {
      id: 'user-123',
      username: 'testuser',
      total_xp: 1500,
      weekly_xp: 300,
      level: 15,
      seen_onboarding: true,
      paywall_seen: true,
    };

    it('should return current user profile', async () => {
      const mockBuilder = createMockQueryBuilder(mockUserProfile);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCurrentUserData('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(result.data).toEqual(mockUserProfile);
      expect(result.error).toBeNull();
    });

    it('should return null when user not found', async () => {
      const mockBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCurrentUserData('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should return error for other database errors', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'Permission denied' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getCurrentUserData('user-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Permission denied');
    });
  });

  describe('getLeaderboardData', () => {
    it('should fetch all leaderboard data in parallel', async () => {
      const mockBuilder = createMockQueryBuilder(mockLeaderboardEntries);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

      const result = await getLeaderboardData();

      expect(result.data).toBeDefined();
      expect(result.data?.allTime).toBeDefined();
      expect(result.data?.weekly).toBeDefined();
      expect(result.data?.speedrun).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should return empty arrays when queries fail gracefully', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'Query failed' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      const result = await getLeaderboardData();

      expect(result.data?.allTime).toEqual([]);
      expect(result.data?.weekly).toEqual([]);
      expect(result.data?.speedrun).toEqual([]);
    });
  });

  describe('subscribeToLeaderboard', () => {
    it('should create realtime subscription', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      };
      (mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = subscribeToLeaderboard(callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('leaderboard-changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should remove channel when unsubscribe called', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      };
      (mockSupabase.channel as jest.Mock).mockReturnValue(mockChannel);

      const unsubscribe = subscribeToLeaderboard(jest.fn());
      unsubscribe();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});
