import { useState, useEffect } from 'react';
import StorageService, { getCurrentUserId } from '../services/StorageService';

// Shared cache so every open exercise picker sees additions immediately.
// Keyed by user so a different sign-in doesn't see the previous user's list.
// Stored entries are names (older, strength) or { name, type: 'strength' | 'cardio' };
// the hook always returns { name, type }.
let cache = null;
let cacheUser = null;
let loading = null;
const listeners = new Set();

const normalize = list => (list || []).map(e => (typeof e === 'string' ? { name: e, type: 'strength' } : e));
const notify = () => listeners.forEach(fn => fn(cache));

const load = () => {
  const user = getCurrentUserId();
  if (!loading || cacheUser !== user) {
    cacheUser = user;
    loading = StorageService.getCustomExercises()
      .then(list => { if (cacheUser === user) { cache = normalize(list); notify(); } })
      .catch(err => { console.error(err); cache = []; notify(); });
  }
  return loading;
};

const sameName = name => e => (typeof e === 'string' ? e : e.name).toLowerCase() === name.toLowerCase();

// Adds a name (ignoring case-insensitive duplicates); returns false if the save failed
export const addCustomExercise = async (name, type = 'strength') => {
  await load();
  if (cache.some(sameName(name))) return true;
  const latest = (await StorageService.getCustomExercises()) || [];
  const next = latest.some(sameName(name)) ? latest : [...latest, { name, type }];
  const ok = await StorageService.saveCustomExercises(next);
  if (ok) { cache = normalize(next); notify(); }
  return ok;
};

export default function useCustomExercises() {
  const [entries, setEntries] = useState(cacheUser === getCurrentUserId() && cache ? cache : []);
  useEffect(() => {
    listeners.add(setEntries);
    if (cache && cacheUser === getCurrentUserId()) setEntries(cache); else load();
    return () => listeners.delete(setEntries);
  }, []);
  return entries;
}
