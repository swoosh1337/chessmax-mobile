import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Image, Switch, Linking, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '@/src/context/SubscriptionContext';

const PAYWALL_SEEN_KEY = '@chessmax_paywall_seen';

export default function PaywallScreen() {
  const { products, purchaseSubscription, restorePurchases, isLoading } = useSubscription();
  const [selected, setSelected] = useState<'yearly' | 'weeklyTrial'>('weeklyTrial');
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const continueToApp = async () => {
    try {
      await AsyncStorage.setItem(PAYWALL_SEEN_KEY, '1');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Paywall] Error saving paywall status:', error);
      router.replace('/(tabs)');
    }
  };

  const handlePurchase = async () => {
    try {
      setPurchasing(true);

      // Get the product ID based on selection
      const productId = selected === 'yearly'
        ? 'com.igrigolia.chessmaxmobile.yearly'
        : 'com.igrigolia.chessmaxmobile.weekly.trial';

      console.log('[Paywall] Purchasing:', productId);
      await purchaseSubscription(productId);

      // On successful purchase, mark paywall as seen and continue
      await continueToApp();
    } catch (error: any) {
      console.error('[Paywall] Purchase failed:', error);

      // Check if it's Expo Go error
      if (error.message?.includes('Expo Go')) {
        Alert.alert(
          'Development Mode',
          'In-app purchases are not available in Expo Go. To test purchases, build a development build with "npx expo prebuild".\n\nFor now, you can continue with limited access.',
          [{ text: 'OK' }]
        );
      } else if (error.code === 'E_USER_CANCELLED') {
        // User cancelled - don't show error
        console.log('[Paywall] User cancelled purchase');
      } else if (error.message?.includes('timeout')) {
        // Purchase timeout - offer restore option
        Alert.alert(
          'Purchase Taking Longer Than Expected',
          'The purchase is taking longer than usual. If you completed the payment, please wait a moment and try "Restore Purchases" below.\n\nOtherwise, you can try again.',
          [
            { text: 'Try Again', onPress: () => handlePurchase() },
            { text: 'Restore Purchases', onPress: handleRestore },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else if (error.message?.includes('sandbox') || error.message?.includes('configured')) {
        // Sandbox account issue
        Alert.alert(
          'Test Account Issue',
          'Your sandbox test account is not configured properly. Please sign in with a valid sandbox tester account in Settings > App Store.\n\nFor now, you can continue with limited access.',
          [{ text: 'OK' }]
        );
      } else {
        // Generic error
        Alert.alert(
          'Purchase Failed',
          'Unable to complete purchase. Please check your connection and try again.\n\nIf you already paid, use "Restore Purchases" below.',
          [
            { text: 'Try Again', onPress: () => handlePurchase() },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setPurchasing(true);
      await restorePurchases();

      // If restore was successful, continue to app
      Alert.alert(
        'Success',
        'Purchases restored successfully!',
        [{ text: 'Continue', onPress: continueToApp }]
      );
    } catch (error: any) {
      console.error('[Paywall] Restore failed:', error);

      // Check if it's Expo Go error
      if (error.message?.includes('Expo Go')) {
        Alert.alert(
          'Development Mode',
          'In-app purchases are not available in Expo Go. Build a development build to test restore functionality.',
          [{ text: 'OK' }]
        );
      } else if (error.message?.includes('No previous purchases') || error.message?.includes('No subscription purchases')) {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any previous purchases on this Apple ID.\n\nIf you subscribed with a different Apple ID, please sign in with that account and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Restore Failed',
          'Unable to restore purchases. Please check your connection and try again.\n\nMake sure you\'re signed in with the same Apple ID you used to purchase.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const ctaLabel = useMemo(() => {
    if (selected === 'weeklyTrial' && trialEnabled) return 'Try for Free';
    if (selected === 'weeklyTrial') return 'Continue';
    return 'Continue';
  }, [selected, trialEnabled]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sheet}>
        {/* Illustration */}
        <Image source={require('../assets/mascot/turtle_playing_chess.png')} style={styles.hero} />

        {/* Headline */}
        <Text style={styles.title}>Unlimited Access</Text>
        <View style={{ height: 4 }} />
        {/* Bullets */}
        <View style={styles.bullets}>
          <Bullet icon="school-outline" text="Master all opening variations" />
          <Bullet icon="flash-outline" text="Unlock drills, hints, and feedback" />
          <Bullet icon="stats-chart-outline" text="Track progress, XP and streaks" />
          <Bullet icon="trophy-outline" text="Compete on leaderboards" />
        </View>

        {/* Plan selectors */}
        <PlanRow
          active={selected === 'yearly'}
          title="Yearly Plan"
          subtitle={<Text style={styles.planSmall}><Text style={styles.strike}>$51.88</Text> $24.99 per year</Text>}
          badge="SAVE 50%"
          onPress={() => setSelected('yearly')}
        />
        <PlanRow
          active={selected === 'weeklyTrial'}
          title="3‑Day Trial"
          subtitle={<Text style={styles.planSmall}>then $0.99 per week</Text>}
          rightLabel="FREE"
          onPress={() => setSelected('weeklyTrial')}
        />

        {/* Trial toggle when weekly selected */}
        {selected === 'weeklyTrial' && (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Free Trial Enabled</Text>
            <Switch
              value={trialEnabled}
              onValueChange={setTrialEnabled}
              thumbColor={trialEnabled ? colors.primaryForeground : '#888'}
              trackColor={{ false: '#333', true: colors.primary }}
            />
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.primaryCta, (purchasing || isLoading) && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || isLoading}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryCtaText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>

        {/* Continue as free user */}
        <TouchableOpacity onPress={continueToApp} style={styles.freeLink}>
          <Text style={styles.freeLinkText}>Continue with limited access</Text>
        </TouchableOpacity>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
            <Text style={styles.footerLinkText}>Restore</Text>
          </TouchableOpacity>
          <Text style={styles.dot}> · </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://example.com/terms')}>
            <Text style={styles.footerLinkText}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={styles.dot}> & </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://example.com/privacy')}>
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: {
    width: '100%', maxWidth: 460, backgroundColor: colors.card, borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border,
  },
  hero: { width: 96, height: 96, alignSelf: 'center', resizeMode: 'contain' },
  title: { color: colors.foreground, fontWeight: '800', fontSize: 24, textAlign: 'center', marginTop: 6 },
  bullets: { marginTop: 10, marginBottom: 12, gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletText: { color: colors.foreground, fontSize: 14, flex: 1 },

  // Plan rows (card-style)
  rowCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowActive: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  planTitle: { color: colors.foreground, fontWeight: '800' },
  planSmall: { color: colors.textSubtle },
  badge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginLeft: 8 },
  badgeText: { color: colors.primaryForeground, fontWeight: '800', fontSize: 11 },
  strike: { textDecorationLine: 'line-through', color: '#6b7280' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 },
  toggleLabel: { color: colors.foreground, fontWeight: '600' },

  primaryCta: { marginTop: 16, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryCtaText: { color: colors.primaryForeground, fontWeight: '800' },
  ctaDisabled: { opacity: 0.5 },

  freeLink: { alignItems: 'center', marginTop: 12 },
  freeLinkText: { color: colors.textSubtle, fontSize: 14, textDecorationLine: 'underline' },

  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  footerLinkText: { color: colors.textSubtle, textDecorationLine: 'underline' },
  dot: { color: colors.textSubtle },
});

function Bullet({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.bulletText}>{text}</Text>
  </View>
  );
}

function PlanRow({ active, title, subtitle, badge, rightLabel, onPress }:
  { active: boolean; title: string; subtitle?: React.ReactNode; badge?: string; rightLabel?: string; onPress: () => void; }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.rowCard, active && styles.rowActive]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.planTitle}>{title}</Text>
          {!!badge && (
            <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
          )}
        </View>
        {subtitle}
      </View>
      {rightLabel ? (
        <Text style={{ color: colors.primary, fontWeight: '800', marginRight: 10 }}>{rightLabel}</Text>
      ) : null}
      <View style={styles.radio}>{active && <View style={styles.radioDot} />}</View>
    </TouchableOpacity>
  );
}
