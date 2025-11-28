import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { colors } from '@/src/theme/colors';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useLeaderboard } from '@/src/context/LeaderboardContext';
import { useSubscription } from '@/src/context/SubscriptionContext';
import { useTraining } from '@/src/context/TrainingContext';
import { formatXP, getLevelProgress } from '@/src/utils/xp';
import TrainingCalendar from '@/src/components/TrainingCalendar';
import TrainingStatistics from '@/src/components/TrainingStatistics';
import ProfileStatsSkeleton from '@/src/components/ProfileStatsSkeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboardingStorage, ratingStorage } from '@/src/utils/storage';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: leaderboardData, loading: loadingLeaderboard, refetch } = useLeaderboard();
  const { isPremium, products, isLoading: loadingSubscription } = useSubscription();
  const { streak, totalMinutes, isLoading: loadingTraining } = useTraining();
  const [deleting, setDeleting] = useState(false);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showStats, setShowStats] = useState<'calendar' | 'stats'>('calendar');
  const [cachedProfile, setCachedProfile] = useState<any>(null);

  // Get user profile from leaderboard data or cache
  const userProfile = leaderboardData?.currentUser || cachedProfile;

  // Combined loading state
  const isLoadingStats = loadingProfile || loadingLeaderboard;

  // Cache key for profile data
  const PROFILE_CACHE_KEY = `@profile_cache_${user?.id}`;

  // Load cached profile on mount
  useEffect(() => {
    if (user) {
      loadCachedProfile();
      loadUserProfile();
    }
  }, [user]);

  // Cache leaderboard data when it updates
  useEffect(() => {
    if (leaderboardData?.currentUser && user) {
      cacheProfile(leaderboardData.currentUser);
    }
  }, [leaderboardData?.currentUser, user]);

  const loadCachedProfile = async () => {
    if (!user) return;
    try {
      const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) {
        setCachedProfile(JSON.parse(cached));
      }
    } catch (error) {
      console.error('[Profile] Error loading cache:', error);
    }
  };

  const cacheProfile = async (profile: any) => {
    if (!user) return;
    try {
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
      setCachedProfile(profile);
    } catch (error) {
      console.error('[Profile] Error saving cache:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;

    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, total_xp, weekly_xp, level')
        .eq('id', user.id)
        .single();

      if (error) {
        // Profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              username: null,
              total_xp: 0,
              weekly_xp: 0,
              level: 1,
              seen_onboarding: false,
              paywall_seen: false,
            });

          if (createError) {
            console.error('[Profile] Error creating profile:', createError);
          } else {
            // Profile created successfully, refetch leaderboard
            refetch();
          }
        }
        return;
      }

      if (data) {
        setUsername(data.username || '');
      }
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!user) return;

    // Validate username
    if (username.length < 3 || username.length > 20) {
      Alert.alert('Invalid Username', 'Username must be between 3 and 20 characters');
      return;
    }

    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ username })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          Alert.alert('Username Taken', 'This username is already taken. Please choose another one.');
        } else {
          Alert.alert('Error', 'Failed to update username. Please try again.');
        }
        console.error('[Profile] Error updating username:', error);
        return;
      }

      setEditingUsername(false);
      Alert.alert('Success', 'Username updated successfully!');

      // Refetch leaderboard to update cache
      refetch();
    } catch (error) {
      console.error('[Profile] Error saving username:', error);
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
              // IMPORTANT: Delete account FIRST while still authenticated
              // The SQL function requires authentication to work
              const { error } = await supabase.rpc('delete_user_account');

              if (error) {
                throw error;
              }

              // After successful deletion, clear local storage (rating data, etc.)
              // Note: onboarding status is stored in Supabase and will be deleted with the account
              // so we don't need to clear it separately
              try {
                await ratingStorage.resetRatingData();
                // Clear all AsyncStorage data for this app (comprehensive cleanup)
                await AsyncStorage.clear();
              } catch (storageError) {
                // Log but don't fail - account is already deleted
                console.warn('Error clearing local storage:', storageError);
              }

              // Sign out after successful deletion
              await signOut();
              router.replace('/auth');

              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            } catch (error: any) {
              console.error('Delete account error:', error);
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
            {isLoadingStats && !cachedProfile ? (
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
                    <Text style={styles.statValue}>🔥 {loadingTraining ? '-' : streak}</Text>
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
                <View style={[styles.subscriptionCard, isPremium && styles.subscriptionCardPremium]}>
                  <View style={styles.subscriptionHeader}>
                    <Text style={styles.subscriptionTitle}>
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
                      <Text style={styles.subscriptionDescription}>
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
                        <View style={styles.subscriptionDetails}>
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
                        <View style={styles.subscriptionDetails}>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Access</Text>
                            <Text style={styles.detailValue}>First 3 openings (all levels)</Text>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </>
            ) : null}

            {/* Training Stats Tabs - Always show, even when userProfile is loading */}
            {/* The TrainingStatistics component handles its own loading state */}
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
                  <TrainingCalendar />
                ) : (
                  <TrainingStatistics />
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
                        loadUserProfile(); // Reset to original
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

            {/* User ID */}
            <View style={styles.infoCard}>
              <Text style={styles.label}>User ID</Text>
              <Text style={styles.valueSmall}>{user.id}</Text>
            </View>
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
            {/* Guest users: Only show Sign In button */}
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
  subscriptionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subscriptionCardPremium: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionTitle: {
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
  subscriptionDescription: {
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
  subscriptionDetails: {
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
  valueSmall: { color: colors.foreground, fontSize: 12, fontFamily: 'monospace' },
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
  btnGetPremium: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnGetPremiumText: { color: colors.background, fontWeight: '700', fontSize: 16 },
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
  loadingText: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});

