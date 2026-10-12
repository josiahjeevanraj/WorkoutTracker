import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../constants/themes';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [colors, setColors] = useState(themes.default);
  // Theme picker was removed, so a previously saved theme is no longer loaded
  const isLoading = false;

  const changeTheme = async (themeName) => {
    if (themes[themeName]) {
      try {
        setCurrentTheme(themeName);
        setColors(themes[themeName]);
        await AsyncStorage.setItem('selectedTheme', themeName);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  const value = {
    currentTheme,
    colors,
    changeTheme,
    availableThemes: Object.keys(themes).map(key => ({
      id: key,
      name: themes[key].name,
      preview: {
        primary: themes[key].primary,
        text: themes[key].text,
        background: themes[key].background,
        cardBackground: themes[key].cardBackground,
      }
    })),
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;