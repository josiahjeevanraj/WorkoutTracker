import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Svg, {
  Circle, Path, Defs, Stop,
  LinearGradient as SvgGradient,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_W = SCREEN_WIDTH - 36;

// ─── Activity ring ────────────────────────────────────────────────────────────
const ActivityRing = ({ progress = 0.78 }) => {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <Svg width={76} height={76} viewBox="0 0 76 76">
      <Defs>
        <SvgGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={Colors.text} />
          <Stop offset="100%" stopColor={Colors.indigo} />
        </SvgGradient>
      </Defs>
      <Circle cx={38} cy={38} r={r} fill="none" stroke="rgba(88,216,219,0.12)" strokeWidth={7} />
      <Circle
        cx={38} cy={38} r={r}
        fill="none" stroke="url(#ringG)" strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        rotation={-90} originX={38} originY={38}
      />
      <SvgText x={38} y={43} textAnchor="middle" fontSize={13} fontWeight="700" fill="#FFFFFF">
        {Math.round(progress * 100)}%
      </SvgText>
    </Svg>
  );
};

// ─── Mini area chart ──────────────────────────────────────────────────────────
const AreaChart = ({ data, labels }) => {
  if (!data || data.length < 2) return null;
  const VW = 300; const VH = 100; const PAD = 10;
  const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  const w = VW - PAD * 2; const h = VH - PAD * 2;
  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * w,
    y: PAD + h - ((v - min) / range) * h,
  }));
  const maxIdx = data.indexOf(max);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${VH} L ${pts[0].x.toFixed(1)} ${VH} Z`;

  return (
    <View>
      <Svg width={CHART_W} height={110} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.text} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={Colors.text} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d={area} fill="url(#areaG)" />
        <Path d={line} fill="none" stroke={Colors.text} strokeWidth={2.5} />
        <Circle cx={pts[maxIdx].x} cy={pts[maxIdx].y} r={5} fill={Colors.text} />
        <Circle cx={pts[maxIdx].x} cy={pts[maxIdx].y} r={10} fill={Colors.text} opacity={0.2} />
      </Svg>
      <View style={styles.chartLabels}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.chartLabel, i === maxIdx && styles.chartLabelActive]}>{l}</Text>
        ))}
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const [selectedMetric, setSelectedMetric] = useState('calories');
  const [timePeriod, setTimePeriod] = useState('week');

  const metrics = [
    { id: 'calories', label: 'Calories Burned', unit: 'kcal' },
    { id: 'weight', label: 'Body Weight', unit: 'kg' },
    { id: 'workouts', label: 'Workouts', unit: '' },
    { id: 'duration', label: 'Duration', unit: 'min' },
  ];

  const sampleData = {
    calories: {
      week:  { labels: ['M','T','W','T','F','S','S'], data: [420, 380, 450, 390, 480, 520, 410] },
      month: { labels: ['W1','W2','W3','W4'], data: [2850, 3100, 2950, 3200] },
      year:  { labels: ['J','F','M','A','M','J','J','A','S','O','N','D'], data: [12000,11500,13200,12800,14000,13500,14200,13800,12900,13100,12500,13000] },
      all:   { labels: ['2023','2024','2025'], data: [145000, 156000, 8500] },
    },
    weight: {
      week:  { labels: ['M','T','W','T','F','S','S'], data: [75.2,75.1,74.9,74.8,74.7,74.5,74.3] },
      month: { labels: ['W1','W2','W3','W4'], data: [75.2,74.8,74.5,74.1] },
      year:  { labels: ['J','F','M','A','M','J','J','A','S','O','N','D'], data: [78,77.5,77,76.5,76,75.8,75.5,75.2,74.9,74.6,74.3,74.1] },
      all:   { labels: ['2023','2024','2025'], data: [82, 78, 74.1] },
    },
    workouts: {
      week:  { labels: ['M','T','W','T','F','S','S'], data: [1,0,1,1,0,1,0] },
      month: { labels: ['W1','W2','W3','W4'], data: [4,5,4,3] },
      year:  { labels: ['J','F','M','A','M','J','J','A','S','O','N','D'], data: [18,16,20,19,22,21,20,18,17,19,16,18] },
      all:   { labels: ['2023','2024','2025'], data: [180, 234, 12] },
    },
    duration: {
      week:  { labels: ['M','T','W','T','F','S','S'], data: [45,0,60,30,0,75,0] },
      month: { labels: ['W1','W2','W3','W4'], data: [210,285,195,240] },
      year:  { labels: ['J','F','M','A','M','J','J','A','S','O','N','D'], data: [950,880,1020,980,1100,1050,990,920,870,960,840,910] },
      all:   { labels: ['2023','2024','2025'], data: [9200, 11500, 620] },
    },
  };

  const periodStats = {
    week:  { calories: '2,450', workouts: '4', weight: '74.1', minutes: '210' },
    month: { calories: '12,100', workouts: '16', weight: '74.1', minutes: '930' },
    year:  { calories: '156,500', workouts: '234', weight: '74.1', minutes: '11,470' },
    all:   { calories: '309,500', workouts: '426', weight: '74.1', minutes: '21,320' },
  };

  const currentStats = periodStats[timePeriod] || periodStats.week;
  const currentData = sampleData[selectedMetric]?.[timePeriod] || sampleData.calories.week;
  const currentMetric = metrics.find(m => m.id === selectedMetric);

  const bigNum = {
    calories:  { value: currentStats.calories, unit: 'kcal' },
    weight:    { value: currentStats.weight,   unit: 'kg' },
    workouts:  { value: currentStats.workouts, unit: 'sessions' },
    duration:  { value: currentStats.minutes,  unit: 'min' },
  }[selectedMetric];

  const today = new Date();
  const DAY = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()];
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][today.getMonth()];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerDate}>{DAY}, {MON} {today.getDate()}</Text>
          <Text style={styles.headerGreeting}>Hey, John</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>JD</Text>
        </View>
      </View>

      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>TODAY'S STREAK</Text>
            <View style={styles.heroStreakRow}>
              <Text style={styles.heroStreakNum}>12</Text>
              <Text style={styles.heroStreakUnit}> days</Text>
            </View>
          </View>
          <ActivityRing progress={0.78} />
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStatsRow}>
          {[
            { l: 'Calories', v: '420', sub: '/ 540' },
            { l: 'Active min', v: '52', sub: '/ 60' },
            { l: 'Workouts', v: '1', sub: '/ 1' },
          ].map((s, i) => (
            <View key={s.l} style={[styles.heroStatItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(88,216,219,0.15)' }]}>
              <Text style={styles.heroStatLabel}>{s.l.toUpperCase()}</Text>
              <View style={styles.heroStatValueRow}>
                <Text style={styles.heroStatValue}>{s.v}</Text>
                <Text style={styles.heroStatSub}> {s.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Period selector */}
      <View style={styles.periodSelector}>
        {['Week','Month','Year','All'].map((p, i) => {
          const id = ['week','month','year','all'][i];
          const active = timePeriod === id;
          return (
            <TouchableOpacity key={p} style={[styles.periodBtn, active && styles.periodBtnActive]} onPress={() => setTimePeriod(id)}>
              <Text style={[styles.periodBtnText, active && styles.periodBtnTextActive]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chart card */}
      <View style={styles.chartCard}>
        <View style={styles.chartCardTop}>
          <View>
            <Text style={styles.chartCardLabel}>{currentMetric.label.toUpperCase()}</Text>
            <View style={styles.chartCardValueRow}>
              <Text style={styles.chartCardBigValue}>{bigNum.value}</Text>
              {bigNum.unit ? <Text style={styles.chartCardUnit}> {bigNum.unit}</Text> : null}
            </View>
          </View>
          <View style={styles.trendBadge}>
            <Ionicons name="trending-up" size={12} color={Colors.green} />
            <Text style={styles.trendText}> +8.2%</Text>
          </View>
        </View>
        <AreaChart data={currentData.data} labels={currentData.labels} />
      </View>

      {/* Metric selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricScroll} contentContainerStyle={styles.metricScrollContent}>
        {metrics.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[styles.metricPill, selectedMetric === m.id && styles.metricPillActive]}
            onPress={() => setSelectedMetric(m.id)}
          >
            <Text style={[styles.metricPillText, selectedMetric === m.id && styles.metricPillTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* This week stats */}
      <View style={styles.weekSection}>
        <Text style={styles.weekSectionTitle}>THIS WEEK</Text>
        <View style={styles.weekGrid}>
          {[
            { l: 'Workouts',   v: '4',   unit: '',     sub: '+1 vs last',   accent: Colors.text },
            { l: 'Total time', v: '210', unit: 'min',  sub: '+25 vs last',  accent: Colors.indigo },
            { l: 'Avg HR',     v: '142', unit: 'bpm',  sub: '-3 vs last',   accent: Colors.softRed },
            { l: 'Volume',     v: '8.2', unit: 'k kg', sub: '+12% vs last', accent: Colors.green },
          ].map(s => (
            <View key={s.l} style={styles.weekStatCard}>
              <Text style={styles.weekStatLabel}>{s.l}</Text>
              <View style={styles.weekStatValueRow}>
                <Text style={styles.weekStatValue}>{s.v}</Text>
                {s.unit ? <Text style={styles.weekStatUnit}> {s.unit}</Text> : null}
              </View>
              <Text style={[styles.weekStatSub, { color: s.accent }]}>{s.sub}</Text>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8,
  },
  headerDate: { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  headerGreeting: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  avatar: {
    width: 40, height: 40, borderRadius: 999,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // Hero card
  heroCard: {
    marginHorizontal: 18, marginTop: 16, marginBottom: 12,
    padding: 18, borderRadius: 22,
    backgroundColor: 'rgba(88,216,219,0.08)',
    borderWidth: 1, borderColor: 'rgba(88,216,219,0.22)',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: 11, color: Colors.text, fontWeight: '600', letterSpacing: 1.2 },
  heroStreakRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  heroStreakNum: { fontSize: 44, fontWeight: '800', color: '#FFFFFF', lineHeight: 48 },
  heroStreakUnit: { fontSize: 16, color: Colors.textSecondary },
  heroDivider: { height: 1, backgroundColor: 'rgba(88,216,219,0.15)', marginVertical: 14 },
  heroStatsRow: { flexDirection: 'row' },
  heroStatItem: { flex: 1, paddingHorizontal: 10 },
  heroStatLabel: { fontSize: 10, color: Colors.gray, letterSpacing: 0.8, marginBottom: 4 },
  heroStatValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroStatValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  heroStatSub: { fontSize: 11, color: Colors.gray },

  // Period selector
  periodSelector: {
    flexDirection: 'row', marginHorizontal: 18, marginBottom: 14,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  periodBtnActive: { backgroundColor: Colors.background, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  periodBtnTextActive: { color: '#FFFFFF' },

  // Chart card
  chartCard: {
    marginHorizontal: 18, marginBottom: 12,
    padding: 18, backgroundColor: Colors.cardBackground,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor,
  },
  chartCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  chartCardLabel: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.6 },
  chartCardValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  chartCardBigValue: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  chartCardUnit: { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(52,211,153,0.12)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  trendText: { fontSize: 12, color: Colors.green, fontWeight: '600' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  chartLabel: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  chartLabelActive: { color: '#FFFFFF', fontWeight: '700' },

  // Metric selector pills
  metricScroll: { marginBottom: 14 },
  metricScrollContent: { paddingHorizontal: 18, gap: 8 },
  metricPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.cardBackground,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  metricPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  metricPillText: { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  metricPillTextActive: { color: '#FFFFFF' },

  // This week stats
  weekSection: { paddingHorizontal: 18 },
  weekSectionTitle: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.6, marginBottom: 10 },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  weekStatCard: {
    width: '47.5%', backgroundColor: Colors.cardBackground,
    padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  weekStatLabel: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  weekStatValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  weekStatValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  weekStatUnit: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  weekStatSub: { fontSize: 10, fontWeight: '600', marginTop: 4 },
});

export default HomeScreen;
