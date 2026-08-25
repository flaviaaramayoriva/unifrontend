// app/admin/Contenido.js
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

let determinedApiBaseUrl;

/*if (Platform.OS === 'web') {
  // ✅ Verificar que window existe antes de usarlo
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      determinedApiBaseUrl = 'http://localhost:3001/api';
    } else {
      determinedApiBaseUrl = `${origin}/api`;
    }
  } else {
    // Fallback si window no está disponible
    determinedApiBaseUrl = 'http://localhost:3001/api';
  }
} else if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://10.0.2.2:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://localhost:3001/api';
} else {
  determinedApiBaseUrl = 'http://localhost:3001/api';
}*/

const API_BASE_URL =  'https://evento.cidtec-uc.com';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#0052A0',
  secondary: '#2980b9',
  accent: '#e74c3c',
  background: '#f8fafc',
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
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      // ✅ Verificar que window y localStorage existen
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(TOKEN_KEY);
      }
      return null;
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

const ContenidoScreen = () => {
  const router = useRouter();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEventosNoAprobados = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        router.replace('/LoginAdmin');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/eventos/pendientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Ajusta según la estructura real de tu API
      // Si tu API devuelve { eventos: [...] }, usa response.data.eventos
      // Si devuelve directamente el array, usa response.data
      setEventos(response.data.eventos || response.data);
    } catch (err) {
      console.error('Error al cargar eventos pendientes:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        Alert.alert('Acceso Denegado', 'No tienes permiso o tu sesión expiró.');
        router.replace('/LoginAdmin');
      } else {
        Alert.alert('Error', 'No se pudieron cargar los eventos pendientes.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);
  
  useEffect(() => {
    fetchEventosNoAprobados();
  }, [fetchEventosNoAprobados]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEventosNoAprobados();
  }, [fetchEventosNoAprobados]);


// Función para crear notificación
const crearNotificacion = async (token, datosNotificacion) => {
  try {
    await axios.post(`${API_BASE_URL}/notificaciones`, datosNotificacion, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    // No bloqueamos la aprobación si falla la notificación
  }
};

// Función para aprobar evento
const aprobarEvento = async (eventoId, organizadorId, tituloEvento) => {
  Alert.alert(
    'Aprobar Evento',
    '¿Estás seguro de que deseas aprobar este evento?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: async () => {
          try {
            const token = await getTokenAsync();
            
            // 1. Aprobar el evento
            await axios.put(`${API_BASE_URL}/eventos/${eventoId}/aprobar`, {}, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            // 2. Crear notificación PARA EL ORGANIZADOR
            await crearNotificacion(token, {
              userId: organizadorId,
              userRole: 'estudiante', // Ajusta según tu lógica
              title: '🎉 Evento aprobado',
              message: `Tu evento "${tituloEvento}" ha sido aprobado por el administrador.`,
              type: 'aprobacion'
            });

            Alert.alert('Éxito', 'Evento aprobado correctamente');
            setEventos(prev => prev.filter(evento => evento.id !== eventoId));
            
          } catch (error) {
            console.error('Error al aprobar evento:', error);
            Alert.alert('Error', 'No se pudo aprobar el evento');
          }
        }
      }
    ]
  );
};

// Función para rechazar evento
const rechazarEvento = async (eventoId, organizadorId, tituloEvento) => {
  Alert.alert(
    'Rechazar Evento',
    '¿Estás seguro de que deseas rechazar este evento?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getTokenAsync();
            
            // 1. Rechazar el evento
            await axios.put(`${API_BASE_URL}/eventos/${eventoId}/rechazar`, {}, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            // 2. Crear notificación PARA EL ORGANIZADOR
            await crearNotificacion(token, {
              userId: organizadorId,
              userRole: 'estudiante', // Ajusta según tu lógica
              title: '❌ Evento rechazado',
              message: `Tu evento "${tituloEvento}" ha sido rechazado por el administrador.`,
              type: 'rechazo'
            });

            Alert.alert('Evento Rechazado', 'El evento ha sido rechazado');
            setEventos(prev => prev.filter(evento => evento.id !== eventoId));
            
          } catch (error) {
            console.error('Error al rechazar evento:', error);
            Alert.alert('Error', 'No se pudo rechazar el evento');
          }
        }
      }
    ]
  );
};
  // Función para ver detalles del evento
  const verDetalles = (evento) => {
    router.push({
      pathname: '/admin/EventoDetalle',
      params: { eventId: evento.id }
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Hora no especificada';
    return timeString;
  };

  const renderEventoItem = ({ item }) => (
    <View style={styles.eventoCard}>
      <View style={styles.eventoHeader}>
        <View style={styles.eventoTitleContainer}>
          <Text style={styles.eventoTitle}>{item.titulo || item.title}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pendiente</Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => aprobarEvento(
              item.id, 
              item.idorganizador || item.organizadorId || 1, 
              item.titulo || item.title
            )}
          >
            <Ionicons name="checkmark" size={16} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => rechazarEvento(
              item.id, 
              item.idorganizador || item.organizadorId || 1, 
              item.titulo || item.title  
            )}
          >
            <Ionicons name="close" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Descripción */}
      <Text style={styles.eventoDescription} numberOfLines={3}>
        {item.descripcion || item.description || 'Sin descripción disponible'}
      </Text>

      {/* Detalles del evento */}
      <View style={styles.eventoDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.info} />
          <Text style={styles.detailText}>
            {formatDate(item.fecha || item.date)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.info} />
          <Text style={styles.detailText}>
            {formatTime(item.hora || item.time)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.info} />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.ubicacion || item.location || 'Ubicación no especificada'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.info} />
          <Text style={styles.detailText}>
            Creado por: {item.creador || item.creator || item.organizer || 'Usuario desconocido'}
          </Text>
        </View>
      </View>

      {/* Footer con botón de ver detalles */}
      <TouchableOpacity
        style={styles.verDetallesButton}
        onPress={() => verDetalles(item)}
      >
        <Text style={styles.verDetallesText}>Ver detalles completos</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando eventos pendientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Contenido</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Banner de resumen */}
      {eventos.length > 0 && (
        <View style={styles.summaryBanner}>
          <Ionicons name="document-text" size={20} color={COLORS.warning} />
          <Text style={styles.summaryText}>
            {eventos.length} evento{eventos.length !== 1 ? 's' : ''} esperando aprobación
          </Text>
        </View>
      )}

      {/* Lista de eventos */}
      <FlatList
        data={eventos}
        renderItem={renderEventoItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.eventosList}
        contentContainerStyle={styles.eventosListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={60} color={COLORS.success} />
            <Text style={styles.emptyTitle}>¡Todo al día!</Text>
            <Text style={styles.emptyText}>No hay eventos pendientes de aprobación</Text>
            <TouchableOpacity
              style={styles.refreshEmptyButton}
              onPress={onRefresh}
            >
              <Text style={styles.refreshEmptyButtonText}>Actualizar</Text>
            </TouchableOpacity>
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
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
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
    backgroundColor: '#fff3cd',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  summaryText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  eventosList: {
    flex: 1,
  },
  eventosListContent: {
    padding: 16,
  },
  eventoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
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
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventoTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  eventoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  actionButtons: {
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
  eventoDescription: {
    fontSize: 14,
    color: COLORS.grayText,
    lineHeight: 20,
    marginBottom: 16,
  },
  eventoDetails: {
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
  verDetallesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  verDetallesText: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 4,
    fontWeight: '500',
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
    marginBottom: 20,
  },
  refreshEmptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshEmptyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ContenidoScreen;