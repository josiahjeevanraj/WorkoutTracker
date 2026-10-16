import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { getRunTrack, getSavedRoutes, saveRoute } from '../../services/RunTrackService';
import showAlert from '../../utils/showAlert';
import RouteReplay from './RouteReplay';
import { splits as computeSplits, formatDuration } from '../../utils/geo';
import { convertDistance, formatPace } from '../../utils/cardio';
import RouteMap from './RouteMap';

const PROFILE_W = 320;
const PROFILE_H = 70;

// Elevation profile as a filled line (x: distance, y: metres)
const ElevationProfile = ({ profile, unit }) => {
  const pts = profile.filter(p => p[1] != null);
  if (pts.length < 2) return null;
  const maxD = pts[pts.length - 1][0] || 1;
  const els = pts.map(p => p[1]);
  const lo = Math.min(...els);
  const hi = Math.max(...els);
  const range = hi - lo || 1;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${((p[0] / maxD) * PROFILE_W).toFixed(1)},${(PROFILE_H - 4 - ((p[1] - lo) / range) * (PROFILE_H - 8)).toFixed(1)}`).join(' ');
  return (
    <View style={s.block}>
      <View style={s.blockHeader}>
        <Text style={s.blockLabel}>ELEVATION</Text>
        <Text style={s.blockMeta}>{Math.round(lo)}–{Math.round(hi)} m</Text>
      </View>
      <Svg width="100%" height={PROFILE_H} viewBox={`0 0 ${PROFILE_W} ${PROFILE_H}`} preserveAspectRatio="none">
        <Path d={`${line} L${PROFILE_W},${PROFILE_H} L0,${PROFILE_H} Z`} fill="rgba(34,211,238,0.18)" />
        <Path d={line} stroke={Colors.cardio} strokeWidth={2} fill="none" />
      </Svg>
      <View style={s.axis}>
        <Text style={s.axisText}>0</Text>
        <Text style={s.axisText}>{convertDistance(maxD, 'km', unit).toFixed(1)} {unit}</Text>
      </View>
    </View>
  );
};

// Map, elevation profile and splits for a session saved by the run tracker
const RunDetails = ({ sessionId, distUnit = 'km', title }) => {
  const [track, setTrack] = useState(undefined); // undefined = loading, null = none
  const [savedRoute, setSavedRoute] = useState(null); // route saved from this run
  const [naming, setNaming] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [savingRoute, setSavingRoute] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getRunTrack(sessionId).then(t => { if (active) setTrack(t); });
    getSavedRoutes().then(routes => {
      if (active) setSavedRoute(routes.find(r => r.sessionId === String(sessionId)) || null);
    });
    return () => { active = false; };
  }, [sessionId]);

  const onSaveRoute = async () => {
    setSavingRoute(true);
    const route = await saveRoute(routeName || title || 'My route', sessionId, track.points);
    setSavingRoute(false);
    if (!route) { showAlert('Could not save route', 'Please try again.'); return; }
    setSavedRoute(route);
    setNaming(false);
  };

  if (track === undefined) return <ActivityIndicator color={Colors.cardio} style={{ marginVertical: 20 }} />;
  if (!track?.points?.length) return null;

  const splitMetres = distUnit === 'mi' ? 1609.344 : 1000;
  const splitList = computeSplits(track.points, splitMetres);

  return (
    <View style={{ marginTop: 14 }}>
      <RouteMap points={track.points} height={220} />

      <View style={s.actions}>
        <TouchableOpacity style={[s.actionBtn, s.replayBtn]} onPress={() => setReplayOpen(true)}>
          <Ionicons name="play" size={16} color={Colors.onCardio} />
          <Text style={[s.actionText, { color: Colors.onCardio }]}>Replay</Text>
        </TouchableOpacity>
        {savedRoute ? (
          <View style={[s.actionBtn, s.savedBadge]}>
            <Ionicons name="bookmark" size={15} color={Colors.cardio} />
            <Text style={[s.actionText, { color: Colors.cardio }]} numberOfLines={1}>Saved as {savedRoute.name}</Text>
          </View>
        ) : !naming && (
          <TouchableOpacity style={s.actionBtn} onPress={() => { setRouteName(title || ''); setNaming(true); }}>
            <Ionicons name="bookmark-outline" size={15} color="#FFFFFF" />
            <Text style={s.actionText}>Save route</Text>
          </TouchableOpacity>
        )}
      </View>
      {naming && !savedRoute && (
        <View style={s.nameRow}>
          <TextInput
            style={s.nameInput}
            value={routeName}
            onChangeText={setRouteName}
            placeholder="Route name (e.g. Marina loop)"
            placeholderTextColor={Colors.gray}
          />
          <TouchableOpacity style={[s.actionBtn, s.replayBtn]} onPress={onSaveRoute} disabled={savingRoute}>
            <Text style={[s.actionText, { color: Colors.onCardio }]}>{savingRoute ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNaming(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      )}
      {replayOpen && (
        <RouteReplay points={track.points} title={title} distUnit={distUnit} onClose={() => setReplayOpen(false)} />
      )}
      {track.profile && <ElevationProfile profile={track.profile} unit={distUnit} />}
      {splitList.length > 0 && (
        <View style={s.block}>
          <Text style={s.blockLabel}>SPLITS</Text>
          {splitList.map((sp, i) => {
            const partial = sp.metres < splitMetres * 0.99;
            const dist = convertDistance(sp.metres / 1000, 'km', distUnit);
            return (
              <View key={i} style={s.splitRow}>
                <Text style={s.splitIdx}>{partial ? `${dist.toFixed(2)} ${distUnit}` : `${distUnit} ${i + 1}`}</Text>
                <Text style={s.splitTime}>{formatDuration(sp.seconds)}</Text>
                <Text style={s.splitPace}>{formatPace(sp.seconds / 60 / dist)} /{distUnit}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 10, backgroundColor: Colors.darkGray, flexShrink: 1,
  },
  replayBtn: { backgroundColor: Colors.cardio },
  savedBadge: { backgroundColor: 'rgba(34,211,238,0.12)' },
  actionText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  nameInput: {
    flex: 1, minWidth: 0, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 10,
    backgroundColor: Colors.background, color: '#FFFFFF', fontSize: 14, paddingHorizontal: 12, paddingVertical: 9,
  },
  block: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderColor },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  blockLabel: { fontSize: 11, color: Colors.gray, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  blockMeta: { fontSize: 11, color: Colors.gray },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisText: { fontSize: 10, color: Colors.gray },
  splitRow: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.borderColor },
  splitIdx: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  splitTime: { width: 80, fontSize: 13, color: '#FFFFFF', textAlign: 'right' },
  splitPace: { width: 90, fontSize: 13, color: Colors.cardio, textAlign: 'right', fontWeight: '600' },
});

export default RunDetails;
