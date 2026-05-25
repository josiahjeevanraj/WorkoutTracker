import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, FlatList, TouchableOpacity,
  Modal, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
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

const DEFAULT_SESSIONS = [
  {
    name: 'Leg Day',
    duration: 52,
    exerciseCount: 7,
    caloriesBurned: 380,
    exercises: [
      { name: 'Barbell Squats', sets: 4, reps: '8', weight: '100kg' },
      { name: 'Romanian Deadlift', sets: 3, reps: '10', weight: '80kg' },
      { name: 'Leg Press', sets: 3, reps: '12', weight: '120kg' },
      { name: 'Leg Curls', sets: 3, reps: '12', weight: '40kg' },
      { name: 'Calf Raises', sets: 4, reps: '15', weight: '60kg' },
      { name: 'Walking Lunges', sets: 3, reps: '20', weight: 'Bodyweight' },
      { name: 'Leg Extensions', sets: 3, reps: '15', weight: '35kg' },
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
      { name: 'Jump Rope', sets: 5, reps: '60s', weight: '-' },
      { name: 'Burpees', sets: 4, reps: '15', weight: '-' },
      { name: 'Mountain Climbers', sets: 4, reps: '30s', weight: '-' },
      { name: 'Box Jumps', sets: 3, reps: '10', weight: '-' },
      { name: 'High Knees', sets: 4, reps: '30s', weight: '-' },
      { name: 'Sprints', sets: 6, reps: '20s', weight: '-' },
      { name: 'Jump Squats', sets: 3, reps: '12', weight: '-' },
      { name: 'Plank Hold', sets: 3, reps: '45s', weight: '-' },
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
      { name: 'Bench Press', sets: 4, reps: '6', weight: '90kg' },
      { name: 'Overhead Press', sets: 3, reps: '8', weight: '60kg' },
      { name: 'Incline DB Press', sets: 3, reps: '10', weight: '32kg' },
      { name: 'Lateral Raises', sets: 4, reps: '15', weight: '12kg' },
      { name: 'Tricep Dips', sets: 3, reps: '12', weight: 'Bodyweight' },
      { name: 'Cable Flyes', sets: 3, reps: '15', weight: '15kg' },
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
      { name: 'Plank', sets: 3, reps: '60s', weight: '-' },
      { name: 'Hanging Leg Raises', sets: 3, reps: '12', weight: '-' },
      { name: 'Cable Crunches', sets: 3, reps: '20', weight: '25kg' },
      { name: 'Russian Twists', sets: 3, reps: '30', weight: '10kg' },
      { name: 'Ab Wheel', sets: 3, reps: '10', weight: '-' },
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
      { name: 'Pull-ups', sets: 4, reps: '8', weight: 'Bodyweight' },
      { name: 'Barbell Rows', sets: 4, reps: '8', weight: '80kg' },
      { name: 'Seated Cable Row', sets: 3, reps: '12', weight: '60kg' },
      { name: 'Face Pulls', sets: 3, reps: '15', weight: '20kg' },
      { name: 'Barbell Curls', sets: 3, reps: '10', weight: '40kg' },
      { name: 'Hammer Curls', sets: 3, reps: '12', weight: '16kg' },
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
      { name: 'Deadlift', sets: 4, reps: '5', weight: '130kg' },
      { name: 'Bench Press', sets: 3, reps: '8', weight: '85kg' },
      { name: 'Squats', sets: 3, reps: '8', weight: '90kg' },
      { name: 'Pull-ups', sets: 3, reps: '8', weight: 'Bodyweight' },
      { name: 'Dips', sets: 3, reps: '10', weight: 'Bodyweight' },
      { name: 'Barbell Rows', sets: 3, reps: '10', weight: '70kg' },
      { name: 'Overhead Press', sets: 3, reps: '10', weight: '55kg' },
      { name: 'Farmer Walks', sets: 3, reps: '40m', weight: '40kg' },
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
  const [exPickerVisible, setExPickerVisible] = useState(false);
  const [exPickerTargetKey, setExPickerTargetKey] = useState(null);
  const [exPickerSearch, setExPickerSearch] = useState('');
  const [exPickerContext, setExPickerContext] = useState('log'); // 'log' | 'edit'
  const [setsModalVisible, setSetsModalVisible] = useState(false);
  const [setsModalExName, setSetsModalExName] = useState('');
  const [setsModalTargetKey, setSetsModalTargetKey] = useState(null);
  const [setsModalContext, setSetsModalContext] = useState('log');
  const [setsModalSets, setSetsModalSets] = useState([{ weight: '', reps: '' }]);

  useEffect(() => { loadHistory(true); }, []);

  const loadHistory = async (seed = false) => {
    const [saved, isUnset] = await Promise.all([
      StorageService.getWorkoutHistory(),
      seed ? StorageService.isWorkoutHistoryUnset() : Promise.resolve(false),
    ]);
    if (seed && isUnset) {
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
    const cleanExercises = (editedSession.exercises || []).map(({ _key, setsData, ...ex }) => ({ ...ex, sets: parseInt(ex.sets) || ex.sets }));
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
    setEditedSession(prev => ({ ...prev, exercises: [...prev.exercises, { name: '', sets: '3', reps: '10', weight: '', _key: Date.now().toString() }] }));

  const repsPresets = ['6', '8', '10', '12', '15', '20'];

  const openSetsModal = (exName, targetKey, context, currentEx) => {
    setSetsModalExName(exName);
    setSetsModalTargetKey(targetKey);
    setSetsModalContext(context);
    if (currentEx?.setsData?.length > 0) {
      setSetsModalSets(currentEx.setsData.map(s => ({ weight: s.weight || '', reps: String(s.reps || '') })));
    } else {
      setSetsModalSets([{ weight: '', reps: '' }]);
    }
    setSetsModalVisible(true);
  };

  const updateSetsModalSet = (idx, field, value) =>
    setSetsModalSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const addSetsModalSet = () =>
    setSetsModalSets(prev => [...prev, { weight: prev[prev.length - 1]?.weight || '', reps: '' }]);

  const removeSetsModalSet = (idx) =>
    setSetsModalSets(prev => prev.filter((_, i) => i !== idx));

  const confirmSetsModal = () => {
    const setsData = setsModalSets;
    const setCount = setsData.length;
    const firstSet = setsData[0] || { weight: '', reps: '' };
    const allSameReps = setsData.every(s => s.reps === firstSet.reps);
    const repsDisplay = allSameReps ? (firstSet.reps || '10') : setsData.map(s => s.reps).join('/');
    const weightDisplay = firstSet.weight || '';
    const update = { sets: setCount, reps: repsDisplay, weight: weightDisplay, setsData };
    if (setsModalContext === 'edit') {
      setEditedSession(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => ex._key === setsModalTargetKey ? { ...ex, ...update } : ex),
      }));
    } else {
      setLogExercises(prev => prev.map(ex => ex._key === setsModalTargetKey ? { ...ex, ...update } : ex));
    }
    setSetsModalVisible(false);
  };

  const closeLogModal = () => { setLogModalVisible(false); setSelectedCategory(null); setSelectedWorkout(''); setLogExercises([]); };
  const handleCategorySelect = (cat) => { setSelectedCategory(cat); setSelectedWorkout(cat.label); setLogExercises([]); };
  const addLogExercise = () => setLogExercises(prev => [...prev, { name: '', sets: '3', reps: '10', _key: Date.now().toString() }]);
  const updateLogExercise = (key, field, value) => setLogExercises(prev => prev.map(ex => ex._key === key ? { ...ex, [field]: value } : ex));
  const removeLogExercise = (key) => setLogExercises(prev => prev.filter(ex => ex._key !== key));

  const handleLogWorkout = async () => {
    if (!selectedWorkout) { Alert.alert('Select a workout', 'Please choose a category and workout first'); return; }
    const cleanExercises = logExercises.filter(ex => ex.name.trim()).map(({ _key, setsData, ...ex }) => ({ ...ex, sets: parseInt(ex.sets) || ex.sets }));
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
                          onPress={() => { setExPickerContext('edit'); setExPickerTargetKey(ex._key); setExPickerSearch(''); setExPickerVisible(true); }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="barbell-outline" size={16} color={ex.name ? Colors.text : Colors.gray} />
                          <Text style={[styles.exPickerText, !ex.name && styles.exPickerPlaceholder]} numberOfLines={1}>
                            {ex.name || 'Select exercise'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={Colors.gray} />
                          <TouchableOpacity onPress={() => removeExercise(ex._key)} style={styles.removeExBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={20} color={Colors.error} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.setsSummaryRow}
                          onPress={() => openSetsModal(ex.name || 'Exercise', ex._key, 'edit', ex)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="list-outline" size={15} color={Colors.gray} />
                          <Text style={styles.setsSummaryText}>
                            {ex.sets && ex.reps
                              ? `${ex.sets} set${Number(ex.sets) !== 1 ? 's' : ''} · ${ex.reps} reps${ex.weight && ex.weight !== '-' && ex.weight !== '' ? ` · ${ex.weight}` : ''}`
                              : 'Tap to add sets & reps'}
                          </Text>
                          <Ionicons name="chevron-forward" size={15} color={Colors.gray} />
                        </TouchableOpacity>
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
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <Text style={styles.exerciseMeta}>{ex.sets}×{ex.reps}{ex.weight && ex.weight !== '-' ? ` · ${ex.weight}` : ''}</Text>
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
                        onPress={() => { setExPickerContext('log'); setExPickerTargetKey(ex._key); setExPickerSearch(''); setExPickerVisible(true); }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="barbell-outline" size={16} color={ex.name ? Colors.text : Colors.gray} />
                        <Text style={[styles.exPickerText, !ex.name && styles.exPickerPlaceholder]} numberOfLines={1}>
                          {ex.name || 'Select exercise'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={Colors.gray} />
                        <TouchableOpacity onPress={() => removeLogExercise(ex._key)} style={styles.removeExBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={20} color={Colors.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.setsSummaryRow}
                        onPress={() => openSetsModal(ex.name || 'Exercise', ex._key, 'log', ex)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="list-outline" size={15} color={Colors.gray} />
                        <Text style={styles.setsSummaryText}>
                          {ex.sets && ex.reps
                            ? `${ex.sets} set${Number(ex.sets) !== 1 ? 's' : ''} · ${ex.reps} reps${ex.weight && ex.weight !== '-' && ex.weight !== '' ? ` · ${ex.weight}` : ''}`
                            : 'Tap to add sets & reps'}
                        </Text>
                        <Ionicons name="chevron-forward" size={15} color={Colors.gray} />
                      </TouchableOpacity>
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

      {/* ── Sets Modal ──────────────────────────────────────────────────────── */}
      <Modal visible={setsModalVisible} transparent animationType="slide" onRequestClose={() => setSetsModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.setsModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.setsModalTitle} numberOfLines={2}>{setsModalExName}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
              {setsModalSets.map((set, idx) => (
                <View key={idx} style={styles.setRow}>
                  <View style={styles.setRowHeader}>
                    <Text style={styles.setLabel}>Set {idx + 1}</Text>
                    {setsModalSets.length > 1 && (
                      <TouchableOpacity onPress={() => removeSetsModalSet(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="remove-circle" size={20} color={Colors.softRed} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.setInputsRow}>
                    <TextInput
                      style={styles.setInput}
                      value={set.weight}
                      onChangeText={v => updateSetsModalSet(idx, 'weight', v)}
                      placeholder="kg"
                      placeholderTextColor={Colors.gray}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.setMultiply}>×</Text>
                    <TextInput
                      style={styles.setInput}
                      value={set.reps}
                      onChangeText={v => updateSetsModalSet(idx, 'reps', v)}
                      placeholder="reps"
                      placeholderTextColor={Colors.gray}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.repsPresetRow}>
                    {repsPresets.map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.presetBtn, set.reps === r && styles.presetBtnActive]}
                        onPress={() => updateSetsModalSet(idx, 'reps', r)}
                      >
                        <Text style={[styles.presetText, set.reps === r && styles.presetTextActive]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addSetBtn} onPress={addSetsModalSet}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.green} />
                <Text style={styles.addSetText}>Add Set</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={[styles.modalButtons, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setSetsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveBtn]} onPress={confirmSetsModal}>
                <Text style={styles.saveBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Exercise Picker Modal ───────────────────────────────────────────── */}
      <Modal
        visible={exPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setExPickerVisible(false)}
      >
        <TouchableOpacity style={styles.exPickerBackdrop} activeOpacity={1} onPress={() => setExPickerVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.exPickerSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.exPickerTitle}>Select Exercise</Text>
          <View style={styles.exSearchRow}>
            <Ionicons name="search-outline" size={18} color={Colors.gray} />
            <TextInput
              style={styles.exSearchInput}
              placeholder="Search 150+ exercises..."
              placeholderTextColor={Colors.gray}
              value={exPickerSearch}
              onChangeText={setExPickerSearch}
              autoFocus
              returnKeyType="done"
            />
            {exPickerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setExPickerSearch('')}>
                <Ionicons name="close-circle" size={18} color={Colors.gray} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={exPickerSearch.trim().length > 0
              ? EXERCISE_LIST.filter(n => n.toLowerCase().includes(exPickerSearch.toLowerCase()))
              : EXERCISE_LIST}
            keyExtractor={item => item}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exPickerItem}
                onPress={() => {
                  if (exPickerContext === 'edit') {
                    updateExercise(exPickerTargetKey, 'name', item);
                  } else {
                    updateLogExercise(exPickerTargetKey, 'name', item);
                  }
                  setExPickerVisible(false);
                  setSetsModalExName(item);
                  setSetsModalTargetKey(exPickerTargetKey);
                  setSetsModalContext(exPickerContext);
                  setSetsModalSets([{ weight: '', reps: '' }]);
                  setSetsModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="barbell-outline" size={16} color={Colors.gray} style={{ marginRight: 10 }} />
                <Text style={styles.exPickerItemText}>{item}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.borderColor, marginLeft: 44 }} />}
          />
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

  // Sets modal
  setsModal: { backgroundColor: Colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.borderColor },
  setsModalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
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
  exPickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  exPickerSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderTopColor: Colors.borderColor,
    paddingHorizontal: 18, paddingBottom: 36,
    maxHeight: '75%',
  },
  exPickerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  exSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderColor,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  exSearchInput: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  exPickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 4,
  },
  exPickerItemText: { flex: 1, fontSize: 14, color: '#FFFFFF', fontWeight: '400' },

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
