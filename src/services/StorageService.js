import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  WORKOUTS: '@workouts',
  USER_PROFILE: '@user_profile',
  WORKOUT_HISTORY: '@workout_history',
  PROGRESS_DATA: '@progress_data',
  FITNESS_DATA: '@fitness_data',
  CUSTOM_EXERCISES: '@custom_exercises',
  SAVED_ROUTES: '@saved_routes',
};

let currentUserId = null;

export function setCurrentUserId(id) {
  currentUserId = id;
}

export function getCurrentUserId() {
  return currentUserId;
}

class StorageService {
  async _get(key, fallback) {
    if (!currentUserId) return fallback;
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('user_id', currentUserId)
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data ? data.data : fallback;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return fallback;
    }
  }

  async _set(key, value) {
    if (!currentUserId) return false;
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert(
          { user_id: currentUserId, key, data: value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        );
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  }

  async saveWorkouts(workouts) {
    return this._set(STORAGE_KEYS.WORKOUTS, workouts);
  }

  async getWorkouts() {
    return this._get(STORAGE_KEYS.WORKOUTS, []);
  }

  async addWorkout(workout) {
    try {
      const workouts = await this.getWorkouts();
      const newWorkout = {
        ...workout,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      workouts.push(newWorkout);
      if (!(await this.saveWorkouts(workouts))) return null;
      return newWorkout;
    } catch (error) {
      console.error('Error adding workout:', error);
      return null;
    }
  }

  async updateWorkout(id, updates) {
    try {
      const workouts = await this.getWorkouts();
      const index = workouts.findIndex(w => w.id === id);
      if (index !== -1) {
        workouts[index] = { ...workouts[index], ...updates };
        if (!(await this.saveWorkouts(workouts))) return null;
        return workouts[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating workout:', error);
      return null;
    }
  }

  async deleteWorkout(id) {
    try {
      const workouts = await this.getWorkouts();
      const filtered = workouts.filter(w => w.id !== id);
      return await this.saveWorkouts(filtered);
    } catch (error) {
      console.error('Error deleting workout:', error);
      return false;
    }
  }

  async saveUserProfile(profile) {
    return this._set(STORAGE_KEYS.USER_PROFILE, profile);
  }

  async getUserProfile() {
    return this._get(STORAGE_KEYS.USER_PROFILE, null);
  }

  async addWorkoutSession(session) {
    try {
      const history = await this.getWorkoutHistory();
      const newSession = {
        ...session,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        completedAt: session.completedAt ?? new Date().toISOString(),
      };
      history.push(newSession);
      if (!(await this.saveWorkoutHistory(history))) return null;
      return newSession;
    } catch (error) {
      console.error('Error adding workout session:', error);
      return null;
    }
  }

  async getWorkoutHistory() {
    return this._get(STORAGE_KEYS.WORKOUT_HISTORY, []);
  }

  async saveWorkoutHistory(history) {
    return this._set(STORAGE_KEYS.WORKOUT_HISTORY, history);
  }

  async isWorkoutHistoryUnset() {
    if (!currentUserId) return false;
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('key')
        .eq('user_id', currentUserId)
        .eq('key', STORAGE_KEYS.WORKOUT_HISTORY)
        .maybeSingle();
      if (error) throw error;
      return data === null;
    } catch {
      return false;
    }
  }

  async updateWorkoutSession(id, updates) {
    try {
      const history = await this.getWorkoutHistory();
      const index = history.findIndex(s => s.id === id);
      if (index !== -1) {
        history[index] = { ...history[index], ...updates };
        await this.saveWorkoutHistory(history);
        return history[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating workout session:', error);
      return null;
    }
  }

  async deleteWorkoutSession(id) {
    try {
      const history = await this.getWorkoutHistory();
      const session = history.find(s => s.id === id);
      const filtered = history.filter(s => s.id !== id);
      await this.saveWorkoutHistory(filtered);
      // Outdoor runs keep their GPS track in a separate table
      if (session?.hasTrack) {
        supabase.from('run_tracks').delete().eq('session_id', String(id))
          .then(({ error }) => error && console.error('Error deleting run track:', error));
      }
      return true;
    } catch (error) {
      console.error('Error deleting workout session:', error);
      return false;
    }
  }

  async saveProgressData(progressData) {
    return this._set(STORAGE_KEYS.PROGRESS_DATA, progressData);
  }

  async getProgressData() {
    return this._get(STORAGE_KEYS.PROGRESS_DATA, {});
  }

  async getFitnessData() {
    return this._get(STORAGE_KEYS.FITNESS_DATA, {});
  }

  async saveFitnessData(fitnessData) {
    return this._set(STORAGE_KEYS.FITNESS_DATA, fitnessData);
  }

  // Exercise names the user added that aren't in EXERCISE_LIST
  async getCustomExercises() {
    return this._get(STORAGE_KEYS.CUSTOM_EXERCISES, []);
  }

  async saveCustomExercises(names) {
    return this._set(STORAGE_KEYS.CUSTOM_EXERCISES, names);
  }

  // Saved outdoor-run routes: [{ id, name, sessionId, metres, createdAt, points }]
  async getSavedRoutes() {
    return this._get(STORAGE_KEYS.SAVED_ROUTES, []);
  }

  async saveSavedRoutes(routes) {
    return this._set(STORAGE_KEYS.SAVED_ROUTES, routes);
  }

  async clearAllData() {
    if (!currentUserId) return false;
    try {
      const { error } = await supabase
        .from('app_data')
        .delete()
        .eq('user_id', currentUserId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
}

export default new StorageService();
