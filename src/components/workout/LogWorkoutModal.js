import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import showAlert from '../../utils/showAlert';
import ExerciseEditor, { cleanExercises, hasEmptyReps } from './ExerciseEditor';
import { planToEditorExercises } from './WorkoutPlansModal';
import styles from './workoutStyles';

// targetDate: optional 'YYYY-MM-DD' to log against a past day (from the calendar)
const LogWorkoutModal = ({ visible, onClose, onSaved, targetDate, defaultUnit = 'kg' }) => {
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [notes, setNotes] = useState('');
  // Ref guards against double-taps landing before the saving re-render
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState(null);

  useEffect(() => {
    if (visible) StorageService.getWorkouts().then(p => setPlans(p || [])).catch(console.error);
  }, [visible]);

  const applyPlan = plan => {
    setPlanId(plan.id);
    setName(plan.name);
    setExercises(planToEditorExercises(plan, defaultUnit));
  };

  const close = () => {
    setName(''); setExercises([]); setNotes(''); setPlanId(null);
    onClose();
  };

  const handleLog = async () => {
    const named = exercises.filter(ex => ex.name.trim());
    if (!named.length) { showAlert('No exercises', 'Please add at least one exercise before saving.'); return; }
    if (hasEmptyReps(named)) { showAlert('Missing reps', 'Please enter reps for all sets before saving.'); return; }
    const clean = cleanExercises(named);
    const completedAt = targetDate
      ? new Date(targetDate + 'T12:00:00').toISOString()
      : new Date().toISOString();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const saved = await StorageService.addWorkoutSession({ name: name.trim() || 'Workout', duration: 0, exerciseCount: clean.length, caloriesBurned: 0, exercises: clean, notes: notes.trim(), completedAt });
    savingRef.current = false;
    setSaving(false);
    if (!saved) { showAlert('Could not save', 'Your workout was not saved. Please try again.'); return; }
    close();
    onSaved?.(saved);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.logModal}>
          <Text style={styles.modalTitle}>Log Workout</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {plans.length > 0 && (
              <>
                <Text style={styles.logSectionLabel}>Start from plan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planChipRow} style={{ marginBottom: 16 }}>
                  {plans.map(plan => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.planChip, planId === plan.id && styles.planChipActive]}
                      onPress={() => applyPlan(plan)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.planChipText, planId === plan.id && styles.planChipTextActive]}>{plan.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.logSectionLabel}>Session Name</Text>
            <TextInput
              style={styles.sessionNameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chest Day, Leg Day..."
              placeholderTextColor={Colors.gray}
            />

            <Text style={[styles.logSectionLabel, { marginTop: 16 }]}>Exercises</Text>
            <ExerciseEditor exercises={exercises} onChange={setExercises} defaultUnit={defaultUnit} />

            <View style={styles.logNotesGroup}>
              <Text style={styles.logSectionLabel}>Notes</Text>
              <TextInput
                style={styles.logNotesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="How did the session go? Any PRs?"
                placeholderTextColor={Colors.gray}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={[styles.modalButtons, { marginTop: 20 }]}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={close}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleLog} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Log'}</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default LogWorkoutModal;
