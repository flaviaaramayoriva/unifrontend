import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  accent: '#FF7A45',
  primary: '#FF7A45',
  primarySoft: 'rgba(255,122,69,0.16)',
  bg: '#0E1219',
  surface: '#151B26',
  surface2: '#1B2230',
  line: 'rgba(255,255,255,0.10)',
  text: '#F5F7FA',
  textMid: '#AEB6C4',
  textLight: '#7C8798',
  success: '#2ED573',
  warning: '#F5A623',
  danger: '#EF4444',
  successSoft: 'rgba(46,213,115,0.14)',
  warningSoft: 'rgba(245,166,35,0.14)',
  dangerSoft: 'rgba(239,68,68,0.14)',
  overlay: 'rgba(15, 23, 42, 0.7)',
};

const STATUS_META = {
  aprobado: { color: COLORS.success, soft: COLORS.successSoft, label: 'Aprobado', icon: 'checkmark-circle-outline' },
  pendiente: { color: COLORS.warning, soft: COLORS.warningSoft, label: 'Pendiente', icon: 'time-outline' },
  rechazado: { color: COLORS.danger, soft: COLORS.dangerSoft, label: 'Rechazado', icon: 'close-circle-outline' },
};

const PHASE_POINTS = [
  { label: 'Planeación', icon: 'document-text-outline', color: '#3498DB' },
  { label: 'Revisión', icon: 'clipboard-outline', color: '#9B59B6' },
  { label: 'Programación', icon: 'calendar-outline', color: COLORS.success },
  { label: 'Ejecución', icon: 'play-circle-outline', color: COLORS.accent },
  { label: 'Cierre', icon: 'checkmark-done-outline', color: COLORS.textMid },
];

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

const ItemDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showApproveAlert, setShowApproveAlert] = useState(false);
  const [showRejectAlert, setShowRejectAlert] = useState(false);

  const getCurrentPhaseFromFases = useCallback((fases) => {
    if (!Array.isArray(fases) || fases.length === 0) {
      return {
        number: 1,
        label: 'Planeación',
        key: 'phase1',
        color: '#3498DB',
        icon: 'document-text-outline',
      };
    }

    const faseToShow = fases[0];

    const phaseConfig = {
      1: { label: 'Planeación', icon: 'document-text-outline', color: '#3498DB' },
      2: { label: 'Revisión y aprobación', icon: 'clipboard-outline', color: '#9B59B6' },
      3: { label: 'Programación del evento', icon: 'calendar-outline', color: COLORS.success },
      4: { label: 'Ejecución', icon: 'play-circle-outline', color: COLORS.accent },
      5: { label: 'Cierre y evaluación', icon: 'checkmark-done-outline', color: COLORS.textMid },
    };

    const config = phaseConfig[faseToShow.nrofase] || {
      label: `Fase ${faseToShow.nrofase}`,
      icon: 'help-circle-outline',
      color: COLORS.textMid,
    };

    return {
      number: faseToShow.nrofase,
      label: config.label,
      key: `phase${faseToShow.nrofase}`,
      color: config.color,
      icon: config.icon,
    };
  }, []);

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
        <Pressable style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]} onPress={fetchEventDetails}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (!event || Object.keys(event).length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="information-circle-outline" size={50} color={COLORS.textLight} />
        <Text style={styles.errorText}>No se encontraron datos del evento.</Text>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const statusMeta = STATUS_META[event.status] || STATUS_META.pendiente;
  const phaseInfo = getCurrentPhaseFromFases([{ nrofase: event.idfase }]);
  const initials = (event.creador?.nombre || 'U').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  const metaRows = [
    { icon: 'calendar-outline', label: 'Fecha', value: event.date },
    { icon: 'time-outline', label: 'Hora', value: event.time },
    { icon: 'location-outline', label: 'Ubicación', value: event.location },
    { icon: 'people-outline', label: 'Asistentes', value: String(event.attendees) },
  ];

  return (
    <View style={styles.screenContainer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {/* HERO */}
        <View style={styles.hero}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#232B3C', '#151B26', '#0E1219']}
              style={styles.heroPlaceholder}
            >
              <Ionicons name="calendar" size={72} color="rgba(255,255,255,0.14)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={['rgba(14,18,25,0.4)', 'rgba(14,18,25,0.28)', 'rgba(14,18,25,0.98)']}
            style={styles.heroGrad}
          >
            <View style={styles.heroTop}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                hitSlop={10}
                onPress={() => router.back()}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <Text style={styles.heroBrand}>DETALLE DEL EVENTO</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Actualizar"
                hitSlop={10}
                onPress={fetchEventDetails}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.heroBottom}>
              <View style={[styles.statusPill, { backgroundColor: statusMeta.soft, borderColor: `${statusMeta.color}55` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
                <Text style={[styles.statusPillText, { color: statusMeta.color }]}>
                  {statusMeta.label.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.heroTitle}>{event.title}</Text>

              <View style={styles.heroChips}>
                <View style={styles.heroChip}>
                  <Ionicons name="calendar-outline" size={13} color={COLORS.accent} />
                  <Text style={styles.heroChipText} numberOfLines={1}>{event.date}</Text>
                </View>
                <View style={styles.heroChip}>
                  <Ionicons name="time-outline" size={13} color={COLORS.accent} />
                  <Text style={styles.heroChipText} numberOfLines={1}>{event.time}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* FASE */}
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>PROGRESO</Text>
          <View style={styles.card}>
            <View style={styles.phaseRow}>
              <View style={[styles.phaseIcon, { backgroundColor: `${phaseInfo.color}22` }]}>
                <Ionicons name={phaseInfo.icon} size={20} color={phaseInfo.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.phaseNum}>FASE {phaseInfo.number} DE 5</Text>
                <Text style={styles.phaseLabel}>{phaseInfo.label}</Text>
              </View>
            </View>
            <View style={styles.segTrack}>
              {PHASE_POINTS.map((p, i) => {
                const done = i < phaseInfo.number;
                return (
                  <View key={p.label} style={[styles.seg, done && styles.segDone, i < phaseInfo.number - 1 && { marginRight: 6 }]}>
                    {i < phaseInfo.number - 1 ? null : (
                      <Ionicons name="checkmark" size={11} color={done ? '#0E1219' : 'transparent'} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* DATOS GENERALES */}
          <Text style={styles.sectionLabel}>INFORMACIÓN</Text>
          <View style={styles.card}>
            {metaRows.map((row) => (
              <View key={row.label} style={styles.metaRow}>
                <View style={styles.metaIcon}>
                  <Ionicons name={row.icon} size={17} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>{row.label}</Text>
                  <Text style={styles.metaValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CLASIFICACIÓN */}
          {event.Clasificacion && (
            <>
              <Text style={styles.sectionLabel}>CLASIFICACIÓN</Text>
              <View style={styles.card}>
                <View style={styles.chipRow}>
                  <View style={styles.chip}>
                    <Ionicons name="layers-outline" size={14} color={COLORS.accent} />
                    <Text style={styles.chipText}>{event.Clasificacion.nombreClasificacion}</Text>
                  </View>
                  {event.Clasificacion.nombresubcategoria && (
                    <View style={styles.chip}>
                      <Ionicons name="pricetag-outline" size={14} color={COLORS.textMid} />
                      <Text style={styles.chipText}>{event.Clasificacion.nombresubcategoria}</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          {/* TIPOS DE EVENTO */}
          {event.tiposEvento && event.tiposEvento.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>TIPOS DE EVENTO</Text>
              <View style={styles.card}>
                <View style={styles.chipRow}>
                  {event.tiposEvento.map((tipo, index) => (
                    <View key={String(tipo.idtipoevento ?? index)} style={styles.chip}>
                      <Ionicons name="flash-outline" size={14} color={COLORS.accent} />
                      <Text style={styles.chipText}>
                        {tipo.nombretipo || `Tipo ${tipo.idtipoevento ?? ''}`}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* PROPUESTO POR */}
          {event.creador && (
            <>
              <Text style={styles.sectionLabel}>PROPUESTO POR</Text>
              <View style={styles.card}>
                <View style={styles.creatorRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.creatorName}>{event.creador.nombre}</Text>
                    <Text style={styles.creatorRole}>{event.creador.role}</Text>
                    {event.creador.email && (
                      <Text style={styles.creatorEmail}>{event.creador.email}</Text>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
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
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    paddingBottom: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    gap: 12,
    padding: 30,
  },
  loadingText: {
    marginTop: 6,
    fontSize: 15,
    color: COLORS.textMid,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.textMid,
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
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '800',
  },
  backButton: {
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: { opacity: 0.7 },

  // Hero
  hero: { width: '100%', height: 340 },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroPlaceholder: { width: '100%', height: '100%', position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  heroGrad: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingVertical: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBrand: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 2.4 },
  heroBottom: { alignItems: 'flex-start' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, marginBottom: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 34, marginBottom: 12 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34,
    paddingHorizontal: 12, borderRadius: 18, maxWidth: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  heroChipText: { color: '#EDF1F7', fontSize: 11.5, fontWeight: '600', flexShrink: 1 },

  // Body
  body: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.6, marginBottom: 10, marginTop: 22 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
  },

  // Phase
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phaseIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  phaseNum: { color: COLORS.textLight, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 3 },
  phaseLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  segTrack: { flexDirection: 'row', marginTop: 14 },
  seg: {
    flex: 1, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  segDone: { backgroundColor: COLORS.primary },

  // Meta rows
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  metaIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  metaLabel: { color: COLORS.textLight, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  metaValue: { color: '#fff', fontSize: 14.5, fontWeight: '600', lineHeight: 19 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34,
    paddingHorizontal: 12, borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: 'rgba(255,122,69,0.28)',
  },
  chipText: { color: '#EDF1F7', fontSize: 12, fontWeight: '600' },

  // Creator
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.bg, fontSize: 16, fontWeight: '900' },
  creatorName: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  creatorRole: { color: COLORS.textMid, fontSize: 12, marginBottom: 3, textTransform: 'capitalize' },
  creatorEmail: { color: COLORS.textLight, fontSize: 12, fontStyle: 'italic' },
});

export default ItemDetailScreen;