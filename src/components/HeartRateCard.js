import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToHeartRate } from '../services/WatchHeartRateService';
import { Colors } from '../constants/colors';

export default function HeartRateCard() {
  const [bpm, setBpm] = useState(null);
  const [zone, setZone] = useState(null);
  const [connected, setConnected] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToHeartRate((newBpm, newZone) => {
      setBpm(newBpm);
      setZone(newZone);
      setConnected(true);
      pulse();

      // Mark disconnected if no update for 5s
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

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons
            name="heart"
            size={20}
            color={connected ? zoneColor : Colors.gray}
          />
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
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
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
});
