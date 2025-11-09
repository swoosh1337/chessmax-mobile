import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/colors';
import { onboardingStorage } from '@/src/utils/storage';

const PAYWALL_SEEN_KEY = '@chessmax_paywall_seen';

/**
 * Root index route - handles auth flow navigation
 * Flow: Auth → Onboarding → Paywall → Main App
 */
export default function IndexScreen() {
  const { isAuthenticated, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const navigationTarget = useRef<string | null>(null);
  const segments = useSegments();

  // Reset navigation target when auth state changes significantly
  useEffect(() => {
    if (!loading) {
      navigationTarget.current = null;
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    const navigate = async () => {
      // Only navigate if we're actually on the index route (not already navigated away)
      const isOnIndexRoute = segments[0] === undefined || segments[0] === 'index';
      if (!isOnIndexRoute) {
        // Already navigated away, don't do anything
        return;
      }

      try {
        // console.log('[Index] Checking auth flow...');
        // console.log('[Index] Auth loading:', loading);
        // console.log('[Index] Is authenticated:', isAuthenticated);
        // console.log('[Index] Current segments:', segments);

        // Wait for auth to load
        if (loading) {
          // console.log('[Index] Auth still loading, waiting...');
          return;
        }

        // 1. Not authenticated → go to auth screen
        if (!isAuthenticated) {
          const target = '/auth';
          if (navigationTarget.current === target) {
            return; // Already navigating here
          }
          // console.log('[Index] Not authenticated → /auth');
          navigationTarget.current = target;
          setChecking(false);
          router.replace(target);
          return;
        }

        // 2. Authenticated - check onboarding
        const onboardingSeen = await onboardingStorage.hasSeenOnboarding();
        if (!onboardingSeen) {
          const target = '/onboarding';
          if (navigationTarget.current === target) {
            return; // Already navigating here
          }
          // console.log('[Index] Onboarding not seen → /onboarding');
          navigationTarget.current = target;
          setChecking(false);
          router.replace(target);
          return;
        }

        // 3. Onboarding done - check paywall
        const paywallSeen = await AsyncStorage.getItem(PAYWALL_SEEN_KEY);
        if (!paywallSeen) {
          const target = '/paywall';
          if (navigationTarget.current === target) {
            return; // Already navigating here
          }
          // console.log('[Index] Paywall not seen → /paywall');
          navigationTarget.current = target;
          setChecking(false);
          router.replace(target);
          return;
        }

        // 4. Everything done - go to main app
        // Only navigate if we're not already on tabs route
        if (segments[0] !== '(tabs)') {
          const target = '/(tabs)';
          if (navigationTarget.current === target) {
            return; // Already navigating here
          }
          // console.log('[Index] All steps complete → /(tabs)');
          navigationTarget.current = target;
          setChecking(false);
          router.replace(target);
        }
      } catch (error) {
        console.error('[Index] Navigation error:', error);
        // On error, go to auth as fallback
        const target = '/auth';
        navigationTarget.current = target;
        setChecking(false);
        router.replace(target);
      }
    };

    navigate();
  }, [isAuthenticated, loading, segments]);

  // Show loading spinner while checking
  if (checking || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Should never render this, but just in case
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
