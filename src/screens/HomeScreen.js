import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Keyboard, Modal, Animated, Easing, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';
import { weightUnit, kgToDisplay, displayToKg } from '../utils/units';
import LogWorkoutModal from '../components/workout/LogWorkoutModal';
import EditWorkoutModal from '../components/workout/EditWorkoutModal';
import ExpandedSessionCard from '../components/workout/ExpandedSessionCard';
import MealLog from '../components/MealLog';
import DayPicker from '../components/workout/DayPicker';
import { useFeature } from '../contexts/FeatureFlagsContext';
import RunTracker from '../components/run/RunTracker';
import { isCardio, cardioTotals, formatPace, distanceUnitFor } from '../utils/cardio';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Local-date key, matches ProgressScreen / CalendarScreen fitness_data keys
const toKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysBetween = (fromKey, toKeyStr) =>
  Math.round((new Date(toKeyStr + 'T12:00:00') - new Date(fromKey + 'T12:00:00')) / 86400000);

const fmtNum = v => (v % 1 === 0 ? String(v) : v.toFixed(1));

const shiftKey = (key, days) => {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toKey(d);
};

function fmtDayLabel(key, todayKey) {
  const n = daysBetween(key, todayKey);
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  const d = new Date(key + 'T12:00:00');
  return `${DAY_NAMES[d.getDay()].slice(0, 3)}, ${MON_NAMES[d.getMonth()]} ${d.getDate()}`;
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

const MODE_KEY = 'homeWorkoutMode'; // remembered per device

// Totals across a session's cardio exercises, e.g. "30 min · 5.2 km · 5:46 /km"
function cardioSummary(session, distUnit) {
  let distance = 0, duration = 0;
  (session.exercises || []).filter(isCardio).forEach(ex => {
    const t = cardioTotals(ex, distUnit);
    distance += t.distance;
    duration += t.duration;
  });
  const parts = [];
  if (duration) parts.push(`${Math.round(duration)} min`);
  if (distance) parts.push(`${Math.round(distance * 100) / 100} ${distUnit}`);
  if (duration && distance) parts.push(`${formatPace(duration / distance)} /${distUnit}`);
  return parts.join(' · ') || 'No time or distance';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [fitnessData, setFitnessData] = useState({});
  const [profile, setProfile] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [selectedKey, setSelectedKey] = useState(() => toKey(new Date()));
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const weightEnabled = useFeature('weight');
  const mealsEnabled = useFeature('meals');
  const runsEnabled = useFeature('outdoorRuns'); // beta, off by default
  const [runTrackerOpen, setRunTrackerOpen] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null); // { session, rect }
  const [editingSession, setEditingSession] = useState(null);
  const sessionRefs = useRef({});

  // Lifting / cardio toggle: drives the log popup, the workouts list and the accent colour
  const [mode, setModeState] = useState('strength');
  const modeAnim = useRef(new Animated.Value(0)).current; // 0 = lifting (yellow), 1 = cardio (cyan)
  const listAnim = useRef(new Animated.Value(1)).current;
  const [toggleWidth, setToggleWidth] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then(saved => {
      if (saved === 'cardio') { setModeState('cardio'); modeAnim.setValue(1); }
    }).catch(() => {});
  }, []);

  const setMode = next => {
    if (next === mode) return;
    setModeState(next);
    Animated.timing(modeAnim, {
      toValue: next === 'cardio' ? 1 : 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
    listAnim.setValue(0);
    Animated.timing(listAnim, { toValue: 1, duration: 320, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  };

  const cardioMode = mode === 'cardio';
  // Plain colours (icons, text) switch instantly; Animated ones (fills, borders) fade
  const accent = cardioMode ? Colors.cardio : Colors.text;
  const onAccent = cardioMode ? Colors.onCardio : Colors.onPrimary;
  const accentFill = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [Colors.primary, Colors.cardio] });
  const accentTint = modeAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,230,0,0.12)', 'rgba(34,211,238,0.14)'] });
  const cardBorder = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [Colors.borderColor, 'rgba(34,211,238,0.4)'] });

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
    const key = selectedKey;
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
      setEditingWeight(false);
    }
    setSavingWeight(false);
  };

  const today = new Date();
  const todayKey = toKey(today);
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'there';
  const units = profile?.units;
  const unit = weightUnit(units);
  const w = kg => fmtNum(kgToDisplay(kg, units)); // kg value -> display string

  const selectDay = key => {
    setSelectedKey(key);
    setEditingWeight(false);
    setWeightInput('');
  };
  const changeDay = days => selectDay(shiftKey(selectedKey, days));

  // Weight for the selected day, and the most recent weigh-in before it
  const dayWeight = parseFloat(fitnessData[selectedKey]?.weight) > 0 ? parseFloat(fitnessData[selectedKey].weight) : null;
  const priorWeight = getWeightSeries(fitnessData).filter(e => e.date < selectedKey).pop() || null;
  const isToday = selectedKey === todayKey;

  // Workouts on the selected day that match the lifting / cardio toggle
  const distUnit = distanceUnitFor(unit);
  const daySessions = history
    .filter(s => toKey(new Date(s.completedAt)) === selectedKey)
    .filter(s => {
      const exs = s.exercises || [];
      return exs.length ? exs.some(ex => isCardio(ex) === cardioMode) : !cardioMode;
    })
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

        {/* Lifting / cardio toggle */}
        <View style={styles.modeToggle} onLayout={e => setToggleWidth(e.nativeEvent.layout.width)}>
          {toggleWidth > 0 && (
            <Animated.View
              style={[styles.modeThumb, {
                width: (toggleWidth - 8) / 2,
                backgroundColor: accentFill,
                transform: [{ translateX: modeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (toggleWidth - 8) / 2] }) }],
              }]}
            />
          )}
          {[
            { id: 'strength', label: 'Lifting', icon: 'barbell-outline' },
            { id: 'cardio', label: 'Cardio', icon: 'walk-outline' },
          ].map(opt => {
            const active = mode === opt.id;
            return (
              <TouchableOpacity key={opt.id} style={styles.modeOption} onPress={() => setMode(opt.id)} activeOpacity={0.8}>
                <Ionicons name={opt.icon} size={16} color={active ? onAccent : Colors.gray} />
                <Text style={[styles.modeLabel, { color: active ? onAccent : Colors.gray }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Day switcher: weight, meals and workouts below follow the selected day */}
        <Animated.View style={[styles.dayNav, { borderColor: cardBorder }]}>
          <TouchableOpacity style={styles.dayNavBtn} onPress={() => changeDay(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={18} color={accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dayNavCenter} onPress={() => setDayPickerOpen(true)} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={15} color={accent} />
            <Text style={styles.dayNavLabel}>{fmtDayLabel(selectedKey, todayKey)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dayNavBtn} onPress={() => changeDay(1)} disabled={isToday} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={18} color={isToday ? Colors.borderColor : accent} />
          </TouchableOpacity>
        </Animated.View>

        {/* Weight */}
        {weightEnabled && (
          <Animated.View style={[styles.card, { borderColor: cardBorder }]}>
            <View style={[styles.promptRow, { marginTop: 0 }]}>
              <Animated.View style={[styles.iconBg, { backgroundColor: accentTint }]}>
                <Ionicons name="scale-outline" size={18} color={accent} />
              </Animated.View>
              <View style={styles.promptText}>
                <Text style={styles.promptTitle}>Weight</Text>
                <Text style={styles.promptSub}>
                  {dayWeight != null
                    ? `${w(dayWeight)} ${unit} logged${isToday ? ' today' : ''}`
                    : priorWeight
                      ? `Last: ${w(priorWeight.weight)} ${unit}, ${fmtAgo(priorWeight.date, todayKey)}`
                      : 'No weight logged yet'}
                </Text>
              </View>
              {dayWeight != null && !editingWeight ? (
                <TouchableOpacity
                  onPress={() => { setWeightInput(w(dayWeight)); setEditingWeight(true); }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Animated.View style={[styles.editIconBtn, { backgroundColor: accentTint }]}>
                    <Ionicons name="pencil" size={16} color={accent} />
                  </Animated.View>
                </TouchableOpacity>
              ) : (
                <View style={styles.weightInputRow}>
                  {editingWeight && (
                    <TouchableOpacity
                      onPress={() => { setEditingWeight(false); setWeightInput(''); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={20} color={Colors.gray} />
                    </TouchableOpacity>
                  )}
                  <TextInput
                    style={styles.weightInput}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder={priorWeight ? w(priorWeight.weight) : unit}
                    placeholderTextColor={Colors.gray}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={saveWeight}
                    autoFocus={editingWeight}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={!(parseFloat(weightInput) > 0) && styles.actionBtnDisabled}
                    onPress={saveWeight}
                    disabled={savingWeight || !(parseFloat(weightInput) > 0)}
                    activeOpacity={0.8}
                  >
                    <Animated.View style={[styles.actionBtn, { backgroundColor: accentFill }]}>
                      {savingWeight
                        ? <ActivityIndicator size="small" color={onAccent} />
                        : <Text style={[styles.actionBtnText, { color: onAccent }]}>Save</Text>}
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </Animated.View>
        )}

        {/* Meals */}
        {mealsEnabled && (
          <Animated.View style={[styles.card, { borderColor: cardBorder }]}>
            <MealLog
              dayKey={selectedKey}
              dayData={fitnessData[selectedKey]}
              onSaved={setFitnessData}
              accent={accent}
              onAccent={onAccent}
              accentFill={accentFill}
              accentTint={accentTint}
            />
          </Animated.View>
        )}

        {/* Workouts for the selected day */}
        <Animated.View style={[styles.card, { borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardLabel, { color: accent }]}>
              {cardioMode ? (isToday ? "TODAY'S CARDIO" : 'CARDIO') : (isToday ? "TODAY'S LIFTS" : 'LIFTS')}
            </Text>
            {/* Outdoor run tracking (feature-flagged, live GPS so today only, web for now) */}
            {cardioMode && runsEnabled && isToday && Platform.OS === 'web' && (
              <TouchableOpacity onPress={() => setRunTrackerOpen(true)} activeOpacity={0.8} style={styles.runBtn}>
                <Ionicons name="navigate" size={14} color={Colors.cardio} />
                <Text style={styles.runBtnText}>Run</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setLogModalVisible(true)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View style={[styles.addBtn, { backgroundColor: accentFill }]}>
                <Ionicons name="add" size={20} color={onAccent} />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <Animated.View style={{ opacity: listAnim, transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
            {daySessions.length === 0 ? (
              <Text style={styles.emptyText}>No {cardioMode ? 'cardio' : 'lifting'} logged {isToday ? 'today' : 'on this day'}.</Text>
            ) : (
              daySessions.map((session, i) => {
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
                    <Animated.View style={[styles.iconBg, { backgroundColor: accentTint }]}>
                      <Ionicons name={cardioMode ? 'walk-outline' : 'barbell-outline'} size={18} color={accent} />
                    </Animated.View>
                    <View style={styles.promptText}>
                      <Text style={styles.promptTitle} numberOfLines={1}>{session.name}</Text>
                      <Text style={styles.promptSub} numberOfLines={1}>
                        {cardioMode ? cardioSummary(session, distUnit) : (
                          `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} · ${setCount} set${setCount !== 1 ? 's' : ''}`
                          + (exercises.length ? ` · ${exercises.map(ex => ex.name).join(', ')}` : '')
                        )}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        </Animated.View>

      </ScrollView>

      <Modal visible={dayPickerOpen} transparent animationType="fade" onRequestClose={() => setDayPickerOpen(false)}>
        <DayPicker
          title="Go to day"
          markedKey={selectedKey}
          maxKey={todayKey}
          onSelect={key => { selectDay(key); setDayPickerOpen(false); }}
          onCancel={() => setDayPickerOpen(false)}
        />
      </Modal>

      {runsEnabled && (
        <RunTracker
          visible={runTrackerOpen}
          onClose={() => setRunTrackerOpen(false)}
          onSaved={reloadHistory}
          weightUnit={unit}
        />
      )}

      <LogWorkoutModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        onSaved={reloadHistory}
        targetDate={isToday ? null : selectedKey}
        defaultUnit={unit}
        mode={mode}
        accent={cardioMode ? Colors.cardio : Colors.primary}
        onAccent={onAccent}
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
          onCopied={reloadHistory}
          weightUnit={unit}
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
  dayNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 18, marginTop: 8, paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: Colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor,
  },
  dayNavBtn:   { padding: 6 },
  dayNavCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8 },
  dayNavLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Prompt rows
  promptRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  iconBg:      { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  promptText:  { flex: 1 },
  promptTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  promptSub:   { fontSize: 12, color: Colors.gray, marginTop: 2 },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  weightInput: {
    width: 64, paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: Colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderColor,
    color: '#FFFFFF', fontSize: 15, textAlign: 'center',
  },
  actionBtn: {
    minWidth: 56, paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 10, alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: Colors.onPrimary, fontSize: 14, fontWeight: '700' },

  // Lifting / cardio toggle
  modeToggle: {
    flexDirection: 'row', marginHorizontal: 18, marginTop: 8, padding: 4,
    backgroundColor: Colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor,
  },
  modeThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 10 },
  modeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  modeLabel: { fontSize: 14, fontWeight: '700' },

  runBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', marginRight: 10,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.cardio,
  },
  runBtnText: { fontSize: 13, fontWeight: '700', color: Colors.cardio },

  // Workouts
  addBtn: {
    width: 30, height: 30, borderRadius: 999,
    justifyContent: 'center', alignItems: 'center',
  },
  sessionRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
  sessionRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderColor, marginTop: 12 },
});

export default HomeScreen;
