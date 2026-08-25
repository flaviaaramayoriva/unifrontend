import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'appSelectedTheme';

const BASE = {
  success: '#10B981', warning: '#F59E0B', accent: '#EF4444', info: '#3B82F6',
  surface: '#FFFFFF', background: '#F9FAFB',
  textPrimary: '#1F2937', textSecondary: '#6B7280', textTertiary: '#9CA3AF',
  border: '#E5E7EB', divider: '#D1D5DB', white: '#FFFFFF', black: '#000000',
};

export const THEMES = {
  naranja: { id: 'naranja', label: 'Naranja', primary: '#E95A0C', primaryLight: '#FFEDD5', secondary: '#4B5563', background: '#F9FAFB', surface: '#FFFFFF', ...BASE },
  azul:    { id: 'azul',    label: 'Azul',    primary: '#2563EB', primaryLight: '#DBEAFE', secondary: '#475569', background: '#F0F4FF', surface: '#FFFFFF', ...BASE },
  verde:   { id: 'verde',   label: 'Verde',   primary: '#059669', primaryLight: '#D1FAE5', secondary: '#4B5563', background: '#F0FDF4', surface: '#FFFFFF', ...BASE },
  morado:  { id: 'morado',  label: 'Morado',  primary: '#7C3AED', primaryLight: '#EDE9FE', secondary: '#4B5563', background: '#F5F3FF', surface: '#FFFFFF', ...BASE },
  rosa:    { id: 'rosa',    label: 'Rosa',    primary: '#DB2777', primaryLight: '#FCE7F3', secondary: '#4B5563', background: '#FDF2F8', surface: '#FFFFFF', ...BASE },
  oscuro:  {
    id: 'oscuro', label: 'Oscuro', primary: '#E95A0C', primaryLight: '#431407', secondary: '#9CA3AF',
    background: '#111827', surface: '#1F2937', textPrimary: '#F9FAFB', textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF', border: '#374151', divider: '#374151',
    success: '#10B981', warning: '#F59E0B', accent: '#EF4444', info: '#3B82F6', white: '#FFFFFF', black: '#000000',
  },
};

const saveThemeId = async (id) => {
  try {
    if (Platform.OS === 'web') localStorage.setItem(THEME_KEY, id);
    else await SecureStore.setItemAsync(THEME_KEY, id);
  } catch {}
};

const loadThemeId = async () => {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(THEME_KEY) || 'naranja';
    return (await SecureStore.getItemAsync(THEME_KEY)) || 'naranja';
  } catch { return 'naranja'; }
};

// ✅ Valor por defecto real — elimina el error 'never' y permite uso sin provider
const ThemeContext = createContext({
  COLORS:       THEMES.naranja,
  currentTheme: 'naranja',
  setTheme:     async (_id) => {},
  THEMES,
});

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('naranja');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadThemeId().then(id => {
      setCurrentTheme(THEMES[id] ? id : 'naranja');
      setReady(true);
    });
  }, []);

  const COLORS = useMemo(() => THEMES[currentTheme] || THEMES.naranja, [currentTheme]);

  const setTheme = async (id) => {
    if (!THEMES[id]) return;
    setCurrentTheme(id);
    await saveThemeId(id);
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ COLORS, currentTheme, setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ✅ Ya no lanza error si se usa fuera del provider — devuelve el default (naranja)
export const useTheme = () => useContext(ThemeContext);