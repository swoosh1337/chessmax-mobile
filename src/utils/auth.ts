import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

// Complete the WebBrowser session
WebBrowser.maybeCompleteAuthSession();

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
      return { ok: false, error: error.message };
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
        console.log('[Google Auth] Auth successful, extracting tokens...');
        console.log('[Google Auth] Callback URL:', result.url);

        // Extract tokens from URL
        const url = new URL(result.url);
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
            return { ok: false, error: sessionError.message };
          }

          console.log('[Google Auth] Sign-in successful');
          return {
            ok: true,
            provider: 'google',
            session: sessionData.session,
            user: sessionData.user,
          };
        } else {
          console.error('[Google Auth] Missing tokens in callback URL');
          return { ok: false, error: 'Missing authentication tokens' };
        }
      } else if (result.type === 'cancel') {
        console.log('[Google Auth] User cancelled sign-in');
        return { ok: false, error: 'User cancelled sign-in' };
      } else {
        console.error('[Google Auth] Unexpected result type:', result.type);
        return { ok: false, error: `Unexpected result: ${result.type}` };
      }
    } else {
      console.error('[Google Auth] No OAuth URL received from Supabase');
      console.error('[Google Auth] Supabase response:', JSON.stringify(data, null, 2));
      return { ok: false, error: 'Failed to get OAuth URL from Supabase' };
    }
  } catch (error: any) {
    console.error('[Google Auth] Unexpected error:', error);
    console.error('[Google Auth] Error message:', error.message);
    console.error('[Google Auth] Error stack:', error.stack);
    return { ok: false, error: error.message || 'Google sign-in failed' };
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
      return { ok: false, error: error.message };
    }

    // Open OAuth URL in Safari View Controller (in-app browser)
    if (data?.url) {
      console.log('[Apple Auth] Opening OAuth URL...');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success' && result.url) {
        // Extract tokens from URL
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            return { ok: false, error: sessionError.message };
          }

          console.log('[Apple Auth] Sign-in successful');
          return {
            ok: true,
            provider: 'apple',
            session: sessionData.session,
            user: sessionData.user,
          };
        }
      } else if (result.type === 'cancel') {
        return { ok: false, error: 'User cancelled sign-in' };
      }
    }

    return { ok: false, error: 'Failed to get OAuth URL' };
  } catch (error: any) {
    console.error('[Apple Auth] Error:', error);
    return { ok: false, error: error.message || 'Apple sign-in failed' };
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

