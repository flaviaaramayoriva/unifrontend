import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  StatusBar, Platform, TouchableOpacity,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FFEDD5', textPrimary: '#1F2937',
  textSecondary: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB', surface: '#FFFFFF',
  background: '#F9FAFB', white: '#FFFFFF', accent: '#EF4444', success: '#10B981',
};

const API_BASE_URL = 'https://unibackend-production.up.railway.app';
const TOKEN_KEY = 'studentAuthToken';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const getToken = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
};

const InscripcionCard = ({ evento, isNext, isPast }) => {
  const fecha = evento.fechaevento ? new Date(evento.fechaevento) : null;

  return (
    <View style={[
      styles.card,
      isNext && styles.cardNext,
      isPast && styles.cardPast,
    ]}>
      <View style={styles.dateBox}>
        <Text style={[styles.dateMonth, isNext && styles.dateMonthNext]}>
          {fecha ? MESES[fecha.getMonth()] : '–'}
        </Text>
        <Text style={[styles.dateDay, isPast && styles.dateDayPast]}>
          {fecha ? fecha.getDate() : '–'}
        </Text>
      </View>

      <View style={styles.cardBody}>
        {isNext && (
          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>Próximo</Text>
          </View>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>{evento.nombreevento}</Text>
        {evento.lugarevento && (
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.cardText}>{evento.lugarevento}</Text>
          </View>
        )}
      </View>

      {isPast ? (
        <Text style={styles.pastLabel}>Finalizado</Text>
      ) : (
        <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
      )}
    </View>
  );
};

const InscripcionScreen = () => {
  const router = useRouter();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMisInscripciones = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setError('Sesión expirada. Inicia sesión nuevamente.');
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/estudiantes/mis-inscripciones`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const raw = Array.isArray(res.data.eventos) ? res.data.eventos : [];
      const mapped = raw.map(ev => ({ ...ev, id: ev.idevento }));

      // Ordenar por fecha ascendente
      mapped.sort((a, b) => new Date(a.fechaevento) - new Date(b.fechaevento));

      setEventos(mapped);
    } catch (err) {
      console.error('Error al cargar mis inscripciones:', err);
      if (err.response?.status === 404) {
        setError('No se encontró el endpoint de inscripciones.');
      } else {
        setError('No se pudieron cargar tus eventos. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchMisInscripciones();
  }, [fetchMisInscripciones]));

  // Determinar cuál es el próximo evento (primera fecha >= hoy)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nextEventId = eventos.find(ev => ev.fechaevento && new Date(ev.fechaevento) >= hoy)?.id;

  const proximosCount = eventos.filter(ev => ev.fechaevento && new Date(ev.fechaevento) >= hoy).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Stack.Screen options={{ title: 'Mis Inscripciones', headerShown: true }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {!loading && !error && eventos.length > 0 && (
          <Text style={styles.subtitle}>
            {eventos.length} evento{eventos.length !== 1 ? 's' : ''} · {proximosCount} próximo{proximosCount !== 1 ? 's' : ''}
          </Text>
        )}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.accent} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMisInscripciones}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : eventos.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="calendar-clear-outline" size={44} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Aún no estás inscrito en ningún evento</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {eventos.map(ev => (
              <InscripcionCard
                key={ev.id}
                evento={ev}
                isNext={ev.id === nextEventId}
                isPast={ev.fechaevento && new Date(ev.fechaevento) < hoy}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 14, fontWeight: '500' },
  centerBox: { alignItems: 'center', paddingVertical: 60 },
  errorText: { marginTop: 10, color: COLORS.textSecondary, textAlign: 'center' },
  emptyText: { marginTop: 12, color: COLORS.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryBtnText: { color: COLORS.white, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardNext: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  cardPast: {
    opacity: 0.6,
  },

  dateBox: {
    width: 48,
    alignItems: 'center',
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  dateMonthNext: {
    color: COLORS.primary,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 26,
  },
  dateDayPast: {
    color: COLORS.textSecondary,
  },

  cardBody: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingLeft: 12,
    gap: 4,
  },
  nextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 2,
  },
  nextBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardText: { fontSize: 12, color: COLORS.textSecondary },

  pastLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});

export default InscripcionScreen;