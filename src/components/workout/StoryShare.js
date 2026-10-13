import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { renderSessionStory } from '../../utils/storyImage';
import { isCardio } from '../../utils/cardio';
import showAlert from '../../utils/showAlert';

// Story preview with Share (system share sheet → Instagram Story) and Save image.
// Web only; drawn as an overlay inside its parent so it sits above the card's Modal.
const StoryShare = ({ session, weightUnit, onClose }) => {
  const { height: windowHeight } = useWindowDimensions();
  const [image, setImage] = useState(null); // { blob, url }
  const [error, setError] = useState(false);
  const exercises = session.exercises || [];
  const accent = exercises.length && exercises.every(isCardio) ? Colors.cardio : Colors.primary;

  useEffect(() => {
    let url;
    renderSessionStory(session, { weightUnit })
      .then(blob => { url = URL.createObjectURL(blob); setImage({ blob, url }); })
      .catch(err => { console.error(err); setError(true); });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [session, weightUnit]);

  const fileName = `${(session.name || 'workout').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-story.png`;
  const file = image && new File([image.blob], fileName, { type: 'image/png' });
  const canShare = !!file && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] });

  const share = async () => {
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err?.name !== 'AbortError') showAlert('Could not share', 'Try Save image instead, then add it to your story.');
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

  const previewH = Math.min(windowHeight * 0.62, 640);

  return (
    <View style={s.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      <Text style={s.title}>Share to your story</Text>
      <View style={[s.preview, { height: previewH, width: previewH * 9 / 16 }]}>
        {image
          ? <Image source={{ uri: image.url }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          : error
            ? <Text style={s.errorText}>Couldn't create the image.</Text>
            : <ActivityIndicator color={accent} />}
      </View>
      {canShare && (
        <Text style={s.hint}>Tap Share, then choose Instagram → Story</Text>
      )}
      <View style={s.buttons}>
        {canShare && (
          <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} onPress={share}>
            <Ionicons name="share-outline" size={18} color={Colors.onPrimary} />
            <Text style={[s.btnText, { color: Colors.onPrimary }]}>Share</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.btn, canShare ? s.secondaryBtn : { backgroundColor: accent }, !image && { opacity: 0.4 }]}
          onPress={save}
          disabled={!image}
        >
          <Ionicons name="download-outline" size={18} color={canShare ? '#FFFFFF' : Colors.onPrimary} />
          <Text style={[s.btnText, { color: canShare ? '#FFFFFF' : Colors.onPrimary }]}>Save image</Text>
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
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  preview: {
    borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.cardBackground,
    borderWidth: 1, borderColor: Colors.borderColor, alignItems: 'center', justifyContent: 'center',
  },
  errorText: { color: Colors.gray, fontSize: 14 },
  hint: { fontSize: 13, color: Colors.gray, marginTop: 14 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 12 },
  secondaryBtn: { backgroundColor: Colors.darkGray },
  btnText: { fontSize: 15, fontWeight: '700' },
  closeBtn: { marginTop: 14, padding: 8 },
  closeText: { color: Colors.gray, fontSize: 15, fontWeight: '600' },
});

export default StoryShare;
