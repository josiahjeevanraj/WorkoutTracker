import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions, unstable_createElement,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/colors';
import { renderSessionStory, renderSessionSticker } from '../../utils/storyImage';
import { renderRouteSticker, renderRouteAnimation, canRecordVideo } from '../../utils/routeShare';
import { getRunTrack } from '../../services/RunTrackService';
import { isCardio } from '../../utils/cardio';
import showAlert from '../../utils/showAlert';

// Formats: images render as soon as their tab opens; the animation is recorded on request.
// kind: 'image' (PNG) | 'video'; shape: preview aspect
const baseFormats = [
  { id: 'story', label: 'Story', kind: 'image', shape: 'story', render: (s, o) => renderSessionStory(s, o) },
  { id: 'sticker', label: 'Sticker', kind: 'image', shape: 'card', render: (s, o) => renderSessionSticker(s, o) },
];
const runFormats = [
  { id: 'story', label: 'Story', kind: 'image', shape: 'story', render: (s, o) => renderSessionStory(s, o) },
  { id: 'route', label: 'Route', kind: 'image', shape: 'card', render: (s, o) => renderRouteSticker(s, o.track, o) },
  { id: 'animation', label: 'Animation', kind: 'video', shape: 'story', render: (s, o) => renderRouteAnimation(s, o.track, o) },
  { id: 'sticker', label: 'Sticker', kind: 'image', shape: 'card', render: (s, o) => renderSessionSticker(s, o) },
];

const HINTS = {
  story: 'Share, then choose Instagram → Story',
  sticker: 'Transparent PNG — copy and paste it onto your own photo in Instagram',
  route: 'Transparent route outline — paste it onto a photo from your run',
  animation: 'Your route drawing over the map — share it as a story video',
};

const canCopyImages = () =>
  typeof navigator !== 'undefined' && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';

// Share preview: story image, transparent stickers, and for outdoor runs the route
// outline and an animated video. Share (system sheet), Copy (images) and Save.
// Web only; drawn as an overlay inside its parent so it sits above the card's Modal.
const StoryShare = ({ session, weightUnit, onClose }) => {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [format, setFormat] = useState('story');
  const [track, setTrack] = useState(session.hasTrack ? undefined : null); // undefined = loading
  const [outputs, setOutputs] = useState({}); // format id -> { blob, url, type, ext } | 'error'
  const [videoStatus, setVidStatus] = useState(null); // progress text while recording
  const [copied, setCopied] = useState(false);
  const urlsRef = useRef([]); // object URLs to release on close
  const exercises = session.exercises || [];
  const accent = exercises.length && exercises.every(isCardio) ? Colors.cardio : Colors.primary;

  useEffect(() => {
    if (!session.hasTrack) return;
    getRunTrack(session.id).then(t => setTrack(t?.points?.length > 1 ? t : null));
  }, [session.id]);

  const formats = track ? runFormats : baseFormats;
  const current = formats.find(f => f.id === format) || formats[0];

  const produce = f => {
    setOutputs(prev => ({ ...prev, [f.id]: 'pending' }));
    f.render(session, { weightUnit, track, onStatus: setVidStatus })
      .then(result => {
        const blob = result instanceof Blob ? result : result.blob;
        const type = result instanceof Blob ? 'image/png' : result.mimeType;
        const ext = result instanceof Blob ? 'png' : result.ext;
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        setOutputs(prev => ({ ...prev, [f.id]: { blob, url, type, ext } }));
      })
      .catch(err => { console.error(err); setOutputs(prev => ({ ...prev, [f.id]: 'error' })); })
      .finally(() => setVidStatus(null));
  };

  // Images render when their tab is first shown (once we know whether there's a track)
  useEffect(() => {
    if (track === undefined || outputs[current.id] || current.kind !== 'image') return;
    produce(current);
  }, [current.id, track]);

  useEffect(() => () => urlsRef.current.forEach(url => URL.revokeObjectURL(url)), []);
  useEffect(() => { setCopied(false); }, [format]);

  const out = outputs[current.id];
  const ready = out && typeof out === 'object' ? out : null;
  const error = out === 'error';
  const pending = out === 'pending' || track === undefined;
  const fileName = `${(session.name || 'workout').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${current.id}.${ready?.ext || 'png'}`;
  const file = ready && new File([ready.blob], fileName, { type: ready.type });
  const canShare = !!file && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] });
  const canCopy = canCopyImages() && current.kind === 'image';

  const share = async () => {
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err?.name !== 'AbortError') showAlert('Could not share', 'Try Save instead, then add it to your story.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': ready.blob })]);
      setCopied(true);
    } catch (err) {
      console.error(err);
      showAlert('Could not copy', 'Your browser blocked copying images. Use Save instead.');
    }
  };

  const save = () => {
    const a = document.createElement('a');
    a.href = ready.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const storyH = Math.min(windowHeight * 0.52, 580);
  const previewW = current.shape === 'story' ? storyH * 9 / 16 : Math.min(windowWidth - 48, 360);
  const previewH = current.shape === 'story' ? storyH : previewW * (current.id === 'route' ? 1.2 : 0.85);
  const transparent = current.id === 'sticker' || current.id === 'route';

  const renderPreview = () => {
    if (ready && current.kind === 'video') {
      return unstable_createElement('video', {
        src: ready.url, autoPlay: true, loop: true, muted: true, playsInline: true,
        style: { width: '100%', height: '100%', objectFit: 'contain' },
      });
    }
    if (ready) return <Image source={{ uri: ready.url }} style={StyleSheet.absoluteFill} resizeMode="contain" />;
    if (error) return <Text style={s.errorText}>Couldn't create this.</Text>;
    if (current.kind === 'video' && !pending) {
      return canRecordVideo() ? (
        <TouchableOpacity style={[s.makeBtn, { backgroundColor: accent }]} onPress={() => produce(current)}>
          <Ionicons name="film-outline" size={18} color={Colors.onPrimary} />
          <Text style={[s.btnText, { color: Colors.onPrimary }]}>Create animation</Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.errorText}>This browser can't record video.</Text>
      );
    }
    return (
      <View style={{ alignItems: 'center', gap: 10 }}>
        <ActivityIndicator color={accent} />
        {videoStatus && <Text style={s.statusText}>{videoStatus}</Text>}
      </View>
    );
  };

  return (
    <View style={s.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

      <View style={s.tabs}>
        {formats.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[s.tab, current.id === f.id && { backgroundColor: accent }]}
            onPress={() => setFormat(f.id)}
          >
            <Text style={[s.tabText, { color: current.id === f.id ? Colors.onPrimary : Colors.gray }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.preview, { height: previewH, width: previewW }, transparent && s.stickerBackdrop]}>
        {renderPreview()}
      </View>

      <Text style={s.hint}>{HINTS[current.id]}</Text>

      <View style={s.buttons}>
        {canShare && (
          <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} onPress={share}>
            <Ionicons name="share-outline" size={18} color={Colors.onPrimary} />
            <Text style={[s.btnText, { color: Colors.onPrimary }]}>Share</Text>
          </TouchableOpacity>
        )}
        {canCopy && (
          <TouchableOpacity style={[s.btn, s.secondaryBtn, !ready && s.disabled]} onPress={copy} disabled={!ready}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#FFFFFF" />
            <Text style={[s.btnText, { color: '#FFFFFF' }]}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.btn, s.secondaryBtn, !ready && s.disabled]} onPress={save} disabled={!ready}>
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          <Text style={[s.btnText, { color: '#FFFFFF' }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onClose} style={s.closeBtn}>
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
  preview: {
    borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.cardBackground,
    borderWidth: 1, borderColor: Colors.borderColor, alignItems: 'center', justifyContent: 'center',
  },
  // A lighter backdrop so transparency is visible in the preview
  stickerBackdrop: { backgroundColor: '#5A6470', borderStyle: 'dashed' },
  errorText: { color: Colors.gray, fontSize: 14, textAlign: 'center', paddingHorizontal: 16 },
  statusText: { color: Colors.gray, fontSize: 13 },
  makeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
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
