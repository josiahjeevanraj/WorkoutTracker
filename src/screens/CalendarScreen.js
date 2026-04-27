import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert, Modal, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

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

// ─── Screen ───────────────────────────────────────────────────────────────────

const CalendarScreen = () => {
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

  const [fitnessData, setFitnessData] = useState({
    '2025-01-20': { caloriesConsumed: 2100, caloriesBurned: 450, weight: 74.5, workouts: ['Running - 30 mins','Bench Press - Set 1: 60kg x 10, Set 2: 60kg x 10'] },
    '2025-01-21': { caloriesConsumed: 1850, caloriesBurned: 320, weight: 74.3, workouts: ['Squat - Set 1: 80kg x 8, Set 2: 80kg x 8','Pull-ups - Set 1: 10, Set 2: 8'] },
    '2025-01-22': { caloriesConsumed: 2250, caloriesBurned: 580, weight: 74.2, workouts: ['Swimming - 45 mins','Cycling - 30 mins'] },
    '2025-01-23': { caloriesConsumed: 1950, caloriesBurned: 210, weight: 74.1, workouts: ['Walking - 20 mins'] },
    '2025-01-24': { caloriesConsumed: 2000, caloriesBurned: 520, weight: 74.0, workouts: ['HIIT Training - 30 mins','Deadlift - Set 1: 100kg x 6, Set 2: 100kg x 5'] },
  });

  const getIntensity = (dateKey) => {
    const d = fitnessData[dateKey];
    if (!d) return 0;
    const n = d.workouts?.length || 0;
    if (n === 0) return 1;
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
    if (!editingData.caloriesConsumed || !editingData.caloriesBurned) {
      Alert.alert('Missing Data', 'Please enter calories consumed and burned.'); return;
    }
    setFitnessData(prev => ({
      ...prev,
      [selectedDate]: {
        caloriesConsumed: parseInt(editingData.caloriesConsumed) || 0,
        caloriesBurned: parseInt(editingData.caloriesBurned) || 0,
        weight: editingData.weight ? parseFloat(editingData.weight) : null,
        workouts: editingData.workouts.filter(w => w.trim()),
      },
    }));
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
        setFitnessData(newData); setIsEditing(false);
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

  // ─── Day detail ──────────────────────────────────────────────────────────────
  const renderDayDetail = () => {
    if (!selectedDate) return (
      <View style={s.noDataContainer}>
        <Ionicons name="calendar-outline" size={48} color={Colors.gray} />
        <Text style={s.noDataText}>Select a date to view or add details</Text>
      </View>
    );

    const dayData = fitnessData[selectedDate];
    if (!dayData) return (
      <View style={s.noDataContainer}>
        <Ionicons name="calendar-outline" size={48} color={Colors.gray} />
        <Text style={s.noDataText}>No data for {friendlyDate(selectedDate)}</Text>
        <TouchableOpacity onPress={startEditing} style={s.addDataBtn}>
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={s.addDataBtnText}>Add Data</Text>
        </TouchableOpacity>
      </View>
    );

    const net = dayData.caloriesConsumed - dayData.caloriesBurned;
    const total = dayData.caloriesConsumed + dayData.caloriesBurned;
    const barPct = total > 0 ? (dayData.caloriesConsumed / total) : 0;

    return (
      <View>
        {/* Day header */}
        <View style={s.dayHeader}>
          <View>
            <Text style={s.dayTitle}>{friendlyDate(selectedDate)}</Text>
            <Text style={s.daySubtitle}>{dayData.workouts?.length || 0} workouts{dayData.weight ? ` · ${dayData.weight} kg` : ''}</Text>
          </View>
          <TouchableOpacity onPress={startEditing} style={s.editIconBtn}>
            <Ionicons name="pencil" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Energy balance bar */}
        <View style={[s.energyCard, { borderColor: Colors.borderColor }]}>
          <View style={s.energyHeader}>
            <Text style={s.energyLabel}>NET ENERGY BALANCE</Text>
            <View style={s.energyNetRow}>
              <Text style={s.energyNetValue}>{net > 0 ? '+' : ''}{net.toLocaleString()}</Text>
              <Text style={s.energyNetUnit}> kcal</Text>
            </View>
          </View>
          <View style={s.energyBar}>
            <View style={[s.energyBarFill, { width: `${Math.min(barPct * 100, 100).toFixed(0)}%` }]} />
          </View>
          <View style={s.energyBarFooter}>
            <View>
              <Text style={s.energyBarLabel}>In</Text>
              <Text style={s.energyBarValue}>{dayData.caloriesConsumed.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.energyBarLabel}>Out</Text>
              <Text style={s.energyBarValue}>{dayData.caloriesBurned.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Sessions */}
        {dayData.workouts?.length > 0 && (
          <View style={[s.sessionsCard, { borderColor: Colors.borderColor }]}>
            <Text style={s.sessionsTitle}>SESSIONS</Text>
            {dayData.workouts.map((w, i) => {
              const dur = w.match(/(\d+)\s*mins?/);
              return (
                <View key={i} style={[s.sessionRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.borderColor }]}>
                  <View style={[s.sessionStripe, { backgroundColor: getWorkoutColor(w) }]} />
                  <View style={s.sessionInfo}>
                    <Text style={s.sessionName} numberOfLines={1}>{w.split(' - ')[0]}</Text>
                  </View>
                  {dur && <Text style={s.sessionDuration}>{dur[1]} min</Text>}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ─── Edit form ───────────────────────────────────────────────────────────────
  const renderEditForm = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.editHeader}>
        <Text style={s.editTitle}>Edit {friendlyDate(selectedDate)}</Text>
        <TouchableOpacity onPress={cancelEditing}><Ionicons name="close" size={24} color={Colors.gray} /></TouchableOpacity>
      </View>

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
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Calendar header */}
        <View style={s.calHeader}>
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
          <View style={s.calCells}>
            {grid.map((day, i) => {
              if (!day) return <View key={i} style={s.calCell} />;
              const dateKey = toDateKey(currentYear, currentMonth, day);
              const intensity = getIntensity(dateKey);
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;
              return (
                <TouchableOpacity
                  key={i}
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
          {/* Legend */}
          <View style={s.legendRow}>
            <Text style={s.legendLabel}>Less</Text>
            {[1,2,3,4].map(n => <View key={n} style={[s.legendDot, { backgroundColor: heatColor(n) }]} />)}
            <Text style={s.legendLabel}>More</Text>
          </View>
        </View>

        {/* Day content */}
        <View style={s.dayContent}>
          {isEditing ? renderEditForm() : renderDayDetail()}
        </View>

      </ScrollView>

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
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
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
  calGrid: { marginHorizontal: 18, marginBottom: 4 },
  calDayHeaders: { flexDirection: 'row', marginBottom: 6 },
  calDayHeader: { flex: 1, textAlign: 'center', fontSize: 10, color: Colors.gray, fontWeight: '600' },
  calCells: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: '14.285714%', aspectRatio: 1,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 4,
  },
  calCellText: { fontSize: 12, fontWeight: '500' },

  legendRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 8 },
  legendLabel: { fontSize: 10, color: Colors.gray },
  legendDot: { width: 12, height: 12, borderRadius: 3 },

  // Day content
  dayContent: { paddingHorizontal: 20, paddingTop: 16 },

  noDataContainer: { alignItems: 'center', paddingVertical: 50 },
  noDataText: { fontSize: 15, color: Colors.gray, marginTop: 12, textAlign: 'center' },
  addDataBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, marginTop: 20 },
  addDataBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Day detail
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
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

  pickerModal: { borderRadius: 18, padding: 20, width: '88%', maxHeight: '60%', borderWidth: 1 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  pickerTitle: { fontSize: 20, fontWeight: 'bold' },
  pickerOption: { padding: 14, borderRadius: 10, marginBottom: 6, alignItems: 'center' },
  pickerOptionText: { fontSize: 16 },
});

export default CalendarScreen;
