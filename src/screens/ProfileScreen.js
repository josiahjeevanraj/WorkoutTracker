import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const ProfileScreen = () => {
  const { colors, currentTheme, changeTheme, availableThemes } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 50,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    profileCard: {
      backgroundColor: colors.cardBackground,
      margin: 20,
      padding: 20,
      borderRadius: 15,
      alignItems: 'center',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    avatarText: {
      color: colors.white,
      fontSize: 32,
      fontWeight: 'bold',
    },
    name: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 5,
    },
    email: {
      fontSize: 16,
      color: colors.gray,
    },
    section: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: 15,
      padding: 15,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
      paddingHorizontal: 5,
    },
    settingItem: {
      paddingVertical: 12,
      paddingHorizontal: 5,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    settingItemContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    settingText: {
      fontSize: 16,
      color: colors.text,
    },
    themePreview: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    currentThemeText: {
      fontSize: 14,
      marginRight: 5,
    },
    logoutButton: {
      backgroundColor: colors.error,
      marginHorizontal: 20,
      marginBottom: 40,
      padding: 15,
      borderRadius: 25,
      alignItems: 'center',
    },
    logoutText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: 20,
      maxHeight: '70%',
      borderWidth: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
    },
    themeOption: {
      padding: 15,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
    },
    themeInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    themeName: {
      fontSize: 18,
      fontWeight: '500',
    },
    colorPreview: {
      flexDirection: 'row',
      gap: 8,
    },
    colorDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>JD</Text>
        </View>
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.email}>john.doe@example.com</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Units (Metric/Imperial)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => setShowThemeModal(true)}>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingText}>Theme</Text>
            <View style={styles.themePreview}>
              <Text style={[styles.currentThemeText, { color: colors.gray }]}>
                {availableThemes.find(t => t.id === currentTheme)?.name || 'Default'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Privacy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Terms of Service</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>Version 1.0.0</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Theme Selector Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {availableThemes.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeOption,
                    { backgroundColor: colors.background, borderColor: colors.borderColor },
                    currentTheme === theme.id && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    changeTheme(theme.id);
                    setShowThemeModal(false);
                  }}
                >
                  <View style={styles.themeInfo}>
                    <Text style={[styles.themeName, { color: colors.text }]}>{theme.name}</Text>
                    {currentTheme === theme.id && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    )}
                  </View>

                  <View style={styles.colorPreview}>
                    <View style={[styles.colorDot, { backgroundColor: theme.preview.primary }]} />
                    <View style={[styles.colorDot, { backgroundColor: theme.preview.text }]} />
                    <View style={[styles.colorDot, { backgroundColor: theme.preview.background }]} />
                    <View style={[styles.colorDot, { backgroundColor: theme.preview.cardBackground }]} />
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

export default ProfileScreen;