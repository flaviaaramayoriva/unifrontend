import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  StatusBar, Platform, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FFEDD5',
  primaryDark: '#C94A0A',
  secondary: '#4B5563',
  accent: '#EF4444',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
};

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'studentAuthToken';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const getToken = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
};

const InscripcionCard = ({ evento, isNext, isPast, onPress }) => {
  const fecha = evento.fechaevento ? new Date(evento.fechaevento) : null;
  const diaSemana = fecha ? DIAS_SEMANA[fecha.getDay()] : '';
  const hora = evento.horaevento || 'Hora no especificada';

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        isNext && styles.cardNext,
        isPast && styles.cardPast,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Fecha */}
      <View style={[styles.dateBox, isNext && styles.dateBoxNext]}>
        <Text style={[styles.dateDayName, isNext && styles.dateDayNameNext]}>
          {diaSemana}
        </Text>
        <Text style={[styles.dateDay, isNext && styles.dateDayNext]}>
          {fecha ? fecha.getDate() : '–'}
        </Text>
        <Text style={[styles.dateMonth, isNext && styles.dateMonthNext]}>
          {fecha ? MESES[fecha.getMonth()] : '–'}
        </Text>
      </View>

      {/* Separador vertical */}
      <View style={[styles.cardDivider, isNext && styles.cardDividerNext]} />

      {/* Contenido principal */}
      <View style={styles.cardContent}>
        {isNext && !isPast && (
          <View style={styles.nextBadge}>
            <Ionicons name="time" size={10} color={COLORS.white} />
            <Text style={styles.nextBadgeText}>Próximo</Text>
          </View>
        )}
        
        <Text style={[styles.cardTitle, isPast && styles.cardTitlePast]} numberOfLines={2}>
          {evento.nombreevento}
        </Text>
        
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={isNext ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.cardText, isNext && styles.cardTextNext]} numberOfLines={1}>
              {evento.lugarevento || 'Ubicación no especificada'}
            </Text>
          </View>
          
          {hora && hora !== 'Hora no especificada' && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={isNext ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.cardText, isNext && styles.cardTextNext]}>
                {hora}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Icono de estado */}
      <View style={styles.statusIcon}>
        {isPast ? (
          <View style={styles.pastBadge}>
            <Text style={styles.pastBadgeText}>Finalizado</Text>
          </View>
        ) : (
          <View style={[styles.checkIcon, isNext && styles.checkIconNext]}>
            <Ionicons name="checkmark-circle" size={24} color={isNext ? COLORS.primary : COLORS.success} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons name="calendar-outline" size={64} color={COLORS.primary} />
    </View>
    <Text style={styles.emptyTitle}>Sin inscripciones</Text>
    <Text style={styles.emptySubtitle}>
      Aún no estás inscrito en ningún evento.{'\n'}
      Explora los eventos disponibles y únete.
    </Text>
    <TouchableOpacity style={styles.emptyButton}>
      <Text style={styles.emptyButtonText}>Ver eventos disponibles</Text>
    </TouchableOpacity>
  </View>
);

const ErrorState = ({ error, onRetry }) => (
  <View style={styles.errorContainer}>
    <View style={styles.errorIcon}>
      <Ionicons name="alert-circle-outline" size={64} color={COLORS.accent} />
    </View>
    <Text style={styles.errorTitle}>Oops, algo salió mal</Text>
    <Text style={styles.errorSubtitle}>{error}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
      <Text style={styles.retryButtonText}>Reintentar</Text>
    </TouchableOpacity>
  </View>
);

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.loadingText}>Cargando tus inscripciones...</Text>
  </View>
);

const InscripcionScreen = () => {
  const router = useRouter();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchMisInscripciones = useCallback(async () => {
    setError(null);
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
      } else if (err.code === 'ECONNABORTED') {
        setError('La conexión tardó demasiado. Verifica tu internet.');
      } else {
        setError('No se pudieron cargar tus eventos. Verifica tu conexión.');
      }
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMisInscripciones();
    setRefreshing(false);
  }, [fetchMisInscripciones]);

  useFocusEffect(useCallback(() => {
    fetchMisInscripciones();
  }, [fetchMisInscripciones]));

  // Determinar próximo evento y contar
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nextEventId = eventos.find(ev => ev.fechaevento && new Date(ev.fechaevento) >= hoy)?.id;
  const proximosCount = eventos.filter(ev => ev.fechaevento && new Date(ev.fechaevento) >= hoy).length;
  const pasadosCount = eventos.length - proximosCount;

  const handleCardPress = (evento) => {
    router.push(`/estudiante/eventos/${evento.id}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <Stack.Screen 
        options={{ 
          title: 'Mis Inscripciones', 
          headerShown: true,
          headerBackTitle: 'Volver',
        }} 
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header con estadísticas */}
        {!loading && !error && eventos.length > 0 && (
          <View style={styles.statsHeader}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{eventos.length}</Text>
              <Text style={styles.statLabel}>
                {eventos.length === 1 ? 'evento' : 'eventos'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>
                {proximosCount}
              </Text>
              <Text style={styles.statLabel}>
                {proximosCount === 1 ? 'próximo' : 'próximos'}
              </Text>
            </View>
            {pasadosCount > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: COLORS.textMuted }]}>
                    {pasadosCount}
                  </Text>
                  <Text style={styles.statLabel}>
                    {pasadosCount === 1 ? 'finalizado' : 'finalizados'}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Contenido */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchMisInscripciones} />
        ) : eventos.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.cardsContainer}>
            {eventos.map((ev, index) => (
              <InscripcionCard
                key={`${ev.id}-${index}`}
                evento={ev}
                isNext={ev.id === nextEventId}
                isPast={ev.fechaevento && new Date(ev.fechaevento) < hoy}
                onPress={() => handleCardPress(ev)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  scrollContent: { 
    padding: 20,
    paddingBottom: 40,
  },

  // Stats Header
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.divider,
    marginHorizontal: 12,
  },

  // Cards Container
  cardsContainer: {
    gap: 14,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardNext: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardPast: {
    opacity: 0.65,
  },

  dateBox: {
    width: 56,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateBoxNext: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  dateDayName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateDayNameNext: {
    color: COLORS.primary,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 32,
  },
  dateDayNext: {
    color: COLORS.primary,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  dateMonthNext: {
    color: COLORS.primary,
  },

  cardDivider: {
    width: 1,
    height: '80%',
    backgroundColor: COLORS.divider,
  },
  cardDividerNext: {
    backgroundColor: COLORS.primary + '30',
  },

  cardContent: {
    flex: 1,
    gap: 6,
  },
  nextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    marginBottom: 2,
  },
  nextBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  cardTitlePast: {
    textDecorationLine: 'line-through',
  },
  cardMeta: {
    gap: 4,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardTextNext: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  statusIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    opacity: 0.6,
  },
  checkIconNext: {
    opacity: 1,
  },
  pastBadge: {
    backgroundColor: COLORS.textMuted + '20',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pastBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default InscripcionScreen;