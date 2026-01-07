import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/logger';

const log = createLogger('SecureStorage');

// Lazy-load SecureStore to handle Expo Go where native module isn't available
let SecureStore: typeof import('expo-secure-store') | null = null;
let secureStoreAvailable: boolean | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (secureStoreAvailable !== null) {
    return secureStoreAvailable;
  }

  if (Platform.OS === 'web') {
    secureStoreAvailable = false;
    return false;
  }

  try {
    SecureStore = require('expo-secure-store');
    // Test if the native module is actually available
    await SecureStore.getItemAsync('__test__');
    secureStoreAvailable = true;
    log.debug('SecureStore is available');
    return true;
  } catch (error) {
    secureStoreAvailable = false;
    log.warn('SecureStore not available, using AsyncStorage fallback', error);
    return false;
  }
}

/**
 * Secure storage adapter for Supabase auth.
 *
 * Uses expo-secure-store on native platforms (iOS/Android) for encrypted storage.
 * Falls back to AsyncStorage on web or when SecureStore is not available (e.g., Expo Go).
 *
 * SecureStore encrypts data using:
 * - iOS: Keychain Services
 * - Android: Android Keystore system
 */
export const secureStorage = {
  /**
   * Retrieve an item from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (await isSecureStoreAvailable()) {
        return await SecureStore!.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      log.error('Failed to get item from secure storage', error, { key });
      // Fall back to AsyncStorage if SecureStore fails
      try {
        return await AsyncStorage.getItem(key);
      } catch {
        return null;
      }
    }
  },

  /**
   * Store an item in secure storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (await isSecureStoreAvailable()) {
        await SecureStore!.setItemAsync(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      log.error('Failed to set item in secure storage', error, { key });
      // Fall back to AsyncStorage if SecureStore fails (e.g., value too large)
      // SecureStore has a ~2KB limit on some platforms
      try {
        await AsyncStorage.setItem(key, value);
        log.warn('Fell back to AsyncStorage for large value', { key, size: value.length });
      } catch (fallbackError) {
        log.error('AsyncStorage fallback also failed', fallbackError, { key });
        throw fallbackError;
      }
    }
  },

  /**
   * Remove an item from secure storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (await isSecureStoreAvailable()) {
        await SecureStore!.deleteItemAsync(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      log.error('Failed to remove item from secure storage', error, { key });
      // Also try to remove from AsyncStorage in case it was stored there
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // Ignore fallback errors
      }
    }
  },
};

/**
 * Migrate existing auth data from AsyncStorage to SecureStore.
 * Call this once on app startup to migrate existing users.
 */
export async function migrateAuthToSecureStorage(): Promise<void> {
  if (!(await isSecureStoreAvailable())) {
    return; // No migration needed if SecureStore is not available
  }

  const AUTH_KEY = 'supabase.auth.token';

  try {
    // Check if data exists in AsyncStorage
    const existingData = await AsyncStorage.getItem(AUTH_KEY);

    if (existingData) {
      // Check if already migrated to SecureStore
      const secureData = await SecureStore!.getItemAsync(AUTH_KEY);

      if (!secureData) {
        // Migrate to SecureStore
        await SecureStore!.setItemAsync(AUTH_KEY, existingData);
        log.info('Migrated auth data to SecureStore');
      }

      // Remove from AsyncStorage after successful migration
      await AsyncStorage.removeItem(AUTH_KEY);
      log.info('Removed auth data from AsyncStorage after migration');
    }
  } catch (error) {
    log.warn('Auth migration failed, will use new storage on next login', error);
    // Don't throw - migration failure shouldn't break the app
  }
}
