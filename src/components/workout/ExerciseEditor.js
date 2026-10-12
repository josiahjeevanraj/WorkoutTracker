import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { EXERCISE_LIST } from '../../constants/exercises';
import styles from './workoutStyles';

export const newExercise = defaultUnit => ({
  name: '', sets: [{ reps: '', weight: '', warmup: false, unit: defaultUnit }], _key: Date.now().toString(),
});

// ─── Swipeable set row ────────────────────────────────────────────────────────

const SwipeableSetRow = React.memo(({ set, si, exKey, canDelete, onUpdate, onDuplicate, onRemove }) => {
  const swipeRef = useRef(null);
  const close = () => swipeRef.current?.close();
  const unit = set.unit || 'kg';

  const renderLeftActions = () => (
    <TouchableOpacity
      style={styles.swipeDupAction}
      onPress={() => { close(); onDuplicate(exKey, si); }}
      activeOpacity={0.85}
    >
      <Ionicons name="copy-outline" size={16} color={Colors.onPrimary} />
      <Text style={[styles.swipeActionText, { color: Colors.onPrimary }]}>Dup</Text>
    </TouchableOpacity>
  );

  const renderRightActions = canDelete ? () => (
    <TouchableOpacity
      style={styles.swipeDelAction}
      onPress={() => { close(); onRemove(exKey, si); }}
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
    </Swipeable>
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
  const addSet = exKey =>
    updateSets(exKey, sets => [...sets, { weight: sets[sets.length - 1]?.weight || '', reps: '', warmup: false, unit: sets[sets.length - 1]?.unit || defaultUnit }]);
  const duplicateSet = (exKey, setIdx) =>
    updateSets(exKey, sets => [...sets.slice(0, setIdx + 1), { ...sets[setIdx] }, ...sets.slice(setIdx + 1)]);
  const removeSet = (exKey, setIdx) =>
    updateSets(exKey, sets => sets.filter((_, i) => i !== setIdx));

  const pickerResults = pickerSearch.trim()
    ? EXERCISE_LIST.filter(n => n.toLowerCase().includes(pickerSearch.toLowerCase()))
    : EXERCISE_LIST;

  return (
    <>
      {exercises.map(ex => {
        const sets = Array.isArray(ex.sets) ? ex.sets : [{ weight: '', reps: '' }];
        return (
          <View key={ex._key} style={styles.editExerciseBlock}>
            <TouchableOpacity
              style={styles.exPickerRow}
              onPress={() => { setPickerKey(pickerKey === ex._key ? null : ex._key); setPickerSearch(''); }}
              activeOpacity={0.7}
            >
              <Ionicons name="barbell-outline" size={16} color={ex.name ? Colors.text : Colors.gray} />
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
                    placeholder="Search exercises..."
                    placeholderTextColor={Colors.gray}
                  />
                  {pickerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setPickerSearch('')}>
                      <Ionicons name="close-circle" size={16} color={Colors.gray} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView style={styles.inlinePickerList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {pickerResults.map(name => (
                    <TouchableOpacity
                      key={name}
                      style={styles.inlinePickerItem}
                      onPress={() => { updateExercise(ex._key, 'name', name); setPickerKey(null); }}
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
                <SwipeableSetRow
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
              <TouchableOpacity style={styles.inlineAddSetBtn} onPress={() => addSet(ex._key)}>
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

// Strip editor-only keys and normalise blank weights before saving
export const cleanExercises = exercises =>
  exercises.map(({ _key, ...ex }) => ({
    ...ex,
    sets: ex.sets.map(s => ({ ...s, weight: String(s.weight).trim() || '0' })),
  }));

export const hasEmptyReps = exercises =>
  exercises.some(ex => ex.sets.some(s => !String(s.reps).trim()));

export default ExerciseEditor;
