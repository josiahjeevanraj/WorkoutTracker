import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCurrentUserId } from '../services/StorageService';

// Where supabase-js keeps the session (sb-<project ref>-auth-token)
const SESSION_KEY = (() => {
  try { return `sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`; } catch { return null; }
})();

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let confirmed = false;
    // Open the app immediately from the saved session; getSession() below may need
    // a network refresh first (after ~1h away), and replaces this when it resolves.
    if (SESSION_KEY) {
      AsyncStorage.getItem(SESSION_KEY).then(raw => {
        if (confirmed || !raw) return;
        const saved = JSON.parse(raw);
        const stored = saved?.user ? saved : saved?.currentSession;
        if (!stored?.user) return;
        setCurrentUserId(stored.user.id);
        setSession(stored);
        setLoading(false);
      }).catch(() => {});
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      confirmed = true;
      setCurrentUserId(session?.user?.id ?? null);
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
