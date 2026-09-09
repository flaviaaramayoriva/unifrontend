import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import ChatEmbed from '../../components/ChatEmbed';
import ChatFlotante from '../../components/ChatFlotante';

import DashboardStats from '../../components/admin/DashboardStats';
import OverviewCharts from '../../components/admin/OverviewCharts';
import UpcomingEvents from '../../components/admin/UpcomingEvents';
import CommitteeEventsList from '../../components/admin/CommitteeEventsList';
import StudentEnrollment from '../../components/admin/StudentEnrollment';
import TopEnrollment from '../../components/admin/TopEnrollment';
import ActionGrid from '../../components/admin/ActionGrid';
import TelegramModal from '../../components/admin/TelegramModal';

// ============ Configuración ============
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
//const API_BASE_URL = 'https://localhost:8080'; // Cambiar según el entorno de desarrollo o producción
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#C44B0A',
  primaryLight: '#FFEDD5',
  secondary: '#4B5563',
  accent: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#D1D5DB',
  shadow: 'rgba(0, 0, 0, 0.05)',
  white: '#FFFFFF',
  black: '#000000',
};

// ============ Acciones de gestión (constante a nivel de módulo) ============
const ADMIN_ACTIONS = [
  {
    id: '0',
    title: 'Proyecto del Evento',
    iconName: 'clipboard-outline',
    route: '/admin/ProyectoEvento',
    color: COLORS.primary,
    description: 'Gestión de proyectos institucionales',
    badge: 'Activo',
    badgeColor: COLORS.success,
  },
  {
    id: '1',
    title: 'Gestión de Usuarios',
    iconName: 'people-outline',
    route: '/admin/UsuarioAcademico',
    color: COLORS.secondary,
    description: 'Administración de cuentas de usuario',
  },
  {
    id: '2',
    title: 'Reportes Avanzados',
    iconName: 'document-text-outline',
    route: '/admin/reportes',
    color: COLORS.secondary,
    description: 'Generación de reportes detallados',
    badge: 'Nuevo',
    badgeColor: COLORS.accent,
  },
  {
    id: '3',
    title: 'Eventos Pendientes',
    iconName: 'timer-outline',
    route: '/admin/EventosPendientes',
    color: COLORS.warning,
    description: 'Revisión y aprobación de eventos',
    badgeColor: COLORS.warning,
  },
  {
    id: '4',
    title: 'Eventos Aprobados',
    iconName: 'checkmark-circle-outline',
    route: '/admin/EventosAprobados',
    color: COLORS.success,
    description: 'Gestión de eventos ya aprobados',
    badgeColor: COLORS.black
  },
  {
    id: '5',
    title: 'Eventos Completados',
    iconName: 'checkmark-done-circle-outline',
    route: '/admin/EventosCompletados',
    color: COLORS.info,
    description: 'Gestión de eventos finalizados',
    badge: 'Nuevo',
    badgeColor: COLORS.accent,
  },
  {
    id: '6',
    title: 'Eventos Rechazados',
    iconName: 'document-text-outline',
    route: '/admin/EventosRechazados',
    color: COLORS.secondary,
    description: 'Gestión de eventos rechazados',
    badge: 'Nuevo',
    badgeColor: COLORS.accent,
  },
  {
    id: '7',
    title: 'Eventos Vencidos',
    iconName: 'document-text-outline',
    route: '/admin/EventosVencidos',
    color: COLORS.secondary,
    description: 'Gestión de eventos vencidos',
    badge: 'Nuevo',
    badgeColor: COLORS.accent,
  },
];

// ============ Utilidades ============
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

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

const getNotificationIcon = (type) => {
  switch (type) {
    case 'nuevo_evento': return 'calendar-outline';
    case 'evento_aprobado': return 'checkmark-circle-outline';
    case 'evento_rechazado': return 'close-circle-outline';
    case 'recordatorio': return 'alarm-outline';
    case 'comite_invitacion': return 'people-outline';
    case 'mensaje_nuevo': return 'chatbubble-outline';
    default: return 'notifications-outline';
  }
};

// ============ Sub-componentes de UI (específicos de esta pantalla) ============
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0].charAt(0).toUpperCase() : '';
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : '';
  return (first + second) || '?';
};

const getCurrentGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const HeroIconButton = ({ iconName, onPress, active, dotColor, colors }) => {
  const styles = createStyles(colors);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.heroIconButton}
      accessibilityRole="button"
      activeOpacity={0.75}
    >
      <Ionicons name={iconName} size={22} color="#FFFFFF" />
      {active && <View style={[styles.heroDot, { backgroundColor: dotColor || colors.white }]} />}
    </TouchableOpacity>
  );
};

const HeroHeader = ({ nombreUsuario, facultad, unreadCount, onNotificationPress, onTelegramPress, isTelegramLinked, colors }) => {
  const styles = createStyles(colors);

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroHeader}
    >
      <View style={styles.heroTopRow}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarInitials}>{getInitials(nombreUsuario)}</Text>
        </View>

        <View style={styles.heroGreetingBlock}>
          <Text style={styles.heroGreeting}>{getCurrentGreeting()},</Text>
          <Text style={styles.heroUserName} numberOfLines={1}>{nombreUsuario}</Text>
        </View>

        <View style={styles.heroControls}>
          <HeroIconButton
            iconName="send"
            onPress={onTelegramPress}
            active={isTelegramLinked}
            dotColor="#31C48D"
            colors={colors}
          />
          <View style={{ position: 'relative' }}>
            <HeroIconButton
              iconName="notifications-outline"
              onPress={onNotificationPress}
              colors={colors}
            />
            {unreadCount > 0 && (
              <View style={styles.heroNotificationBadge}>
                <Text style={styles.heroNotificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.heroMetaRow}>
        <View style={styles.heroFacultyChip}>
          <Ionicons name="school-outline" size={13} color="#FFFFFF" />
          <Text style={styles.heroFacultyText} numberOfLines={1}>
            {facultad || 'Sin facultad asignada'}
          </Text>
        </View>
        <Text style={styles.heroSubtitle}>Panel de Usuario Académico</Text>
      </View>
    </LinearGradient>
  );
};

const NotificationsModal = ({ visible, onClose, notifications, markAsRead, markAllAsRead, onNotificationPress, colors }) => {
  const styles = createStyles(colors);
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.notificationsModalOverlay}>
        <View style={[styles.notificationsModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.notificationsModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.notificationsModalTitle, { color: colors.textPrimary }]}>Notificaciones</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notificationsList}>
            {notifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyNotificationsText, { color: colors.textTertiary }]}>No hay notificaciones nuevas</Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.idnotification || notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.notificationItemUnread,
                    { borderBottomColor: colors.divider }
                  ]}
                  onPress={() => {
                    markAsRead(notification.idnotification || notification.id);
                    onNotificationPress(notification);
                    onClose();
                  }}
                >
                  <View style={styles.notificationIconContainer}>
                    <Ionicons
                      name={getNotificationIcon(notification.tipo)}
                      size={20}
                      color={colors.primary}
                    />
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={[styles.notificationTitle, !notification.read && styles.notificationTitleUnread, { color: colors.textPrimary }]}>
                      {notification.titulo || notification.title}
                    </Text>
                    <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                      {notification.mensaje || notification.message}
                    </Text>
                    <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>
                      {notification.created_at
                        ? new Date(notification.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })
                        : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {notifications.some(n => !n.read) && (
            <TouchableOpacity
              style={[styles.markAllReadButton, { borderTopColor: colors.border }]}
              onPress={markAllAsRead}
            >
              <Ionicons name="checkmark-done" size={18} color={colors.primary} />
              <Text style={[styles.markAllReadText, { color: colors.primary }]}>Marcar todas como leídas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const MinimalBottomDock = ({ onLogout, onActionPress, isExpanded, onToggleExpanded, colors }) => {
  const dockHeight = useRef(new Animated.Value(60)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const styles = createStyles(colors);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(dockHeight, {
        toValue: isExpanded ? 212 : 60,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const quickActions = [
    {
      id: 'add-user',
      title: 'Nuevo Usuario',
      icon: 'person-add-outline',
      color: COLORS.primary,
      route: '/admin/CrearUsuarioA',
    },
    {
      id: 'pendientes',
      title: 'Pendientes',
      icon: 'document-text-outline',
      route: '/admin/EventosPendientes',
      color: COLORS.warning,
    },
    {
      id: 'aprobados',
      title: 'Aprobados',
      icon: 'checkmark-circle-outline',
      color: COLORS.success,
      route: '/admin/EventosAprobados',
    },
    {
      id: 'settings',
      title: 'Ajustes',
      icon: 'settings-outline',
      color: COLORS.secondary,
      route: '/admin/Settings'
    }
  ];

  return (
    <Animated.View style={[styles.minimalDockContainer, { height: dockHeight, backgroundColor: colors.primary, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onToggleExpanded} style={styles.minimalDockToggle} activeOpacity={0.7}>
        <Animated.View style={[styles.dockHandleBar, { transform: [{ rotate: rotateInterpolate }] }]} />
        <View style={styles.dockToggleRow}>
          <Ionicons name={isExpanded ? 'chevron-down-outline' : 'chevron-up-outline'} size={20} color={colors.white} />
          <Text style={[styles.minimalDockToggleText, { color: colors.white }]}>Menú</Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.minimalDockExpandedContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.minimalDockQuickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.minimalDockQuickActionButton}
                onPress={() => onActionPress(action)}
                activeOpacity={0.7}
              >
                <View style={[styles.dockActionTile, { backgroundColor: `${action.color}15` }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={[styles.minimalDockQuickActionText, { color: action.color }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.minimalDockLogoutButton} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
            <Text style={[styles.minimalDockLogoutButtonText, { color: colors.white }]}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

// ============ Pantalla principal ============
const HomeAcademicoScreen = () => {
  const params = useLocalSearchParams();
  const nombreUsuario = params.nombre || 'Administrador';
  const router = useRouter();
  const {
    colors,
    colorScheme,
    setTheme: setGlobalTheme,
    setAccentColor: setGlobalAccentColor,
  } = useTheme();
  const styles = createStyles(colors);

  const [chatVisible, setChatVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [isBannerExpanded, setIsBannerExpanded] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [comiteeEvents, setComiteeEvents] = useState([]);
  const [loadingComitee, setLoadingComitee] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [eventosFacultad, setEventosFacultad] = useState([]);
  const [loadingEventosFacultad, setLoadingEventosFacultad] = useState(false);
  const [userProfile, setUserProfile] = useState({
    nombre: '',
    apellidopat: '',
    apellidomat: '',
    facultad: null,
    loading: true,
  });
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [dashboardStats, setDashboardStats] = useState([]);
  const [statusData, setStatusData] = useState({});
  const [error, setError] = useState(''); // ✅ NUEVO: Estado de error global

  const unreadCount = notifications.filter(notif => !notif.read).length;
  const ultimoEventoId = comiteeEvents.length > 0 ? String(comiteeEvents[0].idevento) : undefined;

  // ============ Data fetching ============
  const fetchEstudiantesInscritosFacultad = useCallback(async () => {
    setLoadingEventosFacultad(true);
    try {
      const token = await getTokenAsync();
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/estudiantes/estudiantes-inscritos-facultad?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setEventosFacultad(response.data.eventos || []);
    } catch (error) {
      console.error('Error al cargar estudiantes de la facultad:', error);
    } finally {
      setLoadingEventosFacultad(false);
    }
  }, []);

  const checkTelegramStatus = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const chatId = response.data.telegram_chat_id;
      const hasTelegram = chatId !== null &&
                          chatId !== undefined &&
                          chatId !== '' &&
                          chatId !== 'null' &&
                          chatId !== 'undefined';

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

      showAlert('✓ Éxito', 'Telegram desvinculado correctamente');
    } catch (error) {
      console.error('Error al desvincular Telegram:', error);
      showAlert('Error', 'No se pudo desvincular Telegram');
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/notificaciones`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 8000,
      });

      const data = response.data;
      const mapped = Array.isArray(data) ? data.map(n => ({
        ...n,
        id: n.idnotificacion,
        read: n.estado === 'leido' || n.read === true
      })) : [];

      setNotifications(mapped);
    } catch (error) {
      console.error('❌ Error al cargar notificaciones:', error);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      const token = await getTokenAsync();
      if (!token) return;

      await axios.patch(
        `${API_BASE_URL}/notificaciones/${notificationId}/read`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setNotifications(prev =>
        prev.map(n =>
          (n.idnotification === notificationId || n.id === notificationId)
            ? { ...n, read: true, estado: 'leido' }
            : n
        )
      );
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) return;

      await axios.patch(
        `${API_BASE_URL}/notificaciones/mark-all-read`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, estado: 'leido' }))
      );
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
      showAlert('Error', 'No se pudieron marcar todas las notificaciones como leídas');
    }
  }, []);

  const navigateByNotification = useCallback((notification) => {
    const tipo = notification.tipo;
    const idRelacionado = notification.id_relacionado || notification.idevento || notification.id_relacion;

    switch (tipo) {
      case 'nuevo_evento':
      case 'recordatorio':
        router.push(idRelacionado
          ? `/admin/EventDetailScreen?eventId=${idRelacionado}`
          : '/admin/EventosPendientes');
        break;

      case 'evento_aprobado':
        router.push(idRelacionado
          ? `/admin/EventDetailScreen?eventId=${idRelacionado}`
          : '/admin/EventosAprobados');
        break;

      case 'evento_rechazado':
        router.push(idRelacionado
          ? `/admin/EventDetailScreen?eventId=${idRelacionado}`
          : '/admin/EventosRechazados');
        break;

      case 'comite_invitacion':
        router.push(idRelacionado
          ? `/admin/EventDetailComite?eventId=${idRelacionado}`
          : '/admin/EventosPendientes');
        break;

      case 'mensaje_nuevo':
        setIsChatOpen(true);
        break;

      default:
        if (idRelacionado) {
          router.push(`/admin/EventDetailScreen?eventId=${idRelacionado}`);
        }
        break;
    }
  }, [router]);

  const fetchCommitteeEvents = useCallback(async () => {
    setLoadingComitee(true);
    try {
      const token = await getTokenAsync();
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/dashboard/my-committee-events`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setComiteeEvents(response.data.events || []);
    } catch (error) {
      console.error('Error al cargar eventos como comité:', error);
    } finally {
      setLoadingComitee(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const token = await getTokenAsync();
      if (!token) {
        setLoadingDashboard(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/dashboard/my-stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000,
      });

      const data = response.data;
      const counts = data.estadoCounts || {};

      setStatusData(counts);
      setDashboardStats([
        {
          title: 'Eventos Aprobados',
          value: counts.aprobado?.toString() || '0',
          icon: 'checkmark-circle',
          color: COLORS.success,
          description: 'Total aprobados'
        },
        {
          title: 'Eventos Pendientes',
          value: counts.pendiente?.toString() || '0',
          icon: 'time',
          color: COLORS.warning,
          description: 'Total pendientes'
        },
        {
          title: 'Eventos Completados',
          value: counts.completado?.toString() || '0',
          icon: 'trophy-outline',
          color: COLORS.info,
          description: 'Total completados'
        },
        {
          title: 'Eventos Vencidos',
          value: counts.vencido?.toString() || '0',
          icon: 'calendar-outline',
          color: COLORS.secondary,
          description: 'Total vencidos'
        },
        {
          title: 'Eventos Rechazados',
          value: counts.rechazado?.toString() || '0',
          icon: 'remove-circle',
          color: '#6366F1',
          description: 'Total rechazados'
        },
        {
          title: 'Eventos Totales',
          value: data.totalEvents?.toString() || '0',
          icon: 'apps',
          color: COLORS.info,
          trend: -3.2,
          description: 'Último mes'
        },
        {
          title: 'Estabilidad Sistema',
          value: `${data.systemStability || 0}%`,
          icon: 'stats-chart',
          color: COLORS.success,
          trend: 2.1,
          description: 'Rendimiento óptimo'
        },
      ]);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      showAlert('Error', `No se pudieron cargar los datos del panel. ${error.message || ''}`);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const fetchHistoricalData = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/dashboard/my-historical`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setHistoricalData(response.data.historical || []);
    } catch (error) {
      console.error('Error al cargar datos históricos:', error);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 8000,
      });

      const user = response.data;

      const facultad = user.facultad === "Sin facultad"
        ? "Sin facultad asignada"
        : user.facultad;

      setUserProfile({
        nombre: user.nombre || '',
        apellidopat: user.apellidopat || '',
        apellidomat: user.apellidomat || '',
        facultad: facultad,
        id: user.id || null,
        role: user.role || 'academico',
        loading: false,
      });

      const savedTheme = user.theme || 'light';
      const savedAccent = user.color_acento || '#C44B0A';
      setGlobalTheme(savedTheme);
      setGlobalAccentColor(savedAccent);

      const usuarioData = JSON.stringify({
        id: user.id,
        nombre: user.nombre || '',
        role: user.role || 'academico'
      });

      if (Platform.OS === 'web') {
        localStorage.setItem('usuario', usuarioData);
      } else {
        await AsyncStorage.setItem('usuario', usuarioData);
      }
    } catch (error) {
      console.error('Error al cargar perfil de usuario:', error);
      showAlert('Error', 'No se pudo cargar tu información personal.');
      setUserProfile((prev) => ({ ...prev, loading: false }));
    }
  }, [router, setGlobalTheme, setGlobalAccentColor]);

  // ============ Effects ============
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const token = await getTokenAsync();

      if (!token) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        router.replace('/');
        return;
      }

      try {
        await fetchDashboardData();
      } catch (e) {
        console.error('Error fetching dashboard:', e);
        setError('Error al cargar datos del panel');
      }

      try {
        await fetchUserProfile();
      } catch (e) {
        console.error('Error fetching user profile:', e);
        setError('Error al cargar perfil de usuario');
      }

      try {
        await fetchHistoricalData();
      } catch (e) {
        console.error('Error fetching historical data:', e);
      }

      try {
        await fetchCommitteeEvents();
      } catch (e) {
        console.error('Error fetching committee events:', e);
      }

      try {
        await fetchNotifications();
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }

      try {
        checkTelegramStatus();
      } catch (e) {
        console.error('Error checking telegram status:', e);
      }

      try {
        await fetchEstudiantesInscritosFacultad();
      } catch (e) {
        console.error('Error fetching estudiantes:', e);
      }
    };

    checkAuthAndLoadData();

    const notificationInterval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => {
      clearInterval(notificationInterval);
    };
  }, []);

  // ============ Handlers ============
  const handleActionPress = (action) => {
    if (typeof action === 'string') {
      router.push(action);
      return;
    }

    if (!action) {
      showAlert('Funcionalidad en Desarrollo', 'Esta característica estará disponible próximamente.');
      return;
    }

    if (action.role) {
      router.push({
        pathname: '/admin/EventosAprobados',
        params: { role: action.role }
      });
      return;
    }

    if (action.route) {
      router.push(action.route);
      return;
    }

    if (action.action) {
      router.push(action.action);
      return;
    }

    showAlert('Funcionalidad en Desarrollo', 'Esta característica estará disponible próximamente.');
  };

  const handleLogout = async () => {
    const performLogout = async () => {
      try {
        await deleteTokenAsync();

        setGlobalTheme('system');
        setGlobalAccentColor('#C44B0A');

        setDashboardStats([]);
        setHistoricalData([]);
        setStatusData({});
        setUserProfile({
          nombre: '',
          apellidopat: '',
          apellidomat: '',
          facultad: null,
          loading: false,
        });

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
            onPress: performLogout,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleSelectCommitteeEvent = useCallback((eventId) => {
    router.push(`/admin/EventDetailComite?eventId=${eventId}`);
  }, [router]);

  // ============ Render ============
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isBannerExpanded ? 220 : 80 }
        ]}
      >
        <HeroHeader
          nombreUsuario={userProfile.nombre ? `${userProfile.nombre} ${userProfile.apellidopat}` : nombreUsuario}
          facultad={userProfile.facultad || 'Cargando...'}
          unreadCount={unreadCount}
          onNotificationPress={() => setShowNotifications(true)}
          onTelegramPress={() => setShowTelegramModal(true)}
          isTelegramLinked={isTelegramLinked}
          colors={colors}
        />

        <DashboardStats
          stats={dashboardStats}
          loading={loadingDashboard}
          historicalData={historicalData}
          colors={colors}
        />

        <OverviewCharts
          estadoCounts={statusData}
          historicalData={historicalData}
          colors={colors}
        />

        <UpcomingEvents
          events={comiteeEvents}
          onSelectEvent={handleSelectCommitteeEvent}
          colors={colors}
        />

        <CommitteeEventsList
          events={comiteeEvents}
          loading={loadingComitee}
          onSelectEvent={handleSelectCommitteeEvent}
          colors={colors}
        />

        <StudentEnrollment
          events={eventosFacultad}
          loading={loadingEventosFacultad}
          colors={colors}
        />

        <TopEnrollment
          events={eventosFacultad}
          colors={colors}
        />

        <ActionGrid
          actions={ADMIN_ACTIONS}
          onActionPress={handleActionPress}
          colors={colors}
        />
      </ScrollView>

      <MinimalBottomDock
        onLogout={handleLogout}
        onActionPress={handleActionPress}
        isExpanded={isBannerExpanded}
        onToggleExpanded={() => setIsBannerExpanded(!isBannerExpanded)}
        colors={colors}
      />

      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        markAsRead={markNotificationAsRead}
        markAllAsRead={markAllAsRead}
        onNotificationPress={navigateByNotification}
        colors={colors}
      />

      {!isBannerExpanded && userProfile.id && (
        <TouchableOpacity
          style={styles.chatButtonLeft}
          onPress={() => setIsChatOpen(true)}
        >
          <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {!isBannerExpanded && userProfile.id && (
        <TouchableOpacity
          style={styles.chatButtonRight}
          onPress={() => setChatVisible(true)}
        >
          <Ionicons name="robot" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {isChatOpen && userProfile.id && (
        <View style={styles.chatOverlay}>
          <View style={[styles.chatPanel, { backgroundColor: colors.surface }]}>
            <View style={[
              styles.chatPanelHeader,
              { backgroundColor: colors.surface, borderColor: colors.border }
            ]}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
                Chat General
              </Text>
              <TouchableOpacity onPress={() => setIsChatOpen(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <ChatEmbed
                userId={String(userProfile.id)}
                userRole={userProfile.role || 'academico'}
                userName={userProfile.nombre || 'Académico'}
              />
            </View>
          </View>
        </View>
      )}

      <TelegramModal
        visible={showTelegramModal}
        onClose={() => setShowTelegramModal(false)}
        isLinked={isTelegramLinked}
        username={telegramUsername}
        onUnlink={unlinkTelegram}
        onRefresh={checkTelegramStatus}
        colors={colors}
      />

      <ChatFlotante
        eventId={ultimoEventoId}
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        userId={userProfile.id}
        userName={userProfile.nombre}
        userRole={userProfile.role}
      />
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  heroHeader: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroGreetingBlock: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  heroUserName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroControls: {
    flexDirection: 'row',
    gap: 10,
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  heroNotificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 3,
  },
  heroNotificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  heroMetaRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroFacultyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 1,
  },
  heroFacultyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },
  notificationsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notificationsModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  notificationsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyNotifications: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyNotificationsText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textTertiary,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  notificationItemUnread: {
    backgroundColor: colors.primaryLight + '30',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notificationIconContainer: {
    position: 'relative',
    paddingTop: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  markAllReadButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  markAllReadText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  minimalDockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  minimalDockToggle: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 2,
  },
  dockHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginBottom: 8,
  },
  dockToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  minimalDockToggleText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  minimalDockExpandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
  },
  minimalDockQuickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 15,
    gap: 10,
  },
  minimalDockQuickActionButton: {
    alignItems: 'center',
    paddingVertical: 4,
    width: '22%',
  },
  dockActionTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  minimalDockQuickActionText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  minimalDockLogoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    width: '100%',
  },
  minimalDockLogoutButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatButtonLeft: {
    position: 'absolute',
    bottom: 78,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C44B0A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#C44B0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    zIndex: 999,
  },
  chatButtonRight: {
    position: 'absolute',
    bottom: 78,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    zIndex: 999,
  },
  chatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: StatusBar.currentHeight || 0,
    zIndex: 2000,
  },
  chatPanel: {
    width: '88%',
    maxWidth: 400,
    height: '85%',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    marginLeft: 'auto',
    elevation: 10,
  },
  chatPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderTopRightRadius: 20,
  },
});

export default HomeAcademicoScreen;