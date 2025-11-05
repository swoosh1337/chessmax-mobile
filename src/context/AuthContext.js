import React, { createContext, useContext, useMemo, useState } from 'react';
import { setAuth as setClientAuth } from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // For demo, keep user in memory; integrate real Google sign-in later
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // { google_id?, sub?, name? }

  const signInWithToken = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setClientAuth({ token: nextToken, user: nextUser });
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    setClientAuth({ token: null, user: null });
  };

  const value = useMemo(() => ({ token, user, signInWithToken, signOut }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

