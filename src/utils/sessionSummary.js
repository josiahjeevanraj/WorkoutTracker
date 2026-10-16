// Content for shareable session images, shared by the web canvas renderer
// (storyImage.js) and the native share views (components/share).
import { isCardio, cardioTotals, formatPace, distanceUnitFor } from './cardio';

const fmt = v => (Math.round(v * 10) / 10).toLocaleString('en-US');

// Session -> { cardio, stats: [{label, value}], rows: [{name, detail}] }
export function summariseSession(session, weightUnit) {
  const exercises = session.exercises || [];
  const distUnit = distanceUnitFor(weightUnit);
  const cardio = exercises.length > 0 && exercises.every(isCardio);

  const rows = exercises.map(ex => {
    if (isCardio(ex)) {
      const t = cardioTotals(ex, distUnit);
      const parts = [];
      if (t.duration) parts.push(`${fmt(t.duration)} min`);
      if (t.distance) parts.push(`${fmt(t.distance)} ${distUnit}`);
      if (t.pace) parts.push(`${formatPace(t.pace)} /${distUnit}`);
      return { name: ex.name, detail: parts.join(' · ') };
    }
    const sets = (ex.sets || []).filter(s => !s.warmup);
    const top = sets.reduce((best, s) => {
      const w = parseFloat(s.weight) || 0;
      return !best || w > (parseFloat(best.weight) || 0) ? s : best;
    }, null);
    const topW = parseFloat(top?.weight) || 0;
    const detail = `${sets.length} set${sets.length !== 1 ? 's' : ''}`
      + (top ? ` · best ${topW ? `${top.weight}${top.unit || 'kg'}` : 'BW'}${top.reps ? ` × ${top.reps}` : ''}` : '');
    return { name: ex.name, detail };
  });

  if (cardio) {
    let distance = 0, duration = 0;
    exercises.forEach(ex => { const t = cardioTotals(ex, distUnit); distance += t.distance; duration += t.duration; });
    return {
      cardio,
      rows,
      stats: [
        { label: 'DISTANCE', value: distance ? `${fmt(distance)} ${distUnit}` : '—' },
        { label: 'TIME', value: duration ? `${fmt(duration)} min` : '—' },
        { label: 'PACE', value: distance && duration ? `${formatPace(duration / distance)} /${distUnit}` : '—' },
      ],
    };
  }

  // Lifting sessions show the exercise list only (no stat tiles)
  return { cardio, rows, stats: [] };
}
