import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// Native GPS for outdoor runs. Uses a background location task so tracking
// continues while the phone is locked (needs "Always" permission; with only
// "While Using" it falls back to foreground updates). Same interface as
// runLocation.web.js: startRunLocation(onFix, onError) -> stop().
// onFix({ latitude, longitude, accuracy, altitude }, timestampMs)

const TASK = 'motion-run-location';
const listeners = new Set();

// Must be defined at startup (index.js imports this module) so iOS can deliver
// locations to it when the app is in the background
TaskManager.defineTask(TASK, ({ data, error }) => {
  if (error) { console.error('Run location task error:', error); return; }
  (data?.locations || []).forEach(loc => listeners.forEach(fn => fn(loc.coords, loc.timestamp)));
});

export const isBackgroundCapable = true;

export async function startRunLocation(onFix, onError) {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    onError?.({ code: 1, message: 'Location permission was denied. Allow it in Settings → Motion → Location.' });
    return () => {};
  }

  let background = false;
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    background = bg.status === 'granted';
  } catch { /* not available */ }

  if (background) {
    listeners.add(onFix);
    if (!(await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false))) {
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        activityType: Location.ActivityType.Fitness,
        timeInterval: 1000,
        distanceInterval: 0,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        deferredUpdatesInterval: 0,
      });
    }
    return () => {
      listeners.delete(onFix);
      if (!listeners.size) Location.stopLocationUpdatesAsync(TASK).catch(() => {});
    };
  }

  // Foreground only: tracking pauses if the phone locks
  onError?.({ code: 2, message: 'Location is "While Using" only — tracking stops if the phone locks. Allow "Always" in Settings → Motion → Location for pocket tracking.', soft: true });
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    loc => onFix(loc.coords, loc.timestamp),
  );
  return () => sub.remove();
}
