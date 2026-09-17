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
  TextInput,
  useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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
  ink: '#0F172A',
  ink2: '#475569',
  mute: '#94A3B8',
  ok: '#047857',
  warn: '#B45309',
  okBg: '#D1FAE5',
  warnBg: '#FEF3C7',
};
const DIAS_MINIMOS_APROBACION = 7;
const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];  

const getDaysRemainingDetail = (eventDate) => {
  if (!eventDate) return null;
  const today = new Date(); 
  today.setHours(0, 0, 0, 0);
  let eventDateObj;
  
  if (typeof eventDate === 'string') {
    const trimmed = eventDate.trim();
    const isoMatch = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      eventDateObj = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      const dmyMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        eventDateObj = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        const date = new Date(eventDate);
        const isoStr = date.toISOString();
        const match = isoStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          eventDateObj = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        } else {
          eventDateObj = date;
        }
      }
    }
  } else {
    eventDateObj = new Date(eventDate);
    if (!isNaN(eventDateObj.getTime())) {
      const isoStr = eventDateObj.toISOString();
      const match = isoStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        eventDateObj = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      }
    }
  }
  
  if (isNaN(eventDateObj.getTime())) return null;
  eventDateObj.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((eventDateObj - today) / (1000 * 60 * 60 * 24));
  return diffDays;
};

const canApproveEventDetail = (eventDate) => {
  const days = getDaysRemainingDetail(eventDate);
  return days !== null && days >= DIAS_MINIMOS_APROBACION;
};

const isEventExpiredDetail = (eventDate) => {
  if (!eventDate) return false;
  const days = getDaysRemainingDetail(eventDate);
  return days !== null && days < 0;
};

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
  return timeString.includes(':') ? timeString : timeString;
};

const SectionHeader = ({ icon, title, color = COLORS.primary, subtitle }) => (
  <View style={styles.sectionHeaderRow}>
    <View style={[styles.sectionHeaderIconWrap, { backgroundColor: color + '1A' }]}>
      <Ionicons name={icon} size={19} color={color} />
    </View>
    <View style={styles.sectionHeaderTextWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const ActivityItem = ({ act, icon, color }) => (
  <View style={styles.activityItem}>
    <View style={styles.activityHeader}><Ionicons name={icon} size={20} color={color} /><Text style={styles.activityTitle}>{act.nombre || 'Actividad'}</Text></View>
    <View style={styles.activityDetails}>
      <View style={styles.activityDetailRow}><Ionicons name="person-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Responsable: {act.responsable || 'No especificado'}</Text></View>
      <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Inicio: {formatDate(act.fecha_inicio)}</Text></View>
      <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Fin: {formatDate(act.fecha_fin)}</Text></View>
    </View>
  </View>
);

const EventDetailScreen = () => {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { width: winW } = useWindowDimensions();
  const isWide = winW >= 640;

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
      
      const [eventResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/eventos/${numericId}`, { headers: { Authorization: `Bearer ${token}` } }),
        (async () => {
          try {
            const res = await axios.get(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
            setUser(res.data);
          } catch (err) { console.error('Error usuario', err); }
        })()
      ]);

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
        segmentos: eventData.Segmentos || eventData.segmentos || [],
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

  const handleApproveEvent = async () => {
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');
      await axios.put(`${API_BASE_URL}/eventos/${event.id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Éxito', 'Evento aprobado correctamente');
      router.replace('./EventosPendientes');
    } catch (error) {
      Alert.alert('Error', 'No se pudo aprobar el evento: ' + error.message);
    }
  };

  const openRejectModal = () => { setRejectReason(''); setShowRejectModal(true); };
  const closeRejectModal = () => { setShowRejectModal(false); setRejectReason(''); };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el motivo del rechazo');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');
      await axios.put(`${API_BASE_URL}/eventos/${event.id}/reject`, { razon_rechazo: rejectReason.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      closeRejectModal();
      Alert.alert('Éxito', 'Evento rechazado correctamente');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'No se pudo rechazar el evento: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ NUEVO: Función para finalizar el evento y pasarlo a Fase 3
  const handleFinalizarEvento = async () => {
    Alert.alert(
      'Finalizar Evento',
      '¿Estás seguro de que deseas finalizar este evento? Pasará a la Fase 3 y su estado cambiará a "finalizado".',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getTokenAsync();
              if (!token) {
                Alert.alert('Error', 'No hay sesión activa');
                return;
              }

              const response = await axios.put(
                `${API_BASE_URL}/eventos/${event.id}/finalizar-informe`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );

              Alert.alert('✅ Éxito', response.data.message || 'El evento ha pasado a Fase 3 correctamente.');
              
              // Actualizar el estado local para reflejar el cambio inmediatamente en la UI
              setEvent(prev => ({ ...prev, idfase: 3, status: 'finalizado' }));
              
            } catch (error) {
              console.error('❌ Error al finalizar evento:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo finalizar el evento. Intenta de nuevo.'
              );
            }
          }
        }
      ]
    );
  };

  const buildEventHtml = () => {
    const actividadesHtml = (titulo, lista) => {
      if (!lista || lista.length === 0) return '';
      return `<div class="section"><div class="section-title">${titulo}</div><ul>${lista.map(a => `<li><strong>${a.nombreActividad || 'Actividad'}</strong><br/>Responsable: ${a.responsable || 'No especificado'}<br/>Inicio: ${formatDate(a.fechaInicio)} — Fin: ${formatDate(a.fechaFin)}</li>`).join('')}</ul></div>`;
    };
    const serviciosHtml = event.serviciosContratados?.length > 0 ? `<div class="section"><div class="section-title">Servicios Contratados</div><ul>${event.serviciosContratados.map(s => `<li><strong>${s.nombreServicio || 'Servicio'}</strong><br/>${s.caracteristica ? `Características: ${s.caracteristica}<br/>` : ''}Fecha Entrega: ${formatDate(s.fechaInicio)}${s.observaciones ? `<br/>Obs: ${s.observaciones}` : ''}</li>`).join('')}</ul></div>` : '';
    const layoutHtml = event.layout ? `<div class="section"><div class="section-title">Layout del Evento</div><div>${event.layout.nombre || `Layout ID: ${event.layout.idlayout}`}</div></div>` : '';
    
    return `<html><head><meta charset="UTF-8"><style>@page { margin: 1cm; } body { font-family: Arial, sans-serif; padding: 1.5cm; line-height: 1.6; color: #333; } h1 { color: #C44200; margin-bottom: 0.5cm; border-bottom: 2px solid #C44200; padding-bottom: 0.3cm; } .section { margin-bottom: 1cm; } .section-title { font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 0.3cm; padding-bottom: 0.2cm; border-bottom: 1px solid #ddd; } .detail-row { margin-bottom: 0.2cm; } .label { font-weight: bold; color: #0F172A; } ul { padding-left: 1cm; margin: 0.2cm 0; } li { margin-bottom: 0.3cm; } .budget { font-weight: bold; } .positive { color: #27ae60; } .negative { color: #EF4444; }</style></head><body><h1>${event.title}</h1><div class="section"><div class="section-title">Datos Generales</div><div class="detail-row"><span class="label">Fecha:</span> ${event.date}</div><div class="detail-row"><span class="label">Hora:</span> ${event.time}</div><div class="detail-row"><span class="label">Ubicación:</span> ${event.location}</div><div class="detail-row"><span class="label">Estado:</span> ${event.status}</div>${event.responsable ? `<div class="detail-row"><span class="label">Responsable:</span> ${event.responsable}</div>` : ''}</div>${event.creador ? `<div class="section"><div class="section-title">Propuesto por</div><div>${event.creador.nombre}</div><div>Rol: ${event.creador.role}</div><div>Email: ${event.creador.email}</div></div>` : ''}${event.Clasificacion ? `<div class="section"><div class="section-title">Clasificación Estratégica</div><div>${event.Clasificacion.nombreClasificacion} - ${event.Clasificacion.nombresubcategoria}</div></div>` : ''}${event.tiposEvento?.length > 0 ? `<div class="section"><div class="section-title">Tipos de Evento</div><ul>${event.tiposEvento.map(t => `<li>${t.nombretipo || 'Tipo desconocido'}</li>`).join('')}</ul></div>` : ''}${event.resultados ? `<div class="section"><div class="section-title">Resultados Esperados</div>${event.resultados.participacion_esperada ? `<div class="detail-row">Participación: ${event.resultados.participacion_esperada}</div>` : ''}${event.resultados.satisfaccion_esperada ? `<div class="detail-row">Satisfacción: ${event.resultados.satisfaccion_esperada}</div>` : ''}${event.resultados.otros_resultados ? `<div class="detail-row">Otros: ${event.resultados.otros_resultados}</div>` : ''}</div>` : ''}${event.recursos?.length > 0 ? `<div class="section"><div class="section-title">Recursos</div><ul>${event.recursos.map(r => `<li>${r.cantidad || 1} x ${r.nombre_recurso} (${r.recurso_tipo})</li>`).join('')}</ul></div>` : ''}${event.comite?.length > 0 ? `<div class="section"><div class="section-title">Comité del Evento</div><ul>${event.comite.map(m => `<li>${[m.nombre, m.apellidopat, m.apellidomat].filter(Boolean).join(' ')} (${m.role}) - ${m.email}</li>`).join('')}</ul></div>` : ''}${actividadesHtml('Actividades Previas', event.actividadesPrevias)}${actividadesHtml('Actividades Durante el Evento', event.actividadesDurante)}${actividadesHtml('Actividades Después del Evento', event.actividadesPost)}${serviciosHtml}${layoutHtml}${event.presupuesto ? `<div class="section"><div class="section-title">Presupuesto</div><div class="detail-row">Total Egresos: Bs ${(event.presupuesto.total_egresos || 0).toFixed(2)}</div><div class="detail-row">Total Ingresos: Bs ${(event.presupuesto.total_ingresos || 0).toFixed(2)}</div><div class="detail-row budget ${(event.presupuesto.balance || 0) >= 0 ? 'positive' : 'negative'}">Balance: Bs ${(event.presupuesto.balance || 0).toFixed(2)}</div></div>` : ''}</body></html>`;
  };

  const generateEventPDF = async () => {
    if (!event) { Alert.alert('Error', 'No hay datos del evento para imprimir.'); return; }
    const htmlContent = buildEventHtml();
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`${htmlContent}<script>setTimeout(() => { window.print(); window.close(); }, 500);</script>`);
      printWindow.document.close();
      return;
    }
    try {
      const result = await Print.printToFileAsync({ html: htmlContent });
      if (!result?.uri) throw new Error('No se generó el PDF.');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Imprimir o guardar evento' });
      } else {
        Alert.alert('PDF generado', 'El archivo PDF se guardó en tu dispositivo.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el PDF: ' + (error.message || 'Error desconocido'));
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Cargando detalles del evento...</Text></View>;
  if (error) return <View style={styles.centered}><Ionicons name="alert-circle-outline" size={50} color={COLORS.accent} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={fetchEventDetails}><Text style={styles.retryButtonText}>Reintentar</Text></TouchableOpacity><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>Volver</Text></TouchableOpacity></View>;
  if (!event || Object.keys(event).length === 0) return <View style={styles.centered}><Ionicons name="information-circle-outline" size={50} color={COLORS.grayText} /><Text style={styles.errorText}>No se encontraron datos del evento.</Text><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>Volver</Text></TouchableOpacity></View>;

  // ✅ NUEVO: Lógica para mostrar el botón solo el día del evento (o si ya pasó la fecha pero sigue en fase 2 aprobado)
  const daysRemaining = getDaysRemainingDetail(event.fechaEventoRaw);
  const isTodayOrPast = daysRemaining !== null && daysRemaining <= 0;
  const canFinalize = isTodayOrPast && event.status === 'aprobado' && event.idfase === 2;

  const aprobado = event.status === 'aprobado';
  const phaseNow = getCurrentPhaseFromFases([{ nrofase: event.idfase }]);
  const diasParaAprobar = daysRemaining === null ? '—' : daysRemaining <= 0 ? 'Hoy' : `${daysRemaining} día${daysRemaining === 1 ? '' : 's'}`;

  const pdiList = (event.objetivosPDI || []).map(pdi => typeof pdi === 'string' ? pdi : (pdi?.nombre || pdi?.nombreobjetivo || `Objetivo PDI`));

  const allSegReal = [
    ...(Array.isArray(event.segmentos) ? event.segmentos : []),
    ...(event.objetivos || [])
      .filter(o => o.segmentos && Array.isArray(o.segmentos))
      .flatMap(o => o.segmentos)
  ];
  const segMap = new Map();
  allSegReal.forEach(sg => segMap.set(sg.idsegmento || sg.nombre_segmento || JSON.stringify(sg), sg));
  const segmentCount = segMap.size;

  const recTec = (event.recursos || []).filter(r => r.recurso_tipo === 'tecnologico').length;
  const recMob = (event.recursos || []).filter(r => r.recurso_tipo === 'mobiliario').length;
  const recVaj = (event.recursos || []).filter(r => r.recurso_tipo === 'vajilla').length;

  const infoItems = [
    !!event.title,
    !!event.date && event.date !== 'No especificada',
    !!event.location && event.location !== 'Ubicación no especificada',
    !!event.responsable,
    !!event.Clasificacion,
    (event.tiposEvento || []).length > 0,
    !!event.resultados && Object.values(event.resultados).some(v => v),
    (event.recursos || []).length > 0,
    (event.comite || []).length > 0,
    (event.actividadesPrevias || []).length > 0,
    (event.actividadesDurante || []).length > 0,
    (event.actividadesPost || []).length > 0,
    (event.serviciosContratados || []).length > 0,
    !!event.presupuesto,
    (event.objetivosPDI || []).length > 0,
  ];
  const pctInfo = Math.round((infoItems.filter(Boolean).length / infoItems.length) * 100);

  const gridCard = isWide ? styles.gridCardTwo : styles.gridCardFull;

  return (
    <View style={styles.screenContainer}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.topBarBtnLeft} accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={20} color={COLORS.ink2} />
          <Text style={styles.topBarBtnText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Detalle del evento</Text>
        <TouchableOpacity onPress={fetchEventDetails} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.topBarBtnRight} accessibilityRole="button" accessibilityLabel="Actualizar">
          <Ionicons name="refresh" size={20} color={COLORS.ink2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.bannerImage} resizeMode="cover" />}

        {/* Resumen ejecutivo */}
        <View style={styles.summ}>
          <Text style={styles.summKicker}>Fase {phaseNow.number} · {phaseNow.label}</Text>
          <Text style={styles.summTitle}>{event.title}</Text>
          <View style={styles.summRow}>
            <View style={styles.summStat}>
              <Text style={styles.summStatVal} numberOfLines={1}>{event.date}</Text>
              <Text style={styles.summStatLbl}>Fecha evento</Text>
            </View>
            <View style={styles.summStat}>
              <Text style={styles.summStatVal} numberOfLines={1}>{event.time}</Text>
              <Text style={styles.summStatLbl}>Hora</Text>
            </View>
            <View style={styles.summStat}>
              <Text style={styles.summStatVal} numberOfLines={1}>{event.location}</Text>
              <Text style={styles.summStatLbl}>Ubicación</Text>
            </View>
            <View style={styles.summStat}>
              <Text style={styles.summStatVal} numberOfLines={1}>{diasParaAprobar}</Text>
              <Text style={styles.summStatLbl}>Para aprobar</Text>
            </View>
          </View>
        </View>

        {/* Estado */}
        <View style={[styles.statePill, { backgroundColor: aprobado ? COLORS.okBg : COLORS.warnBg }]}>
          <Ionicons name={aprobado ? 'checkmark-circle' : 'time-outline'} size={16} color={aprobado ? COLORS.ok : COLORS.warn} />
          <Text style={[styles.statePillText, { color: aprobado ? COLORS.ok : COLORS.warn }]}>
            {aprobado ? 'Aprobado' : 'Pendiente'}
          </Text>
          {!aprobado && daysRemaining !== null && daysRemaining < DIAS_MINIMOS_APROBACION && !isEventExpiredDetail(event.fechaEventoRaw) && (
            <Text style={[styles.statePillHint, { color: COLORS.warn }]}>· Faltan menos de {DIAS_MINIMOS_APROBACION} días</Text>
          )}
        </View>

        {/* Proceso del evento */}
        <View style={styles.sectionCard}>
          <EventProcessTimeline estado={event.status} idfase={event.idfase} fases={event.fases} />
        </View>

        {/* Grilla de resumen */}
        <View style={styles.gridWrap}>
          {/* Datos generales */}
          <View style={gridCard}>
            <SectionHeader icon="document-text-outline" title="Datos generales" />
            <View style={styles.kv}><Text style={styles.kvL}>Estado</Text><View style={[styles.kvPill, { backgroundColor: aprobado ? COLORS.okBg : COLORS.warnBg }]}><Ionicons name={aprobado ? 'checkmark' : 'time'} size={13} color={aprobado ? COLORS.ok : COLORS.warn} /><Text style={[styles.kvPillText, { color: aprobado ? COLORS.ok : COLORS.warn }]}>{aprobado ? 'Aprobado' : 'Pendiente'}</Text></View></View>
            {event.responsable ? (<View style={styles.kv}><Text style={styles.kvL}>Responsable</Text><Text style={styles.kvV} numberOfLines={2}>{event.responsable}</Text></View>) : null}
            {event.creador ? (<View style={styles.kv}><Text style={styles.kvL}>Propuesto por</Text><Text style={styles.kvV} numberOfLines={2}>{event.creador.nombre}</Text></View>) : null}
            <View style={styles.kv}><Text style={styles.kvL}>Segmentos</Text><Text style={styles.kvV} numberOfLines={2}>{segmentCount > 0 ? `${segmentCount} segmento(s)` : 'No definidos'}</Text></View>
          </View>

          {/* Clasificación */}
          <View style={gridCard}>
            <SectionHeader icon="layers-outline" title="Clasificación" />
            {event.Clasificacion ? (<View style={styles.kv}><Text style={styles.kvL}>Principal</Text><Text style={styles.kvV} numberOfLines={2}>{event.Clasificacion.nombreClasificacion}</Text></View>) : null}
            {(event.tiposEvento || []).length > 0 ? (<View style={styles.kv}><Text style={styles.kvL}>Tipo</Text><Text style={styles.kvV} numberOfLines={2}>{event.tiposEvento.map(t => t.nombretipo).join(', ')}</Text></View>) : null}
            {(event.objetivosPDI || []).length > 0 ? (<View style={styles.kv}><Text style={styles.kvL}>PDI</Text><Text style={styles.kvV} numberOfLines={2}>{pdiList[0]}</Text></View>) : null}
            <View style={styles.bar}><View style={[styles.barFill, { width: `${pctInfo}%` }]} /></View>
            <Text style={styles.barLbl}>{pctInfo}% de la información completa</Text>
          </View>

          {/* Segmentos Objetivo */}
          {allSegReal.length > 0 && (
            <View style={gridCard}>
              <SectionHeader icon="people-circle-outline" title="Segmentos Objetivo" />
              {Array.from(segMap.values()).map((seg, index) => (
                <View key={`seg-${seg.idsegmento || index}`} style={styles.kv}>
                  <Text style={styles.kvL}>{index + 1}</Text>
                  <Text style={styles.kvV} numberOfLines={2}>{seg.nombre_segmento || `Segmento ID ${seg.idsegmento}`}{seg.texto_personalizado ? ` · ${seg.texto_personalizado}` : ''}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actividades */}
          <View style={gridCard}>
            <SectionHeader icon="list-circle-outline" title="Actividades" />
            <View style={styles.kv}><Text style={styles.kvL}>Previas</Text><Text style={styles.kvV}>{event.actividadesPrevias?.length || 0}</Text></View>
            <View style={styles.kv}><Text style={styles.kvL}>Durante</Text><Text style={styles.kvV}>{event.actividadesDurante?.length || 0}</Text></View>
            <View style={styles.kv}><Text style={styles.kvL}>Post</Text><Text style={styles.kvV}>{event.actividadesPost?.length || 0}</Text></View>
          </View>

          {/* Recursos y servicios */}
          <View style={gridCard}>
            <SectionHeader icon="cube-outline" title="Recursos y servicios" />
            <View style={styles.kv}><Text style={styles.kvL}>Tecnológicos</Text><Text style={styles.kvV}>{recTec || '—'}</Text></View>
            <View style={styles.kv}><Text style={styles.kvL}>Mobiliario</Text><Text style={styles.kvV}>{recMob || '—'}</Text></View>
            <View style={styles.kv}><Text style={styles.kvL}>Vajilla</Text><Text style={styles.kvV}>{recVaj || '—'}</Text></View>
            <View style={styles.kv}><Text style={styles.kvL}>Servicios</Text><Text style={styles.kvV}>{event.serviciosContratados?.length || '—'}</Text></View>
          </View>
        </View>

        {/* Resultados Esperados */}
        {event.resultados && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="flag-outline" title="Resultados Esperados" />
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

        {/* Comité del Evento */}
        {event.comite && event.comite.length > 0 && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="people-outline" title="Comité del Evento" />
            <View style={styles.gridWrap}>
              {event.comite.map((miembro, index) => (
                <View key={index} style={gridCard}>
                  <Text style={styles.committeeName}>{[miembro.nombre, miembro.apellidopat, miembro.apellidomat].filter(Boolean).join(' ') || 'Miembro sin nombre'}</Text>
                  <Text style={styles.committeeRole}>Rol: {miembro.role === 'academico' ? 'Académico' : miembro.role}</Text>
                  <Text style={styles.committeeEmail}>Email: {miembro.email}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actividades Previas */}
        {event.actividadesPrevias && event.actividadesPrevias.length > 0 && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="calendar-outline" title="Actividades Previas" />
            {event.actividadesPrevias.map((act, index) => (
              <ActivityItem key={index} act={act} icon="list-circle-outline" color={COLORS.primary} />
            ))}
          </View>
        )}

        {/* Actividades Durante el Evento */}
        {event.actividadesDurante && event.actividadesDurante.length > 0 && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="play-circle-outline" title="Actividades Durante el Evento" />
            {event.actividadesDurante.map((act, index) => (
              <ActivityItem key={index} act={act} icon="play-circle-outline" color={COLORS.success} />
            ))}
          </View>
        )}

        {/* Actividades Después del Evento */}
        {event.actividadesPost && event.actividadesPost.length > 0 && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="checkmark-done-outline" title="Actividades Después del Evento" />
            {event.actividadesPost.map((act, index) => (
              <ActivityItem key={index} act={act} icon="checkmark-done-outline" color={COLORS.info} />
            ))}
          </View>
        )}

        {/* 11. Servicios Contratados */}
        {event.idfase >= 2 && event.serviciosContratados && event.serviciosContratados.length > 0 && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="construct-outline" title="Servicios Contratados" />
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

        {/* 12. Layout */}
        {event.idfase >= 2 && event.layout && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="grid-outline" title="Layout del Evento" />
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

        {/* Creador */}
        {event.creador && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="megaphone-outline" title="Propuesto por" />
            <Text style={styles.creatorName}>{event.creador.nombre}</Text>
            <Text style={styles.creatorRole}>Rol: {event.creador.role}</Text>
            <Text style={styles.creatorEmail}>Email: {event.creador.email}</Text>
          </View>
        )}

        {/* Objetivos PDI Institucional */}
        {event.objetivosPDI && event.objetivosPDI.length > 0 && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="school-outline" title="Objetivos del PDI Institucional" />
            {pdiList.map((pdi, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listText, { fontWeight: 'bold', color: COLORS.primary }]}>{index + 1}.</Text>
                <Text style={styles.listText}>{pdi}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Presupuesto */}
        {event.presupuesto && (
          <View style={styles.sectionCard}>
            <SectionHeader icon="wallet-outline" title="Presupuesto del Evento" />
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

        {/* Botones de Acción */}
        <View style={styles.actionButtonsContainer}>
          {/* ✅ NUEVO: Botón para Finalizar Evento (Solo visible el día del evento o después, si está en Fase 2 y aprobado) */}
          {canFinalize && (
            <TouchableOpacity style={[styles.nextStepButton, { backgroundColor: COLORS.purple }]} onPress={handleFinalizarEvento}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.nextStepButtonText}>Finalizar Evento (Pasar a Fase 3)</Text>
            </TouchableOpacity>
          )}

          {event.status === 'aprobado' && (
            <TouchableOpacity style={styles.nextStepButton} onPress={generateEventPDF}>
              <Ionicons name="print-outline" size={20} color={COLORS.white} />
              <Text style={styles.nextStepButtonText}>Imprimir Evento</Text>
            </TouchableOpacity>
          )}
          {user?.role !== 'admin' && event.status === 'aprobado' && event.idfase === 1 && (
            <TouchableOpacity style={styles.nextStepButton} onPress={() => router.push(`/admin/ProgramacionEvento?idevento=${event.id}`)}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.white} />
              <Text style={styles.nextStepButtonText}>Ir a Programación del Evento</Text>
            </TouchableOpacity>
          )}
          {user?.role === 'admin' && event.status === 'pendiente' && (
            <View style={{ marginTop: 10 }}>
              {canApproveEventDetail(event.fechaEventoRaw) ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity style={[styles.editButton, { backgroundColor: COLORS.success, flex: 1, marginRight: 8 }]} onPress={handleApproveEvent}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} /><Text style={styles.editButtonText}>Aprobar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.editButton, { backgroundColor: COLORS.logout, flex: 1, marginLeft: 8 }]} onPress={openRejectModal}>
                    <Ionicons name="close-circle-outline" size={20} color={COLORS.white} /><Text style={styles.editButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={[styles.editButton, { backgroundColor: COLORS.grayLight, flex: 1, marginRight: 8, borderWidth: 1, borderColor: COLORS.grayText, opacity: 0.7 }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.grayText} /><Text style={[styles.editButtonText, { color: COLORS.grayText }]}>Cerrado</Text>
                  </View>
                  <TouchableOpacity style={[styles.editButton, { backgroundColor: COLORS.logout, flex: 1, marginLeft: 8 }]} onPress={openRejectModal}>
                    <Ionicons name="close-circle-outline" size={20} color={COLORS.white} /><Text style={styles.editButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!canApproveEventDetail(event.fechaEventoRaw) && !isEventExpiredDetail(event.fechaEventoRaw) && (
                <View style={[styles.sectionCard, { backgroundColor: '#E3F2FD', marginTop: 15, borderLeftWidth: 4, borderLeftColor: COLORS.info, flexDirection: 'row', alignItems: 'center', padding: 12 }]}>
                  <Ionicons name="lock-closed" size={20} color={COLORS.info} />
                  <Text style={{ fontSize: 14, color: COLORS.info, fontWeight: '600', marginLeft: 10, flex: 1 }}>Aprobación cerrada: faltan menos de {DIAS_MINIMOS_APROBACION} días para el evento.</Text>
                </View>
              )}
              {isEventExpiredDetail(event.fechaEventoRaw) && (
                <View style={[styles.sectionCard, { backgroundColor: COLORS.grayLight, marginTop: 15, borderLeftWidth: 4, borderLeftColor: COLORS.warning, flexDirection: 'row', alignItems: 'center', padding: 12 }]}>
                  <Ionicons name="time-outline" size={20} color={COLORS.warning} />
                  <Text style={{ fontSize: 14, color: COLORS.warning, fontWeight: '600', marginLeft: 10, flex: 1 }}>Este evento ha vencido y ya no puede ser aprobado.</Text>
                </View>
              )}
            </View>
          )}
          {event.status === 'pendiente' && user?.role !== 'admin' && (
            <TouchableOpacity style={styles.editButton} onPress={() => router.push(`/admin/EventDetailScreen?eventId=${event.id}`)}>
              <Ionicons name="create-outline" size={20} color={COLORS.white} /><Text style={styles.editButtonText}>Editar Evento</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal de Rechazo */}
      {showRejectModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="close-circle" size={48} color={COLORS.logout} />
              <Text style={styles.modalTitle}>Rechazar Evento</Text>
              <Text style={styles.modalEventName} numberOfLines={2}>{event?.title || 'Sin título'}</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Motivo del rechazo <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.reasonInput} placeholder="Ingresa el motivo del rechazo..." placeholderTextColor={COLORS.grayText} accessibilityLabel="Motivo del rechazo" value={rejectReason} onChangeText={setRejectReason} multiline numberOfLines={4} textAlignVertical="top" autoFocus />
              <Text style={styles.modalHint}>{rejectReason.length} caracteres</Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeRejectModal} disabled={isSubmitting}>
                <Text style={[styles.modalButtonText, {color: COLORS.grayText}]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton, isSubmitting && styles.buttonDisabled]} onPress={handleRejectSubmit} disabled={isSubmitting || !rejectReason.trim()}>
                {isSubmitting ? <ActivityIndicator size="small" color={COLORS.white} /> : (<><Ionicons name="close" size={18} color={COLORS.white} /><Text style={[styles.modalButtonText, {color: COLORS.white}]}>Rechazar</Text></>)}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

EventDetailScreen.options = { headerShown: false };

const styles = StyleSheet.create({
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionHeaderIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionHeaderTextWrap: { flex: 1 },
  sectionHeaderSubtitle: { fontSize: 12, color: COLORS.mute, marginTop: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkText },

  // Top bar clara (Opción B)
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: Platform.OS === 'ios' ? 50 : 14, paddingBottom: 12, backgroundColor: COLORS.background },
  topBarBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  topBarBtnRight: { paddingVertical: 6, paddingHorizontal: 4 },
  topBarBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.ink2 },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkText },

  // Banner
  bannerImage: { width: '100%', height: 190, borderRadius: 16, marginBottom: 16, backgroundColor: COLORS.grayLight },

  // Resumen ejecutivo (tarjeta oscura)
  summ: { backgroundColor: COLORS.ink, borderRadius: 18, padding: 18, marginBottom: 12, overflow: 'hidden' },
  summKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: '#FDBA74', textTransform: 'uppercase', marginBottom: 8 },
  summTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white, lineHeight: 27, marginBottom: 16 },
  summRow: { flexDirection: 'row', marginHorizontal: -4, flexWrap: 'wrap' },
  summStat: { flex: 1, minWidth: 100, margin: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  summStatVal: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  summStatLbl: { color: '#D6D3D1', fontSize: 10.5, marginTop: 3 },

  // Pill estado
  statePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16, gap: 6 },
  statePillText: { fontSize: 13, fontWeight: '700' },
  statePillHint: { fontSize: 11, fontWeight: '600' },

  // Grilla de resumen
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridCardTwo: { width: '50%', paddingHorizontal: 6, marginBottom: 6 },
  gridCardFull: { width: '100%', paddingHorizontal: 6, marginBottom: 6 },
  kv: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  kvL: { width: 96, fontSize: 12, color: COLORS.mute, fontWeight: '600' },
  kvV: { flex: 1, fontSize: 13.5, color: COLORS.darkText, fontWeight: '600' },
  kvPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  kvPillText: { fontSize: 12, fontWeight: '700' },
  bar: { height: 8, backgroundColor: COLORS.grayLight, borderRadius: 99, overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', borderRadius: 99, backgroundColor: COLORS.primary },
  barLbl: { fontSize: 11, color: COLORS.mute, marginTop: 6, fontWeight: '600' },

  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  activityItem: { backgroundColor: COLORS.grayLight, borderRadius: 12, padding: 15, marginBottom: 12 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  activityTitle: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginLeft: 10, flex: 1 },
  activityDetails: { paddingLeft: 5 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 20, width: '100%', maxWidth: 400, maxHeight: '80%', overflow: 'hidden', ...Platform.select({ ios: { shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 10 } }) },
  modalHeader: { alignItems: 'center', padding: 24, backgroundColor: '#FFEBEE', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.logout, marginTop: 8 },
  modalEventName: { fontSize: 14, color: COLORS.grayText, textAlign: 'center', marginTop: 8, paddingHorizontal: 16 },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 8 },
  required: { color: COLORS.logout },
  reasonInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.darkText, minHeight: 100, borderWidth: 1, borderColor: COLORS.border, textAlignVertical: 'top' },
  modalHint: { fontSize: 12, color: COLORS.grayText, marginTop: 6, textAlign: 'right' },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 12 },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  cancelButton: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  confirmButton: { backgroundColor: COLORS.logout },
  buttonDisabled: { opacity: 0.6 },
  modalButtonText: { fontSize: 15, fontWeight: '600' },
  activityDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  activityDetailText: { fontSize: 14, color: COLORS.grayText, marginLeft: 8, flex: 1 },
  serviceItem: { backgroundColor: COLORS.grayLight, borderRadius: 12, padding: 15, marginBottom: 12 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  serviceTitle: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginLeft: 10, flex: 1 },
  serviceDetails: { paddingLeft: 5 },
  serviceDetailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  serviceDetailText: { fontSize: 14, color: COLORS.grayText, marginLeft: 8, flex: 1 },
  layoutImage: { width: '100%', height: 250, borderRadius: 12, backgroundColor: COLORS.grayLight, marginBottom: 10 },
  layoutPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, backgroundColor: COLORS.grayLight, borderRadius: 12, marginBottom: 10 },
  layoutPlaceholderText: { fontSize: 14, color: COLORS.grayText, marginTop: 10, textAlign: 'center' },
  layoutName: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, textAlign: 'center' },
  listIcon: { marginRight: 12, marginTop: 4 },
  listText: { fontSize: 14, color: COLORS.darkText, flex: 1, lineHeight: 20 },
  segmentItem: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  segmentIcon: { marginRight: 8 },
  segmentName: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  segmentDescription: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic', paddingLeft: 24 },
  resourceCategory: { marginBottom: 12 },
  resourceCategoryTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8, marginLeft: 28 },
  committeeMember: { backgroundColor: COLORS.grayLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  committeeName: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 4 },
  committeeRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 4 },
  committeeEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 15, marginTop: 5 },
  phaseBadgeText: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  container: { flex: 1, backgroundColor: COLORS.background },
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { padding: 14, paddingBottom: 40, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.grayText },
  errorText: { marginTop: 15, fontSize: 16, color: COLORS.accent, textAlign: 'center', marginHorizontal: 20 },
  retryButton: { marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 10, backgroundColor: COLORS.grayLight, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backButtonText: { color: COLORS.darkText, fontSize: 16 },
  creatorName: { fontSize: 16, color: COLORS.darkText, fontWeight: '500', marginBottom: 3 },
  creatorRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 3 },
  creatorEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailIcon: { marginRight: 10 },
  detailText: { fontSize: 15, color: COLORS.darkText, flex: 1 },
  actionButtonsContainer: { marginTop: 20, marginBottom: 20 },
  editButton: { flexDirection: 'row', backgroundColor: COLORS.success, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  editButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  nextStepButton: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  nextStepButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
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
});

export default EventDetailScreen;