import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

// Route map for outdoor runs (web): MapLibre with free OpenFreeMap tiles (no API key).
// MapLibre is loaded on demand so it isn't in the main bundle.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

// Points [lat, lng, t, alt, segment] -> GeoJSON MultiLineString (one line per segment)
const toGeoJSON = points => {
  const lines = [];
  points.forEach(p => {
    const seg = p[4] ?? 0;
    if (!lines.length || lines[lines.length - 1].seg !== seg) lines.push({ seg, coords: [] });
    lines[lines.length - 1].coords.push([p[1], p[0]]);
  });
  return { type: 'Feature', geometry: { type: 'MultiLineString', coordinates: lines.map(l => l.coords) } };
};

const pointFeature = p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p ? [p[1], p[0]] : [0, 0] } });

// points: track so far; follow: keep the latest point centred (live run);
// marker: optional [lat, lng] for replay; guide: optional points of a saved route
const RouteMap = ({ points = [], follow = false, marker = null, guide = null, height = 260, accent = Colors.cardio, interactive = true }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const fittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
      .then(([mod]) => {
        if (cancelled || !containerRef.current) return;
        const maplibregl = mod.default || mod;
        const first = points[0];
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: STYLE_URL,
          center: first ? [first[1], first[0]] : [103.8198, 1.3521],
          zoom: first ? 15 : 10,
          interactive,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        map.on('load', () => {
          map.addSource('guide', { type: 'geojson', data: toGeoJSON(guide || []) });
          map.addLayer({ id: 'guide', type: 'line', source: 'guide', paint: { 'line-color': '#FFFFFF', 'line-opacity': 0.35, 'line-width': 5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
          map.addSource('route', { type: 'geojson', data: toGeoJSON(points) });
          map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': accent, 'line-width': 5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
          map.addSource('start', { type: 'geojson', data: pointFeature(points[0]) });
          map.addLayer({ id: 'start', type: 'circle', source: 'start', paint: { 'circle-radius': 6, 'circle-color': Colors.green, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 } });
          map.addSource('head', { type: 'geojson', data: pointFeature(marker || points[points.length - 1]) });
          map.addLayer({ id: 'head', type: 'circle', source: 'head', paint: { 'circle-radius': 7, 'circle-color': accent, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 } });
          setReady(true);
        });
      })
      .catch(err => { console.error('Map failed to load:', err); setFailed(true); });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Keep sources in sync with the props
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getSource('route')?.setData(toGeoJSON(points));
    map.getSource('start')?.setData(pointFeature(points[0]));
    const head = marker || points[points.length - 1];
    map.getSource('head')?.setData(pointFeature(head));
    map.setLayoutProperty('start', 'visibility', points.length ? 'visible' : 'none');
    map.setLayoutProperty('head', 'visibility', head ? 'visible' : 'none');

    if (follow && head) {
      map.easeTo({ center: [head[1], head[0]], duration: 500 });
    } else if (!fittedRef.current) {
      const all = [...points, ...(guide || [])];
      if (all.length > 1) {
        const lngs = all.map(p => p[1]);
        const lats = all.map(p => p[0]);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 32, duration: 0, maxZoom: 17 });
        fittedRef.current = true;
      }
    }
  }, [ready, points, marker, follow]);

  useEffect(() => {
    if (ready) mapRef.current?.getSource('guide')?.setData(toGeoJSON(guide || []));
  }, [ready, guide]);

  return (
    <View style={[s.wrap, { height }]}>
      <View ref={containerRef} style={StyleSheet.absoluteFill} />
      {failed && <Text style={s.failed}>Map couldn't load</Text>}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderColor },
  failed: { position: 'absolute', alignSelf: 'center', top: '45%', color: Colors.gray, fontSize: 13 },
});

export default RouteMap;
