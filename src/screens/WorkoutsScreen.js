import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  Modal, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';

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

const WORKOUT_CATEGORIES = [
  {
    id: 'upper',
    label: 'Upper Body',
    icon: 'barbell-outline',
    workouts: ['Upper Body Push', 'Upper Body Pull', 'Chest & Triceps', 'Back & Biceps', 'Shoulders', 'Arms'],
  },
  {
    id: 'lower',
    label: 'Lower Body',
    icon: 'walk-outline',
    workouts: ['Leg Day', 'Quads & Glutes', 'Hamstrings & Calves', 'Glute Focus', 'Calf & Ankle'],
  },
  {
    id: 'full',
    label: 'Full Body',
    icon: 'body-outline',
    workouts: ['Full Body Workout', 'Strength Training', 'Compound Lifts', 'Functional Training'],
  },
  {
    id: 'cardio',
    label: 'Cardio',
    icon: 'heart-outline',
    workouts: ['HIIT Cardio', 'Steady State Cardio', 'Sprint Intervals', 'Jump Rope', 'Cycling'],
  },
  {
    id: 'core',
    label: 'Core',
    icon: 'fitness-outline',
    workouts: ['Core & Abs', 'Plank Circuit', 'Ab Workout', 'Obliques Focus'],
  },
  {
    id: 'flexibility',
    label: 'Flexibility',
    icon: 'leaf-outline',
    workouts: ['Yoga Flow', 'Full Body Stretch', 'Mobility Work', 'Hip Flexor Release'],
  },
];

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

const WorkoutsScreen = () => {
  const [history, setHistory] = useState([]);
  const [collapsedDays, setCollapsedDays] = useState(new Set());
  const [selectedSession, setSelectedSession] = useState(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [workoutDropdownOpen, setWorkoutDropdownOpen] = useState(false);
  const [logExercises, setLogExercises] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editedSession, setEditedSession] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const saved = await StorageService.getWorkoutHistory();
    if (saved.length === 0) {
      for (const session of DEFAULT_SESSIONS) {
        await StorageService.addWorkoutSession(session);
      }
      const seeded = await StorageService.getWorkoutHistory();
      setHistory(seeded);
    } else {
      setHistory(saved);
    }
  };

  const toggleDay = (key) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
  };

  const enterEditMode = () => {
    setEditedSession({
      ...selectedSession,
      exercises: (selectedSession.exercises || []).map((ex, i) => ({
        ...ex,
        _key: i.toString(),
      })),
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditedSession(null);
  };

  const handleSaveEdit = async () => {
    const cleanExercises = (editedSession.exercises || []).map(({ _key, ...ex }) => ({
      ...ex,
      sets: parseInt(ex.sets) || ex.sets,
    }));
    const updates = {
      name: editedSession.name?.trim() || selectedSession.name,
      exercises: cleanExercises,
      exerciseCount: cleanExercises.length,
    };
    const updated = await StorageService.updateWorkoutSession(editedSession.id, updates);
    if (updated) {
      setSelectedSession(updated);
      await loadHistory();
    }
    setEditMode(false);
    setEditedSession(null);
  };

  const updateExercise = (key, field, value) => {
    setEditedSession(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex =>
        ex._key === key ? { ...ex, [field]: value } : ex
      ),
    }));
  };

  const removeExercise = (key) => {
    setEditedSession(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex._key !== key),
    }));
  };

  const addExercise = () => {
    setEditedSession(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        { name: '', sets: '3', reps: '10', weight: '', _key: Date.now().toString() },
      ],
    }));
  };

  const closeLogModal = () => {
    setLogModalVisible(false);
    setSelectedCategory(null);
    setSelectedWorkout('');
    setWorkoutDropdownOpen(false);
    setLogExercises([]);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setSelectedWorkout('');
    setWorkoutDropdownOpen(false);
    setLogExercises([]);
  };

  const addLogExercise = () => {
    setLogExercises(prev => [
      ...prev,
      { name: '', sets: '3', reps: '10', _key: Date.now().toString() },
    ]);
  };

  const updateLogExercise = (key, field, value) => {
    setLogExercises(prev =>
      prev.map(ex => ex._key === key ? { ...ex, [field]: value } : ex)
    );
  };

  const removeLogExercise = (key) => {
    setLogExercises(prev => prev.filter(ex => ex._key !== key));
  };

  const handleLogWorkout = async () => {
    if (!selectedWorkout) {
      Alert.alert('Select a workout', 'Please choose a category and workout first');
      return;
    }
    const cleanExercises = logExercises
      .filter(ex => ex.name.trim())
      .map(({ _key, ...ex }) => ({ ...ex, sets: parseInt(ex.sets) || ex.sets, weight: '' }));
    await StorageService.addWorkoutSession({
      name: selectedWorkout,
      duration: 0,
      exerciseCount: cleanExercises.length,
      caloriesBurned: 0,
      exercises: cleanExercises,
      notes: '',
    });
    await loadHistory();
    closeLogModal();
  };

  const renderSectionHeader = ({ section }) => {
    const isCollapsed = collapsedDays.has(section.key);
    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleDay(section.key)}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionMeta}>
            {section.count} {section.count === 1 ? 'session' : 'sessions'} · {section.totalDuration} min
          </Text>
        </View>
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={Colors.gray}
        />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => setSelectedSession(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardRow}>
        <Text style={styles.sessionName}>{item.name}</Text>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration} min</Text>
        </View>
      </View>
      <Text style={styles.sessionTime}>{formatTime(item.completedAt)}</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="barbell-outline" size={14} color={Colors.gray} />
          <Text style={styles.statText}>
            {item.exerciseCount || item.exercises?.length || 0} exercises
          </Text>
        </View>
        {item.caloriesBurned > 0 && (
          <View style={styles.stat}>
            <Ionicons name="flame-outline" size={14} color={Colors.warning} />
            <Text style={styles.statText}>{item.caloriesBurned} kcal</Text>
          </View>
        )}
        {!!item.notes && (
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={14} color={Colors.gray} />
            <Text style={styles.statText} numberOfLines={1}>{item.notes}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Log</Text>
        <Text style={styles.subtitle}>{history.length} sessions recorded</Text>
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
            <Text style={styles.emptySubtext}>Tap "Log Workout" to add your first session</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      <TouchableOpacity
        style={styles.logButton}
        onPress={() => setLogModalVisible(true)}
      >
        <Text style={styles.logButtonText}>+ Log Workout</Text>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedSession}
        animationType="slide"
        transparent
        onRequestClose={editMode ? cancelEdit : closeDetail}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.detailModal}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Header */}
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
                  <Text style={styles.detailName}>{selectedSession?.name}</Text>
                )}
                <View style={styles.detailHeaderActions}>
                  {editMode ? (
                    <>
                      <TouchableOpacity onPress={handleSaveEdit} style={styles.iconButton}>
                        <Ionicons name="checkmark" size={24} color={Colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={cancelEdit} style={styles.iconButton}>
                        <Ionicons name="close" size={24} color={Colors.gray} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity onPress={enterEditMode} style={styles.iconButton}>
                        <Ionicons name="pencil" size={20} color={Colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={closeDetail} style={styles.iconButton}>
                        <Ionicons name="close" size={24} color={Colors.gray} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {selectedSession && (
                <Text style={styles.detailDate}>
                  {new Date(selectedSession.completedAt).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })} · {formatTime(selectedSession.completedAt)}
                </Text>
              )}

              {/* Exercises */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Exercises</Text>
                {editMode ? (
                  <>
                    {(editedSession?.exercises || []).map(ex => (
                      <View key={ex._key} style={styles.editExerciseBlock}>
                        <View style={styles.editExerciseNameRow}>
                          <TextInput
                            style={[styles.editInput, styles.editNameInput]}
                            value={ex.name}
                            onChangeText={text => updateExercise(ex._key, 'name', text)}
                            placeholder="Exercise name"
                            placeholderTextColor={Colors.gray}
                          />
                          <TouchableOpacity
                            onPress={() => removeExercise(ex._key)}
                            style={styles.removeExBtn}
                          >
                            <Ionicons name="close-circle" size={22} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.editExerciseStatsRow}>
                          <TextInput
                            style={[styles.editInput, styles.editSmallInput]}
                            value={String(ex.sets)}
                            onChangeText={text => updateExercise(ex._key, 'sets', text)}
                            placeholder="Sets"
                            placeholderTextColor={Colors.gray}
                            keyboardType="numeric"
                          />
                          <Text style={styles.editSeparator}>×</Text>
                          <TextInput
                            style={[styles.editInput, styles.editSmallInput]}
                            value={String(ex.reps)}
                            onChangeText={text => updateExercise(ex._key, 'reps', text)}
                            placeholder="Reps"
                            placeholderTextColor={Colors.gray}
                          />
                          <TextInput
                            style={[styles.editInput, styles.editWeightInput]}
                            value={ex.weight === '-' ? '' : (ex.weight || '')}
                            onChangeText={text => updateExercise(ex._key, 'weight', text)}
                            placeholder="Weight"
                            placeholderTextColor={Colors.gray}
                          />
                        </View>
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
                        <Text style={styles.exerciseMeta}>
                          {ex.sets}×{ex.reps}{ex.weight && ex.weight !== '-' ? ` · ${ex.weight}` : ''}
                        </Text>
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

      {/* Log Workout Modal */}
      <Modal
        visible={logModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeLogModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
                    <Ionicons
                      name={cat.icon}
                      size={18}
                      color={selectedCategory?.id === cat.id ? Colors.white : Colors.text}
                    />
                    <Text style={[styles.categoryChipText, selectedCategory?.id === cat.id && styles.categoryChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedCategory && (
                <>
                  <Text style={styles.logSectionLabel}>Workout</Text>
                  <TouchableOpacity
                    style={styles.dropdownHeader}
                    onPress={() => setWorkoutDropdownOpen(prev => !prev)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropdownValue, !selectedWorkout && styles.dropdownPlaceholder]}>
                      {selectedWorkout || 'Select a workout'}
                    </Text>
                    <Ionicons
                      name={workoutDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.gray}
                    />
                  </TouchableOpacity>
                  {workoutDropdownOpen && (
                    <View style={styles.dropdownList}>
                      {selectedCategory.workouts.map(w => (
                        <TouchableOpacity
                          key={w}
                          style={[styles.dropdownItem, selectedWorkout === w && styles.dropdownItemActive]}
                          onPress={() => { setSelectedWorkout(w); setWorkoutDropdownOpen(false); setLogExercises([]); }}
                        >
                          <Text style={[styles.dropdownItemText, selectedWorkout === w && styles.dropdownItemTextActive]}>
                            {w}
                          </Text>
                          {selectedWorkout === w && (
                            <Ionicons name="checkmark" size={16} color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {selectedWorkout && (
                <>
                  <Text style={[styles.logSectionLabel, { marginTop: 20 }]}>Exercises</Text>
                  {logExercises.map(ex => (
                    <View key={ex._key} style={styles.editExerciseBlock}>
                      <View style={styles.editExerciseNameRow}>
                        <TextInput
                          style={[styles.editInput, styles.editNameInput]}
                          value={ex.name}
                          onChangeText={text => updateLogExercise(ex._key, 'name', text)}
                          placeholder="Exercise name"
                          placeholderTextColor={Colors.gray}
                        />
                        <TouchableOpacity onPress={() => removeLogExercise(ex._key)} style={styles.removeExBtn}>
                          <Ionicons name="close-circle" size={22} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.editExerciseStatsRow}>
                        <TextInput
                          style={[styles.editInput, styles.editSmallInput]}
                          value={ex.sets}
                          onChangeText={text => updateLogExercise(ex._key, 'sets', text)}
                          placeholder="Sets"
                          placeholderTextColor={Colors.gray}
                          keyboardType="numeric"
                        />
                        <Text style={styles.editSeparator}>×</Text>
                        <TextInput
                          style={[styles.editInput, styles.editSmallInput]}
                          value={ex.reps}
                          onChangeText={text => updateLogExercise(ex._key, 'reps', text)}
                          placeholder="Reps"
                          placeholderTextColor={Colors.gray}
                        />
                      </View>
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
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveBtn, !selectedWorkout && styles.saveBtnDisabled]}
                  onPress={handleLogWorkout}
                >
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionMeta: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  sessionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  durationBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  durationText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '500',
  },
  sessionTime: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: Colors.gray,
    maxWidth: 140,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  logButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  logButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.modalBackground,
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.darkGray,
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  detailNameInput: {
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    fontSize: 22,
    fontWeight: 'bold',
  },
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  detailDate: {
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 20,
  },
  statsCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 6,
  },
  statCardLabel: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  exerciseName: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  exerciseMeta: {
    fontSize: 14,
    color: Colors.gray,
  },
  notesText: {
    fontSize: 15,
    color: Colors.gray,
    lineHeight: 22,
  },
  noExercisesText: {
    color: Colors.gray,
    fontSize: 14,
    fontStyle: 'italic',
  },
  editExerciseBlock: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  editExerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editNameInput: {
    flex: 1,
  },
  removeExBtn: {
    marginLeft: 8,
    padding: 2,
  },
  editExerciseStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: Colors.cardBackground,
    color: Colors.text,
  },
  editSmallInput: {
    width: 52,
    textAlign: 'center',
  },
  editWeightInput: {
    flex: 1,
  },
  editSeparator: {
    color: Colors.gray,
    fontSize: 16,
    fontWeight: '600',
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 10,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addExerciseBtnText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  logModal: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  logSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryChip: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginBottom: 4,
  },
  dropdownValue: {
    color: Colors.text,
    fontSize: 15,
  },
  dropdownPlaceholder: {
    color: Colors.gray,
  },
  dropdownList: {
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  dropdownItemActive: {
    backgroundColor: Colors.cardBackground,
  },
  dropdownItemText: {
    color: Colors.text,
    fontSize: 15,
  },
  dropdownItemTextActive: {
    fontWeight: '600',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.darkGray,
  },
  cancelBtnText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default WorkoutsScreen;
