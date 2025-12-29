import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { setAuth as setClientAuth } from '../api/apiClient';
import { signOut as authSignOut } from '../utils/auth';
import { signInWithGoogle } from '../lib/googleAuth';
import { signInWithApple } from '../lib/appleAuth';
import { createLogger } from '../utils/logger';
import type { Session, User } from '@supabase/supabase-js';

const log = createLogger('AuthContext');

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize: Check for existing session
  useEffect(() => {
    log.debug('Initializing auth context');

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          log.warn('Session error', { message: error.message });
          // Clear invalid session
          setSession(null);
          setUser(null);
          setClientAuth({ token: null, user: null });
          setLoading(false);
          return;
        }

        log.debug('Initial session', { hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update API client with session
        if (session) {
          setClientAuth({
            token: session.access_token,
            user: session.user,
          });
        }
      })
      .catch((error) => {
        log.error('Critical session error', error);
        // Clear invalid session on any error
        setSession(null);
        setUser(null);
        setClientAuth({ token: null, user: null });
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      log.debug('Auth state changed', { event, hasSession: !!session });

      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        log.warn('Token refresh failed, clearing session');
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Update API client
      if (session) {
        setClientAuth({
          token: session.access_token,
          user: session.user,
        });
      } else {
        setClientAuth({ token: null, user: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      log.debug('Starting Google sign-in');
      await signInWithGoogle();
    } catch (error) {
      log.error('Google sign-in failed', error);
      throw error;
    }
  };

  const handleAppleSignIn = async () => {
    try {
      log.debug('Starting Apple sign-in');
      await signInWithApple();
    } catch (error) {
      log.error('Apple sign-in failed', error);
      throw error;
    }
  };

  const signOut = async () => {
    log.info('Signing out');
    await authSignOut();
    setSession(null);
    setUser(null);
    setClientAuth({ token: null, user: null });
  };

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      signOut,
      signInWithGoogle: handleGoogleSignIn,
      signInWithApple: handleAppleSignIn,
      isAuthenticated: !!session,
    }),
    [session, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
