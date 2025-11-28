import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { router, useSegments } from 'expo-router';
import { colors } from '@/src/theme/colors';
import { signInWithApple, signInWithGoogle } from '@/src/utils/auth';
import { useAuth } from '@/src/context/AuthContext';

export default function AuthScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [signInComplete, setSignInComplete] = useState(false);
  const hasRedirected = useRef(false);
  const segments = useSegments();

  // Redirect if already authenticated (but not during sign-in flow)
  // Only redirect if we're actually on the auth route
  useEffect(() => {
    // Check if we're actually on the auth route
    const isOnAuthRoute = segments[0] === 'auth' || segments[0] === undefined;
    
    if (!authLoading && isAuthenticated && !loading && !signInComplete && !hasRedirected.current && isOnAuthRoute) {
      // console.log('[AuthScreen] User already authenticated, redirecting to index');
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [isAuthenticated, authLoading, loading, signInComplete, segments]);

  const handle = async (provider: 'google' | 'apple') => {
    setLoading(provider);
    setSignInComplete(false);
    try {
      // console.log(`[AuthScreen] Starting ${provider} sign-in...`);

      const result = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithApple();

      if (!result.ok) {
        // Don't show alert if user cancelled - it's a normal action
        if (result.error === 'User cancelled sign-in') {
          // console.log(`[AuthScreen] ${provider} sign-in cancelled by user`);
          setLoading(null);
          return;
        }

        console.error(`[AuthScreen] ${provider} sign-in failed:`, result.error);
        Alert.alert('Sign In Failed', result.error || 'Something went wrong');
        setLoading(null);
        return;
      }

      // console.log(`[AuthScreen] ${provider} sign-in success!`);
      setSignInComplete(true);
      // Let index.tsx handle routing based on onboarding/paywall status
      router.replace('/');
    } catch (e: any) {
      console.error('[AuthScreen] Sign-in error:', e);
      Alert.alert('Sign In Error', e.message || 'Something went wrong');
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>ChessMaxx</Text>
        <Text style={styles.subtitle}>Master your chess game</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnGoogle]} onPress={() => handle('google')} disabled={!!loading}>
          <Text style={[styles.btnTextDark]}>{loading==='google' ? 'Connecting…' : 'Continue with Google'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnApple]} onPress={() => handle('apple')} disabled={!!loading}>
          <Text style={[styles.btnText]}>{loading==='apple' ? 'Connecting…' : 'Continue with Apple'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  header: { alignItems: 'center', paddingHorizontal: 16, marginBottom: 48 },
  logo: { width: 140, height: 140, borderRadius: 28, marginBottom: 24 },
  title: { color: colors.foreground, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textSubtle, marginTop: 8, textAlign: 'center', fontSize: 16 },
  actions: { paddingHorizontal: 24 },
  btn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  btnGoogle: { backgroundColor: '#fff' },
  btnApple: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#333' },
  btnText: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  btnTextDark: { color: '#000', fontWeight: '700', fontSize: 16 },
  linkBtn: { alignItems: 'center', marginTop: 12 },
  linkText: { color: colors.textSubtle, textDecorationLine: 'underline', fontSize: 15 },
});

