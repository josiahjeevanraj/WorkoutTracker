import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import StorageService from '../services/StorageService';
import showAlert from '../utils/showAlert';

// Meals live on the day's fitness_data entry:
//   { meals: [{ id, name, calories, protein }], caloriesConsumed, protein }
// caloriesConsumed/protein are the meal totals so Calendar/Progress keep working.

const newMeal = index => ({ id: `${Date.now()}-${index}`, name: `Meal ${index + 1}`, calories: '', protein: '' });

const toDraft = meals =>
  (meals || []).map(m => ({ ...m, calories: m.calories ? String(m.calories) : '', protein: m.protein ? String(m.protein) : '' }));

const num = v => {
  const n = parseFloat(v);
  return n > 0 ? n : 0;
};

const AUTOSAVE_DELAY_MS = 800;

const MealLog = ({ dayKey, dayData, onSaved }) => {
  const [draft, setDraft] = useState(() => toDraft(dayData?.meals));
  const [expanded, setExpanded] = useState(false);
  const [savingCount, setSavingCount] = useState(0);
  const draftRef = useRef(draft);
  const timerRef = useRef(null);
  const queueRef = useRef(Promise.resolve()); // serialises saves so they can't overwrite each other
  const savedDayDataRef = useRef(null);       // the entry our last save produced
  const prevDayKeyRef = useRef(dayKey);

  useEffect(() => { draftRef.current = draft; }, [draft]);

  // Reset when the day changes or its data reloads — but not when the change is
  // just our own autosave echoing back (that would wipe rows still being typed)
  useEffect(() => {
    const sameDay = prevDayKeyRef.current === dayKey;
    prevDayKeyRef.current = dayKey;
    if (sameDay && dayData && dayData === savedDayDataRef.current) return;
    setDraft(toDraft(dayData?.meals));
  }, [dayKey, dayData]);

  const persist = (key, rows) => {
    queueRef.current = queueRef.current.then(async () => {
      setSavingCount(c => c + 1);
      // Rows with nothing entered aren't stored; names (renamed or default) are kept
      const meals = rows
        .filter(m => num(m.calories) || num(m.protein))
        .map((m, i) => ({ id: m.id, name: m.name.trim() || `Meal ${i + 1}`, calories: num(m.calories), protein: num(m.protein) }));
      const latest = (await StorageService.getFitnessData()) || {};
      const updated = {
        ...latest,
        [key]: {
          caloriesConsumed: 0, caloriesBurned: 0, workouts: [],
          ...latest[key],
          meals,
          caloriesConsumed: meals.reduce((sum, m) => sum + m.calories, 0),
          protein: meals.reduce((sum, m) => sum + m.protein, 0),
        },
      };
      const ok = await StorageService.saveFitnessData(updated);
      setSavingCount(c => c - 1);
      if (!ok) { showAlert('Could not save', 'Your meals were not saved. Please try again.'); return; }
      savedDayDataRef.current = updated[key];
      onSaved(updated);
    }).catch(console.error);
  };

  const scheduleSave = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      persist(dayKey, draftRef.current);
    }, AUTOSAVE_DELAY_MS);
  };

  // Flush a pending save for this day before switching days (or unmounting)
  useEffect(() => () => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    persist(dayKey, draftRef.current);
  }, [dayKey]);

  const change = fn => {
    setDraft(prev => {
      const next = fn(prev);
      draftRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const update = (id, field, value) => change(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  const addMeal = () => { change(prev => [...prev, newMeal(prev.length)]); setExpanded(true); };
  const removeMeal = id => change(prev => prev.filter(m => m.id !== id));

  const totalCalories = draft.reduce((sum, m) => sum + num(m.calories), 0);
  const totalProtein = draft.reduce((sum, m) => sum + num(m.protein), 0);

  return (
    <View>
      <TouchableOpacity style={s.headerRow} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={[s.iconBg, { backgroundColor: 'rgba(255,230,0,0.12)' }]}>
          <Ionicons name="restaurant-outline" size={18} color={Colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Meals</Text>
          <Text style={s.sub}>
            {Math.round(totalCalories).toLocaleString()} kcal · {Math.round(totalProtein)} g protein
            {savingCount > 0 ? '  · Saving…' : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={addMeal} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add" size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
      </TouchableOpacity>

      {expanded && (draft.length === 0 ? (
        <Text style={s.emptyText}>No meals logged. Tap + to add one.</Text>
      ) : (
        <>
          <View style={s.colHeaderRow}>
            <Text style={[s.colHeader, { flex: 1 }]}>MEAL</Text>
            <Text style={[s.colHeader, s.kcalCol]}>KCAL</Text>
            <Text style={[s.colHeader, s.proteinCol]}>PROTEIN</Text>
            <View style={s.removeCol} />
          </View>

          {draft.map(meal => (
            <View key={meal.id} style={s.mealRow}>
              <TextInput
                style={[s.input, s.nameInput]}
                value={meal.name}
                onChangeText={v => update(meal.id, 'name', v)}
                placeholder="Meal name"
                placeholderTextColor={Colors.gray}
              />
              <TextInput
                style={[s.input, s.kcalCol]}
                value={meal.calories}
                onChangeText={v => update(meal.id, 'calories', v)}
                placeholder="0"
                placeholderTextColor={Colors.gray}
                keyboardType="numeric"
              />
              <View style={[s.proteinCol, s.proteinWrap]}>
                <TextInput
                  style={[s.input, s.proteinInput]}
                  value={meal.protein}
                  onChangeText={v => update(meal.id, 'protein', v)}
                  placeholder="0"
                  placeholderTextColor={Colors.gray}
                  keyboardType="decimal-pad"
                />
                <Text style={s.gUnit}>g</Text>
              </View>
              <TouchableOpacity style={s.removeCol} onPress={() => removeMeal(meal.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={Colors.gray} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      ))}

    </View>
  );
};

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  sub: { fontSize: 12, color: Colors.gray, marginTop: 2 },

  colHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 6 },
  colHeader: { fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: {
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: Colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderColor,
    color: '#FFFFFF', fontSize: 14,
  },
  nameInput: { flex: 1, minWidth: 0 },
  kcalCol: { width: 64, textAlign: 'center' },
  proteinCol: { width: 72 },
  proteinWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  proteinInput: { flex: 1, minWidth: 0, textAlign: 'center' },
  gUnit: { fontSize: 12, color: Colors.gray },
  removeCol: { width: 20, alignItems: 'center' },

  addBtn: { width: 30, height: 30, borderRadius: 999, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, color: Colors.gray, marginTop: 12 },
});

export default MealLog;
