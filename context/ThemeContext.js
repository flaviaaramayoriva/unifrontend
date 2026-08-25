// context/ThemeContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPalette, DEFAULT_ACCENT_COLOR } from '../utils/colorUtils';

const ThemeContext = createContext();

export const AppThemeProvider = ({ children }) => {
  const systemColorScheme = useSystemColorScheme();
  // 'light', 'dark', o 'system'
  const [theme, setThemeState] = useState('system');
  // color de acento personalizado por usuario (hex)
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT_COLOR);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Cargar preferencias guardadas al iniciar la app (cache local, luego el perfil del
  //    backend las sobreescribe cuando el usuario inicia sesión, ver loadUserData en Settings)
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        const savedAccent = await AsyncStorage.getItem('appAccentColor');
        if (savedTheme) setThemeState(savedTheme);
        if (savedAccent) setAccentColorState(savedAccent);
      } catch (e) {
        console.error("Error al cargar el tema:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  // 2. Cambiar y cachear el modo claro/oscuro
  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('appTheme', newTheme);
    } catch (e) {
      console.error("Error al guardar el tema:", e);
    }
  };

  // 3. Cambiar y cachear el color de acento
  const setAccentColor = async (newColor) => {
    setAccentColorState(newColor);
    try {
      await AsyncStorage.setItem('appAccentColor', newColor);
    } catch (e) {
      console.error("Error al guardar el color de acento:", e);
    }
  };

  // 4. Esquema de color real (light o dark)
  const colorScheme = theme === 'system' ? (systemColorScheme || 'light') : theme;

  // 5. Paleta completa derivada del color de acento + el modo
  const colors = buildPalette(accentColor, colorScheme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorScheme,
        setTheme,
        accentColor,
        setAccentColor,
        colors,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un AppThemeProvider');
  }
  return context;
};