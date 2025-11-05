import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { colors } from '@/src/theme/colors';
import { signInWithApple, signInWithGoogle } from '@/src/utils/auth';

const AUTH_DONE_KEY = '@chessmax_auth_done';

export default function AuthScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  const complete = async () => {
    await AsyncStorage.setItem(AUTH_DONE_KEY, '1');
    router.replace('/onboarding');
  };

  const handle = async (provider: 'google' | 'apple') => {
    setLoading(provider);
    try {
      provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      await complete();
    } catch (e) {
      await complete();
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Welcome to ChessMaxx</Text>
        <Text style={styles.subtitle}>Sign in to sync progress across devices.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnGoogle]} onPress={() => handle('google')} disabled={!!loading}>
          <Text style={[styles.btnTextDark]}>{loading==='google' ? 'Connecting…' : 'Continue with Google'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnApple]} onPress={() => handle('apple')} disabled={!!loading}>
          <Text style={[styles.btnText]}>{loading==='apple' ? 'Connecting…' : 'Continue with Apple'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={complete} style={styles.linkBtn}>
          <Text style={styles.linkText}>Continue as guest</Text>
        </TouchableOpacity>
      </View>

      <Image source={require('../assets/mascot/turtle_thinking.png')} style={styles.mascot} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 16 },
  logo: { width: 84, height: 84, borderRadius: 18, marginBottom: 10 },
  title: { color: colors.foreground, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textSubtle, marginTop: 6, textAlign: 'center' },
  actions: { paddingHorizontal: 16, marginTop: 28 },
  btn: { height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnGoogle: { backgroundColor: '#fff' },
  btnApple: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#333' },
  btnText: { color: colors.foreground, fontWeight: '800' },
  btnTextDark: { color: '#000', fontWeight: '800' },
  linkBtn: { alignItems: 'center', marginTop: 6 },
  linkText: { color: colors.textSubtle, textDecorationLine: 'underline' },
  mascot: { position: 'absolute', right: 18, bottom: 24, width: 110, height: 110, resizeMode: 'contain', opacity: 0.9 },
});

