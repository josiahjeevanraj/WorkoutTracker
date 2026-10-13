import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { EXERCISE_LIST, CARDIO_EXERCISES } from '../../constants/exercises';
import { isCardio, isCardioName, distanceUnitFor, newCardioSet, formatPace } from '../../utils/cardio';
import useCustomExercises, { addCustomExercise } from '../../hooks/useCustomExercises';
import showAlert from '../../utils/showAlert';
import styles from './workoutStyles';

const newStrengthSet = unit => ({ reps: '', weight: '', warmup: false, unit });

export const newExercise = defaultUnit => ({
  name: '', sets: [newStrengthSet(defaultUnit)], _key: Date.now().toString(),
});

// Swipe actions shared by strength and cardio set rows
const SetSwipeable = ({ children, exKey, si, canDelete, onDuplicate, onRemove }) => {
  const swipeRef = useRef(null);
  const close = () => swipeRef.current?.close();
  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={() => (
        <TouchableOpacity style={styles.swipeDupAction} onPress={() => { close(); onDuplicate(exKey, si); }} activeOpacity={0.85}>
          <Ionicons name="copy-outline" size={16} color={Colors.onPrimary} />
          <Text style={[styles.swipeActionText, { color: Colors.onPrimary }]}>Dup</Text>
        </TouchableOpacity>
      )}
      renderRightActions={canDelete ? () => (
        <TouchableOpacity style={styles.swipeDelAction} onPress={() => { close(); onRemove(exKey, si); }} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>Del</Text>
        </TouchableOpacity>
      ) : null}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      {children}
    </Swipeable>
  );
};

// ─── Cardio set row (time + distance) ─────────────────────────────────────────

const CardioSetRow = React.memo(({ set, si, exKey, canDelete, onUpdate, onDuplicate, onRemove }) => {
  const unit = set.unit || 'km';
  const minutes = parseFloat(set.duration) || 0;
  const distance = parseFloat(set.distance) || 0;
  return (
    <SetSwipeable exKey={exKey} si={si} canDelete={canDelete} onDuplicate={onDuplicate} onRemove={onRemove}>
      <View style={styles.cardioSetWrap}>
        <View style={[styles.inlineSetRow, { marginBottom: 0 }]}>
          <Text style={styles.inlineSetLabel}>Set {si + 1}</Text>
          <View style={styles.weightInputGroup}>
            <TextInput
              style={[styles.inlineSetInput, { flex: 1 }]}
              value={String(set.duration || '')}
              onChangeText={v => onUpdate(exKey, si, 'duration', v)}
              placeholder="0"
              placeholderTextColor={Colors.gray}
              keyboardType="decimal-pad"
            />
            <Text style={styles.cardioUnitText}>min</Text>
          </View>
          <View style={styles.weightInputGroup}>
            <TextInput
              style={[styles.inlineSetInput, { flex: 1 }]}
              value={String(set.distance || '')}
              onChangeText={v => onUpdate(exKey, si, 'distance', v)}
              placeholder="0"
              placeholderTextColor={Colors.gray}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={() => onUpdate(exKey, si, 'unit', unit === 'km' ? 'mi' : 'km')}
              activeOpacity={0.7}
            >
              <Text style={styles.unitToggleText}>{unit}</Text>
              <Ionicons name="chevron-down" size={10} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        </View>
        {minutes > 0 && distance > 0 && (
          <Text style={styles.cardioPaceText}>Pace {formatPace(minutes / distance)} /{unit}</Text>
        )}
      </View>
    </SetSwipeable>
  );
});

// ─── Swipeable set row ────────────────────────────────────────────────────────

const SwipeableSetRow = React.memo(({ set, si, exKey, canDelete, onUpdate, onDuplicate, onRemove }) => {
  const unit = set.unit || 'kg';
  return (
    <SetSwipeable exKey={exKey} si={si} canDelete={canDelete} onDuplicate={onDuplicate} onRemove={onRemove}>
      <View style={[styles.inlineSetRow, set.warmup && styles.warmupRow]}>
        <TouchableOpacity
          style={[styles.warmupToggle, set.warmup && styles.warmupToggleActive]}
          onPress={() => onUpdate(exKey, si, 'warmup', !set.warmup)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.warmupToggleText, set.warmup && styles.warmupToggleTextActive]}>W</Text>
        </TouchableOpacity>
        <Text style={[styles.inlineSetLabel, set.warmup && { color: Colors.amber }]}>Set {si + 1}</Text>
        <View style={styles.weightInputGroup}>
          <TextInput
            style={[styles.inlineSetInput, { flex: 1 }]}
            value={String(set.weight || '')}
            onChangeText={v => onUpdate(exKey, si, 'weight', v)}
            placeholder="0"
            placeholderTextColor={Colors.gray}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={styles.unitToggle}
            onPress={() => onUpdate(exKey, si, 'unit', unit === 'kg' ? 'lbs' : 'kg')}
            activeOpacity={0.7}
          >
            <Text style={styles.unitToggleText}>{unit}</Text>
            <Ionicons name="chevron-down" size={10} color={Colors.gray} />
          </TouchableOpacity>
        </View>
        <Text style={styles.inlineSetX}>×</Text>
        <TextInput
          style={styles.repsInput}
          value={String(set.reps || '')}
          onChangeText={v => onUpdate(exKey, si, 'reps', v)}
          placeholder="reps"
          placeholderTextColor={Colors.gray}
          keyboardType="numeric"
        />
      </View>
    </SetSwipeable>
  );
});

// ─── Exercise editor ──────────────────────────────────────────────────────────

// `onChange` receives an updater (exercises => exercises), like a state setter
const ExerciseEditor = ({ exercises, onChange, defaultUnit }) => {
  const [pickerKey, setPickerKey] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const updateExercise = (key, field, value) =>
    onChange(list => list.map(ex => ex._key === key ? { ...ex, [field]: value } : ex));
  const removeExercise = key => onChange(list => list.filter(ex => ex._key !== key));
  const addExercise = () => onChange(list => [...list, newExercise(defaultUnit)]);

  const updateSets = (exKey, fn) =>
    onChange(list => list.map(ex => ex._key === exKey ? { ...ex, sets: fn(ex.sets) } : ex));
  const updateSet = (exKey, setIdx, field, value) =>
    updateSets(exKey, sets => sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s));
  const distanceUnit = distanceUnitFor(defaultUnit);
  const addSet = (exKey, cardio) =>
    updateSets(exKey, sets => {
      const last = sets[sets.length - 1];
      return [...sets, cardio
        ? { ...newCardioSet(last?.unit || distanceUnit), distance: last?.distance || '' }
        : { weight: last?.weight || '', reps: '', warmup: false, unit: last?.unit || defaultUnit }];
    });
  const duplicateSet = (exKey, setIdx) =>
    updateSets(exKey, sets => [...sets.slice(0, setIdx + 1), { ...sets[setIdx] }, ...sets.slice(setIdx + 1)]);
  const removeSet = (exKey, setIdx) =>
    updateSets(exKey, sets => sets.filter((_, i) => i !== setIdx));

  // The user's own exercises first, then the built-in list
  const customExercises = useCustomExercises();
  const allExercises = useMemo(() => {
    const builtIn = new Set(EXERCISE_LIST.map(n => n.toLowerCase()));
    return [...customExercises.filter(n => !builtIn.has(n.toLowerCase())), ...EXERCISE_LIST, ...CARDIO_EXERCISES];
  }, [customExercises]);

  const query = pickerSearch.trim();
  const pickerResults = query
    ? allExercises.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : allExercises;
  const canAddCustom = !!query && !allExercises.some(n => n.toLowerCase() === query.toLowerCase());

  // Picking switches the set rows when moving between strength and cardio
  const pickExercise = (exKey, name) => {
    const cardio = isCardioName(name);
    onChange(list => list.map(ex => {
      if (ex._key !== exKey) return ex;
      const { type, ...rest } = ex;
      const next = cardio ? { ...rest, name, type: 'cardio' } : { ...rest, name };
      if (cardio !== isCardio(ex)) next.sets = [cardio ? newCardioSet(distanceUnit) : newStrengthSet(defaultUnit)];
      return next;
    }));
    setPickerKey(null);
  };
  const addAndPick = async (exKey, name) => {
    pickExercise(exKey, name);
    if (!(await addCustomExercise(name))) {
      showAlert('Not saved to your list', `"${name}" is used here but couldn't be saved for future picking.`);
    }
  };

  return (
    <>
      {exercises.map(ex => {
        const sets = Array.isArray(ex.sets) ? ex.sets : [{ weight: '', reps: '' }];
        const cardio = isCardio(ex);
        const SetRow = cardio ? CardioSetRow : SwipeableSetRow;
        return (
          <View key={ex._key} style={styles.editExerciseBlock}>
            <TouchableOpacity
              style={styles.exPickerRow}
              onPress={() => { setPickerKey(pickerKey === ex._key ? null : ex._key); setPickerSearch(''); }}
              activeOpacity={0.7}
            >
              <Ionicons name={cardio ? 'walk-outline' : 'barbell-outline'} size={16} color={ex.name ? Colors.text : Colors.gray} />
              <Text style={[styles.exPickerText, !ex.name && styles.exPickerPlaceholder]} numberOfLines={1}>
                {ex.name || 'Select exercise'}
              </Text>
              <Ionicons name={pickerKey === ex._key ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray} />
              <TouchableOpacity onPress={() => removeExercise(ex._key)} style={styles.removeExBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
              </TouchableOpacity>
            </TouchableOpacity>
            {pickerKey === ex._key && (
              <View style={styles.inlinePicker}>
                <View style={styles.inlineSearchRow}>
                  <Ionicons name="search-outline" size={16} color={Colors.gray} />
                  <TextInput
                    style={styles.inlineSearchInput}
                    value={pickerSearch}
                    onChangeText={setPickerSearch}
                    placeholder="Search or add exercise..."
                    returnKeyType="done"
                    onSubmitEditing={() => { if (canAddCustom) addAndPick(ex._key, query); }}
                    placeholderTextColor={Colors.gray}
                  />
                  {pickerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setPickerSearch('')}>
                      <Ionicons name="close-circle" size={16} color={Colors.gray} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView style={styles.inlinePickerList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {canAddCustom && (
                    <TouchableOpacity style={styles.inlinePickerItem} onPress={() => addAndPick(ex._key, query)}>
                      <View style={styles.inlinePickerAddRow}>
                        <Ionicons name="add-circle-outline" size={16} color={Colors.text} />
                        <Text style={styles.inlinePickerAddText} numberOfLines={1}>Add "{query}"</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {pickerResults.map(name => (
                    <TouchableOpacity
                      key={name}
                      style={styles.inlinePickerItem}
                      onPress={() => pickExercise(ex._key, name)}
                    >
                      <Text style={styles.inlinePickerItemText}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.inlineSetsContainer}>
              <Text style={styles.swipeHint}>← swipe for actions →</Text>
              {sets.map((set, si) => (
                <SetRow
                  key={`${ex._key}-${si}`}
                  set={set}
                  si={si}
                  exKey={ex._key}
                  canDelete={sets.length > 1}
                  onUpdate={updateSet}
                  onDuplicate={duplicateSet}
                  onRemove={removeSet}
                />
              ))}
              <TouchableOpacity style={styles.inlineAddSetBtn} onPress={() => addSet(ex._key, cardio)}>
                <Ionicons name="add-circle-outline" size={15} color={Colors.green} />
                <Text style={styles.inlineAddSetText}>Add Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <TouchableOpacity style={styles.addExerciseBtn} onPress={addExercise}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
        <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
      </TouchableOpacity>
    </>
  );
};

// Strip editor-only keys and normalise blank weights/distances before saving
export const cleanExercises = exercises =>
  exercises.map(({ _key, ...ex }) => ({
    ...ex,
    sets: isCardio(ex)
      ? ex.sets.map(s => ({ ...s, duration: String(s.duration ?? '').trim(), distance: String(s.distance ?? '').trim() || '0' }))
      : ex.sets.map(s => ({ ...s, weight: String(s.weight).trim() || '0' })),
  }));

// Strength sets need reps; cardio sets need a time
export const hasEmptyReps = exercises =>
  exercises.some(ex => ex.sets.some(s => !String((isCardio(ex) ? s.duration : s.reps) ?? '').trim()));

export const MISSING_SET_DETAILS = ['Missing details', 'Enter reps for every set (or time for treadmill sets) before saving.'];

export default ExerciseEditor;
