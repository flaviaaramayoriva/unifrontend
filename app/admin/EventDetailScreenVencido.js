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
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import CustomAlert from '../../components/CustomAlert';

//const API_BASE_URL = 'https://evento.cidtec-uc.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem(TOKEN_KEY); }
    catch (e) { console.error("Error sessionStorage:", e); return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); }
    catch (e) { console.error("Error SecureStore:", e); return null; }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { sessionStorage.removeItem(TOKEN_KEY); }
    catch (e) { console.error("Error sessionStorage:", e); }
  } else {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); }
    catch (e) { console.error("Error SecureStore:", e); }
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
  border: '#e2e8f0',
};

const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateString; }
};

const formatTime = (timeString) => {
  if (!timeString) return 'No especificada';
  try {
    if (timeString.includes(':')) return timeString;
    return timeString;
  } catch { return timeString; }
};

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', fg: '#B45309', bg: '#FEF3C7', icon: 'time-outline' },
  aprobado: { label: 'Aprobado', fg: '#15803D', bg: '#DCFCE7', icon: 'checkmark-circle-outline' },
  rechazado: { label: 'Rechazado', fg: '#B91C1C', bg: '#FEE2E2', icon: 'close-circle-outline' },
  cancelado: { label: 'Cancelado', fg: '#0F172A', bg: '#D1D5DB', icon: 'ban-outline' },
  vencido: { label: 'Vencido', fg: '#C2410C', bg: '#FFF0E6', icon: 'alert-circle-outline' },
  completado: { label: 'Completado', fg: '#1D4ED8', bg: '#DBEAFE', icon: 'flag-outline' },
};

const PHASES = [
  { number: 1, label: 'Planeación', icon: 'document-text-outline', color: COLORS.info },
  { number: 2, label: 'Revisión y aprobación', icon: 'clipboard-outline', color: COLORS.secondary },
  { number: 3, label: 'Programación del evento', icon: 'calendar-outline', color: COLORS.success },
  { number: 4, label: 'Ejecución', icon: 'play-circle-outline', color: COLORS.purple },
  { number: 5, label: 'Cierre y evaluación', icon: 'checkmark-done-outline', color: COLORS.grayText },
];

const StatusPill = ({ status }) => {
  const key = String(status || '').toLowerCase();
  const cfg = STATUS_CONFIG[key] || {
    label: key || 'Sin estado',
    fg: COLORS.grayText,
    bg: COLORS.grayLight,
    icon: 'help-circle-outline',
  };
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]} accessibilityLabel={`Estado: ${cfg.label}`}>
      <Ionicons name={cfg.icon} size={14} color={cfg.fg} />
      <Text style={[styles.statusPillText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};

const PhaseTimeline = ({ current }) => {
  const cur = Math.min(Math.max(Number(current) || 1, 1), PHASES.length);
  return (
    <View style={styles.timelineWrap}>
      {PHASES.map((ph, idx) => {
        const done = ph.number <= cur;
        const prevDone = idx > 0 ? PHASES[idx - 1].number <= cur : false;
        const nextDone = idx < PHASES.length - 1 ? PHASES[idx + 1].number <= cur : false;
        return (
          <View key={ph.number} style={styles.timelineStep}>
            <View style={styles.timelineTrack}>
              <View style={[styles.timelineLine, idx === 0 && styles.timelineLineHidden, (prevDone && done) && styles.timelineLineActive]} />
              <View style={[styles.timelineDot, done ? { backgroundColor: ph.color } : styles.timelineDotIdle]}>
                <Ionicons name={done ? ph.icon : 'ellipse-outline'} size={13} color={done ? COLORS.white : '#94A3B8'} />
              </View>
              <View style={[styles.timelineLine, idx === PHASES.length - 1 && styles.timelineLineHidden, (done && nextDone) && styles.timelineLineActive]} />
            </View>
            <Text style={[styles.timelineLabel, done && { color: ph.color, fontWeight: '700' }]} numberOfLines={2}>{ph.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

const MetaChip = ({ icon, text, color = COLORS.primary }) => (
  <View style={styles.metaChip}>
    <Ionicons name={icon} size={15} color={color} />
    <Text style={styles.metaChipText} numberOfLines={2}>{text}</Text>
  </View>
);

const EventDetailScreenVencido = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const getEventId = () => {
    if (params.id) {
      return Array.isArray(params.id) ? params.id[0] : params.id;
    }
    if (params.eventId) {
      return Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
    }
    const idKey = Object.keys(params).find(key => 
      key.toLowerCase().includes('id') && !key.toLowerCase().includes('eventid')
    );
    if (idKey) {
      return Array.isArray(params[idKey]) ? params[idKey][0] : params[idKey];
    }
    return null;
  };
  
  const eventId = getEventId();
  const from = params.from;
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showApproveAlert, setShowApproveAlert] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [razonRechazo, setRazonRechazo] = useState('');

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
    if (!eventId) {
      console.error('❌ fetchEventDetails llamado sin eventId');
      setError('No se proporcionó un ID de evento.');
      setLoading(false);
      return;
    }
    
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
      
      const [eventResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/eventos/${numericId}`, { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        }),
        fetchUserDetails(token)
      ]);
      
      const eventData = eventResponse.data;
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
        argumentacion: eventData.argumentacion || 'Sin argumentación',
        resultados: (eventData.Resultados && eventData.Resultados.length > 0)
          ? eventData.Resultados[0]
          : { participacion_esperada: null, satisfaccion_esperada: null, otros_resultados: null, satisfaccion_real: null },
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
      
      if (!transformedEvent.id) throw new Error('El evento no tiene un ID válido.');
      
      setEvent(transformedEvent);
    } catch (err) {
      console.error('❌ Error en fetchEventDetails:', err);
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

  const fetchUserDetails = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      setUser(response.data);
      return response.data;
    } catch (err) {
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

  const handleReprogramar = async () => {
    setShowEditModal(false);
    
    if (!event || !event.id) {
      Alert.alert('Error', 'No hay datos válidos del evento para editar.');
      return;
    }

    const eventDataForEdit = {
      idevento: event.id,
      nombreevento: event.title,
      fechaevento: event.date,
      horaevento: event.time,
      lugarevento: event.location,
      responsable_evento: event.organizer,
      participantes_esperados: event.attendees,
      argumentacion: event.argumentacion,
      idclasificacion: event.Clasificacion?.idclasificacion,
      idsubcategoria: event.Clasificacion?.idsubcategoria,
      tiposEvento: JSON.stringify(event.tiposEvento || []),
      objetivos: JSON.stringify(event.objetivos || []),
      objetivosPDI: JSON.stringify(event.objetivosPDI || []),
      segmentos: JSON.stringify(event.segmentos || []),
      participacion_esperada: event.resultados?.participacion_esperada,
      satisfaccion_esperada: event.resultados?.satisfaccion_esperada,
      otros_resultados: event.resultados?.otros_resultados,
      recursos: JSON.stringify(event.recursos || []),
      comite: JSON.stringify(event.comite || []),
      egresos: JSON.stringify(event.egresos || []),
      ingresos: JSON.stringify(event.ingresos || []),
      presupuesto: JSON.stringify(event.presupuesto || {}),
    };

    router.push({
      pathname: '/admin/EditEventScreen',
      params: {
        eventId: event.id,
        eventData: JSON.stringify(eventDataForEdit),
        mode: 'reprogramar',
      }
    });
  };

  const handleRejectEvent = () => {
    if (!event || !event.id) {
      Alert.alert('Error', 'No hay evento cargado para rechazar.');
      return;
    }
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    setShowRejectModal(false);
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');

      await axios.put(
        `${API_BASE_URL}/eventos/${event.id}/reject`,
        { razon_rechazo: razonRechazo || 'Evento vencido - Fecha de ejecución pasada' },
        { 
          headers: { 
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          }
        }
      );

      setRazonRechazo('');
      Alert.alert('✓ Evento Rechazado', 'El evento ha sido rechazado correctamente');
      router.back();
    } catch (error) {
      console.error('❌ Error al rechazar:', error);
      Alert.alert('Error', `No se pudo rechazar: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleBack = () => {
    if (from === 'vencidos') {
      router.back();
    } else {
      router.replace('/admin/EventosPendientes');
    }
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const phaseInfo = getCurrentPhaseFromFases([{ nrofase: event.idfase }]);

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Evento</Text>
        <TouchableOpacity onPress={fetchEventDetails} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* HERO */}
        <View style={styles.heroCard}>
          {event.imageUrl ? (
            <View style={styles.heroImageWrap}>
              <Image source={{ uri: event.imageUrl }} style={styles.heroImage} resizeMode="cover" />
              <View style={styles.heroFade} />
            </View>
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Ionicons name="calendar-clear-outline" size={42} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroPlaceholderText}>Evento académico</Text>
            </View>
          )}
          <View style={styles.heroBody}>
            <View style={styles.heroTopRow}>
              <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
              <StatusPill status={event.status} />
            </View>
            <Text style={styles.heroSub} numberOfLines={2}>
              {[event.date, event.time, event.location].filter(Boolean).join(' · ') || 'Sin fecha y ubicación especificadas'}
            </Text>
            <PhaseTimeline current={phaseInfo.number} />
          </View>
        </View>

        {/* Datos Generales */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Datos Generales</Text>
          <View style={styles.metaGrid}>
            <MetaChip icon="calendar-outline" text={`Fecha: ${event.date}`} color={COLORS.primary} />
            <MetaChip icon="time-outline" text={`Hora: ${event.time}`} color={COLORS.secondary} />
            <MetaChip icon="location-outline" text={`Lugar: ${event.location}`} color={COLORS.primary} />
            <MetaChip icon="business-outline" text={`Organizador: ${event.organizer}`} color={COLORS.purple} />
            <MetaChip icon="people-outline" text={`Asistentes: ${event.attendees}`} color={COLORS.success} />
          </View>
        </View>

        {event.creador && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Propuesto por</Text>
            <Text style={styles.creatorName}>{event.creador.nombre}</Text>
            <Text style={styles.creatorRole}>Rol: {event.creador.role}</Text>
            <Text style={styles.creatorEmail}>Email: {event.creador.email}</Text>
          </View>
        )}

        {event.Clasificacion && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Clasificación Estratégica</Text>
            <View style={styles.listItem}>
              <Ionicons name="layers-outline" size={16} color={COLORS.primary} style={styles.listIcon} />
              <Text style={styles.listText}>
                {event.Clasificacion.nombreClasificacion} - {event.Clasificacion.nombresubcategoria}
              </Text>
            </View>
          </View>
        )}

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

        {event.objetivos && event.objetivos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Objetivos Principales</Text>
            {event.objetivos.map((obj, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="bulb-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>
                  {obj.nombre_objetivo || 'Sin tipo'} — {obj.texto_personalizado || 'Objetivo sin descripción'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {event.objetivosPDI && event.objetivosPDI.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Objetivos del PDI Institucional</Text>
            {event.objetivosPDI.map((pdi, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listText, { fontWeight: 'bold', color: COLORS.primary, flex: 0 }]}>{index + 1}.</Text>
                <Text style={[styles.listText, { marginLeft: 8 }]}>{pdi}</Text>
              </View>
            ))}
          </View>
        )}

        {event.objetivos && event.objetivos.some(obj => obj.segmentos && obj.segmentos.length > 0) && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Segmentos Objetivo</Text>
            {(() => {
              const allSegments = event.objetivos
                .filter(obj => obj.segmentos && obj.segmentos.length > 0)
                .flatMap(obj => obj.segmentos);
              const uniqueSegmentsMap = new Map();
              allSegments.forEach(seg => {
                if (!uniqueSegmentsMap.has(seg.idsegmento)) uniqueSegmentsMap.set(seg.idsegmento, seg);
              });
              return Array.from(uniqueSegmentsMap.values()).map((seg, index) => (
                <View key={`seg-${seg.idsegmento || index}`} style={styles.segmentItem}>
                  <View style={styles.segmentHeader}>
                    <Ionicons name="person-outline" size={16} color={COLORS.primary} style={styles.segmentIcon} />
                    <Text style={styles.segmentName}>{seg.nombre_segmento || `Segmento ID ${seg.idsegmento}`}</Text>
                  </View>
                  {seg.texto_personalizado && <Text style={styles.segmentDescription}>{seg.texto_personalizado}</Text>}
                </View>
              ));
            })()}
          </View>
        )}

        {event.resultados && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Resultados Esperados</Text>
            {event.resultados.participacion_esperada && (
              <View style={styles.listItem}>
                <Ionicons name="people-circle-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>Participación: {event.resultados.participacion_esperada}</Text>
              </View>
            )}
            {event.resultados.satisfaccion_esperada && (
              <View style={styles.listItem}>
                <Ionicons name="happy-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>Satisfacción: {event.resultados.satisfaccion_esperada}</Text>
              </View>
            )}
            {event.resultados.otros_resultados && (
              <View style={styles.listItem}>
                <Ionicons name="document-text-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>Otros: {event.resultados.otros_resultados}</Text>
              </View>
            )}
          </View>
        )}

        {event.recursos && event.recursos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recursos Solicitados</Text>
            {['tecnologico', 'mobiliario', 'vajilla'].map(tipo => {
              const filtered = event.recursos.filter(r => r.recurso_tipo === tipo);
              if (!filtered.length) return null;
              const icons = { tecnologico: 'hardware-chip-outline', mobiliario: 'home-outline', vajilla: 'restaurant-outline' };
              const labels = { tecnologico: 'Tecnológicos', mobiliario: 'Mobiliario', vajilla: 'Vajilla' };
              return (
                <View key={tipo} style={styles.resourceCategory}>
                  <Text style={styles.resourceCategoryTitle}>{labels[tipo]}</Text>
                  {filtered.map((r, i) => (
                    <View key={`${tipo}-${i}`} style={styles.listItem}>
                      <Ionicons name={icons[tipo]} size={16} color={COLORS.grayText} style={styles.listIcon} />
                      <Text style={styles.listText}>{r.cantidad || 1} x {r.nombre_recurso}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {event.comite && event.comite.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Comité del Evento</Text>
            {event.comite.map((miembro, index) => (
              <View key={index} style={styles.committeeMember}>
                <Text style={styles.committeeName}>
                  {[miembro.nombre, miembro.apellidopat, miembro.apellidomat].filter(Boolean).join(' ') || 'Miembro sin nombre'}
                </Text>
                <Text style={styles.committeeRole}>Rol: {miembro.role === 'academico' ? 'Académico' : miembro.role}</Text>
                <Text style={styles.committeeEmail}>Email: {miembro.email}</Text>
              </View>
            ))}
          </View>
        )}

        {event.presupuesto && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Presupuesto del Evento</Text>
            {event.egresos && event.egresos.length > 0 && (
              <View style={styles.budgetSubsection}>
                <View style={styles.budgetHeader}>
                  <Ionicons name="arrow-down-circle" size={20} color={COLORS.logout} />
                  <Text style={styles.budgetSubtitle}>Egresos</Text>
                </View>
                <View style={styles.budgetTableWrap}>
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
                </View>
                <View style={styles.budgetTotalRow}>
                  <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL EGRESOS:</Text>
                  <Text style={styles.budgetTotalValue}>Bs {(event.presupuesto.total_egresos || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}
            {event.ingresos && event.ingresos.length > 0 && (
              <View style={styles.budgetSubsection}>
                <View style={styles.budgetHeader}>
                  <Ionicons name="arrow-up-circle" size={20} color={COLORS.success} />
                  <Text style={styles.budgetSubtitle}>Ingresos</Text>
                </View>
                <View style={styles.budgetTableWrap}>
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
                </View>
                <View style={styles.budgetTotalRow}>
                  <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL INGRESOS:</Text>
                  <Text style={[styles.budgetTotalValue, { color: COLORS.success }]}>Bs {(event.presupuesto.total_ingresos || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}
            <View style={styles.balanceFinal}>
              <Text style={styles.balanceFinalLabel}>BALANCE ECONÓMICO:</Text>
              <Text style={[styles.balanceFinalValue, { color: (event.presupuesto.balance || 0) >= 0 ? COLORS.success : COLORS.logout }]}>
                Bs {(event.presupuesto.balance || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {event.status?.toLowerCase() !== 'aprobado' && (
        <View style={styles.actionBar}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Reprogramar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.logout }]}
              onPress={handleRejectEvent}
            >
              <Ionicons name="close-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CustomAlert
        visible={showEditModal}
        title="¿Reprogramar evento?"
        message="Serás redirigido a la edición del evento para modificar fecha, hora, ubicación u otros detalles. ¿Deseas continuar?"
        cancelText="Cancelar"
        confirmText="Editar Evento"
        onCancel={() => setShowEditModal(false)}
        onConfirm={handleReprogramar}
      />

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRejectModal(false);
          setRazonRechazo('');
        }}
        accessibilityViewIsModal={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconContainer}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="close-circle" size={34} color={COLORS.logout} />
              </View>
            </View>
            <Text style={styles.modalTitle}>Rechazar Evento</Text>
            <Text style={styles.modalMessage}>
              Ingresa la razón del rechazo (opcional):
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Fecha de ejecución ya pasó..."
              placeholderTextColor={COLORS.grayText}
              accessibilityLabel="Motivo del rechazo"
              value={razonRechazo}
              onChangeText={setRazonRechazo}
              multiline
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowRejectModal(false);
                  setRazonRechazo('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalRejectBtn}
                onPress={confirmReject}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.white} />
                <Text style={styles.modalRejectText}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

EventDetailScreenVencido.options = { headerShown: false };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { padding: 16, paddingBottom: 150, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20 },
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  eventTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.darkText, flex: 1, marginRight: 10, lineHeight: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailIcon: { marginRight: 10 },
  detailText: { fontSize: 16, color: COLORS.darkText, flex: 1 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  listIcon: { marginRight: 12, marginTop: 4 },
  listText: { fontSize: 15, color: COLORS.darkText, flex: 1, lineHeight: 20 },
  segmentItem: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  segmentIcon: { marginRight: 8 },
  segmentName: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  segmentDescription: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic', paddingLeft: 24 },
  resourceCategory: { marginBottom: 12 },
  resourceCategoryTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8, marginLeft: 28 },
  committeeMember: { padding: 12, backgroundColor: COLORS.grayLight, borderRadius: 12, marginBottom: 12 },
  committeeName: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 4 },
  committeeRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 4 },
  committeeEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },
  creatorName: { fontSize: 16, color: COLORS.darkText, fontWeight: '500', marginBottom: 3 },
  creatorRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 3 },
  creatorEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
    }),
  },
  heroImageWrap: { width: '100%', height: 190, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  heroImagePlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', marginTop: 6 },
  heroBody: { padding: 20 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  heroSub: { fontSize: 13, color: COLORS.grayText, marginBottom: 16, lineHeight: 19 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  timelineWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineStep: { flex: 1, alignItems: 'center' },
  timelineTrack: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginBottom: 6 },
  timelineLine: { flex: 1, height: 3, backgroundColor: '#E2E8F0' },
  timelineLineActive: { backgroundColor: COLORS.primary },
  timelineLineHidden: { backgroundColor: 'transparent' },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  timelineDotIdle: { backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#CBD5E1' },
  timelineLabel: { fontSize: 9, color: COLORS.grayText, textAlign: 'center', lineHeight: 12, paddingHorizontal: 2 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F6F7F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '48%',
    flexGrow: 1,
  },
  metaChipText: { fontSize: 13, color: COLORS.darkText, flexShrink: 1 },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.grayText },
  errorText: { marginTop: 15, fontSize: 16, color: COLORS.accent, textAlign: 'center', marginHorizontal: 20 },
  retryButton: { marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 10, backgroundColor: COLORS.grayLight, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backButtonText: { color: COLORS.darkText, fontSize: 16 },
  actionBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    gap: 10,
  },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold', marginLeft: 10 },
  budgetSubsection: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  budgetSubtitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText, marginLeft: 8 },
  budgetTableWrap: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  budgetTableHeader: { flexDirection: 'row', backgroundColor: COLORS.grayLight, paddingVertical: 10, paddingHorizontal: 8, gap: 6 },
  budgetTableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  budgetCell: { fontSize: 13, color: COLORS.darkText },
  budgetCellDesc: { flex: 2.4, fontWeight: '500' },
  budgetCellNum: { flex: 1, textAlign: 'right', paddingRight: 2 },
  budgetCellTotal: { fontWeight: '600', color: COLORS.primary },
  budgetTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: COLORS.primary },
  budgetTotalLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.darkText },
  budgetTotalValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  balanceFinal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.grayLight, padding: 15, borderRadius: 12, marginTop: 10 },
  balanceFinalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  balanceFinalValue: { fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  modalIconContainer: { alignItems: 'center', marginBottom: 12 },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: COLORS.grayText, marginBottom: 20, lineHeight: 20, textAlign: 'center' },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.darkText,
    backgroundColor: COLORS.background,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: COLORS.grayLight, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.darkText },
  modalRejectBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: COLORS.logout, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modalRejectText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
});

export default EventDetailScreenVencido;