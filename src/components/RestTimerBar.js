import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/colors';
import { useRestTimer } from '../contexts/RestTimerContext';

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Countdown bar shown while resting, and a "rest over" prompt at 0:00.
// `floating` positions it over the screen (app root); otherwise it sits inline (in popups).
const RestTimerBar = ({ floating = false }) => {
  const timer = useRestTimer();
  if (!timer || (!timer.running && !timer.finished)) return null;
  const { running, finished, remaining, duration, adjust, stop } = timer;
  const progress = duration ? Math.min(1, Math.max(0, remaining / duration)) : 0;

  return (
    <View style={[s.bar, floating && s.floating, finished && s.barFinished]}>
      {finished ? (
        <>
          <Ionicons name="alarm-outline" size={20} color={Colors.onPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: Colors.onPrimary }]}>Rest over</Text>
            <Text style={[s.sub, { color: Colors.onPrimary }]}>Start your next set</Text>
          </View>
          <TouchableOpacity onPress={stop} style={s.dismissBtn}>
            <Text style={s.dismissText}>OK</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={s.timeBlock}>
            <Text style={s.label}>REST</Text>
            <Text style={s.time}>{fmt(remaining)}</Text>
          </View>
          <View style={s.controls}>
            <TouchableOpacity style={s.chip} onPress={() => adjust(-15)}><Text style={s.chipText}>−15s</Text></TouchableOpacity>
            <TouchableOpacity style={s.chip} onPress={() => adjust(15)}><Text style={s.chipText}>+15s</Text></TouchableOpacity>
            <TouchableOpacity style={[s.chip, s.skipChip]} onPress={stop}><Text style={[s.chipText, { color: Colors.onPrimary }]}>Skip</Text></TouchableOpacity>
          </View>
          {running && <View style={[s.progress, { width: `${progress * 100}%` }]} />}
        </>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, overflow: 'hidden',
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.primary, marginBottom: 12,
  },
  floating: { position: 'absolute', left: 12, right: 12, bottom: 96, zIndex: 900, marginBottom: 0 },
  barFinished: { backgroundColor: Colors.primary },
  timeBlock: { minWidth: 70 },
  label: { fontSize: 10, color: Colors.gray, fontWeight: '700', letterSpacing: 1 },
  time: { fontSize: 26, fontWeight: '800', color: Colors.text, fontVariant: ['tabular-nums'] },
  controls: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.darkGray },
  skipChip: { backgroundColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  progress: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: Colors.primary },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 1, opacity: 0.8 },
  dismissBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: Colors.onPrimary },
  dismissText: { color: Colors.primary, fontWeight: '800', fontSize: 14 },
});

export default RestTimerBar;
