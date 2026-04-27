import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  WORKOUTS: '@workouts',
  USER_PROFILE: '@user_profile',
  WORKOUT_HISTORY: '@workout_history',
  PROGRESS_DATA: '@progress_data',
};

class StorageService {
  async saveWorkouts(workouts) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
      return true;
    } catch (error) {
      console.error('Error saving workouts:', error);
      return false;
    }
  }

  async getWorkouts() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading workouts:', error);
      return [];
    }
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
      await this.saveWorkouts(workouts);
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
        await this.saveWorkouts(workouts);
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
      await this.saveWorkouts(filtered);
      return true;
    } catch (error) {
      console.error('Error deleting workout:', error);
      return false;
    }
  }

  async saveUserProfile(profile) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      return false;
    }
  }

  async getUserProfile() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  }

  async addWorkoutSession(session) {
    try {
      const history = await this.getWorkoutHistory();
      const newSession = {
        ...session,
        id: Date.now().toString(),
        completedAt: session.completedAt ?? new Date().toISOString(),
      };
      history.push(newSession);
      await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(history));
      return newSession;
    } catch (error) {
      console.error('Error adding workout session:', error);
      return null;
    }
  }

  async getWorkoutHistory() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading workout history:', error);
      return [];
    }
  }

  async updateWorkoutSession(id, updates) {
    try {
      const history = await this.getWorkoutHistory();
      const index = history.findIndex(s => s.id === id);
      if (index !== -1) {
        history[index] = { ...history[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(history));
        return history[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating workout session:', error);
      return null;
    }
  }

  async saveProgressData(progressData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS_DATA, JSON.stringify(progressData));
      return true;
    } catch (error) {
      console.error('Error saving progress data:', error);
      return false;
    }
  }

  async getProgressData() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_DATA);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading progress data:', error);
      return {};
    }
  }

  async clearAllData() {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
}

export default new StorageService();