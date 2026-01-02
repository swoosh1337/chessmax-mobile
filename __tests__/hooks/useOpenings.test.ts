/**
 * Tests for useOpenings hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOpenings } from '@/src/hooks/useOpenings';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock chessApi
jest.mock('@/src/api/chessApi', () => ({
  chessApi: {
    getOpenings: jest.fn(),
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { chessApi } from '@/src/api/chessApi';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockGetOpenings = chessApi.getOpenings as jest.Mock;

describe('useOpenings', () => {
  const mockOpenings = [
    {
      id: 'italian-game',
      name: 'Italian Game',
      eco: 'C50',
      category: 'Open Games',
      difficulty: 'beginner' as const,
      popularity: 95,
      variations: [],
    },
    {
      id: 'sicilian-defense',
      name: 'Sicilian Defense',
      eco: 'B20',
      category: 'Semi-Open Games',
      difficulty: 'intermediate' as const,
      popularity: 100,
      variations: [],
    },
    {
      id: 'queens-gambit',
      name: "Queen's Gambit",
      eco: 'D00',
      category: 'Closed Games',
      difficulty: 'advanced' as const,
      popularity: 90,
      variations: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null); // No cache by default
  });

  describe('initialization', () => {
    it('should fetch openings on mount when autoFetch is true', async () => {
      mockGetOpenings.mockResolvedValue(mockOpenings);

      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.openings).toEqual(mockOpenings);
      expect(mockGetOpenings).toHaveBeenCalled();
    });

    it('should not fetch when autoFetch is false', () => {
      const { result } = renderHook(() => useOpenings({ autoFetch: false }));

      expect(result.current.loading).toBe(false);
      expect(result.current.openings).toEqual([]);
      expect(mockGetOpenings).not.toHaveBeenCalled();
    });

    it('should use cached data when available', async () => {
      const cachedData = {
        openings: mockOpenings,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
      };
      mockGetItem.mockResolvedValue(JSON.stringify(cachedData));

      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.openings).toEqual(mockOpenings);
      expect(mockGetOpenings).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache is expired', async () => {
      const expiredCache = {
        openings: mockOpenings,
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        expiresAt: Date.now() - 60 * 60 * 1000, // 1 hour ago (expired)
      };
      mockGetItem.mockResolvedValue(JSON.stringify(expiredCache));
      mockGetOpenings.mockResolvedValue(mockOpenings);

      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOpenings).toHaveBeenCalled();
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      mockGetOpenings.mockResolvedValue(mockOpenings);
    });

    it('should filter by category', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilters({ category: 'Open Games' });
      });

      expect(result.current.filteredOpenings).toHaveLength(1);
      expect(result.current.filteredOpenings[0].name).toBe('Italian Game');
    });

    it('should filter by difficulty', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilters({ difficulty: 'beginner' });
      });

      expect(result.current.filteredOpenings).toHaveLength(1);
      expect(result.current.filteredOpenings[0].difficulty).toBe('beginner');
    });

    it('should filter by search query', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilters({ searchQuery: 'sicilian' });
      });

      expect(result.current.filteredOpenings).toHaveLength(1);
      expect(result.current.filteredOpenings[0].name).toBe('Sicilian Defense');
    });

    it('should search by ECO code', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilters({ searchQuery: 'B20' });
      });

      expect(result.current.filteredOpenings).toHaveLength(1);
      expect(result.current.filteredOpenings[0].eco).toBe('B20');
    });

    it('should sort by name', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilters({ sortBy: 'name', sortOrder: 'asc' });
      });

      expect(result.current.filteredOpenings[0].name).toBe('Italian Game');
      expect(result.current.filteredOpenings[2].name).toBe('Sicilian Defense');
    });

    it('should sort by popularity descending', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilters({ sortBy: 'popularity' });
      });

      // Default popularity sort is already descending (highest first)
      expect(result.current.filteredOpenings[0].popularity).toBe(100);
      expect(result.current.filteredOpenings[0].name).toBe('Sicilian Defense');
    });

    it('should combine multiple filters', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilters({
          difficulty: 'beginner',
          sortBy: 'name',
        });
      });

      // Only Italian Game is beginner difficulty
      expect(result.current.filteredOpenings).toHaveLength(1);
      expect(result.current.filteredOpenings[0].difficulty).toBe('beginner');
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      mockGetOpenings.mockResolvedValue(mockOpenings);
    });

    it('should get opening by ID', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const opening = result.current.getOpening('italian-game');
      expect(opening?.name).toBe('Italian Game');
    });

    it('should return undefined for non-existent opening', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const opening = result.current.getOpening('non-existent');
      expect(opening).toBeUndefined();
    });

    it('should get openings by category', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const openGames = result.current.getByCategory('Open Games');
      expect(openGames).toHaveLength(1);
      expect(openGames[0].name).toBe('Italian Game');
    });

    it('should search openings by name', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results = result.current.search('queen');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Queen's Gambit");
    });

    it('should return all openings when search query is empty', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results = result.current.search('');
      expect(results).toHaveLength(3);
    });

    it('should return list of categories', async () => {
      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toEqual([
        'Closed Games',
        'Open Games',
        'Semi-Open Games',
      ]);
    });
  });

  describe('refresh', () => {
    it('should force refresh from API', async () => {
      mockGetOpenings.mockResolvedValue(mockOpenings);

      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOpenings).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh(true);
      });

      expect(mockGetOpenings).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should set error when API fails', async () => {
      const testError = new Error('Network error');
      mockGetOpenings.mockRejectedValue(testError);

      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle API errors gracefully', async () => {
      mockGetOpenings.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOpenings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have an error set
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Network error');
    });
  });
});
