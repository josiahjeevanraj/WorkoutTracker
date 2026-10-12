// Theme configurations for the Workout Tracking App
import { Colors } from './colors';

export const themes = {
  // Theme picker was removed; default mirrors the app palette in colors.js
  default: { name: 'Default', ...Colors },

  sunset: {
    name: 'Sunset Orange',
    text: '#FFB74D',        // Orange
    primary: '#D84315',     // Deep Orange
    background: '#1A1110',  // Dark Brown

    // Supporting colors
    white: '#FFFFFF',
    black: '#000000',
    gray: '#8D6E63',
    lightGray: '#EFEBE9',
    darkGray: '#4E342E',

    // Status colors
    success: '#66BB6A',
    error: '#E57373',
    warning: '#FFD54F',
    info: '#64B5F6',

    // Component specific
    cardBackground: '#3E2723',
    modalBackground: 'rgba(26, 17, 16, 0.9)',
    borderColor: '#5D4037',

    // Chart colors
    chartPrimary: '#D84315',
    chartSecondary: '#FFB74D',
    chartAccent: '#66BB6A',
  },

  forest: {
    name: 'Forest Green',
    text: '#81C784',        // Light Green
    primary: '#2E7D32',     // Green
    background: '#0D1F0D',  // Dark Green

    // Supporting colors
    white: '#FFFFFF',
    black: '#000000',
    gray: '#689F38',
    lightGray: '#E8F5E9',
    darkGray: '#1B5E20',

    // Status colors
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FFC107',
    info: '#03A9F4',

    // Component specific
    cardBackground: '#1B3A1B',
    modalBackground: 'rgba(13, 31, 13, 0.9)',
    borderColor: '#2E5F2E',

    // Chart colors
    chartPrimary: '#2E7D32',
    chartSecondary: '#81C784',
    chartAccent: '#4CAF50',
  },

  royal: {
    name: 'Royal Purple',
    text: '#BA68C8',        // Purple
    primary: '#6A1B9A',     // Deep Purple
    background: '#1A0E2E',  // Dark Purple

    // Supporting colors
    white: '#FFFFFF',
    black: '#000000',
    gray: '#7B68EE',
    lightGray: '#F3E5F5',
    darkGray: '#4A148C',

    // Status colors
    success: '#66BB6A',
    error: '#EF5350',
    warning: '#FFCA28',
    info: '#42A5F5',

    // Component specific
    cardBackground: '#2E1A47',
    modalBackground: 'rgba(26, 14, 46, 0.9)',
    borderColor: '#512DA8',

    // Chart colors
    chartPrimary: '#6A1B9A',
    chartSecondary: '#BA68C8',
    chartAccent: '#66BB6A',
  },

  midnight: {
    name: 'Midnight Red',
    text: '#FF6B6B',        // Red
    primary: '#C62828',     // Dark Red
    background: '#0F0A0A',  // Almost Black

    // Supporting colors
    white: '#FFFFFF',
    black: '#000000',
    gray: '#9E9E9E',
    lightGray: '#FAFAFA',
    darkGray: '#424242',

    // Status colors
    success: '#4CAF50',
    error: '#FF5252',
    warning: '#FFC107',
    info: '#448AFF',

    // Component specific
    cardBackground: '#1C1C1C',
    modalBackground: 'rgba(15, 10, 10, 0.9)',
    borderColor: '#424242',

    // Chart colors
    chartPrimary: '#C62828',
    chartSecondary: '#FF6B6B',
    chartAccent: '#4CAF50',
  }
};

export default themes;