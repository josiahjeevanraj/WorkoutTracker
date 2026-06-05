import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { WatchBridge } = NativeModules;

function getZone(bpm, maxHR = 190) {
  const pct = bpm / maxHR;
  if (pct < 0.60) return { zone: 1, label: 'Recovery',   color: '#60A5FA' };
  if (pct < 0.70) return { zone: 2, label: 'Aerobic',    color: '#34D399' };
  if (pct < 0.80) return { zone: 3, label: 'Tempo',      color: '#FBBF24' };
  if (pct < 0.90) return { zone: 4, label: 'Threshold',  color: '#F97316' };
  return           { zone: 5, label: 'Max Effort',        color: '#EF4444' };
}

export function subscribeToHeartRate(callback) {
  if (Platform.OS !== 'ios' || !WatchBridge) {
    return () => {};
  }
  const emitter = new NativeEventEmitter(WatchBridge);
  const sub = emitter.addListener('onHeartRateUpdate', ({ bpm, timestamp }) => {
    callback(bpm, getZone(bpm), timestamp);
  });
  return () => sub.remove();
}

export { getZone };
