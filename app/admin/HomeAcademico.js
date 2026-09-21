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
import ChatFlotante from '../../components/ChatFlotante';
import { PHASES as PROCESO_FASES, resolveCurrentPhase } from '../../components/admin/EventProcessTimeline';

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
  primary: '#E95A0C', primaryLight: '#FDF2EC', secondary: '#0F172A',
  accent: '#EF4444', success: '#047857', warning: '#F59E0B', warningLight: '#FEF3C7',
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

const formatHora = (horaStr) => {
  if (!horaStr) return '';
  const m = String(horaStr).match(/(\d{1,2}):(\d{2})/);
  return m ? `${String(m[1]).padStart(2, '0')}:${m[2]}` : '';
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

const BADGE_CONFIG = {
  pendiente: { label: 'Pendiente de revisión', color: COLORS.warning },
  proyectado: { label: 'Pendiente de revisión', color: COLORS.warning },
  aprobado: { label: 'Aprobado', color: COLORS.success },
  programado: { label: 'Programado', color: COLORS.info },
  ejecucion: { label: 'En ejecución', color: COLORS.warning },
  encurso: { label: 'En ejecución', color: COLORS.warning },
  completado: { label: 'Completado', color: COLORS.info },
  finalizado: { label: 'Completado', color: COLORS.info },
  rechazado: { label: 'Rechazado', color: COLORS.accent },
  cancelado: { label: 'Cancelado', color: COLORS.info },
  vencido: { label: 'Vencido', color: COLORS.secondary },
};

const diasAntesEvento = (fechaStr) => {
  if (!fechaStr) return null;
  const s = String(fechaStr).slice(0, 10);
  const fecha = dayjs(s, 'YYYY-MM-DD');
  return fecha.isValid() ? fecha.startOf('day').diff(dayjs().startOf('day'), 'day') : null;
};

const ProgresoEventoCard = ({ evento, router }) => {
  const breathe = useRef(new Animated.Value(0)).current;

  const estRaw = String((evento && evento.estado) || 'pendiente').toLowerCase();
  const dias = diasAntesEvento(evento && evento.fechaevento);
  const esHoy = dias === 0;
  const fechaPasada = dias !== null && dias < 0;
  const estKey = estRaw === 'vencido' && !fechaPasada ? 'pendiente' : estRaw;
  const resuelto = evento ? resolveCurrentPhase(estKey, evento.idfase, evento.fases) : null;
  const faseActual = resuelto ? resuelto.phase : 1;
  const terminal = resuelto ? resuelto.terminal || null : null;

  useEffect(() => {
    if (!evento || terminal || faseActual >= PROCESO_FASES.length) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, evento, terminal, faseActual]);

  if (!evento) return null;
  const badge = BADGE_CONFIG[estKey] || { label: estKey, color: COLORS.textSecondary };
  const faseInfo = PROCESO_FASES.find((f) => f.number === faseActual) || PROCESO_FASES[0];
  const escala = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const pct = Math.min(100, Math.max(0, Math.round((faseActual / PROCESO_FASES.length) * 100)));

  const chipWarn = dias !== null && dias <= 7;
  const chipText = dias === null ? '–' : dias > 0 ? `${dias} día${dias === 1 ? '' : 's'}` : dias === 0 ? 'Hoy' : 'Finalizado';
  const chipIcon = esHoy ? 'play' : 'time-outline';

  const irA = (ruta) => router.push(ruta);

  let ctaTipo = 'detalle';
  let ctaLabel = 'Ver detalles';
  let ctaIcon = 'eye-outline';
  let ctaSub = 'Consulta la información completa del evento.';
  let ctaOnPress = () => irA(`/admin/EventDetailScreen?eventId=${evento.idevento}`);

  let finFecha = dayjs(evento.fechaevento);
  if (finFecha.isValid() && evento.horaevento) {
    const hm = String(evento.horaevento).match(/(\d{1,2}):(\d{1,2})/);
    if (hm) finFecha = finFecha.hour(Number(hm[1])).minute(Number(hm[2]));
  }
  const eventoTerminado = finFecha.isValid() && finFecha.isBefore(dayjs());

  if (estKey === 'completado' || estKey === 'finalizado') {
    ctaLabel = 'Ver informe del evento';
    ctaIcon = 'document-text-outline';
    ctaSub = 'Proceso finalizado.';
    ctaOnPress = () => irA(`/admin/InformeEventoScreen?eventId=${evento.idevento}`);
  } else if (!terminal && faseActual >= 3 && eventoTerminado) {
    ctaTipo = 'hoy';
    ctaLabel = 'Abrir informe del evento';
    ctaIcon = 'rocket-outline';
    ctaSub = 'El evento terminó. Registra asistencia, fotos y resultados. El informe cierra el proceso.';
    ctaOnPress = () => irA(`/admin/InformeEventoScreen?eventId=${evento.idevento}`);
  } else if (estKey === 'aprobado' && faseActual === 2) {
    ctaLabel = 'Siguiente paso: Programar evento';
    ctaIcon = 'calendar-outline';
    ctaSub = 'El comité aprobó tu evento. Elige fecha y recursos disponibles.';
    ctaOnPress = () => irA('/admin/SeleccionarProgramacionEvento');
  } else if (estKey === 'aprobado') {
    ctaSub = 'Fecha y recursos asignados. El informe se habilitará cuando termine el evento.';
  } else if (estKey === 'pendiente' || estKey === 'proyectado') {
    ctaTipo = 'deshabilitado';
    ctaLabel = 'Enviado a revisión';
    ctaIcon = 'time-outline';
    ctaSub = 'Tu evento está siendo revisado por el comité. Te avisaremos aquí.';
  }

  return (
    <View style={styles.progCard}>
      <View style={styles.progHead}>
        <Text style={styles.progLabel}>Próximo evento</Text>
        <View style={[styles.progBadge, { backgroundColor: badge.color + '18' }]}>
          <View style={[styles.progBadgeDot, { backgroundColor: badge.color }]} />
          <Text style={[styles.progBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={styles.progTitle} numberOfLines={2}>{evento.nombreevento || 'Sin nombre'}</Text>

      <View style={styles.progMetaRow}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.textTertiary} />
<Text style={styles.progMetaText}>{formatDate(evento.fechaevento)}{formatHora(evento.horaevento) ? ` · ${formatHora(evento.horaevento)}` : ''}</Text>
      </View>
      {evento.lugarevento ? (
        <View style={styles.progMetaRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.progMetaText} numberOfLines={1}>{evento.lugarevento}</Text>
        </View>
      ) : null}

      <Text style={styles.progStageLabel}>
        Proceso del evento · {terminal ? (BADGE_CONFIG[terminal]?.label || terminal) : (faseInfo ? faseInfo.label : `Fase ${faseActual}`)}
      </Text>

      <View style={styles.progTrack}>
        {PROCESO_FASES.map((fase, idx) => {
          const completado = fase.number <= faseActual;
          const actual = fase.number === faseActual && !terminal;
          return (
            <View key={fase.number} style={styles.progStep}>
              <View style={styles.progStepRow}>
                <View style={[styles.progLine, idx === 0 ? styles.progLineHidden : ((fase.number - 1) <= faseActual ? styles.progLineActive : null)]} />
                {actual ? (
                  <Animated.View style={[styles.progDot, styles.progDotCurrent, { transform: [{ scale: escala }] }]}>
                    <Ionicons name={fase.icon} size={13} color={COLORS.primary} />
                  </Animated.View>
                ) : (
                  <View style={[styles.progDot, completado ? { backgroundColor: fase.color, borderColor: fase.color } : null]}>
                    <Ionicons name={completado ? fase.icon : 'ellipse-outline'} size={13} color={completado ? COLORS.white : COLORS.textTertiary} />
                  </View>
                )}
                <View style={[styles.progLine, idx === PROCESO_FASES.length - 1 ? styles.progLineHidden : (completado ? styles.progLineActive : null)]} />
              </View>
              <Text style={[styles.progStepLabel, completado ? { color: fase.color, fontWeight: '700' } : null]} numberOfLines={2}>{fase.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.progBottomRow}>
        <Text style={styles.progPasoText}>
          Paso <Text style={styles.progPasoBold}>{terminal ? '—' : faseActual}</Text> de {PROCESO_FASES.length}
        </Text>
        <View style={styles.progBar}>
          <View style={[styles.progBarFill, terminal ? { width: '100%', backgroundColor: badge.color } : { width: `${pct}%` }]} />
        </View>
        <View style={[styles.progChip, chipWarn ? styles.progChipWarn : null]}>
          <Ionicons name={chipIcon} size={13} color={chipWarn ? COLORS.warning : COLORS.primary} />
          <Text style={[styles.progChipText, { color: chipWarn ? COLORS.warning : COLORS.primary }]}>{chipText}</Text>
        </View>
      </View>

      <View style={styles.progCtaWrap}>
        {terminal ? (
          <TouchableOpacity style={[styles.progCta, styles.progCtaGhost]} onPress={ctaOnPress} activeOpacity={0.85}>
            <Ionicons name="eye-outline" size={18} color={COLORS.textSecondary} />
            <Text style={[styles.progCtaText, { color: COLORS.textSecondary }]}>Ver detalles</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : ctaTipo === 'deshabilitado' ? (
          <View style={[styles.progCta, styles.progCtaDisabled]}>
            <Ionicons name={ctaIcon} size={18} color={COLORS.textTertiary} />
            <Text style={[styles.progCtaText, { color: COLORS.textTertiary }]}>{ctaLabel}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.progCta, styles.progCtaActive, ctaTipo === 'hoy' ? styles.progCtaHoy : null]}
            onPress={ctaOnPress}
            activeOpacity={0.88}
          >
            <Ionicons name={ctaIcon} size={18} color={COLORS.white} />
            <Text style={styles.progCtaTextActive}>{ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        )}
        {ctaSub ? <Text style={styles.progCtaSub}>{ctaSub}</Text> : null}
      </View>
    </View>
  );
};

const ProyectarEventoCTA = ({ onPress }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.proyectarBtnCard, pressed && styles.proyectarBtnPressed]}>
    <View style={[styles.proyectarGradient, { backgroundColor: 'rgba(233, 90, 12, 0.12)' }]}>
      <View style={styles.proyectarIconWrap}>
        <Ionicons name="add" size={30} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.proyectarTitle}>Proyectar Evento</Text>
        <Text style={styles.proyectarSubtitle}>Crea y gestiona un nuevo evento</Text>
      </View>
      <View style={styles.proyectarArrow}>
        <Ionicons name="arrow-forward" size={22} color={COLORS.primary} />
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
        <Ionicons name={t.icon} size={18} color={active === t.id ? COLORS.primary : COLORS.textSecondary} />
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
      Animated.timing(dockHeight, { toValue: isExpanded ? 240 : 60, duration: 300, useNativeDriver: false }),
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
                <Text numberOfLines={1} style={[styles.dockActionText, { color: a.color }]}>{a.title}</Text>
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
        <Text style={styles.dockToggleText}>{isExpanded ? 'Ocultar menú' : 'Menú rápido'}</Text>
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
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [salaActiva, setSalaActiva] = useState(null);
  const [chatUserId, setChatUserId] = useState(null);
  const [chatAbrir, setChatAbrir] = useState(null);
  const [noLeidos, setNoLeidos] = useState({});
  const totalNoLeidos = Object.values(noLeidos).reduce((acc, n) => acc + (n || 0), 0);

  const vistosChatRef = useRef(new Set());
  const salaActivaRef = useRef(null);
  const chatUserIdRef = useRef(null);
  useEffect(() => { salaActivaRef.current = salaActiva; }, [salaActiva]);
  useEffect(() => { chatUserIdRef.current = chatUserId; }, [chatUserId]);

  const recargarNotificaciones = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) return;
      const res = await axios.get(`${API_BASE_URL}/notificaciones`, { headers: { Authorization: `Bearer ${token}` } });
      if (!Array.isArray(res.data)) return;
      setNotifications(res.data);

      const pendChat = res.data.filter(n => String(n.tipo) === 'chat_privado' && !n.read && n.id_relacionado);
      const yo = String(chatUserIdRef.current || '');
      const sala = salaActivaRef.current;
      const nuevas = pendChat.filter(n => {
        const room = 'private_' + [yo, String(n.id_relacionado)].map(Number).sort((a, b) => a - b).join('_');
        if (sala && String(sala) === room) return false;
        return !vistosChatRef.current.has(String(n.id));
      });
      pendChat.forEach(n => vistosChatRef.current.add(String(n.id)));
      if (nuevas.length > 0) {
        const ultima = nuevas[0];
        setToast({ type: 'chat', titulo: ultima.titulo || 'Nuevo mensaje privado', message: ultima.mensaje, chatId: ultima.id_relacionado });
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => recargarNotificaciones(), 2500);
    const id = setInterval(() => recargarNotificaciones(), 20000);
    const onFocus = () => recargarNotificaciones();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    };
  }, [recargarNotificaciones]);

  const marcarnoLeido = (n) => {
    if (!n || !n.roomId) return;
    const k = String(n.roomId);
    setNoLeidos(prev => ({ ...prev, [k]: (prev[k] || 0) + 1 }));
  };
  const limpiarNoLeidos = (roomId) => {
    if (!roomId) return;
    const k = String(roomId);
    setNoLeidos(prev => {
      if (!(k in prev)) return prev;
      const clon = { ...prev };
      delete clon[k];
      return clon;
    });
  };

  const pedirPermisoNotifs = () => {
    if (Platform.OS === 'web' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };
  const abrirChat = () => {
    pedirPermisoNotifs();
    setIsChatOpen(true);
  };

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
          const estadoSrc = d.estadoCounts && typeof d.estadoCounts === 'object' ? d.estadoCounts : d;
          Object.keys(counts).forEach((k) => {
            if (typeof estadoSrc[k] === 'number') counts[k] = estadoSrc[k];
            else if (typeof d[k] === 'number') counts[k] = d[k];
          });
        }
      }

      if (histRes.status === 'fulfilled' && histRes.value && histRes.value.data) {
        const payload = histRes.value.data;
        const raw = Array.isArray(payload) ? payload : (payload.historical || payload.data || []);
        const arr = safeArray(raw);
        if (arr.length > 0) {
          setTendenciaMensual({
            labels: arr.map((d) => String(d.name || d.mes || '').slice(0, 3)),
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
      await axios.patch(`${API_BASE_URL}/notificaciones/${notifId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      vistosChatRef.current.add(String(notifId));
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
    { id: '4', title: 'Programación', icon: 'calendar-outline', route: '/admin/SeleccionarProgramacionEvento', color: COLORS.info, description: 'Elige evento aprobado para programar', tab: 'gestion' },
    { id: '5', title: 'Vencidos', icon: 'alert-circle-outline', route: '/admin/EventosVencidos', color: COLORS.secondary, description: 'Eventos vencidos', tab: 'gestion' },
    { id: '6', title: 'Completados', icon: 'trophy-outline', route: '/admin/EventosCompletados', color: COLORS.info, description: 'Fase 3 finalizada', tab: 'gestion' },
    { id: '7', title: 'Comité', icon: 'people-outline', route: '/admin/EventosAprobados', color: COLORS.secondary, description: 'Eventos donde eres comité', tab: 'comite' },
    { id: '8', title: 'Reportes Avanzados', icon: 'document-text-outline', route: '/admin/reportes', color: COLORS.secondary, description: 'Generación de reportes detallados', tab: 'comite', badge: 'Nuevo' },
  ];
  const gestionTools = adminActions.filter((t) => t.tab === 'gestion');
  const comiteTools = adminActions.filter((t) => t.tab === 'comite');
  const chartWidth = windowWidth - 60;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isDockExpanded ? 300 : 100 }}>
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
            <ProgresoEventoCard evento={proximoEvento} router={router} />
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

            <Section title="Resumen de Actividad" subtitle="Tus métricas clave">
              <View style={styles.statsGrid}>
                {dashboardStats.map((stat, i) => (
                  <DashboardCard key={i} {...stat} />
                ))}
              </View>
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
                      if (String(notif.tipo) === 'chat_privado' && notif.id_relacionado && chatUserId) {
                        const nombre = String(notif.titulo || '').replace(/\s+te envió un mensaje$/i, '').trim() || `Usuario ${notif.id_relacionado}`;
                        abrirChat();
                        setChatAbrir({ idusuario: String(notif.id_relacionado), nombre });
                      }
                    }}
                  >
                    <View style={[styles.notifDot, { backgroundColor: notif.read ? COLORS.border : COLORS.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifSender, { fontWeight: notif.read ? '400' : '600' }]} numberOfLines={1}>
                        {notif.titulo || (String(notif.tipo) === 'chat_privado' ? 'Nuevo mensaje privado' : 'Notificación')}
                      </Text>
                      <Text style={[styles.notifMsg, { fontWeight: notif.read ? '400' : '600' }]} numberOfLines={2}>{notif.mensaje}</Text>
                      <Text style={styles.notifTime}>{new Date(notif.created_at || notif.createdAt || Date.now()).toLocaleString()}</Text>
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
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (toast.chatId) {
              const origen = { ...toast };
              setToast(null);
              abrirChat();
              setChatAbrir({
                idusuario: String(origen.chatId),
                nombre: String(origen.titulo || '').replace(/\s+te envió un mensaje$/i, '').trim() || `Usuario ${origen.chatId}`,
              });
            } else {
              setToast(null);
            }
          }}
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : toast.type === 'chat' ? styles.toastInfo : toast.type === 'info' ? styles.toastInfo : styles.toastError,
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : (toast.type === 'chat' || toast.type === 'info') ? 'information-circle' : 'alert-circle'}
            size={20}
            color="#fff"
          />
          <View style={styles.toastContent}>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            {toast.message ? <Text style={styles.toastMessage}>{toast.message}</Text> : null}
          </View>
        </TouchableOpacity>
      ) : null}

      {!isDockExpanded && (
        <>
          <TouchableOpacity style={styles.fabAI} onPress={() => setIsAIChatOpen(true)} activeOpacity={0.85}>
            <Ionicons name="hardware-chip-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={abrirChat} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.white} />
            {totalNoLeidos > 0 && (
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>{totalNoLeidos > 99 ? '99+' : totalNoLeidos}</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
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
                userId={String(chatUserId || '')}
                userRole="academico"
                userName={nombreUsuario || chatUserId || ''}
                noLeidos={noLeidos}
                activeRoom={isChatOpen && chatUserId ? salaActiva : null}
                onRoomChange={(r) => { setSalaActiva(r); limpiarNoLeidos(r); }}
                comandoAbrirPrivado={chatAbrir}
                onComandoAplicado={() => setChatAbrir(null)}
              />
            </View>
          </View>
        </View>
      ) : null}

      <ChatAlertas
        userId={String(chatUserId || '')}
        userRole="academico"
        userName={nombreUsuario || chatUserId || ''}
        activeRoom={isChatOpen && chatUserId ? salaActiva : null}
        chatAbierto={isChatOpen && !!chatUserId}
        onAbrir={abrirChat}
        onUnread={marcarnoLeido}
      />

      <ChatFlotante
        eventId={salaActiva && salaActiva !== 'general' ? salaActiva : (proximoEvento?.idevento ? String(proximoEvento.idevento) : null)}
        visible={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        userId={chatUserId ? String(chatUserId) : null}
        userName={nombreUsuario}
        userRole="academico"
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
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  proyectarBtnPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  proyectarGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(233, 90, 12, 0.18)',
  },
  proyectarIconWrap: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(233, 90, 12, 0.18)',
  },
  proyectarTitle: { fontSize: 19, fontWeight: '800', color: COLORS.primary },
  proyectarSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  proyectarArrow: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(233, 90, 12, 0.18)',
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
  mainTabActive: { backgroundColor: 'rgba(233, 90, 12, 0.12)', borderWidth: 1, borderColor: 'rgba(233, 90, 12, 0.18)' },
  mainTabText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  mainTabTextActive: { color: COLORS.primary },
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

  progCard: {
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  progHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progLabel: {
    fontSize: 11, color: COLORS.textTertiary, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  progBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  progBadgeDot: { width: 7, height: 7, borderRadius: 4 },
  progBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  progTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 24, marginBottom: 6 },
  progMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  progMetaText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  progStageLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 12,
  },
  progTrack: { flexDirection: 'row', alignItems: 'flex-start' },
  progStep: { flex: 1, alignItems: 'center' },
  progStepRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginBottom: 7 },
  progLine: { flex: 1, height: 3, backgroundColor: COLORS.border },
  progLineActive: { backgroundColor: COLORS.primary },
  progLineHidden: { backgroundColor: 'transparent' },
  progDot: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  progDotCurrent: {
    backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 3,
  },
  progStepLabel: { fontSize: 9, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 12, paddingHorizontal: 2 },
  progBottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.divider },
  progPasoText: { fontSize: 12, color: COLORS.textTertiary, fontWeight: '600' },
  progPasoBold: { color: COLORS.textPrimary, fontWeight: '800' },
  progBar: { flex: 1, height: 6, borderRadius: 4, backgroundColor: COLORS.background, marginHorizontal: 10, overflow: 'hidden' },
  progBarFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },
  progChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryLight, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  progChipWarn: { backgroundColor: COLORS.warningLight },
  progChipText: { fontSize: 12, fontWeight: '800' },
  progCtaWrap: { marginTop: 14 },
  progCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, minHeight: 50,
  },
  progCtaActive: { backgroundColor: COLORS.primary },
  progCtaHoy: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  progCtaGhost: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  progCtaDisabled: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, opacity: 0.85 },
  progCtaText: { fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  progCtaTextActive: { fontSize: 15, fontWeight: '800', color: COLORS.white, flex: 1, textAlign: 'center' },
  progCtaSub: { marginTop: 8, textAlign: 'center', fontSize: 11.5, color: COLORS.textTertiary, lineHeight: 16 },

  dockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.35)', zIndex: 5 },
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10, overflow: 'hidden',
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
    alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginBottom: 4,
  },
  dockLogoutText: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginLeft: 8 },

  fab: {
    position: 'absolute', bottom: 84, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6,
    zIndex: 15,
  },
  fabAI: {
    position: 'absolute', bottom: 84, left: 20, width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#9B59B6', justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#9B59B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
    zIndex: 15,
  },
  fabBadge: {
    position: 'absolute', top: -6, right: -6,
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, borderWidth: 2, borderColor: COLORS.white,
  },
  fabBadgeText: {
    color: '#fff', fontSize: 11, fontWeight: '800',
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
  notifSender: { fontSize: 13, color: COLORS.primary, marginBottom: 2 },
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