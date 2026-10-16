// GPS helpers for outdoor runs.
// A track point is [lat, lng, msSinceStart, gpsAltitude|null, segment]; a new
// segment starts after each pause so paused gaps aren't counted as distance.

const R = 6371000; // Earth radius, metres
const toRad = d => (d * Math.PI) / 180;

export const haversine = (a, b) => {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Readings worse than this (metres) are dropped
export const MAX_ACCURACY_M = 30;
// Faster than this between readings is treated as a GPS jump (≈ 29 km/h, above sprinting)
const MAX_SPEED_MS = 8;
const MIN_MOVE_M = 3;

// Whether a new fix should be added after `last` (same segment). A point must be
// further from the last kept point than the reading's accuracy, so GPS wobble while
// standing still (or indoors) isn't counted as distance; slow movement still adds up.
export const acceptPoint = (last, next, accuracy) => {
  if (accuracy != null && accuracy > MAX_ACCURACY_M) return false;
  if (!last || last[4] !== next[4]) return true;
  const d = haversine(last, next);
  if (d < Math.max(MIN_MOVE_M, accuracy ?? 0)) return false;
  const dt = (next[2] - last[2]) / 1000;
  return dt <= 0 ? false : d / dt <= MAX_SPEED_MS;
};

// Total distance in metres, not counting jumps between segments
export const trackDistance = points => {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][4] === points[i - 1][4]) d += haversine(points[i - 1], points[i]);
  }
  return d;
};

// Cumulative distance (m) at each point
export const cumulativeDistances = points => {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    const step = points[i][4] === points[i - 1][4] ? haversine(points[i - 1], points[i]) : 0;
    out.push(out[i - 1] + step);
  }
  return out;
};

// Seconds per split (default 1 km) using point timestamps; the last split may be partial
export const splits = (points, splitMetres = 1000) => {
  if (points.length < 2) return [];
  const cum = cumulativeDistances(points);
  const result = [];
  let splitStartTime = points[0][2];
  let next = splitMetres;
  for (let i = 1; i < points.length; i++) {
    while (cum[i] >= next) {
      // interpolate the time the split distance was crossed
      const prev = cum[i - 1];
      const frac = cum[i] === prev ? 0 : (next - prev) / (cum[i] - prev);
      const t = points[i - 1][2] + frac * (points[i][2] - points[i - 1][2]);
      result.push({ metres: splitMetres, seconds: (t - splitStartTime) / 1000 });
      splitStartTime = t;
      next += splitMetres;
    }
  }
  const remaining = cum[cum.length - 1] - (next - splitMetres);
  if (remaining > splitMetres * 0.1) {
    result.push({ metres: remaining, seconds: (points[points.length - 1][2] - splitStartTime) / 1000 });
  }
  return result;
};

// Evenly pick at most `max` points (always keeping the last)
export const downsample = (points, max) => {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
};

// Elevation (m) for each point from the Open-Meteo DEM (no key; 100 per request)
export const fetchElevations = async points => {
  const out = [];
  for (let i = 0; i < points.length; i += 100) {
    const chunk = points.slice(i, i + 100);
    const lat = chunk.map(p => p[0].toFixed(5)).join(',');
    const lng = chunk.map(p => p[1].toFixed(5)).join(',');
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
    if (!res.ok) throw new Error(`Elevation lookup failed (${res.status})`);
    const json = await res.json();
    out.push(...(json.elevation || []));
  }
  return out;
};

// Total climb in metres, ignoring wobbles smaller than `threshold`
export const elevationGain = (elevations, threshold = 2) => {
  let gain = 0;
  let base = elevations.find(e => e != null);
  elevations.forEach(e => {
    if (e == null || base == null) return;
    if (e - base >= threshold) { gain += e - base; base = e; }
    else if (base - e >= threshold) base = e;
  });
  return Math.round(gain);
};

// Builds the stored elevation profile [[km, metres], ...] from up to `max` points
export const buildElevationProfile = async (points, max = 200) => {
  const sample = downsample(points, max);
  const cumAll = cumulativeDistances(points);
  const index = new Map(points.map((p, i) => [p, i]));
  const elevations = await fetchElevations(sample);
  return sample.map((p, i) => [Math.round(cumAll[index.get(p)]) / 1000, elevations[i] ?? null]);
};

// "5:46" for seconds-per-km style values
export const formatDuration = totalSeconds => {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

// Average of the recent raw fixes (same segment): smooths GPS wobble so standing
// still doesn't drift, while real movement still comes through (lags ~2 s)
export const SMOOTH_WINDOW = 5;
export const smoothFix = buffer => {
  const n = buffer.length;
  const lat = buffer.reduce((s, p) => s + p[0], 0) / n;
  const lng = buffer.reduce((s, p) => s + p[1], 0) / n;
  const last = buffer[n - 1];
  return [lat, lng, last[2], last[3], last[4]];
};
