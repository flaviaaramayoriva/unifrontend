// app/academico/eventos-aprobados.js
import React, { useState, useEffect } from 'react';
import { FlatList, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AdminHeader from '../../../components/admin/AdminHeader';

const API_BASE_URL = Platform.OS === 'android' || Platform.OS === 'ios' 
  ? 'http://192.168.0.167:3001' 
  : process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

// Usa el token de académico (NO el de admin)
const TOKEN_KEY = 'authToken'; 

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    return sessionStorage.getItem(TOKEN_KEY);
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

  if (loading) return <View style={{ flex: 1, backgroundColor: '#F6F7F9', justifyContent: 'center', alignItems: 'center' }}><Text>Cargando...</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F7F9' }}>
      <AdminHeader
        title="Mis Eventos Aprobados"
        subtitle="Eventos aprobados de tu facultad"
        eyebrow="Académico"
      />
      <FlatList
        data={events}
        keyExtractor={(item) => item.idevento.toString()}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleEventPress(item.idevento)}>
            <Text style={styles.cardTitle}>{item.nombreevento}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E6E9EF' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
});

export default EventosAprobadosAcademico;