import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions, NativeModules,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import MapView from 'react-native-maps';
import { Colors } from '../../constants/colors';
import { getRunTrack } from '../../services/RunTrackService';
import { isCardio } from '../../utils/cardio';
import { downsample } from '../../utils/geo';
import { runStats } from '../../utils/routeGeometry';
import showAlert from '../../utils/showAlert';
import { StoryDesign, StickerDesign, RouteDesign, AnimationFrame } from '../share/ShareDesigns';

// Native share preview (the web version draws on a canvas — see StoryShare.js).
// Images are native views captured with react-native-view-shot at screen scale
// (a 360-pt story at 3× = 1080×1920); the animation is captured frame by frame
// and written to MP4 by the MotionVideoWriter native module.

const { MotionVideoWriter } = NativeModules;

const STORY = { w: 360, h: 640 };
const FPS = 24;
const DRAW_MS = 7000;
const HOLD_MS = 2000;

const baseFormats = [
  { id: 'story', label: 'Story', kind: 'image' },
  { id: 'sticker', label: 'Sticker', kind: 'image', transparent: true },
];
const runFormats = [
  { id: 'story', label: 'Story', kind: 'image' },
  { id: 'route', label: 'Route', kind: 'image', transparent: true },
  { id: 'animation', label: 'Animation', kind: 'video' },
  { id: 'sticker', label: 'Sticker', kind: 'image', transparent: true },
];

const HINTS = {
  story: 'Share, then choose Instagram → Story',
  sticker: 'Transparent PNG — copy and paste it onto your own photo in Instagram',
  route: 'Transparent route outline — paste it onto a photo from your run',
  animation: 'Your route drawing over the map — share it as a story video',
};

const nextPaint = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const wait = ms => new Promise(r => setTimeout(r, ms));
const getImageSize = uri => new Promise((res, rej) => Image.getSize(uri, (w, h) => res({ w, h }), rej));

// Shows a fixed-size design scaled down to fit, without changing what gets captured
const Scaled = ({ w, h, maxW, maxH, transparent, children }) => {
  const scale = Math.min(1, maxW / w, maxH / h);
  return (
    <View style={[s.preview, { width: w * scale, height: h * scale }, transparent && s.transparentBackdrop]}>
      <View style={{ width: w, height: h, transform: [{ translateX: -(w - w * scale) / 2 }, { translateY: -(h - h * scale) / 2 }, { scale }] }}>
        {children}
      </View>
    </View>
  );
};

const StoryShare = ({ session, weightUnit, onClose }) => {
  const { width: winW, height: winH } = useWindowDimensions();
  const [format, setFormat] = useState('story');
  const [track, setTrack] = useState(session.hasTrack ? undefined : null); // undefined = loading
  const [busy, setBusy] = useState(null);         // status text while working
  const [copied, setCopied] = useState(false);
  const designRef = useRef(null);

  // Animation state
  const mapRef = useRef(null);
  const [anim, setAnim] = useState({ mapUri: null, proj: [], ready: false });
  const [frame, setFrame] = useState({ progress: 1, footer: 1 });
  const [videoUri, setVideoUri] = useState(null);

  const exercises = session.exercises || [];
  const accent = exercises.length && exercises.every(isCardio) ? Colors.cardio : Colors.primary;

  useEffect(() => {
    if (!session.hasTrack) return;
    getRunTrack(session.id).then(t => setTrack(t?.points?.length > 1 ? t : null));
  }, [session.id]);

  useEffect(() => { setCopied(false); }, [format]);

  const formats = track ? runFormats : baseFormats;
  const current = formats.find(f => f.id === format) || formats[0];
  const maxW = winW - 48;
  const maxH = winH * 0.5;

  // ── Images ──
  const capture = result => captureRef(designRef, { format: 'png', quality: 1, result });

  const share = async () => {
    try {
      if (current.kind === 'video') {
        await Sharing.shareAsync(videoUri, { mimeType: 'video/mp4', UTI: 'public.mpeg-4' });
        return;
      }
      setBusy('Preparing…');
      const uri = await capture('tmpfile');
      setBusy(null);
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch (err) {
      setBusy(null);
      console.error(err);
      showAlert('Could not share', 'Please try again, or use Save.');
    }
  };

  const copy = async () => {
    try {
      const base64 = await capture('base64');
      await Clipboard.setImageAsync(base64);
      setCopied(true);
    } catch (err) {
      console.error(err);
      showAlert('Could not copy', 'Use Save instead.');
    }
  };

  const save = async () => {
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) { showAlert('Photos access needed', 'Allow Motion to add to Photos in Settings.'); return; }
      const uri = current.kind === 'video' ? videoUri : await capture('tmpfile');
      await MediaLibrary.saveToLibraryAsync(uri);
      showAlert('Saved', current.kind === 'video' ? 'The video is in your Photos.' : 'The image is in your Photos.');
    } catch (err) {
      console.error(err);
      showAlert('Could not save', 'Please try again.');
    }
  };

  // ── Animation: map snapshot, then frames → MP4 ──
  const prepareMap = async () => {
    const map = mapRef.current;
    if (!map || !track || anim.mapUri) return;
    const coords = track.points.map(p => ({ latitude: p[0], longitude: p[1] }));
    map.fitToCoordinates(coords, { edgePadding: { top: 150, bottom: 230, left: 40, right: 40 }, animated: false });
    await wait(1800); // let tiles load
    try {
      const mapUri = await map.takeSnapshot({ format: 'png', quality: 1, result: 'file' });
      const sample = downsample(track.points, 250);
      const proj = [];
      for (const p of sample) {
        // eslint-disable-next-line no-await-in-loop
        const pt = await map.pointForCoordinate({ latitude: p[0], longitude: p[1] });
        proj.push({ x: pt.x, y: pt.y, seg: p[4] ?? 0 });
      }
      setAnim({ mapUri, proj, ready: true });
    } catch (err) {
      console.error('Map snapshot failed:', err);
      setAnim({ mapUri: null, proj: [], ready: true, failed: true });
    }
  };

  const createVideo = async () => {
    if (!MotionVideoWriter) { showAlert('Not available', 'Rebuild the app to enable video export.'); return; }
    setVideoUri(null);
    const total = Math.round(((DRAW_MS + HOLD_MS) / 1000) * FPS);
    let started = false;
    try {
      for (let i = 0; i < total; i++) {
        const ms = (i * 1000) / FPS;
        const p = Math.min(1, ms / DRAW_MS);
        setFrame({ progress: 1 - Math.pow(1 - p, 2), footer: Math.min(1, Math.max(0, (ms - DRAW_MS) / 500)) });
        setBusy(`Creating video… ${Math.round((i / total) * 100)}%`);
        // eslint-disable-next-line no-await-in-loop
        await nextPaint();
        // eslint-disable-next-line no-await-in-loop
        const uri = await captureRef(designRef, { format: 'jpg', quality: 0.92, result: 'tmpfile' });
        if (!started) {
          // eslint-disable-next-line no-await-in-loop
          const { w, h } = await getImageSize(uri);
          const dir = uri.slice(0, uri.lastIndexOf('/') + 1);
          // eslint-disable-next-line no-await-in-loop
          await MotionVideoWriter.start(`${dir}motion-run-${Date.now()}.mp4`, w, h, FPS);
          started = true;
        }
        // eslint-disable-next-line no-await-in-loop
        await MotionVideoWriter.appendFrame(uri);
        releaseCapture(uri);
      }
      const out = await MotionVideoWriter.finish();
      setVideoUri(out);
    } catch (err) {
      console.error(err);
      showAlert('Could not create video', String(err?.message || err));
    }
    setBusy(null);
    setFrame({ progress: 1, footer: 1 });
  };

  // ── Preview ──
  const renderDesign = () => {
    if (track === undefined) return <ActivityIndicator color={accent} />;
    if (current.id === 'story') {
      return (
        <Scaled w={STORY.w} h={STORY.h} maxW={maxW} maxH={maxH}>
          <StoryDesign ref={designRef} session={session} track={track} weightUnit={weightUnit} width={STORY.w} />
        </Scaled>
      );
    }
    if (current.id === 'sticker') {
      return (
        <Scaled w={300} h={260} maxW={maxW} maxH={maxH} transparent>
          <StickerDesign ref={designRef} session={session} weightUnit={weightUnit} width={300} />
        </Scaled>
      );
    }
    if (current.id === 'route') {
      return (
        <Scaled w={360} h={1300 / 3} maxW={maxW} maxH={maxH} transparent>
          <RouteDesign ref={designRef} session={session} track={track} weightUnit={weightUnit} width={360} />
        </Scaled>
      );
    }
    // animation
    return (
      <Scaled w={STORY.w} h={STORY.h} maxW={maxW} maxH={maxH}>
        {!anim.ready && (
          <MapView
            ref={mapRef}
            style={{ width: STORY.w, height: STORY.h }}
            userInterfaceStyle="dark"
            showsPointsOfInterest={false}
            showsBuildings={false}
            onMapReady={prepareMap}
          />
        )}
        {anim.ready && (
          <AnimationFrame
            ref={designRef}
            session={session}
            width={STORY.w}
            mapUri={anim.mapUri}
            proj={anim.proj}
            progress={frame.progress}
            footerOpacity={frame.footer}
            stats={runStats(session, weightUnit)}
          />
        )}
      </Scaled>
    );
  };

  const isVideo = current.kind === 'video';
  const canAct = isVideo ? !!videoUri && !busy : !busy && track !== undefined;

  return (
    <View style={s.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

      <View style={s.tabs}>
        {formats.map(f => (
          <TouchableOpacity key={f.id} style={[s.tab, current.id === f.id && { backgroundColor: accent }]} onPress={() => !busy && setFormat(f.id)}>
            <Text style={[s.tabText, { color: current.id === f.id ? Colors.onPrimary : Colors.gray }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderDesign()}

      <Text style={s.hint}>{busy || HINTS[current.id]}</Text>

      <View style={s.buttons}>
        {isVideo && !videoUri && (
          <TouchableOpacity style={[s.btn, { backgroundColor: accent }, (!anim.ready || busy) && s.disabled]} onPress={createVideo} disabled={!anim.ready || !!busy}>
            {busy ? <ActivityIndicator color={Colors.onPrimary} /> : <Ionicons name="film-outline" size={18} color={Colors.onPrimary} />}
            <Text style={[s.btnText, { color: Colors.onPrimary }]}>{anim.ready ? 'Create video' : 'Loading map…'}</Text>
          </TouchableOpacity>
        )}
        {(!isVideo || videoUri) && (
          <TouchableOpacity style={[s.btn, { backgroundColor: accent }, !canAct && s.disabled]} onPress={share} disabled={!canAct}>
            <Ionicons name="share-outline" size={18} color={Colors.onPrimary} />
            <Text style={[s.btnText, { color: Colors.onPrimary }]}>Share</Text>
          </TouchableOpacity>
        )}
        {!isVideo && (
          <TouchableOpacity style={[s.btn, s.secondaryBtn, !canAct && s.disabled]} onPress={copy} disabled={!canAct}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#FFFFFF" />
            <Text style={[s.btnText, { color: '#FFFFFF' }]}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        )}
        {(!isVideo || videoUri) && (
          <TouchableOpacity style={[s.btn, s.secondaryBtn, !canAct && s.disabled]} onPress={save} disabled={!canAct}>
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={[s.btnText, { color: '#FFFFFF' }]}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={onClose} style={s.closeBtn} disabled={!!busy}>
        <Text style={s.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  tabs: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 4, gap: 4, marginBottom: 16,
    backgroundColor: Colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9 },
  tabText: { fontSize: 14, fontWeight: '700' },
  preview: { borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.borderColor },
  transparentBackdrop: { backgroundColor: '#5A6470', borderStyle: 'dashed' },
  hint: { fontSize: 13, color: Colors.gray, marginTop: 14, textAlign: 'center' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12 },
  secondaryBtn: { backgroundColor: Colors.darkGray },
  disabled: { opacity: 0.4 },
  btnText: { fontSize: 15, fontWeight: '700' },
  closeBtn: { marginTop: 14, padding: 8 },
  closeText: { color: Colors.gray, fontSize: 15, fontWeight: '600' },
});

export default StoryShare;
