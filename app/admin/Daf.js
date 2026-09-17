import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Pressable, Animated,
  useWindowDimensions, Platform, Modal, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme} from '../../context/ThemeContext'


//const API_BASE_URL =  'https://evento.cidtec-uc.com';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';
const BOT_USERNAME = 'EventUniBot';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
  } else {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
  }
};

const COLORS = {
  primary: '#C44200', primaryLight: '#FFF0E6', secondary: '#0F172A',
  accent: '#EF4444', success: '#047857', warning: '#F59E0B', warningLight: '#FEF3C7',
  info: '#3B82F6', background: '#F6F7F9', surface: '#FFFFFF',
  textPrimary: '#1F2937', textSecondary: '#64748B', textTertiary: '#94A3B8',
  border: '#E6E9EF', divider: '#D1D5DB', shadow: 'rgba(0,0,0,0.05)',
  white: '#FFFFFF', black: '#000000',
};

const CARD_MARGIN = 12;
const MIN_CARD_WIDTH_ACTIONS = 140;
const MAX_COLUMNS_ACTIONS = 4;

const DashboardCard = ({ title, value, icon, color, description, subtitle }) => (
  <View style={styles.dashboardCard}>
    <View style={styles.dashboardCardTopRow}>
      <View style={[styles.dashboardCardIconChip, { backgroundColor: (color || COLORS.primary) + '14' }]}>
        <Ionicons name={icon} size={22} color={color || COLORS.primary} />
      </View>
      <Text style={[styles.dashboardCardValue, { color: color || COLORS.primary }]}>{value}</Text>
    </View>
    <View>
      <Text style={styles.dashboardCardTitle}>{title}</Text>
      {description && <Text style={styles.dashboardCardDescription}>{description}</Text>}
      {subtitle && <Text style={styles.dashboardCardDescription}>{subtitle}</Text>}
    </View>
  </View>
);

const ManagementToolCard = ({ title, description, icon, color, badge, onPress, cardWidth }) => {
  const safeColor = color || COLORS.secondary;
  return (
    <TouchableOpacity style={[styles.toolCard, { borderColor: safeColor + '20', width: cardWidth }]} onPress={onPress} activeOpacity={0.85}>
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


const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

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
    <View style={{ gap: 12 }}>
      {data.map((row) => {
        const approved = row.state === 'Aprobado';
        const [day, month] = (row.date || '').split('/');
        const monthLabel = MONTHS_SHORT[parseInt(month, 10) - 1] || '';
        const initials = row.creator === 'Desconocido'
          ? '?'
          : row.creator.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        return (
          <View key={row.id} style={[styles.eventCard, approved ? styles.eventCardApproved : styles.eventCardPending]}>
            <View style={[styles.eventDateBlock, approved ? styles.eventDateBlockApproved : styles.eventDateBlockPending]}>
              <Text style={styles.eventDateDay}>{day || '–'}</Text>
              <Text style={styles.eventDateMonth}>{monthLabel}</Text>
            </View>

            <View style={styles.eventCardBody}>
              <View style={styles.eventCardTop}>
                <View style={[styles.stateBadge, { backgroundColor: approved ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Text style={[styles.stateBadgeText, { color: approved ? COLORS.success : COLORS.warning }]}>
                    {approved ? 'Aprobado' : 'Pendiente'}
                  </Text>
                </View>
                <Text style={styles.eventCardId}>#{row.id}</Text>
              </View>

              <Text style={styles.eventCardTitle} numberOfLines={2}>{row.title}</Text>

              <View style={styles.eventCardMeta}>
                <View style={styles.eventCardMetaItem}>
                  <Ionicons name="time-outline" size={13} color={COLORS.textTertiary} />
                  <Text style={styles.eventCardMetaText}>{row.time}</Text>
                </View>
                <View style={styles.eventCardMetaDivider} />
                <View style={[styles.eventCardMetaItem, { flex: 1 }]}>
                  <View style={[styles.creatorAvatar, { backgroundColor: approved ? COLORS.success + '1F' : COLORS.warning + '2E' }]}>
                    <Text style={[styles.creatorAvatarText, { color: approved ? COLORS.success : COLORS.warning }]}>{initials}</Text>
                  </View>
                  <Text style={[styles.eventCardMetaText, { flexShrink: 1 }]} numberOfLines={1}>{row.creator}</Text>
                </View>
              </View>

              {approved && (
                <TouchableOpacity style={styles.printBtn} onPress={() => onPrint(row.id)}>
                  <Ionicons name="print-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.printBtnText}>Imprimir evento</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const WEEK_DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const pad2 = (n) => String(n).padStart(2, '0');
const toDayKey = (date) => `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;

const Fase2Calendar = ({ viewMonth, setViewMonth, daysMap, selectedDay, onSelectDay }) => {
  const todayKey = toDayKey(new Date());
  const y = viewMonth.y;
  const m = viewMonth.m;
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells = [
    ...Array.from({ length: startOffset }, (_, i) => ({ key: 'b' + i })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const key = `${pad2(day)}/${pad2(m + 1)}/${y}`;
      const info = daysMap[day] || { pendientes: 0, aprobados: 0 };
      return { key, day, pendientes: info.pendientes, aprobados: info.aprobados, isToday: key === todayKey };
    }),
  ];

  const go = (delta) => {
    const d = new Date(y, m + delta, 1);
    setViewMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  const monthName = new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.calCard}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => go(-1)} style={styles.calNav} accessibilityRole="button" accessibilityLabel="Mes anterior">
          <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.calTitle}>{monthName}</Text>
        <TouchableOpacity onPress={() => go(1)} style={styles.calNav} accessibilityRole="button" accessibilityLabel="Mes siguiente">
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.calWeekRow}>
        {WEEK_DAY_LABELS.map((w, i) => (
          <Text key={i} style={styles.calWeekLabel}>{w}</Text>
        ))}
      </View>

      <View style={styles.calGrid}>
        {cells.map((c) => (
          c.day ? (
            <TouchableOpacity
              key={c.key}
              style={styles.calCell}
              onPress={() => onSelectDay(selectedDay === c.key ? null : c.key)}
              accessibilityRole="button"
              accessibilityLabel={`Día ${c.day}`}
            >
              <View style={[
                styles.calNumCircle,
                c.isToday && styles.calNumCircleToday,
                selectedDay === c.key && styles.calNumCircleSelected,
                (!c.isToday && selectedDay !== c.key && c.aprobados > 0) && styles.calNumCircleApproved,
              ]}>
                <Text style={[
                  styles.calCellNum,
                  (c.isToday || selectedDay === c.key) && styles.calCellNumActive,
                  (!c.isToday && selectedDay !== c.key && c.aprobados > 0) && styles.calCellNumApproved,
                  (!c.isToday && selectedDay !== c.key && c.aprobados === 0 && c.pendientes > 0) && styles.calCellNumPending,
                ]}>{c.day}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View key={c.key} style={styles.calCell} />
          )
        ))}
      </View>

      <View style={styles.calLegend}>
        <View style={styles.calLegendItem}>
          <View style={styles.legendRingSample} />
          <Text style={styles.calLegendText}>Aprobado</Text>
        </View>
        <View style={styles.calLegendItem}>
          <Text style={[styles.calLegendText, { color: COLORS.warning, fontWeight: '800' }]}>17</Text>
          <Text style={styles.calLegendText}>Pendiente</Text>
        </View>
      </View>
    </View>
  );
};

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
    { id: 'solicitudes', title: 'Solicitudes', icon: 'document-text-outline', color: COLORS.primary, action: '/admin/Solicitudes' },
    { id: 'usuarios', title: 'Usuarios', icon: 'people-outline', color: COLORS.warning, action: '/admin/UsuariosDaf' },
    { id: 'aprobados', title: 'Aprobados', icon: 'checkmark-circle-outline', color: COLORS.success, action: '/admin/EventosAprobados' },
    { id: 'reportes', title: 'Reportes', icon: 'bar-chart-outline', color: COLORS.info, action: '/admin/reportes' },
  ];

  return (
    <Animated.View style={[styles.dock, { height: dockHeight }]}>
      {isExpanded ? (
        <View style={styles.dockExpanded}>
          <View style={styles.dockActions}>
            {quickActions.map(a => (
              <TouchableOpacity key={a.id} style={styles.dockActionBtn} onPress={() => onActionPress(a.action)}>
                <Ionicons name={a.icon} size={24} color={a.color} />
                <Text numberOfLines={1} style={[styles.dockActionText, { color: a.color }]}>{a.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.minimalDockLogoutButton}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            <Text style={styles.minimalDockLogoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Pressable onPress={onToggleExpanded} style={styles.dockToggle}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-up-outline" size={20} color={COLORS.white} />
        </Animated.View>
        <Text style={styles.dockToggleText}>{isExpanded ? 'Ocultar menú' : 'Menú rápido'}</Text>
      </Pressable>
    </Animated.View>
  );
};

const MinimalHeader = ({ nombreUsuario, emailUsuario, unreadCount, onNotificationPress, lastUpdated, onRefresh, refreshing, onTelegramPress, isTelegramLinked, dafCounts }) => {
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
          {emailUsuario ? <Text style={styles.heroEmail} numberOfLines={1}>{emailUsuario}</Text> : null}
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
      <Text style={styles.headerTitle}>Panel DAF</Text>
      <Text style={styles.headerSubtitle}>Dirección Administrativa y Financiera · UFT Eventos</Text>
      <View style={styles.heroStatsRow}>
        <View style={styles.heroStat}>
          <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name="people-outline" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroStatValue}>{dafCounts.total}</Text>
            <Text style={styles.heroStatLabel}>Cuentas DAF</Text>
          </View>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStat}>
          <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(16,185,129,0.35)' }]}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroStatValue}>{dafCounts.activos}</Text>
            <Text style={styles.heroStatLabel}>Activas</Text>
          </View>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStat}>
          <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(239,68,68,0.4)' }]}>
            <Ionicons name="close-circle-outline" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroStatValue}>{dafCounts.inactivos}</Text>
            <Text style={styles.heroStatLabel}>Inactivas</Text>
          </View>
        </View>
      </View>
      {lastUpdated ? (
        <Text style={styles.lastUpdatedText}>
          Actualizado: {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      ) : null}
    </View>
  );
};

const Daf = () => {
  const params = useLocalSearchParams();
  const nombreUsuario = params.nombre || 'Administrador DAF';
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { cardWidth: actionsCardWidth } = useMemo(() => {
    const availableWidth = windowWidth - 40;
    let numColumns = Math.floor(availableWidth / (MIN_CARD_WIDTH_ACTIONS + CARD_MARGIN));
    numColumns = Math.max(1, Math.min(numColumns, MAX_COLUMNS_ACTIONS));
    const totalGaps = CARD_MARGIN * (numColumns - 1);
    return { cardWidth: (availableWidth - totalGaps) / numColumns };
  }, [windowWidth]);
  const {
    colors,
    colorScheme,
    setTheme: setGlobalTheme,
    setAccentColor: setGlobalAccentColor,
  } = useTheme();
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
  const [themeColor, setThemeColor] = useState(colors?.primary || COLORS.primary);

  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
 const [userInfo, setUserInfo] = useState({
    nombre: 'Cargando...',
    email: ''
  });
  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Usuarios Activos',      value: '–', icon: 'people-outline',        color: themeColor,  description: 'Cuentas habilitadas' },
    { title: 'Eventos Totales',       value: '–', icon: 'calendar-outline',      color: themeColor,     description: 'Todos los eventos' },
    { title: 'Contenidos Pendientes', value: '–', icon: 'document-text-outline', color: themeColor,  description: 'Esperando revisión' },
    { title: 'Estabilidad Sistema',   value: '–', icon: 'pulse-outline',         color: themeColor,  description: 'Rendimiento del sistema' },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const [dafCounts, setDafCounts] = useState({ total: 0, activos: 0, inactivos: 0 });

  const [selectedDay, setSelectedDay] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const daysMap = useMemo(() => {
    const map = {};
    allEvents.forEach(e => {
      const parts = (e.date || '').split('/');
      if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (y === viewMonth.y && m === viewMonth.m && d >= 1) {
          if (!map[d]) map[d] = { pendientes: 0, aprobados: 0 };
          if (e.state === 'Aprobado') map[d].aprobados += 1;
          else map[d].pendientes += 1;
        }
      }
    });
    return map;
  }, [allEvents, viewMonth.y, viewMonth.m]);

  const displayedEvents = selectedDay
    ? allEvents.filter(e => e.date === selectedDay)
    : allEvents;

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

  const loadThemeColor = useCallback(async () => {
  try {
    const savedColor = await AsyncStorage.getItem('themeColor');
    if (savedColor) {
      setThemeColor(savedColor);
    }
  } catch (error) {
    console.error('Error loading theme:', error);
  }
}, []);
const saveThemeColor = useCallback(async (color) => {
  try {
    await AsyncStorage.setItem('themeColor', color);
    setThemeColor(color);
  } catch (error) {
    console.error('Error saving theme:', error);
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

      const [dashRes, eventsRes, notifsRes, daFUsersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }),
        axios.get(`${API_BASE_URL}/eventos`,          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }),
        axios.get(`${API_BASE_URL}/notificaciones`,   { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/users/daf`,        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }).catch(() => ({ data: [] })),
      ]);

      const dafUsersRaw = Array.isArray(daFUsersRes.data) ? daFUsersRes.data : (daFUsersRes.data?.data || []);
      const dafActivos = dafUsersRaw.filter(u => !(u.habilitado === 0 || u.habilitado === false || u.habilitado === '0' || u.habilitado === 'false')).length;
      setDafCounts({
        total: dafUsersRaw.length,
        activos: dafActivos,
        inactivos: Math.max(0, dafUsersRaw.length - dafActivos),
      });

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
        { title: 'Nuevos Usuarios',       value: (data.usuariosNuevosEsteMes || 0).toString(),        icon: 'person-add-outline',    color: COLORS.info,   description: 'Este mes', subtitle: 'Este mes' },
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
    loadThemeColor();
  }, [fetchData, checkTelegramStatus, cargarInfoUsuario, loadThemeColor]);

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
    setIsBannerExpanded(false);
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
    { id: 'solicitudes', title: 'Solicitudes', icon: 'document-text-outline', route: '/admin/Solicitudes', color: COLORS.primary, description: 'Aprueba o rechaza eventos en fase 2', badge: 'Nuevo' },
    { id: 'usuarios', title: 'Gestión de Usuarios', icon: 'people-outline', route: '/admin/UsuariosDaf', color: COLORS.warning, description: 'Administración de cuentas de usuario' },
    { id: 'reportes', title: 'Reportes Avanzados', icon: 'bar-chart-outline', route: '/admin/reportes', color: COLORS.secondary, description: 'Generación de reportes detallados' },
    { id: 'recursos', title: 'Inventario', icon: 'construct-outline', route: '/admin/Inventario', color: COLORS.info, description: 'Gestión de recursos del sistema' },
    { id: 'layouts', title: 'Subida de Layouts', icon: 'images-outline', route: '/admin/Layouts', color: COLORS.accent, description: 'Administración de plantillas' },
  ];

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
          dafCounts={dafCounts}
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
                <Text style={styles.tableInfoText}>
                  {displayedEvents.length} próximo{displayedEvents.length !== 1 ? 's' : ''}
                </Text>
                <View style={styles.metricPills}>
                  <View style={[styles.metricPill, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="hourglass-outline" size={13} color={COLORS.warning} />
                    <Text style={[styles.metricPillValue, { color: COLORS.warning }]}>
                      {displayedEvents.filter(e => e.state !== 'Aprobado').length}
                    </Text>
                    <Text style={[styles.metricPillLabel, { color: COLORS.warning }]}>Pend.</Text>
                  </View>
                  <View style={[styles.metricPill, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="checkmark-circle-outline" size={13} color={COLORS.success} />
                    <Text style={[styles.metricPillValue, { color: COLORS.success }]}>
                      {displayedEvents.filter(e => e.state === 'Aprobado').length}
                    </Text>
                    <Text style={[styles.metricPillLabel, { color: COLORS.success }]}>Aprob.</Text>
                  </View>
                </View>
              </View>

              {allEvents.length > 0 && (
                <Fase2Calendar
                  viewMonth={viewMonth}
                  setViewMonth={setViewMonth}
                  daysMap={daysMap}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
              )}

              {selectedDay && (
                <TouchableOpacity style={styles.selectedDayRow} onPress={() => setSelectedDay(null)} activeOpacity={0.7}>
                  <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.selectedDayRowText} numberOfLines={1}>
                    Eventos del {selectedDay}
                  </Text>
                  <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )}

              {!loadingEvents && displayedEvents.length === 0 ? (
                <View style={styles.emptyTable}>
                  <Ionicons name="calendar-outline" size={32} color={COLORS.textTertiary} />
                  <Text style={styles.emptyTableText}>No hay eventos para esta selección</Text>
                  <TouchableOpacity style={styles.clearSelBtn} onPress={() => setSelectedDay(null)}>
                    <Text style={styles.clearSelBtnText}>Ver todos</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <EventCards data={displayedEvents} onPrint={handlePrintEvent} />
              )}
            </>
          )}
        </Section>

        <Section title="Herramientas de Gestión" subtitle="Acceda a las funcionalidades principales">
          <View style={styles.toolsGrid}>
            {adminActions.map((action) => (
              <ManagementToolCard
                key={action.id}
                title={action.title}
                description={action.description}
                icon={action.icon}
                color={action.color}
                badge={action.badge}
                onPress={() => handleActionPress(action.route)}
                cardWidth={actionsCardWidth}
              />
            ))}
          </View>
        </Section>
      </ScrollView>

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
    accessibilityViewIsModal={true}
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
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&qzone=2&data=${encodeURIComponent(`https://t.me/${BOT_USERNAME}`)}` }}
                    style={{ width: 160, height: 160 }}
                    resizeMode="contain"
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

      {isBannerExpanded && (
        <Pressable
          style={styles.dockOverlay}
          onPress={() => setIsBannerExpanded(false)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú"
        />
      )}
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
// NOTE: This is a module-level constant, so it CANNOT reference component state
// like `themeColor`. All dynamic accent-color usage below uses COLORS.primary
// as a safe static fallback instead of the undefined `themeColor` variable.
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
  heroEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontStyle: 'italic' },
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
  heroStatsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 8,
  },
  heroStat: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 6 },
  heroStatIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroStatValue: { fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 18 },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  lastUpdatedText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: COLORS.white, borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  notifBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },

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
  sectionHeader: { marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  sectionAccent: { width: 4, height: 24, backgroundColor: COLORS.primary, borderRadius: 2, marginRight: 10 },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  sectionSub: { fontSize: 13, color: COLORS.textSecondary },

  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_MARGIN, justifyContent: 'space-between' },
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

  // Event Cards
  eventCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 12,
    flexDirection: 'row', gap: 12,
    borderWidth: 1, marginBottom: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  eventCardApproved: { borderColor: '#A7F3D0' },
  eventCardPending: { borderColor: '#FDE68A' },
  eventDateBlock: {
    width: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, alignSelf: 'flex-start',
  },
  eventDateBlockApproved: { backgroundColor: COLORS.primary },
  eventDateBlockPending: { backgroundColor: '#9A3300' },
  eventDateDay: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 26 },
  eventDateMonth: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  eventCardBody: { flex: 1 },
  eventCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  eventCardTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: 8, lineHeight: 20,
  },
  eventCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 },
  eventCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventCardMetaDivider: { width: 1, height: 12, backgroundColor: COLORS.border },
  eventCardMetaText: { fontSize: 12, color: COLORS.textSecondary },
  eventCardId: { fontSize: 11, color: COLORS.textTertiary, fontWeight: '600' },
  creatorAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  creatorAvatarText: { fontSize: 10, fontWeight: '800' },
  printBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: COLORS.primaryLight, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, gap: 5,
  },
  printBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  // Table info bar
  tableInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  tableInfoText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  metricPills: { flexDirection: 'row', gap: 8 },
  metricPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  metricPillValue: { fontSize: 13, fontWeight: '800' },
  metricPillLabel: { fontSize: 11, fontWeight: '600' },

  hiddenPastBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A',
  },
  hiddenPastText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },

  stateBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  stateBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyTable: { alignItems: 'center', paddingVertical: 40 },
  emptyTableText: { marginTop: 10, fontSize: 14, color: COLORS.textTertiary },
  emptyTableSubText: { marginTop: 4, fontSize: 12, color: COLORS.textTertiary, fontStyle: 'italic' },
  clearSelBtn: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 8 },
  clearSelBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Calendario Fase 2
  calCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  calNav: { width: 26, height: 26, borderRadius: 7, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  calTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  calWeekRow: { flexDirection: 'row', marginBottom: 3 },
  calWeekLabel: { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '700', color: COLORS.textTertiary },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', alignItems: 'center', paddingVertical: 2 },
  calNumCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  calNumCircleToday: { backgroundColor: COLORS.primary },
  calNumCircleSelected: { backgroundColor: COLORS.textPrimary },
  calNumCircleApproved: { backgroundColor: COLORS.primaryLight, borderWidth: 1.5, borderColor: COLORS.primary },
  calCellNum: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary },
  calCellNumActive: { color: '#fff', fontWeight: '800' },
  calCellNumApproved: { color: COLORS.primary, fontWeight: '800' },
  calCellNumPending: { color: COLORS.warning, fontWeight: '700' },
  calLegend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calLegendText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  legendRingSample: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  selectedDayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  selectedDayRowText: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // Action cards
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_MARGIN, justifyContent: 'space-between' },
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

  minimalDockLogoutButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 4,
  },
  minimalDockLogoutButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginLeft: 8 },

  dockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)', zIndex: 5,
  },
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8,
    elevation: 10, overflow: 'hidden',
  },
  dockToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)',
  },
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