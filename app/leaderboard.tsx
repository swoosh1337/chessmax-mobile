import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { colors } from '@/src/theme/colors';
import { useLeaderboard, UserProfile, SpeedrunProfile } from '@/src/context/LeaderboardContext';
import { useAuth } from '@/src/context/AuthContext';
import LeaderboardSkeleton from '@/src/components/LeaderboardSkeleton';
import { formatXP, getRankSuffix } from '@/src/utils/xp';
import { useFocusEffect } from '@react-navigation/native';

type TabType = 'allTime' | 'weekly' | 'speedrun';

// Format time in seconds to mm:ss format
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { data, loading, error, refetch, subscribeToUpdates } = useLeaderboard();
  const [activeTab, setActiveTab] = useState<TabType>('allTime');
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to real-time updates when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // console.log('[Leaderboard] Screen focused, subscribing to updates');
      subscribeToUpdates(true);

      // Fetch data if not already loaded
      if (!data && !loading) {
        refetch();
      }

      return () => {
        // console.log('[Leaderboard] Screen unfocused, unsubscribing from updates');
        subscribeToUpdates(false);
      };
    }, [data, loading])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderLeaderboardEntry = ({ item, index }: { item: UserProfile; index: number }) => {
    const isCurrentUser = user?.id === item.id;
    const xp = activeTab === 'allTime' ? item.total_xp : item.weekly_xp;

    return (
      <View style={[styles.row, isCurrentUser && styles.rowHighlighted]}>
        {/* Rank */}
        <View style={styles.rankContainer}>
          <Text style={[styles.rank, isCurrentUser && styles.textHighlighted]}>
            {index + 1}
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.username, isCurrentUser && styles.textHighlighted]} numberOfLines={1}>
            {item.username || `Player${item.id.substring(0, 6)}`}
            {isCurrentUser && ' (You)'}
          </Text>
          <Text style={[styles.xpText, isCurrentUser && styles.xpTextHighlighted]}>
            {formatXP(xp)} XP
          </Text>
        </View>

        {/* Level Badge */}
        <View style={[styles.levelBadge, isCurrentUser && styles.levelBadgeHighlighted]}>
          <Text style={[styles.levelText, isCurrentUser && styles.levelTextHighlighted]}>
            {item.level}
          </Text>
        </View>
      </View>
    );
  };

  const renderSpeedrunEntry = ({ item, index }: { item: SpeedrunProfile; index: number }) => {
    const isCurrentUser = user?.id === item.id;

    // Use currentUser's username if this is the current user and their username is available
    const displayName = isCurrentUser && data?.currentUser?.username
      ? data.currentUser.username
      : (item.username || `Player${item.id.substring(0, 6)}`);

    if (isCurrentUser) {
      console.log('[Leaderboard] Rendering current user entry');
      console.log('  - item.username:', item.username);
      console.log('  - data.currentUser?.username:', data?.currentUser?.username);
      console.log('  - displayName:', displayName);
      console.log('  - perfect_completions:', item.perfect_completions);
    }

    return (
      <View style={[styles.row, isCurrentUser && styles.rowHighlighted]}>
        {/* Rank */}
        <View style={styles.rankContainer}>
          <Text style={[styles.rank, isCurrentUser && styles.textHighlighted]}>
            {index + 1}
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.username, isCurrentUser && styles.textHighlighted]} numberOfLines={1}>
            {displayName}
            {isCurrentUser && ' (You)'}
          </Text>
          <Text style={[styles.xpText, isCurrentUser && styles.xpTextHighlighted]}>
            {formatTime(item.avg_time_seconds)}
          </Text>
        </View>

        {/* Completions Badge */}
        <View style={[styles.speedBadge, isCurrentUser && styles.speedBadgeHighlighted]}>
          <Text style={[styles.speedBadgeIcon, isCurrentUser && styles.speedBadgeIconHighlighted]}>⚡</Text>
          <Text style={[styles.speedBadgeCount, isCurrentUser && styles.speedBadgeCountHighlighted]}>
            {item.perfect_completions}
          </Text>
        </View>
      </View>
    );
  };

  const renderCurrentUserRank = () => {
    if (!user) return null;

    if (activeTab === 'speedrun') {
      if (!data?.currentUserSpeedrun || data.currentUserSpeedrun.perfect_completions < 3) {
        return (
          <View style={styles.currentUserRank}>
            <Text style={styles.currentUserRankTitle}>Complete 3 perfect variations to qualify!</Text>
          </View>
        );
      }

      // Check if user's rank is 20 or better (should appear in top 20 list)
      const userRank = data.currentUserSpeedrun.rank || 999;
      const userInTop20 = userRank <= 20;

      console.log('[Leaderboard] User rank:', userRank);
      console.log('[Leaderboard] User in top 20?', userInTop20);

      // IMPORTANT: Don't show "YOUR RANK" if user is in top 20
      if (userInTop20) {
        console.log('[Leaderboard] User is in top 20, not showing YOUR RANK section');
        return null;
      }

      // Show user's rank only if they're outside top 100
      console.log('[Leaderboard] Showing YOUR RANK section for user outside top 100');

      // Use currentUser's username if available
      const displayName = data.currentUser?.username
        ? data.currentUser.username
        : (data.currentUserSpeedrun.username || `Player${data.currentUserSpeedrun.id.substring(0, 6)}`);

      return (
        <View style={styles.currentUserRank}>
          <Text style={styles.currentUserRankTitle}>YOUR RANK</Text>
          <View style={styles.yourRankRow}>
            <View style={styles.rankContainer}>
              <Text style={[styles.rank, styles.textHighlighted]}>
                {data.currentUserSpeedrun.rank || '?'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.username, styles.textHighlighted]} numberOfLines={1}>
                {displayName} (You)
              </Text>
              <Text style={[styles.xpText, styles.xpTextHighlighted]}>
                {formatTime(data.currentUserSpeedrun.avg_time_seconds)}
              </Text>
            </View>
            <View style={[styles.speedBadge, styles.speedBadgeHighlighted]}>
              <Text style={[styles.speedBadgeIcon, styles.speedBadgeIconHighlighted]}>⚡</Text>
              <Text style={[styles.speedBadgeCount, styles.speedBadgeCountHighlighted]}>
                {data.currentUserSpeedrun.perfect_completions}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (!data?.currentUser) return null;

    const leaderboardData = activeTab === 'allTime' ? data.allTime : data.weekly;
    const userInTop100 = leaderboardData.some((p) => p.id === user.id);

    // If user is in top 100, they're already shown in the list
    if (userInTop100) return null;

    const xp = activeTab === 'allTime' ? data.currentUser.total_xp : data.currentUser.weekly_xp;
    const rank = data.currentUser.rank || '?';

    return (
      <View style={styles.currentUserRank}>
        <Text style={styles.currentUserRankTitle}>Your Rank</Text>
        <View style={[styles.row, styles.rowHighlighted]}>
          <View style={styles.rankContainer}>
            <Text style={styles.rank}>{getRankSuffix(typeof rank === 'number' ? rank : 0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username} numberOfLines={1}>
              {data.currentUser.username || `Player${data.currentUser.id.substring(0, 6)}`} (You)
            </Text>
            <Text style={styles.xpText}>{formatXP(xp)} XP</Text>
          </View>
          <View style={[styles.levelBadge, styles.levelBadgeHighlighted]}>
            <Text style={styles.levelText}>{data.currentUser.level}</Text>
          </View>
        </View>
      </View>
    );
  };

  const leaderboardData = data
    ? (activeTab === 'speedrun' ? data.speedrun : (activeTab === 'allTime' ? data.allTime : data.weekly))
    : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'allTime' && styles.tabActive]}
          onPress={() => setActiveTab('allTime')}
        >
          <Text style={[styles.tabText, activeTab === 'allTime' && styles.tabTextActive]}>
            All-Time
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'speedrun' && styles.tabActive]}
          onPress={() => setActiveTab('speedrun')}
        >
          <Text style={[styles.tabText, activeTab === 'speedrun' && styles.tabTextActive]}>
            ⚡Speed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !data ? (
        <LeaderboardSkeleton count={10} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load leaderboard</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : leaderboardData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No rankings yet</Text>
          <Text style={styles.emptySubtext}>Complete training variations to earn XP!</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboardData}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'speedrun' ? renderSpeedrunEntry : renderLeaderboardEntry}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={renderCurrentUserRank}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.foreground,
    fontSize: 32,
    fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textSubtle,
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowHighlighted: {
    backgroundColor: colors.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rank: {
    color: colors.textSubtle,
    fontSize: 18,
    fontWeight: '700',
  },
  textHighlighted: {
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  xpText: {
    color: colors.textSubtle,
    fontSize: 14,
  },
  xpTextHighlighted: {
    color: colors.primary,
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  levelBadgeHighlighted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  levelTextHighlighted: {
    color: colors.background,
  },
  currentUserRank: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  currentUserRankTitle: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  yourRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  speedBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  speedBadgeHighlighted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedBadgeIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  speedBadgeIconHighlighted: {
    color: colors.background,
  },
  speedBadgeCount: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '800',
  },
  speedBadgeCountHighlighted: {
    color: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.textSubtle,
    fontSize: 14,
  },
});

