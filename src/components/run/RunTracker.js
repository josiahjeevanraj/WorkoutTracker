import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { saveRunTrack, getSavedRoutes, deleteRoute } from '../../services/RunTrackService';
import { startRunLocation } from '../../services/runLocation';
import showAlert from '../../utils/showAlert';
import { distanceUnitFor, convertDistance, formatPace } from '../../utils/cardio';
import { acceptPoint, trackDistance, haversine, buildElevationProfile, elevationGain, formatDuration, smoothFix, SMOOTH_WINDOW } from '../../utils/geo';
import RouteMap from './RouteMap';

const ACCENT = Colors.cardio;
const CURRENT_PACE_WINDOW_MS = 30000;
const OFF_ROUTE_M = 60; // further than this from a followed route counts as off route

const confirmAction = (message, onYes) => {
  Alert.alert(message, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Yes', style: 'destructive', onPress: onYes },
  ]);
};

// Live GPS tracker for outdoor runs (native app only; RunTracker.web.js is a stub).
// Tracking continues in the background with "Always" location permission.
// Saves a cardio session "Outdoor Run" plus its GPS track (RunTrackService).
const RunTracker = ({ visible, onClose, onSaved, weightUnit = 'kg' }) => {
  const { height: windowHeight } = useWindowDimensions();
  const distUnit = distanceUnitFor(weightUnit);

  const [status, setStatus] = useState('ready'); // ready | running | paused | finishing | saving
  const [points, setPoints] = useState([]);
  const [fix, setFix] = useState(null);          // latest raw fix: { lat, lng, accuracy, altitude }
  const [gpsError, setGpsError] = useState(null);
  const [, setTick] = useState(0);               // re-render every second while running
  const [name, setName] = useState('Outdoor Run');
  const [routes, setRoutes] = useState([]);           // saved routes to follow
  const [route, setRoute] = useState(null);            // route being followed
  const [routePickerOpen, setRoutePickerOpen] = useState(false);

  const statusRef = useRef(status);
  statusRef.current = status;
  const pointsRef = useRef([]);
  const segmentRef = useRef(0);
  const activeMsRef = useRef(0);       // active time before the current running stretch
  const resumedAtRef = useRef(null);   // when the current running stretch began
  const startedAtRef = useRef(null);   // wall clock start, for the session date
  const rawRef = useRef([]);           // recent raw fixes, averaged to smooth GPS wobble

  const elapsedMs = () => activeMsRef.current + (resumedAtRef.current ? Date.now() - resumedAtRef.current : 0);
  // Active time at a fix's timestamp; null if the fix predates the current running stretch
  const elapsedAt = ts => {
    if (!resumedAtRef.current || !ts) return resumedAtRef.current ? elapsedMs() : null;
    return ts < resumedAtRef.current ? null : activeMsRef.current + (ts - resumedAtRef.current);
  };

  const reset = () => {
    setStatus('ready'); setPoints([]); setName('Outdoor Run'); setRoute(null);
    pointsRef.current = []; segmentRef.current = 0; activeMsRef.current = 0;
    resumedAtRef.current = null; startedAtRef.current = null;
  };

  useEffect(() => {
    if (visible) getSavedRoutes().then(setRoutes).catch(console.error);
  }, [visible]);

  const removeRoute = id => confirmAction('Delete this saved route?', async () => {
    await deleteRoute(id);
    setRoutes(prev => prev.filter(r => r.id !== id));
    if (route?.id === id) setRoute(null);
  });

  // Watch GPS while the tracker is open (also warms up the fix before starting).
  // Native keeps tracking in the background; points use each fix's own timestamp
  // because iOS can deliver background locations in batches.
  useEffect(() => {
    if (!visible) return;
    let stop = () => {};
    let cancelled = false;
    startRunLocation(
      (coords, timestamp) => {
        const { latitude, longitude, accuracy, altitude } = coords;
        setFix({ lat: latitude, lng: longitude, accuracy, altitude });
        setGpsError(prev => (prev?.soft ? prev : null));
        if (statusRef.current !== 'running') return;
        if (accuracy != null && accuracy > 30) return; // too imprecise to use
        const t = elapsedAt(timestamp);
        if (t == null) return; // from before this running stretch
        const raw = [latitude, longitude, t, altitude ?? null, segmentRef.current];
        rawRef.current = [...rawRef.current.slice(-(SMOOTH_WINDOW - 1)), raw];
        const next = smoothFix(rawRef.current);
        const last = pointsRef.current[pointsRef.current.length - 1];
        if (acceptPoint(last, next, accuracy)) {
          pointsRef.current = [...pointsRef.current, next];
          setPoints(pointsRef.current);
        }
      },
      err => setGpsError(err),
    ).then(fn => { if (cancelled) fn(); else stop = fn; });
    return () => { cancelled = true; stop(); };
  }, [visible]);

  // Clock tick
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);


  const start = () => {
    rawRef.current = [];
    startedAtRef.current = new Date();
    resumedAtRef.current = Date.now();
    setStatus('running');
  };
  const pause = () => {
    activeMsRef.current = elapsedMs();
    resumedAtRef.current = null;
    setStatus('paused');
  };
  const resume = () => {
    segmentRef.current += 1; // don't join the line across the pause
    rawRef.current = [];     // don't average across the pause either
    resumedAtRef.current = Date.now();
    setStatus('running');
  };
  const finish = () => {
    if (statusRef.current === 'running') pause();
    setStatus('finishing');
  };

  const close = () => {
    const done = () => { reset(); onClose(); };
    if (status === 'ready') return done();
    confirmAction('Discard this run? It will not be saved.', done);
  };

  const save = async () => {
    const track = pointsRef.current;
    const metres = trackDistance(track);
    if (track.length < 2 || metres < 20) {
      showAlert('Run too short', 'There is not enough GPS data to save this run.');
      return;
    }
    setStatus('saving');
    const activeMs = activeMsRef.current;

    // Elevation from the DEM lookup; fall back to GPS altitude if it fails
    let profile = null;
    let gain = 0;
    try {
      profile = await buildElevationProfile(track);
      gain = elevationGain(profile.map(p => p[1]));
    } catch (err) {
      console.error(err);
      gain = elevationGain(track.map(p => p[3]));
    }

    const distance = convertDistance(metres / 1000, 'km', distUnit);
    const session = await StorageService.addWorkoutSession({
      name: name.trim() || 'Outdoor Run',
      completedAt: startedAtRef.current.toISOString(),
      duration: Math.round(activeMs / 60000),
      exerciseCount: 1,
      caloriesBurned: 0,
      notes: '',
      hasTrack: true,
      exercises: [{
        name: 'Outdoor Run',
        type: 'cardio',
        sets: [{
          duration: (activeMs / 60000).toFixed(2),
          distance: distance.toFixed(2),
          unit: distUnit,
          incline: '0',
          elevationGain: gain,
        }],
      }],
    });
    if (!session) {
      setStatus('finishing');
      showAlert('Could not save', 'Your run was not saved. Please try again.');
      return;
    }
    const trackSaved = await saveRunTrack(session.id, track, profile);
    if (!trackSaved) showAlert('Route not saved', 'The run was saved, but its map route could not be stored.');
    reset();
    onSaved?.(session);
    onClose();
  };

  // ── Live stats ──
  const ms = elapsedMs();
  const metres = trackDistance(points);
  const distance = convertDistance(metres / 1000, 'km', distUnit);
  const avgPace = distance > 0.01 ? ms / 60000 / distance : null;
  const recent = points.filter(p => p[2] >= ms - CURRENT_PACE_WINDOW_MS && p[4] === segmentRef.current);
  let currentPace = null;
  if (status === 'running' && recent.length > 1) {
    let d = 0;
    for (let i = 1; i < recent.length; i++) d += haversine(recent[i - 1], recent[i]);
    const dt = (recent[recent.length - 1][2] - recent[0][2]) / 60000;
    const dUnit = convertDistance(d / 1000, 'km', distUnit);
    if (dUnit > 0.005) currentPace = dt / dUnit;
  }
  const signal = !fix ? 'Searching' : fix.accuracy <= 10 ? 'Strong' : fix.accuracy <= 25 ? 'OK' : 'Weak';
  const signalColor = !fix ? Colors.gray : fix.accuracy <= 10 ? Colors.green : fix.accuracy <= 25 ? Colors.amber : Colors.softRed;
  const mapPoints = points.length ? points : fix ? [[fix.lat, fix.lng, 0, null, 0]] : [];

  // Following a saved route: distance left and whether we've strayed from it
  const routeLeft = route ? Math.max(0, convertDistance((route.metres - metres) / 1000, 'km', distUnit)) : null;
  let offRouteBy = null;
  if (route && fix && status === 'running') {
    const here = [fix.lat, fix.lng];
    const nearest = route.points.reduce((min, p) => Math.min(min, haversine(here, p)), Infinity);
    if (nearest > OFF_ROUTE_M) offRouteBy = Math.round(nearest);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={s.screen}>
        <View style={s.header}>
          <Text style={s.title}>Outdoor Run</Text>
          <View style={s.signal}>
            <View style={[s.signalDot, { backgroundColor: signalColor }]} />
            <Text style={s.signalText}>GPS {signal}</Text>
          </View>
          <TouchableOpacity onPress={close} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.gray} />
          </TouchableOpacity>
        </View>

        <RouteMap points={mapPoints} guide={route?.points} follow height={Math.max(220, windowHeight * 0.38)} accent={ACCENT} />

        {status === 'ready' ? (
          <TouchableOpacity style={s.routePick} onPress={() => setRoutePickerOpen(true)}>
            <Ionicons name="map-outline" size={15} color={ACCENT} />
            <Text style={s.routePickText} numberOfLines={1}>
              Route: {route ? `${route.name} · ${convertDistance(route.metres / 1000, 'km', distUnit).toFixed(2)} ${distUnit}` : 'None'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={Colors.gray} />
          </TouchableOpacity>
        ) : route && (
          <Text style={s.routeLeft}>
            {route.name} · <Text style={{ color: ACCENT }}>{routeLeft.toFixed(2)} {distUnit} left</Text>
          </Text>
        )}
        {offRouteBy && <Text style={[s.notice, { color: Colors.amber }]}>Off route — about {offRouteBy} m from it</Text>}

        {gpsError && <Text style={[s.notice, gpsError.soft && { color: Colors.amber }]}>{gpsError.message}</Text>}
        {status === 'ready' && !gpsError && (
          <Text style={s.hint}>Tracking keeps going with the phone locked or in your pocket.</Text>
        )}

        <View style={s.timeBlock}>
          <Text style={s.label}>TIME</Text>
          <Text style={s.time}>{formatDuration(ms / 1000)}</Text>
        </View>
        <View style={s.grid}>
          <View style={s.stat}>
            <Text style={s.label}>DISTANCE</Text>
            <Text style={s.value}>{distance.toFixed(2)} <Text style={s.unit}>{distUnit}</Text></Text>
          </View>
          <View style={s.stat}>
            <Text style={s.label}>AVG PACE</Text>
            <Text style={s.value}>{avgPace ? formatPace(avgPace) : '—'} <Text style={s.unit}>/{distUnit}</Text></Text>
          </View>
          <View style={s.stat}>
            <Text style={s.label}>CURRENT</Text>
            <Text style={s.value}>{currentPace ? formatPace(currentPace) : '—'} <Text style={s.unit}>/{distUnit}</Text></Text>
          </View>
          <View style={s.stat}>
            <Text style={s.label}>ALTITUDE</Text>
            <Text style={s.value}>{fix?.altitude != null ? Math.round(fix.altitude) : '—'} <Text style={s.unit}>m</Text></Text>
          </View>
        </View>

        <View style={s.controls}>
          {status === 'ready' && (
            <TouchableOpacity style={[s.bigBtn, { backgroundColor: ACCENT }, !fix && s.disabled]} onPress={start} disabled={!fix}>
              <Ionicons name="play" size={22} color={Colors.onCardio} />
              <Text style={[s.bigBtnText, { color: Colors.onCardio }]}>{fix ? 'Start' : 'Waiting for GPS…'}</Text>
            </TouchableOpacity>
          )}
          {status === 'running' && (
            <>
              <TouchableOpacity style={[s.bigBtn, s.secondary]} onPress={pause}>
                <Ionicons name="pause" size={22} color="#FFFFFF" />
                <Text style={s.bigBtnText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.bigBtn, { backgroundColor: Colors.softRed }]} onPress={finish}>
                <Ionicons name="stop" size={20} color="#FFFFFF" />
                <Text style={s.bigBtnText}>Finish</Text>
              </TouchableOpacity>
            </>
          )}
          {status === 'paused' && (
            <>
              <TouchableOpacity style={[s.bigBtn, { backgroundColor: ACCENT }]} onPress={resume}>
                <Ionicons name="play" size={22} color={Colors.onCardio} />
                <Text style={[s.bigBtnText, { color: Colors.onCardio }]}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.bigBtn, { backgroundColor: Colors.softRed }]} onPress={finish}>
                <Ionicons name="stop" size={20} color="#FFFFFF" />
                <Text style={s.bigBtnText}>Finish</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {routePickerOpen && (
          <View style={s.finishOverlay}>
            <View style={s.finishSheet}>
              <Text style={s.finishTitle}>Follow a route</Text>
              <TouchableOpacity style={s.routeRow} onPress={() => { setRoute(null); setName('Outdoor Run'); setRoutePickerOpen(false); }}>
                <Text style={s.routeName}>None — free run</Text>
                {!route && <Ionicons name="checkmark" size={18} color={ACCENT} />}
              </TouchableOpacity>
              {routes.length === 0 && (
                <Text style={s.routeEmpty}>No saved routes yet. Save one from a run's session card.</Text>
              )}
              {routes.map(r => (
                <View key={r.id} style={s.routeRow}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => { setRoute(r); setName(r.name); setRoutePickerOpen(false); }}>
                    <Text style={s.routeName} numberOfLines={1}>{r.name}</Text>
                    <Text style={s.routeMeta}>{convertDistance(r.metres / 1000, 'km', distUnit).toFixed(2)} {distUnit}</Text>
                  </TouchableOpacity>
                  {route?.id === r.id && <Ionicons name="checkmark" size={18} color={ACCENT} />}
                  <TouchableOpacity onPress={() => removeRoute(r.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 12 }}>
                    <Ionicons name="trash-outline" size={18} color={Colors.softRed} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[s.finishBtn, s.secondary, { marginTop: 14 }]} onPress={() => setRoutePickerOpen(false)}>
                <Text style={s.finishBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(status === 'finishing' || status === 'saving') && (
          <View style={s.finishOverlay}>
            <View style={s.finishSheet}>
              <Text style={s.finishTitle}>Save run</Text>
              <Text style={s.finishSummary}>
                {formatDuration(activeMsRef.current / 1000)} · {distance.toFixed(2)} {distUnit}
                {avgPace ? ` · ${formatPace(avgPace)} /${distUnit}` : ''}
              </Text>
              <TextInput
                style={s.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Run name"
                placeholderTextColor={Colors.gray}
              />
              {status === 'saving' ? (
                <View style={s.savingRow}>
                  <ActivityIndicator color={ACCENT} />
                  <Text style={s.savingText}>Saving run and looking up elevation…</Text>
                </View>
              ) : (
                <View style={s.finishButtons}>
                  <TouchableOpacity style={[s.finishBtn, { backgroundColor: ACCENT }]} onPress={save}>
                    <Text style={[s.finishBtnText, { color: Colors.onCardio }]}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.finishBtn, s.secondary]} onPress={() => setStatus('paused')}>
                    <Text style={s.finishBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.finishBtn, { backgroundColor: 'transparent' }]}
                    onPress={() => confirmAction('Discard this run? It will not be saved.', () => { reset(); onClose(); })}
                  >
                    <Text style={[s.finishBtnText, { color: Colors.softRed }]}>Discard</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalDot: { width: 8, height: 8, borderRadius: 4 },
  signalText: { fontSize: 12, color: Colors.gray, fontWeight: '600' },
  closeBtn: { padding: 4 },
  notice: { fontSize: 12, color: Colors.softRed, marginTop: 8 },
  routePick: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderColor,
  },
  routePickText: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  routeLeft: { marginTop: 10, fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderColor },
  routeName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  routeMeta: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  routeEmpty: { fontSize: 13, color: Colors.gray, paddingVertical: 10 },
  hint: { fontSize: 12, color: Colors.gray, marginTop: 8 },
  timeBlock: { alignItems: 'center', marginTop: 16 },
  label: { fontSize: 11, color: Colors.gray, fontWeight: '700', letterSpacing: 1 },
  time: { fontSize: 56, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  stat: { width: '50%', paddingVertical: 10, alignItems: 'center' },
  value: { fontSize: 26, fontWeight: '800', color: ACCENT, fontVariant: ['tabular-nums'], marginTop: 2 },
  unit: { fontSize: 13, color: Colors.gray, fontWeight: '600' },
  controls: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
  bigBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16 },
  bigBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  secondary: { backgroundColor: Colors.darkGray },
  disabled: { opacity: 0.5 },
  finishOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  finishSheet: { backgroundColor: Colors.cardBackground, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.borderColor },
  finishTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  finishSummary: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, marginBottom: 16 },
  nameInput: {
    borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 12, backgroundColor: Colors.background,
    color: '#FFFFFF', fontSize: 15, paddingHorizontal: 12, paddingVertical: 11,
  },
  finishButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  finishBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  finishBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  savingText: { color: Colors.gray, fontSize: 13 },
});

export default RunTracker;
