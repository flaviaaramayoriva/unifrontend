// app/academico/eventos-aprobados.js
import React, { useState, useEffect } from 'react';
import { FlatList, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.OS === 'android' || Platform.OS === 'ios' 
  ? 'http://192.168.0.167:3001' 
  : 'http://localhost:3001';

// Usa el token de académico (NO el de admin)
const TOKEN_KEY = 'authToken'; 

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  } else {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
};

const EventosAprobadosAcademico = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = await getTokenAsync();
        if (!token) {
          Alert.alert('Error', 'Sesión no válida');
          router.replace('/login'); // o tu ruta de login de académico
          return;
        }

        // Esta ruta DEBE devolver SOLO los eventos del académico autenticado
        const response = await axios.get(`${API_BASE_URL}/eventos/mios/aprobados`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setEvents(response.data);
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', 'No se pudieron cargar tus eventos');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleEventPress = (eventId) => {
    router.push({
      pathname: '/academico/EventDetailScreen',
      params: { eventId }
    });
  };

  if (loading) return <Text>Cargando...</Text>;

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.idevento.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleEventPress(item.idevento)}>
          <Text>{item.nombreevento}</Text>
        </TouchableOpacity>
      )}
    />
  );
};

export default EventosAprobadosAcademico;