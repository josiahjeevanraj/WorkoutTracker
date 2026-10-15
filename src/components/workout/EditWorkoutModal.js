import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import ExerciseEditor, { cleanExercises } from './ExerciseEditor';
import styles from './workoutStyles';
import { useRestTimer } from '../../contexts/RestTimerContext';
import RestTimerBar from '../RestTimerBar';

// Visible while `session` is set; onClose always fires, onSaved only after a successful save
const EditWorkoutModal = ({ session, onClose, onSaved, defaultUnit = 'kg' }) => {
  const [edited, setEdited] = useState(null);
  const restTimer = useRestTimer();
  const [collapseToken, setCollapseToken] = useState(0); // closes the open exercise card
  const [showNotes, setShowNotes] = useState(false); // notes are optional, behind a button

  useEffect(() => {
    setShowNotes(false);
    setEdited(session
      ? { ...session, exercises: (session.exercises || []).map((ex, i) => ({ ...ex, _key: i.toString() })) }
      : null);
  }, [session]);

  const handleSave = async () => {
    const clean = cleanExercises((edited.exercises || []).filter(ex => ex.name?.trim()));
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
          <RestTimerBar />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setCollapseToken(n => n + 1)} style={styles.tapCatcher}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Exercises</Text>
              {edited && <ExerciseEditor exercises={edited.exercises} onChange={setExercises} defaultUnit={defaultUnit} onSetAdded={restTimer?.startIfEnabled} collapseToken={collapseToken} />}
            </View>
            {showNotes || edited?.notes ? (
              <View style={styles.logNotesGroup}>
                <View style={styles.notesHeader}>
                  <Text style={[styles.detailSectionLabel, { marginBottom: 0 }]}>Notes</Text>
                  <TouchableOpacity onPress={() => { setEdited(prev => ({ ...prev, notes: '' })); setShowNotes(false); }} style={styles.removeNotesBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={14} color={Colors.softRed} />
                    <Text style={styles.removeNotesText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.logNotesInput}
                  value={edited?.notes || ''}
                  onChangeText={text => setEdited(prev => ({ ...prev, notes: text }))}
                  placeholder="Session notes, PRs, how it felt..."
                  placeholderTextColor={Colors.gray}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoFocus={showNotes && !edited?.notes}
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.addNotesBtn} onPress={() => setShowNotes(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="create-outline" size={15} color={Colors.text} />
                <Text style={[styles.addNotesText, { color: Colors.text }]}>Add notes</Text>
              </TouchableOpacity>
            )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditWorkoutModal;
