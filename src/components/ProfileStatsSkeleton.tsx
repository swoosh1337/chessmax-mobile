import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/src/theme/colors';

/**
 * Skeleton loader for profile stats
 * Shows animated loading placeholders while data is being fetched
 */
export default function ProfileStatsSkeleton() {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Stats Card Skeleton */}
      <Animated.View style={[styles.statsCard, { opacity }]}>
        <View style={styles.statItem}>
          <View style={styles.statValueSkeleton} />
          <View style={styles.statLabelSkeleton} />
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.statValueSkeleton} />
          <View style={styles.statLabelSkeleton} />
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.statValueSkeleton} />
          <View style={styles.statLabelSkeleton} />
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.statValueSkeleton} />
          <View style={styles.statLabelSkeleton} />
        </View>
      </Animated.View>

      {/* Progress Card Skeleton */}
      <Animated.View style={[styles.progressCard, { opacity }]}>
        <View style={styles.progressHeader}>
          <View style={styles.progressLabelSkeleton} />
          <View style={styles.progressTextSkeleton} />
        </View>
        <View style={styles.progressBarSkeleton} />
      </Animated.View>

      {/* Subscription Card Skeleton */}
      <Animated.View style={[styles.subscriptionCard, { opacity }]}>
        <View style={styles.subscriptionTitleSkeleton} />
        <View style={styles.subscriptionDescriptionSkeleton} />
        <View style={styles.subscriptionDescriptionSkeleton} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  statsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'stretch',
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statValueSkeleton: {
    width: 40,
    height: 20,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginBottom: 8,
  },
  statLabelSkeleton: {
    width: 50,
    height: 10,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabelSkeleton: {
    width: 120,
    height: 14,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  progressTextSkeleton: {
    width: 80,
    height: 12,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  progressBarSkeleton: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subscriptionTitleSkeleton: {
    width: 150,
    height: 16,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginBottom: 12,
  },
  subscriptionDescriptionSkeleton: {
    width: '100%',
    height: 14,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginBottom: 8,
  },
});
