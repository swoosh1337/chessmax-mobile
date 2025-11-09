import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/src/theme/colors';

/**
 * Skeleton loader component for leaderboard entries
 * Shows animated loading placeholders while data is being fetched
 */
export default function LeaderboardSkeleton({ count = 10 }: { count?: number }) {
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
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View key={index} style={[styles.row, { opacity }]}>
          {/* Rank */}
          <View style={styles.rank}>
            <View style={styles.rankSkeleton} />
          </View>

          {/* User info */}
          <View style={styles.userInfo}>
            <View style={styles.usernameSkeleton} />
            <View style={styles.xpSkeleton} />
          </View>

          {/* Level badge */}
          <View style={styles.levelBadge}>
            <View style={styles.levelSkeleton} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    width: 40,
    marginRight: 12,
  },
  rankSkeleton: {
    width: 24,
    height: 20,
    backgroundColor: colors.card,
    borderRadius: 4,
  },
  userInfo: {
    flex: 1,
  },
  usernameSkeleton: {
    width: '70%',
    height: 16,
    backgroundColor: colors.card,
    borderRadius: 4,
    marginBottom: 6,
  },
  xpSkeleton: {
    width: '40%',
    height: 12,
    backgroundColor: colors.card,
    borderRadius: 4,
  },
  levelBadge: {
    marginLeft: 12,
  },
  levelSkeleton: {
    width: 40,
    height: 40,
    backgroundColor: colors.card,
    borderRadius: 20,
  },
});
