import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['S','M','T','W','T','F','S'];

const toKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Single-date month picker drawn as an overlay inside its parent (not a Modal, so it
// can sit on top of another Modal on web). `markedKey` highlights a reference day.
const DayPicker = ({ title, markedKey, onSelect, onCancel }) => {
  const start = markedKey ? new Date(markedKey + 'T12:00:00') : new Date();
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const todayKey = toKey(new Date());

  const shiftMonth = delta => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(year, month, i + 1))),
  ];

  return (
    <View style={s.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} activeOpacity={1} />
      <View style={s.sheet}>
        <Text style={s.title}>{title}</Text>
        <View style={s.monthRow}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={s.grid}>
          {DAY_LABELS.map((l, i) => <Text key={`l${i}`} style={s.dayLabel}>{l}</Text>)}
          {cells.map((key, i) => (
            <View key={key || `e${i}`} style={s.cellWrap}>
              {key && (
                <TouchableOpacity
                  style={[s.cell, key === markedKey && s.cellMarked, key === todayKey && s.cellToday]}
                  onPress={() => onSelect(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.cellText, key === markedKey && s.cellTextMarked]}>{parseInt(key.slice(8), 10)}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, backgroundColor: Colors.modalBackground, justifyContent: 'center', paddingHorizontal: 20 },
  sheet: { backgroundColor: Colors.cardBackground, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.borderColor },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 14 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayLabel: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, color: Colors.gray, fontWeight: '600', marginBottom: 6 },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  cell: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  cellMarked: { backgroundColor: Colors.primary },
  cellToday: { borderWidth: 1, borderColor: Colors.borderColor },
  cellText: { fontSize: 14, color: '#FFFFFF' },
  cellTextMarked: { color: Colors.onPrimary, fontWeight: '700' },
  cancelBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.darkGray, alignItems: 'center' },
  cancelText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});

export default DayPicker;
