// EventosAprobadosPorFacultad.js - Vista Mejorada
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

// Configuración de API
let determinedApiBaseUrl;
/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else {
  determinedApiBaseUrl = 'http://localhost:3001/api';
}*/
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';';//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FF7A3D',
  accent: '#4CAF50',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  success: '#2E7D32',
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

// Funciones de token
const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token:", e);
    }
  } else {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token:", e);
    }
  }
};

// Función para parsear fechas
const parseEventDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date(0);
  }
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date(0) : fallback;
};

// Función para formatear fecha de envío
const formatSubmittedDate = (date) => {
  const now = new Date();
  const submittedDate = new Date(date);
  const diff = Math.floor((now - submittedDate) / 1000);
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
};

// Función para agrupar por facultad
const groupEventsByFaculty = (events) => {
  const grouped = {};
  events.forEach(event => {
    const faculty = event.faculty || 'Sin facultad';
    if (!grouped[faculty]) {
      grouped[faculty] = [];
    }
    grouped[faculty].push(event);
  });

  return Object.keys(grouped)
    .sort()
    .map(title => ({ 
      title, 
      data: grouped[title],
      count: grouped[title].length 
    }));
};

// Colores dinámicos por facultad
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
  const [usuarioActual, setUsuarioActual] = useState({id: '', nombre: '', role: 'academico'});

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

      setEvents(response.data);

    } catch (error) {
      console.error('❌ Error:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        await deleteTokenAsync();
        Alert.alert('Sesión Expirada', 'Tu sesión ha expirado.', [
          { text: 'OK', onPress: () => router.replace('/LoginAdmin') }
        ]);
        return;
      }

      Alert.alert('Error', 'No se pudieron cargar los eventos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchApprovedEventsByFaculty();
  }, [fetchApprovedEventsByFaculty]);
useEffect(() => {
  const cargar = async () => {
    try {
      const data = Platform.OS === 'web'
        ? localStorage.getItem('usuario')
        : await AsyncStorage.getItem('usuario');
      if (data) setUsuarioActual(JSON.parse(data));
    } catch {}
  };
  cargar();
}, []);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApprovedEventsByFaculty();
  }, [fetchApprovedEventsByFaculty]);

  const handleEventPress = (event) => {
    router.push({
      pathname: '/admin/EventDetailUpdateScreen',
      params: { eventId: event.id,
         userId:       String(usuarioActual.id),
          userRole:     usuarioActual.role,
          userName:     usuarioActual.nombre,
          eventoNombre: item.title
       }
    });
  };

  const renderEventItem = ({ item, section }) => {
    if (!item || typeof item !== 'object' || typeof item.id === 'undefined') {
      return null;
    }

    const eventDate = parseEventDate(item.date);
    const isUpcoming = eventDate >= new Date();
    const facultyColor = getFacultyColor(section.title);
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.8}
      >
        {/* Barra lateral con color de facultad */}
        <View style={[styles.facultyBar, { backgroundColor: facultyColor }]} />
        
        <View style={styles.cardContent}>
          {/* Header con título e ID */}
          <View style={styles.eventHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>#{item.id}</Text>
              </View>
            </View>
            
            {isUpcoming && (
              <View style={styles.upcomingChip}>
                <Ionicons name="calendar" size={14} color={COLORS.white} />
                <Text style={styles.upcomingText}>Próximo</Text>
              </View>
            )}
          </View>

          {/* Información principal en dos columnas */}
          <View style={styles.mainInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.grayText} />
              <Text style={styles.infoText}>{item.date}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.grayText} />
              <Text style={styles.infoText}>{item.time}</Text>
            </View>
          </View>

          <View style={styles.mainInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.grayText} />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.grayText} />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.organizer}
              </Text>
            </View>
          </View>

          {/* Fase */}
          <View style={styles.phaseContainer}>
            <View style={styles.phaseBadge}>
              <Ionicons name="flag" size={12} color={COLORS.primary} />
              <Text style={styles.phaseText}>Fase {item.idfase || 1}</Text>
            </View>
            
            <View style={styles.submissionInfo}>
              <Text style={styles.submittedBy}>{item.submittedBy}</Text>
              <Text style={styles.submittedDate}>
                {formatSubmittedDate(item.submittedDate)}
              </Text>
            </View>
          </View>

         <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
  {/* Botón ver detalles */}
  <TouchableOpacity
    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
    onPress={() => !isPast && handleEventPress(item)}
    disabled={isPast}
  >
    <Text style={[styles.viewDetailsText, isPast && styles.infoTextPast]}>
      {isPast ? 'Ver historial' : 'Ver detalles'}
    </Text>
    <Ionicons name={isPast ? "archive-outline" : "chevron-forward"} size={18}
      color={isPast ? COLORS.grayMedium : COLORS.primary} />
  </TouchableOpacity>

  {/* ✅ Botón chat del comité */}
  {!isPast && (
    <TouchableOpacity
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.primary, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 6, gap: 4
      }}
      onPress={() => router.push({
        pathname: '/evento-chat',
        params: {
          eventoId:     String(item.id),
          userId:       'academico',      // reemplazar con usuario real
          userRole:     'academico',
          userName:     'Académico',
          eventoNombre: item.title
        }
      })}
    >
      <Ionicons name="chatbubbles-outline" size={16} color={COLORS.white} />
      <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>Chat Comité</Text>
    </TouchableOpacity>
  )}
</View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title, count } }) => {
    const facultyColor = getFacultyColor(title);
    
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <View style={[styles.facultyDot, { backgroundColor: facultyColor }]} />
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        </View>
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

  const upcomingCount = events.filter(e => parseEventDate(e.date) >= new Date()).length;
  const sections = groupEventsByFaculty(events);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Eventos por Facultad</Text>
          <Text style={styles.headerSubtitle}>
            {sections.length} {sections.length === 1 ? 'facultad' : 'facultades'}
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

      {/* Stats Cards */}
      {events.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
            <Ionicons name="calendar" size={24} color={COLORS.white} />
            <Text style={styles.statNumber}>{events.length}</Text>
            <Text style={styles.statLabel}>Total Eventos</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: COLORS.accent }]}>
            <Ionicons name="school" size={24} color={COLORS.white} />
            <Text style={styles.statNumber}>{sections.length}</Text>
            <Text style={styles.statLabel}>Facultades</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: COLORS.blue }]}>
            <Ionicons name="trending-up" size={24} color={COLORS.white} />
            <Text style={styles.statNumber}>{upcomingCount}</Text>
            <Text style={styles.statLabel}>Próximos</Text>
          </View>
        </View>
      )}

      {/* Lista de eventos */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => `event-${item.id}`}
        renderItem={renderEventItem}
        renderSectionHeader={renderSectionHeader}
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
  
  // Header
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

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
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
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.white,
    marginTop: 4,
    fontWeight: '600',
    opacity: 0.9,
  },

  // Section Header
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
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

  // Event Card
  listContent: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.darkText,
    flex: 1,
    marginRight: 8,
  },
  idBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  upcomingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // Info
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.grayText,
    fontWeight: '500',
    flex: 1,
  },
  
  // Phase
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
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  submissionInfo: {
    alignItems: 'flex-end',
  },
  submittedBy: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.grayText,
  },
  submittedDate: {
    fontSize: 11,
    color: COLORS.grayMedium,
    marginTop: 2,
  },
  
  // Footer Button
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

  // Empty State
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