import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, LayoutAnimation, Platform,
} from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useFocusEffect } from '@react-navigation/native';
import Svg, {
  Circle, Path, Defs, Stop,
  LinearGradient as SvgGradient,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';
import HeartRateCard from '../components/HeartRateCard';

if (Platform.OS === 'android') LayoutAnimation.enabled = true;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_W = SCREEN_WIDTH - 36;

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['M','T','W','T','F','S','S'];
const MON_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

const GOALS = { calories: 540, minutes: 60, workouts: 1 };
const STEP_GOAL = 10000;
const STEP_M = 0.762;
const DIST_GOAL_KM = 8;

const METRICS = [
  { id: 'calories', label: 'Calories Burned', unit: 'kcal' },
  { id: 'weight',   label: 'Body Weight',     unit: 'kg'   },
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

function fmtDistance(steps) {
  const m = steps * STEP_M;
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
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

// ─── Hourly bar chart ─────────────────────────────────────────────────────────

const HourlyBarChart = ({ data }) => {
  const maxVal = Math.max(...data, 1);
  const currentHour = new Date().getHours();
  return (
    <View style={styles.hourlyChart}>
      <View style={styles.hourlyBars}>
        {data.map((v, h) => (
          <View
            key={h}
            style={[
              styles.hourlyBar,
              {
                height: Math.max((v / maxVal) * 52, v > 0 ? 4 : 1),
                backgroundColor: h <= currentHour ? Colors.primary : Colors.borderColor,
                opacity: h <= currentHour ? (v > 0 ? 1 : 0.22) : 0.1,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.hourlyLabels}>
        {['12am', '6am', '12pm', '6pm', '12am'].map((l, i) => (
          <Text key={i} style={styles.hourlyLabel}>{l}</Text>
        ))}
      </View>
    </View>
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
  const [stepsToday, setStepsToday] = useState(null);
  const [hourlySteps, setHourlySteps] = useState(Array(24).fill(0));
  const [pedometerAvailable, setPedometerAvailable] = useState(null);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [distanceExpanded, setDistanceExpanded] = useState(false);

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

      // Pedometer
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!active) return;
        setPedometerAvailable(available);
        if (available) {
          const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
          const now = new Date();
          const total = await Pedometer.getStepCountAsync(midnight, now).catch(() => ({ steps: 0 }));
          if (!active) return;
          setStepsToday(total.steps || 0);
          const currentHour = now.getHours();
          const hourly = await Promise.all(
            Array.from({ length: 24 }, (_, h) => {
              if (h > currentHour) return Promise.resolve(0);
              const s = new Date(midnight); s.setHours(h, 0, 0, 0);
              const e = new Date(midnight); e.setHours(h + 1, 0, 0, 0);
              return Pedometer.getStepCountAsync(s, e).then(r => r.steps || 0).catch(() => 0);
            })
          );
          if (!active) return;
          setHourlySteps(hourly);
        } else {
          setStepsToday(0);
        }
      } catch {
        setPedometerAvailable(false);
        setStepsToday(0);
      }
    })();
    return () => { active = false; };
  }, []));

  const today = new Date();
  const monday = getMondayOf(today);
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
    weight:   buildWeightChartData(bodyMetrics),
  };
  const currentData = chartData[selectedMetric]?.[timePeriod] || { labels: [], data: [] };

  // Period totals for the big number
  const periodCals   = sumPeriod(history, timePeriod, s => s.caloriesBurned || 0);
  const periodWeight = (() => {
    const filtered = bodyMetrics.filter(m => {
      if (!m.weight) return false;
      return sessionInPeriod(m.date + 'T00:00:00', timePeriod, monday, today);
    });
    return filtered.length ? filtered[filtered.length - 1].weight : null;
  })();

  const bigNum = {
    calories: { value: periodCals.toLocaleString(), unit: 'kcal' },
    weight:   { value: periodWeight != null ? String(periodWeight) : '—', unit: 'kg' },
  }[selectedMetric];

  // Trend vs previous period
  const trend = (() => {
    if (selectedMetric === 'weight') return null;
    const fn = selectedMetric === 'calories' ? (s => s.caloriesBurned || 0) : null;
    if (!fn) return null;
    return fmtPct(sumPeriod(history, timePeriod, fn), prevPeriodSum(history, timePeriod, fn));
  })();
  const trendUp = trend ? !trend.startsWith('-') && !trend.startsWith('−') : true;


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

      {/* Heart rate card */}
      <HeartRateCard />

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

      {/* Steps card */}
      <TouchableOpacity
        style={styles.stepCard}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setStepsExpanded(p => !p);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.stepCardTop}>
          <View style={styles.stepCardLeft}>
            <View style={styles.stepIconBg}>
              <Ionicons name="footsteps-outline" size={18} color={Colors.amber} />
            </View>
            <View>
              <Text style={styles.stepCardLabel}>STEPS TODAY</Text>
              <View style={styles.stepCardValueRow}>
                <Text style={styles.stepCardValue}>
                  {stepsToday !== null ? stepsToday.toLocaleString() : '—'}
                </Text>
                {stepsToday !== null && <Text style={styles.stepCardUnit}> steps</Text>}
              </View>
            </View>
          </View>
          <View style={styles.stepCardRight}>
            {stepsToday !== null && (
              <Text style={styles.stepGoalPct}>
                {Math.min(Math.round((stepsToday / STEP_GOAL) * 100), 999)}% of {STEP_GOAL.toLocaleString()}
              </Text>
            )}
            <Ionicons name={stepsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray} />
          </View>
        </View>
        {stepsExpanded && (
          stepsToday !== null && pedometerAvailable
            ? <HourlyBarChart data={hourlySteps} />
            : <Text style={styles.stepUnavail}>Motion data not available on this device</Text>
        )}
      </TouchableOpacity>

      {/* Distance card */}
      <TouchableOpacity
        style={styles.stepCard}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setDistanceExpanded(p => !p);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.stepCardTop}>
          <View style={styles.stepCardLeft}>
            <View style={[styles.stepIconBg, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <Ionicons name="map-outline" size={18} color={Colors.indigo} />
            </View>
            <View>
              <Text style={styles.stepCardLabel}>DISTANCE TODAY</Text>
              <View style={styles.stepCardValueRow}>
                <Text style={styles.stepCardValue}>
                  {stepsToday !== null ? fmtDistance(stepsToday) : '—'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.stepCardRight}>
            {stepsToday !== null && (
              <Text style={styles.stepGoalPct}>
                {Math.min(Math.round((stepsToday * STEP_M / 1000 / DIST_GOAL_KM) * 100), 999)}% of {DIST_GOAL_KM} km
              </Text>
            )}
            <Ionicons name={distanceExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray} />
          </View>
        </View>
        {distanceExpanded && (
          stepsToday !== null && pedometerAvailable
            ? <HourlyBarChart data={hourlySteps.map(s => Math.round(s * STEP_M))} />
            : <Text style={styles.stepUnavail}>Motion data not available on this device</Text>
        )}
      </TouchableOpacity>

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

  // Step cards
  stepCard: {
    marginHorizontal: 18, marginBottom: 12,
    padding: 16, backgroundColor: Colors.cardBackground,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor,
  },
  stepCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center' },
  stepCardLabel: { fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.8, marginBottom: 2 },
  stepCardValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  stepCardValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  stepCardUnit: { fontSize: 12, color: Colors.gray, fontWeight: '500' },
  stepCardRight: { alignItems: 'flex-end', gap: 4 },
  stepGoalPct: { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  stepUnavail: { fontSize: 12, color: Colors.gray, marginTop: 14, textAlign: 'center', paddingBottom: 4 },

  // Hourly bar chart
  hourlyChart: { marginTop: 16 },
  hourlyBars: { flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 2 },
  hourlyBar: { flex: 1, borderRadius: 3 },
  hourlyLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  hourlyLabel: { fontSize: 9, color: Colors.gray, fontWeight: '500' },

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

});

export default HomeScreen;
