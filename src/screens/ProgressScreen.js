import React, { useState, useEffect } from 'react';
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
const CHART_W = SCREEN_WIDTH - 36;

const BODY_METRICS = [
  { id: 'weight',           label: 'Body Weight',   unit: 'kg',   color: Colors.text },
  { id: 'caloriesBurned',   label: 'Cals Burned',   unit: 'kcal', color: Colors.softRed },
  { id: 'caloriesConsumed', label: 'Cals Consumed', unit: 'kcal', color: Colors.amber },
];

const CARDIO_METRICS = [
  { id: 'pace',     label: 'Pace',     unit: 'min/km', color: Colors.text },
  { id: 'distance', label: 'Distance', unit: 'km',     color: Colors.indigo },
];

const EXERCISE_ICONS = {
  Running:       { icon: 'walk-outline',    color: Colors.softRed },
  Cycling:       { icon: 'bicycle-outline', color: Colors.amber },
  Swimming:      { icon: 'water-outline',   color: Colors.indigo },
  'Bench Press': { icon: 'barbell-outline', color: Colors.text },
  Squats:        { icon: 'barbell-outline', color: Colors.green },
  Deadlifts:     { icon: 'barbell-outline', color: Colors.indigo },
};

// ─── SVG line chart ───────────────────────────────────────────────────────────
const LineChartSVG = ({ data, labels, color = Colors.text }) => {
  const nonZero = (data || []).filter(v => v > 0);
  if (!data || data.length < 2 || nonZero.length < 2) {
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

  const segments = [];
  let seg = [];
  pts.forEach(p => {
    if (p.y !== null) {
      seg.push(p);
    } else if (seg.length > 0) {
      segments.push(seg); seg = [];
    }
  });
  if (seg.length > 0) segments.push(seg);

  return (
    <View>
      <Svg width={CHART_W} height={110} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="lgG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        {segments.map((s, si) => {
          const l = s.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
          const a = `${l} L ${s[s.length - 1].x.toFixed(1)} ${VH} L ${s[0].x.toFixed(1)} ${VH} Z`;
          return (
            <React.Fragment key={si}>
              <Path d={a} fill="url(#lgG)" />
              <Path d={l} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
            </React.Fragment>
          );
        })}
        {pts.filter(p => p.y !== null).map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.chartLabel}>{l}</Text>
        ))}
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
const ProgressScreen = () => {
  const [progressType, setProgressType] = useState('body');
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [cardioMetric, setCardioMetric] = useState('pace');
  const [timeView, setTimeView] = useState('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [currentYearOffset, setCurrentYearOffset] = useState(0);
  const [bodyData, setBodyData] = useState([]);
  const [exerciseData, setExerciseData] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [userStats, setUserStats] = useState({ height: '', bodyFat: '' });
  const [goals, setGoals] = useState({ targetWeight: '', targetBodyFat: '' });
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [statsEdit, setStatsEdit] = useState({ height: '', bodyFat: '' });
  const [goalsEdit, setGoalsEdit] = useState({ targetWeight: '', targetBodyFat: '' });

  useEffect(() => { loadProgressData(); loadProfile(); }, []);

  const loadProgressData = async () => {
    const progressData = await StorageService.getProgressData();
    if (progressData.bodyMetrics) {
      setBodyData(progressData.bodyMetrics);
    } else {
      const sampleData = generateSampleData();
      setBodyData(sampleData.bodyMetrics);
      setExerciseData(sampleData.exercises);
      setAvailableExercises(Object.keys(sampleData.exercises));
      await StorageService.saveProgressData({
        bodyMetrics: sampleData.bodyMetrics,
        exercises: sampleData.exercises,
      });
    }
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

  const generateSampleData = () => {
    const today = new Date();
    const bodyMetrics = [];
    const exercises = { Running: [], Cycling: [], Swimming: [], 'Bench Press': [], Squats: [], Deadlifts: [] };

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      bodyMetrics.push({
        date: date.toISOString(),
        weight: 150 + Math.random() * 10,
        caloriesBurned: 300 + Math.random() * 200,
        caloriesConsumed: 1800 + Math.random() * 400,
      });
    }

    ['Running', 'Cycling', 'Swimming'].forEach(ex => {
      for (let i = 0; i < 10; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        exercises[ex].push({
          date: date.toISOString(),
          distance: (Math.random() * 10 + 1).toFixed(2),
          duration: Math.floor(Math.random() * 60 + 20),
          pace: (Math.random() * 3 + 5).toFixed(2),
        });
      }
    });

    return { bodyMetrics, exercises };
  };

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
          const d = bodyData.find(d => new Date(d.date).toDateString() === target.toDateString());
          filteredData.push(d ? d[selectedMetric] : 0);
        }
        break;
      }
      case 'month': {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          if (i % 5 === 1) labels.push(i.toString());
          const target = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
          const d = bodyData.find(d => new Date(d.date).toDateString() === target.toDateString());
          filteredData.push(d ? d[selectedMetric] : 0);
        }
        break;
      }
      case 'year': {
        const year = now.getFullYear() - currentYearOffset;
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let month = 0; month < 12; month++) {
          const monthData = bodyData.filter(d => {
            const date = new Date(d.date);
            return date.getFullYear() === year && date.getMonth() === month;
          });
          filteredData.push(
            monthData.length > 0
              ? monthData.reduce((s, d) => s + d[selectedMetric], 0) / monthData.length
              : 0
          );
        }
        break;
      }
      case 'allTime': {
        const allMonths = {};
        bodyData.forEach(d => {
          const date = new Date(d.date);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (!allMonths[key]) allMonths[key] = [];
          allMonths[key].push(d[selectedMetric]);
        });
        Object.keys(allMonths).sort().slice(-12).forEach(key => {
          const [year, month] = key.split('-');
          labels.push(`${month}/${year.slice(-2)}`);
          const vals = allMonths[key];
          filteredData.push(vals.reduce((a, b) => a + b, 0) / vals.length);
        });
        break;
      }
    }
    return { labels, data: filteredData };
  };

  const getExerciseChartData = () => {
    if (!selectedExercise || !exerciseData[selectedExercise]) return { labels: [], data: [] };
    const isCardio = ['Running', 'Cycling', 'Swimming'].includes(selectedExercise);
    if (!isCardio) return { labels: [], data: [] };

    const sessions = exerciseData[selectedExercise] || [];
    const now = new Date();
    let filteredData = [];
    let labels = [];

    switch (timeView) {
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - currentWeekOffset * 7);
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
          const target = new Date(weekStart);
          target.setDate(weekStart.getDate() + i);
          const dayData = sessions.filter(d => new Date(d.date).toDateString() === target.toDateString());
          if (dayData.length > 0) {
            filteredData.push(
              dayData.reduce((s, d) => s + parseFloat(cardioMetric === 'pace' ? d.pace : d.distance), 0) / dayData.length
            );
          } else {
            filteredData.push(0);
          }
        }
        break;
      }
      case 'month': {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        for (let week = 0; week < 4; week++) {
          labels.push(`W${week + 1}`);
          const wStart = new Date(monthDate);
          wStart.setDate(wStart.getDate() + week * 7);
          const wEnd = new Date(wStart);
          wEnd.setDate(wStart.getDate() + 6);
          const weekData = sessions.filter(d => { const date = new Date(d.date); return date >= wStart && date <= wEnd; });
          filteredData.push(
            weekData.length > 0
              ? weekData.reduce((s, d) => s + parseFloat(cardioMetric === 'pace' ? d.pace : d.distance), 0) / weekData.length
              : 0
          );
        }
        break;
      }
      case 'year': {
        const year = now.getFullYear() - currentYearOffset;
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let month = 0; month < 12; month++) {
          const monthData = sessions.filter(d => {
            const date = new Date(d.date);
            return date.getFullYear() === year && date.getMonth() === month;
          });
          filteredData.push(
            monthData.length > 0
              ? monthData.reduce((s, d) => s + parseFloat(cardioMetric === 'pace' ? d.pace : d.distance), 0) / monthData.length
              : 0
          );
        }
        break;
      }
      case 'allTime': {
        const allMonths = {};
        sessions.forEach(d => {
          const date = new Date(d.date);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (!allMonths[key]) allMonths[key] = [];
          allMonths[key].push(parseFloat(cardioMetric === 'pace' ? d.pace : d.distance));
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
    (timeView === 'year' && currentYearOffset === 0)
  );

  const getBigNumber = data => {
    const nonZero = data.filter(v => v > 0);
    if (nonZero.length === 0) return null;
    return nonZero[nonZero.length - 1];
  };

  const getTrend = data => {
    const nonZero = data.filter(v => v > 0);
    if (nonZero.length < 2) return null;
    const first = nonZero[0];
    const last = nonZero[nonZero.length - 1];
    const pct = ((last - first) / first) * 100;
    return pct;
  };

  const CARDIO_EXERCISES = ['Running', 'Cycling', 'Swimming'];
  const isCardio = selectedExercise && CARDIO_EXERCISES.includes(selectedExercise);

  const bodyChart = getBodyChartData();
  const exChart = getExerciseChartData();

  const activeBodyMetric = BODY_METRICS.find(m => m.id === selectedMetric);
  const activeCardioMetric = CARDIO_METRICS.find(m => m.id === cardioMetric);

  const bodyBigNum = getBigNumber(bodyChart.data);
  const bodyTrend = getTrend(bodyChart.data);
  const exBigNum = getBigNumber(exChart.data);
  const exTrend = getTrend(exChart.data);

  const PERIOD_TABS = [
    { id: 'week',    label: 'Week' },
    { id: 'month',   label: 'Month' },
    { id: 'year',    label: 'Year' },
    { id: 'allTime', label: 'All' },
  ];

  const setView = id => {
    setTimeView(id);
    setCurrentWeekOffset(0);
    setCurrentMonthOffset(0);
    setCurrentYearOffset(0);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={styles.typePill}>
          {['body', 'exercise'].map((type, i) => (
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
          {/* Metric pills */}
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

            {/* Period nav */}
            {timeView !== 'allTime' && (
              <View style={styles.periodNav}>
                <TouchableOpacity onPress={() => handleSwipe(1)} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={18} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.periodNavLabel}>{getPeriodLabel()}</Text>
                <TouchableOpacity
                  onPress={() => handleSwipe(-1)}
                  style={styles.navBtn}
                  disabled={isAtPresent}
                >
                  <Ionicons name="chevron-forward" size={18} color={isAtPresent ? Colors.gray : Colors.text} />
                </TouchableOpacity>
              </View>
            )}

            <LineChartSVG
              data={bodyChart.data}
              labels={bodyChart.labels}
              color={activeBodyMetric.color}
            />
          </View>

          {/* Current Stats card */}
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

          {/* Goals card */}
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
          {/* Exercise picker */}
          <TouchableOpacity style={styles.exercisePicker} onPress={() => setExerciseModalVisible(true)}>
            <View style={styles.exercisePickerLeft}>
              {selectedExercise ? (
                <>
                  <View style={[styles.exercisePickerIcon, { backgroundColor: `${(EXERCISE_ICONS[selectedExercise] || {}).color || Colors.text}20` }]}>
                    <Ionicons
                      name={(EXERCISE_ICONS[selectedExercise] || { icon: 'barbell-outline' }).icon}
                      size={18}
                      color={(EXERCISE_ICONS[selectedExercise] || { color: Colors.text }).color}
                    />
                  </View>
                  <Text style={styles.exercisePickerText}>{selectedExercise}</Text>
                </>
              ) : (
                <>
                  <View style={[styles.exercisePickerIcon, { backgroundColor: 'rgba(107,114,128,0.15)' }]}>
                    <Ionicons name="search-outline" size={18} color={Colors.gray} />
                  </View>
                  <Text style={[styles.exercisePickerText, { color: Colors.gray }]}>Select an exercise</Text>
                </>
              )}
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.gray} />
          </TouchableOpacity>

          {selectedExercise && isCardio && (
            <>
              {/* Cardio metric pills */}
              <View style={styles.pillScroll}>
                <View style={[styles.pillScrollContent, { flexDirection: 'row', gap: 10 }]}>
                  {CARDIO_METRICS.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.metricPill, cardioMetric === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                      onPress={() => setCardioMetric(m.id)}
                    >
                      <Text style={[styles.metricPillText, cardioMetric === m.id && styles.metricPillTextActive]}>
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
                    <Text style={styles.chartCardLabel}>{activeCardioMetric.label.toUpperCase()}</Text>
                    <View style={styles.chartCardValueRow}>
                      {exBigNum !== null ? (
                        <>
                          <Text style={[styles.chartCardBigValue, { color: activeCardioMetric.color }]}>
                            {exBigNum.toFixed(2)}
                          </Text>
                          <Text style={styles.chartCardUnit}> {activeCardioMetric.unit}</Text>
                        </>
                      ) : (
                        <Text style={styles.chartCardNoData}>—</Text>
                      )}
                    </View>
                  </View>
                  {exTrend !== null && (
                    <View style={[styles.trendBadge, { backgroundColor: exTrend >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }]}>
                      <Ionicons
                        name={exTrend >= 0 ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={exTrend >= 0 ? Colors.green : Colors.softRed}
                      />
                      <Text style={[styles.trendText, { color: exTrend >= 0 ? Colors.green : Colors.softRed }]}>
                        {' '}{exTrend >= 0 ? '+' : ''}{exTrend.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>

                {timeView !== 'allTime' && (
                  <View style={styles.periodNav}>
                    <TouchableOpacity onPress={() => handleSwipe(1)} style={styles.navBtn}>
                      <Ionicons name="chevron-back" size={18} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.periodNavLabel}>{getPeriodLabel()}</Text>
                    <TouchableOpacity
                      onPress={() => handleSwipe(-1)}
                      style={styles.navBtn}
                      disabled={isAtPresent}
                    >
                      <Ionicons name="chevron-forward" size={18} color={isAtPresent ? Colors.gray : Colors.text} />
                    </TouchableOpacity>
                  </View>
                )}

                <LineChartSVG
                  data={exChart.data}
                  labels={exChart.labels}
                  color={activeCardioMetric.color}
                />
              </View>

              {/* Recent sessions */}
              <Text style={styles.sessionsTitle}>RECENT SESSIONS</Text>
              {(exerciseData[selectedExercise] || [])
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((item, idx) => (
                  <View key={idx} style={[styles.sessionCard, { borderLeftColor: (EXERCISE_ICONS[selectedExercise] || { color: Colors.text }).color }]}>
                    <Text style={styles.sessionDate}>{friendlyDate(item.date)}</Text>
                    <View style={styles.sessionRow}>
                      {[
                        { l: 'Distance', v: `${item.distance} km` },
                        { l: 'Duration', v: `${item.duration} min` },
                        { l: 'Pace',     v: `${item.pace} min/km` },
                      ].map(s => (
                        <View key={s.l} style={styles.sessionStat}>
                          <Text style={styles.sessionStatLabel}>{s.l}</Text>
                          <Text style={styles.sessionStatValue}>{s.v}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
            </>
          )}

          {selectedExercise && !isCardio && (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={36} color={Colors.gray} />
              <Text style={styles.emptyStateTitle}>Strength Tracking</Text>
              <Text style={styles.emptyStateText}>Coming soon — weight progression charts for {selectedExercise}.</Text>
            </View>
          )}

          {!selectedExercise && (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={36} color={Colors.gray} />
              <Text style={styles.emptyStateTitle}>Pick an exercise</Text>
              <Text style={styles.emptyStateText}>Select an exercise above to view your progress over time.</Text>
            </View>
          )}
        </>
      )}

      {/* ── EXERCISE PICKER MODAL ────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={exerciseModalVisible} onRequestClose={() => setExerciseModalVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setExerciseModalVisible(false)} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Exercise</Text>
          <FlatList
            data={availableExercises}
            keyExtractor={item => item}
            renderItem={({ item }) => {
              const meta = EXERCISE_ICONS[item] || { icon: 'barbell-outline', color: Colors.text };
              return (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => { setSelectedExercise(item); setExerciseModalVisible(false); }}
                >
                  <View style={[styles.sheetItemIcon, { backgroundColor: `${meta.color}20` }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <Text style={styles.sheetItemText}>{item}</Text>
                  {selectedExercise === item && <Ionicons name="checkmark" size={18} color={Colors.text} />}
                </TouchableOpacity>
              );
            }}
          />
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

  // Header
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

  // Metric pills
  pillScroll: { marginBottom: 12 },
  pillScrollContent: { paddingHorizontal: 18, gap: 8 },
  metricPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  metricPillText: { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  metricPillTextActive: { color: '#FFFFFF' },

  // Period tabs
  periodSelector: {
    flexDirection: 'row', marginHorizontal: 18, marginBottom: 14,
    backgroundColor: Colors.cardBackground, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  periodBtnActive: { backgroundColor: Colors.background },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  periodBtnTextActive: { color: '#FFFFFF' },

  // Chart card
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

  // Period nav
  periodNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 4 },
  periodNavLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // Chart labels
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  chartLabel: { fontSize: 11, color: Colors.gray, fontWeight: '500' },

  // Empty chart
  emptyChart: { height: 110, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText: { fontSize: 13, color: Colors.gray },

  // Stats + Goals cards
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

  // Exercise picker
  exercisePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 18, marginBottom: 14, padding: 14,
    backgroundColor: Colors.cardBackground, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderColor,
  },
  exercisePickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exercisePickerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exercisePickerText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // Session cards
  sessionsTitle: {
    fontSize: 11, color: Colors.gray, fontWeight: '600', letterSpacing: 0.6,
    marginHorizontal: 18, marginBottom: 10,
  },
  sessionCard: {
    marginHorizontal: 18, marginBottom: 10, padding: 14,
    backgroundColor: Colors.cardBackground, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderColor,
    borderLeftWidth: 3,
  },
  sessionDate: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sessionStat: { alignItems: 'center' },
  sessionStatLabel: { fontSize: 10, color: Colors.gray, fontWeight: '500', letterSpacing: 0.4, marginBottom: 3 },
  sessionStatValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Empty state
  emptyState: {
    marginHorizontal: 18, marginTop: 16, padding: 36,
    backgroundColor: Colors.cardBackground, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.borderColor,
    alignItems: 'center', gap: 10,
  },
  emptyStateTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  emptyStateText: { fontSize: 13, color: Colors.gray, textAlign: 'center', lineHeight: 20 },

  // Modals
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
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderColor,
  },
  sheetItemIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetItemText: { flex: 1, fontSize: 15, color: '#FFFFFF', fontWeight: '500' },

  // Log modal
  input: {
    borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 16,
    color: '#FFFFFF', backgroundColor: Colors.background,
  },
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

export default ProgressScreen;
