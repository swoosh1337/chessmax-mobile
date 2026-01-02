/**
 * Tests for useUserProfile hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUserProfile } from '@/src/hooks/useUserProfile';

// Mock the userService
jest.mock('@/src/services/supabase/userService', () => ({
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  updateUsername: jest.fn(),
  getXPStats: jest.fn(),
  addXP: jest.fn(),
  ensureUserProfile: jest.fn(),
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

import {
  getUserProfile,
  updateUserProfile,
  updateUsername,
  getXPStats,
  addXP,
  ensureUserProfile,
} from '@/src/services/supabase/userService';

const mockGetUserProfile = getUserProfile as jest.Mock;
const mockUpdateUserProfile = updateUserProfile as jest.Mock;
const mockUpdateUsername = updateUsername as jest.Mock;
const mockGetXPStats = getXPStats as jest.Mock;
const mockAddXP = addXP as jest.Mock;
const mockEnsureUserProfile = ensureUserProfile as jest.Mock;

describe('useUserProfile', () => {
  const mockUserId = 'test-user-123';
  const mockProfile = {
    id: mockUserId,
    username: 'testuser',
    total_xp: 1500,
    weekly_xp: 200,
    level: 5,
    seen_onboarding: true,
    paywall_seen: true,
  };
  const mockXPStats = {
    total_xp: 1500,
    weekly_xp: 200,
    level: 5,
    level_progress: 0.5,
    xp_to_next_level: 250,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null profile when no userId provided', () => {
      mockGetUserProfile.mockResolvedValue({ data: null, error: null });
      mockGetXPStats.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useUserProfile(null));

      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should fetch profile when userId is provided', async () => {
      mockGetUserProfile.mockResolvedValue({ data: mockProfile, error: null });
      mockGetXPStats.mockResolvedValue({ data: mockXPStats, error: null });

      const { result } = renderHook(() => useUserProfile(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.xpStats).toEqual(mockXPStats);
      expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
    });

    it('should not auto-fetch when autoFetch is false', () => {
      const { result } = renderHook(() =>
        useUserProfile(mockUserId, { autoFetch: false })
      );

      expect(result.current.loading).toBe(false);
      expect(mockGetUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('createIfMissing option', () => {
    it('should use ensureUserProfile when createIfMissing is true', async () => {
      mockEnsureUserProfile.mockResolvedValue({ data: mockProfile, error: null });
      mockGetXPStats.mockResolvedValue({ data: mockXPStats, error: null });

      const { result } = renderHook(() =>
        useUserProfile(mockUserId, { createIfMissing: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockEnsureUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(mockGetUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockProfile, username: 'newname' };
      mockGetUserProfile.mockResolvedValue({ data: mockProfile, error: null });
      mockGetXPStats.mockResolvedValue({ data: mockXPStats, error: null });
      mockUpdateUserProfile.mockResolvedValue({ data: updatedProfile, error: null });

      const { result } = renderHook(() => useUserProfile(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.update({ username: 'newname' });
      });

      expect(success!).toBe(true);
      expect(result.current.profile?.username).toBe('newname');
    });

    it('should return false when update fails', async () => {
      mockGetUserProfile.mockResolvedValue({ data: mockProfile, error: null });
      mockGetXPStats.mockResolvedValue({ data: mockXPStats, error: null });
      mockUpdateUserProfile.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const { result } = renderHook(() => useUserProfile(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.update({ username: 'newname' });
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('setUsername', () => {
    it('should update username successfully', async () => {
      const updatedProfile = { ...mockProfile, username: 'newusername' };
      mockGetUserProfile.mockResolvedValue({ data: mockProfile, error: null });
      mockGetXPStats.mockResolvedValue({ data: mockXPStats, error: null });
      mockUpdateUsername.mockResolvedValue({ data: updatedProfile, error: null });

      const { result } = renderHook(() => useUserProfile(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.setUsername('newusername');
      });

      expect(updateResult!.success).toBe(true);
      expect(result.current.profile?.username).toBe('newusername');
    });

    it('should return error when username is taken', async () => {
      mockGetUserProfile.mockResolvedValue({ data: mockProfile, error: null });
      mockGetXPStats.mockResolvedValue({ data: mockXPStats, error: null });
      mockUpdateUsername.mockResolvedValue({
        data: null,
        error: new Error('Username is already taken'),
      });

      const { result } = renderHook(() => useUserProfile(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.setUsername('takenname');
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Username is already taken');
    });
  });

  describe('earnXP', () => {
    it('should add XP successfully', async () => {
      const updatedProfile = { ...mockProfile, total_xp: 1600 };
      const updatedXPStats = { ...mockXPStats, total_xp: 1600 };
      mockGetUserProfile.mockResolvedValue({ data: mockProfile, error: null });
      mockGetXPStats
        .mockResolvedValueOnce({ data: mockXPStats, error: null })
        .mockResolvedValueOnce({ data: updatedXPStats, error: null });
      mockAddXP.mockResolvedValue({ data: updatedProfile, error: null });

      const { result } = renderHook(() => useUserProfile(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.earnXP(100);
      });

      expect(success!).toBe(true);
      expect(mockAddXP).toHaveBeenCalledWith(mockUserId, 100);
    });
  });

  describe('refresh', () => {
    it('should refetch profile data', async () => {
      mockGetUserProfile.mockResolvedValue({ data: mockProfile, error: null });
      mockGetXPStats.mockResolvedValue({ data: mockXPStats, error: null });

      const { result } = renderHook(() => useUserProfile(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetUserProfile).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetUserProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should set error when fetch fails', async () => {
      const testError = new Error('Network error');
      mockGetUserProfile.mockResolvedValue({ data: null, error: testError });

      const { result } = renderHook(() => useUserProfile(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.profile).toBeNull();
    });
  });
});
