import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { renderSessionStory, renderSessionSticker } from '../../utils/storyImage';
import { isCardio } from '../../utils/cardio';
import showAlert from '../../utils/showAlert';

const FORMATS = [
  { id: 'story', label: 'Story', render: renderSessionStory, suffix: 'story' },
  { id: 'sticker', label: 'Sticker', render: renderSessionSticker, suffix: 'sticker' },
];

const canCopyImages = () =>
  typeof navigator !== 'undefined' && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';

// Share preview: a full 9:16 story image, or a transparent sticker PNG to paste
// over your own photo. Share (system sheet), Copy (clipboard) and Save image.
// Web only; drawn as an overlay inside its parent so it sits above the card's Modal.
const StoryShare = ({ session, weightUnit, onClose }) => {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [format, setFormat] = useState('story');
  const [images, setImages] = useState({}); // format id -> { blob, url } | 'error'
  const [copied, setCopied] = useState(false);
  const urlsRef = useRef([]); // object URLs to release on close
  const exercises = session.exercises || [];
  const accent = exercises.length && exercises.every(isCardio) ? Colors.cardio : Colors.primary;

  // Render each format the first time it's shown
  useEffect(() => {
    if (images[format]) return;
    const { render } = FORMATS.find(f => f.id === format);
    render(session, { weightUnit })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        setImages(prev => ({ ...prev, [format]: { blob, url } }));
      })
      .catch(err => { console.error(err); setImages(prev => ({ ...prev, [format]: 'error' })); });
  }, [format]);

  useEffect(() => () => urlsRef.current.forEach(url => URL.revokeObjectURL(url)), []);

  useEffect(() => { setCopied(false); }, [format]);

  const image = images[format] && images[format] !== 'error' ? images[format] : null;
  const error = images[format] === 'error';
  const { suffix } = FORMATS.find(f => f.id === format);
  const fileName = `${(session.name || 'workout').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${suffix}.png`;
  const file = image && new File([image.blob], fileName, { type: 'image/png' });
  const canShare = !!file && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] });
  const canCopy = canCopyImages();

  const share = async () => {
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err?.name !== 'AbortError') showAlert('Could not share', 'Try Save image instead, then add it to your story.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image.blob })]);
      setCopied(true);
    } catch (err) {
      console.error(err);
      showAlert('Could not copy', 'Your browser blocked copying images. Use Save image instead.');
    }
  };

  const save = () => {
    const a = document.createElement('a');
    a.href = image.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const storyH = Math.min(windowHeight * 0.56, 600);
  const previewW = format === 'story' ? storyH * 9 / 16 : Math.min(windowWidth - 48, 360);
  const previewH = format === 'story' ? storyH : previewW * 0.85;

  return (
    <View style={s.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

      <View style={s.tabs}>
        {FORMATS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[s.tab, format === f.id && { backgroundColor: accent }]}
            onPress={() => setFormat(f.id)}
          >
            <Text style={[s.tabText, { color: format === f.id ? Colors.onPrimary : Colors.gray }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.preview, { height: previewH, width: previewW }, format === 'sticker' && s.stickerBackdrop]}>
        {image
          ? <Image source={{ uri: image.url }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          : error
            ? <Text style={s.errorText}>Couldn't create the image.</Text>
            : <ActivityIndicator color={accent} />}
      </View>

      <Text style={s.hint}>
        {format === 'story'
          ? 'Share, then choose Instagram → Story'
          : 'Transparent PNG — copy and paste it onto your own photo in Instagram'}
      </Text>

      <View style={s.buttons}>
        {canShare && (
          <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} onPress={share}>
            <Ionicons name="share-outline" size={18} color={Colors.onPrimary} />
            <Text style={[s.btnText, { color: Colors.onPrimary }]}>Share</Text>
          </TouchableOpacity>
        )}
        {canCopy && (
          <TouchableOpacity style={[s.btn, s.secondaryBtn, !image && s.disabled]} onPress={copy} disabled={!image}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#FFFFFF" />
            <Text style={[s.btnText, { color: '#FFFFFF' }]}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.btn, s.secondaryBtn, !image && s.disabled]} onPress={save} disabled={!image}>
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
    flexDirection: 'row', padding: 4, gap: 4, marginBottom: 16,
    backgroundColor: Colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 22, borderRadius: 9 },
  tabText: { fontSize: 14, fontWeight: '700' },
  preview: {
    borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.cardBackground,
    borderWidth: 1, borderColor: Colors.borderColor, alignItems: 'center', justifyContent: 'center',
  },
  // A lighter backdrop so the sticker's transparency is visible in the preview
  stickerBackdrop: { backgroundColor: '#5A6470', borderStyle: 'dashed' },
  errorText: { color: Colors.gray, fontSize: 14 },
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
