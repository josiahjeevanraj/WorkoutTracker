import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import showAlert from '../../utils/showAlert';
import ExerciseEditor from './ExerciseEditor';
import styles from './workoutStyles';

// Plans are stored under @workouts: { id, name, createdAt, exercises: [{ name, sets }] }
export const planToEditorExercises = (plan, defaultUnit) =>
  (plan.exercises || []).map((ex, i) => ({
    ...ex,
    sets: (ex.sets || []).map(s => ({ ...s, unit: s.unit || defaultUnit })),
    _key: `${Date.now()}-${i}`,
  }));

const WorkoutPlansModal = ({ visible, onClose, defaultUnit = 'kg' }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id?, name, exercises } while editing
  const [saving, setSaving] = useState(false);

  const loadPlans = async () => {
    setPlans((await StorageService.getWorkouts()) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!visible) return;
    setEditing(null);
    setLoading(true);
    loadPlans().catch(console.error);
  }, [visible]);

  const startNew = () => setEditing({ name: '', exercises: [] });
  const startEdit = plan => setEditing({ id: plan.id, name: plan.name, exercises: planToEditorExercises(plan, defaultUnit) });

  const handleSave = async () => {
    const named = editing.exercises.filter(ex => ex.name.trim());
    if (!named.length) { showAlert('No exercises', 'Add at least one exercise to the plan.'); return; }
    const plan = {
      name: editing.name.trim() || 'Workout Plan',
      exercises: named.map(({ _key, ...ex }) => ex),
    };
    setSaving(true);
    const saved = editing.id
      ? await StorageService.updateWorkout(editing.id, plan)
      : await StorageService.addWorkout(plan);
    setSaving(false);
    if (!saved) { showAlert('Could not save', 'Your plan was not saved. Please try again.'); return; }
    setEditing(null);
    await loadPlans();
  };

  const handleDelete = () => {
    const confirmDelete = async () => {
      const ok = await StorageService.deleteWorkout(editing.id);
      if (!ok) { showAlert('Could not delete', 'Please try again.'); return; }
      setEditing(null);
      await loadPlans();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete Plan\n\nDelete "${editing.name || 'this plan'}"?`)) confirmDelete();
      return;
    }
    Alert.alert('Delete Plan', `Delete "${editing.name || 'this plan'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]);
  };

  const setExercises = updater => setEditing(prev => ({ ...prev, exercises: updater(prev.exercises) }));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={editing ? () => setEditing(null) : onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.logModal}>
          {editing ? (
            <>
              <Text style={styles.modalTitle}>{editing.id ? 'Edit Plan' : 'New Plan'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.logSectionLabel}>Plan Name</Text>
                <TextInput
                  style={styles.sessionNameInput}
                  value={editing.name}
                  onChangeText={name => setEditing(prev => ({ ...prev, name }))}
                  placeholder="e.g. Push Day, Leg Day..."
                  placeholderTextColor={Colors.gray}
                />

                <Text style={[styles.logSectionLabel, { marginTop: 16 }]}>Exercises</Text>
                <ExerciseEditor exercises={editing.exercises} onChange={setExercises} defaultUnit={defaultUnit} />

                {editing.id && (
                  <TouchableOpacity style={styles.planDeleteBtn} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={16} color={Colors.softRed} />
                    <Text style={styles.planDeleteText}>Delete plan</Text>
                  </TouchableOpacity>
                )}

                <View style={[styles.modalButtons, { marginTop: 20 }]}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setEditing(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>Workout Plans</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {loading ? (
                  <ActivityIndicator color={Colors.text} style={{ marginVertical: 24 }} />
                ) : plans.length === 0 ? (
                  <Text style={styles.planEmptyText}>
                    No plans yet. Create one to prefill your workout when you log it.
                  </Text>
                ) : (
                  plans.map(plan => {
                    const count = plan.exercises?.length || 0;
                    return (
                      <TouchableOpacity key={plan.id} style={styles.planRow} onPress={() => startEdit(plan)} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.planRowName} numberOfLines={1}>{plan.name}</Text>
                          <Text style={styles.planRowMeta} numberOfLines={1}>
                            {count} exercise{count !== 1 ? 's' : ''}
                            {count ? ` · ${plan.exercises.map(ex => ex.name).join(', ')}` : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                      </TouchableOpacity>
                    );
                  })
                )}
                <TouchableOpacity style={styles.addExerciseBtn} onPress={startNew}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
                  <Text style={styles.addExerciseBtnText}>New Plan</Text>
                </TouchableOpacity>

                <View style={[styles.modalButtons, { marginTop: 20 }]}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={onClose}>
                    <Text style={styles.cancelBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default WorkoutPlansModal;
