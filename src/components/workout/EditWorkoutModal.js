import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import showAlert from '../../utils/showAlert';
import ExerciseEditor, { cleanExercises, hasEmptyReps } from './ExerciseEditor';
import styles from './workoutStyles';

// Visible while `session` is set; onClose always fires, onSaved only after a successful save
const EditWorkoutModal = ({ session, onClose, onSaved, defaultUnit = 'kg' }) => {
  const [edited, setEdited] = useState(null);

  useEffect(() => {
    setEdited(session
      ? { ...session, exercises: (session.exercises || []).map((ex, i) => ({ ...ex, _key: i.toString() })) }
      : null);
  }, [session]);

  const handleSave = async () => {
    const named = (edited.exercises || []).filter(ex => ex.name?.trim());
    if (hasEmptyReps(named)) { showAlert('Missing reps', 'Please enter reps for all sets before saving.'); return; }
    const clean = cleanExercises(edited.exercises || []);
    const updates = { name: edited.name?.trim() || session.name, exercises: clean, exerciseCount: clean.length, notes: edited.notes ?? '' };
    const updated = await StorageService.updateWorkoutSession(edited.id, updates);
    if (updated) await onSaved?.(updated);
    onClose();
  };

  const setExercises = updater => setEdited(prev => ({ ...prev, exercises: updater(prev.exercises) }));

  return (
    <Modal visible={!!session} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <TextInput
              style={[styles.detailName, styles.detailNameInput]}
              value={edited?.name}
              onChangeText={text => setEdited(prev => ({ ...prev, name: text }))}
              placeholder="Workout name"
              placeholderTextColor={Colors.gray}
            />
            <View style={styles.detailHeaderActions}>
              <TouchableOpacity onPress={handleSave} style={styles.iconButton}><Ionicons name="checkmark" size={24} color={Colors.success} /></TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}><Ionicons name="close" size={24} color={Colors.gray} /></TouchableOpacity>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Exercises</Text>
              {edited && <ExerciseEditor exercises={edited.exercises} onChange={setExercises} defaultUnit={defaultUnit} />}
            </View>
            <View style={styles.logNotesGroup}>
              <Text style={styles.detailSectionLabel}>Notes</Text>
              <TextInput
                style={styles.logNotesInput}
                value={edited?.notes || ''}
                onChangeText={text => setEdited(prev => ({ ...prev, notes: text }))}
                placeholder="Session notes, PRs, how it felt..."
                placeholderTextColor={Colors.gray}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditWorkoutModal;
