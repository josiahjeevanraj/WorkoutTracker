import { CARDIO_EXERCISES } from '../constants/exercises';

// Cardio sets: { duration: minutes, distance, unit: 'km' | 'mi', incline: percent }
// Most cardio exercises are a single entry (one set); interval exercises keep multiple rows.
const CARDIO_NAMES = new Set(CARDIO_EXERCISES.map(n => n.toLowerCase()));

export const isCardioName = name => CARDIO_NAMES.has((name || '').toLowerCase());

export const isCardio = ex => ex?.type === 'cardio' || isCardioName(ex?.name);

const INTERVAL_NAMES = new Set(['treadmill sprint intervals']);
export const isIntervalCardio = ex => INTERVAL_NAMES.has((ex?.name || '').toLowerCase());

// Only treadmill exercises take an incline
export const isTreadmill = ex => /treadmill/i.test(ex?.name || '');

// Distance unit that matches the user's weight unit preference
export const distanceUnitFor = weightUnit => (weightUnit === 'lbs' ? 'mi' : 'km');

export const newCardioSet = unit => ({ duration: '', distance: '', unit, incline: '' });

const KM_PER_MI = 1.609344;

export const convertDistance = (value, from, to) => {
  if (from === to) return value;
  return to === 'mi' ? value / KM_PER_MI : value * KM_PER_MI;
};

// Minutes per distance unit -> "m:ss"
export const formatPace = minutesPerUnit => {
  const m = Math.floor(minutesPerUnit);
  const s = Math.round((minutesPerUnit - m) * 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
};

const fmtPace = (minutes, distance) => formatPace(minutes / distance);

// Totals for one exercise entry, with distance in `unit`; pace is null without distance
export const cardioTotals = (ex, unit) => {
  let distance = 0;
  let duration = 0;
  (ex.sets || []).forEach(set => {
    distance += convertDistance(parseFloat(set.distance) || 0, set.unit || 'km', unit);
    duration += parseFloat(set.duration) || 0;
  });
  return { distance, duration, pace: distance > 0 && duration > 0 ? duration / distance : null };
};

// e.g. "30 min · 5.2 km · 5:46 /km · 6% incline" (incline only when above 0)
export const formatCardioSet = set => {
  const minutes = parseFloat(set.duration) || 0;
  const distance = parseFloat(set.distance) || 0;
  const unit = set.unit || 'km';
  const parts = [];
  if (minutes) parts.push(`${minutes} min`);
  if (distance) parts.push(`${distance} ${unit}`);
  if (minutes && distance) parts.push(`${fmtPace(minutes, distance)} /${unit}`);
  const incline = parseFloat(set.incline) || 0;
  if (incline > 0) parts.push(`${incline}% incline`);
  const climb = parseFloat(set.elevationGain) || 0;
  if (climb > 0) parts.push(`↑${Math.round(climb)} m`);
  return parts.join(' · ') || '—';
};
