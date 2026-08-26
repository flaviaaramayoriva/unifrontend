
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configuración de API (sin cambios)
let determinedApiBaseUrl;
/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
}*/
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL =  'unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'acadAuthToken';

// Funciones para manejo de tokens (sin cambios)
const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al acceder a localStorage en web:", e);
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
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token de localStorage en web:", e);
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
  accent: '#0052A0',
  secondary: '#2980b9',
  primary: '#E95A0C',
  background: '#f8fafc',
  surface: '#ffffff',
  success: '#27ae60',
  warning: '#f39c12',
  info: '#3498db',
  purple: '#9b59b6',
  logout: '#e74c3c',
  white: '#fff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  overlay: 'rgba(15, 23, 42, 0.7)',
  cardShadow: '#000000',
  notificationUnread: '#e6f0ff',
  notificationRead: '#ffffff',
};

// Funciones para formatear fecha y tiempo (sin cambios)
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

const EventDetailScreen = () => {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user,setUser]= useState(null);

  const fetchEventDetails = useCallback(async () => {

      let processedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
    if (typeof processedEventId === 'string' && processedEventId.startsWith('event-')) {
      processedEventId = processedEventId.replace('event-', '');

    } 
    const numericId = Number(processedEventId);
    if (isNaN(numericId) || !processedEventId) {
      const validationError = 'ID de evento inválido.';
      console.log('Frontend: ID inválido. Error:', validationError);
      setError(validationError);
      setLoading(false);
      console.log('--- Frontend: fetchEventDetails END (Invalid ID) ---');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        await deleteTokenAsync();
        router.replace('/Login');
        return;
      }
      const [eventResponse, userResponse]= await Promise.all([
       
       await axios.get( `${API_BASE_URL}/eventos/${numericId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchUserDetails(token)
      ]);


      console.log('Frontend: Successful response status:', eventResponse.status);
      console.log('Frontend: Data received (first 200 chars):', JSON.stringify(eventResponse.data).substring(0, 200));
      
      const eventData = eventResponse.data;
      console.log('Frontend: Data received usuarios:', JSON.stringify(userResponse));
      if (!eventData || typeof eventData !== 'object'|| Object.keys(eventData).length === 0) {
        throw new Error('Datos de evento vacíos o inválidos del servidor.');
      }

      const transformedEvent = {
        id: eventData.idevento || null,
        title: eventData.nombreevento || 'Sin título',
        description: eventData.descripcion || 'Sin descripción disponible',
        date: formatDate(eventData.fechaevento),
        time: formatTime(eventData.horaevento),
        location: eventData.lugarevento || 'Ubicación no especificada',
        organizer: eventData.responsable_evento || 'Organizador no especificado',
        attendees: eventData.participantes_esperados || 'No especificado',
        status: eventData.estado || 'pendiente',
        imageUrl: eventData.imagenUrl || null,
        objetivos: eventData.Objetivos || [],
        resultados: eventData.Resultados || [],
        recursos: eventData.Recursos || [],
        tags: eventData.tags || [],
         academicoCreador: eventData.academicoCreador ? {
    nombre:[eventData.academicoCreador.nombre,
            eventData.academicoCreador.apellidopat || '',
            eventData.academicoCreador.apellidomat || '',].filter(Boolean).join(' ') || eventData.academicoCreador.nombre || 'Usuario sin nombre',
  email: eventData.academicoCreador.email,
  role: eventData.academicoCreador.role
} : null
      };

      if (!transformedEvent.id) {
        throw new Error('El evento no tiene un ID válido.');
      }
console.log('Datos del evento transformados:', transformedEvent);
      setEvent(transformedEvent);
      console.log('Frontend: Event details set successfully.');
    } catch (err) {
      console.error('Frontend: Error loading event details:', err);
      if (err.response) {
        console.error('Frontend: Error response status:', err.response.status);
        console.error('Frontend: Error response data:', err.response.data);
      } else if (err.request) {
        console.error('Frontend: No response received:', err.request);
      } else {
        console.error('Frontend: Error setting up request:', err.message);
      }

      let errorMessage = `Error al cargar evento: ${err.message}`;
      /*if (err.response?.status === 401 || err.response?.status === 403) {
        Alert.alert('Acceso Denegado', 'No tienes permiso para ver este recurso o tu sesión ha expirado.');
        await deleteTokenAsync();
        router.replace('/LoginAdmin');
        errorMessage = 'Sesión expirada. Redirigiendo...';
      } else if (err.response?.status === 404) {
        errorMessage = 'Evento no encontrado. Verifica si el ID es correcto (ej: 12345).';
      }*/
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('--- Frontend: fetchEventDetails END ---');
    }
  }, [eventId, router]);

  const fetchUserDetails= async(token)=>{
    try{
      const response= await axios.get(`${API_BASE_URL}/auth/me`, {
        headers:{Authorization:`Bearer ${token}`}
      });
      setUser(response.data);
      return response.data;
    }catch(err){
      console.error('Error al cargar datos del usuario', err);
      return null;
    }
  };
  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    } else {
      setError('No se proporcionó un ID de evento.');
      setLoading(false);
    }
  }, [fetchEventDetails, eventId]);

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
        <TouchableOpacity style={styles.retryButton} onPress={fetchEventDetails}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event || Object.keys(event).length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="information-circle-outline" size={50} color={COLORS.grayText} />
        <Text style={styles.errorText}>No se encontraron datos del evento.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
    

      {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />}

      <View style={styles.card}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDescription}>{event.description}</Text>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
          <Text style={styles.detailText}>Fecha: {event.date}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
          <Text style={styles.detailText}>Hora: {event.time}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
          <Text style={styles.detailText}>Ubicación: {event.location}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
          <Text style={styles.detailText}>Organizador: {event.organizer}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
          <Text style={styles.detailText}>Asistentes: {event.attendees}</Text>
        </View>
       

        <View style={styles.detailRow}>
          <Ionicons
            name={event.status === 'aprobado' ? 'checkmark-circle-outline' : 'time-outline'}
            size={20}
            color={event.status === 'aprobado' ? COLORS.success : COLORS.warning}
            style={styles.detailIcon}
          />
          <Text style={[
            styles.detailText,
            { color: event.status === 'aprobado' ? COLORS.success : COLORS.warning }
          ]}>
            Estado: {event.status}
          </Text>
        </View>
      {event.academicoCreador ? (
        <View style={styles.creatorContainer}>
          <Text style={styles.creatorLabel}>Propuesto por:</Text>
          <Text style={styles.creatorName}>
            {[
              event.academicoCreador.nombre,
              event.academicoCreador.apellidopat,
              event.academicoCreador.apellidomat
            ]
              .filter(Boolean)
              .join(' ') || 'Usuario sin nombre'}
          </Text>
          <Text style={styles.creatorRole}>
            Rol: {event.academicoCreador.role === 'academico' ? 'Académico' : event.academicoCreador.role}
          </Text>
          <Text style={styles.creatorEmail}>Email: {event.academicoCreador.email}</Text>
        </View>
      ) : (
        <View style={styles.creatorContainer}>
          <Text style={styles.creatorLabel}>Propuesto por:</Text>
          <Text style={styles.creatorName}>Académico no especificado</Text>
        </View>
      )}
        {/* Mostrar objetivos si existen */}
        {event.objetivos && event.objetivos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objetivos:</Text>
            {event.objetivos.map((objetivo, index) => (
              <Text key={index} style={styles.objectiveText}>
                • {objetivo.texto_personalizado || 'Objetivo sin descripción'}
              </Text>
            ))}
          </View>
        )}

        {/* Mostrar resultados esperados si existen */}
        {event.resultados && event.resultados.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultados Esperados:</Text>
            {event.resultados.map((resultado, index) => (
              <View key={index}>
                {resultado.participacion_esperada && (
                  <Text style={styles.resultText}>
                    • Participación: {resultado.participacion_esperada}
                  </Text>
                )}
                {resultado.satisfaccion_esperada && (
                  <Text style={styles.resultText}>
                    • Satisfacción: {resultado.satisfaccion_esperada}
                  </Text>
                )}
                {resultado.otros_resultados && (
                  <Text style={styles.resultText}>
                    • Otros: {resultado.otros_resultados}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {event.tags && event.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {event.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Botones de acción para administrador */}
        {event.status !== 'Aprobado' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.approveButton} onPress={handleApproveEvent}>
              <Ionicons name="checkmark-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Aprobar</Text>
            </TouchableOpacity>

     
            <TouchableOpacity style={styles.rejectButton} onPress={handleRejectEvent}>
              <Ionicons name="close-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => router.push(`/admin/EditEvent?eventId=${event.id}`)}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.white} />
          <Text style={styles.editButtonText}>Editar Evento</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
EventDetailScreen.options = {
  headerShown: false,
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.grayText,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 10,
    backgroundColor: COLORS.grayLight,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.darkText,
    fontSize: 16,
  },
  backArrow: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 5,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  creatorContainer: {
  marginTop: 15,
  padding: 15,
  backgroundColor: COLORS.grayLight,
  borderRadius: 8,
},
creatorLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: COLORS.darkText,
  marginBottom: 5,
},
creatorName: {
  fontSize: 16,
  color: COLORS.darkText,
  fontWeight: '500',
  marginBottom: 3,
},
creatorRole: {
  fontSize: 14,
  color: COLORS.grayText,
  marginBottom: 3,
},
creatorEmail: {
  fontSize: 14,
  color: COLORS.grayText,
  fontStyle: 'italic',
},
  eventImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    marginBottom: 20,
  },
  card: {
    width: '90%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 10,
  },
  eventDescription: {
    fontSize: 16,
    color: COLORS.grayText,
    lineHeight: 24,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailText: {
    fontSize: 16,
    color: COLORS.darkText,
    flex: 1,
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 8,
  },
  objectiveText: {
    fontSize: 14,
    color: COLORS.grayText,
    marginBottom: 4,
    paddingLeft: 10,
  },
  userInfoContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 15,
  padding: 10,
  backgroundColor: COLORS.orangeLight,
  borderRadius: 8,
},
userInfoLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: COLORS.orangeDark,
},
userInfoValue: {
  fontSize: 14,
  color: COLORS.darkText,
},
  resultText: {
    fontSize: 14,
    color: COLORS.grayText,
    marginBottom: 4,
    paddingLeft: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.grayText,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  approveButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.48,
  },
  rejectButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.48,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default EventDetailScreen;