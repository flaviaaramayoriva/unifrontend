// frontend/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreenExpo from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import axios from 'axios';

// Importa tus pantallas
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/EstudianteEvents';
import BackendTestScreen from './screens/LoginScreen';
import EventoChatScreen from './app/Screen';

SplashScreenExpo.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const API_BASE_URL =  'https://unifrontend-production-150c.up.railway.app';
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [userToken, setUserToken] = useState(null);

  // Lógica de prueba de backend (opcional, puedes moverla a BackendTestScreen)
  const [message, setMessage] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWelcomeMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}`);
      setMessage(response.data.message);
    } catch (err) {
      setError('Error al cargar el mensaje de bienvenida.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/data`);
      setData(response.data);
    } catch (err) {
      setError('Error al cargar los datos. Asegúrate de que data exista.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  // Fin de la lógica de prueba de backend

  useEffect(() => {
    async function prepare() {
      try {
        // Simulamos un tiempo de carga
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreenExpo.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userToken == null ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <Stack.Screen name="Home" component={HomeScreen} />
          )}
          
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
} // <-- Esta llave cierra la función App()

const styles = StyleSheet.create({
  // Tus estilos aquí
});