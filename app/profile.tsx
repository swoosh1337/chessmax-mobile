import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { colors } from '@/src/theme/colors';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';
import { useLeaderboard } from '@/src/context/LeaderboardContext';
import { deleteUserAccount } from '@/src/services/supabase/userService';
import { useSubscription } from '@/src/context/SubscriptionContext';
import { useTraining } from '@/src/context/TrainingContext';
import { useUserProfile } from '@/src/hooks/useUserProfile';
import { useReminderSettings } from '@/src/hooks/useReminderSettings';
import { formatXP, getLevelProgress } from '@/src/utils/xp';
import TrainingCalendar from '@/src/components/TrainingCalendar';
import TrainingStatistics from '@/src/components/TrainingStatistics';
import ProfileStatsSkeleton from '@/src/components/ProfileStatsSkeleton';
import SubscriptionCard from '@/src/components/SubscriptionCard';
import DailyReminderCard from '@/src/components/DailyReminderCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ratingStorage } from '@/src/utils/storage';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('Profile');

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: leaderboardData, loading: loadingLeaderboard, refetch } = useLeaderboard();
  const { isPremium, isLoading: loadingSubscription } = useSubscription();
  const {
    streak,
    dailyStats,
    variationStats,
    openingStats,
    totalMinutes,
    isLoading: loadingTraining,
  } = useTraining();

  // Use the useUserProfile hook for profile management
  const {
    profile: hookProfile,
    loading: loadingProfile,
    setUsername: updateUsername,
  } = useUserProfile(user?.id, { createIfMissing: true });

  // Use the useReminderSettings hook for daily reminders
  const reminderSettings = useReminderSettings();

  const [deleting, setDeleting] = useState(false);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [showStats, setShowStats] = useState<'calendar' | 'stats'>('calendar');

  // Get user profile from leaderboard data (has rank) or hook profile
  const userProfile = leaderboardData?.currentUser || hookProfile;

  // Combined loading state
  const isLoadingStats = loadingProfile || loadingLeaderboard;

  // Sync username from profile
  useEffect(() => {
    if (hookProfile?.username) {
      setUsername(hookProfile.username);
    }
  }, [hookProfile?.username]);

  const handleSaveUsername = async () => {
    if (!user) return;

    // Validate username
    if (username.length < 3 || username.length > 20) {
      Alert.alert('Invalid Username', 'Username must be between 3 and 20 characters');
      return;
    }

    setSavingUsername(true);
    try {
      const result = await updateUsername(username);

      if (!result.success) {
        if (result.error?.includes('taken') || result.error?.includes('already')) {
          Alert.alert('Username Taken', 'This username is already taken. Please choose another one.');
        } else {
          Alert.alert('Error', result.error || 'Failed to update username. Please try again.');
        }
        return;
      }

      setEditingUsername(false);
      Alert.alert('Success', 'Username updated successfully!');

      // Refetch leaderboard to update cache
      refetch();
    } catch (error) {
      log.error('Error saving username', error);
      Alert.alert('Error', 'Failed to update username. Please try again.');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteAccount(),
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'This will permanently delete your account and all associated data. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await deleteUserAccount();

              if (error) {
                throw error;
              }

              // Clear local storage
              try {
                await ratingStorage.resetRatingData();
                await AsyncStorage.clear();
              } catch (storageError) {
                log.warn('Error clearing local storage', { error: storageError });
              }

              // Sign out after successful deletion
              await signOut();
              router.replace('/auth');

              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            } catch (error: any) {
              log.error('Delete account error', error);
              Alert.alert(
                'Error',
                'Failed to delete account. Please contact support or try again later.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Get provider from user metadata
  const provider = user?.app_metadata?.provider || 'email';
  const providerDisplay = provider.charAt(0).toUpperCase() + provider.slice(1);

  // Calculate level progress
  const levelProgress = userProfile ? getLevelProgress(userProfile.total_xp) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {user ? (
          <View style={styles.section}>
            {/* XP and Level Stats */}
            {isLoadingStats && !hookProfile ? (
              <ProfileStatsSkeleton />
            ) : userProfile ? (
              <>
                <View style={styles.statsCard}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{formatXP(userProfile.total_xp)}</Text>
                    <Text style={styles.statLabel}>Total XP</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{formatXP(userProfile.weekly_xp)}</Text>
                    <Text style={styles.statLabel}>This Week</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProfile.level}</Text>
                    <Text style={styles.statLabel}>Level</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{loadingTraining ? '-' : streak}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                  </View>
                </View>

                {/* Level Progress Bar */}
                {levelProgress && (
                  <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>
                        Level {levelProgress.currentLevel} Progress
                      </Text>
                      <Text style={styles.progressText}>
                        {formatXP(levelProgress.xpInCurrentLevel)} / {formatXP(levelProgress.xpNeededForNextLevel)} XP
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[styles.progressBarFill, { width: `${levelProgress.progress * 100}%` }]}
                      />
                    </View>
                  </View>
                )}

                {/* Subscription Status Card */}
                <SubscriptionCard
                  isPremium={isPremium}
                  loadingSubscription={loadingSubscription}
                />
              </>
            ) : null}

            {/* Training Stats Tabs */}
            <View style={styles.statsTabsContainer}>
              <View style={styles.statsTabs}>
                <TouchableOpacity
                  style={[styles.statsTab, showStats === 'calendar' && styles.statsTabActive]}
                  onPress={() => setShowStats('calendar')}
                >
                  <Text style={[styles.statsTabText, showStats === 'calendar' && styles.statsTabTextActive]}>
                    Calendar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statsTab, showStats === 'stats' && styles.statsTabActive]}
                  onPress={() => setShowStats('stats')}
                >
                  <Text style={[styles.statsTabText, showStats === 'stats' && styles.statsTabTextActive]}>
                    Statistics
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              <View style={styles.statsContent}>
                {showStats === 'calendar' ? (
                  <TrainingCalendar dailyStats={dailyStats} />
                ) : (
                  <TrainingStatistics
                    variationStats={variationStats}
                    openingStats={openingStats}
                    totalMinutes={totalMinutes}
                  />
                )}
              </View>
            </View>

            {/* Username */}
            <View style={styles.infoCard}>
              <View style={styles.usernameHeader}>
                <Text style={styles.label}>Username</Text>
                {!editingUsername && (
                  <TouchableOpacity onPress={() => setEditingUsername(true)}>
                    <Text style={styles.editButton}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
              {editingUsername ? (
                <View style={styles.usernameEdit}>
                  <TextInput
                    style={styles.usernameInput}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    placeholderTextColor={colors.textSubtle}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.usernameActions}>
                    <TouchableOpacity
                      style={styles.usernameCancel}
                      onPress={() => {
                        setEditingUsername(false);
                        setUsername(hookProfile?.username || '');
                      }}
                      disabled={savingUsername}
                    >
                      <Text style={styles.usernameCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.usernameSave}
                      onPress={handleSaveUsername}
                      disabled={savingUsername}
                    >
                      {savingUsername ? (
                        <ActivityIndicator size="small" color={colors.background} />
                      ) : (
                        <Text style={styles.usernameSaveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.value}>
                  {username || `Player${user.id.substring(0, 6)}`}
                </Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.infoCard}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user.email || 'No email'}</Text>
            </View>

            {/* Sign-In Method */}
            <View style={styles.infoCard}>
              <Text style={styles.label}>Sign-In Method</Text>
              <Text style={styles.value}>{providerDisplay}</Text>
            </View>

            {/* Daily Training Reminder */}
            <DailyReminderCard reminderSettings={reminderSettings} />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Not signed in</Text>
          </View>
        )}

        {/* Show action buttons based on authentication status */}
        {user ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnSignOut}
              onPress={handleSignOut}
            >
              <Text style={styles.btnSignOutText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnDelete}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.btnDeleteText}>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnSignIn}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.btnSignInText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  header: { marginBottom: 32 },
  title: { color: colors.foreground, fontSize: 32, fontWeight: '800' },
  subtitle: { color: colors.textSubtle, marginTop: 8, textAlign: 'center' },
  section: { marginBottom: 32 },
  infoCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
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
  statValue: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
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
  progressLabel: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  progressText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  usernameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  editButton: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  usernameEdit: {
    marginTop: 8,
  },
  usernameInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.foreground,
    fontSize: 16,
    marginBottom: 12,
  },
  usernameActions: {
    flexDirection: 'row',
    gap: 12,
  },
  usernameCancel: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  usernameCancelText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  usernameSave: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  usernameSaveText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  label: { color: colors.textSubtle, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  value: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  actions: { marginTop: 20 },
  btnSignOut: {
    backgroundColor: '#333',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnSignOutText: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  btnDelete: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#dc2626',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeleteText: { color: '#dc2626', fontWeight: '700', fontSize: 16 },
  btnSignIn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSignInText: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  statsTabsContainer: {
    marginBottom: 12,
  },
  statsTabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  statsTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  statsTabActive: {
    backgroundColor: colors.primary,
  },
  statsTabText: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: '600',
  },
  statsTabTextActive: {
    color: colors.background,
  },
  statsContent: {
    minHeight: 400,
  },
});
