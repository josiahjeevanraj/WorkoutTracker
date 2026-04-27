import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const ProfileScreen = () => {
  const { colors, currentTheme, changeTheme, availableThemes } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const primarySettings = [
    { icon: 'person-outline',  color: '#58D8DB', title: 'Edit Profile',    sub: 'Name, email, avatar',  onPress: null },
    { icon: 'fitness-outline', color: '#6366F1', title: 'Goals & Targets', sub: '5 workouts/week',       onPress: null },
    { icon: 'leaf-outline',    color: '#34D399', title: 'Notifications',   sub: 'Daily reminders on',   onPress: null },
    { icon: 'body-outline',    color: '#FBBF24', title: 'Units',           sub: 'Metric (kg, km)',       onPress: null },
    { icon: 'color-palette-outline', color: '#58D8DB', title: 'Theme',
      sub: availableThemes.find(t => t.id === currentTheme)?.name || 'Ocean Blue',
      onPress: () => setShowThemeModal(true) },
  ];

  const secondaryLinks = ['Privacy', 'Terms of Service', 'Help & Support'];

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: '#FFFFFF' }]}>Profile</Text>
      </View>

      {/* Hero card */}
      <View style={[s.heroCard, { borderColor: 'rgba(88,216,219,0.2)' }]}>
        <View style={s.heroTop}>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>JD</Text>
          </View>
          <View style={s.heroInfo}>
            <Text style={s.heroName}>John Doe</Text>
            <Text style={[s.heroSince, { color: colors.gray }]}>Member since Jan 2024</Text>
          </View>
        </View>
        <View style={[s.heroDivider, { borderColor: 'rgba(88,216,219,0.15)' }]} />
        <View style={s.heroStats}>
          {[
            { l: 'Workouts', v: '234' },
            { l: 'Streak',   v: '12' },
            { l: 'PRs',      v: '18' },
          ].map(stat => (
            <View key={stat.l} style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{stat.v}</Text>
              <Text style={[s.heroStatLabel, { color: colors.gray }]}>{stat.l.toUpperCase()}</Text>
            </View>
          ))}
        </View>
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

      {/* Secondary links */}
      <View style={[s.settingsGroup, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
        {secondaryLinks.map((title, idx) => (
          <TouchableOpacity
            key={title}
            style={[s.simpleRow, idx < secondaryLinks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderColor }]}
          >
            <Text style={[s.simpleRowText, { color: '#FFFFFF' }]}>{title}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign out — ghost style */}
      <TouchableOpacity style={[s.signOutBtn, { borderColor: colors.borderColor }]}>
        <Text style={[s.signOutText, { color: colors.gray }]}>Sign out</Text>
      </TouchableOpacity>

      {/* Theme selector modal */}
      <Modal visible={showThemeModal} transparent animationType="slide" onRequestClose={() => setShowThemeModal(false)}>
        <View style={[s.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[s.modalSheet, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: '#FFFFFF' }]}>Select Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableThemes.map(theme => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    s.themeOption,
                    { backgroundColor: colors.background, borderColor: colors.borderColor },
                    currentTheme === theme.id && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => { changeTheme(theme.id); setShowThemeModal(false); }}
                >
                  <View style={s.themeOptionRow}>
                    <Text style={[s.themeName, { color: '#FFFFFF' }]}>{theme.name}</Text>
                    {currentTheme === theme.id && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                  </View>
                  <View style={s.colorDots}>
                    {[theme.preview.primary, theme.preview.text, theme.preview.background, theme.preview.cardBackground].map((c, i) => (
                      <View key={i} style={[s.colorDot, { backgroundColor: c }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    backgroundColor: 'rgba(88,216,219,0.08)',
    borderWidth: 1,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroAvatar: {
    width: 64, height: 64, borderRadius: 999,
    backgroundColor: '#283b89',
    justifyContent: 'center', alignItems: 'center',
  },
  heroAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  heroSince: { fontSize: 12, marginTop: 2 },
  heroDivider: { borderTopWidth: 1, marginVertical: 14 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around' },
  heroStatItem: { alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, letterSpacing: 0.6, marginTop: 2 },

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

  simpleRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  simpleRowText: { flex: 1, fontSize: 14 },

  // Sign out
  signOutBtn: {
    marginHorizontal: 18, padding: 14, borderRadius: 14,
    borderWidth: 1, alignItems: 'center',
  },
  signOutText: { fontSize: 14, fontWeight: '600' },

  // Theme modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '72%', borderWidth: 1,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  themeOption: { padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  themeOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  themeName: { fontSize: 18, fontWeight: '500' },
  colorDots: { flexDirection: 'row', gap: 8 },
  colorDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});

export default ProfileScreen;
