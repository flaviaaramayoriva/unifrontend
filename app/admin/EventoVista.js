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
import EventProcessTimeline from '../../components/admin/EventProcessTimeline';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

const TOKEN_KEY = 'adminAuthToken';

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

const COLORS = {
  accent: '#C44200',
  secondary: '#0F172A',
  primary: '#C44200',
  background: '#F6F7F9',
  surface: '#ffffff',
  success: '#27ae60',
  warning: '#f39c12',
  info: '#3498db',
  purple: '#9b59b6',
  logout: '#EF4444',
  white: '#fff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  overlay: 'rgba(15, 23, 42, 0.7)',
  cardShadow: '#000000',
  notificationUnread: '#e6f0ff',
  notificationRead: '#ffffff',
  border: '#e2e8f0',
};

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';
  try {
    if (typeof dateString === 'string') {
      const trimmed = dateString.trim();
      const iso = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (iso) {
        return `${Number(iso[3])} de ${MESES_ES[Number(iso[2]) - 1]} de ${iso[1]}`;
      }
      const dmy = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dmy) {
        return `${Number(dmy[1])} de ${MESES_ES[Number(dmy[2]) - 1]} de ${dmy[3]}`;
      }
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const isoStr = date.toISOString();
    const match = isoStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${Number(match[3])} de ${MESES_ES[Number(match[2]) - 1]} de ${match[1]}`;
    }
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (error) {
    return String(dateString);
  }
};

const formatTime = (timeString) => {
  if (!timeString) return 'No especificada';
  const s = String(timeString).split('+')[0].trim();
  const m = /^(\d{1,2}):(\d{2})(?::\d{1,2})?/.exec(s);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return s || 'No especificada';
};

const EventoVistaScreen = () => {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCurrentPhaseFromFases = useCallback((fases) => {
    if (!Array.isArray(fases) || fases.length === 0) {
      return { number: 1, label: 'Planeación', key: 'phase1', color: COLORS.info, icon: 'document-text-outline' };
    }
    const faseToShow = fases[0];
    const phaseConfig = {
      1: { label: 'Planeación', icon: 'document-text-outline', color: COLORS.info },
      2: { label: 'Revisión y aprobación', icon: 'clipboard-outline', color: COLORS.secondary },
      3: { label: 'Programación del evento', icon: 'calendar-outline', color: COLORS.success },
      4: { label: 'Ejecución', icon: 'play-circle-outline', color: COLORS.purple },
      5: { label: 'Cierre y evaluación', icon: 'checkmark-done-outline', color: COLORS.grayText },
    };
    const config = phaseConfig[faseToShow.nrofase] || { label: `Fase ${faseToShow.nrofase}`, icon: 'help-circle-outline', color: COLORS.grayText };
    return { number: faseToShow.nrofase, label: config.label, key: `phase${faseToShow.nrofase}`, color: config.color, icon: config.icon };
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

      const eventResponse = await axios.get(`${API_BASE_URL}/eventos/${numericId}`, { headers: { Authorization: `Bearer ${token}` } });
      const eventData = eventResponse.data;
      if (!eventData || typeof eventData !== 'object' || Object.keys(eventData).length === 0) {
        throw new Error('Datos de evento vacíos o inválidos del servidor.');
      }

      const transformedEvent = {
        id: eventData.idevento || null,
        title: eventData.nombreevento || 'Sin título',
        fechaEventoRaw: eventData.fechaevento,
        date: formatDate(eventData.fechaevento),
        time: formatTime(eventData.horaevento),
        location: eventData.lugarevento || 'Ubicación no especificada',
        status: (eventData.estado || 'pendiente').toLowerCase(),
        imageUrl: eventData.imagenUrl || null,
        idfase: eventData.idfase || 1,
        fases: eventData.fases || [],
        responsable: eventData.responsable_evento || eventData.responsable || null,
        actividadesPrevias: eventData.actividadesPrevias || [],
        actividadesDurante: eventData.actividadesDurante || [],
        actividadesPost: eventData.actividadesPost || [],
        serviciosContratados: eventData.serviciosContratados || [],
        ambientes: eventData.ambientes || [],
        layout: eventData.layout || (eventData.idlayout ? { idlayout: eventData.idlayout } : null),
        Clasificacion: eventData.Clasificacion || null,
        subcategoria: eventData.subcategoria || null,
        tiposEvento: eventData.TiposDeEvento || [],
        objetivos: eventData.Objetivos || [],
        objetivosPDI: Array.isArray(eventData.ObjetivosPDI) ? eventData.ObjetivosPDI : (typeof eventData.objetivos_pdi === 'string' ? JSON.parse(eventData.objetivos_pdi || '[]') : []),
        segmentos: eventData.segmentos || [],
        argumentacion: eventData.argumentacion || 'Sin argumentación',
        resultados: (eventData.Resultados && eventData.Resultados.length > 0) ? eventData.Resultados[0] : { participacion_esperada: null, satisfaccion_esperada: null, otros_resultados: null, satisfaccion_real: null },
        recursos: eventData.Recursos || [],
        comite: eventData.Comite || [],
        presupuesto: eventData.Presupuesto || null,
        egresos: eventData.Egresos || [],
        ingresos: eventData.Ingresos || [],
        tags: eventData.tags || [],
        creador: eventData.creador ? { nombre: `${eventData.creador.nombre} ${eventData.creador.apellidopat} ${eventData.creador.apellidomat}`, email: eventData.creador.email, role: eventData.creador.role } : null
      };

      if (!transformedEvent.id) throw new Error('El evento no tiene un ID válido.');
      setEvent(transformedEvent);
    } catch (err) {
      let errorMessage = `Error al cargar evento: ${err.message}`;
      if (err.response?.status === 401 || err.response?.status === 403) {
        Alert.alert('Acceso Denegado', 'No tienes permiso o tu sesión ha expirado.');
        await deleteTokenAsync();
        router.replace('/LoginAdmin');
        errorMessage = 'Sesión expirada. Redirigiendo...';
      } else if (err.response?.status === 404) {
        errorMessage = 'Evento no encontrado.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    if (eventId) fetchEventDetails();
    else { setError('No se proporcionó un ID de evento.'); setLoading(false); }
  }, [fetchEventDetails, eventId]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Cargando detalles del evento...</Text></View>;
  if (error) return <View style={styles.centered}><Ionicons name="alert-circle-outline" size={50} color={COLORS.accent} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={fetchEventDetails}><Text style={styles.retryButtonText}>Reintentar</Text></TouchableOpacity><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>Volver</Text></TouchableOpacity></View>;
  if (!event || Object.keys(event).length === 0) return <View style={styles.centered}><Ionicons name="information-circle-outline" size={50} color={COLORS.grayText} /><Text style={styles.errorText}>No se encontraron datos del evento.</Text><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>Volver</Text></TouchableOpacity></View>;

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="arrow-back" size={24} color={COLORS.white} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Evento</Text>
        <TouchableOpacity onPress={fetchEventDetails} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="refresh" size={24} color={COLORS.white} /></TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />}

        <View style={styles.card}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {(() => {
            const phaseInfo = getCurrentPhaseFromFases([{ nrofase: event.idfase }]);
            return (
              <View style={[styles.phaseBadge, { backgroundColor: phaseInfo.color }]}>
                <Ionicons name={phaseInfo.icon} size={16} color={COLORS.white} />
                <Text style={styles.phaseBadgeText}>Fase {phaseInfo.number}: {phaseInfo.label}</Text>
              </View>
            );
          })()}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.detailRow}>
            <Ionicons name={event.status === 'aprobado' ? 'checkmark-circle-outline' : 'time-outline'} size={20} color={event.status === 'aprobado' ? COLORS.success : COLORS.warning} style={styles.detailIcon} />
            <Text style={[styles.detailText, { color: event.status === 'aprobado' ? COLORS.success : COLORS.warning, textTransform: 'capitalize' }]}>Estado: {event.status}</Text>
          </View>
        </View>

        {/* Proceso del evento */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Proceso del Evento</Text>
          <EventProcessTimeline estado={event.status} idfase={event.idfase} fases={event.fases} />
        </View>

        {/* Datos Generales */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Datos Generales</Text>
          <View style={styles.detailRow}><Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>Fecha: {event.date}</Text></View>
          <View style={styles.detailRow}><Ionicons name="time-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>Hora: {event.time}</Text></View>
          <View style={styles.detailRow}><Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>Ubicación: {event.location}</Text></View>
          {event.argumentacion && (
            <View style={styles.detailRow}><Ionicons name="chatbox-ellipses-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>Argumentación: {event.argumentacion}</Text></View>
          )}
        </View>

        {/* Responsable del Evento */}
        {event.idfase >= 2 && event.responsable && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Responsable del Evento</Text>
            <View style={styles.detailRow}><Ionicons name="person-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>{event.responsable}</Text></View>
          </View>
        )}

        {/* Clasificación Estratégica */}
        {event.Clasificacion && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Clasificación Estratégica</Text>
            <Text style={styles.detailText}>• {event.Clasificacion.nombreClasificacion} - {event.Clasificacion.nombresubcategoria}</Text>
          </View>
        )}

        {/* Tipos de Evento */}
        {event.tiposEvento && event.tiposEvento.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tipos de Evento</Text>
            {event.tiposEvento.map((tipo, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>{tipo.nombretipo || `Tipo ID ${tipo.idtipoevento}`}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Resultados Esperados */}
        {event.resultados && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Resultados Esperados</Text>
            {event.resultados.participacion_esperada && (
              <View style={styles.listItem}><Ionicons name="people-circle-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>Participación: {event.resultados.participacion_esperada}</Text></View>
            )}
            {event.resultados.satisfaccion_esperada && (
              <View style={styles.listItem}><Ionicons name="happy-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>Satisfacción: {event.resultados.satisfaccion_esperada}</Text></View>
            )}
            {event.resultados.otros_resultados && (
              <View style={styles.listItem}><Ionicons name="document-text-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>Otros: {event.resultados.otros_resultados}</Text></View>
            )}
          </View>
        )}

        {/* Recursos Solicitados */}
        {event.recursos && event.recursos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recursos Solicitados</Text>
            {event.recursos.filter(r => r.recurso_tipo === 'tecnologico').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Tecnológicos</Text>
                {event.recursos.filter(r => r.recurso_tipo === 'tecnologico').map((r, i) => (
                  <View key={`tec-${i}`} style={styles.listItem}><Ionicons name="hardware-chip-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>{r.cantidad || 1} x {r.nombre_recurso}</Text></View>
                ))}
              </View>
            )}
            {event.recursos.filter(r => r.recurso_tipo === 'mobiliario').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Mobiliario</Text>
                {event.recursos.filter(r => r.recurso_tipo === 'mobiliario').map((r, i) => (
                  <View key={`mob-${i}`} style={styles.listItem}><Ionicons name="home-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>{r.cantidad || 1} x {r.nombre_recurso}</Text></View>
                ))}
              </View>
            )}
            {event.recursos.filter(r => r.recurso_tipo === 'vajilla').length > 0 && (
              <View style={styles.resourceCategory}>
                <Text style={styles.resourceCategoryTitle}>Vajilla</Text>
                {event.recursos.filter(r => r.recurso_tipo === 'vajilla').map((r, i) => (
                  <View key={`vaj-${i}`} style={styles.listItem}><Ionicons name="restaurant-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>{r.cantidad || 1} x {r.nombre_recurso}</Text></View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Comité del Evento */}
        {event.comite && event.comite.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Comité del Evento</Text>
            {event.comite.map((miembro, index) => (
              <View key={index} style={styles.committeeMember}>
                <Text style={styles.committeeName}>{[miembro.nombre, miembro.apellidopat, miembro.apellidomat].filter(Boolean).join(' ') || 'Miembro sin nombre'}</Text>
                <Text style={styles.committeeRole}>Rol: {miembro.role === 'academico' ? 'Académico' : miembro.role}</Text>
                <Text style={styles.committeeEmail}>Email: {miembro.email}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actividades Previas */}
        {event.actividadesPrevias && event.actividadesPrevias.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Actividades Previas</Text>
            {event.actividadesPrevias.map((act, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityHeader}><Ionicons name="list-circle-outline" size={20} color={COLORS.primary} /><Text style={styles.activityTitle}>{act.nombre || `Actividad ${index + 1}`}</Text></View>
                <View style={styles.activityDetails}>
                  <View style={styles.activityDetailRow}><Ionicons name="person-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Responsable: {act.responsable || 'No especificado'}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Inicio: {formatDate(act.fecha_inicio)}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Fin: {formatDate(act.fecha_fin)}</Text></View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actividades Durante el Evento */}
        {event.actividadesDurante && event.actividadesDurante.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Actividades Durante el Evento</Text>
            {event.actividadesDurante.map((act, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityHeader}><Ionicons name="play-circle-outline" size={20} color={COLORS.success} /><Text style={styles.activityTitle}>{act.nombre || `Actividad ${index + 1}`}</Text></View>
                <View style={styles.activityDetails}>
                  <View style={styles.activityDetailRow}><Ionicons name="person-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Responsable: {act.responsable || 'No especificado'}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Inicio: {formatDate(act.fecha_inicio)}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Fin: {formatDate(act.fecha_fin)}</Text></View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actividades Después del Evento */}
        {event.actividadesPost && event.actividadesPost.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Actividades Después del Evento</Text>
            {event.actividadesPost.map((act, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityHeader}><Ionicons name="checkmark-done-outline" size={20} color={COLORS.info} /><Text style={styles.activityTitle}>{act.nombre || `Actividad ${index + 1}`}</Text></View>
                <View style={styles.activityDetails}>
                  <View style={styles.activityDetailRow}><Ionicons name="person-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Responsable: {act.responsable || 'No especificado'}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Inicio: {formatDate(act.fecha_inicio)}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Fin: {formatDate(act.fecha_fin)}</Text></View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Servicios Contratados */}
        {event.serviciosContratados && event.serviciosContratados.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Servicios Contratados</Text>
            {event.serviciosContratados.map((serv, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceHeader}><Ionicons name="build-outline" size={20} color={COLORS.purple} /><Text style={styles.serviceTitle}>{serv.nombreServicio || `Servicio ${index + 1}`}</Text></View>
                <View style={styles.serviceDetails}>
                  {serv.caracteristica && (<View style={styles.serviceDetailRow}><Ionicons name="list-outline" size={16} color={COLORS.grayText} /><Text style={styles.serviceDetailText}>Características: {serv.caracteristica}</Text></View>)}
                  <View style={styles.serviceDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.serviceDetailText}>Fecha Entrega: {formatDate(serv.fechaInicio)}</Text></View>
                  {serv.observaciones && (<View style={styles.serviceDetailRow}><Ionicons name="document-text-outline" size={16} color={COLORS.grayText} /><Text style={styles.serviceDetailText}>Obs: {serv.observaciones}</Text></View>)}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Layout del Evento */}
        {event.layout && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Layout del Evento</Text>
            {event.layout.url_imagen ? (
              <Image source={{ uri: `https://unibackend-production-a0f8.up.railway.app/uploads/${event.layout.url_imagen}` }} style={styles.layoutImage} resizeMode="contain" />
            ) : (
              <View style={styles.layoutPlaceholder}>
                <Ionicons name="image-outline" size={50} color={COLORS.grayText} />
                <Text style={styles.layoutPlaceholderText}>{event.layout.nombre || `Layout ID: ${event.layout.idlayout}`}</Text>
              </View>
            )}
            {event.layout.nombre && <Text style={styles.layoutName}>{event.layout.nombre}</Text>}
          </View>
        )}

        {/* Segmentos Objetivo */}
        {event.objetivos && event.objetivos.some(obj => obj.segmentos && obj.segmentos.length > 0) && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Segmentos Objetivo</Text>
            {(() => {
              const allSegments = event.objetivos.filter(obj => obj.segmentos && Array.isArray(obj.segmentos)).flatMap(obj => obj.segmentos);
              const uniqueSegmentsMap = new Map();
              allSegments.forEach(seg => {
                const key = seg.idsegmento || seg.nombre_segmento || JSON.stringify(seg);
                if (!uniqueSegmentsMap.has(key)) uniqueSegmentsMap.set(key, seg);
              });
              return Array.from(uniqueSegmentsMap.values()).map((seg, index) => (
                <View key={`seg-unique-${seg.idsegmento || index}`} style={styles.segmentItem}>
                  <View style={styles.segmentHeader}><Ionicons name="person-outline" size={16} color={COLORS.primary} style={styles.segmentIcon} /><Text style={styles.segmentName}>{seg.nombre_segmento || `Segmento ID ${seg.idsegmento}`}</Text></View>
                  {seg.texto_personalizado && <Text style={styles.segmentDescription}>{seg.texto_personalizado}</Text>}
                </View>
              ));
            })()}
          </View>
        )}

        {/* Objetivos PDI Institucional */}
        {event.objetivosPDI && event.objetivosPDI.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Objetivos del PDI Institucional</Text>
            {event.objetivosPDI.map((pdi, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listText, { fontWeight: 'bold', color: COLORS.primary }]}>{index + 1}.</Text>
                <Text style={styles.listText}>{pdi}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Propuesto por */}
        {event.creador && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Propuesto por</Text>
            <Text style={styles.creatorName}>{event.creador.nombre}</Text>
            <Text style={styles.creatorRole}>Rol: {event.creador.role}</Text>
            <Text style={styles.creatorEmail}>Email: {event.creador.email}</Text>
          </View>
        )}

        {/* Presupuesto */}
        {event.presupuesto && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Presupuesto del Evento</Text>
            {event.egresos && event.egresos.length > 0 && (
              <View style={styles.budgetSubsection}>
                <View style={styles.budgetHeader}><Ionicons name="arrow-down-circle" size={20} color={COLORS.logout} /><Text style={styles.budgetSubtitle}>Egresos</Text></View>
                <View style={styles.budgetTableHeader}>
                  <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
                </View>
                {event.egresos.map((egreso, index) => (
                  <View key={egreso.idegreso || index} style={styles.budgetTableRow}>
                    <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{egreso.descripcion}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>{egreso.cantidad}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(egreso.precio_unitario).toFixed(2)}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>Bs {parseFloat(egreso.total).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.budgetTotalRow}>
                  <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL EGRESOS:</Text>
                  <Text style={styles.budgetTotalValue}>Bs {(event.presupuesto.total_egresos || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}
            {event.ingresos && event.ingresos.length > 0 && (
              <View style={styles.budgetSubsection}>
                <View style={styles.budgetHeader}><Ionicons name="arrow-up-circle" size={20} color={COLORS.success} /><Text style={styles.budgetSubtitle}>Ingresos</Text></View>
                <View style={styles.budgetTableHeader}>
                  <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
                </View>
                {event.ingresos.map((ingreso, index) => (
                  <View key={ingreso.idingreso || index} style={styles.budgetTableRow}>
                    <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{ingreso.descripcion}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>{ingreso.cantidad}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(ingreso.precio_unitario).toFixed(2)}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>Bs {parseFloat(ingreso.total).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.budgetTotalRow}>
                  <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL INGRESOS:</Text>
                  <Text style={[styles.budgetTotalValue, { color: COLORS.success }]}>Bs {(event.presupuesto.total_ingresos || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}
            <View style={styles.balanceFinal}>
              <Text style={styles.balanceFinalLabel}>BALANCE ECONÓMICO:</Text>
              <Text style={[styles.balanceFinalValue, { color: (event.presupuesto.balance || 0) >= 0 ? COLORS.success : COLORS.logout }]}>Bs {(event.presupuesto.balance || 0).toFixed(2)}</Text>
            </View>
          </View>
        )}

        <View style={styles.footerInfo}>
          <Ionicons name="eye-outline" size={16} color={COLORS.grayText} />
          <Text style={styles.footerInfoText}>Vista de solo lectura. No se pueden realizar modificaciones desde esta pantalla.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

EventoVistaScreen.options = { headerShown: false };

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  contentContainer: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.grayText },
  errorText: { marginTop: 15, fontSize: 16, color: COLORS.accent, textAlign: 'center', marginHorizontal: 20 },
  retryButton: { marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 10, backgroundColor: COLORS.grayLight, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backButtonText: { color: COLORS.darkText, fontSize: 16 },
  eventImage: { width: '100%', height: 250, resizeMode: 'cover', marginBottom: 20, borderRadius: 16 },
  card: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, ...Platform.select({ ios: { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 8 } }) },
  eventTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 10 },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start' },
  phaseBadgeText: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, ...Platform.select({ ios: { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 8 } }) },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailIcon: { marginRight: 10 },
  detailText: { fontSize: 16, color: COLORS.darkText, flex: 1 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  listIcon: { marginRight: 12, marginTop: 2 },
  listText: { fontSize: 15, color: COLORS.darkText, flex: 1, lineHeight: 20 },
  resourceCategory: { marginBottom: 12 },
  resourceCategoryTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8, marginLeft: 28 },
  committeeMember: { padding: 12, backgroundColor: COLORS.grayLight, borderRadius: 12, marginBottom: 12 },
  committeeName: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 4 },
  committeeRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 4 },
  committeeEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },
  activityItem: { backgroundColor: COLORS.grayLight, borderRadius: 12, padding: 15, marginBottom: 12 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  activityTitle: { fontSize: 16, fontWeight: '600', color: COLORS.darkText, marginLeft: 10, flex: 1 },
  activityDetails: { paddingLeft: 5 },
  activityDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  activityDetailText: { fontSize: 14, color: COLORS.grayText, marginLeft: 8, flex: 1 },
  serviceItem: { backgroundColor: COLORS.grayLight, borderRadius: 12, padding: 15, marginBottom: 12 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  serviceTitle: { fontSize: 16, fontWeight: '600', color: COLORS.darkText, marginLeft: 10, flex: 1 },
  serviceDetails: { paddingLeft: 5 },
  serviceDetailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  serviceDetailText: { fontSize: 14, color: COLORS.grayText, marginLeft: 8, flex: 1 },
  layoutImage: { width: '100%', height: 250, borderRadius: 12, backgroundColor: COLORS.grayLight, marginBottom: 10 },
  layoutPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, backgroundColor: COLORS.grayLight, borderRadius: 12, marginBottom: 10 },
  layoutPlaceholderText: { fontSize: 14, color: COLORS.grayText, marginTop: 10, textAlign: 'center' },
  layoutName: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, textAlign: 'center' },
  segmentItem: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  segmentIcon: { marginRight: 8 },
  segmentName: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  segmentDescription: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic', paddingLeft: 24 },
  creatorName: { fontSize: 16, color: COLORS.darkText, fontWeight: '500', marginBottom: 3 },
  creatorRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 3 },
  creatorEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },
  budgetSubsection: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  budgetSubtitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText, marginLeft: 8 },
  budgetTableHeader: { flexDirection: 'row', backgroundColor: COLORS.grayLight, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 8 },
  budgetTableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  budgetCell: { fontSize: 13, color: COLORS.darkText },
  budgetCellDesc: { flex: 3, fontWeight: '500' },
  budgetCellNum: { flex: 1, textAlign: 'right' },
  budgetCellTotal: { fontWeight: '600', color: COLORS.primary },
  budgetTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: COLORS.primary },
  budgetTotalLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.darkText },
  budgetTotalValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  balanceFinal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.grayLight, padding: 15, borderRadius: 12, marginTop: 10 },
  balanceFinalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  balanceFinalValue: { fontSize: 18, fontWeight: 'bold' },
  footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 4 },
  footerInfoText: { fontSize: 13, color: COLORS.grayText, marginLeft: 6, textAlign: 'center', flex: 1 },
});

export default EventoVistaScreen;