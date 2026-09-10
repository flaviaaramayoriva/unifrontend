// EventosAprobadosPorFacultad.js - Rediseño: secciones por facultad, búsqueda y filtros
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

const EventosAprobadosPorFacultad = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [facultadFiltro, setFacultadFiltro] = useState('todas');
  const [faseFiltro, setFaseFiltro] = useState('1');
  const [comiteEvents, setComiteEvents] = useState([]);
  const [myId, setMyId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [vista, setVista] = useState('creados'); // 'creados' | 'comite'

  const normalizeComite = useCallback((ev) => ({
    ...ev,
    title: ev.nombreevento || 'Sin título',
    nombreevento: ev.nombreevento,
    id: ev.idevento,
    idevento: ev.idevento,
    date: ev.fechaevento,
    fechaevento: ev.fechaevento,
    fecha_inicio: ev.fechaevento,
    time: ev.horaevento || 'N/A',
    horaevento: ev.horaevento,
    location: ev.lugarevento || 'Sin ubicación',
    lugarevento: ev.lugarevento,
    organizer: ev.academico?.nombre || 'Sin organizador',
    responsable_evento: ev.academico?.nombre || 'Sin organizador',
    idfase: ev.idfase || 1,
    faculty: ev.facultad || 'Sin facultad',
    facultad: ev.facultad || 'Sin facultad',
    estado: ev.estado || 'aprobado',
  }), []);

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

      const mainList = response.data || [];
      setEvents(mainList);

      try {
        const [resComite, resProfile] = await Promise.all([
          axios.get(`${API_BASE_URL}/dashboard/my-committee-events`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const dataComite = Array.isArray(resComite.data) ? resComite.data : (resComite.data?.events || []);
        const miId = resProfile.data?.id ?? resProfile.data?.idusuario ?? null;
        setMyId(miId);
        setUserRole(resProfile.data?.role || null);

        const mapaComite = new Map();
        dataComite.forEach(ev => { if (ev && ev.idevento) mapaComite.set(String(ev.idevento), ev); });
        mainList.forEach(ev => {
          if (ev && ev.idevento && (ev.Comite || []).some(m => String(m.idusuario) === String(miId))) {
            mapaComite.set(String(ev.idevento), ev);
          }
        });
        setComiteEvents([...mapaComite.values()].map(normalizeComite));
      } catch (e) {
        console.warn('⚠️ No se pudo cargar comité/perfil:', e.message);
      }

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
  }, [router, normalizeComite]);

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
      pathname: '/admin/EventDetailUpdateScreen',
      params: { eventId: String(eventId) }
    });
  };

  const curEvents = useMemo(() => {
    if (userRole !== 'academico') return events;
    if (vista === 'creados') return events.filter(e => String(e.idacademico || e.organizerId) === String(myId));
    if (vista === 'comite') return comiteEvents;
    return events;
  }, [vista, events, comiteEvents, myId, userRole]);

  const creadosCount = useMemo(() => events.filter(e => String(e.idacademico || e.organizerId) === String(myId)).length, [events, myId]);

  const faculties = useMemo(() => {
    const list = [...new Set(curEvents.map(getEventFaculty))].sort();
    return list;
  }, [curEvents]);

  const stats = useMemo(() => {
    const total = curEvents.length;
    const upcoming = total;
    return { total, upcoming, faculties: faculties.length };
  }, [curEvents, faculties]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return curEvents.filter(event => {
      const esComite = vista === 'comite';
      if (!esComite && isEventPast(event)) return false;
      if (!esComite && faseFiltro !== 'todas' && String(event.idfase || 1) !== faseFiltro) return false;
      if (!esComite && facultadFiltro !== 'todas' && getEventFaculty(event) !== facultadFiltro) return false;
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
  }, [curEvents, searchTerm, facultadFiltro, faseFiltro, vista]);

  const phaseStats = useMemo(() => {
    const upcoming = curEvents.filter(e => !isEventPast(e));
    const fase1 = upcoming.filter(e => String(e.idfase || 1) === '1').length;
    const fase2 = upcoming.filter(e => String(e.idfase || 1) === '2').length;
    return { fase1, fase2 };
  }, [curEvents]);

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

    const miRolComite = vista === 'comite'
      ? (item.Comite || item.comite || []).find(m => String(m.idusuario || m.user_id) === String(myId))?.rol_comite || null
      : null;

    const dateStr = item.fechaevento || item.date;
    const displayDate = dateStr
      ? new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';
    const displayTime = item.time || item.horaevento || '';

    const daysRemaining = (() => {
      if (!dateStr) return null;
      const d = new Date(dateStr).setHours(0, 0, 0, 0);
      const today = new Date().setHours(0, 0, 0, 0);
      return Math.round((d - today) / 864e5);
    })();

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

            <View style={[
              styles.statusPill,
              daysRemaining !== null && daysRemaining <= 3 ? styles.statusSoon : styles.statusUpcoming
            ]}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={daysRemaining !== null && daysRemaining <= 3 ? COLORS.warning : COLORS.success}
              />
              <Text style={[
                styles.statusPillText,
                { color: daysRemaining !== null && daysRemaining <= 3 ? COLORS.warning : COLORS.success }
              ]}>
                {daysRemaining === 0 ? 'Hoy' : daysRemaining !== null && daysRemaining <= 3 ? `En ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}` : 'Próximo'}
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

            {String(item.idfase || 1) === '2' ? (
              <View style={styles.fase2Badge}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                <Text style={styles.fase2Text}>Fase 2</Text>
              </View>
            ) : (
              <View style={styles.fase1Badge}>
                <Ionicons name="create-outline" size={12} color={COLORS.primary} />
                <Text style={styles.fase1Text}>Fase 1</Text>
              </View>
            )}

            {miRolComite && (
              <View style={styles.comiteBadge}>
                <Ionicons name="people-outline" size={12} color={COLORS.info} />
                <Text style={styles.comiteBadgeText} numberOfLines={1}>Comité · {miRolComite}</Text>
              </View>
            )}

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
    const phase2Count = (vista === 'todos' || userRole !== 'academico') ? events.filter(e => e.idfase === 2 && !isEventPast(e)).length : 0;

    return (
      <View>
        {phase2Count > 0 && (
          <View style={styles.infoBanner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>{phase2Count} evento{phase2Count !== 1 ? 's' : ''} listo{phase2Count !== 1 ? 's' : ''} para publicar</Text>
              <Text style={styles.bannerSubtitle}>
                Fase 2 aprobada. El día del evento se habilitará el informe para su actualización.
              </Text>
            </View>
          </View>
        )}

        {userRole === 'academico' && (
          <View style={styles.vistaTabs}>
            {[
              { id: 'creados',  label: 'Creados por mí', count: creadosCount },
              { id: 'comite',   label: 'Como comité',    count: comiteEvents.length },
            ].map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.vistaTab, vista === t.id && styles.vistaTabActive]}
                onPress={() => setVista(t.id)}
                accessibilityRole="button"
              >
                <Text style={[styles.vistaTabText, vista === t.id && styles.vistaTabTextActive]} numberOfLines={1}>
                  {t.label}
                </Text>
                <View style={[styles.vistaTabCount, vista === t.id && styles.vistaTabCountActive]}>
                  <Text style={[styles.vistaTabCountText, vista === t.id && styles.vistaTabCountTextActive]}>
                    {t.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {vista !== 'comite' && (
          <View style={styles.phaseTabs}>
          <TouchableOpacity
            style={[styles.phaseTab, faseFiltro === '1' && styles.phaseTabActive1]}
            onPress={() => setFaseFiltro('1')}
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={15} color={faseFiltro === '1' ? COLORS.white : COLORS.primary} />
            <Text style={[styles.phaseTabText, faseFiltro === '1' && styles.phaseTabTextActive]}>
              Fase 1 · Planeación
            </Text>
            <View style={[styles.phaseTabCount, faseFiltro === '1' && styles.phaseTabCountActive]}>
              <Text style={[styles.phaseTabCountText, faseFiltro === '1' && styles.phaseTabCountTextActive]}>
                {phaseStats.fase1}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.phaseTab, faseFiltro === '2' && styles.phaseTabActive2]}
            onPress={() => setFaseFiltro('2')}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle-outline" size={15} color={faseFiltro === '2' ? COLORS.white : COLORS.success} />
            <Text style={[styles.phaseTabText, faseFiltro === '2' && styles.phaseTabTextActive]}>
              Fase 2 · Listos para publicar
            </Text>
            <View style={[styles.phaseTabCount, faseFiltro === '2' && styles.phaseTabCountActive]}>
              <Text style={[styles.phaseTabCountText, faseFiltro === '2' && styles.phaseTabCountTextActive]}>
                {phaseStats.fase2}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Eventos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Próximos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.purple || '#7C3AED' }]}>{stats.faculties}</Text>
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
          {filteredEvents.length} {filteredEvents.length === 1 ? 'evento' : 'eventos'}
          {searchTerm || facultadFiltro !== 'todas'
            ? ' encontrados'
            : vista === 'creados' && userRole === 'academico' ? ' creados por ti' : vista === 'comite' ? ' como comité' : ` en Fase ${faseFiltro}`}
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
        title="Eventos Aprobados"
        subtitle={`${stats.faculties} ${stats.faculties === 1 ? 'facultad' : 'facultades'} · ${stats.total} eventos`}
        eyebrow="Gestión"
        primaryColor={COLORS.primary}
        rightActions={(
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing} accessibilityRole="button" accessibilityLabel="Actualizar" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            <Text style={styles.emptyTitle}>{curEvents.length === 0 ? 'No hay eventos' : 'Sin resultados'}</Text>
            <Text style={styles.emptyText}>
              {curEvents.length === 0
                ? (vista === 'creados'
                  ? 'Aún no has creado eventos aprobados.'
                  : vista === 'comite'
                    ? 'Aún no formas parte del comité de ningún evento aprobado.'
                    : 'No se encontraron eventos aprobados organizados por facultad.')
                : 'No hay eventos que coincidan con los filtros aplicados. Intenta ajustar la búsqueda.'}
            </Text>
            {(curEvents.length > 0 && (searchTerm || facultadFiltro !== 'todas')) && (

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

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: COLORS.grayText,
    lineHeight: 16,
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

  phaseTabs: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  phaseTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phaseTabActive1: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  phaseTabActive2: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  phaseTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayText,
    flex: 1,
  },
  phaseTabTextActive: {
    color: COLORS.white,
  },
  phaseTabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  phaseTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  phaseTabCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  phaseTabCountTextActive: {
    color: COLORS.white,
  },

  vistaTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  vistaTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vistaTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  vistaTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.grayText,
    flexShrink: 1,
  },
  vistaTabTextActive: {
    color: COLORS.white,
  },
  vistaTabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  vistaTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  vistaTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  vistaTabCountTextActive: {
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
  },
  statusUpcoming: {
    backgroundColor: COLORS.successLight,
  },
  statusSoon: {
    backgroundColor: '#FEF3C7',
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
  fase2Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fase2Text: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
  },
  fase1Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fase1Text: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  comiteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.infoLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexShrink: 1,
  },
  comiteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.info,
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

export default EventosAprobadosPorFacultad;