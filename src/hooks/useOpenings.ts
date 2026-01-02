/**
 * useOpenings Hook
 *
 * Provides chess openings data with caching, filtering, and search functionality.
 * Uses the chessApi for data fetching and local storage for caching.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chessApi } from '@/src/api/chessApi';
import { createLogger } from '@/src/utils/logger';
import type {
  Opening,
  OpeningFilters,
  OpeningCacheEntry,
} from '@/src/types/opening';

const log = createLogger('useOpenings');

/** Cache key for openings */
const CACHE_KEY = 'chessmaxx_openings_cache';

/** Cache duration in milliseconds (1 hour) */
const CACHE_DURATION = 60 * 60 * 1000;

interface UseOpeningsOptions {
  /** Auto-fetch openings on mount */
  autoFetch?: boolean;
  /** Use cached data if available */
  useCache?: boolean;
  /** Initial filters */
  initialFilters?: OpeningFilters;
}

interface UseOpeningsReturn {
  /** All openings data */
  openings: Opening[];
  /** Filtered openings based on current filters */
  filteredOpenings: Opening[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Current filters */
  filters: OpeningFilters;
  /** Update filters */
  setFilters: (filters: OpeningFilters) => void;
  /** Refresh openings data */
  refresh: (force?: boolean) => Promise<void>;
  /** Get a specific opening by ID */
  getOpening: (id: string) => Opening | undefined;
  /** Get openings by category */
  getByCategory: (category: string) => Opening[];
  /** Search openings by name */
  search: (query: string) => Opening[];
  /** Categories list */
  categories: string[];
}

/**
 * Hook for fetching and managing chess openings data
 *
 * @param options - Configuration options
 * @returns Openings data and operations
 *
 * @example
 * ```tsx
 * const { openings, loading, filteredOpenings, setFilters } = useOpenings();
 *
 * // Filter by category
 * setFilters({ category: 'Italian Game' });
 *
 * // Search
 * const results = search('sicilian');
 * ```
 */
export function useOpenings(
  options: UseOpeningsOptions = {}
): UseOpeningsReturn {
  const { autoFetch = true, useCache = true, initialFilters = {} } = options;

  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<OpeningFilters>(initialFilters);

  /**
   * Load cached openings from AsyncStorage
   */
  const loadFromCache = useCallback(async (): Promise<Opening[] | null> => {
    if (!useCache) return null;

    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const entry: OpeningCacheEntry = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() < entry.expiresAt) {
        log.debug('Using cached openings', { count: entry.openings.length });
        return entry.openings;
      }

      log.debug('Cache expired');
      return null;
    } catch (err) {
      log.warn('Failed to load cache', { error: err });
      return null;
    }
  }, [useCache]);

  /**
   * Save openings to cache
   */
  const saveToCache = useCallback(
    async (data: Opening[]) => {
      if (!useCache) return;

      try {
        const entry: OpeningCacheEntry = {
          openings: data,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_DURATION,
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
        log.debug('Openings cached', { count: data.length });
      } catch (err) {
        log.warn('Failed to cache openings', { error: err });
      }
    },
    [useCache]
  );

  /**
   * Fetch openings from API
   */
  const fetchOpenings = useCallback(
    async (force: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        // Try cache first (unless forced refresh)
        if (!force) {
          const cached = await loadFromCache();
          if (cached) {
            setOpenings(cached);
            setLoading(false);
            return;
          }
        }

        // Fetch from API
        log.debug('Fetching openings from API');
        const data = await chessApi.getOpenings();

        if (!data || !Array.isArray(data)) {
          throw new Error('Invalid openings data received');
        }

        setOpenings(data);
        await saveToCache(data);
        log.info('Openings loaded', { count: data.length });
      } catch (err) {
        log.error('Failed to fetch openings', err);
        setError(err as Error);

        // Try to use stale cache on error
        const cached = await loadFromCache();
        if (cached) {
          setOpenings(cached);
          log.info('Using stale cache due to API error');
        }
      } finally {
        setLoading(false);
      }
    },
    [loadFromCache, saveToCache]
  );

  /**
   * Auto-fetch on mount
   */
  useEffect(() => {
    if (autoFetch) {
      fetchOpenings();
    }
  }, [autoFetch, fetchOpenings]);

  /**
   * Filter openings based on current filters
   */
  const filteredOpenings = useMemo(() => {
    let result = [...openings];

    // Filter by category
    if (filters.category) {
      result = result.filter(
        (o) => o.category.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    // Filter by difficulty
    if (filters.difficulty) {
      result = result.filter((o) => o.difficulty === filters.difficulty);
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(query) ||
          o.eco?.toLowerCase().includes(query) ||
          o.description?.toLowerCase().includes(query)
      );
    }

    // Sort results
    if (filters.sortBy) {
      result.sort((a, b) => {
        let comparison = 0;

        switch (filters.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'popularity':
            comparison = (b.popularity || 0) - (a.popularity || 0);
            break;
          case 'difficulty':
            const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
            comparison =
              difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
            break;
          default:
            break;
        }

        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [openings, filters]);

  /**
   * Get unique categories
   */
  const categories = useMemo(() => {
    const categorySet = new Set(openings.map((o) => o.category));
    return Array.from(categorySet).sort();
  }, [openings]);

  /**
   * Get a specific opening by ID
   */
  const getOpening = useCallback(
    (id: string): Opening | undefined => {
      return openings.find((o) => o.id === id);
    },
    [openings]
  );

  /**
   * Get openings by category
   */
  const getByCategory = useCallback(
    (category: string): Opening[] => {
      return openings.filter(
        (o) => o.category.toLowerCase() === category.toLowerCase()
      );
    },
    [openings]
  );

  /**
   * Search openings by name
   */
  const search = useCallback(
    (query: string): Opening[] => {
      if (!query) return openings;

      const lowerQuery = query.toLowerCase();
      return openings.filter(
        (o) =>
          o.name.toLowerCase().includes(lowerQuery) ||
          o.eco?.toLowerCase().includes(lowerQuery)
      );
    },
    [openings]
  );

  /**
   * Refresh openings data
   */
  const refresh = useCallback(
    async (force: boolean = true) => {
      await fetchOpenings(force);
    },
    [fetchOpenings]
  );

  return {
    openings,
    filteredOpenings,
    loading,
    error,
    filters,
    setFilters,
    refresh,
    getOpening,
    getByCategory,
    search,
    categories,
  };
}

export default useOpenings;
