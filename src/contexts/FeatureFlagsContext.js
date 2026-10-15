import React, { createContext, useContext, useEffect, useState } from 'react';
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
    setState(s => ({ ...s, ready: false }));
    supabase
      .from('feature_flags')
      .select('flag, enabled')
      .then(({ data, error }) => {
        if (!active) return;
        // On error (e.g. table not created yet) fall back to everything enabled
        if (error) console.error('Error loading feature flags:', error);
        const rows = data || [];
        const disabled = new Set(rows.filter(r => !r.enabled).map(r => r.flag));
        const enabled = new Set(rows.filter(r => r.enabled).map(r => r.flag));
        setState({ disabled, enabled, ready: true });
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
