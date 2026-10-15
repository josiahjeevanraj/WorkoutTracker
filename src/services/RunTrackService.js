import { supabase } from './supabaseClient';
import StorageService from './StorageService';
import { downsample, trackDistance } from '../utils/geo';

// GPS tracks for outdoor runs (table run_tracks, migration 0004), stored apart
// from the workout history blob because they're large.
const round = v => (v == null ? null : Math.round(v * 1e6) / 1e6);

export async function saveRunTrack(sessionId, points, profile) {
  const compact = points.map(([lat, lng, t, alt, seg]) => [round(lat), round(lng), Math.round(t), alt == null ? null : Math.round(alt * 10) / 10, seg]);
  const { error } = await supabase
    .from('run_tracks')
    .upsert({ session_id: String(sessionId), points: compact, profile }, { onConflict: 'user_id,session_id' });
  if (error) { console.error('Error saving run track:', error); return false; }
  return true;
}

// Returns { points, profile } or null if the session has no track
export async function getRunTrack(sessionId) {
  const { data, error } = await supabase
    .from('run_tracks')
    .select('points, profile')
    .eq('session_id', String(sessionId))
    .maybeSingle();
  if (error) { console.error('Error loading run track:', error); return null; }
  return data;
}

export async function deleteRunTrack(sessionId) {
  const { error } = await supabase.from('run_tracks').delete().eq('session_id', String(sessionId));
  if (error) console.error('Error deleting run track:', error);
}

// ── Saved routes ─────────────────────────────────────────────────────────────
// Kept in app_data (@saved_routes) as a simplified line (≤ 400 points), enough
// to show as a guide when running the route again.

const ROUTE_POINTS = 400;

export const getSavedRoutes = async () => (await StorageService.getSavedRoutes()) || [];

export async function saveRoute(name, sessionId, trackPoints) {
  const points = downsample(trackPoints, ROUTE_POINTS).map(p => [round(p[0]), round(p[1]), 0, null, p[4] ?? 0]);
  const route = {
    id: `${Date.now()}`,
    name: name.trim() || 'My route',
    sessionId: String(sessionId),
    metres: Math.round(trackDistance(trackPoints)),
    createdAt: new Date().toISOString(),
    points,
  };
  const latest = await getSavedRoutes();
  const ok = await StorageService.saveSavedRoutes([...latest, route]);
  return ok ? route : null;
}

export async function deleteRoute(id) {
  const latest = await getSavedRoutes();
  return StorageService.saveSavedRoutes(latest.filter(r => r.id !== id));
}
