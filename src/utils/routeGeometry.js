// Pure route maths for share images, used by the web canvas renderer
// (routeShare.js) and the native share views.
import { isCardio, cardioTotals, distanceUnitFor } from './cardio';

// Fit [lat, lng, ...] points into a box, keeping the shape (equirectangular)
export function projectRoute(points, box, pad = 0) {
  if (!points.length) return [];
  const midLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map(p => p[1] * kx);
  const ys = points.map(p => -p[0]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = box.w - pad * 2, h = box.h - pad * 2;
  const scale = Math.min(w / (maxX - minX || 1e-9), h / (maxY - minY || 1e-9));
  const offX = box.x + pad + (w - (maxX - minX) * scale) / 2;
  const offY = box.y + pad + (h - (maxY - minY) * scale) / 2;
  return points.map((p, i) => ({ x: offX + (xs[i] - minX) * scale, y: offY + (ys[i] - minY) * scale, seg: p[4] ?? 0 }));
}

// Path for the route up to `upto` (fractional index), split at segment breaks.
// Returns { d, head } where d is an SVG path and head the drawn end point.
export function routePath(proj, upto = proj.length - 1) {
  if (proj.length < 2) return { d: '', head: proj[0] || null };
  const last = Math.min(upto, proj.length - 1);
  const whole = Math.floor(last);
  const frac = last - whole;
  let d = '';
  let head = proj[0];
  proj.forEach((p, i) => {
    if (i > whole) return;
    d += `${i === 0 || p.seg !== proj[i - 1].seg ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)} `;
    head = p;
  });
  if (frac > 0 && whole + 1 < proj.length && proj[whole + 1].seg === proj[whole].seg) {
    const a = proj[whole], b = proj[whole + 1];
    head = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
    d += `L${head.x.toFixed(1)},${head.y.toFixed(1)}`;
  }
  return { d, head };
}

export function runStats(session, weightUnit) {
  const unit = distanceUnitFor(weightUnit);
  let distance = 0, duration = 0;
  (session.exercises || []).filter(isCardio).forEach(ex => {
    const t = cardioTotals(ex, unit);
    distance += t.distance;
    duration += t.duration;
  });
  return { unit, distance, duration, pace: distance && duration ? duration / distance : null };
}
