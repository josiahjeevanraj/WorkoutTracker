import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert, Modal, Animated, Dimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

const { width: SCREEN_W } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import StorageService from '../services/StorageService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const padZ = (n) => String(n).padStart(2, '0');
const toDateKey = (y, m, d) => `${y}-${padZ(m)}-${padZ(d)}`;

const buildGrid = (year, month) => {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
};

const heatColor = (level) => {
  switch (level) {
    case 1: return 'rgba(88,216,219,0.18)';
    case 2: return 'rgba(88,216,219,0.40)';
    case 3: return 'rgba(88,216,219,0.65)';
    case 4: return 'rgba(88,216,219,0.92)';
    default: return 'transparent';
  }
};

const heatTextColor = (level) => (level >= 3 ? '#0B1220' : '#FFFFFF');

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const friendlyDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getWorkoutColor = (workout = '') => {
  const w = workout.toLowerCase();
  if (w.includes('run') || w.includes('cardio') || w.includes('hiit') || w.includes('swim') || w.includes('cycl') || w.includes('walk') || w.includes('row')) return Colors.softRed;
  if (w.includes('bench') || w.includes('press') || w.includes('push') || w.includes('tricep') || w.includes('shoulder')) return Colors.indigo;
  if (w.includes('pull') || w.includes('curl') || w.includes('back') || w.includes('squat') || w.includes('deadlift') || w.includes('leg')) return Colors.text;
  if (w.includes('core') || w.includes('abs') || w.includes('plank')) return Colors.amber;
  return Colors.primary;
};

// ─── Swipeable calendar session card ─────────────────────────────────────────

const SwipeableCalSessionCard = React.memo(({ session, cardRef, onPress, onDuplicate, onDelete }) => {
  const swipeRef = useRef(null);
  const close = () => swipeRef.current?.close();
  const hasPR = session.notes?.toLowerCase().includes('pr');
  const exCount = session.exerciseCount || session.exercises?.length || 0;

  const renderLeftActions = () => (
    <TouchableOpacity
      style={s.sessionSwipeDupAction}
      onPress={() => { close(); onDuplicate(session); }}
      activeOpacity={0.85}
    >
      <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
      <Text style={s.swipeActionText}>Dup</Text>
    </TouchableOpacity>
  );

  const renderRightActions = () => (
    <TouchableOpacity
      style={s.sessionSwipeDelAction}
      onPress={() => { close(); onDelete(session.id); }}
      activeOpacity={0.85}
    >
      <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
      <Text style={s.swipeActionText}>Del</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        ref={cardRef}
        style={s.sessionCard}
        onPress={() => onPress(session, session.id)}
        activeOpacity={0.88}
      >
        <View style={s.cardTopRow}>
          <Text style={s.cardTime}>{formatTime(session.completedAt)}</Text>
          {hasPR && <View style={s.prBadge}><Text style={s.prBadgeText}>NEW PR</Text></View>}
        </View>
        <Text style={s.sessionCardName}>{session.name}</Text>
        {exCount > 0 && (
          <Text style={s.cardExCount}>{exCount} exercise{exCount !== 1 ? 's' : ''}</Text>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const CalendarScreen = ({ embedded = false, sessions = [], onEditSession, onSessionDeleted, onLogWorkout }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState({ caloriesConsumed: '', caloriesBurned: '', weight: '', workouts: [] });
  const [showWorkoutSelector, setShowWorkoutSelector] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [customWorkoutInput, setCustomWorkoutInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [strengthInput, setStrengthInput] = useState({ sets: [] });
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const cardRefs = useRef({});

  const workoutCategories = {
    'Upper Body Push': ['Push-ups','Bench press (barbell)','Bench press (dumbbell)','Incline bench press','Overhead press','Shoulder press (dumbbell)','Arnold press','Lateral raises','Front raises','Tricep dips','Close-grip bench press','Tricep pushdowns','Overhead tricep extension'],
    'Upper Body Pull': ['Pull-ups','Chin-ups','Lat pulldowns','Seated cable rows','Bent-over barbell rows','T-bar rows','One-arm dumbbell rows','Face pulls','Barbell curls','Dumbbell curls','Hammer curls','Preacher curls','Cable curls'],
    'Lower Body': ['Squats (bodyweight)','Back squats (barbell)','Front squats','Bulgarian split squats','Lunges','Walking lunges','Deadlifts (conventional)','Romanian deadlifts','Hip thrusts','Glute bridges','Leg press','Leg extensions','Leg curls','Calf raises (standing)','Calf raises (seated)'],
    'Core & Abs': ['Planks','Side planks','Crunches','Bicycle crunches','Russian twists','Mountain climbers','Dead bugs','Hanging knee raises','Leg raises','Sit-ups','Ab wheel rollouts'],
    'Compound Movements': ['Burpees','Thrusters','Turkish get-ups','Clean and press','Farmer\'s walks','Bear crawls','Renegade rows'],
    'Machine Exercises': ['Cable crossovers','Pec deck flyes','Machine shoulder press','Lat pulldown variations','Cable bicep curls','Cable tricep extensions','Leg press variations','Smith machine squats'],
    'Functional & Bodyweight': ['Jump squats','Pistol squats','Wall sits','Box jumps','Pike push-ups','Diamond push-ups','Pull-up variations','Dip variations','Bodyweight rows'],
    'Cardio': ['Running (treadmill)','Running (outdoor)','Walking (brisk)','Cycling (stationary)','Cycling (outdoor)','Elliptical','Rowing machine','Jump rope','HIIT','Swimming','Dancing','Kickboxing'],
    'Team Sports': ['Basketball','Soccer','Volleyball','American Football','Baseball','Hockey','Rugby'],
    'Racquet Sports': ['Tennis','Badminton','Squash','Table tennis','Pickleball','Racquetball'],
    'Individual Sports': ['Golf','Swimming','Track and field','Gymnastics','Martial arts','Boxing','Rock climbing','Skiing/Snowboarding'],
    'Water Sports': ['Water polo','Diving','Sailing','Kayaking','Paddleboarding'],
  };

  const durationPresets = ['15','20','30','45','60','75','90','120'];
  const repsPresets = ['6','8','10','12','15','20'];

  const [fitnessData, setFitnessData] = useState({});

  useEffect(() => {
    StorageService.getFitnessData().then(data => setFitnessData(data)).catch(console.error);
  }, []);

  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (s.completedAt) {
        const d = new Date(s.completedAt);
        const key = toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
        if (!map[key]) map[key] = [];
        map[key].push(s);
      }
    });
    return map;
  }, [sessions]);

  const getIntensity = (dateKey) => {
    const n = sessionsByDate[dateKey]?.length || 0;
    if (n === 0) return 0;
    if (n === 1) return 2;
    if (n === 2) return 3;
    return 4;
  };

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // ─── Edit handlers ───────────────────────────────────────────────────────────
  const startEditing = () => {
    if (!selectedDate) { Alert.alert('No Date Selected', 'Please select a date first.'); return; }
    const existing = fitnessData[selectedDate];
    setEditingData(existing ? {
      caloriesConsumed: existing.caloriesConsumed.toString(),
      caloriesBurned: existing.caloriesBurned.toString(),
      weight: existing.weight ? existing.weight.toString() : '',
      workouts: [...existing.workouts],
    } : { caloriesConsumed: '', caloriesBurned: '', weight: '', workouts: [] });
    setIsEditing(true);
  };

  const saveData = () => {
    const updated = {
      ...fitnessData,
      [selectedDate]: {
        caloriesConsumed: parseInt(editingData.caloriesConsumed) || 0,
        caloriesBurned: parseInt(editingData.caloriesBurned) || 0,
        weight: editingData.weight ? parseFloat(editingData.weight) : null,
        workouts: editingData.workouts.filter(w => w.trim()),
      },
    };
    setFitnessData(updated);
    StorageService.saveFitnessData(updated).catch(console.error);
    setIsEditing(false); setShowWorkoutSelector(false); setExpandedCategories({});
    Alert.alert('Success', 'Data saved!');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingData({ caloriesConsumed: '', caloriesBurned: '', weight: '', workouts: [] });
    setShowWorkoutSelector(false); setExpandedCategories({}); setCustomWorkoutInput(''); setSearchQuery('');
  };

  const deleteData = () => {
    Alert.alert('Delete Data', `Delete all data for ${selectedDate}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        const newData = { ...fitnessData };
        delete newData[selectedDate];
        setFitnessData(newData);
        StorageService.saveFitnessData(newData).catch(console.error);
        setIsEditing(false);
      }},
    ]);
  };

  // ─── Workout handlers ────────────────────────────────────────────────────────
  const toggleCategory = (cat) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  const getFilteredWorkouts = () => {
    if (!searchQuery.trim()) return workoutCategories;
    const filtered = {};
    Object.entries(workoutCategories).forEach(([cat, ws]) => {
      const f = ws.filter(w => w.toLowerCase().includes(searchQuery.toLowerCase()));
      if (f.length > 0) filtered[cat] = f;
    });
    return filtered;
  };

  React.useEffect(() => {
    if (searchQuery.trim()) {
      const f = getFilteredWorkouts();
      setExpandedCategories(Object.fromEntries(Object.keys(f).map(k => [k, true])));
    }
  }, [searchQuery]);

  const handleWorkoutSelection = (workout, category) => {
    const cardioCategories = ['Cardio','Team Sports','Racquet Sports','Individual Sports','Water Sports'];
    const strengthCategories = ['Upper Body Push','Upper Body Pull','Lower Body','Core & Abs','Compound Movements','Machine Exercises','Functional & Bodyweight'];
    if (cardioCategories.includes(category)) {
      setSelectedExercise(workout); setDurationInput(''); setShowDurationModal(true);
    } else if (strengthCategories.includes(category)) {
      setSelectedExercise(workout); setStrengthInput({ sets: [{ weight: '', reps: '' }] }); setShowStrengthModal(true);
    } else {
      addWorkout(workout);
    }
  };

  const addWorkoutWithDuration = () => {
    if (!durationInput.trim()) { Alert.alert('Missing Duration', 'Please enter the duration.'); return; }
    addWorkout(`${selectedExercise} - ${durationInput} mins`);
    setShowDurationModal(false); setDurationInput(''); setSelectedExercise('');
  };

  const addSet = () => setStrengthInput(prev => ({ ...prev, sets: [...prev.sets, { weight: '', reps: '' }] }));
  const removeSet = (i) => setStrengthInput(prev => ({ ...prev, sets: prev.sets.filter((_, idx) => idx !== i) }));
  const updateSet = (i, field, value) => setStrengthInput(prev => ({ ...prev, sets: prev.sets.map((s, idx) => idx === i ? { ...s, [field]: value } : s) }));

  const addStrengthWorkout = () => {
    const valid = strengthInput.sets.filter(s => s.reps.trim());
    if (!valid.length) { Alert.alert('Missing Data', 'Please enter reps for at least one set.'); return; }
    const sets = valid.map((s, i) => `Set ${i + 1}: ${s.weight.trim() ? `${s.weight}kg x ${s.reps}` : s.reps}`).join(', ');
    addWorkout(`${selectedExercise} - ${sets}`);
    setShowStrengthModal(false); setStrengthInput({ sets: [] }); setSelectedExercise('');
  };

  const addWorkout = (workout) => {
    setEditingData(prev => ({ ...prev, workouts: [...prev.workouts, workout] }));
    setShowWorkoutSelector(false); setCustomWorkoutInput(''); setSearchQuery('');
  };
  const addCustomWorkout = () => { if (customWorkoutInput.trim()) addWorkout(customWorkoutInput.trim()); };
  const removeWorkout = (i) => setEditingData(prev => ({ ...prev, workouts: prev.workouts.filter((_, idx) => idx !== i) }));

  const getYears = () => {
    const years = []; const base = new Date().getFullYear();
    for (let y = base - 5; y <= base + 2; y++) years.push(y);
    return years;
  };

  // ─── Card expansion ──────────────────────────────────────────────────────────
  const openCard = (session, id) => {
    const ref = cardRefs.current[id];
    if (!ref) return;
    ref.measure((x, y, width, height, pageX, pageY) => {
      setExpandedCard({ session, rect: { x: pageX, y: pageY, width, height } });
      expandAnim.setValue(0);
      Animated.spring(expandAnim, { toValue: 1, useNativeDriver: false, tension: 55, friction: 11 }).start();
    });
  };

  const closeExpansion = () => {
    Animated.spring(expandAnim, { toValue: 0, useNativeDriver: false, tension: 65, friction: 12 })
      .start(() => setExpandedCard(null));
  };

  const handleDeleteFromExpansion = () => {
    Alert.alert('Delete Workout', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const id = expandedCard?.session?.id;
        if (!id) return;
        closeExpansion();
        await StorageService.deleteWorkoutSession(id);
        onSessionDeleted?.();
      }},
    ]);
  };

  const handleDeleteSession = async (id) => {
    await StorageService.deleteWorkoutSession(id);
    onSessionDeleted?.();
  };

  const handleDuplicateSession = async (session) => {
    const { id, ...rest } = session;
    const origTime = new Date(session.completedAt).getTime();
    await StorageService.addWorkoutSession({ ...rest, completedAt: new Date(origTime + 1000).toISOString() });
    onSessionDeleted?.();
  };

  // ─── Day detail ──────────────────────────────────────────────────────────────
  const renderDayDetail = () => {
    if (!selectedDate) return (
      <View style={s.noDataContainer}>
        <Ionicons name="calendar-outline" size={48} color={Colors.gray} />
        <Text style={s.noDataText}>Select a date to view sessions</Text>
      </View>
    );

    const dayData = fitnessData[selectedDate];
    const daySessions = sessionsByDate[selectedDate] || [];

    return (
      <View>
        {/* Day header */}
        <View style={s.dayHeader}>
          <View>
            <Text style={s.dayTitle}>{friendlyDate(selectedDate)}</Text>
            <Text style={s.daySubtitle}>
              {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
              {dayData?.weight ? ` · ${dayData.weight} kg` : ''}
            </Text>
          </View>
        </View>

        {/* Energy compact row */}
        {dayData && (dayData.caloriesConsumed > 0 || dayData.caloriesBurned > 0) && (
          <View style={s.energyCompact}>
            <Ionicons name="flame-outline" size={13} color={Colors.softRed} />
            <Text style={s.energyCompactText}>
              {dayData.caloriesConsumed > 0 ? `${dayData.caloriesConsumed.toLocaleString()} in` : ''}
              {dayData.caloriesConsumed > 0 && dayData.caloriesBurned > 0 ? '  ·  ' : ''}
              {dayData.caloriesBurned > 0 ? `${dayData.caloriesBurned.toLocaleString()} out` : ''}
            </Text>
          </View>
        )}

        {/* Session cards */}
        {daySessions.length === 0 ? (
          <View style={s.noSessionsBox}>
            <Text style={s.noSessionsText}>No sessions on this day</Text>
            <TouchableOpacity onPress={startEditing} style={[s.addDataBtn, { marginTop: 12 }]}>
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={s.addDataBtnText}>Add Data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          daySessions.map(session => (
            <SwipeableCalSessionCard
              key={session.id}
              session={session}
              cardRef={ref => { cardRefs.current[session.id] = ref; }}
              onPress={openCard}
              onDuplicate={handleDuplicateSession}
              onDelete={handleDeleteSession}
            />
          ))
        )}

        {/* Log Workout button */}
        {onLogWorkout && (
          <TouchableOpacity style={s.logWorkoutBtn} onPress={() => onLogWorkout(selectedDate)} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={s.logWorkoutBtnText}>Log Workout</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── Edit form ───────────────────────────────────────────────────────────────
  const renderEditForm = () => {
    const daySessions = sessionsByDate[selectedDate] || [];
    return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.editHeader}>
        <Text style={s.editTitle}>Edit {friendlyDate(selectedDate)}</Text>
        <TouchableOpacity onPress={cancelEditing}><Ionicons name="close" size={24} color={Colors.gray} /></TouchableOpacity>
      </View>

      {daySessions.length > 0 && (
        <View style={[s.sessionsCard, { marginBottom: 20 }]}>
          <Text style={s.sessionsTitle}>SESSIONS</Text>
          {daySessions.map((session, i) => {
            const exercises = session.exercises || [];
            return (
              <View key={session.id || i} style={i > 0 && { borderTopWidth: 1, borderTopColor: Colors.borderColor }}>
                <View style={s.sessionRow}>
                  <View style={[s.sessionStripe, { backgroundColor: getWorkoutColor(session.name || '') }]} />
                  <View style={s.sessionInfo}>
                    <Text style={s.sessionName} numberOfLines={1}>{session.name}</Text>
                    <Text style={s.sessionSubText}>
                      {exercises.length > 0 ? `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}` : 'No exercises'}
                      {session.duration > 0 ? ` · ${session.duration} min` : ''}
                    </Text>
                  </View>
                </View>
                {exercises.length > 0 && (
                  <View style={s.exerciseList}>
                    {exercises.map((ex, ei) => (
                      <View key={ei} style={s.exerciseItem}>
                        <View style={[s.exDot, { backgroundColor: getWorkoutColor(session.name || '') }]} />
                        <Text style={s.exName} numberOfLines={1}>{ex.name}</Text>
                        <Text style={s.exMeta}>
                          {Array.isArray(ex.sets)
                            ? `${ex.sets.length} set${ex.sets.length !== 1 ? 's' : ''}${ex.sets[0]?.weight ? ` · ${ex.sets[0].weight}${ex.sets[0].unit || 'kg'}` : ''}${ex.sets[0]?.reps ? ` × ${ex.sets[0].reps}` : ''}`
                            : `${ex.sets}×${ex.reps}${ex.weight && ex.weight !== '-' && ex.weight !== '' ? ` · ${ex.weight}` : ''}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {[
        { label: 'Calories Consumed', field: 'caloriesConsumed', placeholder: 'e.g. 2200', keyboard: 'numeric' },
        { label: 'Calories Burned',   field: 'caloriesBurned',   placeholder: 'e.g. 450',  keyboard: 'numeric' },
        { label: 'Weight (kg)',       field: 'weight',           placeholder: 'e.g. 74.2', keyboard: 'decimal-pad' },
      ].map(({ label, field, placeholder, keyboard }) => (
        <View key={field} style={s.inputGroup}>
          <Text style={s.inputLabel}>{label}</Text>
          <TextInput
            style={s.input} placeholderTextColor={Colors.gray} placeholder={placeholder}
            keyboardType={keyboard}
            value={editingData[field]}
            onChangeText={text => setEditingData(prev => ({ ...prev, [field]: text }))}
          />
        </View>
      ))}

      <View style={s.inputGroup}>
        <View style={s.workoutsHeader}>
          <Text style={s.inputLabel}>Workouts</Text>
          {!showWorkoutSelector && (
            <TouchableOpacity onPress={() => setShowWorkoutSelector(true)}><Ionicons name="add-circle" size={24} color={Colors.green} /></TouchableOpacity>
          )}
        </View>
        {editingData.workouts.map((w, i) => (
          <View key={i} style={s.workoutItem}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
            <Text style={s.workoutItemText} numberOfLines={2}>{w}</Text>
            <TouchableOpacity onPress={() => removeWorkout(i)}><Ionicons name="remove-circle" size={22} color={Colors.softRed} /></TouchableOpacity>
          </View>
        ))}
        {editingData.workouts.length === 0 && !showWorkoutSelector && (
          <TouchableOpacity onPress={() => setShowWorkoutSelector(true)} style={s.addWorkoutPrompt}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.gray} />
            <Text style={s.addWorkoutText}>Add a workout</Text>
          </TouchableOpacity>
        )}
        {showWorkoutSelector && renderWorkoutSelector()}
      </View>

      <View style={{ gap: 10, marginTop: 20 }}>
        <TouchableOpacity style={s.saveButton} onPress={saveData}>
          <Text style={s.saveButtonText}>Save Data</Text>
        </TouchableOpacity>
        {fitnessData[selectedDate] && (
          <TouchableOpacity style={s.deleteButton} onPress={deleteData}>
            <Text style={s.deleteButtonText}>Delete Data</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderDurationModal()}
      {renderStrengthModal()}
    </ScrollView>
  );
  };

  const renderWorkoutSelector = () => {
    const filtered = getFilteredWorkouts();
    return (
      <View style={s.workoutSelectorContainer}>
        <View style={s.selectorHeader}>
          <Text style={s.selectorTitle}>Select Workout</Text>
          <TouchableOpacity onPress={() => { setShowWorkoutSelector(false); setSearchQuery(''); }}>
            <Ionicons name="close-circle" size={22} color={Colors.gray} />
          </TouchableOpacity>
        </View>
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={18} color={Colors.gray} />
          <TextInput style={s.searchInput} placeholder="Search workouts..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={Colors.gray} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={Colors.gray} /></TouchableOpacity>}
        </View>
        <View style={s.customRow}>
          <TextInput style={s.customInput} placeholder="Custom workout (e.g. Hiking - 90 mins)" value={customWorkoutInput} onChangeText={setCustomWorkoutInput} placeholderTextColor={Colors.gray} />
          <TouchableOpacity onPress={addCustomWorkout} style={[s.customAddBtn, !customWorkoutInput.trim() && { opacity: 0.4 }]} disabled={!customWorkoutInput.trim()}>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          {Object.entries(filtered).map(([cat, ws]) => (
            <View key={cat} style={s.categorySection}>
              <TouchableOpacity style={s.categoryHeader} onPress={() => toggleCategory(cat)}>
                <Text style={s.categoryTitle}>{cat}</Text>
                <Text style={s.categoryCount}>({ws.length})</Text>
                <Ionicons name={expandedCategories[cat] ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
              </TouchableOpacity>
              {expandedCategories[cat] && ws.map((w, i) => (
                <TouchableOpacity key={i} style={s.workoutOption} onPress={() => handleWorkoutSelection(w, cat)}>
                  <Text style={s.workoutOptionText}>{w}</Text>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.text} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDurationModal = () => (
    <Modal visible={showDurationModal} transparent animationType="fade" onRequestClose={() => setShowDurationModal(false)}>
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          <Text style={s.modalTitle}>{selectedExercise}</Text>
          <Text style={s.modalSubtitle}>Quick select:</Text>
          <View style={s.presetRow}>
            {durationPresets.map(d => (
              <TouchableOpacity key={d} style={[s.presetBtn, durationInput === d && s.presetBtnActive]} onPress={() => setDurationInput(d)}>
                <Text style={[s.presetText, durationInput === d && s.presetTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.modalSubtitle}>Custom:</Text>
          <View style={s.durationInputRow}>
            <TextInput style={s.durationInput} value={durationInput} onChangeText={setDurationInput} placeholder="mins" keyboardType="numeric" placeholderTextColor={Colors.gray} autoFocus />
            <Text style={s.durationUnit}>mins</Text>
          </View>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowDurationModal(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.modalAddBtn, !durationInput.trim() && { opacity: 0.4 }]} onPress={addWorkoutWithDuration} disabled={!durationInput.trim()}><Text style={s.modalAddText}>Add</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderStrengthModal = () => (
    <Modal visible={showStrengthModal} transparent animationType="fade" onRequestClose={() => setShowStrengthModal(false)}>
      <View style={s.modalOverlay}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{selectedExercise}</Text>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {strengthInput.sets.map((set, idx) => (
                <View key={idx} style={s.setRow}>
                  <Text style={s.setLabel}>Set {idx + 1}:</Text>
                  <View style={s.setInputs}>
                    <TextInput style={s.setInput} value={set.weight} onChangeText={v => updateSet(idx, 'weight', v)} placeholder="kg" keyboardType="numeric" placeholderTextColor={Colors.gray} />
                    <Text style={s.multiplySign}>×</Text>
                    <TextInput style={s.setInput} value={set.reps} onChangeText={v => updateSet(idx, 'reps', v)} placeholder="reps" keyboardType="numeric" placeholderTextColor={Colors.gray} />
                    {strengthInput.sets.length > 1 && <TouchableOpacity onPress={() => removeSet(idx)}><Ionicons name="remove-circle" size={22} color={Colors.softRed} /></TouchableOpacity>}
                  </View>
                  <View style={s.repsPresets}>
                    {repsPresets.map(r => (
                      <TouchableOpacity key={r} style={[s.presetBtn, set.reps === r && s.presetBtnActive]} onPress={() => updateSet(idx, 'reps', r)}>
                        <Text style={[s.presetText, set.reps === r && s.presetTextActive]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.addSetBtn} onPress={addSet}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.green} />
                <Text style={s.addSetText}>Add Set</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowStrengthModal(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalAddBtn, strengthInput.sets.filter(s => s.reps.trim()).length === 0 && { opacity: 0.4 }]} onPress={addStrengthWorkout}><Text style={s.modalAddText}>Add Exercise</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // ─── Calendar grid ────────────────────────────────────────────────────────────
  const grid = buildGrid(currentYear, currentMonth);
  const today = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} onLayout={e => setContainerHeight(e.nativeEvent.layout.height)}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Calendar header */}
        <View style={[s.calHeader, embedded && { paddingTop: 8 }]}>
          <View>
            <Text style={s.calYear}>{currentYear}</Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(true)}>
              <Text style={s.calMonth}>{MONTH_NAMES[currentMonth - 1]}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.calNavBtns}>
            <TouchableOpacity style={s.calNavBtn} onPress={prevMonth}>
              <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.calNavBtn} onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Heatmap grid */}
        <View style={s.calGrid}>
          <View style={s.calDayHeaders}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <Text key={i} style={s.calDayHeader}>{d}</Text>
            ))}
          </View>
          {Array.from({ length: Math.ceil(grid.length / 7) }, (_, ri) => {
            const rowCells = grid.slice(ri * 7, ri * 7 + 7);
            while (rowCells.length < 7) rowCells.push(null);
            return (
            <View key={ri} style={s.calRow}>
              {rowCells.map((day, di) => {
                if (!day) return <View key={di} style={s.calCell} />;
                const dateKey = toDateKey(currentYear, currentMonth, day);
                const intensity = getIntensity(dateKey);
                const isSelected = dateKey === selectedDate;
                const isToday = dateKey === todayKey;
                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      s.calCell,
                      { backgroundColor: isSelected ? 'transparent' : heatColor(intensity) },
                      isSelected && { borderWidth: 2, borderColor: Colors.text },
                      isToday && !isSelected && { borderWidth: 1, borderColor: 'rgba(88,216,219,0.5)' },
                    ]}
                    onPress={() => { setSelectedDate(dateKey); setIsEditing(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      s.calCellText,
                      { color: intensity >= 3 && !isSelected ? '#0B1220' : isSelected ? Colors.text : Colors.textSecondary },
                      (intensity >= 3 || isSelected) && { fontWeight: '700' },
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            );
          })}
        </View>

        {/* Day content */}
        <View style={s.dayContent}>
          {isEditing ? renderEditForm() : renderDayDetail()}
        </View>

      </ScrollView>

      {/* Expanded card (iOS-style hero) */}
      {expandedCard && (() => {
        const { session, rect } = expandedCard;
        const animLeft   = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [rect.x, 0] });
        const animTop    = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [rect.y, 0] });
        const animWidth  = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [rect.width, SCREEN_W] });
        const animHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [rect.height, containerHeight] });
        const animRadius = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
        const contentOp  = expandAnim.interpolate({ inputRange: [0.45, 1], outputRange: [0, 1] });
        const backdropOp = expandAnim.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1] });
        const exercises  = session.exercises || [];
        return (
          <>
            <Animated.View style={[s.expandBackdrop, { opacity: backdropOp }]} pointerEvents="auto">
              <TouchableOpacity style={{ flex: 1 }} onPress={closeExpansion} activeOpacity={1} />
            </Animated.View>
            <Animated.View style={[s.expandedCard, {
              left: animLeft, top: animTop, width: animWidth, height: animHeight, borderRadius: animRadius,
            }]}>
              <Animated.View style={[{ flex: 1 }, { opacity: contentOp }]}>
                <View style={s.expandHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.expandTime}>
                      {new Date(session.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {' · '}{formatTime(session.completedAt)}
                    </Text>
                    <Text style={s.expandName}>{session.name}</Text>
                  </View>
                  <TouchableOpacity onPress={closeExpansion} style={s.expandCloseBtn}>
                    <Ionicons name="close" size={20} color={Colors.gray} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={s.expandScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
                  {exercises.length === 0 ? (
                    <Text style={s.noExercisesText}>No exercises recorded</Text>
                  ) : exercises.map((ex, i) => (
                    <View key={i} style={s.expandExercise}>
                      <View style={s.expandExHeader}>
                        <Text style={s.expandExName}>{ex.name}</Text>
                        {Array.isArray(ex.sets) && (
                          <Text style={s.expandExSetCount}>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</Text>
                        )}
                      </View>
                      {Array.isArray(ex.sets) && ex.sets.map((set, si) => (
                        <View key={si} style={s.expandSetRow}>
                          <Text style={s.expandSetLabel}>Set {si + 1}</Text>
                          <Text style={s.expandSetMeta}>
                            {set.weight ? `${set.weight}${set.unit || 'kg'}` : 'BW'}{set.reps ? ` × ${set.reps}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  {!!session.notes && (
                    <View style={s.expandNotesBlock}>
                      <Text style={s.expandNotesLabel}>Notes</Text>
                      <Text style={s.expandNotes}>{session.notes}</Text>
                    </View>
                  )}
                </ScrollView>
                <View style={s.expandActions}>
                  <TouchableOpacity style={s.expandDeleteBtn} onPress={handleDeleteFromExpansion}>
                    <Ionicons name="trash-outline" size={18} color={Colors.softRed} />
                    <Text style={s.expandDeleteText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.expandEditBtn} onPress={() => { closeExpansion(); onEditSession?.(session); }}>
                    <Ionicons name="pencil" size={18} color="#FFFFFF" />
                    <Text style={s.expandEditText}>Edit Workout</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </Animated.View>
          </>
        );
      })()}

      {/* Year / month pickers */}
      <Modal visible={showYearPicker} transparent animationType="fade" onRequestClose={() => setShowYearPicker(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.pickerModal, { backgroundColor: Colors.cardBackground, borderColor: Colors.borderColor }]}>
            <View style={s.pickerHeader}>
              <Text style={[s.pickerTitle, { color: '#FFFFFF' }]}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}><Ionicons name="close-circle" size={26} color={Colors.gray} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getYears().map(y => (
                <TouchableOpacity key={y} style={[s.pickerOption, y === currentYear && { backgroundColor: Colors.primary }]} onPress={() => { setCurrentYear(y); setShowYearPicker(false); }}>
                  <Text style={[s.pickerOptionText, { color: y === currentYear ? '#FFFFFF' : Colors.textSecondary }, y === currentYear && { fontWeight: 'bold' }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.pickerModal, { backgroundColor: Colors.cardBackground, borderColor: Colors.borderColor }]}>
            <View style={s.pickerHeader}>
              <Text style={[s.pickerTitle, { color: '#FFFFFF' }]}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}><Ionicons name="close-circle" size={26} color={Colors.gray} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MONTH_NAMES.map((m, idx) => (
                <TouchableOpacity key={idx} style={[s.pickerOption, idx + 1 === currentMonth && { backgroundColor: Colors.primary }]} onPress={() => { setCurrentMonth(idx + 1); setShowMonthPicker(false); }}>
                  <Text style={[s.pickerOptionText, { color: idx + 1 === currentMonth ? '#FFFFFF' : Colors.textSecondary }, idx + 1 === currentMonth && { fontWeight: 'bold' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Calendar header
  calHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8,
  },
  calYear: { fontSize: 13, color: Colors.gray },
  calMonth: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  calNavBtns: { flexDirection: 'row', gap: 6 },
  calNavBtn: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderColor,
    justifyContent: 'center', alignItems: 'center',
  },

  // Calendar grid
  calGrid: { marginHorizontal: 18, marginBottom: 0 },
  calDayHeaders: { flexDirection: 'row', marginBottom: 6 },
  calDayHeader: { flex: 1, textAlign: 'center', fontSize: 10, color: Colors.gray, fontWeight: '600' },
  calRow: { flexDirection: 'row', marginBottom: 2 },
  calCell: {
    width: '14.285714%', aspectRatio: 1,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  calCellText: { fontSize: 12, fontWeight: '500' },

  legendRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 8 },
  legendLabel: { fontSize: 10, color: Colors.gray },
  legendDot: { width: 12, height: 12, borderRadius: 3 },

  // Day content
  dayContent: { paddingHorizontal: 20, paddingTop: 12 },

  noDataContainer: { alignItems: 'center', paddingVertical: 16 },
  noDataText: { fontSize: 15, color: Colors.gray, marginTop: 12, textAlign: 'center' },
  addDataBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, marginTop: 20 },
  addDataBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Day detail
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  daySubtitle: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  editIconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },

  // Energy card
  energyCard: { backgroundColor: Colors.cardBackground, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  energyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  energyLabel: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.6 },
  energyNetRow: { flexDirection: 'row', alignItems: 'baseline' },
  energyNetValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  energyNetUnit: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  energyBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 8 },
  energyBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.text, borderRadius: 4 },
  energyBarFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  energyBarLabel: { fontSize: 10, color: Colors.gray },
  energyBarValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Sessions card
  sessionsCard: { backgroundColor: Colors.cardBackground, borderRadius: 14, padding: 14, borderWidth: 1 },
  sessionsTitle: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.6, marginBottom: 10 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  sessionStripe: { width: 6, height: 36, borderRadius: 3 },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  sessionDuration: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  sessionSubText: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  exerciseList: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  exerciseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  exDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  exName: { flex: 1, fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
  exMeta: { fontSize: 12, color: Colors.gray, fontWeight: '500' },

  // Edit form
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  editTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: Colors.cardBackground, color: '#FFFFFF' },
  workoutsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  workoutItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: Colors.cardBackground, borderRadius: 10, marginBottom: 8 },
  workoutItemText: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  addWorkoutPrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 10, borderStyle: 'dashed' },
  addWorkoutText: { fontSize: 15, color: Colors.gray },
  saveButton: { backgroundColor: Colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  deleteButton: { backgroundColor: Colors.softRed, padding: 15, borderRadius: 10, alignItems: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // Workout selector
  workoutSelectorContainer: { marginTop: 10, backgroundColor: Colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderColor, overflow: 'hidden' },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  selectorTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  searchInput: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  customInput: { flex: 1, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: Colors.cardBackground, color: '#FFFFFF' },
  customAddBtn: { backgroundColor: Colors.green, padding: 10, borderRadius: 8 },
  categorySection: { borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8, backgroundColor: Colors.background },
  categoryTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  categoryCount: { fontSize: 12, color: Colors.gray },
  workoutOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  workoutOptionText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: Colors.modalBackground, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 20, width: '88%', maxHeight: '85%', borderWidth: 1, borderColor: Colors.borderColor },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 14, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: Colors.gray, marginTop: 8, marginBottom: 8 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  presetBtn: { backgroundColor: Colors.background, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.borderColor },
  presetBtnActive: { borderColor: Colors.text, backgroundColor: 'rgba(88,216,219,0.1)' },
  presetText: { fontSize: 13, color: Colors.gray },
  presetTextActive: { color: Colors.text, fontWeight: '700' },
  durationInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  durationInput: { flex: 1, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 10, padding: 12, fontSize: 16, color: '#FFFFFF', backgroundColor: Colors.background, marginRight: 10 },
  durationUnit: { fontSize: 15, color: Colors.gray },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderColor },
  modalCancelText: { fontSize: 15, color: Colors.gray, fontWeight: '600' },
  modalAddBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.green, alignItems: 'center' },
  modalAddText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },

  setRow: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, marginBottom: 12 },
  setLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 },
  setInputs: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setInput: { flex: 1, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, padding: 10, fontSize: 15, color: '#FFFFFF', backgroundColor: Colors.cardBackground, textAlign: 'center' },
  multiplySign: { fontSize: 18, color: Colors.gray, fontWeight: 'bold' },
  repsPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderWidth: 1, borderColor: Colors.green, borderRadius: 10, borderStyle: 'dashed' },
  addSetText: { fontSize: 13, color: Colors.green, fontWeight: '600' },

  // Session cards (day detail view)
  sessionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.borderColor,
    padding: 16,
  },
  sessionSwipeDupAction: { backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', width: 72, borderRadius: 14, marginBottom: 10, gap: 4 },
  sessionSwipeDelAction: { backgroundColor: Colors.softRed, justifyContent: 'center', alignItems: 'center', width: 72, borderRadius: 14, marginBottom: 10, gap: 4 },
  swipeActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTime: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  sessionCardName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  cardExCount: { fontSize: 12, color: Colors.textSecondary },
  prBadge: { backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  prBadgeText: { fontSize: 10, color: Colors.green, fontWeight: '700' },

  energyCompact: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  energyCompactText: { fontSize: 12, color: Colors.gray },

  noSessionsBox: { alignItems: 'center', paddingVertical: 32, backgroundColor: Colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor },
  noSessionsText: { fontSize: 14, color: Colors.gray, marginBottom: 4 },

  logWorkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
  logWorkoutBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Expansion animation
  expandBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
  expandedCard: { position: 'absolute', zIndex: 11, backgroundColor: Colors.cardBackground, overflow: 'hidden' },
  expandHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  expandTime: { fontSize: 12, color: Colors.gray, fontWeight: '500', marginBottom: 4 },
  expandName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  expandCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', marginLeft: 12, marginTop: 4 },
  expandScroll: { flex: 1 },
  expandExercise: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  expandExHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  expandExName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  expandExSetCount: { fontSize: 12, color: Colors.gray },
  expandSetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 4 },
  expandSetLabel: { fontSize: 13, color: Colors.gray, fontWeight: '600', width: 50 },
  expandSetMeta: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  expandNotesBlock: { marginTop: 20, padding: 14, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor },
  expandNotesLabel: { fontSize: 11, color: Colors.gray, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  expandNotes: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  expandActions: { flexDirection: 'row', gap: 12, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: Colors.borderColor },
  expandDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor },
  expandDeleteText: { fontSize: 14, color: Colors.softRed, fontWeight: '600' },
  expandEditBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary },
  expandEditText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  noExercisesText: { color: Colors.gray, fontSize: 14, fontStyle: 'italic', paddingTop: 20 },

  pickerModal: { borderRadius: 18, padding: 20, width: '88%', maxHeight: '60%', borderWidth: 1 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  pickerTitle: { fontSize: 20, fontWeight: 'bold' },
  pickerOption: { padding: 14, borderRadius: 10, marginBottom: 6, alignItems: 'center' },
  pickerOptionText: { fontSize: 16 },
});

export default CalendarScreen;
