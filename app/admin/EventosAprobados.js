// EventosAprobadosPorFacultad.js - Versión con Banner y Badge de Fase 2
import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

const API_BASE_URL = 'https://unibackend-production.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FF7A3D',
  accent: '#4CAF50', // Verde para badges de éxito
  background: '#F8F9FA',
  surface: '#FFFFFF',
  success: '#2E7D32', // Verde oscuro para textos/bordes
  warning: '#FFA726',
  info: '#3498db',
  purple: '#9b59b6',
  blue: '#2196F3',
  white: '#FFFFFF',
  grayLight: '#E0E0E0',
  grayMedium: '#BDBDBD',
  grayText: '#757575',
  darkText: '#212121',
  cardShadow: '#000000',
  border: '#E8E8E8',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(TOKEN_KEY); } catch { }
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

const groupEventsByStatusAndFaculty = (events) => {
  const activos = events.filter(e => !isEventPast(e));
  const pasados = events.filter(e => isEventPast(e));

  const sections = [];
  
  if (activos.length > 0) {
    const groupedActivos = {};
    activos.forEach(event => {
      const faculty = event.faculty || event.facultad || 'Sin facultad';
      if (!groupedActivos[faculty]) groupedActivos[faculty] = [];
      groupedActivos[faculty].push(event);
    });
    
    sections.push({
      title: '📅 Eventos Activos',
      type: 'activos',
      isPastSection: false,
      data: Object.keys(groupedActivos).sort().flatMap(faculty => 
        groupedActivos[faculty].map(event => ({ ...event, _facultyGroup: faculty }))
      ),
      facultyGroups: Object.keys(groupedActivos).sort().map(faculty => ({
        faculty,
        count: groupedActivos[faculty].length,
        events: groupedActivos[faculty]
      }))
    });
  }
  
  if (pasados.length > 0) {
    const groupedPasados = {};
    pasados.forEach(event => {
      const faculty = event.faculty || event.facultad || 'Sin facultad';
      if (!groupedPasados[faculty]) groupedPasados[faculty] = [];
      groupedPasados[faculty].push(event);
    });
    
    sections.push({
      title: '🕰️ Eventos Finalizados',
      type: 'pasados',
      isPastSection: true,
      data: Object.keys(groupedPasados).sort().flatMap(faculty => 
        groupedPasados[faculty].map(event => ({ ...event, _facultyGroup: faculty }))
      ),
      facultyGroups: Object.keys(groupedPasados).sort().map(faculty => ({
        faculty,
        count: groupedPasados[faculty].length,
        events: groupedPasados[faculty]
      }))
    });
  }
  
  return sections;
};

const formatSubmittedDate = (date) => {
  if (!date) return 'N/A';
  const now = new Date();
  const submittedDate = new Date(date);
  const diff = Math.floor((now - submittedDate) / 1000);
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
};

const getFacultyColor = (facultyName) => {
  const colors = [
    '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
    '#00BCD4', '#009688', '#4CAF50', '#FF9800', '#FF5722'
  ];
  const hash = facultyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const EventosAprobadosPorFacultad = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    router.push({
      pathname: '/admin/EventDetailUpdateScreen',
      params: { eventId: event.id || event.idevento }
    });
  };

  const renderEventItem = ({ item }) => {
    if (!item || typeof item !== 'object' || (!item.id && !item.idevento)) {
      return null;
    }

    const eventId = item.id || item.idevento;
    const isPast = isEventPast(item);
    const facultyName = item._facultyGroup || item.faculty || item.facultad || 'Sin facultad';
    const facultyColor = getFacultyColor(facultyName);
    
    return (
      <TouchableOpacity
        style={[styles.eventCard, isPast && styles.eventCardPast]}
        onPress={() => !isPast && handleEventPress(item)}
        activeOpacity={0.8}
        disabled={isPast}
      >
        <View style={[
          styles.facultyBar,
          { backgroundColor: isPast ? COLORS.grayMedium : facultyColor }
        ]} />
        
        <View style={styles.cardContent}>
          <View style={styles.eventHeader}>
            <View style={styles.titleRow}>
              <Text style={[styles.eventTitle, isPast && styles.eventTitlePast]} numberOfLines={2}>
                {item.title || item.nombreevento || 'Sin título'}
              </Text>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>#{eventId}</Text>
              </View>
            </View>
            
            <View style={styles.badgeContainer}>
              <View style={[styles.monthBadge, { backgroundColor: isPast ? COLORS.grayMedium : COLORS.blue }]}>
                <Ionicons name="calendar" size={12} color={COLORS.white} />
                <Text style={styles.monthBadgeText}>
                  {isPast ? 'Finalizado' : 'Próximo'}
                </Text>
              </View>
              
              {/* ✅ NUEVO: Badge de Fase 2 */}
              {item.idfase === 2 && !isPast && (
                <View style={styles.fase2Badge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                  <Text style={styles.fase2Text}>Listo para publicar</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={isPast ? COLORS.grayMedium : COLORS.grayText} />
              <Text style={[styles.infoText, isPast && styles.infoTextPast]}>
                {item.date || (item.fechaevento ? new Date(item.fechaevento).toLocaleDateString('es-ES') : 'N/A')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={14} color={isPast ? COLORS.grayMedium : COLORS.grayText} />
              <Text style={[styles.infoText, isPast && styles.infoTextPast]}>{item.time || item.horaevento || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={isPast ? COLORS.grayMedium : COLORS.grayText} />
              <Text style={[styles.infoText, isPast && styles.infoTextPast]} numberOfLines={1}>
                {item.location || item.lugarevento || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color={isPast ? COLORS.grayMedium : COLORS.grayText} />
              <Text style={[styles.infoText, isPast && styles.infoTextPast]} numberOfLines={1}>
                {item.organizer || item.responsable_evento || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.phaseContainer}>
            <View style={styles.phaseBadge}>
              <Ionicons name="flag" size={12} color={isPast ? COLORS.grayMedium : COLORS.primary} />
              <Text style={[styles.phaseText, isPast && styles.infoTextPast]}>Fase {item.idfase || 1}</Text>
            </View>
            <View style={styles.submissionInfo}>
              <Text style={[styles.submittedBy, isPast && styles.infoTextPast]}>
                {item.submittedBy || item.organizador || 'Sistema'}
              </Text>
              <Text style={[styles.submittedDate, isPast && styles.infoTextPast]}>
                {formatSubmittedDate(item.submittedDate || item.created_at || item.fechaevento)}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => !isPast && handleEventPress(item)}
            disabled={isPast}
          >
            <Text style={[styles.viewDetailsText, isPast && styles.infoTextPast]}>
              {isPast ? 'Ver historial' : 'Ver detalles'}
            </Text>
            <Ionicons 
              name={isPast ? "archive-outline" : "chevron-forward"} 
              size={18} 
              color={isPast ? COLORS.grayMedium : COLORS.primary} 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => {
    return (
      <View style={[
        styles.sectionHeader,
        section.isPastSection && styles.sectionHeaderPast
      ]}>
        <View style={styles.sectionHeaderContent}>
          <View style={[
            styles.facultyDot, 
            { backgroundColor: section.isPastSection ? COLORS.grayMedium : COLORS.primary }
          ]} />
          <Text style={[
            styles.sectionTitle,
            section.isPastSection && styles.sectionTitlePast
          ]}>
            {section.title}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{section.data.length}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ✅ NUEVO: Header con Banner de Fase 2 + Estadísticas
  const renderListHeader = () => {
    const hasPhase2Events = events.some(e => e.idfase === 2);
    
    return (
      <>
        {hasPhase2Events && (
          <View style={styles.infoBanner}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Eventos Listos para Publicar</Text>
              <Text style={styles.bannerSubtitle}>
                Los eventos en Fase 2 han sido aprobados y están listos para ser publicados automáticamente.
              </Text>
            </View>
          </View>
        )}
        
        
        {events.length > 0 && (
          <View style={styles.topStatsContainer}>
            <View style={[styles.topStatCard, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="calendar" size={24} color={COLORS.white} />
              <Text style={styles.topStatNumber}>{events.length}</Text>
              <Text style={styles.topStatLabel}>Eventos totales</Text>
            </View>
            
            <View style={[styles.topStatCard, { backgroundColor: COLORS.accent }]}>
              <Ionicons name="school" size={24} color={COLORS.white} />
              <Text style={styles.topStatNumber}>{uniqueFaculties}</Text>
              <Text style={styles.topStatLabel}>Facultades</Text>
            </View>
          </View>
        )}
        {hasPhase2Events && (
          <View style={styles.infoBanner}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}> Eventos Completos</Text>
              <Text style={styles.bannerSubtitle}>
                El dia del evento se abrira el informe para su actualizacion.
              </Text>
            </View>
          </View>
        )}
      </>
    );
  };

  const renderListFooter = () => (
    events.length > 0 ? (
      <View style={styles.bottomStatsContainer}>
        <View style={[styles.bottomStatCard, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="calendar" size={20} color={COLORS.white} />
          <Text style={styles.bottomStatNumber}>{events.length}</Text>
          <Text style={styles.bottomStatLabel}>Total</Text>
        </View>
        
        <View style={[styles.bottomStatCard, { backgroundColor: COLORS.accent }]}>
          <Ionicons name="school" size={20} color={COLORS.white} />
          <Text style={styles.bottomStatNumber}>{uniqueFaculties}</Text>
          <Text style={styles.bottomStatLabel}>Facultades</Text>
        </View>
        
        <View style={[styles.bottomStatCard, { backgroundColor: COLORS.grayMedium }]}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.bottomStatNumber}>{finalizedCount}</Text>
          <Text style={styles.bottomStatLabel}>Finalizados</Text>
        </View>
      </View>
    ) : null
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando eventos...</Text>
      </View>
    );
  }

  const sections = groupEventsByStatusAndFaculty(events);
  const uniqueFaculties = new Set(events.map(e => e.faculty || e.facultad || 'Sin facultad')).size;
  const finalizedCount = events.filter(e => isEventPast(e)).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Eventos por Facultad</Text>
          <Text style={styles.headerSubtitle}>
            {uniqueFaculties} {uniqueFaculties === 1 ? 'facultad' : 'facultades'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={onRefresh} 
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={COLORS.white}
            style={refreshing && styles.rotating}
          />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => `event-${item.id || item.idevento || Math.random()}`}
        renderItem={renderEventItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={true}
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
              <Ionicons name="school-outline" size={80} color={COLORS.grayMedium} />
            </View>
            <Text style={styles.emptyTitle}>No hay eventos</Text>
            <Text style={styles.emptyText}>
              No se encontraron eventos aprobados organizados por facultad
            </Text>
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
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
  },
  rotating: {
    transform: [{ rotate: '180deg' }],
  },
  
  // ✅ NUEVOS ESTILOS: Banner de Fase 2
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  bannerText: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#558B2F',
    lineHeight: 16,
  },

  topStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  topStatCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
  },
  topStatLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 4,
    fontWeight: '600',
    opacity: 0.9,
  },
  bottomStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  bottomStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bottomStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 4,
  },
  bottomStatLabel: {
    fontSize: 10,
    color: COLORS.white,
    marginTop: 2,
    fontWeight: '500',
    opacity: 0.9,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeaderPast: {
    backgroundColor: '#f0f0f0',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  facultyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    flex: 1,
  },
  sectionTitlePast: {
    color: COLORS.grayText,
  },
  countBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContent: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  eventCardPast: {
    opacity: 0.75,
    backgroundColor: '#fafafa',
  },
  facultyBar: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  eventHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    flex: 1,
    marginRight: 8,
  },
  eventTitlePast: {
    color: COLORS.grayText,
  },
  idBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  
  // ✅ ACTUALIZADO: Contenedor de badges para soportar múltiples badges
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // ✅ NUEVO: Estilo del badge de Fase 2
  fase2Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  fase2Text: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },

  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.grayText,
    fontWeight: '500',
    flex: 1,
  },
  infoTextPast: {
    color: COLORS.grayMedium,
  },
  phaseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 12,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  submissionInfo: {
    alignItems: 'flex-end',
  },
  submittedBy: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.grayText,
  },
  submittedDate: {
    fontSize: 10,
    color: COLORS.grayMedium,
    marginTop: 2,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.grayText,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default EventosAprobadosPorFacultad;