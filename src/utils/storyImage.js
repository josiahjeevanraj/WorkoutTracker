// Renders a 1080×1920 (Instagram Story) summary of a workout session on an
// HTML canvas. Web only — native sharing is a phase 2 item.
import { Colors } from '../constants/colors';
import { isCardio, cardioTotals, formatPace, distanceUnitFor } from './cardio';

const W = 1080;
const H = 1920;
const PAD = 96;
const FONT = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
const KG_PER_LB = 0.453592;

const fmt = v => (Math.round(v * 10) / 10).toLocaleString('en-US');

// Wraps text to maxWidth; returns the lines (at most maxLines, last one ellipsised)
function wrap(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Session -> { cardio, stats: [{label, value}], rows: [{name, detail}] }
function summarise(session, weightUnit) {
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

  // Volume in the user's unit, converting sets logged in the other unit
  let setCount = 0, volume = 0;
  exercises.filter(ex => !isCardio(ex)).forEach(ex => (ex.sets || []).forEach(s => {
    if (s.warmup) return;
    setCount += 1;
    let w = parseFloat(s.weight) || 0;
    const from = s.unit || 'kg';
    if (from !== weightUnit) w = weightUnit === 'lbs' ? w / KG_PER_LB : w * KG_PER_LB;
    volume += w * (parseInt(s.reps, 10) || 0);
  }));
  return {
    cardio,
    rows,
    stats: [
      { label: 'EXERCISES', value: String(exercises.length) },
      { label: 'SETS', value: String(setCount) },
      { label: 'VOLUME', value: volume ? `${Math.round(volume).toLocaleString('en-US')} ${weightUnit}` : '—' },
    ],
  };
}

// Returns a PNG Blob of the story image
export async function renderSessionStory(session, { weightUnit = 'kg' } = {}) {
  const { cardio, stats, rows } = summarise(session, weightUnit);
  const accent = cardio ? Colors.cardio : Colors.primary;
  const accentRgb = cardio ? '34,211,238' : '255,230,0';

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background with an accent glow in the top-right corner
  ctx.fillStyle = Colors.background;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.9, H * 0.08, 0, W * 0.9, H * 0.08, W * 0.9);
  glow.addColorStop(0, `rgba(${accentRgb},0.28)`);
  glow.addColorStop(1, `rgba(${accentRgb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Instagram overlays its profile bar (top) and reply bar (bottom) on ~250px each
  ctx.textBaseline = 'top';
  let y = 260;

  // Kicker
  ctx.fillStyle = accent;
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText(cardio ? 'CARDIO SESSION' : 'LIFTING SESSION', PAD, y);
  y += 64;

  // Date
  const date = new Date(session.completedAt);
  ctx.fillStyle = Colors.gray;
  ctx.font = `500 40px ${FONT}`;
  ctx.fillText(date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), PAD, y);
  y += 72;

  // Session name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 112px ${FONT}`;
  wrap(ctx, session.name || 'Workout', W - PAD * 2, 2).forEach(line => {
    ctx.fillText(line, PAD, y);
    y += 128;
  });
  y += 48;

  // Stat tiles
  const gap = 28;
  const tileW = (W - PAD * 2 - gap * 2) / 3;
  const tileH = 210;
  stats.forEach((stat, i) => {
    const x = PAD + i * (tileW + gap);
    roundRect(ctx, x, y, tileW, tileH, 36);
    ctx.fillStyle = Colors.cardBackground;
    ctx.fill();
    ctx.strokeStyle = `rgba(${accentRgb},0.35)`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = Colors.gray;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(stat.label, x + 32, y + 40);
    ctx.fillStyle = accent;
    let size = 64;
    ctx.font = `800 ${size}px ${FONT}`;
    while (ctx.measureText(stat.value).width > tileW - 64 && size > 36) {
      size -= 4;
      ctx.font = `800 ${size}px ${FONT}`;
    }
    ctx.fillText(stat.value, x + 32, y + 100);
  });
  y += tileH + 72;

  // Exercises
  ctx.fillStyle = Colors.gray;
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText('EXERCISES', PAD, y);
  y += 64;
  // Fit as many rows as the space above the footer allows (keeping room for "+N more")
  const ROW_H = 116;
  const footerTop = H - 310;
  const room = footerTop - 40 - y;
  let maxRows = Math.max(1, Math.floor(room / ROW_H));
  if (rows.length > maxRows) maxRows = Math.max(1, Math.floor((room - 50) / ROW_H));
  rows.slice(0, maxRows).forEach(row => {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(PAD + 10, y + 24, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText(wrap(ctx, row.name, W - PAD * 2 - 50, 1)[0], PAD + 50, y);
    ctx.fillStyle = Colors.textSecondary;
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(wrap(ctx, row.detail, W - PAD * 2 - 50, 1)[0] || '', PAD + 50, y + 58);
    y += ROW_H;
  });
  if (rows.length > maxRows) {
    ctx.fillStyle = Colors.gray;
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText(`+${rows.length - maxRows} more`, PAD + 50, y);
  }

  // Footer
  ctx.fillStyle = accent;
  roundRect(ctx, PAD, footerTop, 120, 12, 6);
  ctx.fill();
  ctx.fillStyle = Colors.textSecondary;
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText('Logged with Workout Tracker', PAD, footerTop + 36);

  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png'));
}
