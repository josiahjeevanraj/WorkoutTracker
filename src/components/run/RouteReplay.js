import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/colors';
import { cumulativeDistances, formatDuration } from '../../utils/geo';
import { convertDistance, formatPace } from '../../utils/cardio';
import RouteMap from './RouteMap';

// A whole run replays in about this long at 1×
const BASE_REPLAY_MS = 20000;
const SPEEDS = [1, 2, 4];

// Strava-style replay: a marker retraces the run and the route draws in behind it,
// with time, distance and pace at that point of the run.
const RouteReplay = ({ points, title, distUnit = 'km', onClose }) => {
  const { height: windowHeight } = useWindowDimensions();
  const [progress, setProgress] = useState(0); // 0..1 of the run's active time
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const progressRef = useRef(0);

  const cum = useMemo(() => cumulativeDistances(points), [points]);
  const totalMs = points[points.length - 1]?.[2] || 1;

  // Advance with the clock while playing
  useEffect(() => {
    if (!playing) return;
    let raf;
    let last = performance.now();
    const step = now => {
      const next = Math.min(1, progressRef.current + ((now - last) * speed) / BASE_REPLAY_MS);
      last = now;
      progressRef.current = next;
      setProgress(next);
      if (next < 1) raf = requestAnimationFrame(step); else setPlaying(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // Position at the current time: last point reached plus the interpolated head
  const t = progress * totalMs;
  let i = points.findIndex(p => p[2] > t);
  if (i === -1) i = points.length;
  const shown = points.slice(0, Math.max(1, i));
  let head = shown[shown.length - 1];
  let metres = cum[Math.max(0, i - 1)];
  if (i > 0 && i < points.length && points[i][4] === points[i - 1][4]) {
    const a = points[i - 1], b = points[i];
    const f = (t - a[2]) / (b[2] - a[2] || 1);
    head = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, t, null, a[4]];
    shown.push(head);
    metres += (cum[i] - cum[i - 1]) * f;
  }
  const distance = convertDistance(metres / 1000, 'km', distUnit);
  const pace = distance > 0.01 ? t / 60000 / distance : null;

  const restart = () => { progressRef.current = 0; setProgress(0); setPlaying(true); };
  const togglePlay = () => {
    if (progress >= 1) return restart();
    setPlaying(p => !p);
  };

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={s.screen}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>REPLAY</Text>
            <Text style={s.title} numberOfLines={1}>{title || 'Outdoor Run'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.gray} />
          </TouchableOpacity>
        </View>

        <RouteMap points={shown} guide={points} marker={head} height={Math.max(280, windowHeight * 0.55)} interactive />

        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.label}>TIME</Text>
            <Text style={s.value}>{formatDuration(t / 1000)}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.label}>DISTANCE</Text>
            <Text style={s.value}>{distance.toFixed(2)} <Text style={s.unit}>{distUnit}</Text></Text>
          </View>
          <View style={s.stat}>
            <Text style={s.label}>PACE</Text>
            <Text style={s.value}>{pace ? formatPace(pace) : '—'} <Text style={s.unit}>/{distUnit}</Text></Text>
          </View>
        </View>

        <View style={s.track}>
          <View style={[s.trackFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={s.controls}>
          <TouchableOpacity style={s.ctrlBtn} onPress={restart}>
            <Ionicons name="play-skip-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[s.ctrlBtn, s.playBtn]} onPress={togglePlay}>
            <Ionicons name={playing ? 'pause' : 'play'} size={26} color={Colors.onCardio} />
          </TouchableOpacity>
          <View style={s.speeds}>
            {SPEEDS.map(sp => (
              <TouchableOpacity key={sp} style={[s.speedChip, speed === sp && s.speedChipActive]} onPress={() => setSpeed(sp)}>
                <Text style={[s.speedText, speed === sp && { color: Colors.onCardio }]}>{sp}×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.cardio, letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  closeBtn: { padding: 4 },
  stats: { flexDirection: 'row', marginTop: 18 },
  stat: { flex: 1, alignItems: 'center' },
  label: { fontSize: 11, color: Colors.gray, fontWeight: '700', letterSpacing: 1 },
  value: { fontSize: 24, fontWeight: '800', color: Colors.cardio, marginTop: 4, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 12, color: Colors.gray, fontWeight: '600' },
  track: { height: 4, borderRadius: 2, backgroundColor: Colors.borderColor, marginTop: 20, overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: Colors.cardio },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 'auto' },
  ctrlBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.darkGray, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.cardio },
  speeds: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  speedChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: Colors.darkGray },
  speedChipActive: { backgroundColor: Colors.cardio },
  speedText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});

export default RouteReplay;
