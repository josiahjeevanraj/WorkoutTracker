import { useState, useEffect } from 'react';
import StorageService, { getCurrentUserId } from '../services/StorageService';

// Shared cache so every open exercise picker sees additions immediately.
// Keyed by user so a different sign-in doesn't see the previous user's list.
let cache = null;
let cacheUser = null;
let loading = null;
const listeners = new Set();

const notify = () => listeners.forEach(fn => fn(cache));

const load = () => {
  const user = getCurrentUserId();
  if (!loading || cacheUser !== user) {
    cacheUser = user;
    loading = StorageService.getCustomExercises()
      .then(names => { if (cacheUser === user) { cache = names || []; notify(); } })
      .catch(err => { console.error(err); cache = []; notify(); });
  }
  return loading;
};

// Adds a name (ignoring case-insensitive duplicates); returns false if the save failed
export const addCustomExercise = async name => {
  await load();
  if (cache.some(n => n.toLowerCase() === name.toLowerCase())) return true;
  const latest = (await StorageService.getCustomExercises()) || [];
  const next = latest.some(n => n.toLowerCase() === name.toLowerCase()) ? latest : [...latest, name];
  const ok = await StorageService.saveCustomExercises(next);
  if (ok) { cache = next; notify(); }
  return ok;
};

export default function useCustomExercises() {
  const [names, setNames] = useState(cacheUser === getCurrentUserId() && cache ? cache : []);
  useEffect(() => {
    listeners.add(setNames);
    if (cache && cacheUser === getCurrentUserId()) setNames(cache); else load();
    return () => listeners.delete(setNames);
  }, []);
  return names;
}
