import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TrainingSession {
  id: string;
  user_id: string;
  opening_name: string;
  variation_name?: string;
  opening_category?: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  total_moves: number;
  mistakes_count: number;
  score: number;
  completed: boolean;
}

interface DailyStats {
  training_date: string;
  sessions_count: number;
  total_duration_seconds: number;
  total_mistakes: number;
  completed_count: number;
  openings_practiced: string[];
}

interface VariationStats {
  opening_name: string;
  variation_name: string;
  total_sessions: number;
  completed_sessions: number;
  total_mistakes: number;
  average_duration: number;
  best_score: number;
}

interface TrainingContextType {
  // Current session
  currentSession: TrainingSession | null;
  startSession: (opening: string, variation?: string, category?: string) => Promise<string>;
  endSession: (sessionId: string, moves: number, mistakes: number, score: number) => Promise<void>;

  // Statistics
  streak: number;
  dailyStats: DailyStats[];
  variationStats: VariationStats[];
  totalMinutes: number;

  // Loading state
  isLoading: boolean;

  // Refresh data
  refreshStats: () => Promise<void>;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<TrainingSession | null>(null);
  const [streak, setStreak] = useState(0);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [variationStats, setVariationStats] = useState<VariationStats[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load user statistics on mount
   */
  useEffect(() => {
    if (user) {
      refreshStats();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Refresh all statistics
   */
  const refreshStats = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch streak
      const { data: streakData, error: streakError } = await supabase
        .rpc('get_user_streak', { p_user_id: user.id });

      if (!streakError && streakData !== null) {
        setStreak(streakData);
      }

      // Fetch daily stats (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_training_stats')
        .select('*')
        .eq('user_id', user.id)
        .gte('training_date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('training_date', { ascending: false });

      if (!dailyError && dailyData) {
        setDailyStats(dailyData);

        // Calculate total minutes
        const total = dailyData.reduce((sum, day) => sum + (day.total_duration_seconds || 0), 0);
        setTotalMinutes(Math.floor(total / 60));
      }

      // Fetch variation stats
      const { data: sessionData, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('started_at', { ascending: false });

      if (!sessionError && sessionData) {
        // Group by variation
        const statsMap = new Map<string, any>();

        sessionData.forEach((session: TrainingSession) => {
          const key = `${session.opening_name}::${session.variation_name || 'Unknown'}`;

          if (!statsMap.has(key)) {
            statsMap.set(key, {
              opening_name: session.opening_name,
              variation_name: session.variation_name || 'Unknown',
              total_sessions: 0,
              completed_sessions: 0,
              total_mistakes: 0,
              total_duration: 0,
              best_score: 0,
            });
          }

          const stats = statsMap.get(key);
          stats.total_sessions++;
          if (session.completed) stats.completed_sessions++;
          stats.total_mistakes += session.mistakes_count || 0;
          stats.total_duration += session.duration_seconds || 0;
          stats.best_score = Math.max(stats.best_score, session.score || 0);
        });

        const varStats: VariationStats[] = Array.from(statsMap.values()).map(s => ({
          ...s,
          average_duration: s.total_sessions > 0 ? Math.floor(s.total_duration / s.total_sessions) : 0,
        }));

        setVariationStats(varStats);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('[Training] Error refreshing stats:', error);
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Start a new training session
   */
  const startSession = useCallback(async (
    opening: string,
    variation?: string,
    category?: string
  ): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          opening_name: opening,
          variation_name: variation,
          opening_category: category,
          started_at: new Date().toISOString(),
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      return data.id;
    } catch (error) {
      console.error('[Training] Error starting session:', error);
      throw error;
    }
  }, [user]);

  /**
   * End a training session
   */
  const endSession = useCallback(async (
    sessionId: string,
    moves: number,
    mistakes: number,
    score: number
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('training_sessions')
        .update({
          completed_at: new Date().toISOString(),
          total_moves: moves,
          mistakes_count: mistakes,
          score: score,
          completed: true,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentSession(null);

      // Refresh stats after completing session
      await refreshStats();
    } catch (error) {
      console.error('[Training] Error ending session:', error);
      throw error;
    }
  }, [user, refreshStats]);

  const value: TrainingContextType = {
    currentSession,
    startSession,
    endSession,
    streak,
    dailyStats,
    variationStats,
    totalMinutes,
    isLoading,
    refreshStats,
  };

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}
