import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { getRunTrack } from '../../services/RunTrackService';
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
const RunDetails = ({ sessionId, distUnit = 'km' }) => {
  const [track, setTrack] = useState(undefined); // undefined = loading, null = none

  useEffect(() => {
    let active = true;
    getRunTrack(sessionId).then(t => { if (active) setTrack(t); });
    return () => { active = false; };
  }, [sessionId]);

  if (track === undefined) return <ActivityIndicator color={Colors.cardio} style={{ marginVertical: 20 }} />;
  if (!track?.points?.length) return null;

  const splitMetres = distUnit === 'mi' ? 1609.344 : 1000;
  const splitList = computeSplits(track.points, splitMetres);

  return (
    <View style={{ marginTop: 14 }}>
      <RouteMap points={track.points} height={220} />
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
