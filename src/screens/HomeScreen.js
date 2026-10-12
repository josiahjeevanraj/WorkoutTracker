import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Dimensions, Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';
import { weightUnit, kgToDisplay, displayToKg } from '../utils/units';
import LogWorkoutModal from '../components/workout/LogWorkoutModal';
import EditWorkoutModal from '../components/workout/EditWorkoutModal';
import ExpandedSessionCard from '../components/workout/ExpandedSessionCard';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_INNER_W = SCREEN_WIDTH - 72; // card marginH 18 + padding 18 each side

const WEIGHT_WINDOW_DAYS = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Local-date key, matches ProgressScreen / CalendarScreen fitness_data keys
const toKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysAgoKey = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toKey(d);
};

const daysBetween = (fromKey, toKeyStr) =>
  Math.round((new Date(toKeyStr + 'T12:00:00') - new Date(fromKey + 'T12:00:00')) / 86400000);

const fmtNum = v => (v % 1 === 0 ? String(v) : v.toFixed(1));

const fmtDelta = v => `${v > 0 ? '+' : ''}${fmtNum(Math.round(v * 10) / 10)}`;

function fmtShortDate(key) {
  const d = new Date(key + 'T12:00:00');
  return `${MON_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function fmtAgo(key, todayKey) {
  const n = daysBetween(key, todayKey);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}

// Weight entries from fitness_data, oldest first: [{ date, weight }]
function getWeightSeries(fitnessData) {
  return Object.entries(fitnessData)
    .filter(([, v]) => v && parseFloat(v.weight) > 0)
    .map(([date, v]) => ({ date, weight: parseFloat(v.weight) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Line chart ───────────────────────────────────────────────────────────────

const LineChart = ({ values, width, height, color, strokeWidth = 2 }) => {
  if (values.length < 2) return null;
  const PAD = 4;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (width - PAD * 2),
    y: PAD + (1 - (v - min) / range) * (height - PAD * 2),
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={last.x} cy={last.y} r={strokeWidth + 1.5} fill={color} />
    </Svg>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [fitnessData, setFitnessData] = useState({});
  const [profile, setProfile] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null); // { session, rect }
  const [editingSession, setEditingSession] = useState(null);
  const sessionRefs = useRef({});

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [hist, prof, fit] = await Promise.all([
        StorageService.getWorkoutHistory(),
        StorageService.getUserProfile(),
        StorageService.getFitnessData(),
      ]);
      if (!active) return;
      setHistory(hist || []);
      setProfile(prof);
      setFitnessData(fit || {});
      setLoading(false);
    })();
    return () => { active = false; };
  }, []));

  const reloadHistory = async () => {
    setHistory((await StorageService.getWorkoutHistory()) || []);
  };

  const openSession = session => {
    const ref = sessionRefs.current[session.id];
    if (!ref) return;
    ref.measure((x, y, width, height, pageX, pageY) => {
      setExpandedCard({ session, rect: { x: pageX, y: pageY, width, height } });
    });
  };

  const saveWeight = async () => {
    const entered = parseFloat(weightInput);
    if (!(entered > 0)) return;
    const weight = displayToKg(entered, units);
    Keyboard.dismiss();
    setSavingWeight(true);
    const key = toKey(new Date());
    const latest = (await StorageService.getFitnessData()) || {};
    const updated = {
      ...latest,
      [key]: {
        caloriesConsumed: 0, caloriesBurned: 0, workouts: [],
        ...latest[key],
        weight,
      },
    };
    const ok = await StorageService.saveFitnessData(updated);
    if (ok) {
      setFitnessData(updated);
      setWeightInput('');
    }
    setSavingWeight(false);
  };

  const today = new Date();
  const todayKey = toKey(today);
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'there';
  const units = profile?.units;
  const unit = weightUnit(units);
  const w = kg => fmtNum(kgToDisplay(kg, units)); // kg value -> display string

  // Weight
  const weightSeries = getWeightSeries(fitnessData);
  const latestWeight = weightSeries[weightSeries.length - 1] || null;
  const weightLoggedToday = latestWeight?.date === todayKey;
  const recentWeights = weightSeries.filter(w => w.date >= daysAgoKey(WEIGHT_WINDOW_DAYS));
  const weightChange = recentWeights.length >= 2
    ? recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight
    : null;
  const goalWeight = profile?.goalWeight || null;

  // Today's workouts
  const todaySessions = history
    .filter(s => toKey(new Date(s.completedAt)) === todayKey)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 28 }}
      >

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerDate}>
            {DAY_NAMES[today.getDay()]}, {MON_NAMES[today.getMonth()]} {today.getDate()}
          </Text>
          <Text style={styles.headerGreeting}>Hey, {firstName}</Text>
        </View>

        {/* Log latest data */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>LOG LATEST</Text>

          {/* Weight */}
          <View style={styles.promptRow}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(88,216,219,0.12)' }]}>
              <Ionicons name="scale-outline" size={18} color={Colors.text} />
            </View>
            <View style={styles.promptText}>
              <Text style={styles.promptTitle}>Weight</Text>
              <Text style={styles.promptSub}>
                {weightLoggedToday
                  ? `${w(latestWeight.weight)} ${unit} logged today`
                  : latestWeight
                    ? `Last: ${w(latestWeight.weight)} ${unit}, ${fmtAgo(latestWeight.date, todayKey)}`
                    : 'No weight logged yet'}
              </Text>
            </View>
            {weightLoggedToday ? (
              <Ionicons name="checkmark-circle" size={22} color={Colors.green} />
            ) : (
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.weightInput}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder={latestWeight ? w(latestWeight.weight) : unit}
                  placeholderTextColor={Colors.gray}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={saveWeight}
                />
                <TouchableOpacity
                  style={[styles.actionBtn, !(parseFloat(weightInput) > 0) && styles.actionBtnDisabled]}
                  onPress={saveWeight}
                  disabled={savingWeight || !(parseFloat(weightInput) > 0)}
                  activeOpacity={0.8}
                >
                  {savingWeight
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={styles.actionBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Today's workouts */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>TODAY'S WORKOUTS</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setLogModalVisible(true)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {todaySessions.length === 0 ? (
            <Text style={styles.emptyText}>No workouts logged today.</Text>
          ) : (
            todaySessions.map((session, i) => {
              const exercises = session.exercises || [];
              const setCount = exercises.reduce((n, ex) => n + (ex.sets?.length || 0), 0);
              return (
                <TouchableOpacity
                  key={session.id}
                  ref={ref => { sessionRefs.current[session.id] = ref; }}
                  style={[styles.sessionRow, i > 0 && styles.sessionRowBorder]}
                  onPress={() => openSession(session)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                    <Ionicons name="barbell-outline" size={18} color={Colors.indigo} />
                  </View>
                  <View style={styles.promptText}>
                    <Text style={styles.promptTitle} numberOfLines={1}>{session.name}</Text>
                    <Text style={styles.promptSub} numberOfLines={1}>
                      {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {setCount} set{setCount !== 1 ? 's' : ''}
                      {exercises.length ? ` · ${exercises.map(ex => ex.name).join(', ')}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Weight progression */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>WEIGHT · LAST {WEIGHT_WINDOW_DAYS} DAYS</Text>
            {weightChange != null && (
              <Text style={[styles.deltaText, { color: weightChange <= 0 ? Colors.green : Colors.amber }]}>
                {fmtDelta(kgToDisplay(weightChange, units))} {unit}
              </Text>
            )}
          </View>
          {latestWeight ? (
            <>
              <View style={styles.bigValueRow}>
                <Text style={styles.bigValue}>{w(latestWeight.weight)}</Text>
                <Text style={styles.bigUnit}> {unit}</Text>
                {goalWeight != null && (
                  <Text style={styles.goalText}>
                    Goal {w(goalWeight)} {unit} · {w(Math.abs(latestWeight.weight - goalWeight))} to go
                  </Text>
                )}
              </View>
              {recentWeights.length >= 2 ? (
                <>
                  <View style={{ marginTop: 14 }}>
                    <LineChart
                      values={recentWeights.map(w => w.weight)}
                      width={CARD_INNER_W}
                      height={90}
                      color={Colors.text}
                    />
                  </View>
                  <View style={styles.chartAxis}>
                    <Text style={styles.axisLabel}>{fmtShortDate(recentWeights[0].date)}</Text>
                    <Text style={styles.axisLabel}>{fmtShortDate(recentWeights[recentWeights.length - 1].date)}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>Log a few more weigh-ins to see your trend.</Text>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>Log your weight above to start tracking.</Text>
          )}
        </View>

      </ScrollView>

      <LogWorkoutModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        onSaved={reloadHistory}
        defaultUnit={unit}
      />

      <EditWorkoutModal
        session={editingSession}
        defaultUnit={unit}
        onClose={() => setEditingSession(null)}
        onSaved={async () => { setExpandedCard(null); await reloadHistory(); }}
      />

      {expandedCard && (
        <ExpandedSessionCard
          key={expandedCard.session.id}
          session={expandedCard.session}
          rect={expandedCard.rect}
          onClosed={updated => {
            setExpandedCard(null);
            setHistory(prev => prev.map(s => s.id === updated.id ? { ...s, notes: updated.notes } : s));
          }}
          onEdit={setEditingSession}
          onDeleted={id => {
            setExpandedCard(null);
            setHistory(prev => prev.filter(s => s.id !== id));
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  headerRow: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
  headerDate:     { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  headerGreeting: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },

  // Cards
  card: {
    marginHorizontal: 18, marginTop: 12,
    padding: 18, backgroundColor: Colors.cardBackground,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 1 },
  emptyText: { fontSize: 13, color: Colors.gray, marginTop: 12 },

  // Prompt rows
  promptRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  iconBg:      { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  promptText:  { flex: 1 },
  promptTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  promptSub:   { fontSize: 12, color: Colors.gray, marginTop: 2 },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightInput: {
    width: 64, paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: Colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderColor,
    color: '#FFFFFF', fontSize: 15, textAlign: 'center',
  },
  actionBtn: {
    minWidth: 56, paddingVertical: 9, paddingHorizontal: 14,
    backgroundColor: Colors.primary, borderRadius: 10, alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Weight progression
  deltaText:   { fontSize: 13, fontWeight: '700' },
  bigValueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginTop: 8 },
  bigValue:    { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  bigUnit:     { fontSize: 14, color: Colors.gray, fontWeight: '500' },
  goalText:    { fontSize: 12, color: Colors.textSecondary, marginLeft: 12 },
  chartAxis:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel:   { fontSize: 10, color: Colors.gray, fontWeight: '500' },

  // Today's workouts
  addBtn: {
    width: 30, height: 30, borderRadius: 999,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  sessionRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
  sessionRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderColor, marginTop: 12 },
});

export default HomeScreen;
