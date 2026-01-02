/**
 * Tests for useCalendar hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCalendar } from '@/src/hooks/useCalendar';

// Mock trainingService
jest.mock('@/src/services/supabase/trainingService', () => ({
  getCalendarData: jest.fn(),
  getStreakData: jest.fn(),
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
  getCalendarData,
  getStreakData,
} from '@/src/services/supabase/trainingService';

const mockGetCalendarData = getCalendarData as jest.Mock;
const mockGetStreakData = getStreakData as jest.Mock;

describe('useCalendar', () => {
  const mockUserId = 'test-user-123';
  const mockStreak = {
    currentStreak: 5,
    longestStreak: 12,
    lastTrainingDate: '2024-01-15',
  };
  const mockCalendarData = {
    month: 1,
    year: 2024,
    days: [
      { date: '2024-01-10', trained: true, completions: 3, xp_earned: 150 },
      { date: '2024-01-11', trained: true, completions: 2, xp_earned: 100 },
      { date: '2024-01-15', trained: true, completions: 5, xp_earned: 250 },
    ],
    streak: mockStreak,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null data when no userId provided', () => {
      const { result } = renderHook(() => useCalendar({ userId: null }));

      expect(result.current.calendarData).toBeNull();
      expect(result.current.streak).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should fetch calendar data when userId is provided', async () => {
      mockGetCalendarData.mockResolvedValue({ data: mockCalendarData, error: null });

      const { result } = renderHook(() => useCalendar({ userId: mockUserId }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.calendarData).toEqual(mockCalendarData);
      expect(result.current.streak).toEqual(mockStreak);
      expect(result.current.trainingDays).toHaveLength(3);
    });

    it('should use initial month and year when provided', async () => {
      mockGetCalendarData.mockResolvedValue({ data: mockCalendarData, error: null });

      const { result } = renderHook(() =>
        useCalendar({
          userId: mockUserId,
          initialMonth: 6,
          initialYear: 2023,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentMonth).toBe(6);
      expect(result.current.currentYear).toBe(2023);
      expect(mockGetCalendarData).toHaveBeenCalledWith(mockUserId, 6, 2023);
    });

    it('should not auto-fetch when autoFetch is false', () => {
      const { result } = renderHook(() =>
        useCalendar({ userId: mockUserId, autoFetch: false })
      );

      expect(result.current.loading).toBe(false);
      expect(mockGetCalendarData).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      mockGetCalendarData.mockResolvedValue({ data: mockCalendarData, error: null });
    });

    it('should navigate to previous month', async () => {
      const { result } = renderHook(() =>
        useCalendar({ userId: mockUserId, initialMonth: 3, initialYear: 2024 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.previousMonth();
      });

      expect(result.current.currentMonth).toBe(2);
      expect(result.current.currentYear).toBe(2024);
    });

    it('should navigate to previous year when going before January', async () => {
      const { result } = renderHook(() =>
        useCalendar({ userId: mockUserId, initialMonth: 1, initialYear: 2024 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.previousMonth();
      });

      expect(result.current.currentMonth).toBe(12);
      expect(result.current.currentYear).toBe(2023);
    });

    it('should navigate to next month', async () => {
      const { result } = renderHook(() =>
        useCalendar({ userId: mockUserId, initialMonth: 3, initialYear: 2024 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.nextMonth();
      });

      expect(result.current.currentMonth).toBe(4);
      expect(result.current.currentYear).toBe(2024);
    });

    it('should navigate to next year when going past December', async () => {
      const { result } = renderHook(() =>
        useCalendar({ userId: mockUserId, initialMonth: 12, initialYear: 2024 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.nextMonth();
      });

      expect(result.current.currentMonth).toBe(1);
      expect(result.current.currentYear).toBe(2025);
    });

    it('should go to specific month', async () => {
      const { result } = renderHook(() =>
        useCalendar({ userId: mockUserId, initialMonth: 1, initialYear: 2024 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.goToMonth(8, 2023);
      });

      expect(result.current.currentMonth).toBe(8);
      expect(result.current.currentYear).toBe(2023);
    });

    it('should go to today', async () => {
      const { result } = renderHook(() =>
        useCalendar({ userId: mockUserId, initialMonth: 1, initialYear: 2020 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const now = new Date();
      act(() => {
        result.current.goToToday();
      });

      expect(result.current.currentMonth).toBe(now.getMonth() + 1);
      expect(result.current.currentYear).toBe(now.getFullYear());
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      mockGetCalendarData.mockResolvedValue({ data: mockCalendarData, error: null });
    });

    it('should check if a date was trained', async () => {
      const { result } = renderHook(() => useCalendar({ userId: mockUserId }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.wasTrainedOn('2024-01-10')).toBe(true);
      expect(result.current.wasTrainedOn('2024-01-12')).toBe(false);
    });

    it('should get XP for a specific date', async () => {
      const { result } = renderHook(() => useCalendar({ userId: mockUserId }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getXPForDate('2024-01-15')).toBe(250);
      expect(result.current.getXPForDate('2024-01-12')).toBe(0);
    });

    it('should calculate monthly XP total', async () => {
      const { result } = renderHook(() => useCalendar({ userId: mockUserId }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 150 + 100 + 250 = 500
      expect(result.current.monthlyXP).toBe(500);
    });

    it('should calculate monthly training days', async () => {
      const { result } = renderHook(() => useCalendar({ userId: mockUserId }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.monthlyTrainingDays).toBe(3);
    });
  });

  describe('refresh', () => {
    it('should refetch calendar data', async () => {
      mockGetCalendarData.mockResolvedValue({ data: mockCalendarData, error: null });

      const { result } = renderHook(() => useCalendar({ userId: mockUserId }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetCalendarData).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetCalendarData).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should set error when fetch fails', async () => {
      const testError = new Error('Network error');
      mockGetCalendarData.mockResolvedValue({ data: null, error: testError });

      const { result } = renderHook(() => useCalendar({ userId: mockUserId }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.calendarData).toBeNull();
    });
  });
});
