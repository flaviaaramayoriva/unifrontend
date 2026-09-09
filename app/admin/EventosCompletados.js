// EventosCompletados.js - Rediseño: secciones por facultad, búsqueda y filtros (solo Fase 3 completados)
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
  SectionList,
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
  cardShadow: '#000000',
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
  if (!dateStr) return null;
  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;

  if (typeof dateStr === 'string') {
    const s = dateStr.trim();

    const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const y = +isoMatch[1], m = +isoMatch[2], d = +isoMatch[3];
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(y, m - 1, d);
    }

    const dmMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmMatch) {
      const d = +dmMatch[1], m = +dmMatch[2], y = +dmMatch[3];
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(y, m - 1, d);
    }

    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  if (typeof dateStr === 'number') {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

// Fecha cruda del evento (formato ISO/legible devuelto por el backend)
  const getRawEventDate = (event) => event.fechaevento || event.fecha_inicio || event.fecha || event.fechaEvento || event.date || '';

  // Fecha en formato es-ES para mostrar
  const getDisplayDate = (event) => {
    const d = parseEventDate(getRawEventDate(event));
    return d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  };

  const isEventPast = (event) => {
    const eventDate = parseEventDate(getRawEventDate(event));
    if (!eventDate) return false;
    const today = new Date();
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  const formatSubmittedDate = (date) => {
    if (!date) return 'N/A';
    const now = new Date();
    const submittedDate = new Date(date);
    if (isNaN(submittedDate.getTime())) return 'N/A';
    const diff = Math.floor((now - submittedDate) / 1000);
    if (diff < 3600) return `Hace ${Math.max(1, Math.floor(diff / 60))} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    const days = Math.floor(diff / 86400);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
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

const EventosCompletados = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [facultadFiltro, setFacultadFiltro] = useState('todas');

  const fetchApprovedEventsByFaculty = useCallback(async () => {
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

      setEvents(response.data || []);

    } catch (error) {
      console.error('❌ Error al cargar eventos:', error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        await deleteTokenAsync();
        Alert.alert('Sesión Expirada', 'Tu sesión ha expirado.', [
          { text: 'OK', onPress: () => router.replace('/LoginAdmin') }
        ]);
        return;
      }

      Alert.alert('Error', 'No se pudieron cargar los eventos. Revisa la consola.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchApprovedEventsByFaculty();
  }, [fetchApprovedEventsByFaculty]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApprovedEventsByFaculty();
  }, [fetchApprovedEventsByFaculty]);

  const handleEventPress = (event) => {
    const eventId = event.id || event.idevento;
    if (!eventId) return;
    router.push({
      pathname: '/admin/InformeEventoScreen',
      params: { eventId: String(eventId) }
    });
  };

  // Solo eventos Fase 3 completados
  const completedEvents = useMemo(() => {
    return events.filter(e =>
      (e.idfase === 3 || String(e.idfase) === '3') && isEventPast(e)
    );
  }, [events]);

  const faculties = useMemo(() => {
    return [...new Set(completedEvents.map(getEventFaculty))].sort();
  }, [completedEvents]);

  const stats = useMemo(() => {
    const total = completedEvents.length;
    return { total, faculties: faculties.length };
  }, [completedEvents, faculties]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return completedEvents.filter(event => {
      if (facultadFiltro !== 'todas' && getEventFaculty(event) !== facultadFiltro) return false;
      if (term) {
        const haystack = [
          event.title, event.nombreevento,
          event.organizer, event.responsable_evento, event.organizador,
          getEventFaculty(event)
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [completedEvents, searchTerm, facultadFiltro]);

  const sections = useMemo(() => {
    const grouped = {};
    filteredEvents.forEach(event => {
      const faculty = getEventFaculty(event);
      if (!grouped[faculty]) grouped[faculty] = [];
      grouped[faculty].push(event);
    });

    return Object.keys(grouped).sort().map(faculty => {
      return { title: faculty, faculty, data: grouped[faculty] };
    });
  }, [filteredEvents]);

  const renderEventItem = ({ item }) => {
    if (!item || typeof item !== 'object' || (!item.id && !item.idevento)) {
      return null;
    }

    const eventId = item.id || item.idevento;
    const facultyName = getEventFaculty(item);
    const facultyColor = getFacultyColor(facultyName);

    const displayDate = getDisplayDate(item);
    const displayTime = item.time || item.horaevento || '';

    const getInitials = () => {
      const name = item.organizer || item.responsable_evento || item.organizador || 'A';
      return name.trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
    };

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.facultyBar, { backgroundColor: facultyColor }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.eventTitle} numberOfLines={2}>
                {item.title || item.nombreevento || 'Sin título'}
              </Text>
              <Text style={styles.eventId}>#{eventId}</Text>
            </View>

            <View style={styles.statusPill}>
              <Ionicons name="checkmark-done-circle" size={12} color={COLORS.success} />
              <Text style={[styles.statusPillText, { color: COLORS.success }]}>
                Completado
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.grayText} />
            <Text style={styles.infoText}>
              {displayDate}{displayTime ? ` · ${displayTime}` : ''}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.grayText} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.location || item.lugarevento || 'Sin ubicación'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <Text style={styles.infoText} numberOfLines={1}>
              {item.organizer || item.responsable_evento || item.organizador || 'Sin organizador'}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.facultyChip}>
              <View style={[styles.facultyChipDot, { backgroundColor: facultyColor }]} />
              <Text style={styles.facultyChipText} numberOfLines={1}>
                {facultyName}
              </Text>
            </View>

            <View style={styles.fase3Badge}>
              <Ionicons name="trophy" size={12} color={COLORS.primary} />
              <Text style={styles.fase3Text}>Fase 3</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFacultyHeader = ({ section }) => {
    const color = getFacultyColor(section.faculty);

    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.facultyIconCircle, { backgroundColor: color + '1A' }]}>
          <Ionicons name="school-outline" size={16} color={color} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle} numberOfLines={1}>{section.faculty}</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: color + '1A' }]}>
          <Text style={[styles.countText, { color }]}>{section.data.length}</Text>
        </View>
      </View>
    );
  };

  const renderListHeader = () => {
    return (
      <View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.faculties}</Text>
            <Text style={styles.statLabel}>Facultades</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={COLORS.grayText} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar evento, organizador o facultad..."
              placeholderTextColor={COLORS.grayMedium}
              accessibilityLabel="Buscar"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={18} color={COLORS.grayMedium} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.filterChip, facultadFiltro === 'todas' && styles.filterChipActive]}
            onPress={() => setFacultadFiltro('todas')}
            accessibilityRole="button"
          >
            <Text style={[styles.filterChipText, facultadFiltro === 'todas' && styles.filterChipTextActive]}>
              Todas las facultades
            </Text>
          </TouchableOpacity>

          {faculties.map(fac => {
            const active = facultadFiltro === fac;
            const color = getFacultyColor(fac);
            return (
              <TouchableOpacity
                key={fac}
                style={[styles.filterChip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => setFacultadFiltro(fac)}
                accessibilityRole="button"
              >
                <Text style={[styles.filterChipText, active && { color: COLORS.white }]} numberOfLines={1}>
                  {fac}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.resultsText}>
          {filteredEvents.length} {filteredEvents.length === 1 ? 'evento completado' : 'eventos completados'}
          {searchTerm || facultadFiltro !== 'todas' ? ' encontrados' : ''}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando eventos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <AdminHeader
        title="Eventos Completados"
        subtitle={`${stats.faculties} ${stats.faculties === 1 ? 'facultad' : 'facultades'} · ${stats.total} eventos`}
        eyebrow="Gestión"
        primaryColor={COLORS.primary}
        rightActions={(
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing} accessibilityRole="button" accessibilityLabel="Actualizar">
            <Ionicons name="refresh" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => `event-${item.id || item.idevento || Math.random()}`}
        renderItem={renderEventItem}
        renderSectionHeader={renderFacultyHeader}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="school-outline" size={72} color={COLORS.grayMedium} />
            </View>
            <Text style={styles.emptyTitle}>{completedEvents.length === 0 ? 'No hay eventos completados' : 'Sin resultados'}</Text>
            <Text style={styles.emptyText}>
              {completedEvents.length === 0
                ? 'No se encontraron eventos de Fase 3 completados organizados por facultad.'
                : 'No hay eventos que coincidan con los filtros aplicados. Intenta ajustar la búsqueda.'}
            </Text>
            {(completedEvents.length > 0 && (searchTerm || facultadFiltro !== 'todas')) && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => { setSearchTerm(''); setFacultadFiltro('todas'); }}
                accessibilityRole="button"
              >
                <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.grayText,
    fontWeight: '500',
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.grayText,
    fontWeight: '500',
    marginTop: 2,
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.darkText,
    outlineStyle: 'none',
  },

  chipsContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grayText,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },

  resultsText: {
    fontSize: 12,
    color: COLORS.grayText,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 8,
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  facultyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },

  listContent: {
    paddingBottom: 24,
  },

  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  facultyBar: {
    width: 5,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  titleWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  eventId: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.successLight,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.grayText,
    fontWeight: '500',
    flex: 1,
  },
  avatarCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  facultyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  facultyChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  facultyChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.grayText,
    flex: 1,
  },
  fase3Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fase3Text: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  clearFiltersText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EventosCompletados;