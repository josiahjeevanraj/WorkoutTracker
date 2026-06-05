import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
  TouchableOpacity, FlatList, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, {
  Circle, Path, Defs, Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_W = SCREEN_WIDTH - 72; // card marginH 18 + padding 18 each side

const BODY_METRICS = [
  { id: 'weight',           label: 'Body Weight',   unit: 'kg',   color: Colors.text },
  { id: 'caloriesBurned',   label: 'Cals Burned',   unit: 'kcal', color: Colors.softRed },
  { id: 'caloriesConsumed', label: 'Cals Consumed', unit: 'kcal', color: Colors.amber },
];

const STRENGTH_METRICS = [
  { id: 'maxWeight', label: 'Max Weight', unit: 'kg', color: Colors.text },
  { id: 'volume',    label: 'Volume',     unit: 'kg', color: Colors.indigo },
];

// YYYY-MM-DD key from a local Date
const toKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── SVG line chart ───────────────────────────────────────────────────────────
const SVG_H = 110;

const LineChartSVG = ({ data, labels, color = Colors.text, unit = '' }) => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  useEffect(() => { setSelectedPoint(null); }, [data]);

  const nonZero = (data || []).filter(v => v > 0);
  if (!data || data.length < 2 || nonZero.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="analytics-outline" size={28} color={Colors.gray} />
        <Text style={styles.emptyChartText}>No data for this period</Text>
      </View>
    );
  }

  const VW = 300; const VH = 100; const PAD = 10;
  const max = Math.max(...nonZero);
  const minVal = Math.min(...nonZero);
  const range = max - minVal || 1;
  const w = VW - PAD * 2; const h = VH - PAD * 2;
  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * w,
    y: v > 0 ? PAD + h - ((v - minVal) / range) * h : null,
    v,
  }));
  const nonNullPts = pts.filter(p => p.y !== null);

  const scaleX = CHART_W / VW;
  const scaleY = SVG_H / VH;
  const TOOLTIP_W = 80; const TOOLTIP_H = 28;

  const getTooltipPos = pt => {
    const sx = pt.x * scaleX;
    const sy = pt.svgY * scaleY;
    const left = Math.min(Math.max(sx - TOOLTIP_W / 2, 0), CHART_W - TOOLTIP_W);
    const aboveY = sy - TOOLTIP_H - 8;
    return { left, top: aboveY < 2 ? sy + 10 : aboveY };
  };

  const fmtV = v => v % 1 === 0 ? String(v) : v.toFixed(1);
  const tooltipLabel = pt => `${fmtV(pt.v)}${unit ? ` ${unit}` : ''}`;

  // Single point: render a dot centred vertically, tappable
  if (nonNullPts.length === 1) {
    const p = { ...nonNullPts[0], svgY: VH / 2 };
    const pos = selectedPoint ? getTooltipPos(selectedPoint) : null;
    return (
      <View style={{ position: 'relative' }}>
        <Svg width={CHART_W} height={SVG_H} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none">
          <Circle
            cx={p.x} cy={VH / 2}
            r={selectedPoint ? 5 : 4}
            fill={color}
            onPress={() => setSelectedPoint(prev => prev ? null : p)}
          />
        </Svg>
        {selectedPoint && pos && (
          <View pointerEvents="none" style={[styles.tooltip, { left: pos.left, top: pos.top, width: TOOLTIP_W, borderColor: color }]}>
            <Text style={styles.tooltipText}>{tooltipLabel(selectedPoint)}</Text>
          </View>
        )}
        <View style={styles.chartLabels}>
          {labels.map((l, i) => <Text key={i} style={styles.chartLabel}>{l}</Text>)}
        </View>
      </View>
    );
  }

  const linePath = nonNullPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${nonNullPts[nonNullPts.length - 1].x.toFixed(1)} ${VH} L ${nonNullPts[0].x.toFixed(1)} ${VH} Z`;
  const pos = selectedPoint ? getTooltipPos(selectedPoint) : null;

  return (
    <View style={{ position: 'relative' }}>
      <Svg width={CHART_W} height={SVG_H} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="lgG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d={areaPath} fill="url(#lgG)" />
        <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {nonNullPts.map((p, i) => (
          <Circle
            key={i}
            cx={p.x} cy={p.y}
            r={selectedPoint?.x === p.x ? 5 : 3}
            fill={color}
            onPress={() => setSelectedPoint(prev => prev?.x === p.x ? null : { ...p, svgY: p.y })}
          />
        ))}
      </Svg>
      {selectedPoint && pos && (
        <View pointerEvents="none" style={[styles.tooltip, { left: pos.left, top: pos.top, width: TOOLTIP_W, borderColor: color }]}>
          <Text style={styles.tooltipText}>{tooltipLabel(selectedPoint)}</Text>
        </View>
      )}
      <View style={styles.chartLabels}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.chartLabel}>{l}</Text>
        ))}
      </View>
    </View>
  );
};

// ─── Date range picker ────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['S','M','T','W','T','F','S'];

const DateRangePicker = ({ visible, start, end, onApply, onClose }) => {
  const today = new Date();
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [tempStart, setTempStart] = useState(start);
  const [tempEnd, setTempEnd] = useState(end);

  useEffect(() => {
    if (visible) { setTempStart(start); setTempEnd(end); }
  }, [visible]);

  const handleDayPress = day => {
    const key = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!tempStart || tempEnd) {
      setTempStart(key); setTempEnd(null);
    } else if (key < tempStart) {
      setTempStart(key); setTempEnd(null);
    } else {
      setTempEnd(key);
    }
  };

  const prevMonth = () => {
    if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(y => y - 1); }
    else setPickerMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(y => y + 1); }
    else setPickerMonth(m => m + 1);
  };

  const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const isInRange = key => key && tempStart && tempEnd && key > tempStart && key < tempEnd;
  const isEndpoint = key => key && (key === tempStart || key === tempEnd);
  const fmtKey = key => key ? new Date(key + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.title}>Select Date Range</Text>

        <View style={pickerStyles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={pickerStyles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={pickerStyles.monthLabel}>{MONTH_NAMES[pickerMonth]} {pickerYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={pickerStyles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.dayHeaders}>
          {DAY_LABELS.map((d, i) => <Text key={i} style={pickerStyles.dayHeader}>{d}</Text>)}
        </View>

        <View style={pickerStyles.grid}>
          {cells.map((key, i) => {
            const day = key ? parseInt(key.split('-')[2]) : null;
            const inRange = isInRange(key);
            const endpoint = isEndpoint(key);
            return (
              <TouchableOpacity
                key={i}
                style={[
                  pickerStyles.cell,
                  inRange && pickerStyles.cellInRange,
                  endpoint && pickerStyles.cellEndpoint,
                  !key && pickerStyles.cellEmpty,
                ]}
                onPress={() => key && handleDayPress(day)}
                disabled={!key}
              >
                {key && (
                  <Text style={[
                    pickerStyles.cellText,
                    inRange && pickerStyles.cellInRangeText,
                    endpoint && pickerStyles.cellEndpointText,
                  ]}>{day}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={pickerStyles.rangeSummary}>
          <Text style={pickerStyles.rangeSummaryText}>
            {fmtKey(tempStart)} → {tempEnd ? fmtKey(tempEnd) : 'select end date'}
          </Text>
        </View>

        <View style={pickerStyles.btnRow}>
          <TouchableOpacity style={pickerStyles.cancelBtn} onPress={onClose}>
            <Text style={pickerStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[pickerStyles.applyBtn, (!tempStart || !tempEnd) && { opacity: 0.4 }]}
            onPress={() => { if (tempStart && tempEnd) onApply(tempStart, tempEnd); }}
            disabled={!tempStart || !tempEnd}
          >
            <Text style={pickerStyles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
const ProgressScreen = () => {
  const [progressType, setProgressType] = useState('body');
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [strengthMetric, setStrengthMetric] = useState('maxWeight');
  const [timeView, setTimeView] = useState('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [currentYearOffset, setCurrentYearOffset] = useState(0);
  // bodyData: { 'YYYY-MM-DD': { weight, caloriesBurned, caloriesConsumed } }
  const [bodyData, setBodyData] = useState({});
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [userStats, setUserStats] = useState({ height: '', bodyFat: '' });
  const [goals, setGoals] = useState({ targetWeight: '', targetBodyFat: '' });
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [statsEdit, setStatsEdit] = useState({ height: '', bodyFat: '' });
  const [goalsEdit, setGoalsEdit] = useState({ targetWeight: '', targetBodyFat: '' });
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [customPickerVisible, setCustomPickerVisible] = useState(false);
  const [includeWarmupInStats, setIncludeWarmupInStats] = useState(true);

  useEffect(() => { loadData(); loadProfile(); }, []);

  const loadData = async () => {
    const [fitnessData, history] = await Promise.all([
      StorageService.getFitnessData(),
      StorageService.getWorkoutHistory(),
    ]);
    setBodyData(fitnessData || {});
    setWorkoutHistory(history || []);
  };

  const loadProfile = async () => {
    const profile = await StorageService.getUserProfile();
    if (profile) {
      setUserStats({ height: profile.height?.toString() || '', bodyFat: profile.bodyFat?.toString() || '' });
      setGoals({ targetWeight: profile.goalWeight?.toString() || '', targetBodyFat: profile.goalBodyFat?.toString() || '' });
    }
  };

  const saveStats = async () => {
    const profile = (await StorageService.getUserProfile()) || {};
    await StorageService.saveUserProfile({
      ...profile,
      height: parseFloat(statsEdit.height) || null,
      bodyFat: parseFloat(statsEdit.bodyFat) || null,
    });
    setUserStats({ height: statsEdit.height, bodyFat: statsEdit.bodyFat });
    setStatsModalVisible(false);
  };

  const saveGoals = async () => {
    const profile = (await StorageService.getUserProfile()) || {};
    await StorageService.saveUserProfile({
      ...profile,
      goalWeight: parseFloat(goalsEdit.targetWeight) || null,
      goalBodyFat: parseFloat(goalsEdit.targetBodyFat) || null,
    });
    setGoals({ targetWeight: goalsEdit.targetWeight, targetBodyFat: goalsEdit.targetBodyFat });
    setGoalsModalVisible(false);
  };

  // Unique exercise names from logged sessions, sorted alphabetically
  const availableExercises = useMemo(() => {
    const names = new Set();
    workoutHistory.forEach(s => s.exercises?.forEach(e => { if (e.name) names.add(e.name); }));
    return [...names].sort();
  }, [workoutHistory]);

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch.trim()) return availableExercises;
    const q = exerciseSearch.toLowerCase();
    return availableExercises.filter(n => n.toLowerCase().includes(q));
  }, [availableExercises, exerciseSearch]);

  // ─── Body chart data ────────────────────────────────────────────────────────
  const getBodyChartData = () => {
    let filteredData = [];
    let labels = [];
    const now = new Date();

    switch (timeView) {
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - currentWeekOffset * 7);
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
          const target = new Date(weekStart);
          target.setDate(weekStart.getDate() + i);
          filteredData.push(bodyData[toKey(target)]?.[selectedMetric] || 0);
        }
        break;
      }
      case 'month': {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          if (i % 5 === 1) labels.push(i.toString());
          const target = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
          filteredData.push(bodyData[toKey(target)]?.[selectedMetric] || 0);
        }
        break;
      }
      case 'year': {
        const year = now.getFullYear() - currentYearOffset;
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let month = 0; month < 12; month++) {
          const monthEntries = Object.entries(bodyData).filter(([key]) => {
            const d = new Date(key + 'T00:00:00');
            return d.getFullYear() === year && d.getMonth() === month;
          });
          if (monthEntries.length > 0) {
            const vals = monthEntries.map(([, v]) => v[selectedMetric] || 0).filter(v => v > 0);
            filteredData.push(vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
          } else {
            filteredData.push(0);
          }
        }
        break;
      }
      case 'allTime': {
        const allMonths = {};
        Object.entries(bodyData).forEach(([key, val]) => {
          const d = new Date(key + 'T00:00:00');
          const mk = `${d.getFullYear()}-${d.getMonth()}`;
          if (!allMonths[mk]) allMonths[mk] = [];
          if (val[selectedMetric]) allMonths[mk].push(val[selectedMetric]);
        });
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        Object.keys(allMonths).sort().slice(-12).forEach(key => {
          const [year, month] = key.split('-');
          labels.push(`${MONTHS[parseInt(month)]} ${year.slice(-2)}`);
          const vals = allMonths[key];
          filteredData.push(vals.reduce((a, b) => a + b, 0) / vals.length);
        });
        break;
      }
      case 'custom': {
        if (!customStartDate || !customEndDate) break;
        const startD = new Date(customStartDate + 'T00:00:00');
        const endD = new Date(customEndDate + 'T00:00:00');
        const totalDays = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        const labelEvery = totalDays <= 14 ? 2 : totalDays <= 31 ? 5 : 7;
        for (let i = 0; i < totalDays; i++) {
          const target = new Date(startD);
          target.setDate(startD.getDate() + i);
          filteredData.push(bodyData[toKey(target)]?.[selectedMetric] || 0);
          if (i === 0 || i % labelEvery === 0) labels.push(`${target.getMonth() + 1}/${target.getDate()}`);
        }
        break;
      }
    }
    return { labels, data: filteredData };
  };

  // ─── Strength chart data ────────────────────────────────────────────────────
  const getStrengthChartData = () => {
    if (!selectedExercise) return { labels: [], data: [] };

    const sessionPoints = workoutHistory
      .filter(s => s.exercises?.some(e => e.name === selectedExercise))
      .map(s => {
        const ex = s.exercises.find(e => e.name === selectedExercise);
        const maxW = ex.sets.reduce((m, set) => Math.max(m, parseFloat(set.weight) || 0), 0);
        const vol = ex.sets.reduce(
          (sum, set) => sum + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0
        );
        return { date: new Date(s.completedAt), value: strengthMetric === 'maxWeight' ? maxW : vol };
      });

    let filteredData = [];
    let labels = [];
    const now = new Date();

    switch (timeView) {
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - currentWeekOffset * 7);
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
          const target = new Date(weekStart);
          target.setDate(weekStart.getDate() + i);
          const key = toKey(target);
          const pts = sessionPoints.filter(p => toKey(p.date) === key);
          filteredData.push(pts.length > 0 ? Math.max(...pts.map(p => p.value)) : 0);
        }
        break;
      }
      case 'month': {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          if (i % 5 === 1) labels.push(i.toString());
          const target = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
          const key = toKey(target);
          const pts = sessionPoints.filter(p => toKey(p.date) === key);
          filteredData.push(pts.length > 0 ? Math.max(...pts.map(p => p.value)) : 0);
        }
        break;
      }
      case 'year': {
        const year = now.getFullYear() - currentYearOffset;
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let month = 0; month < 12; month++) {
          const pts = sessionPoints.filter(p => p.date.getFullYear() === year && p.date.getMonth() === month);
          filteredData.push(pts.length > 0 ? Math.max(...pts.map(p => p.value)) : 0);
        }
        break;
      }
      case 'allTime': {
        const allMonths = {};
        sessionPoints.forEach(p => {
          const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
          if (!allMonths[key]) allMonths[key] = [];
          allMonths[key].push(p.value);
        });
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        Object.keys(allMonths).sort().slice(-12).forEach(key => {
          const [year, month] = key.split('-');
          labels.push(`${MONTHS[parseInt(month)]} ${year.slice(-2)}`);
          filteredData.push(Math.max(...allMonths[key]));
        });
        break;
      }
      case 'custom': {
        if (!customStartDate || !customEndDate) break;
        const startD = new Date(customStartDate + 'T00:00:00');
        const endD = new Date(customEndDate + 'T00:00:00');
        const totalDays = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        const labelEvery = totalDays <= 14 ? 2 : totalDays <= 31 ? 5 : 7;
        for (let i = 0; i < totalDays; i++) {
          const target = new Date(startD);
          target.setDate(startD.getDate() + i);
          const key = toKey(target);
          const pts = sessionPoints.filter(p => toKey(p.date) === key);
          filteredData.push(pts.length > 0 ? Math.max(...pts.map(p => p.value)) : 0);
          if (i === 0 || i % labelEvery === 0) labels.push(`${target.getMonth() + 1}/${target.getDate()}`);
        }
        break;
      }
    }
    return { labels, data: filteredData };
  };


  const getPeriodLabel = () => {
    const now = new Date();
    switch (timeView) {
      case 'week': {
        const ws = new Date(now);
        ws.setDate(ws.getDate() - ws.getDay() - currentWeekOffset * 7);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${fmt(ws)} – ${fmt(we)}`;
      }
      case 'month': {
        const m = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        return m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      case 'year':
        return String(now.getFullYear() - currentYearOffset);
      case 'custom': {
        if (customStartDate && customEndDate) {
          const fmt = key => new Date(key + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${fmt(customStartDate)} – ${fmt(customEndDate)}`;
        }
        return 'Select range';
      }
      default:
        return 'All Time';
    }
  };

  const handleSwipe = dir => {
    if (timeView === 'week') setCurrentWeekOffset(p => p + dir);
    if (timeView === 'month') setCurrentMonthOffset(p => p + dir);
    if (timeView === 'year') setCurrentYearOffset(p => p + dir);
  };

  const isAtPresent = (
    (timeView === 'week' && currentWeekOffset === 0) ||
    (timeView === 'month' && currentMonthOffset === 0) ||
    (timeView === 'year' && currentYearOffset === 0) ||
    timeView === 'allTime' ||
    timeView === 'custom'
  );

  const getBigNumber = data => {
    const nonZero = data.filter(v => v > 0);
    if (nonZero.length === 0) return null;
    return nonZero[nonZero.length - 1];
  };

  const getTrend = data => {
    const nonZero = data.filter(v => v > 0);
    if (nonZero.length < 2) return null;
    const pct = ((nonZero[nonZero.length - 1] - nonZero[0]) / nonZero[0]) * 100;
    return pct;
  };

  const bodyChart = getBodyChartData();
  const strChart = getStrengthChartData();

  const activeBodyMetric = BODY_METRICS.find(m => m.id === selectedMetric);
  const activeStrengthMetric = STRENGTH_METRICS.find(m => m.id === strengthMetric);

  const bodyBigNum = getBigNumber(bodyChart.data);
  const bodyTrend = getTrend(bodyChart.data);
  const strBigNum = getBigNumber(strChart.data);
  const strTrend = getTrend(strChart.data);

  const PERIOD_TABS = [
    { id: 'week',    label: 'Week' },
    { id: 'month',   label: 'Month' },
    { id: 'year',    label: 'Year' },
    { id: 'allTime', label: 'All' },
    { id: 'custom',  label: 'Custom' },
  ];

  const setView = id => {
    setTimeView(id);
    setCurrentWeekOffset(0);
    setCurrentMonthOffset(0);
    setCurrentYearOffset(0);
    if (id === 'custom') setCustomPickerVisible(true);
  };

  // Best ever set for selected exercise
  const personalBest = useMemo(() => {
    if (!selectedExercise) return null;
    let best = 0;
    workoutHistory.forEach(s => {
      s.exercises?.forEach(e => {
        if (e.name === selectedExercise) {
          e.sets.forEach(set => { best = Math.max(best, parseFloat(set.weight) || 0); });
        }
      });
    });
    return best > 0 ? best : null;
  }, [workoutHistory, selectedExercise]);

  // Sessions for the currently selected period (used for Stats card)
  const rangeSessionsForStats = useMemo(() => {
    if (!selectedExercise) return [];
    const now = new Date();
    let startKey, endKey;
    switch (timeView) {
      case 'week': {
        const ws = new Date(now);
        ws.setDate(ws.getDate() - ws.getDay() - currentWeekOffset * 7);
        startKey = toKey(ws);
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        endKey = toKey(we);
        break;
      }
      case 'month': {
        const m = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        startKey = toKey(new Date(m.getFullYear(), m.getMonth(), 1));
        endKey = toKey(new Date(m.getFullYear(), m.getMonth() + 1, 0));
        break;
      }
      case 'year': {
        const y = now.getFullYear() - currentYearOffset;
        startKey = `${y}-01-01`; endKey = `${y}-12-31`;
        break;
      }
      case 'custom':
        startKey = customStartDate; endKey = customEndDate;
        break;
      default:
        startKey = '2000-01-01'; endKey = '2099-12-31';
    }
    if (!startKey || !endKey) return [];
    return workoutHistory.filter(s => {
      const k = toKey(new Date(s.completedAt));
      return k >= startKey && k <= endKey && s.exercises?.some(e => e.name === selectedExercise);
    });
  }, [selectedExercise, workoutHistory, timeView, currentWeekOffset, currentMonthOffset, currentYearOffset, customStartDate, customEndDate]);

  // Stats summary for the selected period + exercise
  const exerciseStats = useMemo(() => {
    if (!selectedExercise || rangeSessionsForStats.length === 0) return null;
    let totalSets = 0;
    rangeSessionsForStats.forEach(s => {
      s.exercises?.forEach(e => {
        if (e.name === selectedExercise) {
          totalSets += e.sets.filter(set => includeWarmupInStats || !set.warmup).length;
        }
      });
    });
    const sorted = [...rangeSessionsForStats].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    let pctImprovement = null;
    if (sorted.length >= 2) {
      const firstMax = sorted[0].exercises.find(e => e.name === selectedExercise)
        .sets.reduce((m, s) => Math.max(m, parseFloat(s.weight) || 0), 0);
      const lastMax = sorted[sorted.length - 1].exercises.find(e => e.name === selectedExercise)
        .sets.reduce((m, s) => Math.max(m, parseFloat(s.weight) || 0), 0);
      if (firstMax > 0) pctImprovement = ((lastMax - firstMax) / firstMax) * 100;
    }
    return { totalSessions: rangeSessionsForStats.length, totalSets, pb: personalBest, pctImprovement };
  }, [selectedExercise, rangeSessionsForStats, includeWarmupInStats, personalBest]);

  // Sessions in the selected period for the recent sessions list
  const recentStrengthSessions = useMemo(() => {
    if (!selectedExercise) return [];
    return [...rangeSessionsForStats]
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5)
      .map(s => ({
        date: s.completedAt,
        sets: s.exercises.find(e => e.name === selectedExercise).sets,
      }));
  }, [rangeSessionsForStats, selectedExercise]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={styles.typePill}>
          {['body', 'exercise'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typePillBtn, progressType === type && styles.typePillBtnActive]}
              onPress={() => setProgressType(type)}
            >
              <Text style={[styles.typePillText, progressType === type && styles.typePillTextActive]}>
                {type === 'body' ? 'Body' : 'Exercise'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── BODY METRICS ─────────────────────────────────────────────────── */}
      {progressType === 'body' && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillScrollContent}
          >
            {BODY_METRICS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.metricPill, selectedMetric === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                onPress={() => setSelectedMetric(m.id)}
              >
                <Text style={[styles.metricPillText, selectedMetric === m.id && styles.metricPillTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.periodSelector}>
            {PERIOD_TABS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.periodBtn, timeView === t.id && styles.periodBtnActive]}
                onPress={() => setView(t.id)}
              >
                <Text style={[styles.periodBtnText, timeView === t.id && styles.periodBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartCardTop}>
              <View>
                <Text style={styles.chartCardLabel}>{activeBodyMetric.label.toUpperCase()}</Text>
                <View style={styles.chartCardValueRow}>
                  {bodyBigNum !== null ? (
                    <>
                      <Text style={[styles.chartCardBigValue, { color: activeBodyMetric.color }]}>
                        {bodyBigNum % 1 === 0 ? bodyBigNum : bodyBigNum.toFixed(1)}
                      </Text>
                      <Text style={styles.chartCardUnit}> {activeBodyMetric.unit}</Text>
                    </>
                  ) : (
                    <Text style={styles.chartCardNoData}>—</Text>
                  )}
                </View>
              </View>
              {bodyTrend !== null && (
                <View style={[styles.trendBadge, { backgroundColor: bodyTrend >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }]}>
                  <Ionicons
                    name={bodyTrend >= 0 ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={bodyTrend >= 0 ? Colors.green : Colors.softRed}
                  />
                  <Text style={[styles.trendText, { color: bodyTrend >= 0 ? Colors.green : Colors.softRed }]}>
                    {' '}{bodyTrend >= 0 ? '+' : ''}{bodyTrend.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>

            {timeView !== 'allTime' && timeView !== 'custom' && (
              <View style={styles.periodNav}>
                <TouchableOpacity onPress={() => handleSwipe(1)} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={18} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.periodNavCenter}>
                  <Text style={styles.periodNavLabel}>{getPeriodLabel()}</Text>
                  {!isAtPresent && (
                    <TouchableOpacity
                      style={styles.nowBtn}
                      onPress={() => { setCurrentWeekOffset(0); setCurrentMonthOffset(0); setCurrentYearOffset(0); }}
                    >
                      <Ionicons name="return-up-forward-outline" size={12} color={Colors.background} />
                      <Text style={styles.nowBtnText}>Today</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleSwipe(-1)} style={styles.navBtn} disabled={isAtPresent}>
                  <Ionicons name="chevron-forward" size={18} color={isAtPresent ? Colors.gray : Colors.text} />
                </TouchableOpacity>
              </View>
            )}
            {timeView === 'custom' && (
              <TouchableOpacity style={styles.customRangeNav} onPress={() => setCustomPickerVisible(true)}>
                <Ionicons name="calendar-outline" size={14} color={Colors.text} />
                <Text style={styles.customRangeNavText}>{getPeriodLabel()}</Text>
                <Ionicons name="pencil-outline" size={12} color={Colors.gray} />
              </TouchableOpacity>
            )}

            <LineChartSVG data={bodyChart.data} labels={bodyChart.labels} color={activeBodyMetric.color} unit={activeBodyMetric.unit} />
          </View>

          {/* Current Stats */}
          <View style={styles.statsCard}>
            <View style={styles.statsCardHeader}>
              <Text style={styles.statsCardTitle}>CURRENT STATS</Text>
              <TouchableOpacity onPress={() => { setStatsEdit({ ...userStats }); setStatsModalVisible(true); }}>
                <Ionicons name="pencil-outline" size={16} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.statsRow}>
              {[
                { label: 'Weight', value: bodyBigNum !== null ? `${bodyBigNum % 1 === 0 ? bodyBigNum : bodyBigNum.toFixed(1)} kg` : '—' },
                { label: 'Height', value: userStats.height ? `${userStats.height} cm` : '—' },
                { label: 'Body Fat', value: userStats.bodyFat ? `${userStats.bodyFat}%` : '—' },
              ].map(s => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={styles.statItemLabel}>{s.label}</Text>
                  <Text style={styles.statItemValue}>{s.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Goals */}
          <View style={styles.statsCard}>
            <View style={styles.statsCardHeader}>
              <Text style={styles.statsCardTitle}>GOALS</Text>
              <TouchableOpacity onPress={() => { setGoalsEdit({ ...goals }); setGoalsModalVisible(true); }}>
                <Ionicons name="pencil-outline" size={16} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.statsRow}>
              {[
                { label: 'Target Weight', value: goals.targetWeight ? `${goals.targetWeight} kg` : '—' },
                { label: 'Target Body Fat', value: goals.targetBodyFat ? `${goals.targetBodyFat}%` : '—' },
              ].map(s => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={styles.statItemLabel}>{s.label}</Text>
                  <Text style={styles.statItemValue}>{s.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* ── EXERCISE PROGRESS ────────────────────────────────────────────── */}
      {progressType === 'exercise' && (
        <>
          <TouchableOpacity style={styles.exercisePicker} onPress={() => setExerciseModalVisible(true)}>
            <View style={styles.exercisePickerLeft}>
              <View style={[styles.exercisePickerIcon, { backgroundColor: selectedExercise ? 'rgba(255,255,255,0.08)' : 'rgba(107,114,128,0.15)' }]}>
                <Ionicons name="barbell-outline" size={18} color={selectedExercise ? Colors.text : Colors.gray} />
              </View>
              <Text style={[styles.exercisePickerText, !selectedExercise && { color: Colors.gray }]}>
                {selectedExercise || 'Select an exercise'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.gray} />
          </TouchableOpacity>

          {selectedExercise && (
            <>
              {/* Strength metric pills */}
              <View style={[styles.pillScroll, { marginBottom: 12 }]}>
                <View style={[styles.pillScrollContent, { flexDirection: 'row', gap: 10 }]}>
                  {STRENGTH_METRICS.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.metricPill, strengthMetric === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                      onPress={() => setStrengthMetric(m.id)}
                    >
                      <Text style={[styles.metricPillText, strengthMetric === m.id && styles.metricPillTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Period tabs */}
              <View style={styles.periodSelector}>
                {PERIOD_TABS.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.periodBtn, timeView === t.id && styles.periodBtnActive]}
                    onPress={() => setView(t.id)}
                  >
                    <Text style={[styles.periodBtnText, timeView === t.id && styles.periodBtnTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chart card */}
              <View style={styles.chartCard}>
                <View style={styles.chartCardTop}>
                  <View>
                    <Text style={styles.chartCardLabel}>{activeStrengthMetric.label.toUpperCase()}</Text>
                    <View style={styles.chartCardValueRow}>
                      {strBigNum !== null ? (
                        <>
                          <Text style={[styles.chartCardBigValue, { color: activeStrengthMetric.color }]}>
                            {strBigNum % 1 === 0 ? strBigNum : strBigNum.toFixed(1)}
                          </Text>
                          <Text style={styles.chartCardUnit}> {activeStrengthMetric.unit}</Text>
                        </>
                      ) : (
                        <Text style={styles.chartCardNoData}>—</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.pbBadge}>
                    <Text style={styles.pbLabel}>PB</Text>
                    <Text style={styles.pbValue}>{personalBest !== null ? `${personalBest} kg` : '—'}</Text>
                  </View>
                  {strTrend !== null && (
                    <View style={[styles.trendBadge, { backgroundColor: strTrend >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }]}>
                      <Ionicons
                        name={strTrend >= 0 ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={strTrend >= 0 ? Colors.green : Colors.softRed}
                      />
                      <Text style={[styles.trendText, { color: strTrend >= 0 ? Colors.green : Colors.softRed }]}>
                        {' '}{strTrend >= 0 ? '+' : ''}{strTrend.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>

                {timeView !== 'allTime' && timeView !== 'custom' && (
                  <View style={styles.periodNav}>
                    <TouchableOpacity onPress={() => handleSwipe(1)} style={styles.navBtn}>
                      <Ionicons name="chevron-back" size={18} color={Colors.text} />
                    </TouchableOpacity>
                    <View style={styles.periodNavCenter}>
                      <Text style={styles.periodNavLabel}>{getPeriodLabel()}</Text>
                      {!isAtPresent && (
                        <TouchableOpacity
                          style={styles.nowBtn}
                          onPress={() => { setCurrentWeekOffset(0); setCurrentMonthOffset(0); setCurrentYearOffset(0); }}
                        >
                          <Ionicons name="return-up-forward-outline" size={12} color={Colors.background} />
                          <Text style={styles.nowBtnText}>Today</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleSwipe(-1)} style={styles.navBtn} disabled={isAtPresent}>
                      <Ionicons name="chevron-forward" size={18} color={isAtPresent ? Colors.gray : Colors.text} />
                    </TouchableOpacity>
                  </View>
                )}
                {timeView === 'custom' && (
                  <TouchableOpacity style={styles.customRangeNav} onPress={() => setCustomPickerVisible(true)}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.text} />
                    <Text style={styles.customRangeNavText}>{getPeriodLabel()}</Text>
                    <Ionicons name="pencil-outline" size={12} color={Colors.gray} />
                  </TouchableOpacity>
                )}

                <LineChartSVG data={strChart.data} labels={strChart.labels} color={activeStrengthMetric.color} unit={activeStrengthMetric.unit} />
              </View>

              {/* Stats summary for selected period */}
              {exerciseStats && (
                <View style={styles.statsCard}>
                  <View style={styles.statsCardHeader}>
                    <Text style={styles.statsCardTitle}>STATS · {getPeriodLabel().toUpperCase()}</Text>
                    <TouchableOpacity
                      style={styles.warmupToggleRow}
                      onPress={() => setIncludeWarmupInStats(v => !v)}
                    >
                      <Text style={styles.warmupToggleLabel}>Warmup</Text>
                      <View style={[styles.togglePill, includeWarmupInStats && styles.togglePillActive]}>
                        <View style={[styles.toggleThumb, includeWarmupInStats && styles.toggleThumbActive]} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statItemLabel}>Sessions</Text>
                      <Text style={styles.statItemValue}>{exerciseStats.totalSessions}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statItemLabel}>Sets</Text>
                      <Text style={styles.statItemValue}>{exerciseStats.totalSets}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statItemLabel}>PB</Text>
                      <Text style={styles.statItemValue}>{exerciseStats.pb !== null ? `${exerciseStats.pb}kg` : '—'}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statItemLabel}>Change</Text>
                      <Text style={[
                        styles.statItemValue,
                        exerciseStats.pctImprovement !== null && {
                          color: exerciseStats.pctImprovement >= 0 ? Colors.green : Colors.softRed,
                        },
                      ]}>
                        {exerciseStats.pctImprovement !== null
                          ? `${exerciseStats.pctImprovement >= 0 ? '+' : ''}${exerciseStats.pctImprovement.toFixed(1)}%`
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Recent sessions — collapsible */}
              {recentStrengthSessions.length > 0 && (
                <>
                  <TouchableOpacity
                    style={styles.sessionsSectionHeader}
                    onPress={() => setSessionsExpanded(v => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sessionsTitle}>RECENT SESSIONS</Text>
                    <View style={styles.sessionsBadgeRow}>
                      <View style={styles.sessionsBadge}>
                        <Text style={styles.sessionsBadgeText}>{recentStrengthSessions.length}</Text>
                      </View>
                      <Ionicons
                        name={sessionsExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={Colors.gray}
                      />
                    </View>
                  </TouchableOpacity>

                  {sessionsExpanded && recentStrengthSessions.map((item, idx) => (
                    <View key={idx} style={styles.sessionCard}>
                      <Text style={styles.sessionDate}>{friendlyDate(item.date)}</Text>
                      <View style={styles.setsHeader}>
                        <Text style={styles.setCol}>Set</Text>
                        <Text style={styles.setCol}>Weight</Text>
                        <Text style={styles.setCol}>Reps</Text>
                        <Text style={styles.setCol}>Volume</Text>
                      </View>
                      {item.sets.map((set, si) => {
                        const w = parseFloat(set.weight) || 0;
                        const r = parseInt(set.reps) || 0;
                        return (
                          <View key={si} style={styles.setRow}>
                            <Text style={styles.setCell}>{si + 1}</Text>
                            <Text style={styles.setCell}>{w > 0 ? `${w} kg` : '—'}</Text>
                            <Text style={styles.setCell}>{r}</Text>
                            <Text style={styles.setCell}>{w > 0 && r > 0 ? `${(w * r).toFixed(0)} kg` : '—'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {!selectedExercise && availableExercises.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={36} color={Colors.gray} />
              <Text style={styles.emptyStateTitle}>No exercises logged yet</Text>
              <Text style={styles.emptyStateText}>Log a workout session to start tracking your progress.</Text>
            </View>
          )}

          {!selectedExercise && availableExercises.length > 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={36} color={Colors.gray} />
              <Text style={styles.emptyStateTitle}>Pick an exercise</Text>
              <Text style={styles.emptyStateText}>Select an exercise above to view your progress over time.</Text>
            </View>
          )}
        </>
      )}

      {/* ── DATE RANGE PICKER ────────────────────────────────────────────── */}
      <DateRangePicker
        visible={customPickerVisible}
        start={customStartDate}
        end={customEndDate}
        onApply={(s, e) => { setCustomStartDate(s); setCustomEndDate(e); setCustomPickerVisible(false); }}
        onClose={() => setCustomPickerVisible(false)}
      />

      {/* ── EXERCISE PICKER MODAL ────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={exerciseModalVisible} onRequestClose={() => setExerciseModalVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setExerciseModalVisible(false)} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Exercise</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={Colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={Colors.gray}
              value={exerciseSearch}
              onChangeText={setExerciseSearch}
            />
          </View>
          {filteredExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
                {availableExercises.length === 0 ? 'No exercises logged yet.' : 'No matches found.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => { setSelectedExercise(item); setExerciseModalVisible(false); setExerciseSearch(''); setSessionsExpanded(false); }}
                >
                  <View style={styles.sheetItemIcon}>
                    <Ionicons name="barbell-outline" size={18} color={Colors.text} />
                  </View>
                  <Text style={styles.sheetItemText}>{item}</Text>
                  {selectedExercise === item && <Ionicons name="checkmark" size={18} color={Colors.text} />}
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </Modal>

      {/* ── STATS EDIT MODAL ─────────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={statsModalVisible} onRequestClose={() => setStatsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setStatsModalVisible(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Current Stats</Text>
            {[
              { label: 'Height (cm)', key: 'height', placeholder: 'e.g. 175' },
              { label: 'Body Fat (%)', key: 'bodyFat', placeholder: 'e.g. 18' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.gray}
                  value={statsEdit[f.key]}
                  onChangeText={v => setStatsEdit(p => ({ ...p, [f.key]: v }))}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveStats}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── GOALS EDIT MODAL ─────────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={goalsModalVisible} onRequestClose={() => setGoalsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setGoalsModalVisible(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Goals</Text>
            {[
              { label: 'Target Weight (kg)', key: 'targetWeight', placeholder: 'e.g. 70' },
              { label: 'Target Body Fat (%)', key: 'targetBodyFat', placeholder: 'e.g. 15' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.gray}
                  value={goalsEdit[f.key]}
                  onChangeText={v => setGoalsEdit(p => ({ ...p, [f.key]: v }))}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveGoals}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const friendlyDate = iso => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  typePill: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12, padding: 3,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  typePillBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  typePillBtnActive: { backgroundColor: Colors.background },
  typePillText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  typePillTextActive: { color: '#FFFFFF' },

  pillScroll: { marginBottom: 12 },
  pillScrollContent: { paddingHorizontal: 18, gap: 8 },
  metricPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  metricPillText: { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  metricPillTextActive: { color: '#FFFFFF' },

  periodSelector: {
    flexDirection: 'row', marginHorizontal: 18, marginBottom: 14,
    backgroundColor: Colors.cardBackground, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  periodBtnActive: { backgroundColor: Colors.background },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  periodBtnTextActive: { color: '#FFFFFF' },

  chartCard: {
    marginHorizontal: 18, marginBottom: 14, padding: 18,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.borderColor,
  },
  chartCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  chartCardLabel: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.6 },
  chartCardValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  chartCardBigValue: { fontSize: 28, fontWeight: '800' },
  chartCardUnit: { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  chartCardNoData: { fontSize: 28, fontWeight: '800', color: Colors.gray },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  trendText: { fontSize: 12, fontWeight: '600' },
  pbBadge: { alignItems: 'center' },
  pbLabel: { fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.4 },
  pbValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  periodNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 4 },
  periodNavCenter: { alignItems: 'center', gap: 4 },
  periodNavLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  nowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: Colors.text,
  },
  nowBtnText: { fontSize: 12, fontWeight: '700', color: Colors.background },

  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  chartLabel: { fontSize: 11, color: Colors.gray, fontWeight: '500' },

  tooltip: {
    position: 'absolute',
    backgroundColor: Colors.cardBackground,
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 5,
    alignItems: 'center',
  },
  tooltipText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  emptyChart: { height: 110, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText: { fontSize: 13, color: Colors.gray },

  statsCard: {
    marginHorizontal: 18, marginBottom: 14, padding: 16,
    backgroundColor: Colors.cardBackground, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  statsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statsCardTitle: { fontSize: 11, fontWeight: '700', color: Colors.gray, letterSpacing: 0.8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statItemLabel: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  statItemValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  inputLabel: { fontSize: 13, color: Colors.gray, fontWeight: '600', marginBottom: 6 },

  exercisePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 18, marginBottom: 14, padding: 14,
    backgroundColor: Colors.cardBackground, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  exercisePickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exercisePickerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exercisePickerText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  sessionsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 18, marginBottom: 10, paddingVertical: 4,
  },
  sessionsTitle: { fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.6 },
  sessionsBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionsBadge: {
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderColor,
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  sessionsBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.gray },
  sessionCard: {
    marginHorizontal: 18, marginBottom: 10, padding: 14,
    backgroundColor: Colors.cardBackground, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  sessionDate: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 },
  setsHeader: { flexDirection: 'row', marginBottom: 6 },
  setRow: { flexDirection: 'row', paddingVertical: 4, borderTopWidth: 1, borderTopColor: Colors.borderColor },
  setCol: { flex: 1, fontSize: 10, color: Colors.gray, fontWeight: '600', letterSpacing: 0.4 },
  setCell: { flex: 1, fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  emptyState: {
    marginHorizontal: 18, marginTop: 16, padding: 36,
    backgroundColor: Colors.cardBackground, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.borderColor,
    alignItems: 'center', gap: 10,
  },
  emptyStateTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  emptyStateText: { fontSize: 13, color: Colors.gray, textAlign: 'center', lineHeight: 20 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: Colors.borderColor,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderColor, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.borderColor, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderColor,
  },
  sheetItemIcon: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sheetItemText: { flex: 1, fontSize: 15, color: '#FFFFFF', fontWeight: '500' },

  input: {
    borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 16,
    color: '#FFFFFF', backgroundColor: Colors.background,
  },

  customRangeNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 12,
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: 'rgba(88,216,219,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(88,216,219,0.2)',
  },
  customRangeNavText: { fontSize: 13, fontWeight: '600', color: Colors.text },

  warmupToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warmupToggleLabel: { fontSize: 11, color: Colors.gray, fontWeight: '500' },
  togglePill: {
    width: 32, height: 18, borderRadius: 9, backgroundColor: Colors.borderColor,
    justifyContent: 'center', paddingHorizontal: 2,
  },
  togglePillActive: { backgroundColor: Colors.text },
  toggleThumb: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.gray },
  toggleThumbActive: { alignSelf: 'flex-end', backgroundColor: Colors.background },

  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderColor,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.gray },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

const CELL_SIZE = Math.floor((SCREEN_WIDTH - 48 - 32) / 7); // sheet padding 24*2 + inner padding 16*2

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: Colors.borderColor,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderColor, alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, color: Colors.gray, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  cellEmpty: { opacity: 0 },
  cellInRange: { backgroundColor: 'rgba(88,216,219,0.15)', borderRadius: 0 },
  cellEndpoint: { backgroundColor: Colors.text, borderRadius: CELL_SIZE / 2 },
  cellText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  cellInRangeText: { color: Colors.text, fontWeight: '600' },
  cellEndpointText: { color: Colors.background, fontWeight: '700' },

  rangeSummary: {
    alignItems: 'center', marginBottom: 16,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  rangeSummaryText: { fontSize: 13, color: Colors.gray, fontWeight: '500' },

  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderColor, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.gray },
  applyBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default ProgressScreen;
