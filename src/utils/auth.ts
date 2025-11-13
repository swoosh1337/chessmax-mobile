import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

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
    console.warn('[Auth] Failed to clear local auth state:', err);
  }
}

/**
 * Google Sign-In using Supabase OAuth
 * Opens Safari View Controller (in-app browser) - Apple approved
 */
export async function signInWithGoogle() {
  try {
    console.log('[Google Auth] Starting Google Sign-In...');

    const redirectUrl = 'chessmaxmobile://';
    console.log('[Google Auth] Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[Google Auth] OAuth error:', error);
      console.error('[Google Auth] Error message:', error.message);
      console.error('[Google Auth] Error details:', JSON.stringify(error, null, 2));
      await resetLocalAuthState();
      return { ok: false, error: mapAuthError(error.message) };
    }

    // Open OAuth URL in Safari View Controller (in-app browser)
    if (data?.url) {
      console.log('[Google Auth] OAuth URL received from Supabase');
      console.log('[Google Auth] Full URL:', data.url);
      console.log('[Google Auth] Opening in Safari View Controller...');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log('[Google Auth] WebBrowser result type:', result.type);
      console.log('[Google Auth] WebBrowser full result:', JSON.stringify(result, null, 2));

      if (result.type === 'success' && result.url) {
        console.log('[Google Auth] Auth successful, processing callback...');
        console.log('[Google Auth] Callback URL:', result.url);

        // Parse the callback URL
        const url = new URL(result.url);

        // Check for PKCE authorization code (in query string)
        const code = url.searchParams.get('code');
        console.log('[Google Auth] Authorization code present:', !!code);

        if (code) {
          // PKCE flow: Exchange code for session
          console.log('[Google Auth] Exchanging authorization code for session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            console.error('[Google Auth] Code exchange error:', sessionError);
            await resetLocalAuthState();
            return { ok: false, error: mapAuthError(sessionError.message) };
          }

          console.log('[Google Auth] Sign-in successful (PKCE)');
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

        console.log('[Google Auth] Access token present:', !!accessToken);
        console.log('[Google Auth] Refresh token present:', !!refreshToken);

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[Google Auth] Session error:', sessionError);
            await resetLocalAuthState();
            return { ok: false, error: mapAuthError(sessionError.message) };
          }

          console.log('[Google Auth] Sign-in successful (implicit)');
          return {
            ok: true,
            provider: 'google',
            session: sessionData.session,
            user: sessionData.user,
          };
        }

        console.error('[Google Auth] No code or tokens found in callback URL');
        return { ok: false, error: 'Missing authentication data' };
      } else if (result.type === 'cancel') {
        console.log('[Google Auth] User cancelled sign-in');
        return { ok: false, error: 'User cancelled sign-in' };
      } else {
        console.error('[Google Auth] Unexpected result type:', result.type);
        await resetLocalAuthState();
        return { ok: false, error: `Unexpected result: ${result.type}` };
      }
    } else {
      console.error('[Google Auth] No OAuth URL received from Supabase');
      console.error('[Google Auth] Supabase response:', JSON.stringify(data, null, 2));
      await resetLocalAuthState();
      return { ok: false, error: 'Failed to get OAuth URL from Supabase' };
    }
  } catch (error: any) {
    console.error('[Google Auth] Unexpected error:', error);
    console.error('[Google Auth] Error message:', error.message);
    console.error('[Google Auth] Error stack:', error.stack);
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
    console.log('[Apple Auth] Starting Apple Sign-In...');

    const redirectUrl = 'chessmaxmobile://';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[Apple Auth] OAuth error:', error);
      await resetLocalAuthState();
      return { ok: false, error: mapAuthError(error.message) };
    }

    // Open OAuth URL in Safari View Controller (in-app browser)
    if (data?.url) {
      console.log('[Apple Auth] Opening OAuth URL...');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success' && result.url) {
        console.log('[Apple Auth] Auth successful, processing callback...');
        console.log('[Apple Auth] Callback URL:', result.url);

        // Parse the callback URL
        const url = new URL(result.url);

        // Check for PKCE authorization code (in query string)
        const code = url.searchParams.get('code');
        console.log('[Apple Auth] Authorization code present:', !!code);

        if (code) {
          // PKCE flow: Exchange code for session
          console.log('[Apple Auth] Exchanging authorization code for session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            console.error('[Apple Auth] Code exchange error:', sessionError);
            await resetLocalAuthState();
            return { ok: false, error: mapAuthError(sessionError.message) };
          }

          console.log('[Apple Auth] Sign-in successful (PKCE)');
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

        console.log('[Apple Auth] Access token present:', !!accessToken);
        console.log('[Apple Auth] Refresh token present:', !!refreshToken);

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[Apple Auth] Session error:', sessionError);
            await resetLocalAuthState();
            return { ok: false, error: mapAuthError(sessionError.message) };
          }

          console.log('[Apple Auth] Sign-in successful (implicit)');
          return {
            ok: true,
            provider: 'apple',
            session: sessionData.session,
            user: sessionData.user,
          };
        }

        console.error('[Apple Auth] No code or tokens found in callback URL');
        await resetLocalAuthState();
        return { ok: false, error: 'Missing authentication data' };
      } else if (result.type === 'cancel') {
        return { ok: false, error: 'User cancelled sign-in' };
      }
    }

    await resetLocalAuthState();
    return { ok: false, error: 'Failed to get OAuth URL' };
  } catch (error: any) {
    console.error('[Apple Auth] Error:', error);
    await resetLocalAuthState();
    return { ok: false, error: mapAuthError(error.message) };
  }
}

/**
 * Sign out from all providers
 */
export async function signOut() {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();

    console.log('[Auth] Signed out successfully');
    return { ok: true };
  } catch (error: any) {
    console.error('[Auth] Sign out error:', error);
    return { ok: false, error: error.message };
  }
}

