import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  StatusBar, ScrollView, ActivityIndicator, Platform,Modal, TextInput
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import QRCode from 'react-qr-code';

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FFEDD5', secondary: '#4B5563',
  accent: '#EF4444', success: '#10B981', warning: '#F59E0B',
  info: '#3B82F6', purple: '#8B5CF6',
  background: '#F9FAFB', surface: '#FFFFFF',
  textPrimary: '#1F2937', textSecondary: '#6B7280', textTertiary: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6', white: '#FFFFFF',
};

//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY    = 'studentAuthToken';
const USER_DATA_KEY = 'studentUserData';

const getToken = async () => {
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
};

const getUserData = async () => {
  try {
    const raw = Platform.OS === 'web'
      ? localStorage.getItem(USER_DATA_KEY)
      : await SecureStore.getItemAsync(USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveUserData = async (data) => {
  const str = JSON.stringify(data);
  try {
    if (Platform.OS === 'web') localStorage.setItem(USER_DATA_KEY, str);
    else await SecureStore.setItemAsync(USER_DATA_KEY, str);
  } catch {}
};

const clearSession = async () => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
    } catch (e) {
      console.error("Error al eliminar de localStorage en web:", e);
    }
  } else {
    try {
      // .catch() individual para que si uno falla, el otro se siga ejecutando
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(err => console.warn(err));
      await SecureStore.deleteItemAsync(USER_DATA_KEY).catch(err => console.warn(err));
    } catch (e) {
      console.error("Error al eliminar de SecureStore en nativo:", e);
    }
  }
};

const getCodigoEstudiante = (u) => u?.codigoestudiante || u?.codigo_estudiante || '';
const getSemestre        = (u) => u?.semestre || '';
const getTelefono        = (u) => u?.telefono || '';

const tieneDatosCompletos = (u) =>
  !!(getCodigoEstudiante(u) && getSemestre(u) && getTelefono(u));

const CATEGORY_COLORS = {
  taller: '#3B82F6', conferencia: '#EF4444', seminario: '#F59E0B',
  webinar: '#8B5CF6', capacitacion: '#EC4899', charla: '#10B981',
};

const STATUS_MAP = {
  aprobado: 'Confirmado', publicado: 'Confirmado', confirmado: 'Confirmado',
  pendiente: 'Pendiente', programado: 'Próximo', en_curso: 'En curso',
  completado: 'Completado', finalizado: 'Completado', cancelado: 'Cancelado',
};

const STATUS_COLORS = {
  Confirmado: '#10B981', Próximo: '#3B82F6', 'En curso': '#F59E0B',
  Completado: '#6B7280', Cancelado: '#EF4444', Pendiente: '#F59E0B',
};

const mapEvento = (e) => {
  // Backend already transforms fields: title, date, time, location, organizer, faculty, category
  const catRaw = (e.category || e.clasificacion?.label || e.categoria || 'evento').toLowerCase();
  const cat = catRaw === 'general' ? 'evento' : catRaw; // normalize "General" → color lookup
  const estado = (e.estado || 'aprobado').toLowerCase();
  const status = STATUS_MAP[estado] || 'Confirmado';

  // Clean up time — remove timezone offset like "00:11:00+00"
  const rawTime = e.time || e.horaevento || e.hora || '–';
  const cleanTime = rawTime.includes('+') ? rawTime.split('+')[0].slice(0, 5) : rawTime.slice(0, 5);

  return {
    id: e.id || e.idevento,
    title: e.title || e.nombreevento || 'Sin título',
    date: e.date || e.submittedDate || '–',
    time: cleanTime,
    location: e.location || e.lugarevento || null,
    category: (e.category || cat).charAt(0).toUpperCase() + (e.category || cat).slice(1),
    categoryColor: CATEGORY_COLORS[cat] || COLORS.info,
    status,
    statusColor: STATUS_COLORS[status] || COLORS.success,
    organizador: e.organizer || e.organizer || e.responsable_evento || null,
    facultad: e.faculty || e.facultad?.nombre || null,
    modalidad: e.modalidad || null,
    duracion: e.duracion ? `${e.duracion} min` : null,
    participantes: e.participantes || null,
    capacidad: e.capacidad || null,
  };
};

const EventCard = ({ event, onPress,onInscribir, yaInscrito, inscribiendo }) => {
  if (!event) return null;
  return (
  <TouchableOpacity style={styles.eventCard} onPress={onPress} activeOpacity={0.85}>
    {/* Header row */}
    <View style={styles.eventHeader}>
      <View style={[styles.eventBadge, { backgroundColor: event.categoryColor + '18' }]}>
        <Text style={[styles.eventBadgeText, { color: event.categoryColor }]}>{event.category}</Text>
      </View>
      <Text style={styles.eventDate}>{event.date}</Text>
    </View>

    {/* Title */}
    <Text style={styles.eventTitle}>{event.title}</Text>

    {/* Details */}
    <View style={styles.eventDetails}>
      {event.organizador && (
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}><Ionicons name="person-outline" size={13} color={COLORS.primary} /></View>
          <Text style={styles.detailText} numberOfLines={1}>{event.organizador}</Text>
        </View>
      )}
      <View style={styles.detailRow}>
        <View style={styles.detailIconWrap}><Ionicons name="time-outline" size={13} color={COLORS.primary} /></View>
        <Text style={styles.detailText}>{event.time}{event.duracion ? ` · ${event.duracion}` : ''}</Text>
      </View>
      {event.location && (
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}><Ionicons name="location-outline" size={13} color={COLORS.primary} /></View>
          <Text style={styles.detailText} numberOfLines={1}>{event.location}</Text>
        </View>
      )}
      {event.facultad && (
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}><Ionicons name="school-outline" size={13} color={COLORS.primary} /></View>
          <Text style={styles.detailText} numberOfLines={1}>{event.facultad}</Text>
        </View>
      )}
    </View>

     <View style={styles.eventFooter}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: event.statusColor }]} />
        <Text style={[styles.statusText, { color: event.statusColor }]}>{event.status}</Text>
      </View>

      <TouchableOpacity
        style={[styles.inscribirBtn, yaInscrito && styles.inscribirBtnDisabled]}
        onPress={(e) => { e.stopPropagation(); if (!yaInscrito) onInscribir(event.id); }}
        disabled={yaInscrito || inscribiendo}
      >
        {inscribiendo ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name={yaInscrito ? 'checkmark-circle' : 'add-circle-outline'} size={16} color={COLORS.white} />
            <Text style={styles.inscribirBtnText}>{yaInscrito ? 'Inscrito' : 'Inscribirme'}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);
}
const ActionCard = ({ title, description, icon, color, onPress }) => (
  <TouchableOpacity style={[styles.actionCard, { borderColor: color + '20' }]} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.actionIcon, { backgroundColor: color + '12' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>{title}</Text>
      {description && <Text style={styles.actionDesc}>{description}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
  </TouchableOpacity>
);

const HomeEstudianteScreen = () => {
  const router = useRouter();

  const [userData, setUserData]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [events, setEvents]       = useState([]);
  const [error, setError]         = useState(null);
  const [stats, setStats]         = useState({ total: 0, proximos: 0, completados: 0 });
  const [inscritos, setInscritos] = useState(new Set());
  const [inscribiendoId, setInscribiendoId] = useState(null);
  const [showInscripcionModal, setShowInscripcionModal] = useState(false);
  const [eventoPendiente, setEventoPendiente] = useState(null);
  const [formInscripcion, setFormInscripcion] = useState({ codigo_estudiante: '', semestre: '', telefono: '' });
  const [savingInscripcion, setSavingInscripcion] = useState(false);
  const [datosCompletados, setDatosCompletados] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');

  const BOT_USERNAME = 'EventUniBot';

  const checkTelegramStatus = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('📱 Perfil recibido:', response.data);
      console.log('🔗 telegram_chat_id:', response.data.telegram_chat_id);
      console.log('🔗 telegram_username:', response.data.telegram_username);

      const chatId = response.data.telegram_chat_id;
      const hasTelegram = chatId !== null && 
                          chatId !== undefined && 
                          chatId !== '' && 
                          chatId !== 'null' &&
                          chatId !== 'undefined';
      
      console.log('✅ Tiene Telegram vinculado:', hasTelegram);
      setIsTelegramLinked(hasTelegram);
      setTelegramUsername(response.data.telegram_username || '');
    } catch (error) {
      console.error('Error al verificar estado de Telegram:', error);
    }
  }, []);

  // ✅ FUNCIÓN PARA DESVINCULAR TELEGRAM
  const unlinkTelegram = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      await axios.put(
        `${API_BASE_URL}/users/unlink-telegram`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setIsTelegramLinked(false);
      setTelegramUsername('');
      
      if (Platform.OS === 'web') {
        window.alert('✓ Telegram desvinculado correctamente');
      } else {
        Alert.alert('✓ Éxito', 'Telegram desvinculado correctamente');
      }
    } catch (error) {
      console.error('Error al desvincular Telegram:', error);
      Alert.alert('Error', 'No se pudo desvincular Telegram');
    }
  }, []);

  const registrarEnEvento = async (eventId) => {
    const token = await getToken();
    await axios.post(`${API_BASE_URL}/eventos/${eventId}/registrar`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const handleInscribir = async (eventId) => {
  // Verificar si tiene datos completos (en userData O si ya los completó en esta sesión)
  if (tieneDatosCompletos(userData) || datosCompletados) {
    setInscribiendoId(eventId);
    try {
      await registrarEnEvento(eventId);
      setInscritos(prev => new Set(prev).add(eventId));
      Alert.alert('✅ Inscrito', 'Te has registrado exitosamente al evento.');
    } catch (err) {
      console.error('Error al inscribirse:', err);
      if (err.response?.status === 409) {
        setInscritos(prev => new Set(prev).add(eventId));
        Alert.alert('Ya estabas inscrito', 'Ya tenías una inscripción registrada para este evento.');
      } else {
        Alert.alert('Error', err.response?.data?.message || 'No se pudo completar la inscripción.');
      }
    } finally {
      setInscribiendoId(null);
    }
    return;
  }

    setEventoPendiente(eventId);
    setFormInscripcion({
      codigo_estudiante: getCodigoEstudiante(userData),
      semestre: getSemestre(userData),
      telefono: getTelefono(userData),
    });
    setShowInscripcionModal(true);
  };

  const handleLogout = () => {
  const performLogout = async () => {
    try {
      await clearSession();
      
      // Limpiar estados locales para evitar datos residuales o fugas de memoria
      setUserData(null);
      setEvents([]);
      setInscritos(new Set());
      
      // Redirigir al login (usa '/login' o '/' según como tengas configurado tu router)
      router.replace('/Login'); 
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Forzar redirección incluso si algo falló inesperadamente
      router.replace('/login');
    }
  };

  if (Platform.OS === 'web') {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      performLogout();
    }
  } else {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: performLogout,
        },
      ],
      { cancelable: true }
    );
  }
};

  const confirmarInscripcion = async () => {
  const { codigo_estudiante, semestre, telefono } = formInscripcion;
  if (!codigo_estudiante || !semestre || !telefono) {
    Alert.alert('Faltan datos', 'Completá código de estudiante, semestre y teléfono.');
    return;
  }

  setSavingInscripcion(true);
  try {
    const token = await getToken();

    await axios.put(`${API_BASE_URL}/estudiantes/mis-datos-inscripcion`, {
      codigoestudiante: codigo_estudiante, semestre, telefono,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await registrarEnEvento(eventoPendiente);
      const userDataConDatos = {
      ...userData,
      codigoestudiante: codigo_estudiante,
      semestre: semestre,
      telefono: telefono,
    };
     await saveUserData(userDataConDatos);

     setUserData(userDataConDatos);
    
    // Marcar que los datos fueron completados (para esta sesión)
    setDatosCompletados(true);

    setInscritos(prev => new Set(prev).add(eventoPendiente));
    setShowInscripcionModal(false);
    Alert.alert('✅ Inscrito', 'Te has registrado exitosamente al evento.');
    
  } catch (err) {
    console.error('Error al inscribirse:', err);
    if (err.response?.status === 409) {
      setInscritos(prev => new Set(prev).add(eventoPendiente));
      setShowInscripcionModal(false);
      Alert.alert('Ya estabas inscrito', 'Ya tenías una inscripción registrada para este evento.');
    } else {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo completar la inscripción.');
    }
  } finally {
    setSavingInscripcion(false);
  }
};

  useEffect(() => {
    const init = async () => {
      const token = await getToken();
      if (!token) { redirectToLogin('Sesión expirada, inicia sesión nuevamente.'); return; }

       const perfilFresco = await fetchUserProfile();
        const user = perfilFresco || await getUserData();
        if (!user) { redirectToLogin('No se encontró información de sesión.'); return; }
        if (user.role !== 'student') { redirectToLogin(`Acceso no válido. Rol: ${user.role}`); return; }

      setUserData(user);
      await checkTelegramStatus();
    };
    init();
  }, []);

  const redirectToLogin = (msg) => {
    Alert.alert('Sesión no válida', msg, [{ text: 'OK', onPress: () => { clearSession(); router.replace('/login'); } }]);
  };

  const fetchEvents = useCallback(async (user) => {
  if (!user) return;
  setLoading(true);
  setError(null);

  try {
    const token = await getToken();
    if (!token) throw new Error('Token no disponible');

    let facultadId = user.facultad_id;
    let facultadNombre = user.facultad_nombre || user.facultad?.nombre;

    

    if (!facultadId) {
      setError('Tu perfil no tiene facultad asignada. Contacta al administrador.');
      setLoading(false);
      return;
    }

    const res = await axios.get(`${API_BASE_URL}/eventos/aprobados-por-facultad-y-fecha`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { facultad_id: facultadId },
      timeout: 10000,
    });

    const raw = Array.isArray(res.data) ? res.data : [];

    // ✅ PASO 1: Filtrar fase 2
    const fase2 = raw.filter(e =>
      e.idfase === 2 || e.idfase === '2' ||
      e.fase?.nrofase === 2 || e.fase?.nrofase === '2'
    );

    // ✅ PASO 2: Filtrar solo eventos futuros o de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
   console.log('🔍 FECHA ACTUAL:', hoy.toISOString());

    const eventosFuturos = fase2.filter(e => {
  const fechaStr = e.date || e.fechaevento || e.fecha_inicio;
  console.log(`\n📅 Evento: "${e.nombreevento || e.title}"`);
  console.log('   Fecha raw:', fechaStr);

  if (!fechaStr || fechaStr === '–') {
    console.log('SIN FECHA - Se muestra');
    return true;
  }

  const fechaEvento = new Date(fechaStr);
  const esValida = !isNaN(fechaEvento.getTime());
  console.log('Es válida:', esValida);

  if (!esValida) {
    console.log('FECHA INVÁLIDA - Se muestra');
    return true;
  }

  console.log('Fecha parseada:', fechaEvento.toISOString());
  fechaEvento.setHours(0, 0, 0, 0);
  const esFuturo = fechaEvento >= hoy;

  console.log('Fecha evento (normalizada):', fechaEvento.toISOString());
  console.log('¿Es futuro?', esFuturo ? '✅ SÍ' : '❌ NO');
  return esFuturo;
});

    console.log(`📅 Eventos: ${raw.length} total → ${fase2.length} fase 2 → ${eventosFuturos.length} futuros`);


    const mapped = eventosFuturos.map(mapEvento);

    const proximos = mapped.filter(e => 
      e.status === 'Próximo' || e.status === 'Confirmado'
    ).length;
    const completados = mapped.filter(e => 
      e.status === 'Completado'
    ).length;

    setEvents(mapped);
    setStats({ total: mapped.length, proximos, completados });

  } catch (err) {
    console.error('Error cargando eventos:', err);
    if (err.response?.status === 400) setError('Tu perfil no tiene facultad asignada. Contacta al administrador.');
    else if (err.response?.status === 404) setError('Endpoint de eventos no encontrado.');
    else setError('No se pudieron cargar los eventos. Verifica tu conexión.');
  } finally {
    setLoading(false);
  }
}, []);

const fetchMisInscripciones = useCallback(async () => {
  try {
    const token = await getToken();
    const res = await axios.get(`${API_BASE_URL}/estudiantes/mis-inscripciones`, {
      headers: { Authorization: `Bearer ${token}` },
    });
     const eventos = Array.isArray(res.data) 
      ? res.data 
      : (res.data?.eventosInscritos || []);
      
    setInscritos(new Set(eventos));
  } catch (err) {
    console.error('Error al cargar mis inscripciones:', err);
  }
}, []);
const fetchUserProfile = useCallback(async (localFallback) => {
  try {
    const token = await getToken();
    if (!token) return null;

    const res = await axios.get(`${API_BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });

    const perfil = res.data;
    const actualizado = {
      ...perfil,
      facultad_id: perfil.facultad_id || perfil.academico?.facultad_id,
      facultad_nombre: perfil.facultad || perfil.facultad?.nombre,
      // Si /profile no trae estos campos (ej. se guardan en otra tabla),
      // no perdemos lo que ya habíamos guardado localmente.
      codigoestudiante: getCodigoEstudiante(perfil) || getCodigoEstudiante(localFallback),
      semestre: getSemestre(perfil) || getSemestre(localFallback),
      telefono: getTelefono(perfil) || getTelefono(localFallback),
    };

    await saveUserData(actualizado);
    return actualizado;
  } catch (err) {
    console.error('Error al cargar perfil:', err);
    return null;
  }
}, []);
  useEffect(() => {
    if (userData) 
      {
        fetchEvents(userData);
        fetchMisInscripciones();

      }
  }, [userData]);



  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const nombreUsuario = `${userData?.nombre || 'Estudiante'} ${userData?.apellidopat || ''}`.trim();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}>

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerGreeting}>{greeting},</Text>
              <Text style={styles.headerName}>{nombreUsuario}</Text>
            </View>
             <TouchableOpacity 
              style={styles.telegramBell} 
              onPress={() => setShowTelegramModal(true)}
            >
              <Ionicons 
                name="send" 
                size={22} 
                color={isTelegramLinked ? '#0088cc' : COLORS.textSecondary} 
              />
              {isTelegramLinked && (
                <View style={styles.telegramLinkedDot} />
              )}
            </TouchableOpacity>

            {(userData?.facultad_nombre || userData?.facultad?.nombre) && (
              <View style={styles.facultadBadge}>
                <Ionicons name="school-outline" size={12} color={COLORS.white} />
                <Text style={styles.facultadBadgeText}>
                  {userData?.facultad_nombre || userData?.facultad?.nombre}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => fetchEvents(userData)}>
              <Ionicons name="refresh-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Portal del Estudiante</Text>

          <View style={styles.statsRow}>
            {[
              { icon: 'calendar-outline',        value: stats.total,      label: 'Eventos' },
              { icon: 'time-outline',             value: stats.proximos,   label: 'Próximos' },
              { icon: 'checkmark-circle-outline', value: stats.completados, label: 'Completados' },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <View style={styles.statIconWrap}>
                  <Ionicons name={s.icon} size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Eventos de tu Facultad</Text>
            <TouchableOpacity onPress={() => router.push('/estudiante/eventos')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {error && !loading && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={36} color={COLORS.accent} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchEvents(userData)}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando eventos…</Text>
            </View>
          ) : !error && events.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={44} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No hay eventos disponibles</Text>
              <Text style={styles.emptySubtitle}>No se encontraron eventos para tu facultad en este momento</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {events.map(ev => (
                <EventCard
                  key={ev.id?.toString()}
                  event={ev}
                  onPress={() => router.push(`/estudiante/eventos/${ev.id}`)}
                  onInscribir={handleInscribir}
                  yaInscrito={inscritos.has(ev.id)}
                  inscribiendo={inscribiendoId === ev.id}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            <ActionCard title="Inscripción"  description="Ver eventos inscritos"  icon="add-circle-outline"  color={COLORS.success} onPress={() => router.push('/estudiante/inscripcion')} />
            <ActionCard title="Mi Perfil"    description="Ver y editar perfil"     icon="person-outline"      color={COLORS.info}    onPress={() => router.push('/estudiante/perfil')} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
      </View>

        <Modal visible={showInscripcionModal} animationType="slide" 
        transparent onRequestClose={() => setShowInscripcionModal(false)}>
  <View style={modalStyles.overlay}>
    <View style={modalStyles.card}>
      <Text style={modalStyles.title}>Completá tus datos</Text>
      <Text style={modalStyles.subtitle}>Solo te lo pedimos una vez, para tus próximas inscripciones no volverá a aparecer</Text>

      <Text style={modalStyles.label}>Código de estudiante</Text>
      <TextInput
        style={modalStyles.input}
        value={formInscripcion.codigo_estudiante}
        onChangeText={(v) => setFormInscripcion(prev => ({ ...prev, codigo_estudiante: v }))}
        placeholder="Ej: 2023-1234"
      />

      <Text style={modalStyles.label}>Semestre</Text>
      <TextInput
        style={modalStyles.input}
        value={formInscripcion.semestre}
        onChangeText={(v) => setFormInscripcion(prev => ({ ...prev, semestre: v }))}
        placeholder="Ej: 5to semestre"
      />

      <Text style={modalStyles.label}>Teléfono</Text>
      <TextInput
        style={modalStyles.input}
        value={formInscripcion.telefono}
        onChangeText={(v) => setFormInscripcion(prev => ({ ...prev, telefono: v }))}
        placeholder="Ej: 71234567"
        keyboardType="phone-pad"
      />

      <View style={modalStyles.buttonRow}>
        <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setShowInscripcionModal(false)} disabled={savingInscripcion}>
          <Text style={modalStyles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={modalStyles.confirmBtn} onPress={confirmarInscripcion} disabled={savingInscripcion}>
          {savingInscripcion ? <ActivityIndicator color={COLORS.white} /> : <Text style={modalStyles.confirmBtnText}>Confirmar Inscripción</Text>}
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

 {showTelegramModal && (
        <Modal
          visible={showTelegramModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTelegramModal(false)}
        >
          <View style={telegramStyles.modalOverlay}>
            <View style={telegramStyles.modalContent}>
              <View style={telegramStyles.modalHeader}>
                <View style={telegramStyles.telegramIconContainer}>
                  <Ionicons name="send" size={48} color="#0088cc" />
                </View>
                <Text style={telegramStyles.modalTitle}>
                  {isTelegramLinked ? 'Telegram Vinculado ✓' : 'Vincular Telegram'}
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowTelegramModal(false)} 
                  style={telegramStyles.closeButton}
                >
                  <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={telegramStyles.modalScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={telegramStyles.modalScrollContent}
              >
                {isTelegramLinked ? (
                  <>
                    <View style={telegramStyles.linkedInfo}>
                      <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
                      <Text style={telegramStyles.linkedText}>
                        Tu cuenta está vinculada con Telegram
                      </Text>
                      {telegramUsername && (
                        <Text style={telegramStyles.username}>
                          @{telegramUsername}
                        </Text>
                      )}
                    </View>

                    <View style={telegramStyles.benefits}>
                      <Text style={telegramStyles.benefitsTitle}>
                        Recibirás notificaciones de:
                      </Text>
                      <View style={telegramStyles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                        <Text style={telegramStyles.benefitText}>
                          Confirmación de inscripciones a eventos
                        </Text>
                      </View>
                      <View style={telegramStyles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                        <Text style={telegramStyles.benefitText}>
                          Recordatorios de eventos próximos
                        </Text>
                      </View>
                      <View style={telegramStyles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                        <Text style={telegramStyles.benefitText}>
                          Actualizaciones importantes
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={telegramStyles.unlinkButton}
                      onPress={unlinkTelegram}
                    >
                      <Ionicons name="link-outline" size={20} color={COLORS.accent} />
                      <Text style={telegramStyles.unlinkText}>Desvincular Telegram</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={telegramStyles.qrContainer}>
                      <Text style={telegramStyles.qrTitle}>
                        Escanea para vincular
                      </Text>
                      <View style={telegramStyles.qrCode}>
                        <QRCode
                          value={`https://t.me/${BOT_USERNAME}`}
                          size={160}
                          color="#000"
                          backgroundColor="#fff"
                        />
                      </View>
                      <Text style={telegramStyles.qrSubtitle}>
                        O toca el botón para abrir
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={telegramStyles.openButton}
                      onPress={() => {
                        const url = `https://t.me/${BOT_USERNAME}`;
                        if (Platform.OS === 'web') {
                          window.open(url, '_blank');
                        } else {
                          import('expo-linking').then(({ default: Linking }) => {
                            Linking.openURL(url).catch(() => {
                              Alert.alert(
                                'Telegram no instalado',
                                'Instala Telegram para continuar',
                                [
                                  { text: 'Cancelar' },
                                  { 
                                    text: 'Instalar', 
                                    onPress: () => Linking.openURL('https://telegram.org/dl')
                                  }
                                ]
                              );
                            });
                          });
                        }
                      }}
                    >
                      <Ionicons name="send" size={20} color={COLORS.white} />
                      <Text style={telegramStyles.openButtonText}>
                        Abrir Bot en Telegram
                      </Text>
                    </TouchableOpacity>

                    <View style={telegramStyles.steps}>
                      <Text style={telegramStyles.stepsTitle}>
                        Pasos a seguir:
                      </Text>
                      
                      <View style={telegramStyles.step}>
                        <View style={telegramStyles.stepNumber}>
                          <Text style={telegramStyles.stepNumberText}>1</Text>
                        </View>
                        <Text style={telegramStyles.stepText}>
                          Abre el bot en Telegram (escanea o toca el botón)
                        </Text>
                      </View>

                      <View style={telegramStyles.step}>
                        <View style={telegramStyles.stepNumber}>
                          <Text style={telegramStyles.stepNumberText}>2</Text>
                        </View>
                        <Text style={telegramStyles.stepText}>
                          Envía el comando <Text style={telegramStyles.command}>/start</Text>
                        </Text>
                      </View>

                      <View style={telegramStyles.step}>
                        <View style={telegramStyles.stepNumber}>
                          <Text style={telegramStyles.stepNumberText}>3</Text>
                        </View>
                        <Text style={telegramStyles.stepText}>
                          El bot te pedirá tu email institucional
                        </Text>
                      </View>

                      <View style={telegramStyles.step}>
                        <View style={telegramStyles.stepNumber}>
                          <Text style={telegramStyles.stepNumberText}>4</Text>
                        </View>
                        <Text style={telegramStyles.stepText}>
                          Envía tu email y listo ✓
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={telegramStyles.refreshButton}
                      onPress={() => {
                        checkTelegramStatus();
                        Alert.alert(
                          'Verificando...',
                          'Si ya vinculaste en Telegram, presiona nuevamente para actualizar'
                        );
                      }}
                    >
                      <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                      <Text style={telegramStyles.refreshText}>
                        Ya vinculé mi cuenta
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },

  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 16,
    paddingBottom: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  headerIconBtn: { padding: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerGreeting: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '400' },
  headerName: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 2 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 20 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  inscribirBtn: {
  flexDirection: 'row', alignItems: 'center', gap: 4,
  backgroundColor: COLORS.primary,
  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
},
inscribirBtnDisabled: { backgroundColor: COLORS.success },
inscribirBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  // Section
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
 facultadBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', // Fondo semitransparente para que combine con el header naranja
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, marginTop: 6, alignSelf: 'flex-start',
  },
  facultadBadgeText: { fontSize: 11, color: COLORS.white, fontWeight: '600' },
  // Loading / empty / error
  loadingCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  emptySubtitle: { marginTop: 6, fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 18 },
  errorCard: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  errorText: { marginTop: 10, fontSize: 13, color: '#DC2626', textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  // Event card
  eventCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  eventBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  eventDate: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  eventTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10, lineHeight: 22 },
  eventDetails: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIconWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  detailText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
    eventFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  statusDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  modalidadBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: 6,
  },
  modalidadText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  // Action cards
  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  logoutText: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginLeft: 8 },
 
});
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.textPrimary },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: COLORS.success, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmBtnText: { color: COLORS.white, fontWeight: '600' },
});
const telegramStyles = StyleSheet.create({
  
    modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
  },
  telegramIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  linkedInfo: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 24,
  },
  linkedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  username: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  benefits: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent + '15',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  unlinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  qrCode: {
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
  },
  qrSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0088cc',
    marginBottom: 20,
  },
  openButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  steps: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  command: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    color: COLORS.primary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    marginTop: 16,
  },
  refreshText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Header telegram bell
  telegramBell: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    position: 'relative',
  },
  telegramLinkedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
});

export default HomeEstudianteScreen;