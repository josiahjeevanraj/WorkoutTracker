import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Animated, Alert, Platform, Modal,
  useWindowDimensions, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import showAlert from '../../utils/showAlert';
import DayPicker from './DayPicker';
import StoryShare from './StoryShare';
import { isCardio, isIntervalCardio, formatCardioSet, distanceUnitFor } from '../../utils/cardio';
import RunDetails from '../run/RunDetails';
import styles from './workoutStyles';

const toKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatTime = iso =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// Full-screen hero that grows out of the tapped card. Rendered in a Modal so it
// fills the window regardless of the parent's layout (rect: page position from measure()).
const ExpandedSessionCard = ({ session, rect, onClosed, onEdit, onDeleted, onCopied, weightUnit = 'kg' }) => {
  // Size the card from the window when it opened: on iOS Safari the keyboard shrinks
  // the reported height, which would collapse the card under the notes field. Only
  // follow real changes (rotation, or the height growing back).
  const live = useWindowDimensions();
  const sizeRef = useRef({ width: live.width, height: live.height });
  if (live.width !== sizeRef.current.width) sizeRef.current = { width: live.width, height: live.height };
  else if (live.height > sizeRef.current.height) sizeRef.current = { ...sizeRef.current, height: live.height };
  const { width: windowWidth, height: windowHeight } = sizeRef.current;
  const anim = useRef(new Animated.Value(0)).current;
  const [notes, setNotes] = useState(session.notes || '');
  const notesRef = useRef(session.notes || '');
  const [showNotes, setShowNotes] = useState(false); // notes box opens from a small button
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const copyingRef = useRef(false);

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

  // Slide down on the header to close: the card follows the drag and is dismissed
  // past ~a quarter of the screen (or a quick flick), otherwise it springs back
  const dragY = useRef(new Animated.Value(0)).current;
  const swipeCloseRef = useRef(null);
  swipeCloseRef.current = () => {
    const latest = notesRef.current;
    StorageService.updateWorkoutSession(session.id, { notes: latest }).catch(console.error);
    Animated.timing(dragY, { toValue: windowHeight, duration: 200, useNativeDriver: false })
      .start(() => onClosed?.({ ...session, notes: latest }));
  };
  const dismissDistance = windowHeight * 0.25;
  const dragResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > dismissDistance || g.vy > 0.9) swipeCloseRef.current();
      else Animated.spring(dragY, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }).start();
    },
    onPanResponderTerminate: () =>
      Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start(),
  }), [dismissDistance]);

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

  // Copy to another day, keeping the original time of day
  const handleCopy = async dateKey => {
    if (copyingRef.current) return;
    copyingRef.current = true;
    setCopyPickerOpen(false);
    const { id, ...rest } = session;
    const [y, m, d] = dateKey.split('-').map(Number);
    const completedAt = new Date(session.completedAt);
    completedAt.setFullYear(y, m - 1, d);
    const copy = await StorageService.addWorkoutSession({ ...rest, notes: notesRef.current, completedAt: completedAt.toISOString() });
    copyingRef.current = false;
    if (!copy) { showAlert('Could not copy', 'The workout was not copied. Please try again.'); return; }
    onCopied?.(copy);
    const label = completedAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    showAlert('Workout copied', `${session.name} was copied to ${label}.`);
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
      <Animated.View style={[styles.expandBackdrop, {
        opacity: Animated.multiply(backdropOp, dragY.interpolate({ inputRange: [0, windowHeight], outputRange: [1, 0], extrapolate: 'clamp' })),
      }]}
        pointerEvents="auto">
        <TouchableOpacity style={{ flex: 1 }} onPress={close} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[styles.expandedCard, {
        left: animLeft, top: animTop, width: animWidth, height: animHeight, borderRadius: animRadius,
        transform: [{ translateY: dragY }],
      }]}>
        <Animated.View style={[{ flex: 1 }, { opacity: contentOp }]}>
          {/* Header — drag down here to close */}
          <View
            {...dragResponder.panHandlers}
            style={Platform.OS === 'web' ? { touchAction: 'none' } : undefined}
          >
          <View style={styles.dragHandle} />
          <View style={styles.expandHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expandTime}>
                {new Date(session.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {' · '}{formatTime(session.completedAt)}
              </Text>
              <Text style={styles.expandName}>{session.name}</Text>
            </View>
            {/* Share as a story image / sticker / run animation (StoryShare.js on web, .native.js in the app) */}
            <TouchableOpacity onPress={() => setShareOpen(true)} style={styles.expandCloseBtn}>
              <Ionicons name="share-outline" size={18} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={close} style={styles.expandCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.gray} />
            </TouchableOpacity>
          </View>
          </View>

          {/* Exercises */}
          <ScrollView style={styles.expandScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
            {/* Outdoor runs: route map, elevation profile and splits */}
            {session.hasTrack && <RunDetails sessionId={session.id} distUnit={distanceUnitFor(weightUnit)} title={session.name} />}
            {exercises.length === 0 ? (
              <Text style={styles.noExercisesText}>No exercises recorded</Text>
            ) : exercises.map((ex, i) => (
              <View key={i} style={styles.expandExercise}>
                <View style={styles.expandExHeader}>
                  <Text style={styles.expandExName}>{ex.name}</Text>
                  {/* Single-entry cardio has no sets to count */}
                  {Array.isArray(ex.sets) && !(isCardio(ex) && !isIntervalCardio(ex)) && (
                    <Text style={styles.expandExSetCount}>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</Text>
                  )}
                </View>
                {(!Array.isArray(ex.sets) || ex.sets.length === 0) && (
                  <Text style={styles.noExercisesText}>Not logged yet — tap Edit to add sets</Text>
                )}
                {Array.isArray(ex.sets) && ex.sets.map((set, si) => (
                  <View key={si} style={[styles.expandSetRow, set.warmup && styles.expandWarmupRow]}>
                    <View style={styles.expandSetLabelRow}>
                      {set.warmup && (
                        <View style={styles.warmupTag}>
                          <Text style={styles.warmupTagText}>W</Text>
                        </View>
                      )}
                      <Text style={[styles.expandSetLabel, set.warmup && { color: Colors.amber }]}>
                        {isCardio(ex) && !isIntervalCardio(ex) ? 'Total' : `Set ${si + 1}`}
                      </Text>
                    </View>
                    <Text style={styles.expandSetMeta}>
                      {isCardio(ex)
                        ? formatCardioSet(set)
                        : `${set.weight && set.weight !== '0' ? `${set.weight}${set.unit || 'kg'}` : 'BW'}${set.reps ? ` × ${set.reps}` : ''}`}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
            {/* Notes can be added here without editing; saved when the card closes */}
            {showNotes || notes ? (
              <View style={styles.expandNotesBlock}>
                <View style={styles.notesHeader}>
                  <Text style={[styles.expandNotesLabel, { marginBottom: 0 }]}>Notes</Text>
                  <TouchableOpacity onPress={() => { setNotes(''); notesRef.current = ''; setShowNotes(false); }} style={styles.removeNotesBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={14} color={Colors.softRed} />
                    <Text style={styles.removeNotesText}>Remove</Text>
                  </TouchableOpacity>
                </View>
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
            ) : (
              <TouchableOpacity style={[styles.addNotesBtn, { marginTop: 20 }]} onPress={() => setShowNotes(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="create-outline" size={15} color={Colors.text} />
                <Text style={[styles.addNotesText, { color: Colors.text }]}>Add notes</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.expandActions}>
            <TouchableOpacity style={styles.expandDeleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={Colors.softRed} />
              <Text style={styles.expandDeleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expandDeleteBtn} onPress={() => setCopyPickerOpen(true)}>
              <Ionicons name="copy-outline" size={18} color={Colors.text} />
              <Text style={styles.expandCopyText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expandEditBtn} onPress={handleEdit}>
              <Ionicons name="pencil" size={18} color={Colors.onPrimary} />
              <Text style={styles.expandEditText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>

      {shareOpen && (
        <StoryShare session={{ ...session, notes: notesRef.current }} weightUnit={weightUnit} onClose={() => setShareOpen(false)} />
      )}

      {copyPickerOpen && (
        <DayPicker
          title="Copy to day"
          markedKey={toKey(new Date(session.completedAt))}
          onSelect={handleCopy}
          onCancel={() => setCopyPickerOpen(false)}
        />
      )}
    </Modal>
  );
};

export default ExpandedSessionCard;
