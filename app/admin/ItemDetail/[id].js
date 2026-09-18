import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import CustomAlert from '../../../components/CustomAlert';
import { useFocusEffect } from '@react-navigation/native';

// Configuración de API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al acceder a sessionStorage en web:", e);
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error al obtener token de SecureStore en nativo:", e);
      return null;
    }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token de sessionStorage en web:", e);
    }
  } else {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token de SecureStore en nativo:", e);
    }
  }
};

const COLORS = {
  primary: '#C44200',
  primaryLight: '#FFF0E6',
  secondary: '#0F172A',
  accent: '#EF4444',
  success: '#047857',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E6E9EF',
  shadow: 'rgba(0,0,0,0.05)',
  white: '#FFFFFF',
  black: '#000000',
};

const STATUS_META = {
  aprobado: { color: COLORS.success, soft: COLORS.success + '18', label: 'Aprobado', icon: 'checkmark-circle-outline' },
  pendiente: { color: COLORS.warning, soft: COLORS.warning + '18', label: 'Pendiente', icon: 'time-outline' },
  rechazado: { color: COLORS.accent, soft: COLORS.accent + '18', label: 'Rechazado', icon: 'close-circle-outline' },
  cancelado: { color: COLORS.info, soft: COLORS.info + '18', label: 'Cancelado', icon: 'close-circle-outline' },
  completado: { color: COLORS.info, soft: COLORS.info + '18', label: 'Completado', icon: 'checkmark-done-outline' },
};

const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

const formatTime = (timeString) => {
  if (!timeString) return 'No especificada';
  try {
    if (timeString.includes(':')) {
      return timeString;
    }
    return timeString;
  } catch (error) {
    return timeString;
  }
};

const Section = ({ title, subtitle, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    {children}
  </View>
);

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const ItemDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showApproveAlert, setShowApproveAlert] = useState(false);
  const [showRejectAlert, setShowRejectAlert] = useState(false);

  const fetchEventDetails = useCallback(async () => {
    let processedEventId = Array.isArray(id) ? id[0] : id;
    if (typeof processedEventId === 'string' && processedEventId.startsWith('event-')) {
      processedEventId = processedEventId.replace('event-', '');
    }
    const numericId = Number(processedEventId);
    if (isNaN(numericId) || !processedEventId) {
      setError('ID de evento inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        await deleteTokenAsync();
        router.replace('/LoginAdmin');
        return;
      }
      const [eventResponse, userResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/eventos/${numericId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchUserDetails(token)
      ]);

      const eventData = eventResponse.data;
      console.log('Respuesta completa del backend:', eventData);

      if (!eventData || typeof eventData !== 'object' || Object.keys(eventData).length === 0) {
        throw new Error('Datos de evento vacíos o inválidos del servidor.');
      }

      const transformedEvent = {
        id: eventData.idevento || null,
        title: eventData.nombreevento || 'Sin título',
        date: formatDate(eventData.fechaevento),
        time: formatTime(eventData.horaevento),
        location: eventData.lugarevento || 'Ubicación no especificada',
        attendees: eventData.participantes_esperados || 'No especificado',
        status: (eventData.estado || 'pendiente').toLowerCase(),
        imageUrl: eventData.imagenUrl || null,
        idfase: eventData.idfase || 1,
        fases: eventData.fases || [],

        Clasificacion: eventData.Clasificacion || null,
        subcategoria: eventData.subcategoria || null,
        tiposEvento: eventData.TiposDeEvento || [],

        objetivos: eventData.Objetivos || [],
        objetivosPDI: Array.isArray(eventData.ObjetivosPDI)
          ? eventData.ObjetivosPDI
          : typeof eventData.objetivos_pdi === 'string'
            ? JSON.parse(eventData.objetivos_pdi || '[]')
            : [],

        segmentos: eventData.segmentos || [],
        argumentacion: eventData.argumentacion || 'Sin argumentación',

        resultados: (eventData.Resultados && eventData.Resultados.length > 0)
          ? eventData.Resultados[0]
          : {
              participacion_esperada: null,
              satisfaccion_esperada: null,
              otros_resultados: null,
              satisfaccion_real: null
            },
        recursos: eventData.Recursos || [],
        comite: eventData.Comite || [],
        presupuesto: eventData.Presupuesto || null,
        egresos: eventData.Egresos || [],
        ingresos: eventData.Ingresos || [],
        tags: eventData.tags || [],

        creador: eventData.creador ? {
          nombre: `${eventData.creador.nombre} ${eventData.creador.apellidopat} ${eventData.creador.apellidomat}`,
          email: eventData.creador.email,
          role: eventData.creador.role
        } : null
      };

      if (!transformedEvent.id) {
        throw new Error('El evento no tiene un ID válido.');
      }

      setEvent(transformedEvent);
    } catch (err) {
      let errorMessage = `Error al cargar evento: ${err.message}`;
      if (err.response?.status === 401 || err.response?.status === 403) {
        Alert.alert('Acceso Denegado', 'No tienes permiso para ver este recurso o tu sesión ha expirado.');
        await deleteTokenAsync();
        router.replace('/LoginAdmin');
        errorMessage = 'Sesión expirada. Redirigiendo...';
      } else if (err.response?.status === 404) {
        errorMessage = 'Evento no encontrado. Verifica si el ID es correcto (ej: 12345).';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchUserDetails = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      return response.data;
    } catch (err) {
      console.error('Error al cargar datos del usuario', err);
      return null;
    }
  };

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    } else {
      setError('No se proporcionó un ID de evento.');
      setLoading(false);
    }
  }, [fetchEventDetails, id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando detalles del evento...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color={COLORS.accent} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEventDetails} activeOpacity={0.85}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event || Object.keys(event).length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="information-circle-outline" size={50} color={COLORS.textTertiary} />
        <Text style={styles.errorText}>No se encontraron datos del evento.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusMeta = STATUS_META[event.status] || STATUS_META.pendiente;
  const initials = (event.creador?.nombre || 'U').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.heroIconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Detalle del Evento</Text>
          <TouchableOpacity onPress={fetchEventDetails} hitSlop={8} style={styles.heroIconBtn} activeOpacity={0.7}>
            <Ionicons name="refresh" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroSubtitle}>UFT Eventos · Universidad Privada Franz Tamayo</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {/* Imagen destacada */}
        {event.imageUrl ? (
          <View style={styles.imageCard}>
            <Image source={{ uri: event.imageUrl }} style={styles.eventImage} resizeMode="cover" />
          </View>
        ) : (
          <View style={[styles.imageCard, styles.imagePlaceholder]}>
            <Ionicons name="calendar-outline" size={46} color={COLORS.primary} />
          </View>
        )}

        {/* Título + estado */}
        <View style={styles.card}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.soft }]}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
            <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        {/* Información del evento */}
        <Section title="Información del Evento" subtitle="Datos generales del evento">
          <View style={styles.card}>
            <InfoRow icon="calendar-outline" label="Fecha" value={event.date} />
            <InfoRow icon="time-outline" label="Hora" value={event.time} />
            <InfoRow icon="location-outline" label="Ubicación" value={event.location} />
            <InfoRow icon="people-outline" label="Asistentes" value={String(event.attendees)} />
          </View>
        </Section>

        {/* Clasificación Estratégica */}
        {event.Clasificacion && (
          <Section title="Clasificación Estratégica" subtitle="Categorización del evento">
            <View style={styles.card}>
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <Ionicons name="layers-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.chipText}>{event.Clasificacion.nombreClasificacion}</Text>
                </View>
                {event.Clasificacion.nombresubcategoria ? (
                  <View style={styles.chip}>
                    <Ionicons name="pricetag-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.chipText}>{event.Clasificacion.nombresubcategoria}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Section>
        )}

        {/* Tipos de Evento */}
        {event.tiposEvento && event.tiposEvento.length > 0 && (
          <Section title="Tipos de Evento" subtitle="Modalidades del evento">
            <View style={styles.card}>
              <View style={styles.chipRow}>
                {event.tiposEvento.map((tipo, index) => (
                  <View key={String(tipo.idtipoevento ?? index)} style={styles.chip}>
                    <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.chipText}>
                      {tipo.nombretipo || `Tipo ${tipo.idtipoevento ?? ''}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Section>
        )}

        {/* Propuesto por */}
        {event.creador && (
          <Section title="Propuesto por" subtitle="Creador del evento">
            <View style={styles.card}>
              <View style={styles.creatorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorName}>{event.creador.nombre}</Text>
                  <Text style={styles.creatorRole}>{event.creador.role}</Text>
                  {event.creador.email ? (
                    <Text style={styles.creatorEmail}>{event.creador.email}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </Section>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

ItemDetailScreen.options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
    padding: 30,
  },
  loadingText: {
    marginTop: 6,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  backButton: {
    marginTop: 4,
    backgroundColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Header
  hero: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 40) + 14,
    paddingBottom: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },

  // Image
  imageCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    height: 200,
    overflow: 'hidden',
    backgroundColor: COLORS.primaryLight,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  eventImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionAccent: {
    width: 4,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 19,
  },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary + '22',
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Creator
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  creatorName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  creatorRole: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 3,
    textTransform: 'capitalize',
  },
  creatorEmail: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default ItemDetailScreen;