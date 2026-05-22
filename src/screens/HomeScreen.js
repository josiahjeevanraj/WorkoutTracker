import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, {
  Circle, Path, Defs, Stop,
  LinearGradient as SvgGradient,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_W = SCREEN_WIDTH - 36;

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['M','T','W','T','F','S','S'];
const MON_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

const GOALS = { calories: 540, minutes: 60, workouts: 1 };

const METRICS = [
  { id: 'calories', label: 'Calories Burned', unit: 'kcal' },
  { id: 'weight',   label: 'Body Weight',     unit: 'kg'   },
  { id: 'workouts', label: 'Workouts',         unit: ''     },
  { id: 'duration', label: 'Duration',         unit: 'min'  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateStr = d => d.toISOString().slice(0, 10);

function getMondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function computeStreak(history) {
  if (!history.length) return 0;
  const days = new Set(history.map(s => s.completedAt.slice(0, 10)));
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (!days.has(today) && !days.has(yesterday)) return 0;
  const d = new Date();
  if (!days.has(today)) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  let streak = 0;
  while (days.has(toDateStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function sessionInPeriod(completedAt, period, monday, today) {
  const d = new Date(completedAt);
  if (period === 'week') {
    const diff = Math.floor((d - monday) / 86400000);
    return diff >= 0 && diff < 7;
  }
  if (period === 'month') return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  if (period === 'year')  return d.getFullYear() === today.getFullYear();
  return true;
}

function buildSessionChartData(history, metricFn) {
  const today = new Date();
  const monday = getMondayOf(today);

  const week = (() => {
    const b = Array(7).fill(0);
    history.forEach(s => {
      const diff = Math.floor((new Date(s.completedAt) - monday) / 86400000);
      if (diff >= 0 && diff < 7) b[diff] += metricFn(s);
    });
    return { labels: DAY_LABELS, data: b };
  })();

  const month = (() => {
    const b = [0, 0, 0, 0];
    history.forEach(s => {
      const d = new Date(s.completedAt);
      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())
        b[Math.min(Math.floor((d.getDate() - 1) / 7), 3)] += metricFn(s);
    });
    return { labels: ['W1','W2','W3','W4'], data: b };
  })();

  const year = (() => {
    const b = Array(12).fill(0);
    history.forEach(s => {
      const d = new Date(s.completedAt);
      if (d.getFullYear() === today.getFullYear()) b[d.getMonth()] += metricFn(s);
    });
    return { labels: MON_LABELS, data: b };
  })();

  const all = (() => {
    const byYear = {};
    history.forEach(s => {
      const y = new Date(s.completedAt).getFullYear().toString();
      byYear[y] = (byYear[y] || 0) + metricFn(s);
    });
    const years = Object.keys(byYear).sort();
    return years.length
      ? { labels: years, data: years.map(y => byYear[y]) }
      : { labels: ['—'], data: [0] };
  })();

  return { week, month, year, all };
}

function buildWeightChartData(bodyMetrics) {
  const today = new Date();
  const monday = getMondayOf(today);

  const forwardFill = arr => {
    let last = 0;
    return arr.map(v => { if (v > 0) last = v; return last; });
  };

  const week = (() => {
    const b = Array(7).fill(0);
    bodyMetrics.forEach(m => {
      if (!m.weight) return;
      const diff = Math.floor((new Date(m.date + 'T00:00:00') - monday) / 86400000);
      if (diff >= 0 && diff < 7) b[diff] = m.weight;
    });
    return { labels: DAY_LABELS, data: forwardFill(b) };
  })();

  const month = (() => {
    const b = [0, 0, 0, 0];
    bodyMetrics.forEach(m => {
      if (!m.weight) return;
      const d = new Date(m.date + 'T00:00:00');
      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())
        b[Math.min(Math.floor((d.getDate() - 1) / 7), 3)] = m.weight;
    });
    return { labels: ['W1','W2','W3','W4'], data: forwardFill(b) };
  })();

  const year = (() => {
    const b = Array(12).fill(0);
    bodyMetrics.forEach(m => {
      if (!m.weight) return;
      const d = new Date(m.date + 'T00:00:00');
      if (d.getFullYear() === today.getFullYear()) b[d.getMonth()] = m.weight;
    });
    return { labels: MON_LABELS, data: forwardFill(b) };
  })();

  const all = (() => {
    const byYear = {};
    bodyMetrics.forEach(m => {
      if (!m.weight) return;
      byYear[new Date(m.date + 'T00:00:00').getFullYear().toString()] = m.weight;
    });
    const years = Object.keys(byYear).sort();
    return years.length
      ? { labels: years, data: years.map(y => byYear[y]) }
      : { labels: ['—'], data: [0] };
  })();

  return { week, month, year, all };
}

function sumPeriod(history, period, metricFn) {
  const today = new Date();
  const monday = getMondayOf(today);
  return history
    .filter(s => sessionInPeriod(s.completedAt, period, monday, today))
    .reduce((sum, s) => sum + metricFn(s), 0);
}

function prevPeriodSum(history, period, metricFn) {
  const today = new Date();
  const monday = getMondayOf(today);
  return history.filter(s => {
    const d = new Date(s.completedAt);
    if (period === 'week') {
      const prevMon = new Date(monday); prevMon.setDate(prevMon.getDate() - 7);
      const diff = Math.floor((d - prevMon) / 86400000);
      return diff >= 0 && diff < 7;
    }
    if (period === 'month') {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
    }
    if (period === 'year') return d.getFullYear() === today.getFullYear() - 1;
    return false;
  }).reduce((sum, s) => sum + metricFn(s), 0);
}

function parseVolume(exercises = []) {
  return exercises.reduce((total, ex) => {
    const wMatch = String(ex.weight || '').match(/^(\d+(\.\d+)?)/);
    const rMatch = String(ex.reps   || '').match(/^(\d+)/);
    if (!wMatch || !rMatch) return total;
    return total + parseFloat(wMatch[1]) * parseInt(rMatch[1]) * (ex.sets || 1);
  }, 0);
}

function fmtVolume(kg) {
  if (kg === 0) return '0';
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}k` : String(Math.round(kg));
}

function fmtAbsDiff(curr, prev, fmt = v => String(Math.round(v))) {
  const diff = curr - prev;
  const sign = diff >= 0 ? '+' : '−';
  return `${sign}${fmt(Math.abs(diff))} vs last`;
}

function fmtPct(curr, prev) {
  if (!prev) return null;
  const pct = ((curr - prev) / prev) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

// ─── Activity ring ────────────────────────────────────────────────────────────

const ActivityRing = ({ progress = 0 }) => {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
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

// ─── Area chart ───────────────────────────────────────────────────────────────

const AreaChart = ({ data, labels }) => {
  if (!data || data.length < 2) return null;
  if (data.every(v => v === 0)) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="analytics-outline" size={24} color={Colors.gray} />
        <Text style={styles.emptyChartText}>No data for this period</Text>
      </View>
    );
  }
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
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [bodyMetrics, setBodyMetrics] = useState([]);
  const [profile, setProfile] = useState(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [hist, prog, prof] = await Promise.all([
        StorageService.getWorkoutHistory(),
        StorageService.getProgressData(),
        StorageService.getUserProfile(),
      ]);
      if (!active) return;
      setHistory(hist || []);
      setBodyMetrics(((prog?.bodyMetrics) || []).sort((a, b) => a.date.localeCompare(b.date)));
      setProfile(prof);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []));

  const today = new Date();
  const monday = getMondayOf(today);
  const prevMonday = new Date(monday); prevMonday.setDate(prevMonday.getDate() - 7);
  const todayStr = toDateStr(today);

  // Today's stats
  const todaySessions = history.filter(s => s.completedAt.slice(0, 10) === todayStr);
  const todayCals  = todaySessions.reduce((s, x) => s + (x.caloriesBurned || 0), 0);
  const todayMins  = todaySessions.reduce((s, x) => s + (x.duration || 0), 0);
  const todayCount = todaySessions.length;
  const ringProgress = Math.min(todayMins / GOALS.minutes, 1);

  // Streak
  const streak = computeStreak(history);

  // Chart data
  const chartData = {
    calories: buildSessionChartData(history, s => s.caloriesBurned || 0),
    workouts: buildSessionChartData(history, () => 1),
    duration: buildSessionChartData(history, s => s.duration || 0),
    weight:   buildWeightChartData(bodyMetrics),
  };
  const currentData = chartData[selectedMetric]?.[timePeriod] || { labels: [], data: [] };

  // Period totals for the big number
  const periodCals   = sumPeriod(history, timePeriod, s => s.caloriesBurned || 0);
  const periodWkts   = sumPeriod(history, timePeriod, () => 1);
  const periodMins   = sumPeriod(history, timePeriod, s => s.duration || 0);
  const periodWeight = (() => {
    const filtered = bodyMetrics.filter(m => {
      if (!m.weight) return false;
      return sessionInPeriod(m.date + 'T00:00:00', timePeriod, monday, today);
    });
    return filtered.length ? filtered[filtered.length - 1].weight : null;
  })();

  const bigNum = {
    calories: { value: periodCals.toLocaleString(), unit: 'kcal' },
    workouts: { value: String(periodWkts), unit: 'sessions' },
    duration: { value: periodMins.toLocaleString(), unit: 'min' },
    weight:   { value: periodWeight != null ? String(periodWeight) : '—', unit: 'kg' },
  }[selectedMetric];

  // Trend vs previous period
  const trend = (() => {
    if (selectedMetric === 'weight') return null;
    const fn = {
      calories: s => s.caloriesBurned || 0,
      workouts: () => 1,
      duration: s => s.duration || 0,
    }[selectedMetric];
    return fmtPct(sumPeriod(history, timePeriod, fn), prevPeriodSum(history, timePeriod, fn));
  })();
  const trendUp = trend ? !trend.startsWith('-') && !trend.startsWith('−') : true;

  // This week vs last week
  const thisWeek = history.filter(s => {
    const diff = Math.floor((new Date(s.completedAt) - monday) / 86400000);
    return diff >= 0 && diff < 7;
  });
  const lastWeek = history.filter(s => {
    const diff = Math.floor((new Date(s.completedAt) - prevMonday) / 86400000);
    return diff >= 0 && diff < 7;
  });
  const thisWkCount = thisWeek.length;
  const lastWkCount = lastWeek.length;
  const thisWkMins  = thisWeek.reduce((s, x) => s + (x.duration || 0), 0);
  const lastWkMins  = lastWeek.reduce((s, x) => s + (x.duration || 0), 0);
  const thisWkCals  = thisWeek.reduce((s, x) => s + (x.caloriesBurned || 0), 0);
  const lastWkCals  = lastWeek.reduce((s, x) => s + (x.caloriesBurned || 0), 0);
  const thisWkVol   = thisWeek.reduce((s, x) => s + parseVolume(x.exercises), 0);
  const lastWkVol   = lastWeek.reduce((s, x) => s + parseVolume(x.exercises), 0);

  // User display
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'there';
  const initials  = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const currentMetricObj = METRICS.find(m => m.id === selectedMetric);
  const DAY = DAY_NAMES[today.getDay()];
  const MON = MON_NAMES[today.getMonth()];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.text} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerDate}>{DAY}, {MON} {today.getDate()}</Text>
          <Text style={styles.headerGreeting}>Hey, {firstName}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>TODAY'S STREAK</Text>
            <View style={styles.heroStreakRow}>
              <Text style={styles.heroStreakNum}>{streak}</Text>
              <Text style={styles.heroStreakUnit}> days</Text>
            </View>
          </View>
          <ActivityRing progress={ringProgress} />
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStatsRow}>
          {[
            { l: 'Calories',   v: String(todayCals),  sub: `/ ${GOALS.calories}` },
            { l: 'Active min', v: String(todayMins),  sub: `/ ${GOALS.minutes}`  },
            { l: 'Workouts',   v: String(todayCount), sub: `/ ${GOALS.workouts}` },
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
            <Text style={styles.chartCardLabel}>{currentMetricObj.label.toUpperCase()}</Text>
            <View style={styles.chartCardValueRow}>
              <Text style={styles.chartCardBigValue}>{bigNum.value}</Text>
              {bigNum.unit ? <Text style={styles.chartCardUnit}> {bigNum.unit}</Text> : null}
            </View>
          </View>
          {trend ? (
            <View style={[styles.trendBadge, !trendUp && styles.trendBadgeDown]}>
              <Ionicons name={trendUp ? 'trending-up' : 'trending-down'} size={12} color={trendUp ? Colors.green : Colors.softRed} />
              <Text style={[styles.trendText, !trendUp && { color: Colors.softRed }]}> {trend}</Text>
            </View>
          ) : null}
        </View>
        <AreaChart data={currentData.data} labels={currentData.labels} />
      </View>

      {/* Metric selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricScroll} contentContainerStyle={styles.metricScrollContent}>
        {METRICS.map(m => (
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
            {
              l: 'Workouts',
              v: String(thisWkCount),
              unit: '',
              sub: fmtAbsDiff(thisWkCount, lastWkCount),
              accent: thisWkCount >= lastWkCount ? Colors.text : Colors.softRed,
            },
            {
              l: 'Total time',
              v: String(thisWkMins),
              unit: 'min',
              sub: fmtAbsDiff(thisWkMins, lastWkMins, v => `${Math.round(v)} min`),
              accent: thisWkMins >= lastWkMins ? Colors.indigo : Colors.softRed,
            },
            {
              l: 'Calories',
              v: thisWkCals.toLocaleString(),
              unit: 'kcal',
              sub: fmtAbsDiff(thisWkCals, lastWkCals, v => Math.round(v).toLocaleString()),
              accent: thisWkCals >= lastWkCals ? Colors.amber : Colors.softRed,
            },
            {
              l: 'Volume',
              v: fmtVolume(thisWkVol),
              unit: 'kg',
              sub: (thisWkVol === 0 && lastWkVol === 0)
                ? 'No strength data'
                : fmtAbsDiff(thisWkVol, lastWkVol, v => fmtVolume(v)),
              accent: thisWkVol >= lastWkVol ? Colors.green : Colors.softRed,
            },
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
  trendBadgeDown: { backgroundColor: 'rgba(248,113,113,0.12)' },
  trendText: { fontSize: 12, color: Colors.green, fontWeight: '600' },
  emptyChart: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 6 },
  emptyChartText: { fontSize: 13, color: Colors.gray },
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
