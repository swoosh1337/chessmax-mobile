import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
// Reanimated import removed - we use react-native Animated instead

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/src/context/AuthContext';
import { LeaderboardProvider } from '@/src/context/LeaderboardContext';
import { SubscriptionProvider } from '@/src/context/SubscriptionContext';
import { TrainingProvider } from '@/src/context/TrainingContext';

// Prevent the splash screen from auto-hiding - CRITICAL: Must be called at global scope
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        console.log('📦 Preloading critical assets...');
        // Preload all critical images (auth + onboarding + paywall)
        await Asset.loadAsync([
          require('../assets/images/icon.png'),
          require('../assets/images/logo_transparent.png'),
          // Onboarding mascots
          require('../assets/mascot/turtle_thinking.png'),
          require('../assets/mascot/turtle_holding_board.png'),
          require('../assets/mascot/turtle_playing_chess.png'),
          require('../assets/mascot/turtle_sitting.png'),
          require('../assets/mascot/turtle_sleeping.png'),
        ]);
        console.log('✅ Assets loaded successfully');
      } catch (e) {
        console.warn('⚠️ Failed to load assets:', e);
      } finally {
        // Tell the app to render and hide the splash screen
        setAppIsReady(true);
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // Hide the splash screen after assets are loaded
      console.log('🚀 Hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Don't render anything until assets are loaded
  if (!appIsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <TrainingProvider>
          <LeaderboardProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="paywall" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="training" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </LeaderboardProvider>
        </TrainingProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
