import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import StorageService from '../services/StorageService';
import showAlert from '../utils/showAlert';

// Meals live on the day's fitness_data entry:
//   { meals: [{ id, name, calories, protein }], caloriesConsumed, protein }
// caloriesConsumed/protein are the meal totals so Calendar/Progress keep working.

const newMeal = index => ({ id: `${Date.now()}-${index}`, name: `Meal ${index + 1}`, calories: '', protein: '' });

const toDraft = meals =>
  meals?.length
    ? meals.map(m => ({ ...m, calories: m.calories ? String(m.calories) : '', protein: m.protein ? String(m.protein) : '' }))
    : [newMeal(0)];

const num = v => {
  const n = parseFloat(v);
  return n > 0 ? n : 0;
};

const MealLog = ({ dayKey, dayData, onSaved }) => {
  const [draft, setDraft] = useState(() => toDraft(dayData?.meals));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset when the day changes or its saved data reloads
  useEffect(() => {
    setDraft(toDraft(dayData?.meals));
    setDirty(false);
  }, [dayKey, dayData]);

  const update = (id, field, value) => {
    setDraft(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    setDirty(true);
  };
  const addMeal = () => { setDraft(prev => [...prev, newMeal(prev.length)]); setDirty(true); };
  const removeMeal = id => { setDraft(prev => prev.filter(m => m.id !== id)); setDirty(true); };

  const totalCalories = draft.reduce((sum, m) => sum + num(m.calories), 0);
  const totalProtein = draft.reduce((sum, m) => sum + num(m.protein), 0);

  const save = async () => {
    Keyboard.dismiss();
    setSaving(true);
    // Drop rows with nothing entered; keep names (renamed or default)
    const meals = draft
      .filter(m => num(m.calories) || num(m.protein))
      .map((m, i) => ({ id: m.id, name: m.name.trim() || `Meal ${i + 1}`, calories: num(m.calories), protein: num(m.protein) }));
    const latest = (await StorageService.getFitnessData()) || {};
    const updated = {
      ...latest,
      [dayKey]: {
        caloriesConsumed: 0, caloriesBurned: 0, workouts: [],
        ...latest[dayKey],
        meals,
        caloriesConsumed: meals.reduce((sum, m) => sum + m.calories, 0),
        protein: meals.reduce((sum, m) => sum + m.protein, 0),
      },
    };
    const ok = await StorageService.saveFitnessData(updated);
    setSaving(false);
    if (!ok) { showAlert('Could not save', 'Your meals were not saved. Please try again.'); return; }
    onSaved(updated);
  };

  return (
    <View>
      <View style={s.headerRow}>
        <View style={[s.iconBg, { backgroundColor: 'rgba(255,230,0,0.12)' }]}>
          <Ionicons name="restaurant-outline" size={18} color={Colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Meals</Text>
          <Text style={s.sub}>{Math.round(totalCalories).toLocaleString()} kcal · {Math.round(totalProtein)} g protein</Text>
        </View>
      </View>

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

      <View style={s.actionsRow}>
        <TouchableOpacity style={s.addMealBtn} onPress={addMeal} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.text} />
          <Text style={s.addMealText}>Add meal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.saveBtn, (!dirty || saving) && s.saveBtnDisabled]}
          onPress={save}
          disabled={!dirty || saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator size="small" color={Colors.onPrimary} />
            : <Text style={s.saveText}>Save meals</Text>}
        </TouchableOpacity>
      </View>
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

  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  addMealBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addMealText: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  saveBtn: { paddingVertical: 9, paddingHorizontal: 16, backgroundColor: Colors.primary, borderRadius: 10, alignItems: 'center', minWidth: 100 },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: Colors.onPrimary, fontSize: 14, fontWeight: '700' },
});

export default MealLog;
