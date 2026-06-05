import StorageService from '../services/StorageService';

// Generates a date offset by `daysAgo` from today, at a random hour
const daysBack = (daysAgo, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
};

const sets = (count, weight, reps) =>
  Array.from({ length: count }, () => ({ weight: String(weight), reps: String(reps) }));

// Simulates progressive overload: adds `increment` kg every `period` sessions
const prog = (base, session, increment = 2.5, period = 2) =>
  base + Math.floor(session / period) * increment;

const SESSIONS = [
  // Week 1 (6 weeks ago)
  {
    daysAgo: 42, name: 'Push Day', duration: 55, caloriesBurned: 320,
    exercises: [
      { name: 'Barbell Bench Press', sets: sets(4, 60, 8) },
      { name: 'Barbell Overhead Press', sets: sets(3, 40, 8) },
      { name: 'Dumbbell Incline Bench Press', sets: sets(3, 24, 10) },
      { name: 'Cable Tricep Pushdown', sets: sets(3, 25, 12) },
    ],
  },
  {
    daysAgo: 40, name: 'Pull Day', duration: 60, caloriesBurned: 340,
    exercises: [
      { name: 'Barbell Deadlift', sets: sets(4, 100, 5) },
      { name: 'Barbell Row', sets: sets(4, 60, 8) },
      { name: 'Pull-Up', sets: sets(3, 0, 8) },
      { name: 'Dumbbell Curl', sets: sets(3, 14, 12) },
    ],
  },
  {
    daysAgo: 38, name: 'Leg Day', duration: 65, caloriesBurned: 400,
    exercises: [
      { name: 'Barbell Back Squat', sets: sets(4, 80, 6) },
      { name: 'Barbell Romanian Deadlift', sets: sets(3, 70, 8) },
      { name: 'Leg Press', sets: sets(3, 120, 10) },
      { name: 'Dumbbell Lunge', sets: sets(3, 20, 12) },
    ],
  },

  // Week 2
  {
    daysAgo: 35, name: 'Push Day', duration: 55, caloriesBurned: 325,
    exercises: [
      { name: 'Barbell Bench Press', sets: sets(4, 62.5, 8) },
      { name: 'Barbell Overhead Press', sets: sets(3, 40, 9) },
      { name: 'Dumbbell Incline Bench Press', sets: sets(3, 26, 10) },
      { name: 'Cable Tricep Pushdown', sets: sets(3, 27.5, 12) },
    ],
  },
  {
    daysAgo: 33, name: 'Pull Day', duration: 58, caloriesBurned: 345,
    exercises: [
      { name: 'Barbell Deadlift', sets: sets(4, 102.5, 5) },
      { name: 'Barbell Row', sets: sets(4, 62.5, 8) },
      { name: 'Pull-Up', sets: sets(3, 0, 9) },
      { name: 'Dumbbell Curl', sets: sets(3, 14, 12) },
      { name: 'Cable Face Pull', sets: sets(3, 20, 15) },
    ],
  },
  {
    daysAgo: 31, name: 'Leg Day', duration: 70, caloriesBurned: 410,
    exercises: [
      { name: 'Barbell Back Squat', sets: sets(4, 82.5, 6) },
      { name: 'Barbell Romanian Deadlift', sets: sets(3, 72.5, 8) },
      { name: 'Leg Press', sets: sets(3, 130, 10) },
      { name: 'Bulgarian Split Squat', sets: sets(3, 20, 10) },
    ],
  },

  // Week 3
  {
    daysAgo: 28, name: 'Push Day', duration: 60, caloriesBurned: 330,
    exercises: [
      { name: 'Barbell Bench Press', sets: sets(4, 65, 8) },
      { name: 'Barbell Overhead Press', sets: sets(4, 42.5, 8) },
      { name: 'Dumbbell Fly', sets: sets(3, 16, 12) },
      { name: 'Cable Tricep Pushdown', sets: sets(3, 30, 12) },
      { name: 'EZ Bar Skull Crusher', sets: sets(3, 25, 10) },
    ],
  },
  {
    daysAgo: 26, name: 'Pull Day', duration: 62, caloriesBurned: 350,
    exercises: [
      { name: 'Barbell Deadlift', sets: sets(5, 105, 5) },
      { name: 'Lat Pulldown', sets: sets(4, 55, 10) },
      { name: 'Barbell Row', sets: sets(4, 65, 8) },
      { name: 'Dumbbell Curl', sets: sets(3, 16, 10) },
    ],
  },
  {
    daysAgo: 24, name: 'Leg Day', duration: 68, caloriesBurned: 420,
    exercises: [
      { name: 'Barbell Back Squat', sets: sets(4, 85, 6) },
      { name: 'Barbell Hip Thrust', sets: sets(4, 90, 10) },
      { name: 'Leg Curl (Lying)', sets: sets(3, 40, 12) },
      { name: 'Dumbbell Calf Raise', sets: sets(4, 30, 15) },
    ],
  },

  // Week 4
  {
    daysAgo: 21, name: 'Upper Body', duration: 65, caloriesBurned: 360,
    exercises: [
      { name: 'Barbell Bench Press', sets: sets(4, 67.5, 8) },
      { name: 'Barbell Row', sets: sets(4, 67.5, 8) },
      { name: 'Dumbbell Shoulder Press', sets: sets(3, 22, 10) },
      { name: 'Pull-Up', sets: sets(3, 0, 10) },
      { name: 'Dumbbell Curl', sets: sets(3, 16, 12) },
    ],
  },
  {
    daysAgo: 19, name: 'Leg Day', duration: 70, caloriesBurned: 430,
    exercises: [
      { name: 'Barbell Back Squat', sets: sets(4, 87.5, 6) },
      { name: 'Barbell Romanian Deadlift', sets: sets(4, 75, 8) },
      { name: 'Hack Squat', sets: sets(3, 60, 10) },
      { name: 'Nordic Curl', sets: sets(3, 0, 6) },
    ],
  },
  {
    daysAgo: 17, name: 'Push Day', duration: 55, caloriesBurned: 335,
    exercises: [
      { name: 'Barbell Bench Press', sets: sets(4, 70, 8) },
      { name: 'Barbell Overhead Press', sets: sets(4, 45, 8) },
      { name: 'Dumbbell Lateral Raise', sets: sets(4, 10, 15) },
      { name: 'Cable Tricep Pushdown', sets: sets(3, 32.5, 12) },
    ],
  },

  // Week 5
  {
    daysAgo: 14, name: 'Pull Day', duration: 60, caloriesBurned: 355,
    exercises: [
      { name: 'Barbell Deadlift', sets: sets(5, 110, 5) },
      { name: 'Barbell Row', sets: sets(4, 70, 8) },
      { name: 'Pull-Up', sets: sets(4, 0, 10) },
      { name: 'Preacher Curl', sets: sets(3, 30, 10) },
      { name: 'Cable Face Pull', sets: sets(3, 22.5, 15) },
    ],
  },
  {
    daysAgo: 12, name: 'Leg Day', duration: 72, caloriesBurned: 440,
    exercises: [
      { name: 'Barbell Back Squat', sets: sets(5, 90, 6) },
      { name: 'Barbell Hip Thrust', sets: sets(4, 100, 10) },
      { name: 'Leg Press', sets: sets(3, 150, 10) },
      { name: 'Leg Curl (Seated)', sets: sets(3, 45, 12) },
    ],
  },
  {
    daysAgo: 10, name: 'Push Day', duration: 58, caloriesBurned: 340,
    exercises: [
      { name: 'Barbell Bench Press', sets: sets(4, 72.5, 8) },
      { name: 'Barbell Incline Bench Press', sets: sets(3, 52.5, 8) },
      { name: 'Barbell Overhead Press', sets: sets(4, 47.5, 8) },
      { name: 'Dumbbell Lateral Raise', sets: sets(4, 12, 12) },
    ],
  },

  // Week 6 (most recent)
  {
    daysAgo: 7, name: 'Pull Day', duration: 62, caloriesBurned: 360,
    exercises: [
      { name: 'Barbell Deadlift', sets: sets(5, 112.5, 5) },
      { name: 'Lat Pulldown', sets: sets(4, 60, 10) },
      { name: 'Barbell Row', sets: sets(4, 72.5, 8) },
      { name: 'Dumbbell Hammer Curl', sets: sets(3, 18, 12) },
    ],
  },
  {
    daysAgo: 5, name: 'Leg Day', duration: 75, caloriesBurned: 450,
    exercises: [
      { name: 'Barbell Back Squat', sets: sets(5, 92.5, 6) },
      { name: 'Barbell Romanian Deadlift', sets: sets(4, 77.5, 8) },
      { name: 'Bulgarian Split Squat', sets: sets(3, 24, 10) },
      { name: 'Dumbbell Calf Raise', sets: sets(4, 34, 15) },
    ],
  },
  {
    daysAgo: 3, name: 'Push Day', duration: 60, caloriesBurned: 345,
    exercises: [
      { name: 'Barbell Bench Press', sets: sets(4, 75, 8) },
      { name: 'Barbell Overhead Press', sets: sets(4, 50, 8) },
      { name: 'Dumbbell Incline Bench Press', sets: sets(3, 30, 10) },
      { name: 'Cable Fly', sets: sets(3, 15, 15) },
      { name: 'EZ Bar Skull Crusher', sets: sets(3, 30, 10) },
    ],
  },
  {
    daysAgo: 1, name: 'Pull Day', duration: 65, caloriesBurned: 370,
    exercises: [
      { name: 'Barbell Deadlift', sets: sets(5, 115, 5) },
      { name: 'Barbell Row', sets: sets(4, 75, 8) },
      { name: 'Pull-Up', sets: [{ weight: '0', reps: '12' }, { weight: '0', reps: '11' }, { weight: '0', reps: '10' }, { weight: '0', reps: '9' }] },
      { name: 'Dumbbell Curl', sets: sets(3, 18, 12) },
      { name: 'Cable Face Pull', sets: sets(3, 25, 15) },
    ],
  },
];

export async function seedTestData() {
  const sessions = SESSIONS.map((s, i) => ({
    id: `seed_${i}_${Date.now()}`,
    name: s.name,
    completedAt: daysBack(s.daysAgo),
    duration: s.duration,
    caloriesBurned: s.caloriesBurned,
    exercises: s.exercises,
    notes: '',
  }));

  // Seed body metrics (fitness data) — 6 weeks of daily weight/calorie data
  const fitnessData = {};
  for (let i = 42; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fitnessData[key] = {
      weight: parseFloat((82 - (42 - i) * 0.05 + (Math.random() - 0.5) * 0.4).toFixed(1)),
      caloriesBurned: Math.round(300 + Math.random() * 200),
      caloriesConsumed: Math.round(2200 + (Math.random() - 0.5) * 400),
      workouts: [],
    };
  }

  await Promise.all([
    StorageService.saveWorkoutHistory(sessions),
    StorageService.saveFitnessData(fitnessData),
  ]);
}

export async function clearTestData() {
  await Promise.all([
    StorageService.saveWorkoutHistory([]),
    StorageService.saveFitnessData({}),
  ]);
}
