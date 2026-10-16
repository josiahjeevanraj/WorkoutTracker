import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal, PanResponder, StyleSheet, useWindowDimensions, Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/colors';

const MAX_ZOOM = 4;

// Square crop with drag-to-position and a zoom slider. Works on web (where the
// image picker has no crop step) as well as native.
// image: { uri, width, height } in source pixels. onConfirm receives a crop rect
// in source pixels: { originX, originY, width, height }.
const AvatarCropModal = ({ image, onCancel, onConfirm }) => {
  const { width: windowWidth } = useWindowDimensions();
  const size = Math.min(windowWidth - 48, 320); // crop square, in screen px
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [trackWidth, setTrackWidth] = useState(1);

  // Refs so the pan handlers (created once) always see current values
  const state = useRef({ zoom: 1, offset: { x: 0, y: 0 }, start: { x: 0, y: 0 } });
  state.current.zoom = zoom;
  state.current.offset = offset;

  useEffect(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, [image?.uri]);

  // Scale at which the image's shorter side exactly fills the square
  const baseScale = image ? size / Math.min(image.width, image.height) : 1;

  const clampOffset = (o, z) => {
    if (!image) return o;
    const maxX = Math.max(0, (image.width * baseScale * z - size) / 2);
    const maxY = Math.max(0, (image.height * baseScale * z - size) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  };
  const clampRef = useRef(clampOffset);
  clampRef.current = clampOffset;

  const dragResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { state.current.start = state.current.offset; },
    onPanResponderMove: (_, g) => {
      const { start, zoom: z } = state.current;
      setOffset(clampRef.current({ x: start.x + g.dx, y: start.y + g.dy }, z));
    },
  }), []);

  const trackRef = useRef(null);
  const trackLeft = useRef(0);
  const setZoomFromPageX = pageX => {
    const t = Math.min(1, Math.max(0, (pageX - trackLeft.current) / trackWidth));
    const z = 1 + t * (MAX_ZOOM - 1);
    setZoom(z);
    setOffset(o => clampRef.current(o, z));
  };
  const zoomFromRef = useRef(setZoomFromPageX);
  zoomFromRef.current = setZoomFromPageX;
  const sliderResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => {
      trackRef.current?.measure((x, y, w, h, pageX) => { trackLeft.current = pageX; });
      zoomFromRef.current(e.nativeEvent.pageX);
    },
    onPanResponderMove: e => zoomFromRef.current(e.nativeEvent.pageX),
  }), []);

  const confirm = () => {
    const scale = baseScale * zoom;
    const dw = image.width * scale;
    const dh = image.height * scale;
    const side = Math.min(image.width, image.height, Math.round(size / scale));
    const originX = Math.round(((dw - size) / 2 - offset.x) / scale);
    const originY = Math.round(((dh - size) / 2 - offset.y) / scale);
    onConfirm({
      originX: Math.min(Math.max(0, originX), image.width - side),
      originY: Math.min(Math.max(0, originY), image.height - side),
      width: side,
      height: side,
    });
  };

  if (!image) return null;
  const dw = image.width * baseScale * zoom;
  const dh = image.height * baseScale * zoom;
  const thumbLeft = ((zoom - 1) / (MAX_ZOOM - 1)) * trackWidth;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <Text style={s.title}>Adjust photo</Text>
        <Text style={s.hint}>Drag to position · use the slider to zoom</Text>

        <View
          style={[s.cropArea, { width: size, height: size }, Platform.OS === 'web' && { touchAction: 'none', cursor: 'grab' }]}
          {...dragResponder.panHandlers}
        >
          <Image
            source={{ uri: image.uri }}
            style={{ position: 'absolute', width: dw, height: dh, left: (size - dw) / 2 + offset.x, top: (size - dh) / 2 + offset.y }}
            draggable={false}
          />
          {/* Circle guide: the avatar is shown round */}
          <View pointerEvents="none" style={[s.circleGuide, { width: size, height: size, borderRadius: size / 2 }]} />
        </View>

        <View style={[s.zoomRow, { width: size }]}>
          <Ionicons name="remove" size={18} color={Colors.gray} />
          <View
            ref={trackRef}
            style={[s.track, Platform.OS === 'web' && { touchAction: 'none' }]}
            onLayout={e => {
              setTrackWidth(e.nativeEvent.layout.width || 1);
              trackRef.current?.measure((x, y, w, h, pageX) => { trackLeft.current = pageX; });
            }}
            {...sliderResponder.panHandlers}
          >
            <View style={s.trackLine} />
            <View style={[s.trackFill, { width: thumbLeft }]} />
            <View style={[s.thumb, { left: thumbLeft - 10 }]} />
          </View>
          <Ionicons name="add" size={18} color={Colors.gray} />
        </View>

        <View style={[s.buttons, { width: size }]}>
          <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onCancel}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.useBtn]} onPress={confirm}>
            <Text style={s.useText}>Use photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  hint: { fontSize: 13, color: Colors.gray, marginTop: 6, marginBottom: 20 },
  cropArea: { overflow: 'hidden', backgroundColor: Colors.cardBackground, borderRadius: 4 },
  circleGuide: { position: 'absolute', left: 0, top: 0, borderWidth: 2, borderColor: Colors.primary },

  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  track: { flex: 1, height: 28, justifyContent: 'center' },
  trackLine: { height: 4, borderRadius: 2, backgroundColor: Colors.borderColor },
  trackFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: Colors.primary },
  thumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary },

  buttons: { flexDirection: 'row', gap: 12, marginTop: 28 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.darkGray },
  cancelText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  useBtn: { backgroundColor: Colors.primary },
  useText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
});

export default AvatarCropModal;
