// app/estudiante/eventos/[id].jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
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
  grayLight: '#F3F4F6',
  grayText: '#6B7280',
  darkText: '#111827',
  border: '#E5E7EB',
  white: '#FFFFFF',
  black: '#000000',
};

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'studentAuthToken';

const getTokenAsync = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

const deleteTokenAsync = async () => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (e) {}
};

const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatTime = (timeString) => {
  if (!timeString) return 'No especificada';
  return timeString;
};

const resolveStatus = (rawStatus, rawDateString) => {
  const s = (rawStatus || '').toLowerCase();
  if (['cancelado', 'rechazado'].includes(s)) return 'cancelado';

  if (rawDateString) {
    const fechaEvento = new Date(rawDateString);
    if (!isNaN(fechaEvento.getTime())) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fechaEvento.setHours(0, 0, 0, 0);
      if (fechaEvento < hoy) return 'completado';
    }
  }

  if (['aprobado', 'publicado', 'confirmado'].includes(s)) return 'confirmado';
  if (['programado'].includes(s)) return 'programado';
  return s || 'pendiente';
};

const EventDetailStudentScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEventData = async () => {
      if (!id) {
        setError('ID de evento no válido');
        setLoading(false);
        return;
      }

      try {
        const token = await getTokenAsync();
        if (!token) throw new Error('Token no disponible');

        const eventRes = await axios.get(`${API_BASE_URL}/eventos/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const eventData = eventRes.data;
        const rawDateString = eventData.fecha_inicio || eventData.fechaevento || null;
        const processedEvent = {
          id: eventData.idevento || eventData.id,
          title: eventData.nombre || eventData.nombreevento || 'Evento sin título',
          description: eventData.descripcion || 'Sin descripción disponible',
          date: formatDate(rawDateString),
          time: formatTime(eventData.hora_inicio || eventData.horaevento),
          location: eventData.ubicacion || eventData.lugarevento || 'Ubicación no especificada',
          organizer: eventData.organizador || eventData.responsable || 'Organizador no especificado',
          capacity: eventData.capacidad_maxima || eventData.capacidad || null,
          attendees: eventData.inscritos || eventData.participantes || 0,
          category: eventData.tipo_evento || eventData.categoria || 'Evento',
          status: resolveStatus(eventData.estado, rawDateString),
          modalidad: eventData.modalidad || 'presencial',
          objetivos: Array.isArray(eventData.objetivos) 
            ? eventData.objetivos 
            : (typeof eventData.objetivos === 'string' ? [eventData.objetivos] : []),
          resultados: Array.isArray(eventData.resultados) 
            ? eventData.resultados 
            : (typeof eventData.resultados === 'string' ? [eventData.resultados] : []),
        };

        setEvent(processedEvent);

      } catch (err) {
        console.error('Error:', err);
        setError(err.response?.data?.message || 'Error al cargar el evento');
        if (err.response?.status === 401) {
          await deleteTokenAsync();
          router.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [id, router]);

  const openMap = () => {
    if (event?.location && event.location !== 'Ubicación no especificada') {
      const url = Platform.OS === 'ios'
        ? `maps://?q=${encodeURIComponent(event.location)}`
        : `geo:0,0?q=${encodeURIComponent(event.location)}`;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir mapas'));
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.headerTopRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Evento</Text>
        <View style={styles.backBtn} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando evento...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.centered}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={60} color={COLORS.accent} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.centered}>
          <Ionicons name="document-outline" size={60} color={COLORS.grayText} />
          <Text style={styles.errorText}>Evento no encontrado</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Categoría y Título */}
        <View style={styles.titleSection}>
          <View style={[styles.badge, { backgroundColor: getCategoryColor(event.category) + '20' }]}>
            <Ionicons name="calendar-outline" size={14} color={getCategoryColor(event.category)} />
            <Text style={[styles.badgeText, { color: getCategoryColor(event.category) }]}>
              {event.category}
            </Text>
          </View>
          <Text style={styles.title}>{event.title}</Text>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        </View>

        {/* Detalles Principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Evento</Text>
          
          <View style={styles.infoCard}>
            <DetailItem 
              icon="calendar-outline" 
              label="Fecha" 
              value={event.date} 
              iconColor={COLORS.primary}
            />
            <View style={styles.divider} />
            
            <DetailItem 
              icon="time-outline" 
              label="Hora" 
              value={event.time}
              iconColor={COLORS.primary}
            />
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.detailRow} 
              onPress={openMap}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Ubicación</Text>
                <Text style={styles.detailValue}>{event.location}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.grayText} />
            </TouchableOpacity>
            <View style={styles.divider} />
            
            <DetailItem 
              icon="person-outline" 
              label="Organizador" 
              value={event.organizer}
              iconColor={COLORS.primary}
            />
            
            {event.capacity && (
              <>
                <View style={styles.divider} />
                <DetailItem 
                  icon="people-outline" 
                  label="Capacidad" 
                  value={`${event.attendees} / ${event.capacity} participantes`}
                  iconColor={COLORS.info}
                />
              </>
            )}
          </View>
        </View>

        {/* Objetivos */}
        {event.objetivos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objetivos</Text>
            <View style={styles.card}>
              {event.objetivos.map((obj, i) => (
                <View key={i} style={styles.listItemContainer}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.listItem}>
                    {typeof obj === 'string' ? obj : (obj.texto || obj.texto_personalizado || 'Objetivo sin descripción')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Resultados */}
        {event.resultados.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultados Esperados</Text>
            <View style={styles.card}>
              {event.resultados.map((res, i) => (
                <View key={i} style={styles.listItemContainer}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.listItem}>
                    {typeof res === 'string' ? res : (res.descripcion || res.texto || 'Resultado sin descripción')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Estado */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(event.status) + '15' }]}>
          <View style={styles.statusContent}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(event.status) }]}>
              <Ionicons name={getStatusIcon(event.status)} size={20} color={COLORS.white} />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusLabel}>Estado del Evento</Text>
              <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
                {getStatusText(event.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Botón Volver */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={[styles.backButtonText, { color: COLORS.primary }]}>Volver al inicio</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const DetailItem = ({ icon, label, value, iconColor = COLORS.primary }) => (
  <View style={styles.detailRow}>
    <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const getCategoryColor = (cat) => {
  const colors = { 
    taller: '#3B82F6', 
    conferencia: '#EF4444', 
    seminario: '#F59E0B',
    webinar: '#8B5CF6',
    evento: '#10B981'
  };
  return colors[cat?.toLowerCase()] || COLORS.primary;
};

const getStatusText = (status) => {
  const map = {
    confirmado: 'Confirmado',
    programado: 'Próximo',
    completado: 'Completado',
    cancelado: 'Cancelado',
    pendiente: 'Pendiente',
  };
  return map[status] || 'Pendiente';
};

const getStatusColor = (status) => {
  if (status === 'confirmado') return COLORS.success;
  if (status === 'programado') return COLORS.info;
  if (status === 'completado') return COLORS.secondary;
  if (status === 'cancelado') return COLORS.accent;
  return COLORS.warning;
};

const getStatusIcon = (status) => {
  if (status === 'confirmado') return 'checkmark-circle';
  if (status === 'programado') return 'time';
  if (status === 'completado') return 'checkmark-done-circle';
  if (status === 'cancelado') return 'close-circle';
  return 'help-circle';
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  content: { 
    padding: 20,
    paddingBottom: 40,
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  loadingText: { 
    marginTop: 15, 
    fontSize: 16, 
    color: COLORS.grayText 
  },
  errorText: { 
    marginTop: 15, 
    fontSize: 16, 
    color: COLORS.accent, 
    textAlign: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTopRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  backBtn: {
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.white 
  },

  // Title Section
  titleSection: {
    marginBottom: 24,
  },
  badge: { 
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  badgeText: { 
    fontSize: 12, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: COLORS.darkText,
    lineHeight: 32,
  },

  // Sections
  section: { 
    marginBottom: 28 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.darkText, 
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Description Card
  descriptionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  description: { 
    fontSize: 15, 
    color: COLORS.grayText, 
    lineHeight: 24,
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
  },
  iconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14,
  },
  detailContent: { 
    flex: 1 
  },
  detailLabel: { 
    fontSize: 12, 
    color: COLORS.grayText, 
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: { 
    fontSize: 15, 
    color: COLORS.darkText, 
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Generic Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 8,
    marginRight: 12,
  },
  listItem: { 
    flex: 1,
    fontSize: 14, 
    color: COLORS.grayText, 
    lineHeight: 22,
  },

  // Status Card
  statusCard: { 
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
    marginBottom: 24,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.grayText,
    fontWeight: '500',
    marginBottom: 2,
  },
  statusText: { 
    fontSize: 16, 
    fontWeight: '700',
  },

  // Back Button
  backButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    marginTop: 8,
  },
  backButtonText: { 
    fontSize: 16, 
    fontWeight: '700',
  },
  bottomPadding: {
    height: 20,
  },

  // Button
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventDetailStudentScreen;