import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/colors';

// Web only: each production build has a content-hashed bundle name, so a different
// bundle path in the live index.html means a new version has been deployed.
const BUNDLE_RE = /\/_expo\/static\/js\/web\/[^"'\s]+\.js/;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

const runningBundle = () => {
  if (typeof document === 'undefined') return null;
  const script = [...document.querySelectorAll('script[src]')].find(s => BUNDLE_RE.test(s.getAttribute('src')));
  return script ? script.getAttribute('src').match(BUNDLE_RE)[0] : null;
};

const UpdateBanner = () => {
  const insets = useSafeAreaInsets();
  const [latestBundle, setLatestBundle] = useState(null);
  const [dismissed, setDismissed] = useState(null); // bundle the user closed the banner for
  const current = useRef(Platform.OS === 'web' ? runningBundle() : null).current;

  useEffect(() => {
    // Dev server bundles aren't hashed, so there's nothing to compare against
    if (!current) return;

    const check = async () => {
      try {
        const res = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const match = (await res.text()).match(BUNDLE_RE);
        if (match && match[0] !== current) setLatestBundle(match[0]);
      } catch {
        // Offline or transient error: try again on the next trigger
      }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      clearInterval(interval);
    };
  }, [current]);

  if (!latestBundle || latestBundle === dismissed) return null;

  return (
    <View style={[s.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <TouchableOpacity style={s.banner} onPress={() => window.location.reload()} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color={Colors.onPrimary} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>New version available</Text>
          <Text style={s.sub}>Tap to update</Text>
        </View>
        <TouchableOpacity onPress={() => setDismissed(latestBundle)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={Colors.onPrimary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 1000 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: Colors.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 14, fontWeight: '700', color: Colors.onPrimary },
  sub: { fontSize: 12, color: Colors.onPrimary, opacity: 0.75, marginTop: 1 },
});

export default UpdateBanner;
