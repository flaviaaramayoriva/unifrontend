import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  StatusBar, Platform, TouchableOpacity
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FFEDD5', textPrimary: '#1F2937',
  textSecondary: '#6B7280', border: '#E5E7EB', surface: '#FFFFFF',
  background: '#F9FAFB', white: '#FFFFFF', accent: '#EF4444', success: '#10B981',
};

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';';
const TOKEN_KEY = 'studentAuthToken';

const getToken = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
};

const EventoCard = ({ evento }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
      <Text style={styles.cardTitle} numberOfLines={2}>{evento.nombreevento || evento.title}</Text>
    </View>
    <View style={styles.cardRow}>
      <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
      <Text style={styles.cardText}>
        {evento.fechaevento || evento.date 
          ? new Date(evento.fechaevento || evento.date).toLocaleDateString() 
          : 'Fecha por definir'}
      </Text>
    </View>
    {(evento.lugarevento || evento.location) && (
      <View style={styles.cardRow}>
        <Ionicons name="location-outline" size={14} color={COLORS.primary} />
        <Text style={styles.cardText}>{evento.lugarevento || evento.location}</Text>
      </View>
    )}
    <View style={styles.cardRow}>
      <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
      <Text style={[styles.cardText, { color: COLORS.success, fontWeight: '600' }]}>
        Inscrito correctamente
      </Text>
    </View>
  </View>
);

export default function MisEventosScreen() {
  const router = useRouter();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMisEventos = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setError('Sesión expirada. Inicia sesión nuevamente.');
        return;
      }

      // ✅ Usamos el mismo endpoint que ya sabemos que funciona
      const res = await axios.get(`${API_BASE_URL}/estudiantes/mis-inscripciones`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const raw = Array.isArray(res.data.eventos) ? res.data.eventos : [];
      const mapped = raw.map(ev => ({ ...ev, id: ev.idevento }));
      
      setEventos(mapped);
    } catch (err) {
      console.error('Error al cargar mis eventos:', err);
      if (err.response?.status === 404) {
        setError('No se encontró el endpoint de inscripciones.');
      } else {
        setError('No se pudieron cargar tus eventos. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Se recarga cada vez que el usuario vuelve a esta pantalla
  useFocusEffect(useCallback(() => { 
    fetchMisEventos(); 
  }, [fetchMisEventos]));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Stack.Screen options={{ title: 'Mis Eventos', headerShown: true }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando tus eventos...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.accent} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMisEventos}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : eventos.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="calendar-clear-outline" size={44} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>Aún no estás inscrito en ningún evento</Text>
            <Text style={styles.emptySubtitle}>Explora los eventos de tu facultad e inscríbete</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.replace('/estudiante')}>
              <Text style={styles.exploreBtnText}>Explorar Eventos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {eventos.map(ev => (
              <EventoCard key={ev.id} evento={ev} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  errorText: { marginTop: 10, color: COLORS.textSecondary, textAlign: 'center', fontSize: 14 },
  emptyTitle: { marginTop: 12, color: COLORS.textPrimary, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  emptySubtitle: { marginTop: 6, color: COLORS.textSecondary, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  retryBtn: { marginTop: 16, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  exploreBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  exploreBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardText: { fontSize: 13, color: COLORS.textSecondary },
});