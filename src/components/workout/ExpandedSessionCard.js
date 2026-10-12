import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Animated, Alert, Platform, Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import styles from './workoutStyles';

const formatTime = iso =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// Full-screen hero that grows out of the tapped card. Rendered in a Modal so it
// fills the window regardless of the parent's layout (rect: page position from measure()).
const ExpandedSessionCard = ({ session, rect, onClosed, onEdit, onDeleted }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  const [notes, setNotes] = useState(session.notes || '');
  const notesRef = useRef(session.notes || '');

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: false, tension: 55, friction: 11 }).start();
  }, []);

  const animateOut = done =>
    Animated.spring(anim, { toValue: 0, useNativeDriver: false, tension: 65, friction: 12 }).start(done);

  const close = () => {
    const latest = notesRef.current;
    StorageService.updateWorkoutSession(session.id, { notes: latest }).catch(console.error);
    animateOut(() => onClosed?.({ ...session, notes: latest }));
  };

  // Close (saving notes) before handing off: a Modal opened while this one is up
  // can end up underneath it on web
  // Awaited so the notes write can't land after (and overwrite) the edit save
  const handleEdit = async () => {
    const latest = notesRef.current;
    if (latest !== (session.notes || '')) {
      await StorageService.updateWorkoutSession(session.id, { notes: latest }).catch(console.error);
    }
    const updated = { ...session, notes: latest };
    onClosed?.(updated);
    onEdit?.(updated);
  };

  const handleDelete = () => {
    // Skip the notes save here: a concurrent update could rewrite the session after deletion
    const confirmDelete = async () => {
      animateOut();
      await StorageService.deleteWorkoutSession(session.id);
      onDeleted?.(session.id);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete Workout\n\nThis cannot be undone.')) confirmDelete();
      return;
    }
    Alert.alert('Delete Workout', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]);
  };

  const animLeft   = anim.interpolate({ inputRange: [0, 1], outputRange: [rect.x, 0] });
  const animTop    = anim.interpolate({ inputRange: [0, 1], outputRange: [rect.y, 0] });
  const animWidth  = anim.interpolate({ inputRange: [0, 1], outputRange: [rect.width, windowWidth] });
  const animHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [rect.height, windowHeight] });
  const animRadius = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const contentOp  = anim.interpolate({ inputRange: [0.45, 1], outputRange: [0, 1] });
  const backdropOp = anim.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1] });
  const exercises  = session.exercises || [];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.expandBackdrop, { opacity: backdropOp }]}
        pointerEvents="auto">
        <TouchableOpacity style={{ flex: 1 }} onPress={close} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[styles.expandedCard, {
        left: animLeft, top: animTop, width: animWidth, height: animHeight, borderRadius: animRadius,
      }]}>
        <Animated.View style={[{ flex: 1 }, { opacity: contentOp }]}>
          {/* Header */}
          <View style={styles.expandHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expandTime}>
                {new Date(session.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {' · '}{formatTime(session.completedAt)}
              </Text>
              <Text style={styles.expandName}>{session.name}</Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.expandCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.gray} />
            </TouchableOpacity>
          </View>

          {/* Exercises */}
          <ScrollView style={styles.expandScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
            {exercises.length === 0 ? (
              <Text style={styles.noExercisesText}>No exercises recorded</Text>
            ) : exercises.map((ex, i) => (
              <View key={i} style={styles.expandExercise}>
                <View style={styles.expandExHeader}>
                  <Text style={styles.expandExName}>{ex.name}</Text>
                  {Array.isArray(ex.sets) && (
                    <Text style={styles.expandExSetCount}>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</Text>
                  )}
                </View>
                {Array.isArray(ex.sets) && ex.sets.map((set, si) => (
                  <View key={si} style={[styles.expandSetRow, set.warmup && styles.expandWarmupRow]}>
                    <View style={styles.expandSetLabelRow}>
                      {set.warmup && (
                        <View style={styles.warmupTag}>
                          <Text style={styles.warmupTagText}>W</Text>
                        </View>
                      )}
                      <Text style={[styles.expandSetLabel, set.warmup && { color: Colors.amber }]}>Set {si + 1}</Text>
                    </View>
                    <Text style={styles.expandSetMeta}>
                      {set.weight ? `${set.weight}${set.unit || 'kg'}` : 'BW'}{set.reps ? ` × ${set.reps}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.expandNotesBlock}>
              <Text style={styles.expandNotesLabel}>Notes</Text>
              <TextInput
                style={styles.expandNotesInput}
                value={notes}
                onChangeText={text => { setNotes(text); notesRef.current = text; }}
                placeholder="Add notes..."
                placeholderTextColor={Colors.gray}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.expandActions}>
            <TouchableOpacity style={styles.expandDeleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={Colors.softRed} />
              <Text style={styles.expandDeleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expandEditBtn} onPress={handleEdit}>
              <Ionicons name="pencil" size={18} color={Colors.onPrimary} />
              <Text style={styles.expandEditText}>Edit Workout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default ExpandedSessionCard;
