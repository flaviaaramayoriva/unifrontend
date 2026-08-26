
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
import CustomAlert from '../../components/CustomAlert';
import { useFocusEffect } from '@react-navigation/native';

// Configuración de API (sin cambios)
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
  const [user, setUser] = useState(null);
  const [showApproveAlert, setShowApproveAlert] = useState(false);
  const [showRejectAlert, setShowRejectAlert] = useState(false);
const getCurrentPhaseFromFases = useCallback((fases) => {
  // Si no hay fases, asumimos fase 1 (Planeación)
  if (!Array.isArray(fases) || fases.length === 0) {
    return {
      number: 1,
      label: 'Planeación',
      key: 'phase1',
      color: COLORS.info,
      icon: 'document-text-outline',
    };
  }

  const faseToShow = fases[0];

  // Mapeo de fases conocidas
  const phaseConfig = {
    1: { label: 'Planeación', icon: 'document-text-outline', color: COLORS.info },
    2: { label: 'Revisión y aprobación', icon: 'clipboard-outline', color: COLORS.secondary },
    3: { label: 'Programación del evento', icon: 'calendar-outline', color: COLORS.success },
    4: { label: 'Ejecución', icon: 'play-circle-outline', color: COLORS.purple },
    5: { label: 'Cierre y evaluación', icon: 'checkmark-done-outline', color: COLORS.grayText },
  };

  const config = phaseConfig[faseToShow.nrofase] || {
    label: `Fase ${faseToShow.nrofase}`,
    icon: 'help-circle-outline',
    color: COLORS.grayText,
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
    let processedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
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
console.log('ObjetivosPDI del backend:', eventData.ObjetivosPDI);
console.log('objetivos_pdi del backend:', eventData.objetivos_pdi);
      if (!eventData || typeof eventData !== 'object' || Object.keys(eventData).length === 0) {
        throw new Error('Datos de evento vacíos o inválidos del servidor.');
      }

      const transformedEvent = {
  id: eventData.idevento || null,
  title: eventData.nombreevento || 'Sin título',
  date: formatDate(eventData.fechaevento),
  time: formatTime(eventData.horaevento),
  location: eventData.lugarevento || 'Ubicación no especificada',
  organizer: eventData.responsable_evento || 'Organizador no especificado',
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
    argumentacion: eventData.argumentacion ? String(eventData.argumentacion).trim() : null,
  
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


  }, [eventId, router]);

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
  if (event) {
    console.log('🔍 EVENTO COMPLETO:', JSON.stringify(event, null, 2));
    console.log('🔍 Fases:', event.fases);
    console.log(' Primera fase:', event.fases?.[0]);
    console.log('🔍 nrofase:', event.fases?.[0]?.nrofase);
  }
  if (eventId) {
    fetchEventDetails();
  } else {
    setError('No se proporcionó un ID de evento.');
    setLoading(false);
  }
}, [fetchEventDetails, eventId]);

  const handleApproveEvent = async () => {
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');

      await axios.put(
        `${API_BASE_URL}/eventos/${event.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Éxito', 'Evento aprobado correctamente');
      router.replace('./EventosPendientes.js');
    } catch (error) {
      console.error('Approve error:', error);
      Alert.alert('Error', 'No se pudo aprobar el evento: ' + error.message);
    }
  };

  const handleRejectEvent = async () => {
    if (!event || !event.id) {
      Alert.alert('Error', 'No hay evento cargado para rechazar.');
      return;
    }

    Alert.alert(
      'Rechazar Evento',
      '¿Estás seguro de que quieres rechazar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getTokenAsync();
              if (!token) throw new Error('Token inválido');
              await axios.put(
                `${API_BASE_URL}/eventos/${event.id}/reject`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert('Evento Rechazado', 'El evento ha sido rechazado');
              router.back();
            } catch (error) {
              console.error('Reject error:', error);
              Alert.alert('Error', 'No se pudo rechazar el evento: ' + error.message);
            }
          },
        },
      ]
    );
  };

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
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Evento</Text>
        <TouchableOpacity onPress={fetchEventDetails}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />}

        <View style={styles.card}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          
        {event && (() => {
        const phaseInfo = getCurrentPhaseFromFases([{ nrofase: event.idfase }]);
        return (
          <View style={[styles.phaseBadge, { backgroundColor: phaseInfo.color }]}>
            <Ionicons name={phaseInfo.icon} size={16} color={COLORS.white} />
            <Text style={styles.phaseBadgeText}>
              Fase {phaseInfo.number}: {phaseInfo.label}
            </Text>
          </View>
        );
      })()}
        </View>
 <View style={styles.sectionCard}>
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
        </View>
        {/* Datos Generales */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Datos Generales</Text>
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
        </View>

        {/* Creador */}
        {event.creador && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Propuesto por</Text>
            <Text style={styles.creatorName}>{event.creador.nombre}</Text>
            <Text style={styles.creatorRole}>Rol: {event.creador.role}</Text>
            <Text style={styles.creatorEmail}>Email: {event.creador.email}</Text>
          </View>
        )}

        {/* Clasificación Estratégica */}
        {event.Clasificacion && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Clasificación Estratégica</Text>
            <Text style={styles.detailText}>
              • {event.Clasificacion.nombreClasificacion} - {event.Clasificacion.nombresubcategoria}
            </Text>
          </View>
        )}

        {/* Tipos de Evento */}
        {event.tiposEvento && event.tiposEvento.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tipos de Evento</Text>
            {event.tiposEvento.map((tipo, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>
                  {tipo.nombretipo || `Tipo ID ${tipo.idtipoevento}`}
                </Text>
              </View>
            ))}
          </View>
        )}

{/* Objetivos Principales */}
{(() => {
  console.log('🔍 Objetivos raw:', event.objetivos);
  const validObjectives = event.objetivos?.filter(obj => {
    const nombre = (obj.nombre_objetivo || '').toLowerCase();
    const hasText = obj.texto_personalizado && obj.texto_personalizado.trim() !== '';
    const isValidName = nombre && nombre !== 'argumentacion' && nombre !== 'otro' && !nombre.includes('sin tipo');
    
    return hasText || isValidName;
  }) || [];

  if (validObjectives.length === 0) return null;

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Objetivos Principales</Text>
      {validObjectives.map((obj, index) => {
        // Priorizar texto personalizado, si no, usar nombre del objetivo
        const displayText = (obj.texto_personalizado && obj.texto_personalizado.trim() !== '') 
          ? obj.texto_personalizado 
          : obj.nombre_objetivo;
          
        return (
          <View key={index} style={styles.listItem}>
            <Ionicons name="bulb-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
            <Text style={styles.listText}>
              {displayText}
            </Text>
          </View>
        );
      })}
    </View>
  );
})()}

{(() => {
  // Buscar argumentación en los objetivos (está dentro de cada objetivo, no en el root)
  const argumentacion = event.objetivos?.find(obj => 
    obj.argumentacion && obj.argumentacion.trim() !== ''
  )?.argumentacion;

  if (!argumentacion) return null;

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Argumentación</Text>
      <Text style={styles.argumentacionText}>
        {argumentacion}
      </Text>
    </View>
  );
})()}

        {event.objetivosPDI && event.objetivosPDI.length > 0 && (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Objetivos del PDI Institucional</Text>
    {event.objetivosPDI
      .filter(pdi => pdi && pdi.trim() !== '') // Filtrar vacíos
      .map((pdi, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={[styles.listText, { fontWeight: 'bold', color: COLORS.primary }]}>
            {index + 1}.
          </Text>
          <Text style={styles.listText}>{pdi}</Text>
        </View>
      ))}
  </View>
)}

{/* Definición del Segmento Objetivo */}
{(() => {
  // Buscar segmentos en múltiples lugares
  let allSegments = [];
  
  // 1. Buscar en root
  if (event.segmentos && event.segmentos.length > 0) {
    allSegments = [...event.segmentos];
  }
  
  // 2. Buscar dentro de objetivos
  if (event.objetivos) {
    const fromObjetivos = event.objetivos
      .filter(obj => obj.segmentos && obj.segmentos.length > 0)
      .flatMap(obj => obj.segmentos);
    allSegments = [...allSegments, ...fromObjetivos];
  }
  
  console.log('🔍 Todos los segmentos encontrados:', allSegments);

  // Filtrar "Otro"
  const validSegments = allSegments.filter(seg => {
    const nombre = (seg.nombre_segmento || '').toLowerCase();
    return nombre !== 'otro' && nombre.trim() !== '';
  });

  const uniqueSegmentsMap = new Map();
  validSegments.forEach(seg => {
    if (!uniqueSegmentsMap.has(seg.idsegmento)) {
      uniqueSegmentsMap.set(seg.idsegmento, seg);
    }
  });
  
  const uniqueSegments = Array.from(uniqueSegmentsMap.values());
  console.log(' Segmentos únicos a mostrar:', uniqueSegments);

  if (uniqueSegments.length === 0) return null;

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Definición del Segmento Objetivo</Text>
      <Text style={styles.sectionSubtitle}>(puede seleccionar más de un público)</Text>
      {uniqueSegments.map((seg, index) => (
        <View key={`seg-def-${seg.idsegmento || index}`} style={styles.segmentItem}>
          <View style={styles.segmentHeader}>
            <Ionicons name="person-outline" size={16} color={COLORS.primary} style={styles.segmentIcon} />
            <Text style={styles.segmentName}>
              {seg.nombre_segmento || `Segmento ID ${seg.idsegmento}`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
})()}

        {event.resultados && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Resultados Esperados</Text>
            {event.resultados.participacion_esperada && (
              <View style={styles.listItem}>
                <Ionicons name="people-circle-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>
                  Participación: {event.resultados.participacion_esperada}
                </Text>
              </View>
            )}
            {event.resultados.satisfaccion_esperada && (
              <View style={styles.listItem}>
                <Ionicons name="happy-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>
                  Satisfacción: {event.resultados.satisfaccion_esperada}
                </Text>
              </View>
            )}
            {event.resultados.otros_resultados && (
              <View style={styles.listItem}>
                <Ionicons name="document-text-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>
                  Otros: {event.resultados.otros_resultados}
                </Text>
              </View>
            )}
          </View>
        )}

        
        {event.recursos && event.recursos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recursos Solicitados</Text>
            
            {/* Tecnológicos */}
            {event.recursos.filter(r => r.recurso_tipo === 'tecnologico').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Tecnológicos</Text>
                {event.recursos
                  .filter(r => r.recurso_tipo === 'tecnologico')
                  .map((r, i) => (
                    <View key={`tec-${i}`} style={styles.listItem}>
                      <Ionicons name="hardware-chip-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                      <Text style={styles.listText}>
                        {r.cantidad || 1} x {r.nombre_recurso}
                      </Text>
                    </View>
                  ))
                }
              </View>
            )}
            
            {/* Mobiliario */}
            {event.recursos.filter(r => r.recurso_tipo === 'mobiliario').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Mobiliario</Text>
                {event.recursos
                  .filter(r => r.recurso_tipo === 'mobiliario')
                  .map((r, i) => (
                    <View key={`mob-${i}`} style={styles.listItem}>
                      <Ionicons name="home-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                      <Text style={styles.listText}>
                        {r.cantidad || 1} x {r.nombre_recurso}
                      </Text>
                    </View>
                  ))
                }
              </View>
            )}
            
            {/* Vajilla */}
            {event.recursos.filter(r => r.recurso_tipo === 'vajilla').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Vajilla</Text>
                {event.recursos
                  .filter(r => r.recurso_tipo === 'vajilla')
                  .map((r, i) => (
                    <View key={`vaj-${i}`} style={styles.listItem}>
                      <Ionicons name="restaurant-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                      <Text style={styles.listText}>
                        {r.cantidad || 1} x {r.nombre_recurso}
                      </Text>
                    </View>
                  ))
                }
              </View>
            )}
          </View>
        )}

        {event.comite && event.comite.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Comité del Evento</Text>
            {event.comite.map((miembro, index) => (
              <View key={index} style={styles.committeeMember}>
                <Text style={styles.committeeName}>
                  {[miembro.nombre, miembro.apellidopat, miembro.apellidomat]
                    .filter(Boolean).join(' ') || 'Miembro sin nombre'}
                </Text>
                <Text style={styles.committeeRole}>
                  Rol: {miembro.role === 'academico' ? 'Académico' : miembro.role}
                </Text>
                <Text style={styles.committeeEmail}>Email: {miembro.email}</Text>
              </View>
            ))}
          </View>
        )}

        {event.presupuesto && (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Presupuesto del Evento</Text>
    
    {/* EGRESOS */}
    {event.egresos && event.egresos.length > 0 && (
      <View style={styles.budgetSubsection}>
        <View style={styles.budgetHeader}>
          <Ionicons name="arrow-down-circle" size={20} color={COLORS.logout} />
          <Text style={styles.budgetSubtitle}>Egresos</Text>
        </View>
        
        {/* Header de tabla */}
        <View style={styles.budgetTableHeader}>
          <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
          <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
          <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
          <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
        </View>
        
        {/* Filas de egresos */}
        {event.egresos.map((egreso, index) => (
          <View key={egreso.idegreso || index} style={styles.budgetTableRow}>
            <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{egreso.descripcion}</Text>
            <Text style={[styles.budgetCell, styles.budgetCellNum]}>{egreso.cantidad}</Text>
            <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(egreso.precio_unitario).toFixed(2)}</Text>
            <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>
              Bs {parseFloat(egreso.total).toFixed(2)}
            </Text>
          </View>
        ))}
        
        {/* Total Egresos */}
        <View style={styles.budgetTotalRow}>
          <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL EGRESOS:</Text>
          <Text style={styles.budgetTotalValue}>Bs {(event.presupuesto.total_egresos || 0).toFixed(2)}</Text>
        </View>
      </View>
    )}
    
    {/* INGRESOS */}
    {event.ingresos && event.ingresos.length > 0 && (
      <View style={styles.budgetSubsection}>
        <View style={styles.budgetHeader}>
          <Ionicons name="arrow-up-circle" size={20} color={COLORS.success} />
          <Text style={styles.budgetSubtitle}>Ingresos</Text>
        </View>
        
        {/* Header de tabla */}
        <View style={styles.budgetTableHeader}>
          <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
          <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
          <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
          <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
        </View>
        
        {/* Filas de ingresos */}
        {event.ingresos.map((ingreso, index) => (
          <View key={ingreso.idingreso || index} style={styles.budgetTableRow}>
            <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{ingreso.descripcion}</Text>
            <Text style={[styles.budgetCell, styles.budgetCellNum]}>{ingreso.cantidad}</Text>
            <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(ingreso.precio_unitario).toFixed(2)}</Text>
            <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>
              Bs {parseFloat(ingreso.total).toFixed(2)}
            </Text>
          </View>
        ))}
        
        {/* Total Ingresos */}
        <View style={styles.budgetTotalRow}>
          <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL INGRESOS:</Text>
          <Text style={[styles.budgetTotalValue, { color: COLORS.success }]}>
            Bs {(event.presupuesto.total_ingresos || 0).toFixed(2)}
          </Text>
        </View>
      </View>
    )}
    
    {/* BALANCE FINAL */}
    <View style={styles.balanceFinal}>
      <Text style={styles.balanceFinalLabel}>BALANCE ECONÓMICO:</Text>
      <Text style={[
        styles.balanceFinalValue,
        { color: (event.presupuesto.balance || 0) >= 0 ? COLORS.success : COLORS.logout }
      ]}>
        Bs {(event.presupuesto.balance || 0).toFixed(2)}
      </Text>
    </View>
  </View>
)}

<CustomAlert
  visible={showApproveAlert}
  title="¿Aprobar evento?"
  message="¿Estás seguro de que quieres aprobar este evento?"
  cancelText="Cancelar"
  confirmText="Aprobar"
  onCancel={() => setShowApproveAlert(false)}
  onConfirm={async () => {
    setShowApproveAlert(false);
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');
      
      console.log('Aprobando evento:', event.id);
      
      const response = await axios.put(
        `${API_BASE_URL}/eventos/${event.id}/approve`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Respuesta:', response.data);
      Alert.alert('Éxito', 'Evento aprobado correctamente');
      router.back();
    } catch (error) {
      console.error('Error al aprobar:', error);
      Alert.alert(
        'Error', 
        `No se pudo aprobar: ${error.response?.data?.message || error.message || 'Error desconocido'}`
      );
    }
  }}
/>

<CustomAlert
  visible={showRejectAlert}
  title="¿Rechazar evento?"
  message="¿Estás seguro de que quieres rechazar este evento?"
  cancelText="Cancelar"
  confirmText="Rechazar"
  confirmDestructive
  onCancel={() => setShowRejectAlert(false)}
  onConfirm={async () => {
    setShowRejectAlert(false);
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');
      
      console.log('Rechazando evento:', event.id);
      
      const response = await axios.put(
        `${API_BASE_URL}/eventos/${event.id}/reject`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Respuesta:', response.data);
      Alert.alert('Evento Rechazado', 'El evento ha sido rechazado');
      router.back();
    } catch (error) {
      console.error('Error al rechazar:', error);
      Alert.alert(
        'Error', 
        `No se pudo rechazar: ${error.response?.data?.message || error.message || 'Error desconocido'}`
      );
    }
  }}
/>
    </ScrollView>
    </View>
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
   screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  sectionCard: {
    width: '90%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  phaseBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 8,
  },
  listIcon: {
    marginRight: 8,
  },
  listText: {
    fontSize: 14,
    color: COLORS.darkText,
    flex: 1,
  },
  segmentItem: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  segmentDescription: {
    fontSize: 13,
    color: COLORS.grayText,
    paddingLeft: 22,
  },
  resourceCategory: {
    marginTop: 12,
    paddingLeft: 8,
  },
  resourceCategoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 8,
    paddingLeft: 8,
  },
  committeeMember: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  committeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  committeeRole: {
    fontSize: 13,
    color: COLORS.grayText,
    marginBottom: 2,
  },
  committeeEmail: {
    fontSize: 13,
    color: COLORS.grayText,
    fontStyle: 'italic',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
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
    budgetSubsection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  budgetSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginLeft: 8,
  },
  budgetTableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  budgetTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  budgetCell: {
    fontSize: 13,
    color: COLORS.darkText,
  },
  budgetCellDesc: {
    flex: 3,
    fontWeight: '500',
  },
  budgetCellNum: {
    flex: 1,
    textAlign: 'right',
  },
  budgetCellTotal: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  budgetTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  budgetTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  budgetTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  balanceFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  balanceFinalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  balanceFinalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EventDetailScreen;