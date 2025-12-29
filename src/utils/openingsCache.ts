/**
 * Cache utility for opening explanations
 * Uses AsyncStorage for persistent caching with TTL
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from './logger';

const log = createLogger('OpeningsCache');

const CACHE_PREFIX = '@openings_cache:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ALL_OPENINGS_KEY = '@openings_all_cache';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Cache a single opening's data
 */
export async function cacheOpening(openingId: string, data: any): Promise<void> {
    try {
        const entry: CacheEntry<any> = {
            data,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(`${CACHE_PREFIX}${openingId}`, JSON.stringify(entry));
        log.debug('Cached opening', { openingId });
    } catch (error) {
        log.warn('Failed to cache opening', { openingId, error });
    }
}

/**
 * Get a cached opening if it exists and is not expired
 */
export async function getCachedOpening(openingId: string): Promise<any | null> {
    try {
        const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${openingId}`);
        if (!cached) return null;

        const entry: CacheEntry<any> = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;

        if (age > CACHE_TTL_MS) {
            log.debug('Cache expired', { openingId });
            await AsyncStorage.removeItem(`${CACHE_PREFIX}${openingId}`);
            return null;
        }

        log.debug('Cache hit', { openingId, ageMinutes: Math.round(age / 1000 / 60) });
        return entry.data;
    } catch (error) {
        log.warn('Failed to get cached opening', { openingId, error });
        return null;
    }
}

/**
 * Cache all openings data (from /Openings endpoint)
 */
export async function cacheAllOpenings(openings: any[]): Promise<void> {
    try {
        const entry: CacheEntry<any[]> = {
            data: openings,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(ALL_OPENINGS_KEY, JSON.stringify(entry));
        log.debug('Cached all openings', { count: openings.length });
    } catch (error) {
        log.warn('Failed to cache all openings', { error });
    }
}

/**
 * Get cached openings list
 */
export async function getCachedAllOpenings(): Promise<any[] | null> {
    try {
        const cached = await AsyncStorage.getItem(ALL_OPENINGS_KEY);
        if (!cached) return null;

        const entry: CacheEntry<any[]> = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;

        if (age > CACHE_TTL_MS) {
            log.debug('All openings cache expired');
            await AsyncStorage.removeItem(ALL_OPENINGS_KEY);
            return null;
        }

        log.debug('All openings cache hit', { ageMinutes: Math.round(age / 1000 / 60), count: entry.data.length });
        return entry.data;
    } catch (error) {
        log.warn('Failed to get cached openings', { error });
        return null;
    }
}

/**
 * Clear all cached openings (useful for debugging or force refresh)
 */
export async function clearOpeningsCache(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX) || key === ALL_OPENINGS_KEY);
        await AsyncStorage.multiRemove(cacheKeys);
        log.info('Cleared cache', { count: cacheKeys.length });
    } catch (error) {
        log.warn('Failed to clear cache', { error });
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ count: number; totalSizeKB: number }> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX) || key === ALL_OPENINGS_KEY);

        let totalSize = 0;
        for (const key of cacheKeys) {
            const value = await AsyncStorage.getItem(key);
            if (value) totalSize += value.length;
        }

        return {
            count: cacheKeys.length,
            totalSizeKB: Math.round(totalSize / 1024),
        };
    } catch (error) {
        return { count: 0, totalSizeKB: 0 };
    }
}
