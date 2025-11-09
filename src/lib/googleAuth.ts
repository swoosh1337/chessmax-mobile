import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Complete the WebBrowser session
WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with Google using Supabase OAuth
 * Opens Safari View Controller (in-app browser) - Apple approved
 */
export const signInWithGoogle = async () => {
  try {
    console.log('[GoogleAuth] Initiating Google sign-in...');

    const redirectUrl = 'chessmaxmobile://';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[GoogleAuth] OAuth error:', error);
      throw error;
    }

    // Open OAuth URL in Safari View Controller (in-app browser)
    if (data?.url) {
      console.log('[GoogleAuth] Opening OAuth URL...');

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
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          console.log('[GoogleAuth] Sign-in successful');
        }
      } else if (result.type === 'cancel') {
        throw new Error('Sign-in cancelled');
      }
    }
  } catch (error) {
    console.error('[GoogleAuth] Error in signInWithGoogle:', error);
    throw error;
  }
};
