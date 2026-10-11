import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline } from 'react-native-svg';
import { subscribeToHeartRate } from '../services/WatchHeartRateService';
import { Colors } from '../constants/colors';

const MAX_HISTORY = 60;
const CARD_INNER_W = Dimensions.get('window').width - 36 - 32; // marginHorizontal 18*2, padding 16*2

export default function HeartRateCard() {
  const [bpm, setBpm] = useState(null);
  const [zone, setZone] = useState(null);
  const [connected, setConnected] = useState(false);
  const [hrHistory, setHrHistory] = useState([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToHeartRate((newBpm, newZone) => {
      setBpm(newBpm);
      setZone(newZone);
      setConnected(true);
      setHrHistory(prev => {
        const next = [...prev, newBpm];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
      pulse();
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setConnected(false), 5000);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const pulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const zoneColor = zone?.color || Colors.gray;
  const hasHistory = hrHistory.length >= 2;

  const sparklinePoints = (() => {
    if (!hasHistory) return '';
    const W = CARD_INNER_W; const H = 40; const PAD = 3;
    const min = Math.min(...hrHistory) - 5;
    const max = Math.max(...hrHistory) + 5;
    const range = max - min || 1;
    const w = W - PAD * 2; const h = H - PAD * 2;
    return hrHistory.map((v, i) => {
      const x = PAD + (i / (hrHistory.length - 1)) * w;
      const y = PAD + h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  })();

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.left}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="heart" size={20} color={connected ? zoneColor : Colors.gray} />
          </Animated.View>
          <View>
            <Text style={styles.label}>HEART RATE</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.bpm, { color: connected ? '#FFFFFF' : Colors.gray }]}>
                {bpm ?? '—'}
              </Text>
              <Text style={styles.unit}> bpm</Text>
            </View>
          </View>
        </View>
        <View style={styles.right}>
          {connected && zone ? (
            <View style={[styles.zoneBadge, { backgroundColor: zoneColor + '28' }]}>
              <Text style={[styles.zoneText, { color: zoneColor }]}>
                Z{zone.zone} {zone.label}
              </Text>
            </View>
          ) : (
            <View style={styles.watchRow}>
              <Ionicons name="watch-outline" size={13} color={Colors.gray} />
              <Text style={styles.noSignal}>No signal</Text>
            </View>
          )}
        </View>
      </View>

      {hasHistory && (
        <View style={styles.sparklineContainer}>
          <Svg width={CARD_INNER_W} height={44} viewBox={`0 0 ${CARD_INNER_W} 40`}>
            <Polyline
              points={sparklinePoints}
              fill="none"
              stroke={connected ? zoneColor : Colors.gray}
              strokeWidth={1.5}
              strokeOpacity={0.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.sparklineFooter}>
            <Text style={styles.sparklineLabel}>Today's trend</Text>
            <Text style={styles.sparklineLabel}>{hrHistory.length} readings</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 18, marginBottom: 12,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor,
  },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label:    { fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.8, marginBottom: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  bpm:      { fontSize: 28, fontWeight: '800' },
  unit:     { fontSize: 12, color: Colors.gray, fontWeight: '500' },
  right:    { alignItems: 'flex-end' },
  zoneBadge:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  zoneText:   { fontSize: 12, fontWeight: '700' },
  watchRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noSignal:   { fontSize: 12, color: Colors.gray },

  sparklineContainer: { marginTop: 12 },
  sparklineFooter: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 4,
  },
  sparklineLabel: { fontSize: 10, color: Colors.gray, fontWeight: '500' },
});
