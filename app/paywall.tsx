import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/src/theme/colors';
import { signInWithApple, signInWithGoogle } from '@/src/utils/auth';
import { router } from 'expo-router';

export default function PaywallScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: 'google' | 'apple') => {
    setLoading(provider);
    try {
      const res = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      // proceed regardless (mock)
    } finally {
      setLoading(null);
    }
  };

  const continueToApp = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unlock ChessMaxx Pro</Text>
        <Text style={styles.subtitle}>Unlimited training, all variations, and future features.</Text>
      </View>

      <View style={styles.plans}>
        <View style={[styles.planCard, styles.planSide]}>
          <Text style={styles.planName}>Monthly</Text>
          <Text style={styles.planPrice}>$3.99</Text>
          <Text style={styles.planDesc}>per month</Text>
        </View>
        <View style={[styles.planCard, styles.planCenter]}> 
          <Text style={[styles.planName, styles.primaryText]}>Yearly</Text>
          <Text style={[styles.planPrice, styles.primaryText]}>$23.99</Text>
          <Text style={[styles.planDesc, styles.primaryText]}>≈ 50% off vs monthly</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>Best Value</Text></View>
        </View>
        <View style={[styles.planCard, styles.planSide]}>
          <Text style={styles.planName}>Weekly</Text>
          <Text style={styles.planPrice}>$0.99</Text>
          <Text style={styles.planDesc}>3‑day free trial</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.google]} onPress={() => handleSignIn('google')} disabled={!!loading}>
          <Text style={[styles.buttonText, styles.darkText]}>{loading==='google' ? 'Connecting…' : 'Continue with Google'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.apple]} onPress={() => handleSignIn('apple')} disabled={!!loading}>
          <Text style={[styles.buttonText, styles.appleText]}>{loading==='apple' ? 'Connecting…' : 'Continue with Apple'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={continueToApp}>
          <Text style={styles.linkText}>Continue without subscription</Text>
        </TouchableOpacity>
        <Text style={styles.legal}>Payment handled by App Store. Cancel anytime in Settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, alignItems: 'center' },
  title: { color: colors.foreground, fontWeight: '800', fontSize: 22, textAlign: 'center' },
  subtitle: { color: colors.textSubtle, marginTop: 6, textAlign: 'center' },
  plans: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8 },
  planCard: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 18, borderWidth: 1, position: 'relative' },
  planSide: { backgroundColor: colors.card, borderColor: '#222', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  planCenter: { backgroundColor: colors.primary, borderColor: colors.primary, transform: [{ scale: 1.06 }], shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  primaryText: { color: colors.primaryForeground },
  planName: { color: colors.foreground, fontWeight: '800' },
  planPrice: { color: colors.foreground, fontSize: 20, fontWeight: '800', marginTop: 2 },
  planDesc: { color: colors.textSubtle, marginTop: 2 },
  badge: { position: 'absolute', top: -10, right: 12, backgroundColor: '#10b981', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  actions: { padding: 16, marginTop: 12 },
  button: { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  google: { backgroundColor: '#fff' },
  apple: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#333' },
  buttonText: { fontWeight: '800' },
  darkText: { color: '#000' },
  appleText: { color: colors.foreground },
  linkButton: { alignItems: 'center', marginTop: 6 },
  linkText: { color: colors.textSubtle, textDecorationLine: 'underline' },
  legal: { color: colors.textSubtle, fontSize: 11, textAlign: 'center', marginTop: 12 },
});
