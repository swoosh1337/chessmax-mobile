import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { createLogger } from './logger';

const log = createLogger('Auth');

// Complete the WebBrowser session
WebBrowser.maybeCompleteAuthSession();

function mapAuthError(errorMessage?: string) {
  if (!errorMessage) {
    return 'Sign-in failed. Please try again.';
  }

  const normalized = errorMessage.toLowerCase();

  if (normalized.includes('invalid flow state') || normalized.includes('no valid flow state')) {
    return 'The sign-in session expired. Please try again.';
  }

  if (normalized.includes('pkce')) {
    return 'We could not verify the sign-in session. Please try again.';
  }

  if (normalized.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  return errorMessage;
}

async function resetLocalAuthState() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    log.warn('Failed to clear local auth state', { error: err });
  }
}

/**
 * Google Sign-In using Supabase OAuth
 * Opens Safari View Controller (in-app browser) - Apple approved
 */
export async function signInWithGoogle() {
  try {
    log.debug('Starting Google Sign-In...');

    const redirectUrl = 'chessmaxmobile://';
    log.debug('Redirect URL', { redirectUrl });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      log.error('Google OAuth error', error, { details: error });
      await resetLocalAuthState();
      return { ok: false, error: mapAuthError(error.message) };
    }

    // Open OAuth URL in Safari View Controller (in-app browser)
    if (data?.url) {
      log.debug('OAuth URL received from Supabase');
      log.debug('Opening in Safari View Controller...');

      // The prompt=select_account should now be in the URL from queryParams above
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      log.debug('WebBrowser result', { type: result.type });

      if (result.type === 'success' && result.url) {
        log.debug('Auth successful, processing callback...');

        // Parse the callback URL
        const url = new URL(result.url);

        // Check for PKCE authorization code (in query string)
        const code = url.searchParams.get('code');
        log.debug('Authorization code present', { hasCode: !!code });

        if (code) {
          // PKCE flow: Exchange code for session
          log.debug('Exchanging authorization code for session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            log.error('Google code exchange error', sessionError);
            await resetLocalAuthState();
            return { ok: false, error: mapAuthError(sessionError.message) };
          }

          log.info('Google Sign-in successful (PKCE)');
          return {
            ok: true,
            provider: 'google',
            session: sessionData.session,
            user: sessionData.user,
          };
        }

        // Fallback: Check for tokens in hash fragment (implicit flow)
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        log.debug('Token presence', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            log.error('Google session error', sessionError);
            await resetLocalAuthState();
            return { ok: false, error: mapAuthError(sessionError.message) };
          }

          log.info('Google Sign-in successful (implicit)');
          return {
            ok: true,
            provider: 'google',
            session: sessionData.session,
            user: sessionData.user,
          };
        }

        log.error('No code or tokens found in callback URL');
        return { ok: false, error: 'Missing authentication data' };
      } else if (result.type === 'cancel') {
        log.debug('User cancelled sign-in');
        return { ok: false, error: 'User cancelled sign-in' };
      } else {
        log.error('Unexpected result type', undefined, { type: result.type });
        await resetLocalAuthState();
        return { ok: false, error: `Unexpected result: ${result.type}` };
      }
    } else {
      log.error('No OAuth URL received from Supabase');
      await resetLocalAuthState();
      return { ok: false, error: 'Failed to get OAuth URL from Supabase' };
    }
  } catch (error: any) {
    log.error('Google Auth unexpected error', error);
    await resetLocalAuthState();
    return { ok: false, error: mapAuthError(error.message) };
  }
}

/**
 * Apple Sign-In using Supabase OAuth
 * Opens Safari View Controller (in-app browser) - Apple approved
 */
export async function signInWithApple() {
  try {
    log.debug('Starting Apple Sign-In...');

    const redirectUrl = 'chessmaxmobile://';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      log.error('Apple OAuth error', error);
      await resetLocalAuthState();
      return { ok: false, error: mapAuthError(error.message) };
    }

    // Open OAuth URL in Safari View Controller (in-app browser)
    if (data?.url) {
      log.debug('Opening OAuth URL...');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success' && result.url) {
        log.debug('Apple Auth successful, processing callback...');

        // Parse the callback URL
        const url = new URL(result.url);

        // Check for PKCE authorization code (in query string)
        const code = url.searchParams.get('code');
        log.debug('Authorization code present', { hasCode: !!code });

        if (code) {
          // PKCE flow: Exchange code for session
          log.debug('Exchanging authorization code for session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            log.error('Apple code exchange error', sessionError);
            await resetLocalAuthState();
            return { ok: false, error: mapAuthError(sessionError.message) };
          }

          log.info('Apple Sign-in successful (PKCE)');
          return {
            ok: true,
            provider: 'apple',
            session: sessionData.session,
            user: sessionData.user,
          };
        }

        // Fallback: Check for tokens in hash fragment (implicit flow)
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        log.debug('Token presence', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            log.error('Apple session error', sessionError);
            await resetLocalAuthState();
            return { ok: false, error: mapAuthError(sessionError.message) };
          }

          log.info('Apple Sign-in successful (implicit)');
          return {
            ok: true,
            provider: 'apple',
            session: sessionData.session,
            user: sessionData.user,
          };
        }

        log.error('Apple: No code or tokens found in callback URL');
        await resetLocalAuthState();
        return { ok: false, error: 'Missing authentication data' };
      } else if (result.type === 'cancel') {
        log.debug('User cancelled Apple sign-in');
        return { ok: false, error: 'User cancelled sign-in' };
      }
    }

    await resetLocalAuthState();
    return { ok: false, error: 'Failed to get OAuth URL' };
  } catch (error: any) {
    log.error('Apple Auth error', error);
    await resetLocalAuthState();
    return { ok: false, error: mapAuthError(error.message) };
  }
}

/**
 * Sign out from all providers
 */
export async function signOut() {
  try {
    // Clear any pending WebBrowser auth sessions to prevent stale flow state
    await WebBrowser.dismissAuthSession();

    // Sign out from Supabase
    await supabase.auth.signOut();

    log.info('Signed out successfully');
    return { ok: true };
  } catch (error: any) {
    log.error('Sign out error', error);
    return { ok: false, error: error.message };
  }
}

