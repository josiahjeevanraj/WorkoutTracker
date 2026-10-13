import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

// Known flags: 'weight', 'meals'. Everything is enabled unless the signed-in
// user has a feature_flags row with enabled = false.
const FeatureFlagsContext = createContext({ disabled: new Set(), ready: true });

export const FeatureFlagsProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState({ disabled: new Set(), ready: false });

  useEffect(() => {
    if (!user) { setState({ disabled: new Set(), ready: true }); return; }
    let active = true;
    setState(s => ({ ...s, ready: false }));
    supabase
      .from('feature_flags')
      .select('flag, enabled')
      .then(({ data, error }) => {
        if (!active) return;
        // On error (e.g. table not created yet) fall back to everything enabled
        if (error) console.error('Error loading feature flags:', error);
        const disabled = new Set((data || []).filter(r => !r.enabled).map(r => r.flag));
        setState({ disabled, ready: true });
      });
    return () => { active = false; };
  }, [user?.id]);

  return <FeatureFlagsContext.Provider value={state}>{children}</FeatureFlagsContext.Provider>;
};

export const useFeatureFlagsReady = () => useContext(FeatureFlagsContext).ready;

export const useFeature = flag => !useContext(FeatureFlagsContext).disabled.has(flag);
