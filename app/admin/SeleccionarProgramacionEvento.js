import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  TextInput,
  ScrollView,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AdminHeader from '../../components/admin/AdminHeader';

const { width } = Dimensions.get('window');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#C44B0A',
  primaryLight: '#FFEDD5',
  success: '#16A34A',
  successLight: '#E8F5E9',
  warning: '#F59E0B',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  white: '#FFFFFF',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  grayLight: '#E0E0E0',
  grayMedium: '#9CA3AF',
  grayText: '#64748B',
  darkText: '#0F172A',
  border: '#E6E9EF',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { }
  } else {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { }
  }
};

const parseEventDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
  }
  return new Date(0);
};

const isEventPast = (event) => {
  const dateStr = event.fechaevento || event.date;
  if (!dateStr) return true;

  const eventDate = parseEventDate(dateStr);
  const today = new Date();

  eventDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return eventDate < today;
};

const getEventFaculty = (event) => event.faculty || event.facultad || 'Sin facultad';

const getFacultyColor = (facultyName) => {
  const colors = [
    '#C44B0A', '#9C27B0', '#2563EB', '#0D9488', '#DC2626',
    '#7C3AED', '#EA580C', '#0284C7', '#16A34A', '#DB2777'
  ];
  const hash = facultyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const formatEventDate = (dateStr) => {
  const date = parseEventDate(dateStr);
  if (isNaN(date.getTime()) || date.getTime() === 0) return 'Fecha no especificada';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizeEvent = (ev) => ({
  id: ev.idevento,
  idevento: ev.idevento,
  nombreevento: ev.nombreevento || 'Sin título',
  fechaevento: ev.fechaevento || ev.fecha_inicio || ev.date,
  lugarevento: ev.lugarevento || ev.location || 'Sin ubicación',
  responsable_evento: ev.academico?.nombre || ev.responsable_evento || 'Sin organizador',
  idacademico: ev.idacademico || ev.organizerId || ev.idusuario || null,
  facultad: ev.facultad || ev.faculty || 'Sin facultad',
  estado: ev.estado || 'aprobado',
  idfase: ev.idfase ?? ev.fase ?? null,
  actividadesDurante: ev.actividadesDurante,
  actividadesPrevias: ev.actividadesPrevias,
  actividadesPost: ev.actividadesPost,
});

const tieneProgramacion = (ev) =>
  (Array.isArray(ev.actividadesPrevias) && ev.actividadesPrevias.length > 0) ||
  (Array.isArray(ev.actividadesDurante) && ev.actividadesDurante.length > 0) ||
  (Array.isArray(ev.actividadesPost) && ev.actividadesPost.length > 0);

const SeleccionarProgramacionEvento = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [myId, setMyId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        router.replace('/LoginAdmin');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/eventos/aprobados-por-facultad`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const mainList = (response.data || []).map(normalizeEvent);
      setEvents(mainList);

      try {
        const resProfile = await axios.get(`${API_BASE_URL}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setMyId(resProfile.data?.id ?? resProfile.data?.idusuario ?? null);
        setUserRole(resProfile.data?.role || null);
      } catch (e) {
        console.warn('No se pudo cargar el perfil:', e.message);
      }
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        await deleteTokenAsync();
        Alert.alert('Sesión Expirada', 'Tu sesión ha expirado.', [
          { text: 'OK', onPress: () => router.replace('/LoginAdmin') }
        ]);
        return;
      }
      Alert.alert('Error', 'No se pudieron cargar los eventos aprobados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const filteredEvents = useMemo(() => {
    let list = [];
    if (userRole === 'academico') {
      list = events.filter(ev => String(ev.idacademico) === String(myId));
    } else {
      list = events;
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(ev =>
        (ev.nombreevento || '').toLowerCase().includes(term) ||
        (ev.lugarevento || '').toLowerCase().includes(term) ||
        (ev.facultad || '').toLowerCase().includes(term)
      );
    }

    list = list.filter(ev => !isEventPast(ev));
    list = list.filter(ev => Number(ev.idfase) !== 3);

    return list.sort((a, b) => parseEventDate(a.fechaevento) - parseEventDate(b.fechaevento));
  }, [events, myId, userRole, searchTerm]);

  const handleSelect = (event) => {
    const eventId = event.id || event.idevento;
    if (!eventId) {
      Alert.alert('Error', 'Evento sin identificador válido.');
      return;
    }
    router.push({
      pathname: '/admin/ProgramacionEvento',
      params: { idevento: String(eventId) }
    });
  };

  const renderEventCard = (ev) => {
    const yaProgramado = tieneProgramacion(ev);
    const facultyColor = getFacultyColor(ev.facultad);
    return (
      <TouchableOpacity
        key={String(ev.idevento)}
        style={styles.eventCard}
        onPress={() => handleSelect(ev)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Programar evento ${ev.nombreevento}`}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.facultyDot, { backgroundColor: facultyColor }]} />
          <Text style={styles.eventName} numberOfLines={2}>{ev.nombreevento}</Text>
          <View style={[styles.badge, yaProgramado ? styles.badgeProgramado : styles.badgeNuevo]}>
            <Text style={[styles.badgeText, { color: yaProgramado ? COLORS.info : COLORS.success }]}>
              {yaProgramado ? 'Ya programado' : 'Sin programar'}
            </Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.grayText} />
          <Text style={styles.cardRowText}>{formatEventDate(ev.fechaevento)}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.grayText} />
          <Text style={styles.cardRowText} numberOfLines={1}>{ev.lugarevento}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="school-outline" size={16} color={COLORS.grayText} />
          <Text style={styles.cardRowText} numberOfLines={1}>{ev.facultad}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.grayText} />
          <Text style={styles.cardRowText} numberOfLines={1}>{ev.responsable_evento}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.programText}>Tocar para programar</Text>
          <Ionicons name="arrow-forward-circle" size={22} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <AdminHeader
        title="Programación del Evento"
        subtitle="Selecciona un evento aprobado para programarlo"
        eyebrow="Gestión"
        primaryColor={COLORS.primary}
      />

      <View style={styles.content}>
        <View style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepDone]}>
                <Ionicons name="checkmark" size={18} color={COLORS.white} />
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelDone]}>
                Paso 1{'\n'}Crear evento
              </Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepPending]}>
                <Ionicons name="hourglass-outline" size={18} color={COLORS.grayMedium} />
              </View>
              <Text style={styles.stepLabel}>
                Aprobación{'\n'}Comité / DAF
              </Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Ionicons name="create-outline" size={18} color={COLORS.white} />
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>
                Paso 2{'\n'}Programación
              </Text>
            </View>
          </View>
          <View style={styles.stepperNote}>
            <Ionicons name="information-circle-outline" size={17} color={COLORS.info} />
            <Text style={styles.stepperNoteText}>
              Aquí solo aparecen eventos APROBADOS, que no han vencido y sin fase 3. Si tu evento está «Pendiente», míralo en la pestaña Pendientes hasta que lo aprueben.
            </Text>
          </View>
        </View>

        <Text style={styles.resultsCount}>
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} aprobado{filteredEvents.length !== 1 ? 's' : ''} por programar
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.grayMedium} />
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Buscar por nombre, lugar o facultad..."
            placeholderTextColor={COLORS.grayMedium}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
              <Ionicons name="close-circle" size={18} color={COLORS.grayMedium} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.centeredText}>Cargando eventos aprobados...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.grayMedium} />
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.centeredText}>
              No hay eventos aprobados {searchTerm ? 'que coincidan con la búsqueda' : 'por programar'}.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
            }
          >
            {filteredEvents.map(renderEventCard)}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  stepperCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepItem: { alignItems: 'center', width: 76 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { backgroundColor: COLORS.success },
  stepPending: { backgroundColor: COLORS.grayLight },
  stepActive: { backgroundColor: COLORS.primary },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.grayLight,
    marginTop: 17,
    marginHorizontal: 2,
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.grayText,
    textAlign: 'center',
    lineHeight: 15,
  },
  stepLabelDone: { color: COLORS.success },
  stepLabelActive: { color: COLORS.primary },
  stepperNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.infoLight,
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  stepperNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#1E3A5F',
    lineHeight: 18,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grayText,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    minHeight: 46,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.darkText, outlineStyle: 'none' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40, gap: 12 },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  facultyDot: { width: 10, height: 10, borderRadius: 5 },
  eventName: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.darkText },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeNuevo: { backgroundColor: COLORS.successLight },
  badgeProgramado: { backgroundColor: COLORS.infoLight },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  cardRowText: { flex: 1, fontSize: 13, color: COLORS.grayText },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  programText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  centeredText: { marginTop: 10, fontSize: 14, color: COLORS.grayText, textAlign: 'center' },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '700', color: COLORS.darkText, textAlign: 'center' },
});

export default SeleccionarProgramacionEvento;