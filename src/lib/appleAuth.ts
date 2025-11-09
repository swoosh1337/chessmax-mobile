import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

/**
 * Sign in with Apple using Supabase OAuth
 * Opens Safari View Controller (in-app browser) - Apple approved
 */
export const signInWithApple = async () => {
  try {
    console.log('[AppleAuth] Initiating Apple sign-in...');

    const redirectUrl = 'chessmaxmobile://';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[AppleAuth] OAuth error:', error);
      throw error;
    }

    // Open OAuth URL in Safari View Controller (in-app browser)
    if (data?.url) {
      console.log('[AppleAuth] Opening OAuth URL...');

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
          console.log('[AppleAuth] Sign-in successful');
        }
      } else if (result.type === 'cancel') {
        throw new Error('Sign-in cancelled');
      }
    }
  } catch (error) {
    console.error('[AppleAuth] Error in signInWithApple:', error);
    throw error;
  }
};
