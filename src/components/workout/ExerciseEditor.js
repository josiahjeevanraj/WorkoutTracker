import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Swipeable } from '../../lib/gesture';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/colors';
import { EXERCISE_LIST, CARDIO_EXERCISES } from '../../constants/exercises';
import { isCardio, isCardioName, isIntervalCardio, distanceUnitFor, newCardioSet, formatPace, formatCardioSet } from '../../utils/cardio';
import useCustomExercises, { addCustomExercise } from '../../hooks/useCustomExercises';
import showAlert from '../../utils/showAlert';
import styles from './workoutStyles';

// Exercises start with no sets; rows are added from the exercise card.
// mode 'cardio' marks it as cardio so its rows are time/distance.
export const newExercise = (defaultUnit, mode) => (mode === 'cardio'
  ? { name: '', type: 'cardio', sets: [], _key: Date.now().toString() }
  : { name: '', sets: [], _key: Date.now().toString() });

// One-line summary for a collapsed exercise card
const exerciseSummary = (ex, cardio, singleCardio, setsOptional) => {
  const sets = ex.sets || [];
  if (!sets.length) return setsOptional ? 'No targets — tap to add' : 'No sets yet — tap to add';
  if (singleCardio) return formatCardioSet(sets[0]);
  if (cardio) return `${sets.length} interval${sets.length !== 1 ? 's' : ''}`;
  const best = sets.reduce((b, st) => ((parseFloat(st.weight) || 0) > (parseFloat(b?.weight) || 0) ? st : b), sets[0]);
  const w = parseFloat(best.weight) || 0;
  const bestText = w || best.reps ? ` · best ${w ? `${best.weight}${best.unit || 'kg'}` : 'BW'}${best.reps ? ` × ${best.reps}` : ''}` : '';
  return `${sets.length} set${sets.length !== 1 ? 's' : ''}${bestText}`;
};

// Swipe actions shared by strength and cardio set rows
const SetSwipeable = ({ children, exKey, si, canDelete, onDuplicate, onRemove, accent }) => {
  const swipeRef = useRef(null);
  const close = () => swipeRef.current?.close();
  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={() => (
        <TouchableOpacity style={[styles.swipeDupAction, accent && { backgroundColor: accent }]} onPress={() => { close(); onDuplicate(exKey, si); }} activeOpacity={0.85}>
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

// ─── Cardio entry (single: time + distance + optional incline) ───────────────

const CardioEntry = React.memo(({ set, exKey, onUpdate, accent = Colors.text }) => {
  const unit = set.unit || 'km';
  const minutes = parseFloat(set.duration) || 0;
  const distance = parseFloat(set.distance) || 0;
  return (
    <View style={styles.cardioEntry}>
      <View style={styles.cardioEntryRow}>
        <View style={styles.cardioField}>
          <Text style={styles.cardioFieldLabel}>TIME</Text>
          <View style={styles.weightInputGroup}>
            <TextInput
              style={[styles.inlineSetInput, { flex: 1 }]}
              value={String(set.duration || '')}
              onChangeText={v => onUpdate(exKey, 0, 'duration', v)}
              placeholder="0"
              placeholderTextColor={Colors.gray}
              keyboardType="decimal-pad"
            />
            <Text style={styles.cardioUnitText}>min</Text>
          </View>
        </View>
        <View style={styles.cardioField}>
          <Text style={styles.cardioFieldLabel}>DISTANCE</Text>
          <View style={styles.weightInputGroup}>
            <TextInput
              style={[styles.inlineSetInput, { flex: 1 }]}
              value={String(set.distance || '')}
              onChangeText={v => onUpdate(exKey, 0, 'distance', v)}
              placeholder="0"
              placeholderTextColor={Colors.gray}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={() => onUpdate(exKey, 0, 'unit', unit === 'km' ? 'mi' : 'km')}
              activeOpacity={0.7}
            >
              <Text style={[styles.unitToggleText, { color: accent }]}>{unit}</Text>
              <Ionicons name="chevron-down" size={10} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.cardioField, styles.cardioFieldNarrow]}>
          <Text style={styles.cardioFieldLabel}>INCLINE</Text>
          <View style={styles.weightInputGroup}>
            <TextInput
              style={[styles.inlineSetInput, { flex: 1 }]}
              value={String(set.incline || '')}
              onChangeText={v => onUpdate(exKey, 0, 'incline', v)}
              placeholder="0"
              placeholderTextColor={Colors.gray}
              keyboardType="decimal-pad"
            />
            <Text style={styles.cardioUnitText}>%</Text>
          </View>
        </View>
      </View>
      {minutes > 0 && distance > 0 && (
        <Text style={[styles.cardioPaceText, { color: accent, paddingLeft: 0, paddingBottom: 0, marginTop: 8 }]}>
          Pace {formatPace(minutes / distance)} /{unit}
        </Text>
      )}
    </View>
  );
});

// ─── Cardio set row (intervals: time + distance per row) ──────────────────────

const CardioSetRow = React.memo(({ set, si, exKey, canDelete, onUpdate, onDuplicate, onRemove, accent = Colors.text }) => {
  const unit = set.unit || 'km';
  const minutes = parseFloat(set.duration) || 0;
  const distance = parseFloat(set.distance) || 0;
  return (
    <SetSwipeable exKey={exKey} si={si} canDelete={canDelete} onDuplicate={onDuplicate} onRemove={onRemove} accent={accent}>
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
              <Text style={[styles.unitToggleText, { color: accent }]}>{unit}</Text>
              <Ionicons name="chevron-down" size={10} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        </View>
        {minutes > 0 && distance > 0 && (
          <Text style={[styles.cardioPaceText, { color: accent }]}>Pace {formatPace(minutes / distance)} /{unit}</Text>
        )}
      </View>
    </SetSwipeable>
  );
});

// ─── Swipeable set row ────────────────────────────────────────────────────────

const SwipeableSetRow = React.memo(({ set, si, exKey, canDelete, onUpdate, onDuplicate, onRemove, accent = Colors.text }) => {
  const unit = set.unit || 'kg';
  return (
    <SetSwipeable exKey={exKey} si={si} canDelete={canDelete} onDuplicate={onDuplicate} onRemove={onRemove} accent={accent}>
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
            <Text style={[styles.unitToggleText, { color: accent }]}>{unit}</Text>
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

// `onChange` receives an updater (exercises => exercises), like a state setter.
// `mode` ('strength' | 'cardio', optional) limits the picker to that kind of exercise.
// `setsOptional` (plans) lets exercises have no sets: new ones start without any.
// `accent` colours highlights (Home's cardio mode passes cyan).
// `onSetAdded` fires when Add Set / Dup is used (starts the rest timer while logging).
// `collapseToken`: bump it to close the open card (the parent does this on taps outside cards).
const ExerciseEditor = ({ exercises, onChange, defaultUnit, mode, setsOptional = false, accent = Colors.text, onSetAdded, collapseToken }) => {
  const [pickerKey, setPickerKey] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');
  // One card open at a time, so opening another (or tapping outside) closes it
  const [openKey, setOpenKey] = useState(null);
  const toggleOpen = key => setOpenKey(prev => (prev === key ? null : key));
  // Taps inside a card also reach the parent's tap-outside handler on web, so remember
  // when a touch started inside a card and ignore a collapse that follows it
  const insideTapAt = useRef(0);
  const markInsideTap = () => { insideTapAt.current = Date.now(); };
  useEffect(() => {
    if (!collapseToken || Date.now() - insideTapAt.current < 800) return;
    setOpenKey(null);
  }, [collapseToken]);

  const updateExercise = (key, field, value) =>
    onChange(list => list.map(ex => ex._key === key ? { ...ex, [field]: value } : ex));
  const removeExercise = key => onChange(list => list.filter(ex => ex._key !== key));
  // New exercises open the picker straight away; their set rows appear once one is chosen
  const addExercise = () => {
    const ex = newExercise(defaultUnit, mode);
    onChange(list => [...list, ex]);
    setPickerKey(ex._key);
    setPickerSearch('');
  };

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

  // The user's own exercises first, then the built-in list (filtered by mode)
  const customExercises = useCustomExercises();
  const customCardio = useMemo(
    () => new Set(customExercises.filter(e => e.type === 'cardio').map(e => e.name.toLowerCase())),
    [customExercises]);
  const allExercises = useMemo(() => {
    const builtIn = new Set([...EXERCISE_LIST, ...CARDIO_EXERCISES].map(n => n.toLowerCase()));
    const custom = customExercises
      .filter(e => !builtIn.has(e.name.toLowerCase()))
      .filter(e => !mode || (mode === 'cardio') === (e.type === 'cardio'))
      .map(e => e.name);
    const builtInForMode = mode === 'cardio' ? CARDIO_EXERCISES
      : mode === 'strength' ? EXERCISE_LIST
      : [...EXERCISE_LIST, ...CARDIO_EXERCISES];
    return [...custom, ...builtInForMode];
  }, [customExercises, mode]);

  const query = pickerSearch.trim();
  const pickerResults = query
    ? allExercises.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : allExercises;
  const canAddCustom = !!query && !allExercises.some(n => n.toLowerCase() === query.toLowerCase());

  // Picking switches the set rows when moving between strength and cardio
  const pickExercise = (exKey, name, type) => {
    const cardio = type ? type === 'cardio' : isCardioName(name) || customCardio.has(name.toLowerCase());
    onChange(list => list.map(ex => {
      if (ex._key !== exKey) return ex;
      const { type, ...rest } = ex;
      const next = cardio ? { ...rest, name, type: 'cardio' } : { ...rest, name };
      if (cardio !== isCardio(ex)) {
        next.sets = []; // rows differ between strength and cardio
      } else if (cardio && !isIntervalCardio(next) && next.sets?.length > 1) {
        next.sets = next.sets.slice(0, 1); // single-entry cardio keeps one row
      }
      return next;
    }));
    setPickerKey(null);
  };
  // Exercises added in cardio mode are saved as cardio (time + distance)
  const addAndPick = async (exKey, name) => {
    const type = mode === 'cardio' ? 'cardio' : 'strength';
    const saving = addCustomExercise(name, type);
    pickExercise(exKey, name, type);
    if (!(await saving)) {
      showAlert('Not saved to your list', `"${name}" is used here but couldn't be saved for future picking.`);
    }
  };

  return (
    <>
      {exercises.map(ex => {
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        const cardio = isCardio(ex);
        const singleCardio = cardio && !isIntervalCardio(ex); // one time/distance/incline entry, no sets
        const SetRow = cardio ? CardioSetRow : SwipeableSetRow;
        const open = !!ex.name && openKey === ex._key;
        const openPicker = () => { setPickerKey(pickerKey === ex._key ? null : ex._key); setPickerSearch(''); };
        // The first row of an exercise isn't a rest, so it doesn't start the timer
        const addRow = () => { addSet(ex._key, cardio); if (sets.length > 0) onSetAdded?.(); };
        const addLabel = singleCardio
          ? (setsOptional ? 'Add target time & distance' : 'Add time & distance')
          : (setsOptional ? 'Add target set' : 'Add Set');
        return (
          <View
            key={ex._key}
            style={[styles.editExerciseBlock, open && { borderColor: accent }]}
            onPointerDown={markInsideTap}
            onTouchStart={markInsideTap}
          >
            {/* Card header: tap to expand (or to pick, before an exercise is chosen) */}
            <TouchableOpacity
              style={styles.exCardHeader}
              onPress={ex.name ? () => toggleOpen(ex._key) : openPicker}
              activeOpacity={0.7}
            >
              <Ionicons name={cardio ? 'walk-outline' : 'barbell-outline'} size={18} color={ex.name ? accent : Colors.gray} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.exPickerText, !ex.name && styles.exPickerPlaceholder]} numberOfLines={1}>
                  {ex.name || 'Select exercise'}
                </Text>
                {!!ex.name && (
                  <Text style={styles.exCardSummary} numberOfLines={1}>
                    {exerciseSummary(ex, cardio, singleCardio, setsOptional)}
                  </Text>
                )}
              </View>
              {!!ex.name && (
                <TouchableOpacity onPress={openPicker} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.exCardIconBtn}>
                  <Ionicons name="swap-horizontal" size={18} color={Colors.gray} />
                </TouchableOpacity>
              )}
              {!!ex.name && (
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
              )}
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
                        <Ionicons name="add-circle-outline" size={16} color={accent} />
                        <Text style={[styles.inlinePickerAddText, { color: accent }]} numberOfLines={1}>Add "{query}"</Text>
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

            {/* Expanded: the sets (or cardio entry) and the add button */}
            {open && (singleCardio && sets.length > 0 ? (
              <CardioEntry set={sets[0]} exKey={ex._key} onUpdate={updateSet} accent={accent} />
            ) : (
              <View style={styles.inlineSetsContainer}>
                {sets.length > 0 && <Text style={styles.swipeHint}>← swipe for actions →</Text>}
                {sets.map((set, si) => (
                  <SetRow
                    key={`${ex._key}-${si}`}
                    set={set}
                    si={si}
                    exKey={ex._key}
                    canDelete
                    onUpdate={updateSet}
                    onDuplicate={(exKey, si) => { duplicateSet(exKey, si); onSetAdded?.(); }}
                    onRemove={removeSet}
                    accent={accent}
                  />
                ))}
                <TouchableOpacity style={styles.inlineAddSetBtn} onPress={addRow}>
                  <Ionicons name="add-circle-outline" size={15} color={Colors.green} />
                  <Text style={styles.inlineAddSetText}>{addLabel}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
      })}
      <TouchableOpacity style={styles.addExerciseBtn} onPress={addExercise}>
        <Ionicons name="add-circle-outline" size={20} color={accent} />
        <Text style={[styles.addExerciseBtnText, { color: accent }]}>Add Exercise</Text>
      </TouchableOpacity>
    </>
  );
};

const blank = v => !String(v ?? '').trim();

// A row with nothing entered (strength: no weight or reps; cardio: no time or distance)
const isEmptySet = (ex, s) => (isCardio(ex) ? blank(s.duration) && blank(s.distance) : blank(s.weight) && blank(s.reps));

// Prepare exercises for saving. Supports logging in real time: empty rows are
// dropped, partly filled sets are kept, and an exercise with nothing logged yet
// is kept with no sets so it can be filled in later via Edit.
export const cleanExercises = exercises =>
  exercises.map(({ _key, ...ex }) => {
    const sets = (ex.sets || []).filter(s => !isEmptySet(ex, s));
    return {
      ...ex,
      sets: isCardio(ex)
        ? sets.map(s => ({
          ...s,
          duration: String(s.duration ?? '').trim(),
          distance: String(s.distance ?? '').trim() || '0',
          incline: String(s.incline ?? '').trim() || '0',
        }))
        : sets.map(s => ({ ...s, weight: String(s.weight ?? '').trim() || '0', reps: String(s.reps ?? '').trim() })),
    };
  });

export default ExerciseEditor;
