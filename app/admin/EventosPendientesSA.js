import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configuración de API
let determinedApiBaseUrl;
/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else {
  determinedApiBaseUrl = 'http://localhost:3001/api';
}*/
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

// Paleta de colores actualizada con tu naranja principal
const COLORS = {
  accent: '#FF6B35',        // Tu color naranja principal
  secondary: '#F7931E',     // Naranja secundario
  primary: '#FF6B35',       // Tu color como primario
  background: '#FFF8F5',    // Fondo cálido naranja muy claro
  surface: '#ffffff',
  success: '#27ae60',
  warning: '#f39c12',
  info: '#3498db',
  purple: '#9b59b6',
  white: '#fff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  cardShadow: '#000000',
  orangeLight: '#FFE4D6',   // Naranja muy claro
  orangeDark: '#E55A2B',    // Naranja más oscuro
};

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

const EventosPendientesSA = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);



  const fetchPendingEvents = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        router.replace('/LoginAdmin');
        return;
      }

      // Llamada real a la API (descomentarla cuando esté lista)
       const response = await axios.get(`${API_BASE_URL}/eventos/pendientes`, {
         headers: { 'Authorization': `Bearer ${token}` }
       });
       setEvents(response.data.events);


    } catch (error) {
      console.error('Error al cargar eventos pendientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los eventos pendientes.');
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        await deleteTokenAsync();
        router.replace('/LoginAdmin');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPendingEvents();
  }, [fetchPendingEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPendingEvents();
  }, [fetchPendingEvents]);

  const handleEventPress = (event) => {
    router.push({
      pathname: '/admin/EventDetailScreen',
      params: { eventId: event.id }
    });
  };

  const handleQuickAction = async (eventId, action) => {
    Alert.alert(
      `${action} Evento`,
      `¿Estás seguro de que deseas ${action.toLowerCase()} este evento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const token = await getTokenAsync();
              
               await axios.put(`${API_BASE_URL}/eventos/${eventId}/${action.toLowerCase()}`, {}, {
                 headers: { 'Authorization': `Bearer ${token}` }
               });

              Alert.alert('Éxito', `Evento ${action.toLowerCase()} correctamente`);
              
              // Actualizar la lista
              setEvents(prev => prev.filter(event => event.id !== eventId));
              if(action==='aprobar'){
                Alert.alert('Éxito', 'Evento aprobado correctamente', [
                { text: 'Ver eventos aceptados', onPress: () => router.replace('/admin/EventosAceptados') },
                { text: 'Volver', onPress: () => router.back(), style: 'cancel' }
]);
              }
            } catch (error) {
              console.error('error al procesar',error);
              Alert.alert('Error', `No se pudo ${action.toLowerCase()} el evento`);
            }
          }
        }
      ]
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return COLORS.accent;      // Naranja principal
      case 'media': return COLORS.warning;    // Amarillo
      case 'baja': return COLORS.info;        // Azul
      default: return COLORS.grayText;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'alta': return 'Alta';
      case 'media': return 'Media';
      case 'baja': return 'Baja';
      default: return 'Normal';
    }
  };

  const formatSubmittedDate = (date) => {
    const now = new Date();
    const submittedDate = new Date(date);
    const diff = Math.floor((now - submittedDate) / 1000);

    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    const days = Math.floor(diff / 86400);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => handleEventPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventTitleContainer}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {getPriorityText(item.priority)}
            </Text>
          </View>
        </View>
        
        
      </View>

      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>
     
      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.accent} />
          <Text style={styles.detailText}>{item.date} - {item.time}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.accent} />
          <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.accent} />
          <Text style={styles.detailText}>Organiza: {item.organizer}</Text>
        </View>
      </View>

      <View style={styles.eventFooter}>
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        
        <View style={styles.submissionInfo}>
          <Text style={styles.submittedBy}>Por: {item.submittedBy}</Text>
          <Text style={styles.submittedDate}>{formatSubmittedDate(item.submittedDate)}</Text>
        </View>
      </View>

      <View style={styles.viewDetailsPrompt}>
        <Text style={styles.viewDetailsText}>Toca para ver detalles completos</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.grayText} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Cargando eventos pendientes...</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.header}>
        
        <Text style={styles.headerTitle}>Eventos Pendientes</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {events.length > 0 && (
        <View style={styles.summaryBanner}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.summaryText}>
            {events.length} evento{events.length !== 1 ? 's' : ''} pendiente{events.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id.toString()} 
        style={styles.eventsList}
        contentContainerStyle={styles.eventsListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={60} color={COLORS.grayText} />
            <Text style={styles.emptyTitle}>Sin eventos aprobados</Text>
            <Text style={styles.emptyText}>No hay eventos aprobados por el momento</Text>
          </View>
        }
      />
    </View>
  );
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.accent} />
      
      {/* Header con tu color naranja */}
    

      {events.length > 0 && (
        <View style={styles.summaryBanner}>
          <Ionicons name="time" size={20} color={COLORS.accent} />
          <Text style={styles.summaryText}>
            {events.length} evento{events.length !== 1 ? 's' : ''} esperando tu aprobación
          </Text>
        </View>
      )}

      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        style={styles.eventsList}
        contentContainerStyle={styles.eventsListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={60} color={COLORS.success} />
            <Text style={styles.emptyTitle}>¡Todo al día!</Text>
            <Text style={styles.emptyText}>No hay eventos pendientes de aprobación</Text>
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
  },
  header: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  refreshButton: {
    padding: 8,
  },
  summaryBanner: {
    backgroundColor: COLORS.orangeLight,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  summaryText: {
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.orangeDark,
    fontWeight: '600',
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 6,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.accent,
  },
  eventDescription: {
    fontSize: 14,
    color: COLORS.grayText,
    lineHeight: 20,
    marginBottom: 16,
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.darkText,
    marginLeft: 8,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  categoryContainer: {
    backgroundColor: COLORS.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.orangeDark,
    fontWeight: '600',
  },
  submissionInfo: {
    alignItems: 'flex-end',
  },
  submittedBy: {
    fontSize: 12,
    color: COLORS.grayText,
    fontWeight: '500',
  },
  submittedDate: {
    fontSize: 11,
    color: COLORS.grayText,
    marginTop: 2,
  },
  viewDetailsPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  viewDetailsText: {
    fontSize: 12,
    color: COLORS.grayText,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.grayText,
    textAlign: 'center',
  },
});

export default EventosPendientesSA;