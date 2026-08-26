// app/admin/EventosAprobados.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
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
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

// Nueva paleta de colores para diferenciar de "Pendientes"
const COLORS = {
  primary: '#2E7D32',       // Verde oscuro para aprobados
  accent: '#4CAF50',        // Verde principal
  background: '#F1F8E9',    // Fondo verde muy claro
  surface: '#ffffff',
  success: '#2E7D32',
  warning: '#f39c12',
  info: '#3498db',
  purple: '#9b59b6',
  white: '#fff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  cardShadow: '#000000',
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

const EventosAprobadosDaf = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApprovedEvents = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        router.replace('/LoginAdmin');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/eventos/aprobados`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const normalizedEvents = (response.data || []).map(event => ({
        id: event.idevento,
        title: event.nombreevento || 'Sin título',
        description: event.descripcion || 'Sin descripción',
        date: event.fechaevento,
        time: event.horaevento,
        location: event.lugarevento || 'Sin ubicación',
        organizer: event.responsable_evento || 'Sin organizador',
        attendees: event.participantes_esperados || 'No especificado',
        status: event.estado || 'aprobado',
        category: 'General',
        submittedDate: event.created_at || event.fechaevento,
        submittedBy: event.responsable_evento || 'Sistema',
      }));

      setEvents(normalizedEvents);
    } catch (error) {
      console.error('Error al cargar eventos aprobados:', error);
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
    fetchApprovedEvents();
  }, [fetchApprovedEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApprovedEvents();
  }, [fetchApprovedEvents]);

  const handleEventPress = (event) => {
    router.push({
      pathname: '/admin/EventDetailUpdateScreen', // <-- Ruta actualizada
      params: { eventId: event.id }
    });
  };
const reenviarNotificacion = async (eventoId, userId) => {
  try {
    const token = await getTokenAsync();
    await axios.post(
      `${API_BASE_URL}/notificaciones/reenviar`,
      { eventoId, userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert('Notificación reenviada');
  } catch (error) {
    console.error('Error al reenviar notificación:', error);
    alert('No se pudo reenviar la notificación');
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
          {/* Icono de check en lugar de badge */}
          <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
        </View>
      </View>

      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={COLORS.primary} />
          <Text style={styles.detailText}>Fecha: {item.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={COLORS.primary} />
          <Text style={styles.detailText}>Hora: {item.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color={COLORS.primary} />
          <Text style={styles.detailText} numberOfLines={1}>Lugar: {item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color={COLORS.primary} />
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
        <Text style={styles.viewDetailsText}>Ver o actualizar detalles</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.grayText} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Cargando eventos aprobados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Eventos Aprobados</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {events.length > 0 && (
        <View style={styles.summaryBanner}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.summaryText}>
            {events.length} evento{events.length !== 1 ? 's' : ''} aprobado{events.length !== 1 ? 's' : ''}
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
    backgroundColor: COLORS.primary, // Verde oscuro
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 15,
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
    backgroundColor: COLORS.accent, // Verde sólido
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  summaryText: {
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.white, // Texto blanco
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
    // ✅ Sin borde izquierdo para diferenciar
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
    alignItems: 'center', // Centrado verticalmente con el ícono
    marginBottom: 12,
  },
  eventTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 0, // Sin margen inferior
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
    backgroundColor: COLORS.background, // Fondo del mismo color que la app
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.primary, // Verde oscuro
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
    color: COLORS.grayText,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.grayText,
    textAlign: 'center',
  },
});

export default EventosAprobadosDaf;