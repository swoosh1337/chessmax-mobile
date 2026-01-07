/**
 * Tests for userService
 */

// Mock Supabase client before importing the service
jest.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
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

// Mock XP utils
jest.mock('@/src/utils/xp', () => ({
  calculateLevel: jest.fn((xp: number) => Math.floor(xp / 100) + 1),
  getLevelProgress: jest.fn((xp: number) => ({
    progress: (xp % 100) / 100,
    xpNeededForNextLevel: 100,
    xpInCurrentLevel: xp % 100,
  })),
}));

import { supabase } from '@/src/services/supabase/client';
import {
  getUserProfile,
  createUserProfile,
  ensureUserProfile,
  updateUserProfile,
  updateUsername,
  getXPStats,
  addXP,
  markOnboardingSeen,
  markPaywallSeen,
  deleteUserAccount,
} from '@/src/services/supabase/userService';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create mock query builder
  const createMockQueryBuilder = (data: any, error: any = null) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  });

  const mockUserId = 'user-123';
  const mockProfile = {
    id: mockUserId,
    username: 'testuser',
    total_xp: 500,
    weekly_xp: 100,
    level: 5,
    seen_onboarding: true,
    paywall_seen: false,
  };

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      const mockBuilder = createMockQueryBuilder(mockProfile);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getUserProfile(mockUserId);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', mockUserId);
      expect(result.data).toEqual(mockProfile);
      expect(result.error).toBeNull();
    });

    it('should return null when profile not found', async () => {
      const mockBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getUserProfile(mockUserId);

      expect(result.data).toBeNull();
      expect(result.error).toBeNull(); // PGRST116 is not treated as error
    });

    it('should return error for other database errors', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'DB connection failed' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getUserProfile(mockUserId);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('DB connection failed');
    });
  });

  describe('createUserProfile', () => {
    it('should create new profile with defaults', async () => {
      const newProfile = { ...mockProfile, total_xp: 0, weekly_xp: 0, level: 1 };
      const mockBuilder = createMockQueryBuilder(newProfile);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await createUserProfile(mockUserId);

      expect(mockBuilder.insert).toHaveBeenCalledWith({
        id: mockUserId,
        username: null,
        total_xp: 0,
        weekly_xp: 0,
        level: 1,
        seen_onboarding: false,
        paywall_seen: false,
      });
      expect(result.error).toBeNull();
    });

    it('should create profile with initial data', async () => {
      const mockBuilder = createMockQueryBuilder(mockProfile);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      await createUserProfile(mockUserId, { username: 'testuser', total_xp: 500 });

      expect(mockBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          total_xp: 500,
        })
      );
    });
  });

  describe('ensureUserProfile', () => {
    it('should return existing profile if found', async () => {
      const mockBuilder = createMockQueryBuilder(mockProfile);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await ensureUserProfile(mockUserId);

      expect(result.data).toEqual(mockProfile);
      expect(mockBuilder.insert).not.toHaveBeenCalled();
    });

    it('should create profile if not found', async () => {
      const newProfile = { ...mockProfile, total_xp: 0 };

      // First call returns not found, second call creates
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: null, error: null }) // getUserProfile returns null
          .mockResolvedValueOnce({ data: newProfile, error: null }), // createUserProfile succeeds
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await ensureUserProfile(mockUserId);

      expect(result.data).toEqual(newProfile);
    });
  });

  describe('updateUserProfile', () => {
    it('should update profile fields', async () => {
      const updatedProfile = { ...mockProfile, total_xp: 600 };
      const mockBuilder = createMockQueryBuilder(updatedProfile);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await updateUserProfile(mockUserId, { total_xp: 600 });

      expect(mockBuilder.update).toHaveBeenCalledWith({ total_xp: 600 });
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', mockUserId);
      expect(result.data?.total_xp).toBe(600);
    });
  });

  describe('updateUsername', () => {
    it('should update username successfully', async () => {
      const updatedProfile = { ...mockProfile, username: 'newname' };
      const mockBuilder = createMockQueryBuilder(updatedProfile);
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await updateUsername(mockUserId, 'newname');

      expect(mockBuilder.update).toHaveBeenCalledWith({ username: 'newname' });
      expect(result.data?.username).toBe('newname');
      expect(result.error).toBeNull();
    });

    it('should reject username that is too short', async () => {
      const result = await updateUsername(mockUserId, 'ab');

      expect(result.error?.message).toBe('Username must be between 3 and 20 characters');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should reject username that is too long', async () => {
      const result = await updateUsername(mockUserId, 'a'.repeat(21));

      expect(result.error?.message).toBe('Username must be between 3 and 20 characters');
    });

    it('should handle unique constraint violation', async () => {
      const mockBuilder = createMockQueryBuilder(null, { code: '23505' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await updateUsername(mockUserId, 'takenname');

      expect(result.error?.message).toBe('Username is already taken');
    });
  });

  describe('getXPStats', () => {
    it('should return XP stats with level progress', async () => {
      const mockBuilder = createMockQueryBuilder({
        total_xp: 500,
        weekly_xp: 100,
        level: 5,
      });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getXPStats(mockUserId);

      expect(result.data?.total_xp).toBe(500);
      expect(result.data?.weekly_xp).toBe(100);
      expect(result.data?.level).toBe(5);
      expect(result.data?.level_progress).toBeDefined();
    });

    it('should return default stats when profile not found', async () => {
      const mockBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await getXPStats(mockUserId);

      expect(result.data?.total_xp).toBe(0);
      expect(result.data?.level).toBe(1);
    });
  });

  describe('addXP', () => {
    it('should add XP to profile', async () => {
      // First call gets current XP, second updates
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: { total_xp: 500, weekly_xp: 100 }, error: null })
          .mockResolvedValueOnce({ data: { total_xp: 600, weekly_xp: 200, level: 6 }, error: null }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await addXP(mockUserId, 100);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          total_xp: 600,
          weekly_xp: 200,
        })
      );
      expect(result.data?.total_xp).toBe(600);
    });

    it('should handle fetch error', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'Fetch failed' });
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await addXP(mockUserId, 100);

      expect(result.error?.message).toBe('Fetch failed');
    });
  });

  describe('markOnboardingSeen', () => {
    it('should update seen_onboarding flag', async () => {
      const mockBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await markOnboardingSeen(mockUserId);

      expect(mockBuilder.update).toHaveBeenCalledWith({ seen_onboarding: true });
      expect(result.error).toBeNull();
    });
  });

  describe('markPaywallSeen', () => {
    it('should update paywall_seen flag', async () => {
      const mockBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(mockBuilder);

      const result = await markPaywallSeen(mockUserId);

      expect(mockBuilder.update).toHaveBeenCalledWith({ paywall_seen: true });
      expect(result.error).toBeNull();
    });
  });

  describe('deleteUserAccount', () => {
    it('should call delete_user_account RPC', async () => {
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      const result = await deleteUserAccount();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_user_account');
      expect(result.error).toBeNull();
    });

    it('should return error when RPC fails', async () => {
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await deleteUserAccount();

      expect(result.error?.message).toBe('RPC failed');
    });
  });
});
