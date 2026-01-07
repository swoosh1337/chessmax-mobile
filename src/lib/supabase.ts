import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';
import { createLogger } from '../utils/logger';
import { secureStorage, migrateAuthToSecureStorage } from './secureStorage';

const log = createLogger('Supabase');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  log.warn('Missing Supabase credentials. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
}

// Migrate existing auth data from AsyncStorage to SecureStore (one-time migration)
migrateAuthToSecureStorage();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Use implicit flow for React Native (PKCE has issues with WebCrypto API)
    flowType: 'implicit',
  },
  global: {
    headers: {
      'x-client-info': 'chessmax-mobile',
    },
  },
});

/**
 * Set up AppState-based token refresh
 * Official Supabase pattern: start/stop auto-refresh based on app state
 * This ensures tokens are refreshed when app is active and conserves resources when backgrounded
 */
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

/**
 * Global auth error handler
 * Catches auth errors before they become unhandled rejections
 */
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    log.warn('Token refresh failed, session cleared');
  }

  if (event === 'SIGNED_OUT') {
    log.info('User signed out');
  }
});
