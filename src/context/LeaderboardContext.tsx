import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string | null;
  total_xp: number;
  weekly_xp: number;
  level: number;
  rank?: number; // Calculated rank in leaderboard
}

interface LeaderboardData {
  allTime: UserProfile[];
  weekly: UserProfile[];
  currentUser?: UserProfile;
}

interface LeaderboardContextType {
  data: LeaderboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  subscribeToUpdates: (enabled: boolean) => void;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(undefined);

export function LeaderboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);

  /**
   * Fetch leaderboard data from Supabase
   */
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch all-time leaderboard (top 100)
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('user_profiles')
        .select('id, username, total_xp, weekly_xp, level')
        .order('total_xp', { ascending: false })
        .limit(100);

      if (allTimeError) throw allTimeError;

      // Fetch weekly leaderboard (top 100)
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('user_profiles')
        .select('id, username, total_xp, weekly_xp, level')
        .order('weekly_xp', { ascending: false })
        .limit(100);

      if (weeklyError) throw weeklyError;

      // Get current user's profile
      let currentUserProfile: UserProfile | undefined;
      if (user) {
        const { data: userProfile, error: userError } = await supabase
          .from('user_profiles')
          .select('id, username, total_xp, weekly_xp, level')
          .eq('id', user.id)
          .single();

        if (!userError && userProfile) {
          currentUserProfile = userProfile;
        }
      }

      // Add ranks to leaderboard data
      const allTimeWithRanks = (allTimeData || []).map((profile, index) => ({
        ...profile,
        rank: index + 1,
      }));

      const weeklyWithRanks = (weeklyData || []).map((profile, index) => ({
        ...profile,
        rank: index + 1,
      }));

      // Calculate current user's rank if not in top 100
      if (currentUserProfile) {
        const allTimeRank = allTimeWithRanks.findIndex(p => p.id === currentUserProfile.id);
        const weeklyRank = weeklyWithRanks.findIndex(p => p.id === currentUserProfile.id);

        if (allTimeRank === -1) {
          // User not in top 100, calculate their actual rank
          const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gt('total_xp', currentUserProfile.total_xp);

          currentUserProfile.rank = (count || 0) + 1;
        } else {
          currentUserProfile.rank = allTimeRank + 1;
        }
      }

      setData({
        allTime: allTimeWithRanks,
        weekly: weeklyWithRanks,
        currentUser: currentUserProfile,
      });
    } catch (err: any) {
      console.error('[LeaderboardContext] Fetch error:', err);
      setError(err.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refetch leaderboard data (pull-to-refresh)
   */
  const refetch = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  /**
   * Invalidate cache and clear data
   */
  const invalidateCache = useCallback(() => {
    // console.log('[LeaderboardContext] Cache invalidated');
    setData(null);
  }, []);

  /**
   * Optimistically update current user's profile in cache
   */
  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setData(prevData => {
      if (!prevData?.currentUser) return prevData;

      const updatedUser = { ...prevData.currentUser, ...updates };

      // Update user in all-time leaderboard
      const allTimeIndex = prevData.allTime.findIndex(p => p.id === updatedUser.id);
      const newAllTime = [...prevData.allTime];
      if (allTimeIndex !== -1) {
        newAllTime[allTimeIndex] = { ...newAllTime[allTimeIndex], ...updates };
      }

      // Update user in weekly leaderboard
      const weeklyIndex = prevData.weekly.findIndex(p => p.id === updatedUser.id);
      const newWeekly = [...prevData.weekly];
      if (weeklyIndex !== -1) {
        newWeekly[weeklyIndex] = { ...newWeekly[weeklyIndex], ...updates };
      }

      return {
        ...prevData,
        currentUser: updatedUser,
        allTime: newAllTime,
        weekly: newWeekly,
      };
    });
  }, []);

  /**
   * Subscribe/unsubscribe to real-time updates
   */
  const subscribeToUpdates = useCallback((enabled: boolean) => {
    if (enabled && !subscription) {
      // console.log('[LeaderboardContext] Subscribing to real-time updates');

      const channel = supabase
        .channel('leaderboard_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
          },
          (payload) => {
            // console.log('[LeaderboardContext] Real-time update received:', payload);
            // Refetch to get updated rankings
            fetchLeaderboard();
          }
        )
        .subscribe();

      setSubscription(channel);
    } else if (!enabled && subscription) {
      // console.log('[LeaderboardContext] Unsubscribing from real-time updates');
      subscription.unsubscribe();
      setSubscription(null);
    }
  }, [subscription, fetchLeaderboard]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [subscription]);

  const value: LeaderboardContextType = {
    data,
    loading,
    error,
    refetch,
    invalidateCache,
    updateUserProfile,
    subscribeToUpdates,
  };

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useLeaderboard() {
  const context = useContext(LeaderboardContext);
  if (context === undefined) {
    throw new Error('useLeaderboard must be used within a LeaderboardProvider');
  }
  return context;
}
