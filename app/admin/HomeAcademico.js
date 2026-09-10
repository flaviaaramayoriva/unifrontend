import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Pressable, Animated,
  useWindowDimensions, Platform, Modal, Image,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import dayjs from 'dayjs';
import { CustomLineChart, CustomBarChart } from '../../components/admin/ChartsVisuales';
import ChatEmbed from '../../components/admin/ChatEmbed';
import ChatAlertas from '../../components/ChatAlertas';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';
const BOT_USERNAME = 'EventUniBot';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      const sessionToken = sessionStorage.getItem(TOKEN_KEY);
      if (sessionToken) return sessionToken;
      localStorage.removeItem(TOKEN_KEY);
      return null;
    } catch (e) {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {}
};

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const COLORS = {
  primary: '#C44200', primaryLight: '#FFF0E6', secondary: '#0F172A',
  accent: '#EF4444', success: '#047857', warning: '#F59E0B',
  info: '#3B82F6', background: '#F6F7F9', surface: '#FFFFFF',
  textPrimary: '#1F2937', textSecondary: '#64748B', textTertiary: '#94A3B8',
  border: '#E6E9EF', divider: '#D1D5DB', shadow: 'rgba(0,0,0,0.05)',
  white: '#FFFFFF', black: '#000000',
};

const CARD_MARGIN = 12;
const MIN_CARD_WIDTH_ACTIONS = 140;
const MAX_COLUMNS_ACTIONS = 4;

const STATE_COLORS = {
  aprobado: COLORS.success,
  pendiente: COLORS.warning,
  rechazado: COLORS.accent,
  cancelado: COLORS.info,
  vencido: COLORS.secondary,
  completado: COLORS.info,
};

const isEventActive = (ev) => {
  const dateStr = ev.fechaevento ?? ev.date ?? ev.fecha ?? ev.fechaInicio ?? null;
  if (!dateStr) return true;
  let eventDate;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) eventDate = dayjs(dateStr, 'YYYY-MM-DD');
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) eventDate = dayjs(dateStr, 'DD/MM/YYYY');
  else eventDate = dayjs(dateStr);
  if (!eventDate.isValid()) return true;
  return eventDate.isSame(dayjs().startOf('day')) || eventDate.isAfter(dayjs().startOf('day'));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '–';
  const date = dayjs(dateStr);
  if (!date.isValid()) return '–';
  return date.format('DD [de] MMMM, YYYY');
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = dayjs(dateStr);
  if (!date.isValid()) return '';
  return date.format('HH:mm');
};

const DashboardCard = ({ title, value, icon, color, trend, description }) => {
  const safeColor = color || COLORS.primary;
  const trendColor = trend > 0 ? COLORS.success : COLORS.warning;
  return (
    <View style={styles.dashboardCard}>
      <View style={styles.dashboardCardTopRow}>
        <View style={[styles.dashboardCardIconChip, { backgroundColor: safeColor + '14' }]}>
          <Ionicons name={icon || 'information-circle-outline'} size={22} color={safeColor} />
        </View>
        <Text style={[styles.dashboardCardValue, { color: safeColor }]}>{value || '0'}</Text>
      </View>
      <View>
        <Text style={styles.dashboardCardTitle}>{title || 'Sin título'}</Text>
        {description ? <Text style={styles.dashboardCardDescription}>{description}</Text> : null}
        {trend != null ? (
          <View style={styles.trendRow}>
            <Ionicons name={trend > 0 ? 'arrow-up' : 'arrow-down'} size={14} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>{Math.abs(trend)}% {trend > 0 ? 'más' : 'menos'}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const ManagementToolCard = ({ title, description, icon, color, badge, onPress, cardWidth }) => {
  const safeColor = color || COLORS.secondary;
  return (
    <TouchableOpacity style={[styles.toolCard, { borderColor: safeColor + '20', width: cardWidth }]} onPress={onPress}>
      <View style={[styles.toolIcon, { backgroundColor: safeColor + '10' }]}>
        <Ionicons name={icon || 'information-circle-outline'} size={24} color={safeColor} />
      </View>
      <Text style={styles.toolTitle} numberOfLines={2}>{title || 'Sin título'}</Text>
      {description ? <Text style={styles.toolDescription} numberOfLines={2}>{description}</Text> : null}
      {badge ? (
        <View style={[styles.toolBadge, { backgroundColor: safeColor }]}>
          <Text style={styles.toolBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const Section = ({ title, subtitle, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    {children}
  </View>
);

const ChartCard = ({ title, subtitle, children, empty, emptyIcon }) => (
  <View style={styles.chartCard}>
    <View style={styles.chartCardHeader}>
      <Text style={styles.chartCardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.chartCardSubtitle}>{subtitle}</Text> : null}
    </View>
    {empty ? (
      <View style={styles.chartEmpty}>
        <Ionicons name={emptyIcon || 'bar-chart-outline'} size={44} color={COLORS.textTertiary} />
        <Text style={styles.chartEmptyText}>Sin datos disponibles</Text>
      </View>
    ) : children}
  </View>
);

const ProximoEventoCard = ({ evento, onPress }) => {
  if (!evento) return null;
  const estadoColor = STATE_COLORS[String(evento.estado || '').toLowerCase()] || COLORS.textSecondary;
  return (
    <TouchableOpacity style={styles.eventoCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.eventoLeft}>
        <View style={[styles.eventoIconBg, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="calendar" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.eventoContent}>
          <Text style={styles.eventoLabel}>Próximo evento de tu comité</Text>
          <Text style={styles.eventoTitle} numberOfLines={2}>{evento.nombreevento || 'Sin nombre'}</Text>
          <View style={styles.eventoMetaRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.eventoMeta}>{formatDate(evento.fechaevento)}{formatTime(evento.fechaevento) ? ` · ${formatTime(evento.fechaevento)}` : ''}</Text>
          </View>
          {evento.lugarevento ? (
            <View style={styles.eventoMetaRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.eventoMeta}>{evento.lugarevento}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View>
        <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '18' }]}>
          <Text style={[styles.estadoBadgeText, { color: estadoColor }]}>
            {(evento.estado || 'N/A').charAt(0).toUpperCase() + (evento.estado || '').slice(1).toLowerCase()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

const ProyectarEventoCTA = ({ onPress }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.proyectarBtnCard, pressed && styles.proyectarBtnPressed]}>
    <View style={[styles.proyectarGradient, { backgroundColor: COLORS.primary }]}>
      <View style={styles.proyectarIconWrap}>
        <Ionicons name="add" size={30} color={COLORS.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.proyectarTitle}>Proyectar Evento</Text>
        <Text style={styles.proyectarSubtitle}>Crea y gestiona un nuevo evento</Text>
      </View>
      <View style={styles.proyectarArrow}>
        <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
      </View>
    </View>
  </Pressable>
);

const MainTabs = ({ active, onChange }) => (
  <View style={styles.mainTabs}>
    {[
      { id: 'panel', label: 'Panel', icon: 'home-outline' },
      { id: 'analisis', label: 'Análisis', icon: 'bar-chart-outline' },
    ].map((t) => (
      <TouchableOpacity
        key={t.id}
        style={[styles.mainTab, active === t.id && styles.mainTabActive]}
        onPress={() => onChange(t.id)}
        accessibilityRole="tab"
      >
        <Ionicons name={t.icon} size={18} color={active === t.id ? COLORS.white : COLORS.textSecondary} />
        <Text style={[styles.mainTabText, active === t.id && styles.mainTabTextActive]}>{t.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const MinimalHeader = ({ nombreUsuario, unreadCount, onNotificationPress, onRefresh, refreshing, lastUpdated, onTelegramPress, isTelegramLinked }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  return (
    <View style={styles.hero}>
      <View style={styles.heroHeaderRow}>
        <View style={styles.logoBadge}>
          <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} />
        </View>
        <View style={styles.heroLeft}>
          <Text style={styles.heroGreeting}>{greeting}</Text>
          <Text style={styles.heroName} numberOfLines={1}>{nombreUsuario}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onTelegramPress}>
            <Ionicons name="send" size={22} color={isTelegramLinked ? '#00BFFF' : 'rgba(255,255,255,0.85)'} />
            {isTelegramLinked ? <View style={styles.telegramDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onRefresh} disabled={refreshing}>
            {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="refresh-outline" size={22} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unreadCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.heroDivider} />
      <Text style={styles.headerTitle}>Panel Académico</Text>
      <Text style={styles.headerSubtitle}>UFT Eventos · Universidad Privada Franz Tamayo</Text>
      {lastUpdated ? (
        <Text style={styles.lastUpdatedText}>
          Actualizado: {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      ) : null}
    </View>
  );
};

const MinimalBottomDock = ({ onLogout, onActionPress, isExpanded, onToggleExpanded }) => {
  const dockHeight = useRef(new Animated.Value(60)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(dockHeight, { toValue: isExpanded ? 150 : 60, duration: 300, useNativeDriver: false }),
      Animated.timing(rotateAnim, { toValue: isExpanded ? 1 : 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [isExpanded]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const quickActions = [
    { id: 'nuevo', title: 'Nuevo Evento', icon: 'add-circle-outline', color: COLORS.primary, action: '/admin/ProyectoEvento' },
    { id: 'pendientes', title: 'Pendientes', icon: 'document-text-outline', color: COLORS.warning, action: '/admin/EventosPendientes' },
    { id: 'aprobados', title: 'Aprobados', icon: 'checkmark-circle-outline', color: COLORS.success, action: '/admin/EventosAprobados' },
    { id: 'rechazados', title: 'Rechazados', icon: 'close-circle-outline', color: COLORS.accent, action: '/admin/EventosRechazados' },
  ];

  return (
    <Animated.View style={[styles.dock, { height: dockHeight }]}>
      {isExpanded ? (
        <View style={styles.dockExpanded}>
          <View style={styles.dockActions}>
            {quickActions.map((a) => (
              <TouchableOpacity key={a.id} style={styles.dockActionBtn} onPress={() => onActionPress(a.action)}>
                <Ionicons name={a.icon} size={24} color={a.color} />
                <Text style={[styles.dockActionText, { color: a.color }]}>{a.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.dockLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            <Text style={styles.dockLogoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Pressable onPress={onToggleExpanded} style={styles.dockToggle}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-up-outline" size={20} color={COLORS.white} />
        </Animated.View>
        <Text style={styles.dockToggleText}>{isExpanded ? 'Cerrar' : 'Menú rápido'}</Text>
      </Pressable>
    </Animated.View>
  );
};

const HomeAcademicoScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const [nombreUsuario, setNombreUsuario] = useState(params.nombre || 'Académico');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDockExpanded, setIsDockExpanded] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [proximoEvento, setProximoEvento] = useState(null);
  const [eventosPorEstado, setEventosPorEstado] = useState(null);
  const [tendenciaMensual, setTendenciaMensual] = useState(null);
  const [estadosBarra, setEstadosBarra] = useState(null);
  const [dashboardStats, setDashboardStats] = useState([]);
  const [ultimoMensaje, setUltimoMensaje] = useState('');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [toast, setToast] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('panel');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [salaActiva, setSalaActiva] = useState(null);
  const [chatUserId, setChatUserId] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const { cardWidth: actionsCardWidth } = useMemo(() => {
    const availableWidth = windowWidth - 40;
    let numColumns = Math.floor(availableWidth / (MIN_CARD_WIDTH_ACTIONS + CARD_MARGIN));
    numColumns = Math.max(1, Math.min(numColumns, MAX_COLUMNS_ACTIONS));
    const totalGaps = CARD_MARGIN * (numColumns - 1);
    return { cardWidth: (availableWidth - totalGaps) / numColumns };
  }, [windowWidth]);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingDashboard(true);

    const token = await getTokenAsync();
    if (!token) {
      setLoadingDashboard(false);
      setRefreshing(false);
      router.replace('/');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [prof, statsRes, histRes, comiteRes, notifRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/profile`, { headers, timeout: 8000 }),
        axios.get(`${API_BASE_URL}/dashboard/my-stats`, { headers, timeout: 8000 }),
        axios.get(`${API_BASE_URL}/dashboard/my-historical`, { headers, timeout: 8000 }),
        axios.get(`${API_BASE_URL}/dashboard/my-committee-events`, { headers, timeout: 8000 }),
        axios.get(`${API_BASE_URL}/notificaciones`, { headers, timeout: 8000 }),
      ]);

      const counts = { aprobado: 0, pendiente: 0, rechazado: 0, vencido: 0, cancelado: 0, completado: 0 };
      let events = [];
      let statsCards = [];

      if (prof.status === 'fulfilled' && prof.value && prof.value.data) {
        const u = prof.value.data;
        setNombreUsuario(u.nombre || params.nombre || 'Académico');
        setTelegramUsername(u.telegram_username || '');
        setChatUserId(u.id || u.idusuario || u.user_id || u.iduser || null);
        const chatId = u.telegram_chat_id;
        setIsTelegramLinked(chatId !== null && chatId !== undefined && chatId !== '' && chatId !== 'null' && chatId !== 'undefined');
      }

      if (statsRes.status === 'fulfilled' && statsRes.value && statsRes.value.data) {
        const d = statsRes.value.data;
        const raw = Array.isArray(d) ? d : d.stats;
        if (Array.isArray(raw)) {
          statsCards = raw.map((s) => safeObj(s));
        }
        if (d && typeof d === 'object') {
          Object.keys(counts).forEach((k) => {
            if (typeof d[k] === 'number') counts[k] = d[k];
          });
        }
      }

      if (histRes.status === 'fulfilled' && histRes.value && histRes.value.data) {
        const raw = Array.isArray(histRes.value.data) ? histRes.value.data : histRes.value.data.data;
        const arr = safeArray(raw);
        if (arr.length > 0) {
          setTendenciaMensual({
            labels: arr.map((d) => String(d.name || '').slice(0, 3)),
            datasets: [{ data: arr.map((d) => Number(d.eventos ?? d.total ?? 0)) }],
          });
        } else {
          setTendenciaMensual(null);
        }
      }

      if (comiteRes.status === 'fulfilled' && comiteRes.value && comiteRes.value.data) {
        const d = comiteRes.value.data;
        events = safeArray(Array.isArray(d) ? d : d.events);
        const activos = events.filter(isEventActive).sort((a, b) => new Date(a.fechaevento || 0) - new Date(b.fechaevento || 0));
        setProximoEvento(activos[0] || null);
        events.forEach((ev) => {
          const k = String(ev.estado || 'pendiente').toLowerCase();
          if (counts[k] !== undefined) counts[k] += 1;
        });
      }

      if (notifRes.status === 'fulfilled' && notifRes.value && Array.isArray(notifRes.value.data)) {
        setNotifications(notifRes.value.data);
      }

      const pie = Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          name: k.charAt(0).toUpperCase() + k.slice(1),
          population: v,
          color: STATE_COLORS[k] || COLORS.info,
          legendFontColor: COLORS.textPrimary,
          legendFontSize: 12,
        }));
      setEventosPorEstado(pie.length ? pie : null);

      const barArr = Object.entries(counts)
        .filter(([, v]) => v > 0)
        .slice(0, 6);
      setEstadosBarra(barArr.length ? { labels: barArr.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)), datasets: [{ data: barArr.map(([, v]) => v) }] } : null);

      if (statsCards.length >= 4) {
        setDashboardStats(statsCards);
      } else {
        setDashboardStats([
          { title: 'Eventos en Comité', value: String(events.length), icon: 'people-outline', color: COLORS.primary, trend: null, description: 'Eventos donde participas' },
          { title: 'Pendientes', value: String(counts.pendiente), icon: 'document-text-outline', color: COLORS.warning, trend: null, description: 'Esperando aprobación' },
          { title: 'Aprobados', value: String(counts.aprobado), icon: 'checkmark-done-outline', color: COLORS.success, trend: null, description: 'Eventos aprobados' },
          { title: 'Rechazados', value: String(counts.rechazado), icon: 'close-circle-outline', color: COLORS.accent, trend: null, description: 'Eventos rechazados' },
          { title: 'Vencidos', value: String(counts.vencido), icon: 'timer-outline', color: COLORS.secondary, trend: null, description: 'Eventos vencidos' },
          { title: 'Completados', value: String(counts.completado), icon: 'trophy-outline', color: COLORS.info, trend: null, description: 'Fase 3 finalizada' },
        ]);
      }

      setUltimoMensaje(events.length === 0 ? 'Aún no participas en eventos.' : '');
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error al cargar dashboard académico:', error);
      setToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los datos.' });
    } finally {
      setLoadingDashboard(false);
      setRefreshing(false);
    }
  }, [router, params.nombre]);

  useEffect(() => {
    const validateSession = async () => {
      const token = await getTokenAsync();
      if (!token) {
        router.replace('/');
        return;
      }
      fetchDashboardData();
    };
    validateSession();
  }, [fetchDashboardData, router]);

  const markAsRead = async (notifId) => {
    try {
      const token = await getTokenAsync();
      await axios.put(`${API_BASE_URL}/notificaciones/${notifId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markAsRead(n.id)));
  };

  const handleActionPress = (route) => {
    setIsDockExpanded(false);
    if (route) router.push(route);
    else setToast({ type: 'info', title: 'En Desarrollo', message: 'Próximamente.' });
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await deleteTokenAsync();
      router.replace('/');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('¿Está seguro que desea cerrar la sesión actual?')) await doLogout();
    } else {
      Alert.alert('Confirmar Cierre de Sesión', '¿Está seguro que desea cerrar la sesión actual?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

const adminActions = [
    { id: '1', title: 'Pendientes', icon: 'timer-outline', route: '/admin/EventosPendientes', color: COLORS.warning, description: 'En espera de aprobación', tab: 'gestion', badge: `${dashboardStats.find((s) => s.title === 'Pendientes')?.value ?? '0'} pendientes` },
    { id: '2', title: 'Aprobados', icon: 'checkmark-circle-outline', route: '/admin/EventosAprobados', color: COLORS.success, description: 'Eventos aprobados', tab: 'gestion' },
    { id: '3', title: 'Rechazados', icon: 'close-circle-outline', route: '/admin/EventosRechazados', color: COLORS.accent, description: 'Eventos rechazados', tab: 'gestion' },
    { id: '4', title: 'Programación', icon: 'calendar-outline', route: '/admin/ProgramacionEvento', color: COLORS.info, description: 'Carga programática', tab: 'gestion' },
    { id: '5', title: 'Vencidos', icon: 'alert-circle-outline', route: '/admin/EventosVencidos', color: COLORS.secondary, description: 'Eventos vencidos', tab: 'gestion' },
    { id: '6', title: 'Completados', icon: 'trophy-outline', route: '/admin/EventosCompletados', color: COLORS.info, description: 'Fase 3 finalizada', tab: 'gestion' },
    { id: '7', title: 'Comité', icon: 'people-outline', route: '/admin/EventosComite', color: COLORS.secondary, description: 'Eventos donde eres comité', tab: 'comite' },
    { id: '8', title: 'Reportes Avanzados', icon: 'document-text-outline', route: '/admin/reportes', color: COLORS.secondary, description: 'Generación de reportes detallados', tab: 'comite', badge: 'Nuevo' },
  ];
  const gestionTools = adminActions.filter((t) => t.tab === 'gestion');
  const comiteTools = adminActions.filter((t) => t.tab === 'comite');
  const chartWidth = windowWidth - 60;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isDockExpanded ? 210 : 100 }}>
        <MinimalHeader
          nombreUsuario={nombreUsuario}
          unreadCount={unreadCount}
          onNotificationPress={() => setShowNotifications(true)}
          onRefresh={() => fetchDashboardData(true)}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          onTelegramPress={() => setShowTelegramModal(true)}
          isTelegramLinked={isTelegramLinked}
        />

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <ProyectarEventoCTA onPress={() => handleActionPress('/admin/ProyectoEvento')} />
        </View>

        {proximoEvento ? (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <ProximoEventoCard
              evento={proximoEvento}
              onPress={() => router.push(`/admin/EventDetailScreen?eventId=${proximoEvento.idevento}`)}
            />
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <MainTabs active={activeMainTab} onChange={setActiveMainTab} />
        </View>

        {loadingDashboard ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando tu panel…</Text>
          </View>
        ) : activeMainTab === 'analisis' ? (
          <>
            <Section title="Análisis Visual" subtitle="Distribución y tendencias de tus eventos">
              <ChartCard title="Distribución por Estado" subtitle="Aprobados · Pendientes · Rechazados" empty={!eventosPorEstado} emptyIcon="pie-chart-outline">
                <PieChart
                  data={eventosPorEstado || []}
                  width={chartWidth + 20}
                  height={200}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="10"
                  chartConfig={{ color: (o = 1) => `rgba(0,0,0,${o})` }}
                />
              </ChartCard>

              <ChartCard title="Tendencia Mensual" subtitle="Últimos meses" empty={!tendenciaMensual} emptyIcon="trending-up-outline">
                <CustomLineChart data={tendenciaMensual || { labels: [], datasets: [{ data: [] }] }} width={chartWidth} height={200} color={COLORS.primary} />
              </ChartCard>

              <ChartCard title="Eventos por Estado" subtitle="Conteo actual" empty={!estadosBarra} emptyIcon="bar-chart-outline">
                <CustomBarChart data={estadosBarra || { labels: [], datasets: [{ data: [] }] }} width={chartWidth} height={230} color={COLORS.success} />
              </ChartCard>
            </Section>
          </>
        ) : (
          <>
            <Section title="Herramientas de Gestión" subtitle="Accede a las funcionalidades principales">
              {ultimoMensaje ? <Text style={styles.emptyMsg}>{ultimoMensaje}</Text> : null}
              <View style={styles.toolsGrid}>
                {gestionTools.map((tool, i) => (
                  <ManagementToolCard
                    key={i}
                    title={tool.title}
                    description={tool.description}
                    icon={tool.icon}
                    color={tool.color}
                    badge={tool.badge}
                    onPress={() => handleActionPress(tool.route)}
                    cardWidth={actionsCardWidth}
                  />
                ))}
              </View>
            </Section>

            <Section title="Herramientas de Comité y Reportes" subtitle="Comité y generación de reportes detallados">
              <View style={styles.toolsGrid}>
                {comiteTools.map((tool, i) => (
                  <ManagementToolCard
                    key={i}
                    title={tool.title}
                    description={tool.description}
                    icon={tool.icon}
                    color={tool.color}
                    badge={tool.badge}
                    onPress={() => handleActionPress(tool.route)}
                    cardWidth={actionsCardWidth}
                  />
                ))}
              </View>
            </Section>

            <Section title="Alertas" subtitle="Estado operativo actual">
              <View style={styles.alertsContainer}>
                {(dashboardStats.find((s) => s.title === 'Pendientes')?.value || '0') !== '0' ? (
                  <View style={[styles.alertCard, { borderLeftColor: COLORS.warning }]}>
                    <Ionicons name="warning-outline" size={24} color={COLORS.warning} />
                    <View style={styles.alertBody}>
                      <Text style={styles.alertTitle}>Eventos pendientes</Text>
                      <Text style={styles.alertDesc}>Tienes eventos pendientes de revisión.</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.alertCard, { borderLeftColor: COLORS.success }]}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.success} />
                    <View style={styles.alertBody}>
                      <Text style={styles.alertTitle}>Todo al día</Text>
                      <Text style={styles.alertDesc}>No hay eventos pendientes.</Text>
                    </View>
                  </View>
                )}
              </View>
            </Section>

            <Section title="Resumen de Actividad" subtitle="Tus métricas clave">
              <View style={styles.statsGrid}>
                {dashboardStats.map((stat, i) => (
                  <DashboardCard key={i} {...stat} />
                ))}
              </View>
            </Section>
          </>
        )}
      </ScrollView>

      {showNotifications ? (
        <View style={styles.overlay}>
          <View style={styles.notifModal}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Notificaciones {unreadCount > 0 ? <Text style={{ color: COLORS.primary }}>({unreadCount})</Text> : null}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {unreadCount > 0 ? (
                  <TouchableOpacity onPress={markAllAsRead}>
                    <Text style={styles.markAllText}>Marcar todas</Text>
                  </TouchableOpacity>
                ) : null}
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
                {notifications.map((notif) => (
                  <TouchableOpacity
                    key={notif.id}
                    style={[styles.notifItem, { backgroundColor: notif.read ? COLORS.surface : COLORS.primaryLight }]}
                    onPress={async () => {
                      if (!notif.read) await markAsRead(notif.id);
                      setShowNotifications(false);
                    }}
                  >
                    <View style={[styles.notifDot, { backgroundColor: notif.read ? COLORS.border : COLORS.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifMsg, { fontWeight: notif.read ? '400' : '600' }]}>{notif.mensaje}</Text>
                      <Text style={styles.notifTime}>{new Date(notif.createdAt || Date.now()).toLocaleDateString()}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}

      {showTelegramModal ? (
        <Modal
          visible={showTelegramModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTelegramModal(false)}
        >
          <View style={styles.telegramOverlay}>
            <View style={styles.telegramModal}>
              <View style={styles.telegramHeader}>
                <Ionicons name="send" size={38} color="#0088cc" />
                <Text style={styles.telegramTitle}>{isTelegramLinked ? 'Telegram Vinculado ✓' : 'Vincular Telegram'}</Text>
                <TouchableOpacity onPress={() => setShowTelegramModal(false)} style={{ position: 'absolute', top: 16, right: 16 }}>
                  <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 22 }}>
                {isTelegramLinked ? (
                  <>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
                      <Text style={styles.telegramBodyText}>Tu cuenta está vinculada con Telegram</Text>
                      {telegramUsername ? <Text style={styles.telegramUsernameStyled}>@{telegramUsername}</Text> : null}
                    </View>
                    <TouchableOpacity style={[styles.telegramBlueBtn, { backgroundColor: COLORS.accent }]} onPress={() => {
                      axios.put(`${API_BASE_URL}/unlink-telegram`, {}, { headers: { Authorization: `Bearer ${TOKEN_KEY}` } }).catch(() => {});
                      setIsTelegramLinked(false);
                      setTelegramUsername('');
                    }}>
                      <Ionicons name="link-outline" size={20} color={COLORS.white} />
                      <Text style={styles.telegramBlueBtnText}>Desvincular</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.telegramStepsCard}>
                      <Text style={styles.telegramBodyText}>Pasos a seguir:</Text>
                      {['Abre el bot en Telegram', 'Envía el comando /start', 'Envía tu email institucional'].map((txt, i) => (
                        <View key={i} style={styles.telegramStep}>
                          <View style={styles.telegramStepNum}><Text style={styles.telegramStepNumText}>{i + 1}</Text></View>
                          <Text style={styles.telegramBodyText}>{txt}</Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity style={styles.telegramBlueBtn} onPress={() => {
                      const url = `https://t.me/${BOT_USERNAME}`;
                      if (Platform.OS === 'web') window.open(url, '_blank');
                      else import('expo-linking').then(({ default: Linking }) => Linking.openURL(url));
                    }}>
                      <Ionicons name="send" size={20} color={COLORS.white} />
                      <Text style={styles.telegramBlueBtnText}>Abrir Bot en Telegram</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.telegramBlueBtn, { backgroundColor: COLORS.primary }]}
                      onPress={() => { fetchDashboardData(true); setToast({ type: 'info', title: 'Verificando...', message: 'Revisando estado de Telegram' }); }}
                    >
                      <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                      <Text style={styles.telegramBlueBtnText}>Ya vinculé mi cuenta</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}

      {isDockExpanded ? (
        <Pressable style={styles.dockOverlay} onPress={() => setIsDockExpanded(false)} />
      ) : null}
      <MinimalBottomDock
        onLogout={handleLogout}
        onActionPress={handleActionPress}
        isExpanded={isDockExpanded}
        onToggleExpanded={() => setIsDockExpanded(!isDockExpanded)}
      />

      {toast ? (
        <View
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : toast.type === 'info' ? styles.toastInfo : styles.toastError,
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'info' ? 'information-circle' : 'alert-circle'}
            size={20}
            color="#fff"
          />
          <View style={styles.toastContent}>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            {toast.message ? <Text style={styles.toastMessage}>{toast.message}</Text> : null}
          </View>
        </View>
      ) : null}

      {!isDockExpanded && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsChatOpen(true)} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {isChatOpen ? (
        <View style={styles.chatOverlay}>
          <View style={{
            width: '90%', maxWidth: 420, height: '100%',
            backgroundColor: COLORS.background,
            borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
            marginLeft: 'auto', elevation: 12,
            shadowColor: '#000', shadowOffset: { width: -6, height: 0 },
            shadowOpacity: 0.2, shadowRadius: 14,
            overflow: 'hidden',
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
              paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2,
              backgroundColor: COLORS.white,
            }}>
              <TouchableOpacity
                onPress={() => setIsChatOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: COLORS.border + '88',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <ChatEmbed
                userId={String(chatUserId || nombreUsuario)}
                userRole="academico"
                userName={nombreUsuario || chatUserId}
                onRoomChange={setSalaActiva}
              />
            </View>
          </View>
        </View>
      ) : null}

      <ChatAlertas
        userId={String(chatUserId || nombreUsuario)}
        userRole="academico"
        userName={nombreUsuario || chatUserId}
        activeRoom={isChatOpen ? salaActiva : null}
        chatAbierto={isChatOpen}
        onAbrir={() => setIsChatOpen(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },

  hero: {
    width: '100%', paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 40) + 18, paddingBottom: 22,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10,
  },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  logoBadge: {
    width: 56, height: 40, borderRadius: 8, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    marginRight: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  logo: { width: 52, height: 36, resizeMode: 'contain' },
  heroLeft: { flex: 1 },
  heroGreeting: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  heroName: { fontSize: 22, color: '#fff', fontWeight: '800', marginTop: 2 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: {
    width: 48, height: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)', position: 'relative',
  },
  telegramDot: {
    position: 'absolute', top: 4, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.success, borderWidth: 1, borderColor: COLORS.primary,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: '500' },
  lastUpdatedText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6 },

  proyectarBtnCard: {
    borderRadius: 18, overflow: 'hidden', elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  proyectarBtnPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  proyectarGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  proyectarIconWrap: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  proyectarTitle: { fontSize: 19, fontWeight: '800', color: COLORS.white },
  proyectarSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  proyectarArrow: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: COLORS.white, borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  notifBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },

  section: { width: '100%', paddingHorizontal: 20, marginTop: 28 },
  sectionHeader: { marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  sectionAccent: { width: 4, height: 24, backgroundColor: COLORS.primary, borderRadius: 2, marginRight: 10 },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: COLORS.textSecondary },

  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_MARGIN, justifyContent: 'space-between' },
  mainTabs: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 14,
    padding: 5, gap: 5, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  mainTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: 10,
  },
  mainTabActive: { backgroundColor: COLORS.primary },
  mainTabText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  mainTabTextActive: { color: COLORS.white },
  toolCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, minHeight: 130,
    borderWidth: 1, maxWidth: '100%',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  toolIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  toolTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20, marginBottom: 4 },
  toolDescription: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  toolBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, position: 'absolute', top: 20, right: 20 },
  toolBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },

  chartCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  chartCardHeader: { marginBottom: 12 },
  chartCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  chartCardSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  chartEmpty: { alignItems: 'center', paddingVertical: 32 },
  chartEmptyText: { marginTop: 10, fontSize: 14, color: COLORS.textTertiary },

  alertsContainer: { gap: 10 },
  alertCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  alertBody: { flex: 1, marginLeft: 12 },
  alertTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  alertDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_MARGIN, justifyContent: 'space-between' },
  dashboardCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, minHeight: 140,
    width: '48%', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  dashboardCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dashboardCardIconChip: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dashboardCardValue: { fontSize: 26, fontWeight: '800' },
  dashboardCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  dashboardCardDescription: { fontSize: 11, color: COLORS.textTertiary },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trendText: { fontSize: 12, fontWeight: '600' },

  eventoCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  eventoLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, paddingRight: 8 },
  eventoIconBg: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  eventoContent: { flex: 1, gap: 4 },
  eventoLabel: {
    fontSize: 11, color: COLORS.textTertiary, fontWeight: '500',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  eventoTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 22 },
  eventoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  eventoMeta: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  estadoBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-end', marginBottom: 8 },
  estadoBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  dockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.35)', zIndex: 5 },
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10, overflow: 'hidden',
  },
  dockToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  dockToggleText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  dockExpanded: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: COLORS.surface, flex: 1 },
  dockActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14, gap: 8 },
  dockActionBtn: { alignItems: 'center', paddingVertical: 8, width: '22%' },
  dockActionText: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  dockLogout: {
    flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center', borderRadius: 10,
  },
  dockLogoutText: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginLeft: 8 },

  fab: {
    position: 'absolute', bottom: 84, left: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6,
    zIndex: 15,
  },
  chatOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start',
    paddingTop: StatusBar.currentHeight || 0, zIndex: 2000,
  },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-start',
    paddingTop: (StatusBar.currentHeight || 0) + 10, zIndex: 1000,
  },
  notifModal: {
    backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16,
    maxHeight: '72%', elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
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

  telegramOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  telegramModal: { backgroundColor: COLORS.surface, borderRadius: 24, width: '100%', maxWidth: 500, maxHeight: '80%', overflow: 'hidden' },
  telegramHeader: { alignItems: 'center', padding: 24, backgroundColor: '#E3F2FD', borderBottomWidth: 1, borderBottomColor: COLORS.border, position: 'relative' },
  telegramTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginTop: 10 },
  telegramStepsCard: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, marginBottom: 20 },
  telegramStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  telegramStepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  telegramStepNumText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  telegramBodyText: { fontSize: 14, color: COLORS.textSecondary, flex: 1, lineHeight: 19 },
  telegramUsernameStyled: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: 6 },
  telegramBlueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 12, backgroundColor: '#0088cc', marginBottom: 12,
  },
  telegramBlueBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 10, fontSize: 14, color: COLORS.textSecondary },
  emptyMsg: { fontSize: 13, color: COLORS.textTertiary, marginBottom: 12 },

  toast: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
    zIndex: 1000, maxWidth: 480, alignSelf: 'center',
  },
  toastError: { backgroundColor: 'rgba(220, 38, 38, 0.95)' },
  toastSuccess: { backgroundColor: 'rgba(22, 163, 74, 0.95)' },
  toastInfo: { backgroundColor: 'rgba(15, 23, 42, 0.92)' },
  toastContent: { flex: 1 },
  toastTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  toastMessage: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2, lineHeight: 16 },
});

export default HomeAcademicoScreen;