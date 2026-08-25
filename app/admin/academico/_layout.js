// app/academico/_layout.js
import React, { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'authToken'; // Asegúrate de usar el token correcto (no el de admin)

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  } else {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
};

const getUserRole = async () => {
  const token = await getTokenAsync();
  if (!token) return null;

  // Decodifica el token JWT para obtener el rol (o haz una llamada a /auth/me)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.rol; // o como se llame el campo en tu JWT
  } catch (e) {
    return null;
  }
};

export default function AcademicoLayout() {
  const [role, setRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const userRole = await getUserRole();
      setRole(userRole);
      setLoading(false);
    };
    checkRole();
  }, []);

  if (loading) {
    return null; // o un loading
  }

  // Si no es académico, redirige
  if (role !== 'academico') {
    return <Redirect href="/LoginAcademico" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Mis Eventos" }} />
      <Stack.Screen name="EventDetailScreen" options={{ title: "Detalles" }} />
    </Stack>
  );
}