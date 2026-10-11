import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, LayoutAnimation, Platform,
  Modal, SafeAreaView,
} from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useFocusEffect } from '@react-navigation/native';
import Svg, {
  Circle, Defs, Stop,
  LinearGradient as SvgGradient,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';
import HeartRateCard from '../components/HeartRateCard';

if (Platform.OS === 'android') LayoutAnimation.enabled = true;

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const GOALS = { calories: 540, minutes: 60, workouts: 1 };
const STEP_GOAL = 10000;
const STEP_M = 0.762;
const DIST_GOAL_KM = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateStr = d => d.toISOString().slice(0, 10);

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

function fmtDistance(steps) {
  const m = steps * STEP_M;
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function fmtDayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${MON_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function getMotivation(progress, streak, firstName, hour) {
  if (progress >= 1) return `Goals crushed today, ${firstName}. Outstanding work.`;
  if (progress >= 0.75) return `Almost there — one more push and you're done.`;
  if (progress >= 0.5) return `Over halfway through your goals. Keep the momentum going.`;
  if (progress > 0) {
    if (hour < 14) return `You've made a start, ${firstName}. Build on it.`;
    if (hour < 19) return `Good progress. The afternoon push is where goals get made.`;
    return `Still grinding — finish what you started today.`;
  }
  if (streak >= 7) return `${streak} days in a row. Don't let today break the chain.`;
  if (hour < 10) return `Rise and go, ${firstName}. Your goals are waiting.`;
  if (hour < 14) return `Morning's yours. Time to move, ${firstName}.`;
  if (hour < 19) return `Every rep counts. Get moving this afternoon.`;
  return `There's still time to hit your goals tonight. Let's go.`;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

const ProgressBar = ({ progress, color, height = 4 }) => (
  <View style={{ height, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: height / 2, marginTop: 8, overflow: 'hidden' }}>
    <View style={{ width: `${Math.min(progress * 100, 100)}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
  </View>
);

// ─── Activity ring ─────────────────────────────────────────────────────────────

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

// ─── Day Browser Modal ────────────────────────────────────────────────────────

const DayBrowserModal = ({ visible, onClose, history, bodyMetrics, fitnessData, todayStr }) => {
  const [browsedDate, setBrowsedDate] = useState(todayStr);

  useEffect(() => {
    if (visible) setBrowsedDate(todayStr);
  }, [visible, todayStr]);

  const isToday = browsedDate === todayStr;

  const goBack = () => {
    const d = new Date(browsedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setBrowsedDate(toDateStr(d));
  };

  const goForward = () => {
    if (isToday) return;
    const d = new Date(browsedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const next = toDateStr(d);
    if (next <= todayStr) setBrowsedDate(next);
  };

  const daySessions = history.filter(s => s.completedAt.slice(0, 10) === browsedDate);
  const dayCalsBurned = daySessions.reduce((s, x) => s + (x.caloriesBurned || 0), 0);
  const dayMins = daySessions.reduce((s, x) => s + (x.duration || 0), 0);

  const dayMetric = bodyMetrics.find(m => m.date && m.date.slice(0, 10) === browsedDate);
  const dayFitness = fitnessData[browsedDate] || {};
  const dayWeight = dayMetric?.weight || dayFitness.weight || null;
  const dayConsumed = dayMetric?.caloriesConsumed || dayFitness.caloriesConsumed || null;

  const dateLabel = isToday ? 'Today' : fmtDayLabel(browsedDate);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <View style={{ width: 60 }} />
          <Text style={styles.modalTitle}>Daily Summary</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalDoneBtn}>
            <Text style={styles.modalDone}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Date navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={goBack} style={styles.dateNavBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.dateNavCenter}>
            <Text style={styles.dateNavLabel}>{dateLabel}</Text>
            {!isToday && <Text style={styles.dateNavSub}>{browsedDate}</Text>}
          </View>
          <TouchableOpacity onPress={goForward} style={styles.dateNavBtn} disabled={isToday}>
            <Ionicons name="chevron-forward" size={22} color={isToday ? Colors.borderColor : Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll}>
          {/* Stats grid */}
          <View style={styles.dayStatsGrid}>
            <View style={styles.dayStatCard}>
              <View style={[styles.dayStatIcon, { backgroundColor: 'rgba(88,216,219,0.12)' }]}>
                <Ionicons name="scale-outline" size={18} color={Colors.text} />
              </View>
              <Text style={styles.dayStatLabel}>WEIGHT</Text>
              <Text style={styles.dayStatValue}>{dayWeight != null ? `${dayWeight} kg` : '—'}</Text>
            </View>
            <View style={styles.dayStatCard}>
              <View style={[styles.dayStatIcon, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                <Ionicons name="restaurant-outline" size={18} color={Colors.amber} />
              </View>
              <Text style={styles.dayStatLabel}>CONSUMED</Text>
              <Text style={styles.dayStatValue}>{dayConsumed != null ? `${dayConsumed} kcal` : '—'}</Text>
            </View>
            <View style={styles.dayStatCard}>
              <View style={[styles.dayStatIcon, { backgroundColor: 'rgba(248,113,113,0.12)' }]}>
                <Ionicons name="flame-outline" size={18} color={Colors.softRed} />
              </View>
              <Text style={styles.dayStatLabel}>BURNED</Text>
              <Text style={styles.dayStatValue}>{dayCalsBurned ? `${dayCalsBurned} kcal` : '—'}</Text>
            </View>
            <View style={styles.dayStatCard}>
              <View style={[styles.dayStatIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <Ionicons name="time-outline" size={18} color={Colors.indigo} />
              </View>
              <Text style={styles.dayStatLabel}>ACTIVE</Text>
              <Text style={styles.dayStatValue}>{dayMins ? `${dayMins} min` : '—'}</Text>
            </View>
          </View>

          {/* Workouts */}
          <Text style={styles.daySectionTitle}>WORKOUTS</Text>
          {daySessions.length === 0 ? (
            <View style={styles.dayEmpty}>
              <Ionicons name="barbell-outline" size={32} color={Colors.borderColor} />
              <Text style={styles.dayEmptyText}>No workouts logged</Text>
            </View>
          ) : (
            daySessions.map(session => (
              <View key={session.id} style={styles.daySessionCard}>
                <View style={styles.daySessionRow}>
                  <Text style={styles.daySessionName}>{session.name}</Text>
                  <Text style={styles.daySessionCals}>{session.caloriesBurned || 0} kcal</Text>
                </View>
                <Text style={styles.daySessionMeta}>
                  {session.duration} min · {session.exercises?.length || session.exerciseCount || 0} exercises
                </Text>
                {session.notes ? (
                  <Text style={styles.daySessionNotes}>{session.notes}</Text>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [bodyMetrics, setBodyMetrics] = useState([]);
  const [fitnessData, setFitnessData] = useState({});
  const [profile, setProfile] = useState(null);
  const [stepsToday, setStepsToday] = useState(null);
  const [hourlySteps, setHourlySteps] = useState(Array(24).fill(0));
  const [pedometerAvailable, setPedometerAvailable] = useState(null);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [distanceExpanded, setDistanceExpanded] = useState(false);
  const [dayBrowserVisible, setDayBrowserVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [hist, prog, prof, fit] = await Promise.all([
        StorageService.getWorkoutHistory(),
        StorageService.getProgressData(),
        StorageService.getUserProfile(),
        StorageService.getFitnessData(),
      ]);
      if (!active) return;
      setHistory(hist || []);
      setBodyMetrics(((prog?.bodyMetrics) || []).sort((a, b) => a.date.localeCompare(b.date)));
      setProfile(prof);
      setFitnessData(fit || {});
      setLoading(false);

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
  const todayStr = toDateStr(today);

  // Today's workout stats
  const todaySessions = history.filter(s => s.completedAt.slice(0, 10) === todayStr);
  const todayCalsBurned = todaySessions.reduce((s, x) => s + (x.caloriesBurned || 0), 0);
  const todayMins = todaySessions.reduce((s, x) => s + (x.duration || 0), 0);
  const todayCount = todaySessions.length;

  // Today's body metrics (check both progress_data and fitness_data)
  const todayMetric = bodyMetrics.find(m => m.date && m.date.slice(0, 10) === todayStr);
  const todayFitness = fitnessData[todayStr] || {};
  const todayWeight = todayMetric?.weight || todayFitness.weight || null;
  const todayConsumed = todayMetric?.caloriesConsumed || todayFitness.caloriesConsumed || null;

  // Goals ring: average completion across all 3 goals
  const ringProgress = Math.min(
    (Math.min(todayCalsBurned / GOALS.calories, 1) +
     Math.min(todayMins / GOALS.minutes, 1) +
     Math.min(todayCount / GOALS.workouts, 1)) / 3,
    1
  );

  const streak = computeStreak(history);
  const hour = today.getHours();
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'there';
  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

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

      {/* Hero card — tap to browse history */}
      <TouchableOpacity
        style={styles.heroCard}
        onPress={() => setDayBrowserVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>TODAY'S GOAL</Text>
          <ActivityRing progress={ringProgress} />
        </View>

        <Text style={styles.heroMotivation}>
          {getMotivation(ringProgress, streak, firstName, hour)}
        </Text>

        <View style={styles.heroMeta}>
          <View style={styles.heroMetaLeft}>
            <View style={styles.heroMetaPill}>
              <Ionicons name="flame" size={13} color={Colors.text} />
              <Text style={styles.heroMetaText}>{streak} day streak</Text>
            </View>
            {todayWeight != null && (
              <View style={styles.heroMetaPill}>
                <Ionicons name="scale-outline" size={13} color={Colors.gray} />
                <Text style={styles.heroMetaText}>{todayWeight} kg</Text>
              </View>
            )}
          </View>
          <View style={styles.heroBrowseHint}>
            <Text style={styles.heroBrowseText}>history</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.gray} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Calories Consumed */}
      <View style={styles.statCard}>
        <View style={[styles.statIconBg, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
          <Ionicons name="restaurant-outline" size={18} color={Colors.amber} />
        </View>
        <View style={styles.statCardContent}>
          <Text style={styles.statCardLabel}>CALORIES CONSUMED</Text>
          <View style={styles.statCardValueRow}>
            <Text style={styles.statCardValue}>
              {todayConsumed != null ? todayConsumed.toLocaleString() : '—'}
            </Text>
            {todayConsumed != null && <Text style={styles.statCardUnit}> kcal</Text>}
          </View>
        </View>
      </View>

      {/* Calories Burned */}
      <View style={styles.statCard}>
        <View style={[styles.statIconBg, { backgroundColor: 'rgba(248,113,113,0.15)' }]}>
          <Ionicons name="flame-outline" size={18} color={Colors.softRed} />
        </View>
        <View style={styles.statCardContent}>
          <Text style={styles.statCardLabel}>CALORIES BURNED</Text>
          <View style={styles.statCardValueRow}>
            <Text style={styles.statCardValue}>{todayCalsBurned.toLocaleString()}</Text>
            <Text style={styles.statCardUnit}> / {GOALS.calories} kcal</Text>
          </View>
          <ProgressBar progress={todayCalsBurned / GOALS.calories} color={Colors.softRed} />
        </View>
        {todayCalsBurned >= GOALS.calories && (
          <Ionicons name="checkmark-circle" size={20} color={Colors.green} style={{ marginLeft: 4 }} />
        )}
      </View>

      {/* Heart rate (with today's sparkline) */}
      <HeartRateCard />

      {/* Steps */}
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
        {stepsToday !== null && (
          <ProgressBar progress={stepsToday / STEP_GOAL} color={Colors.amber} />
        )}
        {stepsExpanded && (
          stepsToday !== null && pedometerAvailable
            ? <HourlyBarChart data={hourlySteps} />
            : <Text style={styles.stepUnavail}>Motion data not available on this device</Text>
        )}
      </TouchableOpacity>

      {/* Distance */}
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
        {stepsToday !== null && (
          <ProgressBar progress={stepsToday * STEP_M / 1000 / DIST_GOAL_KM} color={Colors.indigo} />
        )}
        {distanceExpanded && (
          stepsToday !== null && pedometerAvailable
            ? <HourlyBarChart data={hourlySteps.map(s => Math.round(s * STEP_M))} />
            : <Text style={styles.stepUnavail}>Motion data not available on this device</Text>
        )}
      </TouchableOpacity>

      {/* Day browser */}
      <DayBrowserModal
        visible={dayBrowserVisible}
        onClose={() => setDayBrowserVisible(false)}
        history={history}
        bodyMetrics={bodyMetrics}
        fitnessData={fitnessData}
        todayStr={todayStr}
      />

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
  headerDate:     { fontSize: 13, color: Colors.gray, fontWeight: '500' },
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
  heroTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroLabel:      { fontSize: 11, color: Colors.text, fontWeight: '600', letterSpacing: 1.2 },
  heroMotivation: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', lineHeight: 24, marginBottom: 16 },
  heroMeta:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroMetaLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroMetaPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  heroMetaText:   { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  heroBrowseHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  heroBrowseText: { fontSize: 11, color: Colors.gray },

  // Stat cards (calories consumed / burned)
  statCard: {
    marginHorizontal: 18, marginBottom: 12,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  statIconBg: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  statCardContent:  { flex: 1 },
  statCardLabel:    { fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.8, marginBottom: 2 },
  statCardValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statCardValue:    { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  statCardUnit:     { fontSize: 12, color: Colors.gray, fontWeight: '500' },

  // Step / distance cards
  stepCard: {
    marginHorizontal: 18, marginBottom: 12,
    padding: 16, backgroundColor: Colors.cardBackground,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor,
  },
  stepCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  stepCardLabel:    { fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.8, marginBottom: 2 },
  stepCardValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  stepCardValue:    { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  stepCardUnit:     { fontSize: 12, color: Colors.gray, fontWeight: '500' },
  stepCardRight:    { alignItems: 'flex-end', gap: 4 },
  stepGoalPct:  { fontSize: 11, color: Colors.gray, fontWeight: '600' },
  stepUnavail:  { fontSize: 12, color: Colors.gray, marginTop: 14, textAlign: 'center', paddingBottom: 4 },

  // Hourly bar chart
  hourlyChart:  { marginTop: 16 },
  hourlyBars:   { flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 2 },
  hourlyBar:    { flex: 1, borderRadius: 3 },
  hourlyLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  hourlyLabel:  { fontSize: 9, color: Colors.gray, fontWeight: '500' },

  // Day Browser Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderColor,
  },
  modalTitle:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  modalDoneBtn: { width: 60, alignItems: 'flex-end' },
  modalDone:    { fontSize: 16, color: Colors.text, fontWeight: '600' },

  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderColor,
  },
  dateNavBtn:    { padding: 8 },
  dateNavCenter: { flex: 1, alignItems: 'center' },
  dateNavLabel:  { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  dateNavSub:    { fontSize: 12, color: Colors.gray, marginTop: 2 },

  modalScroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40 },

  dayStatsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  dayStatCard: {
    width: '47.5%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor,
    padding: 14, alignItems: 'flex-start', gap: 8,
  },
  dayStatIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dayStatLabel: { fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.6 },
  dayStatValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  daySectionTitle: {
    fontSize: 11, color: Colors.gray, fontWeight: '700', letterSpacing: 1,
    marginBottom: 10,
  },
  dayEmpty: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor,
    gap: 10,
  },
  dayEmptyText: { fontSize: 14, color: Colors.gray },

  daySessionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor,
    padding: 14, marginBottom: 10,
  },
  daySessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  daySessionName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  daySessionCals: { fontSize: 13, color: Colors.softRed, fontWeight: '600' },
  daySessionMeta: { fontSize: 12, color: Colors.gray },
  daySessionNotes: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
});

export default HomeScreen;
