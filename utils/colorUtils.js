// utils/colorUtils.js

// Convierte un color hex a RGB
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 233, g: 90, b: 12 }; // fallback al naranja original
};

// Aclara un color hex un porcentaje (0-100)
export const lightenColor = (hex, percent) => {
  const { r, g, b } = hexToRgb(hex);
  const newR = Math.round(r + (255 - r) * (percent / 100));
  const newG = Math.round(g + (255 - g) * (percent / 100));
  const newB = Math.round(b + (255 - b) * (percent / 100));
  return `rgb(${newR}, ${newG}, ${newB})`;
};

// Oscurece un color hex un porcentaje (0-100)
export const darkenColor = (hex, percent) => {
  const { r, g, b } = hexToRgb(hex);
  const newR = Math.round(r * (1 - percent / 100));
  const newG = Math.round(g * (1 - percent / 100));
  const newB = Math.round(b * (1 - percent / 100));
  return `rgb(${newR}, ${newG}, ${newB})`;
};

// true si el color es "claro" (para elegir color de texto encima, ej. en botones)
export const isLightColor = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

// Colores predefinidos que el usuario puede elegir en Ajustes
export const ACCENT_PRESETS = [
  { name: 'Naranja', value: '#E95A0C' },
  { name: 'Azul', value: '#2563EB' },
  { name: 'Verde', value: '#059669' },
  { name: 'Morado', value: '#7C3AED' },
  { name: 'Rosa', value: '#DB2777' },
  { name: 'Rojo', value: '#DC2626' },
  { name: 'Turquesa', value: '#0891B2' },
  { name: 'Ámbar', value: '#D97706' },
];

export const DEFAULT_ACCENT_COLOR = '#E95A0C';

// Genera la paleta completa del sistema a partir del color de acento y el modo (light/dark)
export const buildPalette = (accentColor = DEFAULT_ACCENT_COLOR, colorScheme = 'light') => {
  const isDark = colorScheme === 'dark';

  return {
    primary: accentColor,
    primaryLight: isDark ? darkenColor(accentColor, 70) : lightenColor(accentColor, 85),
    primaryDark: darkenColor(accentColor, 20),
    onPrimary: isLightColor(accentColor) ? '#1F2937' : '#FFFFFF',

    secondary: isDark ? '#9CA3AF' : '#4B5563',
    accent: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',

    background: isDark ? '#111827' : '#F9FAFB',
    surface: isDark ? '#1F2937' : '#FFFFFF',

    textPrimary: isDark ? '#F9FAFB' : '#1F2937',
    textSecondary: isDark ? '#D1D5DB' : '#6B7280',
    textTertiary: '#9CA3AF',

    border: isDark ? '#374151' : '#E5E7EB',
    divider: isDark ? '#374151' : '#D1D5DB',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',

    white: '#FFFFFF',
    black: '#000000',
    error: '#DC2626',
  };
};