import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStreakData } from '@/src/hooks/useStreakData';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
const mockFetchStreak = jest.fn();

jest.mock('@/src/services/supabase/streakService', () => ({
  fetchStreak: (...args: any[]) => mockFetchStreak(...args),
}));

jest.mock('@/src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('useStreakData', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchStreak.mockResolvedValue({
      data: {
        currentStreak: 5,
        weeklyProgress: [true, true, false, true, true, false, false],
      },
      error: null,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useStreakData({ userId: mockUserId, enabled: true })
    );

    expect(result.current.currentStreak).toBe(0);
    expect(result.current.weeklyProgress).toEqual([]);
    expect(result.current.showStreakCelebration).toBe(false);
  });

  it('should fetch streak data when enabled', async () => {
    const { result } = renderHook(() =>
      useStreakData({ userId: mockUserId, enabled: true })
    );

    await waitFor(() => {
      expect(result.current.currentStreak).toBe(5);
    });

    expect(mockFetchStreak).toHaveBeenCalledWith(mockUserId);
    expect(result.current.weeklyProgress).toEqual([true, true, false, true, true, false, false]);
  });

  it('should not fetch when disabled', async () => {
    renderHook(() =>
      useStreakData({ userId: mockUserId, enabled: false })
    );

    // Wait a bit to ensure no fetch occurs
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetchStreak).not.toHaveBeenCalled();
  });

  it('should not fetch when userId is missing', async () => {
    renderHook(() =>
      useStreakData({ userId: undefined, enabled: true })
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetchStreak).not.toHaveBeenCalled();
  });

  it('should show streak celebration for new streak milestone', async () => {
    mockFetchStreak.mockResolvedValue({
      data: {
        currentStreak: 7,
        weeklyProgress: [true, true, true, true, true, true, true],
      },
      error: null,
    });

    // No previous celebration shown
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useStreakData({ userId: mockUserId, enabled: true })
    );

    await waitFor(() => {
      expect(result.current.currentStreak).toBe(7);
    });

    // Should show celebration for 7-day streak milestone
    expect(result.current.showStreakCelebration).toBe(true);
  });

  it('should not show celebration if already shown today', async () => {
    mockFetchStreak.mockResolvedValue({
      data: {
        currentStreak: 7,
        weeklyProgress: [true, true, true, true, true, true, true],
      },
      error: null,
    });

    // Already shown today
    const today = new Date().toISOString().split('T')[0];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(today);

    const { result } = renderHook(() =>
      useStreakData({ userId: mockUserId, enabled: true })
    );

    await waitFor(() => {
      expect(result.current.currentStreak).toBe(7);
    });

    expect(result.current.showStreakCelebration).toBe(false);
  });

  it('should allow setting showStreakCelebration manually', async () => {
    const { result } = renderHook(() =>
      useStreakData({ userId: mockUserId, enabled: true })
    );

    await waitFor(() => {
      expect(result.current.currentStreak).toBe(5);
    });

    act(() => {
      result.current.setShowStreakCelebration(true);
    });

    expect(result.current.showStreakCelebration).toBe(true);

    act(() => {
      result.current.setShowStreakCelebration(false);
    });

    expect(result.current.showStreakCelebration).toBe(false);
  });

  it('should mark streak as shown and persist to storage', async () => {
    const { result } = renderHook(() =>
      useStreakData({ userId: mockUserId, enabled: true })
    );

    await waitFor(() => {
      expect(result.current.currentStreak).toBe(5);
    });

    await act(async () => {
      await result.current.markStreakAsShown();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('streak_shown'),
      expect.any(String)
    );
    expect(result.current.showStreakCelebration).toBe(false);
  });

  it('should handle fetch error gracefully', async () => {
    mockFetchStreak.mockResolvedValue({
      data: null,
      error: new Error('Network error'),
    });

    const { result } = renderHook(() =>
      useStreakData({ userId: mockUserId, enabled: true })
    );

    await waitFor(() => {
      // Should keep default values on error
      expect(mockFetchStreak).toHaveBeenCalled();
    });

    expect(result.current.currentStreak).toBe(0);
    expect(result.current.weeklyProgress).toEqual([]);
  });

  it('should refetch when userId changes', async () => {
    const { result, rerender } = renderHook(
      ({ userId }) => useStreakData({ userId, enabled: true }),
      { initialProps: { userId: 'user-1' } }
    );

    await waitFor(() => {
      expect(mockFetchStreak).toHaveBeenCalledWith('user-1');
    });

    mockFetchStreak.mockClear();

    rerender({ userId: 'user-2' });

    await waitFor(() => {
      expect(mockFetchStreak).toHaveBeenCalledWith('user-2');
    });
  });
});
