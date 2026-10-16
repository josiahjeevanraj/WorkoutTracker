import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Colors } from '../../constants/colors';

// Route map for outdoor runs (native): Apple Maps in dark mode via react-native-maps.
// Same props as RouteMap.web.js.

// Points [lat, lng, t, alt, segment] -> one coordinate list per segment
const toSegments = points => {
  const segs = [];
  points.forEach(p => {
    const seg = p[4] ?? 0;
    if (!segs.length || segs[segs.length - 1].seg !== seg) segs.push({ seg, coords: [] });
    segs[segs.length - 1].coords.push({ latitude: p[0], longitude: p[1] });
  });
  return segs;
};

const Dot = ({ color, size = 14 }) => (
  <View style={[s.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />
);

// points: track so far; follow: keep the latest point centred (live run);
// marker: optional [lat, lng] for replay; guide: optional points of a saved route
const RouteMap = ({ points = [], follow = false, marker = null, guide = null, height = 260, accent = Colors.cardio, interactive = true }) => {
  const mapRef = useRef(null);
  const fittedRef = useRef(false);
  const segments = useMemo(() => toSegments(points), [points]);
  const guideSegments = useMemo(() => toSegments(guide || []), [guide]);
  const head = marker || points[points.length - 1];
  const start = points[0];

  // Follow the runner, or fit the whole route once
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (follow && head) {
      map.animateCamera({ center: { latitude: head[0], longitude: head[1] } }, { duration: 500 });
    } else if (!fittedRef.current) {
      const all = [...points, ...(guide || [])].map(p => ({ latitude: p[0], longitude: p[1] }));
      if (all.length > 1) {
        map.fitToCoordinates(all, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false });
        fittedRef.current = true;
      }
    }
  }, [points, follow, head?.[0], head?.[1]]);

  const initial = start || guide?.[0];
  return (
    <View style={[s.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark"
        showsPointsOfInterest={false}
        showsBuildings={false}
        pitchEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        initialRegion={initial
          ? { latitude: initial[0], longitude: initial[1], latitudeDelta: 0.01, longitudeDelta: 0.01 }
          : { latitude: 1.3521, longitude: 103.8198, latitudeDelta: 0.3, longitudeDelta: 0.3 }}
      >
        {guideSegments.map((g, i) => g.coords.length > 1 && (
          <Polyline key={`g${i}`} coordinates={g.coords} strokeColor="rgba(255,255,255,0.35)" strokeWidth={6} lineCap="round" lineJoin="round" />
        ))}
        {segments.map((g, i) => g.coords.length > 1 && (
          <Polyline key={`r${i}`} coordinates={g.coords} strokeColor={accent} strokeWidth={5} lineCap="round" lineJoin="round" />
        ))}
        {start && (
          <Marker coordinate={{ latitude: start[0], longitude: start[1] }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <Dot color={Colors.green} size={12} />
          </Marker>
        )}
        {head && (
          <Marker coordinate={{ latitude: head[0], longitude: head[1] }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <Dot color={accent} />
          </Marker>
        )}
      </MapView>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderColor },
  dot: { borderWidth: 2, borderColor: '#FFFFFF' },
});

export default RouteMap;
