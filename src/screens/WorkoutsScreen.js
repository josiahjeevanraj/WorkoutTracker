import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, SectionList, FlatList, TouchableOpacity,
  Modal, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';
import CalendarScreen from './CalendarScreen';
import { EXERCISE_LIST } from '../constants/exercises';

const daysAgo = (days, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const mkSets = (count, reps, weight) =>
  Array.from({ length: count }, () => ({ reps: String(reps), weight: String(weight) }));

const DEFAULT_SESSIONS = [
  {
    name: 'Leg Day',
    duration: 52,
    exerciseCount: 7,
    caloriesBurned: 380,
    exercises: [
      { name: 'Barbell Squats',    sets: mkSets(4, 8,  100) },
      { name: 'Romanian Deadlift', sets: mkSets(3, 10, 80)  },
      { name: 'Leg Press',         sets: mkSets(3, 12, 120) },
      { name: 'Leg Curls',         sets: mkSets(3, 12, 40)  },
      { name: 'Calf Raises',       sets: mkSets(4, 15, 60)  },
      { name: 'Walking Lunges',    sets: mkSets(3, 20, '')   },
      { name: 'Leg Extensions',    sets: mkSets(3, 15, 35)  },
    ],
    notes: 'New PR on squats! Felt strong.',
    completedAt: daysAgo(0, 9, 30),
  },
  {
    name: 'HIIT Cardio',
    duration: 25,
    exerciseCount: 8,
    caloriesBurned: 310,
    exercises: [
      { name: 'Jump Rope',         sets: mkSets(5, '60s', '') },
      { name: 'Burpees',           sets: mkSets(4, 15,   '') },
      { name: 'Mountain Climbers', sets: mkSets(4, '30s', '') },
      { name: 'Box Jumps',         sets: mkSets(3, 10,   '') },
      { name: 'High Knees',        sets: mkSets(4, '30s', '') },
      { name: 'Sprints',           sets: mkSets(6, '20s', '') },
      { name: 'Jump Squats',       sets: mkSets(3, 12,   '') },
      { name: 'Plank Hold',        sets: mkSets(3, '45s', '') },
    ],
    notes: 'Intense session. Kept rest periods short.',
    completedAt: daysAgo(1, 7, 0),
  },
  {
    name: 'Upper Body Push',
    duration: 45,
    exerciseCount: 6,
    caloriesBurned: 290,
    exercises: [
      { name: 'Bench Press',    sets: mkSets(4, 6,  90) },
      { name: 'Overhead Press', sets: mkSets(3, 8,  60) },
      { name: 'Incline DB Press', sets: mkSets(3, 10, 32) },
      { name: 'Lateral Raises', sets: mkSets(4, 15, 12) },
      { name: 'Tricep Dips',    sets: mkSets(3, 12, '') },
      { name: 'Cable Flyes',    sets: mkSets(3, 15, 15) },
    ],
    notes: '',
    completedAt: daysAgo(2, 18, 30),
  },
  {
    name: 'Core & Abs',
    duration: 30,
    exerciseCount: 5,
    caloriesBurned: 180,
    exercises: [
      { name: 'Plank',              sets: mkSets(3, '60s', '') },
      { name: 'Hanging Leg Raises', sets: mkSets(3, 12,    '') },
      { name: 'Cable Crunches',     sets: mkSets(3, 20,    25) },
      { name: 'Russian Twists',     sets: mkSets(3, 30,    10) },
      { name: 'Ab Wheel',           sets: mkSets(3, 10,    '') },
    ],
    notes: 'Added ab wheel for the first time.',
    completedAt: daysAgo(2, 10, 0),
  },
  {
    name: 'Upper Body Pull',
    duration: 42,
    exerciseCount: 6,
    caloriesBurned: 260,
    exercises: [
      { name: 'Pull-ups',         sets: mkSets(4, 8,  '') },
      { name: 'Barbell Rows',     sets: mkSets(4, 8,  80) },
      { name: 'Seated Cable Row', sets: mkSets(3, 12, 60) },
      { name: 'Face Pulls',       sets: mkSets(3, 15, 20) },
      { name: 'Barbell Curls',    sets: mkSets(3, 10, 40) },
      { name: 'Hammer Curls',     sets: mkSets(3, 12, 16) },
    ],
    notes: '',
    completedAt: daysAgo(4, 9, 0),
  },
  {
    name: 'Full Body Workout',
    duration: 55,
    exerciseCount: 8,
    caloriesBurned: 420,
    exercises: [
      { name: 'Deadlift',       sets: mkSets(4, 5,  130) },
      { name: 'Bench Press',    sets: mkSets(3, 8,  85)  },
      { name: 'Squats',         sets: mkSets(3, 8,  90)  },
      { name: 'Pull-ups',       sets: mkSets(3, 8,  '')  },
      { name: 'Dips',           sets: mkSets(3, 10, '')  },
      { name: 'Barbell Rows',   sets: mkSets(3, 10, 70)  },
      { name: 'Overhead Press', sets: mkSets(3, 10, 55)  },
      { name: 'Farmer Walks',   sets: mkSets(3, '40m', 40) },
    ],
    notes: 'Deadlift felt great. Kept rest to 2 min.',
    completedAt: daysAgo(6, 11, 0),
  },
];

// Categories match the "category" column in strength_exercises.csv
const WORKOUT_CATEGORIES = [
  {
    id: 'weighted',
    label: 'Weighted',
    icon: 'barbell-outline',
    workouts: [
      'Chest Day', 'Back Day', 'Shoulder Day', 'Arm Day', 'Leg Day',
      'Push Day', 'Pull Day', 'Legs & Glutes', 'Full Body', 'Deadlift Day',
      'Squat Focus', 'Glute Focus', 'Hamstring Focus', 'Core & Abs',
    ],
  },
  {
    id: 'calisthenics',
    label: 'Calisthenics',
    icon: 'body-outline',
    workouts: [
      'Push Circuit', 'Pull Circuit', 'Leg Circuit', 'Core Circuit',
      'Upper Body Circuit', 'Full Body Calisthenics', 'Ab Workout',
      'Chest & Triceps Circuit', 'Back & Biceps Circuit',
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDayLabel = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const groupByDay = (sessions) => {
  const map = {};
  sessions.forEach(s => {
    const key = new Date(s.completedAt).toDateString();
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  return Object.entries(map)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([key, items]) => ({
      key,
      title: formatDayLabel(key),
      count: items.length,
      totalDuration: items.reduce((sum, s) => sum + (s.duration || 0), 0),
      data: items.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    }));
};

const getCategoryInfo = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('circuit') || n.includes('calisthenics') || n.includes('bodyweight'))
    return { color: Colors.green, label: 'Calisthenics' };
  if (n.includes('push') || n.includes('chest') || n.includes('tricep') || n.includes('shoulder'))
    return { color: Colors.indigo, label: 'Weighted' };
  if (n.includes('pull') || n.includes('back') || n.includes('bicep') || n.includes('row') || n.includes('deadlift') || n.includes('lat'))
    return { color: Colors.indigo, label: 'Weighted' };
  if (n.includes('leg') || n.includes('squat') || n.includes('glute') || n.includes('hamstring') || n.includes('calf'))
    return { color: Colors.text, label: 'Weighted' };
  if (n.includes('full') || n.includes('compound'))
    return { color: Colors.primary, label: 'Weighted' };
  if (n.includes('core') || n.includes('abs') || n.includes('oblique'))
    return { color: Colors.amber, label: 'Weighted' };
  return { color: Colors.primary, label: 'Workout' };
};

// ─── Swipeable set row ────────────────────────────────────────────────────────

const SwipeableSetRow = React.memo(({ set, si, exKey, context, canDelete, onUpdate, onDuplicate, onRemove }) => {
  const swipeRef = useRef(null);
  const close = () => swipeRef.current?.close();

  const renderLeftActions = () => (
    <TouchableOpacity
      style={styles.swipeDupAction}
      onPress={() => { close(); onDuplicate(exKey, si, context); }}
      activeOpacity={0.85}
    >
      <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
      <Text style={styles.swipeActionText}>Dup</Text>
    </TouchableOpacity>
  );

  const renderRightActions = canDelete ? () => (
    <TouchableOpacity
      style={styles.swipeDelAction}
      onPress={() => { close(); onRemove(exKey, si, context); }}
      activeOpacity={0.85}
    >
      <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
      <Text style={styles.swipeActionText}>Del</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <View style={styles.inlineSetRow}>
        <Text style={styles.inlineSetLabel}>Set {si + 1}</Text>
        <TextInput
          style={styles.inlineSetInput}
          value={String(set.weight || '')}
          onChangeText={v => onUpdate(exKey, si, 'weight', v, context)}
          placeholder="kg"
          placeholderTextColor={Colors.gray}
          keyboardType="decimal-pad"
        />
        <Text style={styles.inlineSetX}>×</Text>
        <TextInput
          style={styles.inlineSetInput}
          value={String(set.reps || '')}
          onChangeText={v => onUpdate(exKey, si, 'reps', v, context)}
          placeholder="reps"
          placeholderTextColor={Colors.gray}
          keyboardType="numeric"
        />
      </View>
    </Swipeable>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const WorkoutsScreen = () => {
  const [history, setHistory] = useState([]);
  const [collapsedDays, setCollapsedDays] = useState(new Set());
  const [selectedSession, setSelectedSession] = useState(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [logExercises, setLogExercises] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editedSession, setEditedSession] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeView, setActiveView] = useState('list');
  const [inlinePickerKey, setInlinePickerKey] = useState(null);
  const [inlinePickerSearch, setInlinePickerSearch] = useState('');

  useEffect(() => { loadHistory(true).catch(console.error); }, []);

  const loadHistory = async (seed = false) => {
    const [saved, isUnset] = await Promise.all([
      StorageService.getWorkoutHistory(),
      seed ? StorageService.isWorkoutHistoryUnset() : Promise.resolve(false),
    ]);
    const needsMigration = seed && !isUnset && saved.some(s =>
      s.exercises?.some(ex => !Array.isArray(ex.sets))
    );
    if (seed && (isUnset || needsMigration)) {
      await StorageService.clearAllData();
      for (const session of DEFAULT_SESSIONS) await StorageService.addWorkoutSession(session);
      setHistory(await StorageService.getWorkoutHistory());
    } else {
      setHistory(saved);
    }
  };

  const summaryStats = useMemo(() => {
    const sessions = history.length;
    const totalMin = history.reduce((s, h) => s + (h.duration || 0), 0);
    const hours = (totalMin / 60).toFixed(1);
    return { sessions, hours };
  }, [history]);

  const toggleDay = (key) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sections = useMemo(() => {
    const grouped = groupByDay(history);
    return grouped.map(group => ({
      ...group,
      data: collapsedDays.has(group.key) ? [] : group.data,
    }));
  }, [history, collapsedDays]);

  const closeDetail = () => {
    setSelectedSession(null);
    setEditMode(false);
    setEditedSession(null);
    setConfirmDelete(false);
  };

  const executeDelete = async () => {
    const id = selectedSession?.id;
    if (!id) return;
    closeDetail();
    await StorageService.deleteWorkoutSession(id);
    setHistory(prev => prev.filter(s => s.id !== id));
  };
  const enterEditMode = () => {
    setEditedSession({ ...selectedSession, exercises: (selectedSession.exercises || []).map((ex, i) => ({ ...ex, _key: i.toString() })) });
    setEditMode(true);
  };
  const cancelEdit = () => { setEditMode(false); setEditedSession(null); };

  const handleSaveEdit = async () => {
    const cleanExercises = (editedSession.exercises || []).map(({ _key, ...ex }) => ex);
    const updates = { name: editedSession.name?.trim() || selectedSession.name, exercises: cleanExercises, exerciseCount: cleanExercises.length };
    const updated = await StorageService.updateWorkoutSession(editedSession.id, updates);
    if (updated) { setSelectedSession(updated); await loadHistory(); }
    setEditMode(false); setEditedSession(null);
  };

  const updateExercise = (key, field, value) =>
    setEditedSession(prev => ({ ...prev, exercises: prev.exercises.map(ex => ex._key === key ? { ...ex, [field]: value } : ex) }));
  const removeExercise = (key) =>
    setEditedSession(prev => ({ ...prev, exercises: prev.exercises.filter(ex => ex._key !== key) }));
  const addExercise = () =>
    setEditedSession(prev => ({ ...prev, exercises: [...prev.exercises, { name: '', sets: [{ reps: '', weight: '' }], _key: Date.now().toString() }] }));

  const repsPresets = ['6', '8', '10', '12', '15', '20'];

  // ── Inline set helpers (used in both log and edit flows) ──────────────────
  const updateSet = (exKey, setIdx, field, value, context) => {
    const updater = exercises => exercises.map(ex =>
      ex._key === exKey
        ? { ...ex, sets: ex.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s) }
        : ex
    );
    context === 'log'
      ? setLogExercises(updater)
      : setEditedSession(prev => ({ ...prev, exercises: updater(prev.exercises) }));
  };

  const addSet = (exKey, context) => {
    const updater = exercises => exercises.map(ex =>
      ex._key === exKey
        ? { ...ex, sets: [...ex.sets, { weight: ex.sets[ex.sets.length - 1]?.weight || '', reps: '' }] }
        : ex
    );
    context === 'log'
      ? setLogExercises(updater)
      : setEditedSession(prev => ({ ...prev, exercises: updater(prev.exercises) }));
  };

  const duplicateSet = (exKey, setIdx, context) => {
    const updater = exercises => exercises.map(ex => {
      if (ex._key !== exKey) return ex;
      const newSets = [...ex.sets.slice(0, setIdx + 1), { ...ex.sets[setIdx] }, ...ex.sets.slice(setIdx + 1)];
      return { ...ex, sets: newSets };
    });
    context === 'log'
      ? setLogExercises(updater)
      : setEditedSession(prev => ({ ...prev, exercises: updater(prev.exercises) }));
  };

  const removeSet = (exKey, setIdx, context) => {
    const updater = exercises => exercises.map(ex =>
      ex._key === exKey ? { ...ex, sets: ex.sets.filter((_, i) => i !== setIdx) } : ex
    );
    context === 'log'
      ? setLogExercises(updater)
      : setEditedSession(prev => ({ ...prev, exercises: updater(prev.exercises) }));
  };

  const closeLogModal = () => { setLogModalVisible(false); setSelectedCategory(null); setSelectedWorkout(''); setLogExercises([]); };
  const handleCategorySelect = (cat) => { setSelectedCategory(cat); setSelectedWorkout(cat.label); setLogExercises([]); };
  const addLogExercise = () => setLogExercises(prev => [...prev, { name: '', sets: [{ reps: '', weight: '' }], _key: Date.now().toString() }]);
  const updateLogExercise = (key, field, value) => setLogExercises(prev => prev.map(ex => ex._key === key ? { ...ex, [field]: value } : ex));
  const removeLogExercise = (key) => setLogExercises(prev => prev.filter(ex => ex._key !== key));

  const handleLogWorkout = async () => {
    if (!selectedWorkout) { Alert.alert('Select a workout', 'Please choose a category and workout first'); return; }
    const cleanExercises = logExercises.filter(ex => ex.name.trim()).map(({ _key, ...ex }) => ex);
    await StorageService.addWorkoutSession({ name: selectedWorkout, duration: 0, exerciseCount: cleanExercises.length, caloriesBurned: 0, exercises: cleanExercises, notes: '' });
    await loadHistory();
    closeLogModal();
  };

  // ─── Renderers ──────────────────────────────────────────────────────────────

  const renderSectionHeader = ({ section }) => {
    const isCollapsed = collapsedDays.has(section.key);
    return (
      <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleDay(section.key)} activeOpacity={0.7}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionMeta}>{section.count} {section.count === 1 ? 'session' : 'sessions'} · {section.totalDuration} min</Text>
        <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.gray} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const cat = getCategoryInfo(item.name);
    const hasPR = item.notes?.toLowerCase().includes('pr');
    return (
      <TouchableOpacity style={styles.sessionCard} onPress={() => setSelectedSession(item)} activeOpacity={0.8}>
        {/* Category color stripe */}
        <View style={[styles.cardStripe, { backgroundColor: cat.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardMeta}>
              <Text style={[styles.cardCategory, { color: cat.color }]}>{cat.label.toUpperCase()}</Text>
              <View style={styles.cardDot} />
              <Text style={styles.cardTime}>{formatTime(item.completedAt)}</Text>
            </View>
            <Text style={styles.cardDuration}>
              {item.duration}<Text style={styles.cardDurationUnit}>m</Text>
            </Text>
          </View>
          <Text style={styles.sessionName}>{item.name}</Text>
          <View style={styles.statsRow}>
            {(item.exerciseCount || item.exercises?.length) > 0 && (
              <View style={styles.stat}>
                <Ionicons name="barbell-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.statText}>{item.exerciseCount || item.exercises?.length} exercises</Text>
              </View>
            )}
            {item.caloriesBurned > 0 && (
              <View style={styles.stat}>
                <Ionicons name="flame-outline" size={13} color={Colors.softRed} />
                <Text style={styles.statText}>{item.caloriesBurned} kcal</Text>
              </View>
            )}
            {hasPR && (
              <View style={styles.prBadge}>
                <Text style={styles.prBadgeText}>NEW PR</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderInlineSets = (ex, context) => {
    const sets = Array.isArray(ex.sets) ? ex.sets : [{ weight: '', reps: '' }];
    return (
      <View style={styles.inlineSetsContainer}>
        <Text style={styles.swipeHint}>← swipe for actions →</Text>
        {sets.map((set, si) => (
          <SwipeableSetRow
            key={`${ex._key}-${si}`}
            set={set}
            si={si}
            exKey={ex._key}
            context={context}
            canDelete={sets.length > 1}
            onUpdate={updateSet}
            onDuplicate={duplicateSet}
            onRemove={removeSet}
          />
        ))}
        <View style={styles.repsPresetRow}>
          {repsPresets.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.presetBtn, sets[sets.length - 1]?.reps === r && styles.presetBtnActive]}
              onPress={() => updateSet(ex._key, sets.length - 1, 'reps', r, context)}
            >
              <Text style={[styles.presetText, sets[sets.length - 1]?.reps === r && styles.presetTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.inlineAddSetBtn} onPress={() => addSet(ex._key, context)}>
          <Ionicons name="add-circle-outline" size={15} color={Colors.green} />
          <Text style={styles.inlineAddSetText}>Add Set</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workouts</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === 'list' && styles.toggleBtnActive]}
            onPress={() => setActiveView('list')}
          >
            <Ionicons name="list-outline" size={15} color={activeView === 'list' ? '#FFFFFF' : Colors.gray} />
            <Text style={[styles.toggleBtnText, activeView === 'list' && styles.toggleBtnTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === 'calendar' && styles.toggleBtnActive]}
            onPress={() => setActiveView('calendar')}
          >
            <Ionicons name="calendar-outline" size={15} color={activeView === 'calendar' ? '#FFFFFF' : Colors.gray} />
            <Text style={[styles.toggleBtnText, activeView === 'calendar' && styles.toggleBtnTextActive]}>Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeView === 'list' ? (
        <>
          {/* Summary bar */}
          <View style={styles.summaryBar}>
            {[
              { l: 'Sessions', v: String(summaryStats.sessions) },
              { l: 'Hours',    v: summaryStats.hours },
            ].map(s => (
              <View key={s.l} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{s.l.toUpperCase()}</Text>
                <Text style={styles.summaryValue}>{s.v}</Text>
              </View>
            ))}
          </View>

          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={48} color={Colors.gray} />
                <Text style={styles.emptyText}>No workouts logged yet</Text>
                <Text style={styles.emptySubtext}>Tap Log Workout to add your first session</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />

          {/* FAB */}
          <TouchableOpacity style={styles.fab} onPress={() => setLogModalVisible(true)} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.fabText}>Log Workout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <CalendarScreen embedded sessions={history} />
      )}

      {/* ── Detail Modal ────────────────────────────────────────────────────── */}
      <Modal visible={!!selectedSession} animationType="slide" transparent onRequestClose={editMode ? cancelEdit : closeDetail}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.detailModal}>
            <View style={styles.modalHandle} />

            {/* Header — outside ScrollView so touches always register */}
            <View style={styles.detailHeader}>
              {editMode ? (
                <TextInput
                  style={[styles.detailName, styles.detailNameInput]}
                  value={editedSession?.name}
                  onChangeText={text => setEditedSession(prev => ({ ...prev, name: text }))}
                  placeholder="Workout name"
                  placeholderTextColor={Colors.gray}
                />
              ) : (
                <Text style={styles.detailName} numberOfLines={1}>{selectedSession?.name}</Text>
              )}
              <View style={styles.detailHeaderActions}>
                {editMode ? (
                  <>
                    <TouchableOpacity onPress={handleSaveEdit} style={styles.iconButton}><Ionicons name="checkmark" size={24} color={Colors.success} /></TouchableOpacity>
                    <TouchableOpacity onPress={cancelEdit} style={styles.iconButton}><Ionicons name="close" size={24} color={Colors.gray} /></TouchableOpacity>
                  </>
                ) : confirmDelete ? (
                  <>
                    <TouchableOpacity onPress={() => setConfirmDelete(false)} style={styles.iconButton}><Ionicons name="close-circle-outline" size={22} color={Colors.gray} /></TouchableOpacity>
                    <TouchableOpacity onPress={executeDelete} style={styles.deleteConfirmBtn}>
                      <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setConfirmDelete(true)} style={styles.iconButton}><Ionicons name="trash-outline" size={20} color={Colors.softRed} /></TouchableOpacity>
                    <TouchableOpacity onPress={enterEditMode} style={styles.iconButton}><Ionicons name="pencil" size={20} color={Colors.text} /></TouchableOpacity>
                    <TouchableOpacity onPress={closeDetail} style={styles.iconButton}><Ionicons name="close" size={24} color={Colors.gray} /></TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {confirmDelete && (
              <View style={styles.deleteConfirmBar}>
                <Ionicons name="warning-outline" size={16} color={Colors.softRed} />
                <Text style={styles.deleteConfirmText}>Delete this workout? This can't be undone.</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {selectedSession && (
                <Text style={styles.detailDate}>
                  {new Date(selectedSession.completedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {formatTime(selectedSession.completedAt)}
                </Text>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Exercises</Text>
                {editMode ? (
                  <>
                    {(editedSession?.exercises || []).map(ex => (
                      <View key={ex._key} style={styles.editExerciseBlock}>
                        <TouchableOpacity
                          style={styles.exPickerRow}
                          onPress={() => { setInlinePickerKey(inlinePickerKey === ex._key ? null : ex._key); setInlinePickerSearch(''); }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="barbell-outline" size={16} color={ex.name ? Colors.text : Colors.gray} />
                          <Text style={[styles.exPickerText, !ex.name && styles.exPickerPlaceholder]} numberOfLines={1}>
                            {ex.name || 'Select exercise'}
                          </Text>
                          <Ionicons name={inlinePickerKey === ex._key ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray} />
                          <TouchableOpacity onPress={() => removeExercise(ex._key)} style={styles.removeExBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={20} color={Colors.error} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                        {inlinePickerKey === ex._key && (
                          <View style={styles.inlinePicker}>
                            <View style={styles.inlineSearchRow}>
                              <Ionicons name="search-outline" size={16} color={Colors.gray} />
                              <TextInput
                                style={styles.inlineSearchInput}
                                value={inlinePickerSearch}
                                onChangeText={setInlinePickerSearch}
                                placeholder="Search exercises..."
                                placeholderTextColor={Colors.gray}
                                autoFocus
                              />
                              {inlinePickerSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setInlinePickerSearch('')}>
                                  <Ionicons name="close-circle" size={16} color={Colors.gray} />
                                </TouchableOpacity>
                              )}
                            </View>
                            <ScrollView style={styles.inlinePickerList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                              {(inlinePickerSearch.trim()
                                ? EXERCISE_LIST.filter(n => n.toLowerCase().includes(inlinePickerSearch.toLowerCase()))
                                : EXERCISE_LIST
                              ).map(name => (
                                <TouchableOpacity
                                  key={name}
                                  style={styles.inlinePickerItem}
                                  onPress={() => {
                                    updateExercise(ex._key, 'name', name);
                                    setInlinePickerKey(null);
                                  }}
                                >
                                  <Text style={styles.inlinePickerItemText}>{name}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                        {renderInlineSets(ex, 'edit')}
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addExerciseBtn} onPress={addExercise}>
                      <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
                      <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  (selectedSession?.exercises || []).length === 0 ? (
                    <Text style={styles.noExercisesText}>No exercises recorded</Text>
                  ) : (
                    selectedSession.exercises.map((ex, i) => (
                      <View key={i} style={styles.exerciseRow}>
                        <View style={styles.exerciseHeader}>
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                          {Array.isArray(ex.sets) && (
                            <Text style={styles.exerciseSetCount}>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</Text>
                          )}
                        </View>
                        {Array.isArray(ex.sets) ? (
                          ex.sets.map((set, si) => (
                            <View key={si} style={styles.setDetailRow}>
                              <Text style={styles.setDetailLabel}>Set {si + 1}</Text>
                              <Text style={styles.setDetailMeta}>
                                {set.weight ? `${set.weight}kg` : 'BW'}{set.reps ? ` × ${set.reps}` : ''}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.exerciseMeta}>{ex.sets}×{ex.reps}{ex.weight && ex.weight !== '-' ? ` · ${ex.weight}` : ''}</Text>
                        )}
                      </View>
                    ))
                  )
                )}
              </View>

              {!!selectedSession?.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>Notes</Text>
                  <Text style={styles.notesText}>{selectedSession.notes}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Log Workout Modal ────────────────────────────────────────────────── */}
      <Modal visible={logModalVisible} animationType="slide" transparent onRequestClose={closeLogModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.logModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Log Workout</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={styles.logSectionLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {WORKOUT_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selectedCategory?.id === cat.id && styles.categoryChipActive]}
                    onPress={() => handleCategorySelect(cat)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={cat.icon} size={18} color={selectedCategory?.id === cat.id ? Colors.white : Colors.text} />
                    <Text style={[styles.categoryChipText, selectedCategory?.id === cat.id && styles.categoryChipTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedCategory && (
                <>
                  <Text style={[styles.logSectionLabel, { marginTop: 4 }]}>Session Name</Text>
                  <TextInput
                    style={styles.sessionNameInput}
                    value={selectedWorkout}
                    onChangeText={setSelectedWorkout}
                    placeholder="e.g. Chest Day, Leg Day..."
                    placeholderTextColor={Colors.gray}
                  />

                  <Text style={[styles.logSectionLabel, { marginTop: 16 }]}>Exercises</Text>
                  {logExercises.map(ex => (
                    <View key={ex._key} style={styles.editExerciseBlock}>
                      <TouchableOpacity
                        style={styles.exPickerRow}
                        onPress={() => { setInlinePickerKey(inlinePickerKey === ex._key ? null : ex._key); setInlinePickerSearch(''); }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="barbell-outline" size={16} color={ex.name ? Colors.text : Colors.gray} />
                        <Text style={[styles.exPickerText, !ex.name && styles.exPickerPlaceholder]} numberOfLines={1}>
                          {ex.name || 'Select exercise'}
                        </Text>
                        <Ionicons name={inlinePickerKey === ex._key ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray} />
                        <TouchableOpacity onPress={() => removeLogExercise(ex._key)} style={styles.removeExBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={20} color={Colors.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                      {inlinePickerKey === ex._key && (
                        <View style={styles.inlinePicker}>
                          <View style={styles.inlineSearchRow}>
                            <Ionicons name="search-outline" size={16} color={Colors.gray} />
                            <TextInput
                              style={styles.inlineSearchInput}
                              value={inlinePickerSearch}
                              onChangeText={setInlinePickerSearch}
                              placeholder="Search exercises..."
                              placeholderTextColor={Colors.gray}
                              autoFocus
                            />
                            {inlinePickerSearch.length > 0 && (
                              <TouchableOpacity onPress={() => setInlinePickerSearch('')}>
                                <Ionicons name="close-circle" size={16} color={Colors.gray} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <ScrollView style={styles.inlinePickerList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                            {(inlinePickerSearch.trim()
                              ? EXERCISE_LIST.filter(n => n.toLowerCase().includes(inlinePickerSearch.toLowerCase()))
                              : EXERCISE_LIST
                            ).map(name => (
                              <TouchableOpacity
                                key={name}
                                style={styles.inlinePickerItem}
                                onPress={() => {
                                  updateLogExercise(ex._key, 'name', name);
                                  setInlinePickerKey(null);
                                }}
                              >
                                <Text style={styles.inlinePickerItemText}>{name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                      {renderInlineSets(ex, 'log')}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addExerciseBtn} onPress={addLogExercise}>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
                    <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={[styles.modalButtons, { marginTop: 20 }]}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={closeLogModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveBtn, !selectedWorkout && styles.saveBtnDisabled]} onPress={handleLogWorkout}>
                  <Text style={styles.saveBtnText}>Log</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>



    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  viewToggle: {
    flexDirection: 'row', backgroundColor: Colors.cardBackground,
    borderRadius: 10, padding: 3,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  toggleBtnTextActive: { color: '#FFFFFF' },

  // Summary bar
  summaryBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  summaryCard: {
    flex: 1, padding: 12, backgroundColor: Colors.cardBackground,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor,
  },
  summaryLabel: { fontSize: 10, color: Colors.gray, letterSpacing: 0.6 },
  summaryValue: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 110 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, marginTop: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sectionDivider: { flex: 1, height: 1, backgroundColor: Colors.borderColor, marginHorizontal: 10 },
  sectionMeta: { fontSize: 11, color: Colors.gray },

  // Session card
  sessionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.borderColor,
    flexDirection: 'row', overflow: 'hidden',
  },
  cardStripe: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardCategory: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  cardDot: { width: 3, height: 3, borderRadius: 999, backgroundColor: Colors.gray },
  cardTime: { fontSize: 11, color: Colors.gray },
  cardDuration: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  cardDurationUnit: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  sessionName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12, color: Colors.textSecondary },
  prBadge: { marginLeft: 'auto', backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  prBadgeText: { fontSize: 10, color: Colors.green, fontWeight: '700' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: Colors.gray, marginTop: 8, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 82, right: 18,
    backgroundColor: Colors.text,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
  fabText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: Colors.modalBackground, justifyContent: 'flex-end' },
  detailModal: { backgroundColor: Colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%', borderWidth: 1, borderColor: Colors.borderColor },
  logModal: { backgroundColor: Colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.borderColor },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.darkGray, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },

  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailName: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', flex: 1, marginRight: 8 },
  deleteConfirmBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)',
  },
  deleteConfirmText: { flex: 1, fontSize: 13, color: Colors.softRed },
  deleteConfirmBtn: {
    backgroundColor: Colors.softRed, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  deleteConfirmBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  detailNameInput: { borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.background, fontSize: 22, fontWeight: 'bold' },
  detailHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { padding: 6 },
  detailDate: { fontSize: 13, color: Colors.gray, marginBottom: 20 },

  detailSection: { marginBottom: 20 },
  detailSectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.gray, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  exerciseName: { fontSize: 15, color: '#FFFFFF', flex: 1 },
  exerciseMeta: { fontSize: 14, color: Colors.gray },
  notesText: { fontSize: 15, color: Colors.gray, lineHeight: 22 },
  noExercisesText: { color: Colors.gray, fontSize: 14, fontStyle: 'italic' },

  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  exerciseSetCount: { fontSize: 12, color: Colors.gray, fontWeight: '500' },
  setDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 4 },
  setDetailLabel: { fontSize: 12, color: Colors.gray, fontWeight: '600', width: 44 },
  setDetailMeta: { fontSize: 13, color: Colors.text, fontWeight: '500' },

  // Sets modal
  setRow: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderColor },
  setRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  setLabel: { fontSize: 12, fontWeight: '700', color: Colors.gray, textTransform: 'uppercase', letterSpacing: 0.6 },
  setInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  setInput: { flex: 1, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, padding: 10, fontSize: 15, backgroundColor: Colors.cardBackground, color: '#FFFFFF', textAlign: 'center' },
  setMultiply: { fontSize: 18, color: Colors.gray, fontWeight: '600' },
  repsPresetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  presetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.background },
  presetBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText: { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  presetTextActive: { color: '#FFFFFF', fontWeight: '700' },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 10, borderStyle: 'dashed', marginTop: 4, marginBottom: 12 },
  addSetText: { color: Colors.green, fontSize: 14, fontWeight: '500' },
  setsSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.background },
  setsSummaryText: { flex: 1, fontSize: 14, color: Colors.gray },

  editExerciseBlock: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.borderColor },
  editExerciseNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  editNameInput: { flex: 1 },
  removeExBtn: { marginLeft: 8, padding: 2 },
  editExerciseStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editInput: { borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, padding: 8, fontSize: 14, backgroundColor: Colors.cardBackground, color: '#FFFFFF' },
  editSmallInput: { width: 52, textAlign: 'center' },
  editWeightInput: { flex: 1 },
  editSeparator: { color: Colors.gray, fontSize: 16, fontWeight: '600' },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 10, borderStyle: 'dashed', marginTop: 4 },
  addExerciseBtnText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  exPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.borderColor, backgroundColor: Colors.background, marginBottom: 8,
  },
  exPickerText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  exPickerPlaceholder: { color: Colors.gray },
  inlinePicker: { marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderColor, overflow: 'hidden', backgroundColor: Colors.background },
  inlineSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  inlineSearchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  inlinePickerList: { maxHeight: 200 },
  inlinePickerItem: { paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  inlinePickerItemText: { fontSize: 14, color: '#FFFFFF' },

  inlineSetsContainer: { marginTop: 8 },
  swipeHint: { fontSize: 10, color: Colors.gray, textAlign: 'center', marginBottom: 6, letterSpacing: 0.4 },
  inlineSetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, backgroundColor: Colors.background, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8 },
  inlineSetLabel: { fontSize: 12, color: Colors.gray, fontWeight: '600', width: 44 },
  inlineSetInput: { flex: 1, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, fontSize: 14, color: '#FFFFFF', backgroundColor: Colors.background, textAlign: 'center' },
  inlineSetX: { fontSize: 16, color: Colors.gray, fontWeight: '600' },
  inlineAddSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, borderStyle: 'dashed', marginTop: 4 },
  inlineAddSetText: { fontSize: 13, color: Colors.green, fontWeight: '500' },
  swipeDupAction: { backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', width: 64, borderRadius: 8, marginBottom: 4, gap: 4 },
  swipeDelAction: { backgroundColor: Colors.softRed, justifyContent: 'center', alignItems: 'center', width: 64, borderRadius: 8, marginBottom: 4, gap: 4 },
  swipeActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  logSectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.gray, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryChip: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderColor },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChipText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  categoryChipTextActive: { color: Colors.white },

  sessionNameInput: {
    borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 10,
    backgroundColor: Colors.background, padding: 12,
    fontSize: 15, color: '#FFFFFF', marginBottom: 4,
  },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderColor, marginBottom: 4 },
  dropdownValue: { color: '#FFFFFF', fontSize: 15 },
  dropdownPlaceholder: { color: Colors.gray },
  dropdownList: { borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderColor, overflow: 'hidden', marginBottom: 4 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  dropdownItemActive: { backgroundColor: Colors.cardBackground },
  dropdownItemText: { color: '#FFFFFF', fontSize: 15 },
  dropdownItemTextActive: { fontWeight: '600' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.darkGray },
  cancelBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  saveBtn: { backgroundColor: Colors.primary },
  saveBtnText: { color: Colors.white, fontWeight: '600', fontSize: 16 },
  saveBtnDisabled: { opacity: 0.4 },
});

export default WorkoutsScreen;
