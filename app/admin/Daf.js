import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Pressable, Animated,
  useWindowDimensions, Platform, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-qr-code';

//const API_BASE_URL =  'https://evento.cidtec-uc.com';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';
const BOT_USERNAME = 'EventUniBot';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  } else {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
  }
};

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FFEDD5', secondary: '#4B5563',
  accent: '#EF4444', success: '#10B981', warning: '#F59E0B',
  info: '#3B82F6', background: '#F9FAFB', surface: '#FFFFFF',
  textPrimary: '#1F2937', textSecondary: '#6B7280', textTertiary: '#9CA3AF',
  border: '#E5E7EB', divider: '#F3F4F6', white: '#FFFFFF', black: '#000000',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const DashboardCard = ({ title, value, icon, color, description, subtitle }) => (
  <View style={[styles.kpiCard, { borderTopColor: color }]}>
    <View style={styles.kpiTopRow}>
      <View style={[styles.kpiIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
    <Text style={styles.kpiTitle}>{title}</Text>
    {description && <Text style={styles.kpiDesc}>{description}</Text>}
    {subtitle && <Text style={styles.kpiSub}>{subtitle}</Text>}
  </View>
);

// ─── Action Card ──────────────────────────────────────────────────────────────
const ActionCardLarge = ({ action, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 70, useNativeDriver: true }).start();
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 100 }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 100 }).start()}
    >
      <Animated.View style={[styles.actionCard, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
        <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
          <Ionicons name={action.iconName} size={28} color={action.color} />
        </View>
        <View style={styles.actionContent}>
          <View style={styles.actionTitleRow}>
            <Text style={styles.actionTitle}>{action.title}</Text>
            {action.badge && (
              <View style={[styles.actionBadge, { backgroundColor: action.badgeColor || COLORS.primary }]}>
                <Text style={styles.actionBadgeText}>{action.badge}</Text>
              </View>
            )}
          </View>
          {action.description && <Text style={styles.actionDesc}>{action.description}</Text>}
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textTertiary} />
      </Animated.View>
    </Pressable>
  );
};

// ─── Event Cards (móvil) ──────────────────────────────────────────────────────
const EventCards = ({ data, onPrint }) => {
  if (!data?.length) {
    return (
      <View style={styles.emptyTable}>
        <Ionicons name="calendar-outline" size={40} color={COLORS.textTertiary} />
        <Text style={styles.emptyTableText}>No hay eventos próximos disponibles</Text>
        <Text style={styles.emptyTableSubText}>Todos los eventos con fecha pasada están ocultos</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {data.map((row) => {
        const approved = row.state === 'Aprobado';
        return (
          <View key={row.id} style={styles.eventCard}>
            <View style={styles.eventCardTop}>
              <View style={[styles.stateBadge, { backgroundColor: approved ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.stateBadgeText, { color: approved ? COLORS.success : COLORS.warning }]}>
                  {approved ? 'Aprobado' : 'Pendiente'}
                </Text>
              </View>
              {approved && (
                <TouchableOpacity style={styles.printBtn} onPress={() => onPrint(row.id)}>
                  <Ionicons name="print-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.printBtnText}>Imprimir</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.eventCardTitle}>{row.title}</Text>
            <View style={styles.eventCardMeta}>
              <View style={styles.eventCardMetaItem}>
                <Ionicons name="calendar-outline" size={13} color={COLORS.textTertiary} />
                <Text style={styles.eventCardMetaText}>{row.date}</Text>
              </View>
              <View style={styles.eventCardMetaItem}>
                <Ionicons name="time-outline" size={13} color={COLORS.textTertiary} />
                <Text style={styles.eventCardMetaText}>{row.time}</Text>
              </View>
              <View style={styles.eventCardMetaItem}>
                <Ionicons name="person-outline" size={13} color={COLORS.textTertiary} />
                <Text style={[styles.eventCardMetaText, row.creator === 'Desconocido' && { fontStyle: 'italic', color: COLORS.textTertiary }]}>
                  {row.creator}
                </Text>
              </View>
            </View>
            <Text style={styles.eventCardId}>ID #{row.id}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Bottom Dock ──────────────────────────────────────────────────────────────
const MinimalBottomDock = ({ onLogout, onActionPress, isExpanded, onToggleExpanded }) => {
  const dockHeight = useRef(new Animated.Value(60)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(dockHeight, { toValue: isExpanded ? 200 : 60, duration: 300, useNativeDriver: false }),
      Animated.timing(rotateAnim, { toValue: isExpanded ? 1 : 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [isExpanded]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const quickActions = [
    { id: 'usuarios', title: 'Usuarios', icon: 'people-outline', color: COLORS.primary, action: '/admin/UsuariosDaf' },
    { id: 'aprobados', title: 'Aprobados', icon: 'checkmark-circle-outline', color: COLORS.success, action: '/admin/EventosAprobados' },
    { id: 'settings', title: 'Ajustes', icon: 'settings-outline', color: COLORS.secondary, action: '/admin/Settings' },
  ];

  return (
    <Animated.View style={[styles.dock, { height: dockHeight }]}>
      <Pressable onPress={onToggleExpanded} style={styles.dockToggle}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-up-outline" size={20} color={COLORS.white} />
        </Animated.View>
        <Text style={styles.dockToggleText}>Menú</Text>
      </Pressable>
      {isExpanded && (
        <View style={styles.dockExpanded}>
          <View style={styles.dockActions}>
            {quickActions.map(a => (
              <TouchableOpacity key={a.id} style={styles.dockActionBtn} onPress={() => onActionPress(a.action)}>
                <Ionicons name={a.icon} size={24} color={a.color} />
                <Text style={[styles.dockActionText, { color: a.color }]}>{a.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
           <TouchableOpacity onPress={onLogout} style={styles.minimalDockLogoutButton}>
                      <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
                      <Text style={styles.minimalDockLogoutButtonText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const MinimalHeader = ({ nombreUsuario, emailUsuario, unreadCount, onNotificationPress, lastUpdated, onRefresh, refreshing, onTelegramPress, isTelegramLinked }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerGreeting}>{greeting},</Text>
          <Text style={styles.headerName}>{nombreUsuario}</Text>
          <Text style={styles.headerEmail}>{emailUsuario}</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Botón de Telegram */}
          <TouchableOpacity style={styles.telegramBell} onPress={onTelegramPress}>
            <Ionicons 
              name="send" 
              size={22} 
              color={isTelegramLinked ? '#0088cc' : COLORS.textTertiary} 
            />
            {isTelegramLinked && (
              <View style={styles.telegramLinkedDot} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onRefresh} disabled={refreshing}>
            {refreshing
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Ionicons name="refresh-outline" size={22} color={COLORS.textSecondary} />
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.notifBtn} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.headerTitle}>Panel DAF</Text>
      {lastUpdated && (
        <Text style={styles.lastUpdated}>
          Actualizado: {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
    </View>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, subtitle, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
    </View>
    {children}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const Daf = () => {
  const params = useLocalSearchParams();
  const nombreUsuario = params.nombre || 'Administrador DAF';
  const router = useRouter();

  const [notifications, setNotifications]         = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isBannerExpanded, setIsBannerExpanded]   = useState(false);
  const [loadingDashboard, setLoadingDashboard]   = useState(true);
  const [loadingEvents, setLoadingEvents]         = useState(true);
  const [refreshing, setRefreshing]               = useState(false);
  const [lastUpdated, setLastUpdated]             = useState(null);
  const [allEvents, setAllEvents]                 = useState([]);
  const [stats, setStats]                           = useState(null);
  const [loadingReportes, setLoadingReportes]   = useState(false);
  const [hiddenPastCount, setHiddenPastCount]     = useState(0);

  // Estados de Telegram
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
 const [userInfo, setUserInfo] = useState({
    nombre: 'Cargando...',
    email: ''
  });
  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Usuarios Activos',      value: '–', icon: 'people-outline',        color: COLORS.primary,  description: 'Cuentas habilitadas' },
    { title: 'Eventos Totales',       value: '–', icon: 'calendar-outline',      color: COLORS.info,     description: 'Todos los eventos' },
    { title: 'Contenidos Pendientes', value: '–', icon: 'document-text-outline', color: COLORS.warning,  description: 'Esperando revisión' },
    { title: 'Estabilidad Sistema',   value: '–', icon: 'pulse-outline',         color: COLORS.success,  description: 'Rendimiento del sistema' },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

    const cargarInfoUsuario = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        console.log('⚠️ No hay token, usando datos por defecto');
        setUserInfo({ nombre: params.nombre || 'Administrador DAF', email: '' });
        return;
      }

      console.log('🔍 Solicitando perfil al backend...');
      const response = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('📦 Datos CRUDOS del perfil:', response.data);

      const userData = response.data;
      
      // Intentamos obtener el nombre de varias formas posibles según como lo guarde tu backend
      const nombre = userData.nombre || userData.name || userData.username || 'Administrador DAF';
      const apellido1 = userData.apellidopat || userData.apellido_paterno || '';
      const apellido2 = userData.apellidomat || userData.apellido_materno || '';
      
      const nombreCompleto = `${nombre} ${apellido1} ${apellido2}`.trim();

      setUserInfo({
        nombre: nombreCompleto,
        email: userData.email || 'Sin correo registrado'
      });
      
      console.log('✅ Usuario procesado:', nombreCompleto, '| Email:', userData.email);
    } catch (error) {
      console.error('❌ Error al cargar info del usuario:', error.response?.data || error.message);
      // Si falla, usamos los datos que vinieron por parámetros o un valor por defecto
      setUserInfo({
        nombre: params.nombre || 'Administrador DAF',
        email: ''
      });
    }
  }, [params.nombre]);
  const checkTelegramStatus = useCallback(async () => {
    try {
      const token = await getTokenAsync();
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

  const unlinkTelegram = useCallback(async () => {
    try {
      const token = await getTokenAsync();
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

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else { setLoadingDashboard(true); setLoadingEvents(true); setLoadingReportes(true); }

    try {
      const token = await getTokenAsync();
      if (!token) { Alert.alert('Error', 'Por favor, inicia sesión nuevamente'); return; }

      const [dashRes, eventsRes, notifsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }),
        axios.get(`${API_BASE_URL}/eventos`,          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }),
        axios.get(`${API_BASE_URL}/notificaciones`,   { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }).catch(() => ({ data: [] })),
      ]);

      const data = dashRes.data;
      setStats(data);
      const totalEvents = data.totalEvents || 0;
      const aprobados = data.estadoCounts?.aprobado || 0;
      const pendientes = data.estadoCounts?.pendiente || 0;
      const rechazados = data.estadoCounts?.rechazado || 0;
      const tasaAprobacion = totalEvents > 0 ? Math.round((aprobados / totalEvents) * 100) : 0;
      setDashboardStats([
        { title: 'Usuarios Activos',      value: (data.activeUsers || 0).toLocaleString(),          icon: 'people-outline',        color: COLORS.primary,  description: 'Cuentas habilitadas' },
        { title: 'Eventos Totales',       value: totalEvents.toString(),                              icon: 'calendar-outline',      color: COLORS.info,     description: 'Todos los eventos' },
        { title: 'Tasa Aprobación',       value: `${tasaAprobacion}%`,                                 icon: 'checkmark-done-outline', color: COLORS.success,  description: 'Porcentaje de aprobación' },
        { title: 'Tiempo Prom.',          value: `${data.tiempoPromedioAprobacion || 0}h`,            icon: 'time-outline',          color: COLORS.warning,  description: 'Tiempo promedio aprobación' },
        { title: 'Pendientes',            value: pendientes.toString(),                                icon: 'hourglass-outline',     color: COLORS.warning,  description: 'Sin revisar', subtitle: 'Sin revisar' },
        { title: 'Nuevos Usuarios',       value: (data.usuariosNuevosEsteMes || 0).toString(),        icon: 'person-add-outline',    color: COLORS.purple,   description: 'Este mes', subtitle: 'Este mes' },
      ]);

      // ─── 👇 FILTRO DE FECHAS PASADAS ───────────────────────────────────────
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rawEvents = Array.isArray(eventsRes.data) ? eventsRes.data : [];

      const allPhase2 = rawEvents
        .filter(e => e.idfase === 2)
        .map(e => {
          const eventDate = e.fechaevento ? new Date(e.fechaevento) : null;
          if (eventDate) eventDate.setHours(0, 0, 0, 0);

          return {
            id: e.idevento,
            title: e.nombreevento || 'Sin título',
            date: e.fechaevento
              ? new Date(e.fechaevento).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'N/A',
            time: e.horaevento ? e.horaevento.substring(0, 5) : 'N/A',
            state: e.estado?.toLowerCase().includes('aprobado') ? 'Aprobado' : 'Pendiente',
            creator: e.academicoCreador
              ? `${e.academicoCreador.nombre || ''} ${e.academicoCreador.apellidopat || ''}`.trim()
              : 'Desconocido',
            rawDate: eventDate,
          };
        });

      const upcomingEvents = allPhase2.filter(e => {
        if (!e.rawDate) return true;
        return e.rawDate >= today;
      });

      const pastEventsCount = allPhase2.length - upcomingEvents.length;
      setHiddenPastCount(pastEventsCount);

      upcomingEvents.sort((a, b) => {
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;
        return a.rawDate - b.rawDate;
      });

      const cleanEvents = upcomingEvents.map(({ rawDate, ...rest }) => rest);
      setAllEvents(cleanEvents);
      // ─── 👆 FIN DEL FILTRO ─────────────────────────────────────────────────

      setNotifications(Array.isArray(notifsRes.data) ? notifsRes.data : []);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetchData:', error);
      if (error.response?.status === 401) { await deleteTokenAsync(); router.replace('/'); }
      else Alert.alert('Error de Conexión', 'No se pudieron cargar los datos.', [
        { text: 'Reintentar', onPress: () => fetchData() },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } finally {
      setLoadingDashboard(false);
      setLoadingEvents(false);
      setLoadingReportes(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { 
    fetchData();
    cargarInfoUsuario();
    checkTelegramStatus();
  }, [fetchData, checkTelegramStatus]);

  const markAsRead = async (id) => {
    try {
      const token = await getTokenAsync();
      await axios.put(`${API_BASE_URL}/notificaciones/${id}/leer`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllAsRead = async () => {
    await Promise.all(notifications.filter(n => !n.read).map(n => markAsRead(n.id)));
  };

  const handlePrintEvent = (eventoId) => {
    router.push({ pathname: '/admin/EventoDetalleImp', params: { eventId: eventoId.toString() } });
  };

  const handleActionPress = (route) => {
    if (route) router.push(route);
    else Alert.alert('En Desarrollo', 'Esta característica estará disponible próximamente.');
  };

   const handleLogout = async () => {
    const performLogout = async () => {
      try {
        await deleteTokenAsync();
        
        setDashboardStats([
          { title: 'Usuarios Activos', value: '—', icon: 'people-outline', color: COLORS.primary },
          { title: 'Eventos Totales', value: '—', icon: 'calendar-outline', color: COLORS.info },
          { title: 'Contenidos Pendientes', value: '—', icon: 'document-text-outline', color: COLORS.warning },
          { title: 'Estabilidad Sistema', value: '—', icon: 'pulse-outline', color: COLORS.success },
        ]);
  
        router.replace('/');
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        router.replace('/');
      }
    };
  
    if (Platform.OS === 'web') {
      if (window.confirm('¿Está seguro que desea cerrar la sesión actual?')) {
        await performLogout();
      }
    } else {
      Alert.alert(
        'Confirmar Cierre de Sesión',
        '¿Está seguro que desea cerrar la sesión actual?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Cerrar Sesión', 
            style: 'destructive', 
            onPress: performLogout 
          },
        ],
        { cancelable: true }
      );
    }
  };

  const adminActions = [
    { id: '1', title: 'Gestión de Usuarios',  iconName: 'people-outline',           route: '/admin/UsuariosDaf',      color: COLORS.secondary, description: 'Administración de cuentas de usuario' },
    { id: '3', title: 'Reportes Avanzados',    iconName: 'document-text-outline',    route: '/admin/reportes',         color: COLORS.secondary, description: 'Generación de reportes detallados', badge: 'Nuevo', badgeColor: COLORS.accent },
    { id: '4', title: 'Creación de Recursos',  iconName: 'construct-outline',        route: '/admin/Inventario',         color: COLORS.warning,   description: 'Gestión de recursos del sistema',   badge: 'Nuevo', badgeColor: COLORS.accent },
    { id: '5', title: 'Subida de Layouts',     iconName: 'images-outline',           route: '/admin/Layouts',          color: COLORS.info,      description: 'Administración de plantillas',       badge: 'Nuevo', badgeColor: COLORS.accent },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isBannerExpanded ? 220 : 100 }}
      >
        <MinimalHeader
          nombreUsuario={userInfo.nombre}
          emailUsuario={userInfo.email}
          unreadCount={unreadCount}
          onNotificationPress={() => setShowNotifications(true)}
          lastUpdated={lastUpdated}
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
          onTelegramPress={() => setShowTelegramModal(true)}
          isTelegramLinked={isTelegramLinked}
        />

        {/* ── KPIs ── */}
        <Section title="Resumen de Actividad" subtitle="Métricas clave del sistema">
          {loadingDashboard ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando estadísticas…</Text>
            </View>
          ) : (
            <View style={styles.kpiGrid}>
              {dashboardStats.map((s, i) => <DashboardCard key={i} {...s} />)}
            </View>
          )}
        </Section>

        {/* ── EVENTOS EN FASE 2 ── */}
        <Section
          title="Eventos en Fase 2"
          subtitle="Solo se muestran eventos desde hoy en adelante"
        >
          {loadingEvents ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando eventos…</Text>
            </View>
          ) : (
            <>
              {hiddenPastCount > 0 && (
                <View style={styles.hiddenPastBanner}>
                  <Ionicons name="eye-off-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.hiddenPastText}>
                    {hiddenPastCount} evento{hiddenPastCount !== 1 ? 's' : ''} con fecha pasada {hiddenPastCount !== 1 ? 'ocultos' : 'oculto'}
                  </Text>
                </View>
              )}

              <View style={styles.tableInfo}>
                <View style={styles.tableInfoBadge}>
                  <Text style={styles.tableInfoText}>{allEvents.length} eventos próximos</Text>
                </View>
                <Text style={styles.tableInfoSub}>
                  {allEvents.filter(e => e.state === 'Aprobado').length} aprobados ·{' '}
                  {allEvents.filter(e => e.state !== 'Aprobado').length} pendientes
                </Text>
              </View>
              <EventCards data={allEvents} onPrint={handlePrintEvent} />
            </>
          )}
        </Section>

        {/* ── HERRAMIENTAS ── */}
        <Section title="Herramientas de Gestión" subtitle="Acceda a las funcionalidades principales">
          {adminActions.map((action, i) => (
            <ActionCardLarge
              key={action.id}
              action={action}
              onPress={() => handleActionPress(action.route)}
              index={i}
            />
          ))}
        </Section>
      </ScrollView>

      {/* ── NOTIFICACIONES MODAL ── */}
      {showNotifications && (
        <View style={styles.overlay}>
          <View style={styles.notifModal}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>
                Notificaciones{unreadCount > 0 ? <Text style={{ color: COLORS.primary }}> ({unreadCount})</Text> : null}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead}>
                    <Text style={styles.markAllText}>Marcar todas</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Ionicons name="close-outline" size={26} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="notifications-off-outline" size={40} color={COLORS.textTertiary} />
                <Text style={styles.notifEmptyText}>No tienes notificaciones nuevas</Text>
              </View>
            ) : (
              <ScrollView>
                {notifications.map(notif => (
                  <TouchableOpacity
                    key={notif.id}
                    style={[styles.notifItem, { backgroundColor: notif.read ? COLORS.surface : COLORS.primaryLight }]}
                    onPress={async () => {
                      if (!notif.read) await markAsRead(notif.id);
                      if (notif.idEvento) router.push(`/admin/evento/${notif.idEvento}`);
                      setShowNotifications(false);
                    }}
                  >
                    <View style={[styles.notifDot, { backgroundColor: notif.read ? COLORS.border : COLORS.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifMsg, { fontWeight: notif.read ? '400' : '600' }]}>{notif.mensaje}</Text>
                      <Text style={styles.notifTime}>{new Date(notif.createdAt).toLocaleDateString()}</Text>
                    </View>
                    {!notif.read && (
                      <TouchableOpacity onPress={() => markAsRead(notif.id)} style={{ padding: 4 }}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

{showTelegramModal && (
  <Modal
    visible={showTelegramModal}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setShowTelegramModal(false)}
  >
    <View style={styles.telegramModalOverlay}>
      <View style={styles.telegramModalContent}>
        <View style={styles.telegramModalHeader}>
          <View style={styles.telegramIconContainer}>
            <Ionicons name="send" size={48} color="#0088cc" />
          </View>
          <Text style={styles.telegramModalTitle}>
            {isTelegramLinked ? 'Telegram Vinculado ✓' : 'Vincular Telegram'}
          </Text>
          <TouchableOpacity 
            onPress={() => setShowTelegramModal(false)} 
            style={styles.telegramCloseButton}
          >
            <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.telegramModalScrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.telegramModalScrollContent}
        >
          {isTelegramLinked ? (
            <>
              <View style={styles.telegramLinkedInfo}>
                <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
                <Text style={styles.telegramLinkedText}>
                  Tu cuenta está vinculada con Telegram
                </Text>
                {telegramUsername && (
                  <Text style={styles.telegramUsername}>
                    @{telegramUsername}
                  </Text>
                )}
              </View>

              <View style={styles.telegramBenefits}>
                <Text style={styles.telegramBenefitsTitle}>
                  Recibirás notificaciones de:
                </Text>
                <View style={styles.telegramBenefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={styles.telegramBenefitText}>
                    Aprobación de eventos
                  </Text>
                </View>
                <View style={styles.telegramBenefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={styles.telegramBenefitText}>
                    Rechazo de eventos (con motivo)
                  </Text>
                </View>
                <View style={styles.telegramBenefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={styles.telegramBenefitText}>
                    Recordatorios 3 días antes del evento
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.telegramUnlinkButton}
                onPress={unlinkTelegram}
              >
                <Ionicons name="link-outline" size={20} color={COLORS.accent} />
                <Text style={styles.telegramUnlinkText}>Desvincular Telegram</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.telegramQRContainer}>
                <Text style={styles.telegramQRTitle}>
                  Escanea para vincular
                </Text>
                <View style={styles.telegramQRCode}>
                  <QRCode
                    value={`https://t.me/${BOT_USERNAME}`}
                    size={160}
                    color="#000"
                    backgroundColor="#fff"
                  />
                </View>
                <Text style={styles.telegramQRSubtitle}>
                  O toca el botón para abrir
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.telegramOpenButton}
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
                <Text style={styles.telegramOpenButtonText}>
                  Abrir Bot en Telegram
                </Text>
              </TouchableOpacity>

              <View style={styles.telegramSteps}>
                <Text style={styles.telegramStepsTitle}>
                  Pasos a seguir:
                </Text>
                
                <View style={styles.telegramStep}>
                  <View style={styles.telegramStepNumber}>
                    <Text style={styles.telegramStepNumberText}>1</Text>
                  </View>
                  <Text style={styles.telegramStepText}>
                    Abre el bot en Telegram (escanea o toca el botón)
                  </Text>
                </View>

                <View style={styles.telegramStep}>
                  <View style={styles.telegramStepNumber}>
                    <Text style={styles.telegramStepNumberText}>2</Text>
                  </View>
                  <Text style={styles.telegramStepText}>
                    Envía el comando <Text style={styles.telegramCommand}>/start</Text>
                  </Text>
                </View>

                <View style={styles.telegramStep}>
                  <View style={styles.telegramStepNumber}>
                    <Text style={styles.telegramStepNumberText}>3</Text>
                  </View>
                  <Text style={styles.telegramStepText}>
                    El bot te pedirá tu email institucional
                  </Text>
                </View>

                <View style={styles.telegramStep}>
                  <View style={styles.telegramStepNumber}>
                    <Text style={styles.telegramStepNumberText}>4</Text>
                  </View>
                  <Text style={styles.telegramStepText}>
                    Envía tu email y listo ✓
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.telegramRefreshButton}
                onPress={() => {
                  checkTelegramStatus();
                  Alert.alert(
                    'Verificando...',
                    'Si ya vinculaste en Telegram, presiona nuevamente para actualizar'
                  );
                }}
              >
                <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                <Text style={styles.telegramRefreshText}>
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

      {/* ── DOCK ── */}
      <MinimalBottomDock
        onLogout={handleLogout}
        onActionPress={handleActionPress}
        isExpanded={isBannerExpanded}
        onToggleExpanded={() => setIsBannerExpanded(!isBannerExpanded)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },

  header: {
    width: '100%', paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 40) + 16, paddingBottom: 16,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { padding: 6, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerGreeting: { fontSize: 15, color: COLORS.textSecondary },
  headerName: { fontSize: 22, color: COLORS.textPrimary, fontWeight: '700' },
  headerEmail: { 
    fontSize: 13, 
    color: COLORS.textSecondary,
    marginTop: 2,
    fontStyle: 'italic'
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  lastUpdated: { fontSize: 11, color: COLORS.textTertiary, marginTop: 4 },
  notifBtn: { position: 'relative', padding: 6 },
  notifBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.accent,
    borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.white,
  },
  notifBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },

  // Telegram
  telegramBell: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
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
  telegramModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  telegramModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  telegramModalHeader: {
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
   headerEmail: { 
    fontSize: 13, 
    color: COLORS.textSecondary,
    marginTop: 2,
    fontStyle: 'italic'
  },
  telegramModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  telegramCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  
  telegramLinkedInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  telegramLinkedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  telegramUsername: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  telegramBenefits: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  telegramBenefitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  telegramBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  telegramBenefitText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  telegramUnlinkButton: {
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
  telegramUnlinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
  telegramQRContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 16,
  },
  telegramQRTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  
  telegramQRSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  telegramOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0088cc',
    marginBottom: 20,
  },
  telegramOpenButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  telegramSteps: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  telegramStepsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  telegramStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  telegramStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  telegramStepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  telegramStepText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  telegramCommand: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    color: COLORS.primary,
  },
  telegramRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    marginTop: 16,
  },
  telegramRefreshText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  telegramModalScrollView: {
  flex: 1,
},
telegramModalScrollContent: {
  paddingBottom: 20, // Espacio extra al final
},
telegramModalBody: {
  padding: 24,
},
telegramQRCode: {
  padding: 12,
  backgroundColor: COLORS.white,
  borderRadius: 12,
  marginBottom: 12,
  alignSelf: 'center', // Centrado
},

  // Section
  section: { width: '100%', paddingHorizontal: 20, marginTop: 28 },
  sectionHead: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  sectionSub: { fontSize: 13, color: COLORS.textSecondary },

  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  kpiCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, width: '48%',
    minHeight: 120, justifyContent: 'space-between', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  kpiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  kpiIconWrap: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  kpiTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 2 },
  kpiDesc: { fontSize: 11, color: COLORS.textTertiary },

  // Event Cards
  eventCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  eventCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  eventCardTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: 8, lineHeight: 20,
  },
  eventCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  eventCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventCardMetaText: { fontSize: 12, color: COLORS.textSecondary },
  eventCardId: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

  // Table info bar
  tableInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  tableInfoBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tableInfoText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  tableInfoSub: { fontSize: 12, color: COLORS.textSecondary },

  hiddenPastBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A',
  },
  hiddenPastText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },

  stateBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  stateBadgeText: { fontSize: 11, fontWeight: '700' },
  printBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: COLORS.primaryLight, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary, gap: 4,
  },
  printBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  emptyTable: { alignItems: 'center', paddingVertical: 40 },
  emptyTableText: { marginTop: 10, fontSize: 14, color: COLORS.textTertiary },
  emptyTableSubText: { marginTop: 4, fontSize: 12, color: COLORS.textTertiary, fontStyle: 'italic' },

  // Action cards
  actionCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 18, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  actionIcon: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionContent: { flex: 1 },
  actionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  actionBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  actionDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  minimalDockLogoutButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginTop: 10,
  },

  // Dock
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8,
    elevation: 10, overflow: 'hidden',
  },
  dockToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  dockToggleText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  dockExpanded: {
    paddingHorizontal: 20, paddingBottom: 12, backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20
  },
  dockActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  dockActionBtn: { alignItems: 'center', paddingVertical: 8, width: '30%' },
  dockActionText: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  dockLogout: {
    flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center', borderRadius: 10,
  },
  dockLogoutText: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginLeft: 8 },

  // Notifications
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-start',
    paddingTop: (StatusBar.currentHeight || 0) + 10, zIndex: 1000,
  },
  notifModal: {
    backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16,
    maxHeight: '72%', elevation: 10,
  },
  notifHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  notifTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  markAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  notifEmpty: { alignItems: 'center', paddingVertical: 40 },
  notifEmptyText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  notifItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  notifDot: { width: 10, height: 10, borderRadius: 5 },
  notifMsg: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 3 },
  notifTime: { fontSize: 12, color: COLORS.textTertiary },

  // Loading
  loadingBox: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 14, color: COLORS.textSecondary },
});

export default Daf;