/**
 * Cache utility for opening explanations
 * Uses AsyncStorage for persistent caching with TTL
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        console.log(`💾 Cached opening: ${openingId}`);
    } catch (error) {
        console.warn('[OpeningsCache] Failed to cache opening:', error);
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
            console.log(`⏰ Cache expired for: ${openingId}`);
            await AsyncStorage.removeItem(`${CACHE_PREFIX}${openingId}`);
            return null;
        }

        console.log(`✅ Cache hit for: ${openingId} (age: ${Math.round(age / 1000 / 60)}min)`);
        return entry.data;
    } catch (error) {
        console.warn('[OpeningsCache] Failed to get cached opening:', error);
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
        console.log(`💾 Cached all ${openings.length} openings`);
    } catch (error) {
        console.warn('[OpeningsCache] Failed to cache all openings:', error);
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
            console.log('⏰ All openings cache expired');
            await AsyncStorage.removeItem(ALL_OPENINGS_KEY);
            return null;
        }

        console.log(`✅ All openings cache hit (age: ${Math.round(age / 1000 / 60)}min, ${entry.data.length} openings)`);
        return entry.data;
    } catch (error) {
        console.warn('[OpeningsCache] Failed to get cached openings:', error);
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
        console.log(`🗑️ Cleared ${cacheKeys.length} cached openings`);
    } catch (error) {
        console.warn('[OpeningsCache] Failed to clear cache:', error);
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
