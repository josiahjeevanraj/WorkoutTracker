import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '../services/supabaseClient';
import { UNIT_OPTIONS, weightUnit } from '../utils/units';
import WorkoutPlansModal from '../components/workout/WorkoutPlansModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import StorageService from '../services/StorageService';

const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const ProfileScreen = () => {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const [showPRModal, setShowPRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({});
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState(null); // { text, error }
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      StorageService.getWorkoutHistory().then(setHistory);
      StorageService.getUserProfile().then(p => setProfile(p || {}));
    }, [])
  );

  // Re-read before writing so fields saved elsewhere (height, goals) aren't clobbered
  const updateProfile = async updates => {
    const latest = (await StorageService.getUserProfile()) || {};
    const next = { ...latest, ...updates };
    const ok = await StorageService.saveUserProfile(next);
    if (ok) setProfile(next);
    return ok;
  };

  const openEditModal = () => {
    setEditName(profile.name || '');
    setEditEmail(user?.email || '');
    setEditMessage(null);
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    setEditMessage(null);
    const name = editName.trim();
    const newEmail = editEmail.trim().toLowerCase();

    if (name !== (profile.name || '')) {
      const ok = await updateProfile({ name });
      if (!ok) {
        setEditMessage({ text: 'Could not save your name. Try again.', error: true });
        setSaving(false);
        return;
      }
    }

    if (newEmail && newEmail !== user?.email) {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      setSaving(false);
      if (error) {
        setEditMessage({ text: error.message, error: true });
      } else {
        setEditMessage({ text: `Check your inbox to confirm ${newEmail}. Your email changes once confirmed.`, error: false });
      }
      return;
    }

    setSaving(false);
    setShowEditModal(false);
  };

  const pickAvatar = async () => {
    setAvatarError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1,
    });
    if (result.canceled) return;

    setUploadingAvatar(true);
    try {
      const rendered = await ImageManipulator.manipulate(result.assets[0].uri)
        .resize({ width: 256, height: 256 })
        .renderAsync();
      const { base64 } = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const path = `${user.id}/avatar.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-bust: the path stays the same on every upload
      const ok = await updateProfile({ avatarUrl: `${data.publicUrl}?t=${Date.now()}` });
      if (!ok) throw new Error('Could not save profile');
    } catch (e) {
      console.error('Avatar upload failed:', e);
      setAvatarError('Upload failed. Try again.');
    }
    setUploadingAvatar(false);
  };

  // Best-ever set per exercise (same "max weight across all sets" definition as ProgressScreen's PB)
  const prList = useMemo(() => {
    const best = {};
    history.forEach(session => {
      session.exercises?.forEach(ex => {
        ex.sets?.forEach(set => {
          const weight = parseFloat(set.weight) || 0;
          if (weight <= 0) return;
          if (!best[ex.name] || weight > best[ex.name].weight) {
            best[ex.name] = { name: ex.name, weight, reps: set.reps, unit: set.unit || 'kg', completedAt: session.completedAt };
          }
        });
      });
    });
    return Object.values(best).sort((a, b) => a.name.localeCompare(b.name));
  }, [history]);

  const email = user?.email || '';
  const displayName = profile.name || email;
  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();
  const units = UNIT_OPTIONS.find(u => u.id === profile.units) || UNIT_OPTIONS[0];
  const pendingEmail = user?.new_email;

  const primarySettings = [
    { icon: 'person-outline',  color: colors.primary, title: 'Edit Profile', sub: 'Name, email', onPress: openEditModal },
    { icon: 'clipboard-outline', color: colors.primary, title: 'Workout Plans', sub: 'Templates to prefill your sessions', onPress: () => setShowPlansModal(true) },
    { icon: 'body-outline',    color: colors.primary, title: 'Units', sub: `${units.label} (${units.weight})`, onPress: () => setShowUnitsModal(true) },
  ];

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: '#FFFFFF' }]}>Profile</Text>
      </View>

      {/* Hero card */}
      <View style={[s.heroCard, { borderColor: 'rgba(255,230,0,0.2)' }]}>
        <View style={s.heroTop}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar} activeOpacity={0.8}>
            <View style={s.heroAvatar}>
              {profile.avatarUrl
                ? <Image source={{ uri: profile.avatarUrl }} style={s.heroAvatarImg} />
                : <Text style={s.heroAvatarText}>{initials}</Text>}
              {uploadingAvatar && (
                <View style={s.heroAvatarOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={[s.avatarBadge, { borderColor: colors.background }]}>
              <Ionicons name="camera" size={12} color={colors.onPrimary} />
            </View>
          </TouchableOpacity>
          <View style={s.heroInfo}>
            <Text style={s.heroName} numberOfLines={1}>{displayName}</Text>
            {profile.name ? <Text style={[s.heroEmail, { color: colors.gray }]} numberOfLines={1}>{email}</Text> : null}
            {pendingEmail ? <Text style={s.heroPending} numberOfLines={2}>Pending: {pendingEmail}</Text> : null}
            {avatarError ? <Text style={s.heroError}>{avatarError}</Text> : null}
          </View>
        </View>
        <View style={[s.heroDivider, { borderColor: 'rgba(255,230,0,0.15)' }]} />
        <TouchableOpacity style={s.heroStats} onPress={() => setShowPRModal(true)} activeOpacity={0.7}>
          <View style={s.heroStatItem}>
            <Text style={s.heroStatValue}>{prList.length}</Text>
            <Text style={[s.heroStatLabel, { color: colors.gray }]}>PRS</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.gray} />
        </TouchableOpacity>
      </View>

      {/* Primary settings */}
      <View style={[s.settingsGroup, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
        {primarySettings.map((item, idx) => (
          <TouchableOpacity
            key={item.title}
            style={[s.settingRow, idx < primarySettings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderColor }]}
            onPress={item.onPress || undefined}
            activeOpacity={item.onPress ? 0.7 : 1}
          >
            <View style={[s.iconChip, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={s.settingText}>
              <Text style={[s.settingTitle, { color: '#FFFFFF' }]}>{item.title}</Text>
              <Text style={[s.settingSub, { color: colors.gray }]}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign out — ghost style */}
      <TouchableOpacity style={[s.signOutBtn, { borderColor: colors.borderColor }]} onPress={signOut}>
        <Text style={[s.signOutText, { color: colors.gray }]}>Sign out</Text>
      </TouchableOpacity>

      {/* Edit profile modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView style={[s.modalOverlay, { backgroundColor: colors.modalBackground }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.modalSheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: '#FFFFFF' }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.gray} />
              </TouchableOpacity>
            </View>
            <Text style={[s.inputLabel, { color: colors.gray }]}>DISPLAY NAME</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.borderColor }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.gray}
              autoCapitalize="words"
            />
            <Text style={[s.inputLabel, { color: colors.gray }]}>EMAIL</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.borderColor }]}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.gray}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            {editMessage ? (
              <Text style={[s.editMessage, { color: editMessage.error ? colors.error : colors.success }]}>{editMessage.text}</Text>
            ) : null}
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={saveEdit}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[s.saveBtnText, { color: colors.onPrimary }]}>Save</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <WorkoutPlansModal
        visible={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        defaultUnit={weightUnit(profile.units)}
      />

      {/* Units modal */}
      <Modal visible={showUnitsModal} transparent animationType="slide" onRequestClose={() => setShowUnitsModal(false)}>
        <View style={[s.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[s.modalSheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: '#FFFFFF' }]}>Units</Text>
              <TouchableOpacity onPress={() => setShowUnitsModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.gray} />
              </TouchableOpacity>
            </View>
            {UNIT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  s.unitOption,
                  { backgroundColor: colors.background, borderColor: colors.borderColor },
                  units.id === option.id && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={async () => { await updateProfile({ units: option.id }); setShowUnitsModal(false); }}
              >
                <Text style={[s.unitName, { color: '#FFFFFF' }]}>{option.label} ({option.weight})</Text>
                {units.id === option.id && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Personal Records modal */}
      <Modal visible={showPRModal} transparent animationType="slide" onRequestClose={() => setShowPRModal(false)}>
        <View style={[s.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[s.modalSheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: '#FFFFFF' }]}>Personal Records</Text>
              <TouchableOpacity onPress={() => setShowPRModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.gray} />
              </TouchableOpacity>
            </View>
            {prList.length === 0 ? (
              <Text style={[s.prEmptyText, { color: colors.gray }]}>No personal records yet — log a workout to get started.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {prList.map((pr, idx) => (
                  <View key={pr.name} style={[s.prRow, idx < prList.length - 1 && { borderBottomWidth: 1, borderColor: colors.borderColor }]}>
                    <View style={s.prInfo}>
                      <Text style={[s.prName, { color: '#FFFFFF' }]}>{pr.name}</Text>
                      <Text style={[s.prDate, { color: colors.gray }]}>{fmtDate(pr.completedAt)}</Text>
                    </View>
                    <Text style={[s.prValue, { color: colors.text }]}>{pr.weight} {pr.unit} × {pr.reps}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },

  // Hero card
  heroCard: {
    marginHorizontal: 18, marginTop: 16, marginBottom: 14,
    padding: 18, borderRadius: 20,
    backgroundColor: 'rgba(255,230,0,0.08)',
    borderWidth: 1,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroAvatar: {
    width: 64, height: 64, borderRadius: 999,
    backgroundColor: '#FFE600',
    justifyContent: 'center', alignItems: 'center',
  },
  heroAvatarText: { color: '#0E0E0E', fontSize: 22, fontWeight: '800' },
  heroAvatarImg: { width: 64, height: 64, borderRadius: 999 },
  heroAvatarOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 24, height: 24, borderRadius: 999, borderWidth: 2,
    backgroundColor: '#FFE600', justifyContent: 'center', alignItems: 'center',
  },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  heroEmail: { fontSize: 13, marginTop: 2 },
  heroPending: { fontSize: 12, color: '#FBBF24', marginTop: 4 },
  heroError: { fontSize: 12, color: '#F87171', marginTop: 4 },
  heroDivider: { borderTopWidth: 1, marginVertical: 14 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroStatItem: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, letterSpacing: 0.6 },

  // Settings groups
  settingsGroup: {
    marginHorizontal: 18, marginBottom: 14,
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconChip: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '600' },
  settingSub: { fontSize: 11, marginTop: 1 },

  // Sign out
  signOutBtn: {
    marginHorizontal: 18, padding: 14, borderRadius: 14,
    borderWidth: 1, alignItems: 'center',
  },
  signOutText: { fontSize: 14, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '72%', borderWidth: 1,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },

  // Edit profile modal
  inputLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFFFFF', fontSize: 15, marginBottom: 16,
  },
  editMessage: { fontSize: 13, marginBottom: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Units modal
  unitOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1,
  },
  unitName: { fontSize: 16, fontWeight: '500' },

  // Personal Records modal
  prEmptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  prRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
  },
  prInfo: { flex: 1 },
  prName: { fontSize: 15, fontWeight: '600' },
  prDate: { fontSize: 12, marginTop: 2 },
  prValue: { fontSize: 15, fontWeight: '700' },
});

export default ProfileScreen;
