import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
} from 'react-native';

import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';
import CalendarScreen from './CalendarScreen';
import LogWorkoutModal from '../components/workout/LogWorkoutModal';
import EditWorkoutModal from '../components/workout/EditWorkoutModal';
import ExpandedSessionCard from '../components/workout/ExpandedSessionCard';
import { weightUnit } from '../utils/units';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDayLabel = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const groupByDay = (sessions) => {
  const map = {};
  sessions.forEach(s => {
    const key = new Date(s.completedAt).toDateString();
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  return Object.entries(map)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([key, items]) => ({
      key,
      title: formatDayLabel(key),
      count: items.length,
      totalDuration: items.reduce((sum, s) => sum + (s.duration || 0), 0),
      data: items.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    }));
};

const getCategoryInfo = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('circuit') || n.includes('calisthenics') || n.includes('bodyweight'))
    return { color: Colors.green, label: 'Calisthenics' };
  if (n.includes('push') || n.includes('chest') || n.includes('tricep') || n.includes('shoulder'))
    return { color: Colors.indigo, label: 'Weighted' };
  if (n.includes('pull') || n.includes('back') || n.includes('bicep') || n.includes('row') || n.includes('deadlift') || n.includes('lat'))
    return { color: Colors.indigo, label: 'Weighted' };
  if (n.includes('leg') || n.includes('squat') || n.includes('glute') || n.includes('hamstring') || n.includes('calf'))
    return { color: Colors.text, label: 'Weighted' };
  if (n.includes('full') || n.includes('compound'))
    return { color: Colors.primary, label: 'Weighted' };
  if (n.includes('core') || n.includes('abs') || n.includes('oblique'))
    return { color: Colors.amber, label: 'Weighted' };
  return { color: Colors.primary, label: 'Workout' };
};

// ─── Swipeable session card ───────────────────────────────────────────────────

const SwipeableSessionCard = React.memo(({ item, cardRef, onPress, onDuplicate, onDelete }) => {
  const swipeRef = useRef(null);
  const close = () => swipeRef.current?.close();
  const hasPR = item.notes?.toLowerCase().includes('pr');
  const exCount = item.exerciseCount || item.exercises?.length || 0;

  const renderLeftActions = () => (
    <TouchableOpacity
      style={styles.sessionSwipeDupAction}
      onPress={() => { close(); onDuplicate(item); }}
      activeOpacity={0.85}
    >
      <Ionicons name="copy-outline" size={18} color={Colors.onPrimary} />
      <Text style={[styles.swipeActionText, { color: Colors.onPrimary }]}>Dup</Text>
    </TouchableOpacity>
  );

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.sessionSwipeDelAction}
      onPress={() => { close(); onDelete(item.id); }}
      activeOpacity={0.85}
    >
      <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
      <Text style={styles.swipeActionText}>Del</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        ref={cardRef}
        style={styles.sessionCard}
        onPress={() => onPress(item, item.id)}
        activeOpacity={0.88}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTime}>{formatTime(item.completedAt)}</Text>
          {hasPR && <View style={styles.prBadge}><Text style={styles.prBadgeText}>NEW PR</Text></View>}
        </View>
        <Text style={styles.sessionName}>{item.name}</Text>
        {exCount > 0 && (
          <Text style={styles.cardExCount}>{exCount} exercise{exCount !== 1 ? 's' : ''}</Text>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const WorkoutsScreen = () => {
  const [history, setHistory] = useState([]);
  const [collapsedDays, setCollapsedDays] = useState(new Set());
  const [expandedCard, setExpandedCard] = useState(null); // { session, rect }
  const [editingSession, setEditingSession] = useState(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [activeView, setActiveView] = useState('calendar');
  const [logTargetDate, setLogTargetDate] = useState(null);
  const cardRefs = useRef({});

  const [defaultUnit, setDefaultUnit] = useState('kg');

  useFocusEffect(useCallback(() => {
    loadHistory().catch(console.error);
    StorageService.getUserProfile().then(p => setDefaultUnit(weightUnit(p?.units))).catch(console.error);
  }, []));

  const loadHistory = async () => {
    setHistory(await StorageService.getWorkoutHistory());
  };

  const toggleDay = (key) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sections = useMemo(() => {
    const grouped = groupByDay(history);
    return grouped.map(group => ({
      ...group,
      data: collapsedDays.has(group.key) ? [] : group.data,
    }));
  }, [history, collapsedDays]);

  const openCard = (session, id) => {
    const ref = cardRefs.current[id];
    if (!ref) return;
    ref.measure((x, y, width, height, pageX, pageY) => {
      setExpandedCard({ session, rect: { x: pageX, y: pageY, width, height } });
    });
  };

  const handleDeleteSession = async (id) => {
    await StorageService.deleteWorkoutSession(id);
    setHistory(prev => prev.filter(s => s.id !== id));
  };

  const handleDuplicateSession = async (session) => {
    const { id, ...rest } = session;
    const origTime = new Date(session.completedAt).getTime();
    const newSession = await StorageService.addWorkoutSession({ ...rest, completedAt: new Date(origTime + 1000).toISOString() });
    if (newSession) await loadHistory();
  };

  const closeLogModal = () => { setLogModalVisible(false); setLogTargetDate(null); };

  // ─── Renderers ──────────────────────────────────────────────────────────────

  const renderSectionHeader = ({ section }) => {
    const isCollapsed = collapsedDays.has(section.key);
    return (
      <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleDay(section.key)} activeOpacity={0.7}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionMeta}>{section.count} {section.count === 1 ? 'session' : 'sessions'}</Text>
        <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.gray} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => (
    <SwipeableSessionCard
      item={item}
      cardRef={ref => { cardRefs.current[item.id] = ref; }}
      onPress={openCard}
      onDuplicate={handleDuplicateSession}
      onDelete={handleDeleteSession}
    />
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workouts</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === 'calendar' && styles.toggleBtnActive]}
            onPress={() => setActiveView('calendar')}
          >
            <Ionicons name="calendar-outline" size={15} color={activeView === 'calendar' ? Colors.onPrimary : Colors.gray} />
            <Text style={[styles.toggleBtnText, activeView === 'calendar' && styles.toggleBtnTextActive]}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === 'list' && styles.toggleBtnActive]}
            onPress={() => setActiveView('list')}
          >
            <Ionicons name="list-outline" size={15} color={activeView === 'list' ? Colors.onPrimary : Colors.gray} />
            <Text style={[styles.toggleBtnText, activeView === 'list' && styles.toggleBtnTextActive]}>List</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeView === 'list' ? (
        <>
          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={48} color={Colors.gray} />
                <Text style={styles.emptyText}>No workouts logged yet</Text>
                <Text style={styles.emptySubtext}>Tap Log Workout to add your first session</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />

          {/* FAB */}
          <TouchableOpacity style={styles.fab} onPress={() => setLogModalVisible(true)} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.onPrimary} />
            <Text style={styles.fabText}>Log Workout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <CalendarScreen embedded sessions={history} onEditSession={setEditingSession} onSessionDeleted={() => loadHistory()} onLogWorkout={(date) => { setLogTargetDate(date); setLogModalVisible(true); }} />
      )}

      <EditWorkoutModal
        session={editingSession}
        defaultUnit={defaultUnit}
        onClose={() => setEditingSession(null)}
        onSaved={async () => { setExpandedCard(null); await loadHistory(); }}
      />

      {/* ── Expanded card (iOS-style hero) ──────────────────────────────────── */}
      {expandedCard && (
        <ExpandedSessionCard
          key={expandedCard.session.id}
          session={expandedCard.session}
          rect={expandedCard.rect}
          onClosed={updated => {
            setExpandedCard(null);
            setHistory(prev => prev.map(s => s.id === updated.id ? { ...s, notes: updated.notes } : s));
          }}
          onEdit={setEditingSession}
          onCopied={loadHistory}
          weightUnit={defaultUnit}
          onDeleted={id => {
            setExpandedCard(null);
            setHistory(prev => prev.filter(s => s.id !== id));
          }}
        />
      )}

      <LogWorkoutModal
        visible={logModalVisible}
        onClose={closeLogModal}
        onSaved={loadHistory}
        targetDate={logTargetDate}
        defaultUnit={defaultUnit}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },

  // Header
  header: {
    flexDirection: 'column', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  viewToggle: {
    flexDirection: 'row', backgroundColor: Colors.cardBackground,
    borderRadius: 10, padding: 3,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  toggleBtnTextActive: { color: Colors.onPrimary },

  // Summary bar
  summaryBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  summaryCard: {
    flex: 1, padding: 12, backgroundColor: Colors.cardBackground,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor,
  },
  summaryLabel: { fontSize: 10, color: Colors.gray, letterSpacing: 0.6 },
  summaryValue: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 110 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, marginTop: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sectionDivider: { flex: 1, height: 1, backgroundColor: Colors.borderColor, marginHorizontal: 10 },
  sectionMeta: { fontSize: 11, color: Colors.gray },

  // Session card
  sessionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.borderColor,
    padding: 16,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTime: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  sessionName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  cardExCount: { fontSize: 12, color: Colors.textSecondary },
  prBadge: { backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  prBadgeText: { fontSize: 10, color: Colors.green, fontWeight: '700' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: Colors.gray, marginTop: 8, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 82, right: 18,
    backgroundColor: Colors.text,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
  fabText: { color: Colors.onPrimary, fontSize: 14, fontWeight: '700' },

  // Expansion animation
  expandNotes: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  detailDate: { fontSize: 13, color: Colors.gray, marginBottom: 20 },

  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  exerciseName: { fontSize: 15, color: '#FFFFFF', flex: 1 },
  exerciseMeta: { fontSize: 14, color: Colors.gray },
  notesText: { fontSize: 15, color: Colors.gray, lineHeight: 22 },

  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  exerciseSetCount: { fontSize: 12, color: Colors.gray, fontWeight: '500' },
  setDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 4 },
  setDetailLabel: { fontSize: 12, color: Colors.gray, fontWeight: '600', width: 44 },
  setDetailMeta: { fontSize: 13, color: Colors.text, fontWeight: '500' },

  // Sets modal
  setRow: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderColor },
  setRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  setLabel: { fontSize: 12, fontWeight: '700', color: Colors.gray, textTransform: 'uppercase', letterSpacing: 0.6 },
  setInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  setInput: { flex: 1, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, padding: 10, fontSize: 15, backgroundColor: Colors.cardBackground, color: '#FFFFFF', textAlign: 'center' },
  setMultiply: { fontSize: 18, color: Colors.gray, fontWeight: '600' },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 10, borderStyle: 'dashed', marginTop: 4, marginBottom: 12 },
  addSetText: { color: Colors.green, fontSize: 14, fontWeight: '500' },
  setsSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.background },
  setsSummaryText: { flex: 1, fontSize: 14, color: Colors.gray },

  editExerciseNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  editNameInput: { flex: 1 },
  editExerciseStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editInput: { borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 8, padding: 8, fontSize: 14, backgroundColor: Colors.cardBackground, color: '#FFFFFF' },
  editSmallInput: { width: 52, textAlign: 'center' },
  editWeightInput: { flex: 1 },
  editSeparator: { color: Colors.gray, fontSize: 16, fontWeight: '600' },

  swipeActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sessionSwipeDupAction: { backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', width: 72, borderRadius: 14, marginBottom: 10, gap: 4 },
  sessionSwipeDelAction: { backgroundColor: Colors.softRed, justifyContent: 'center', alignItems: 'center', width: 72, borderRadius: 14, marginBottom: 10, gap: 4 },

  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderColor, marginBottom: 4 },
  dropdownValue: { color: '#FFFFFF', fontSize: 15 },
  dropdownPlaceholder: { color: Colors.gray },
  dropdownList: { borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderColor, overflow: 'hidden', marginBottom: 4 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  dropdownItemActive: { backgroundColor: Colors.cardBackground },
  dropdownItemText: { color: '#FFFFFF', fontSize: 15 },
  dropdownItemTextActive: { fontWeight: '600' },

});

export default WorkoutsScreen;
