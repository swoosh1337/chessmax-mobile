import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/src/theme/colors';

export interface SubscriptionCardProps {
  isPremium: boolean;
  loadingSubscription: boolean;
}

/**
 * Subscription status card showing premium status or upgrade option
 */
export default function SubscriptionCard({
  isPremium,
  loadingSubscription,
}: SubscriptionCardProps) {
  return (
    <View style={[styles.card, isPremium && styles.cardPremium]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isPremium ? '⭐ Premium Member' : '🎯 Free Account'}
        </Text>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>

      {loadingSubscription ? (
        <ActivityIndicator size="small" color={colors.textSubtle} style={{ marginTop: 8 }} />
      ) : (
        <>
          <Text style={styles.description}>
            {isPremium
              ? 'You have unlimited access to all openings and variations!'
              : 'Upgrade to unlock all openings and variations.'}
          </Text>

          {!isPremium && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/paywall')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}

          {isPremium && (
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>Subscribed</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Access</Text>
                <Text style={styles.detailValue}>All Content</Text>
              </View>
            </View>
          )}

          {!isPremium && (
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Access</Text>
                <Text style={styles.detailValue}>First 3 openings (all levels)</Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardPremium: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
  },
  premiumBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '800',
  },
  description: {
    color: colors.textSubtle,
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
});
