import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Vibration } from 'react-native';
import StorageService from '../services/StorageService';
import { useAuth } from './AuthContext';

// In-app rest timer for logging in real time. Settings live on the user profile
// as `restTimer`. It only runs while the app is open; lock-screen notifications
// are planned for the native app.
export const DEFAULT_REST_SETTINGS = { enabled: false, seconds: 120, keepAwake: true };

const RestTimerContext = createContext(null);

// Short three-tone beep via Web Audio (no sound file needed)
let audioCtx = null;
const unlockAudio = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
};
const beep = () => {
  if (!audioCtx) return;
  [0, 0.25, 0.5].forEach((offset, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + offset + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + offset);
    osc.stop(audioCtx.currentTime + offset + 0.22);
  });
};

export const RestTimerProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_REST_SETTINGS);
  const [endAt, setEndAt] = useState(null);       // ms timestamp while running
  const [duration, setDuration] = useState(0);    // seconds, for the progress bar
  const [remaining, setRemaining] = useState(0);  // seconds left
  const [finished, setFinished] = useState(false);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (!user) { setSettings(DEFAULT_REST_SETTINGS); return; }
    StorageService.getUserProfile()
      .then(p => setSettings({ ...DEFAULT_REST_SETTINGS, ...(p?.restTimer || {}) }))
      .catch(console.error);
  }, [user?.id]);

  const saveSettings = useCallback(async updates => {
    const next = { ...settings, ...updates };
    setSettings(next);
    const latest = (await StorageService.getUserProfile()) || {};
    return StorageService.saveUserProfile({ ...latest, restTimer: next });
  }, [settings]);

  // Keep the screen on while resting (web Screen Wake Lock), if enabled
  const releaseWakeLock = () => {
    wakeLockRef.current?.release?.().catch(() => {});
    wakeLockRef.current = null;
  };
  const requestWakeLock = async () => {
    if (Platform.OS !== 'web' || !settings.keepAwake || !navigator.wakeLock) return;
    try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch { /* not allowed */ }
  };

  const stop = useCallback(() => {
    setEndAt(null);
    setFinished(false);
    releaseWakeLock();
  }, []);

  const start = useCallback((seconds = settings.seconds) => {
    unlockAudio(); // must happen inside the user's tap for iOS to allow sound later
    setDuration(seconds);
    setRemaining(seconds);
    setFinished(false);
    setEndAt(Date.now() + seconds * 1000);
    requestWakeLock();
  }, [settings]);

  // Called by the workout editor when a set is added
  const startIfEnabled = useCallback(() => { if (settings.enabled) start(); }, [settings, start]);

  const adjust = useCallback(deltaSeconds => {
    setEndAt(prev => (prev ? Math.max(Date.now() + 1000, prev + deltaSeconds * 1000) : prev));
    setDuration(d => Math.max(1, d + deltaSeconds));
  }, []);

  // Tick from the end time, so the count stays right after the app was in the background
  useEffect(() => {
    if (!endAt) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setEndAt(null);
        setFinished(true);
        releaseWakeLock();
        beep();
        Vibration.vibrate([0, 300, 150, 300]);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endAt]);

  // Wake locks drop when the page is hidden; take it back on return
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onVisible = () => { if (document.visibilityState === 'visible' && endAt) requestWakeLock(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [endAt, settings.keepAwake]);

  const value = {
    settings, saveSettings,
    running: !!endAt, finished, remaining, duration,
    start, startIfEnabled, stop, adjust,
  };
  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>;
};

export const useRestTimer = () => useContext(RestTimerContext);
