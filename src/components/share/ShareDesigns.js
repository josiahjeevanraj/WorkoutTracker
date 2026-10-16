import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Path, Circle } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { summariseSession } from '../../utils/sessionSummary';
import { projectRoute, routePath, runStats, indexAtShare } from '../../utils/routeGeometry';
import { formatDuration } from '../../utils/geo';
import { formatPace } from '../../utils/cardio';

// Native versions of the share images (the web draws them on a canvas). Sizes are
// in points and mirror the 1080-px web layouts: `k` converts web pixels to points,
// so a 360-pt-wide view captured at 3× is the same 1080×1920 image.

const accentFor = cardio => (cardio ? Colors.cardio : Colors.primary);
const accentRgbFor = cardio => (cardio ? '34,211,238' : '255,230,0');

// Route stroke with a soft glow (wide translucent underlay) and a bright core
const RouteStroke = ({ d, color, width }) => (
  <>
    <Path d={d} stroke={color} strokeOpacity={0.25} strokeWidth={width * 2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d={d} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={width * 0.45} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

const Dot = ({ p, r, fill }) => (p ? <Circle cx={p.x} cy={p.y} r={r} fill={fill} stroke="#FFFFFF" strokeWidth={r * 0.4} /> : null);

// Route outline fitted into whatever space its box gets
const RouteBox = ({ points, k, style }) => {
  const [size, setSize] = useState(null);
  const proj = size ? projectRoute(points, { x: 0, y: 0, w: size.w, h: size.h }, 30 * k) : [];
  const { d } = routePath(proj);
  return (
    <View style={style} onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size && proj.length > 1 && (
        <Svg width={size.w} height={size.h}>
          <RouteStroke d={d} color={Colors.cardio} width={12 * k} />
          <Dot p={proj[0]} r={12 * k} fill={Colors.green} />
          <Dot p={proj[proj.length - 1]} r={12 * k} fill={Colors.cardio} />
        </Svg>
      )}
    </View>
  );
};

const Footer = ({ k, accent, style }) => (
  <View style={style}>
    <View style={{ width: 120 * k, height: 12 * k, borderRadius: 6 * k, backgroundColor: accent }} />
    <Text style={{ color: Colors.textSecondary, fontSize: 36 * k, fontWeight: '600', marginTop: 24 * k }}>Logged with Motion</Text>
  </View>
);

// ── Story (9:16) ────────────────────────────────────────────────────────────
export const StoryDesign = React.forwardRef(({ session, track, weightUnit, width = 360 }, ref) => {
  const k = width / 1080;
  const H = width * 16 / 9;
  const { cardio, stats, rows } = summariseSession(session, weightUnit);
  const accent = accentFor(cardio);
  const rgb = accentRgbFor(cardio);
  const hasRoute = track?.points?.length > 1;
  const maxRows = 4; // fits below a two-line title and stat tiles
  return (
    <View ref={ref} collapsable={false} style={{ width, height: H, backgroundColor: Colors.background, overflow: 'hidden' }}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={H}>
        <Defs>
          <RadialGradient id="glow" cx={width * 0.9} cy={H * 0.08} r={width * 0.9} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity={0.28} />
            <Stop offset="1" stopColor={`rgb(${rgb})`} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={H} fill="url(#glow)" />
      </Svg>
      <View style={{ paddingHorizontal: 96 * k, paddingTop: 260 * k, flex: 1, paddingBottom: 330 * k }}>
        <Text style={{ color: accent, fontSize: 36 * k, fontWeight: '800' }}>{cardio ? 'CARDIO SESSION' : 'LIFTING SESSION'}</Text>
        <Text style={{ color: Colors.gray, fontSize: 40 * k, fontWeight: '500', marginTop: 20 * k }}>
          {new Date(session.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text numberOfLines={2} style={{ color: '#FFFFFF', fontSize: 112 * k, lineHeight: 128 * k, fontWeight: '800', marginTop: 24 * k }}>
          {session.name || 'Workout'}
        </Text>
        {stats.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 28 * k, marginTop: 48 * k }}>
            {stats.map(st => (
              <View key={st.label} style={{ flex: 1, height: 210 * k, borderRadius: 36 * k, backgroundColor: Colors.cardBackground, borderWidth: 3 * k, borderColor: `rgba(${rgb},0.35)`, padding: 32 * k }}>
                <Text style={{ color: Colors.gray, fontSize: 30 * k, fontWeight: '700', marginTop: 8 * k }}>{st.label}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: accent, fontSize: 64 * k, fontWeight: '800', marginTop: 20 * k }}>{st.value}</Text>
              </View>
            ))}
          </View>
        )}
        {hasRoute ? (
          <RouteBox points={track.points} k={k} style={{ flex: 1, marginTop: 72 * k }} />
        ) : (
          <View style={{ marginTop: 72 * k }}>
            <Text style={{ color: Colors.gray, fontSize: 32 * k, fontWeight: '700', marginBottom: 32 * k }}>EXERCISES</Text>
            {rows.slice(0, maxRows).map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 40 * k }}>
                <View style={{ width: 20 * k, height: 20 * k, borderRadius: 10 * k, backgroundColor: accent, marginTop: 14 * k, marginRight: 30 * k }} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 44 * k, fontWeight: '700' }}>{row.name}</Text>
                  <Text numberOfLines={1} style={{ color: Colors.textSecondary, fontSize: 34 * k, fontWeight: '500', marginTop: 6 * k }}>{row.detail}</Text>
                </View>
              </View>
            ))}
            {rows.length > maxRows && (
              <Text style={{ color: Colors.gray, fontSize: 36 * k, fontWeight: '600', marginLeft: 50 * k }}>+{rows.length - maxRows} more</Text>
            )}
          </View>
        )}
      </View>
      <Footer k={k} accent={accent} style={{ position: 'absolute', left: 96 * k, bottom: 230 * k }} />
    </View>
  );
});

// ── Stats sticker (transparent card) ────────────────────────────────────────
export const StickerDesign = React.forwardRef(({ session, weightUnit, width = 300 }, ref) => {
  const k = width / 900;
  const { cardio, stats } = summariseSession(session, weightUnit);
  const accent = accentFor(cardio);
  const rgb = accentRgbFor(cardio);
  return (
    <View ref={ref} collapsable={false} style={{ width, backgroundColor: 'transparent' }}>
      <View style={{ borderRadius: 48 * k, backgroundColor: 'rgba(14,14,14,0.72)', borderWidth: 4 * k, borderColor: `rgba(${rgb},0.6)`, padding: 64 * k }}>
        <Text style={{ color: accent, fontSize: 30 * k, fontWeight: '800' }}>{cardio ? 'CARDIO SESSION' : 'LIFTING SESSION'}</Text>
        <Text numberOfLines={2} style={{ color: '#FFFFFF', fontSize: 76 * k, lineHeight: 88 * k, fontWeight: '800', marginTop: 22 * k }}>{session.name || 'Workout'}</Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 32 * k, fontWeight: '500', marginTop: 12 * k }}>
          {new Date(session.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        {stats.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 20 * k, marginTop: 32 * k }}>
            {stats.map(st => (
              <View key={st.label} style={{ flex: 1, height: 170 * k, borderRadius: 28 * k, backgroundColor: 'rgba(255,255,255,0.07)', padding: 24 * k }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 24 * k, fontWeight: '700', marginTop: 6 * k }}>{st.label}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: accent, fontSize: 52 * k, fontWeight: '800', marginTop: 22 * k }}>{st.value}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ width: 90 * k, height: 10 * k, borderRadius: 5 * k, backgroundColor: accent, marginTop: 48 * k }} />
        <Text style={{ color: Colors.textSecondary, fontSize: 30 * k, fontWeight: '600', marginTop: 18 * k }}>Logged with Motion</Text>
      </View>
    </View>
  );
});

// Distance / time / pace row (used by the route sticker and the animation)
const StatTriplet = ({ stats, k, progress = 1, size = 70 }) => {
  const items = [
    { label: 'DISTANCE', value: `${(stats.distance * progress).toFixed(2)} ${stats.unit}` },
    { label: 'TIME', value: formatDuration(stats.duration * 60 * progress) },
    { label: 'PACE', value: stats.pace ? `${formatPace(stats.pace)} /${stats.unit}` : '—' },
  ];
  const shadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8 * k, textShadowOffset: { width: 0, height: 2 * k } };
  return (
    <View style={{ flexDirection: 'row' }}>
      {items.map(it => (
        <View key={it.label} style={{ flex: 1 }}>
          <Text style={[{ color: Colors.textSecondary, fontSize: size * 0.42 * k, fontWeight: '700' }, shadow]}>{it.label}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[{ color: '#FFFFFF', fontSize: size * k, fontWeight: '800', marginTop: 8 * k }, shadow]}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
};

// ── Route outline sticker (transparent) ─────────────────────────────────────
export const RouteDesign = React.forwardRef(({ session, track, weightUnit, width = 360 }, ref) => {
  const k = width / 1080;
  const stats = runStats(session, weightUnit);
  return (
    <View ref={ref} collapsable={false} style={{ width, height: 1300 * k, backgroundColor: 'transparent', paddingHorizontal: 90 * k }}>
      <RouteBox points={track.points} k={k} style={{ height: 900 * k, marginTop: 40 * k }} />
      <View style={{ marginTop: 70 * k }}>
        <StatTriplet stats={stats} k={k} />
      </View>
      <Text style={{ color: Colors.cardio, fontSize: 32 * k, fontWeight: '700', marginTop: 50 * k }}>Logged with Motion</Text>
    </View>
  );
});

// ── One frame of the route animation ────────────────────────────────────────
// mapUri: snapshot of the map behind the route; proj: route projected onto it
// (in this view's points); progress 0..1 of drawing; footerOpacity fades in at the end.
export const AnimationFrame = React.forwardRef(({ session, weightUnit, width = 360, mapUri, proj, progress, footerOpacity = 0, stats }, ref) => {
  const k = width / 1080;
  const H = width * 16 / 9;
  const { d, head } = routePath(proj, indexAtShare(proj, progress));
  return (
    <View ref={ref} collapsable={false} style={{ width, height: H, backgroundColor: Colors.background, overflow: 'hidden' }}>
      {mapUri && <Image source={{ uri: mapUri }} style={{ position: 'absolute', left: 0, top: 0, width, height: H }} />}
      <Svg style={StyleSheet.absoluteFill} width={width} height={H}>
        <Defs>
          <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0E0E0E" stopOpacity={0.95} />
            <Stop offset="1" stopColor="#0E0E0E" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0E0E0E" stopOpacity={0} />
            <Stop offset="0.35" stopColor="#0E0E0E" stopOpacity={0.92} />
            <Stop offset="1" stopColor="#0E0E0E" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={520 * k} fill="url(#top)" />
        <Rect x={0} y={H - 760 * k} width={width} height={760 * k} fill="url(#bottom)" />
        {proj.length > 1 && <RouteStroke d={d} color={Colors.cardio} width={12 * k} />}
        <Dot p={proj[0]} r={12 * k} fill={Colors.green} />
        <Dot p={head} r={16 * k} fill={Colors.cardio} />
      </Svg>
      <View style={{ position: 'absolute', left: 96 * k, right: 96 * k, top: 260 * k }}>
        <Text style={{ color: Colors.cardio, fontSize: 36 * k, fontWeight: '800' }}>OUTDOOR RUN</Text>
        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 84 * k, fontWeight: '800', marginTop: 16 * k }}>{session.name || 'Outdoor Run'}</Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 36 * k, fontWeight: '500', marginTop: 16 * k }}>
          {new Date(session.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>
      <View style={{ position: 'absolute', left: 96 * k, right: 96 * k, top: H - 520 * k }}>
        <StatTriplet stats={stats} k={k} progress={progress} size={72} />
      </View>
      <Footer k={k} accent={Colors.cardio} style={{ position: 'absolute', left: 96 * k, top: H - 330 * k, opacity: footerOpacity }} />
      {mapUri && (
        <Text style={{ position: 'absolute', left: 96 * k, bottom: 90 * k, color: 'rgba(255,255,255,0.45)', fontSize: 24 * k, fontWeight: '500' }}>Map: Apple Maps</Text>
      )}
    </View>
  );
});
