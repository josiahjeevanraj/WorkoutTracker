import { supabase } from './supabaseClient';

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
