import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

// Known flags:
//   'weight', 'meals'  — on by default; a row with enabled = false turns them off
//   'outdoorRuns'      — off by default (beta); a row with enabled = true turns it on
const DEFAULT_OFF = new Set(['outdoorRuns']);

const FeatureFlagsContext = createContext({ disabled: new Set(), enabled: new Set(), ready: true });

export const FeatureFlagsProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState({ disabled: new Set(), enabled: new Set(), ready: false });

  useEffect(() => {
    if (!user) { setState({ disabled: new Set(), enabled: new Set(), ready: true }); return; }
    let active = true;
    const cacheKey = `featureFlags:${user.id}`;
    const apply = rows => setState({
      disabled: new Set(rows.filter(r => !r.enabled).map(r => r.flag)),
      enabled: new Set(rows.filter(r => r.enabled).map(r => r.flag)),
      ready: true,
    });
    setState(s => ({ ...s, ready: false }));
    // Start from this device's last known flags so the app opens without waiting
    // on the network; only a first sign-in waits for the server
    AsyncStorage.getItem(cacheKey)
      .then(cached => { if (active && cached) apply(JSON.parse(cached)); })
      .catch(() => {});
    supabase
      .from('feature_flags')
      .select('flag, enabled')
      .then(({ data, error }) => {
        if (!active) return;
        // On error (e.g. table not created yet) fall back to everything enabled
        if (error) console.error('Error loading feature flags:', error);
        const rows = data || [];
        apply(rows);
        if (!error) AsyncStorage.setItem(cacheKey, JSON.stringify(rows)).catch(() => {});
      });
    return () => { active = false; };
  }, [user?.id]);

  return <FeatureFlagsContext.Provider value={state}>{children}</FeatureFlagsContext.Provider>;
};

export const useFeatureFlagsReady = () => useContext(FeatureFlagsContext).ready;

export const useFeature = flag => {
  const { disabled, enabled } = useContext(FeatureFlagsContext);
  return DEFAULT_OFF.has(flag) ? enabled.has(flag) : !disabled.has(flag);
};
