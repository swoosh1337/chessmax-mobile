import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { setAuth as setClientAuth } from '../api/apiClient';
import { signOut as authSignOut } from '../utils/auth';
import { signInWithGoogle } from '../lib/googleAuth';
import { signInWithApple } from '../lib/appleAuth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize: Check for existing session
  useEffect(() => {
    // console.log('[AuthContext] Initializing...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('[AuthContext] Initial session:', session ? 'Found' : 'None');
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
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // console.log('[AuthContext] Auth state changed:', _event, session ? 'Session active' : 'No session');
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
      // console.log('[AuthContext] Starting Google sign-in...');
      await signInWithGoogle();
    } catch (error) {
      console.error('[AuthContext] Google sign-in failed:', error);
      throw error;
    }
  };

  const handleAppleSignIn = async () => {
    try {
      // console.log('[AuthContext] Starting Apple sign-in...');
      await signInWithApple();
    } catch (error) {
      console.error('[AuthContext] Apple sign-in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    // console.log('[AuthContext] Signing out...');
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

