// Re-exported for existing imports
export { projectRoute, runStats } from './routeGeometry';

// Share formats for outdoor runs (web only): the route outline as a transparent
// PNG, the route on a story image, and a Strava-style animated video.
import { Colors } from '../constants/colors';
import { cumulativeDistances, formatDuration } from './geo';
import { formatPace } from './cardio';
import { projectRoute, runStats, ANIMATION, easeInOut } from './routeGeometry';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import loadMapLibre from './loadMapLibre';

const FONT = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
const ACCENT = Colors.cardio;

// ── Geometry ────────────────────────────────────────────────────────────────

// Draws the route up to `upto` (fractional index) with a soft glow
export function drawRoute(ctx, proj, upto = proj.length - 1, { color = ACCENT, width = 10 } = {}) {
  if (proj.length < 2) return null;
  const last = Math.min(upto, proj.length - 1);
  const whole = Math.floor(last);
  const frac = last - whole;
  let head = proj[0];
  const stroke = (lineWidth, style, blur) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = style;
    if (blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
    ctx.beginPath();
    proj.forEach((p, i) => {
      if (i > whole) return;
      if (i === 0 || p.seg !== proj[i - 1].seg) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      head = p;
    });
    if (frac > 0 && whole + 1 < proj.length && proj[whole + 1].seg === proj[whole].seg) {
      const a = proj[whole], b = proj[whole + 1];
      head = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
      ctx.lineTo(head.x, head.y);
    }
    ctx.stroke();
    ctx.restore();
  };
  stroke(width, color, 24);
  stroke(width * 0.45, 'rgba(255,255,255,0.85)', 0);
  return head;
}

const dot = (ctx, p, r, fill) => {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = r * 0.4;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
};

// ── Stats ───────────────────────────────────────────────────────────────────


const statTriplet = (stats, progress = 1) => [
  { label: 'DISTANCE', value: `${(stats.distance * progress).toFixed(2)} ${stats.unit}` },
  { label: 'TIME', value: formatDuration(stats.duration * 60 * progress) },
  { label: 'PACE', value: stats.pace ? `${formatPace(stats.pace)} /${stats.unit}` : '—' },
];

function drawStats(ctx, stats, x, y, w, { progress = 1, size = 64 } = {}) {
  const items = statTriplet(stats, progress);
  const colW = w / items.length;
  items.forEach((item, i) => {
    const cx = x + colW * i;
    ctx.fillStyle = Colors.textSecondary;
    ctx.font = `700 ${Math.round(size * 0.42)}px ${FONT}`;
    ctx.fillText(item.label, cx, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.fillText(item.value, cx, y + size * 0.7);
  });
}

const toBlob = canvas => new Promise((resolve, reject) =>
  canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));

// ── Route outline sticker (transparent PNG) ─────────────────────────────────

export async function renderRouteSticker(session, track, { weightUnit = 'kg' } = {}) {
  const W = 1080, H = 1300;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';

  const proj = projectRoute(track.points, { x: 60, y: 40, w: W - 120, h: 900 }, 40);
  drawRoute(ctx, proj, undefined, { width: 14 });
  dot(ctx, proj[0], 14, Colors.green);
  dot(ctx, proj[proj.length - 1], 14, ACCENT);

  // Stats with a subtle shadow so they read on any photo
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 16;
  drawStats(ctx, runStats(session, weightUnit), 90, 1010, W - 180, { size: 70 });
  ctx.fillStyle = ACCENT;
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText('Logged with Motion', 90, 1200);
  return toBlob(canvas);
}

// ── Map snapshot for backgrounds ────────────────────────────────────────────

// Renders the dark map fitted to the route off-screen and returns the image plus
// the route projected onto it. Resolves null if the map can't load in time.
export async function mapSnapshot(points, W, H, padding = { top: 420, bottom: 640, left: 120, right: 120 }) {
  try {
    const maplibregl = await loadMapLibre();
    const ratio = 2;
    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', left: '-10000px', top: '0', width: `${W / ratio}px`, height: `${H / ratio}px` });
    document.body.appendChild(container);
    const lngs = points.map(p => p[1]), lats = points.map(p => p[0]);
    const map = new maplibregl.Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/dark',
      bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      fitBoundsOptions: { padding: { top: padding.top / ratio, bottom: padding.bottom / ratio, left: padding.left / ratio, right: padding.right / ratio } },
      interactive: false,
      attributionControl: false,
      pixelRatio: ratio,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      preserveDrawingBuffer: true,
    });
    const ready = await Promise.race([
      new Promise(resolve => map.once('idle', () => resolve(true))),
      new Promise(resolve => setTimeout(() => resolve(false), 10000)),
    ]);
    if (!ready) { map.remove(); container.remove(); return null; }
    const image = document.createElement('canvas');
    image.width = W; image.height = H;
    image.getContext('2d').drawImage(map.getCanvas(), 0, 0, W, H);
    const proj = points.map(p => {
      const px = map.project([p[1], p[0]]);
      return { x: px.x * ratio, y: px.y * ratio, seg: p[4] ?? 0 };
    });
    map.remove();
    container.remove();
    return { image, proj };
  } catch (err) {
    console.error('Map snapshot failed:', err);
    return null;
  }
}

// ── Animated video (Strava-style) ───────────────────────────────────────────

const FPS = 30;
const AVC_CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.640032', 'avc1.42e028'];

// Fast path: encode frames directly with WebCodecs into an MP4 (no real-time
// recording, so it doesn't stall if the page isn't painting). Resolves null if unsupported.
async function encodeWithWebCodecs(canvas, drawFrame, totalMs) {
  if (typeof window === 'undefined' || !window.VideoEncoder || !window.VideoFrame) return null;
  const { width, height } = canvas;
  let config = null;
  for (const codec of AVC_CODECS) {
    const candidate = { codec, width, height, bitrate: 6_000_000, framerate: FPS };
    // eslint-disable-next-line no-await-in-loop
    const { supported } = await VideoEncoder.isConfigSupported(candidate).catch(() => ({ supported: false }));
    if (supported) { config = candidate; break; }
  }
  if (!config) return null;

  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width, height }, fastStart: 'in-memory' });
  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => { failure = e; },
  });
  encoder.configure(config);
  const frames = Math.ceil((totalMs / 1000) * FPS);
  for (let i = 0; i < frames && !failure; i++) {
    drawFrame((i * 1000) / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    // eslint-disable-next-line no-await-in-loop
    if (encoder.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 0));
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  muxer.finalize();
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), mimeType: 'video/mp4', ext: 'mp4' };
}

// Fallback: record the canvas in real time with MediaRecorder
const pickMimeType = () => {
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return types.find(t => window.MediaRecorder?.isTypeSupported?.(t)) || null;
};

async function recordWithMediaRecorder(canvas, drawFrame, totalMs) {
  drawFrame(0);
  const mimeType = pickMimeType();
  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(resolve => { recorder.onstop = resolve; });
  recorder.start(250);
  const start = performance.now();
  await new Promise(resolve => {
    const loop = () => {
      const elapsed = performance.now() - start;
      drawFrame(elapsed);
      if (elapsed < totalMs) requestAnimationFrame(loop); else resolve();
    };
    requestAnimationFrame(loop);
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach(t => t.stop());
  const type = mimeType.split(';')[0];
  return { blob: new Blob(chunks, { type }), mimeType: type, ext: type === 'video/mp4' ? 'mp4' : 'webm' };
}

export const canRecordVideo = () => typeof window !== 'undefined' && (
  !!window.VideoEncoder
  || (!!window.MediaRecorder && !!pickMimeType() && !!HTMLCanvasElement.prototype.captureStream)
);

// The route drawing itself over the map while stats count up (about 9s).
// Resolves { blob, mimeType, ext }. `useMap: false` skips the map background.
export async function renderRouteAnimation(session, track, { weightUnit = 'kg', onStatus, useMap = true } = {}) {
  const W = 1080, H = 1920;
  const { DRAW_MS, HOLD_MS } = ANIMATION;
  const stats = runStats(session, weightUnit);

  onStatus?.('Loading map…');
  const snap = useMap ? await mapSnapshot(track.points, W, H) : null;
  const proj = snap ? snap.proj : projectRoute(track.points, { x: 120, y: 420, w: W - 240, h: H - 1060 }, 20);
  const cum = cumulativeDistances(track.points);
  const total = cum[cum.length - 1] || 1;
  // fractional index of the point at a given share of the distance
  const indexAt = share => {
    const target = share * total;
    const i = cum.findIndex(c => c >= target);
    if (i <= 0) return Math.max(0, i);
    return i - 1 + (target - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  };

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const drawFrame = elapsed => {
    const p = Math.min(1, elapsed / DRAW_MS);
    const eased = easeInOut(p);
    ctx.textBaseline = 'top';
    if (snap) ctx.drawImage(snap.image, 0, 0);
    else { ctx.fillStyle = Colors.background; ctx.fillRect(0, 0, W, H); }
    // darken top and bottom for legible text
    const top = ctx.createLinearGradient(0, 0, 0, 520);
    top.addColorStop(0, 'rgba(14,14,14,0.95)'); top.addColorStop(1, 'rgba(14,14,14,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, 520);
    const bottom = ctx.createLinearGradient(0, H - 760, 0, H);
    bottom.addColorStop(0, 'rgba(14,14,14,0)'); bottom.addColorStop(0.35, 'rgba(14,14,14,0.92)'); bottom.addColorStop(1, 'rgba(14,14,14,1)');
    ctx.fillStyle = bottom; ctx.fillRect(0, H - 760, W, 760);

    const head = drawRoute(ctx, proj, indexAt(eased), { width: 12 });
    dot(ctx, proj[0], 12, Colors.green);
    if (head) dot(ctx, head, 16, ACCENT);

    ctx.fillStyle = ACCENT;
    ctx.font = `800 36px ${FONT}`;
    ctx.fillText('OUTDOOR RUN', 96, 260);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 84px ${FONT}`;
    ctx.fillText(session.name || 'Outdoor Run', 96, 312);
    ctx.fillStyle = Colors.textSecondary;
    ctx.font = `500 36px ${FONT}`;
    ctx.fillText(new Date(session.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), 96, 412);

    drawStats(ctx, stats, 96, H - 520, W - 192, { progress: eased, size: 72 });
    ctx.globalAlpha = Math.min(1, Math.max(0, (elapsed - DRAW_MS) / 500));
    ctx.fillStyle = ACCENT;
    ctx.fillRect(96, H - 330, 110, 10);
    ctx.fillStyle = Colors.textSecondary;
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText('Logged with Motion', 96, H - 300);
    ctx.globalAlpha = 1;
    if (snap) {
      // Map data credit (required when sharing OpenStreetMap-based imagery)
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `500 24px ${FONT}`;
      ctx.fillText('© OpenStreetMap contributors · OpenFreeMap', 96, H - 110);
    }
  };

  onStatus?.('Creating animation…');
  const fast = await encodeWithWebCodecs(canvas, drawFrame, DRAW_MS + HOLD_MS).catch(err => {
    console.error('WebCodecs encoding failed, falling back to recording:', err);
    return null;
  });
  if (fast) return fast;
  onStatus?.('Recording animation…');
  return recordWithMediaRecorder(canvas, drawFrame, DRAW_MS + HOLD_MS);
}

// Route outline drawn into a box on an existing canvas (used by the story image)
export function drawRouteInBox(ctx, points, box) {
  const proj = projectRoute(points, box, 30);
  drawRoute(ctx, proj, undefined, { width: 12 });
  dot(ctx, proj[0], 12, Colors.green);
  dot(ctx, proj[proj.length - 1], 12, ACCENT);
}
