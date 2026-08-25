import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Importamos nuestro contexto personalizado
import { AppThemeProvider, useTheme } from '../context/ThemeContext'; // Ajusta la ruta si es necesario

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (fontError) {
      console.error("ERROR AL CARGAR LAS FUENTES:", fontError);
    }
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Envuelvemos toda la app con nuestro Provider de Tema
  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  // Usamos nuestro hook en lugar del useColorScheme por defecto de Expo
  const { colorScheme, isLoading } = useTheme();

  if (isLoading) return null; // Mantiene el splash screen hasta saber el tema

  // Personalizamos los temas de React Navigation con tus colores
  const MyLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#E95A0C',       // Tu color primario
      background: '#F9FAFB',    // Fondo claro
      card: '#FFFFFF',          // Fondo de tarjetas/modales
      text: '#1F2937',          // Texto principal
      border: '#E5E7EB',
    },
  };

  const MyDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#F97316',       // Naranja un poco más brillante para modo oscuro
      background: '#111827',    // Fondo oscuro (gris muy oscuro)
      card: '#1F2937',          // Fondo de tarjetas en modo oscuro
      text: '#F9FAFB',          // Texto claro
      border: '#374151',
    },
  };

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? MyDarkTheme : MyLightTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Mi Inicio', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="CategoryDetail/[categoryId]" /> 
        {/* Agrega aquí tus otras rutas como admin/Settings, etc. */}
      </Stack>
    </NavThemeProvider>
  );
}