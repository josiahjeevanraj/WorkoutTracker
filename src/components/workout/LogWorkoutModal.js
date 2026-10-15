import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../../services/StorageService';
import showAlert from '../../utils/showAlert';
import ExerciseEditor, { cleanExercises } from './ExerciseEditor';
import { planToEditorExercises } from './WorkoutPlansModal';
import { isCardio } from '../../utils/cardio';
import styles from './workoutStyles';
import { useRestTimer } from '../../contexts/RestTimerContext';
import RestTimerBar from '../RestTimerBar';

// targetDate: optional 'YYYY-MM-DD' to log against a past day (from the calendar)
// mode: optional 'strength' | 'cardio' (Home's toggle) limits exercises and plans
const LogWorkoutModal = ({ visible, onClose, onSaved, targetDate, defaultUnit = 'kg', mode, accent = Colors.primary, onAccent = Colors.onPrimary }) => {
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [notes, setNotes] = useState('');
  // Ref guards against double-taps landing before the saving re-render
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const restTimer = useRestTimer();
  const [planId, setPlanId] = useState(null);
  const [collapseToken, setCollapseToken] = useState(0); // closes the open exercise card
  const [showNotes, setShowNotes] = useState(false); // notes are optional, behind a button

  useEffect(() => {
    if (!visible) return;
    StorageService.getWorkouts()
      .then(p => setPlans((p || []).filter(plan =>
        !mode || (plan.exercises || []).some(ex => isCardio(ex) === (mode === 'cardio')))))
      .catch(console.error);
  }, [visible, mode]);

  const applyPlan = plan => {
    setPlanId(plan.id);
    setName(plan.name);
    setExercises(planToEditorExercises(plan, defaultUnit));
  };

  const close = () => {
    setName(''); setExercises([]); setNotes(''); setPlanId(null); setShowNotes(false);
    onClose();
  };

  const handleLog = async () => {
    const named = exercises.filter(ex => ex.name.trim());
    if (!named.length) { showAlert('No exercises', 'Please add at least one exercise before saving.'); return; }
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
          <Text style={styles.modalTitle}>{mode === 'cardio' ? 'Log Cardio' : 'Log Workout'}</Text>
          <RestTimerBar />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setCollapseToken(n => n + 1)} style={styles.tapCatcher}>

            {plans.length > 0 && (
              <View style={styles.planPickRow}>
                <Text style={styles.planPickLabel}>PLAN</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planChipRow} style={{ flex: 1 }}>
                  {plans.map(plan => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.planChip, planId === plan.id && { backgroundColor: accent, borderColor: accent }]}
                      onPress={() => applyPlan(plan)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.planChipText, planId === plan.id && { color: onAccent }]}>{plan.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TextInput
              style={styles.sessionNameInput}
              value={name}
              onChangeText={setName}
              placeholder={mode === 'cardio' ? 'Session name (e.g. Morning Run)' : 'Session name (e.g. Chest Day)'}
              placeholderTextColor={Colors.gray}
            />

            <Text style={[styles.logSectionLabel, { marginTop: 14 }]}>Exercises</Text>
            <ExerciseEditor exercises={exercises} onChange={setExercises} defaultUnit={defaultUnit} mode={mode} accent={accent} onSetAdded={restTimer?.startIfEnabled} collapseToken={collapseToken} />

            {showNotes || notes ? (
              <View style={styles.logNotesGroup}>
                <View style={styles.notesHeader}>
                  <Text style={[styles.logSectionLabel, { marginBottom: 0 }]}>Notes</Text>
                  <TouchableOpacity onPress={() => { setNotes(''); setShowNotes(false); }} style={styles.removeNotesBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={14} color={Colors.softRed} />
                    <Text style={styles.removeNotesText}>Remove</Text>
                  </TouchableOpacity>
                </View>
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
            ) : (
              <TouchableOpacity style={styles.addNotesBtn} onPress={() => setShowNotes(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="create-outline" size={15} color={accent} />
                <Text style={[styles.addNotesText, { color: accent }]}>Add notes</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.modalButtons, { marginTop: 20 }]}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={close}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: accent }, saving && { opacity: 0.6 }]} onPress={handleLog} disabled={saving}>
                <Text style={[styles.saveBtnText, { color: onAccent }]}>{saving ? 'Saving…' : 'Log'}</Text>
              </TouchableOpacity>
            </View>

            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default LogWorkoutModal;
