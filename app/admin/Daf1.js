import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Animated, Platform,
  Pressable, useWindowDimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── CONFIGURACIÓN ───
const API_BASE_URL = 'https://unibackend1-production.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FFEDD5', 
  success: '#10B981', successLight: '#D1FAE5',
  warning: '#F59E0B', warningLight: '#FEF3C7',
  danger: '#EF4444',  dangerLight: '#FEE2E2',
  info: '#3B82F6',    infoLight: '#DBEAFE',
  background: '#F9FAFB', surface: '#FFFFFF',
  textPrimary: '#1F2937', textSecondary: '#6B7280', textTertiary: '#9CA3AF',
  border: '#E5E7EB',
};

// ─── COMPONENTES REUTILIZABLES (ESTILO DAF.JS) ───

const DashboardCard = ({ title, value, icon, color, description }) => (
  <View style={[styles.kpiCard, { borderTopColor: color }]}>
    <View style={styles.kpiTopRow}>
      <View style={[styles.kpiIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
    <Text style={styles.kpiTitle}>{title}</Text>
    {description && <Text style={styles.kpiDesc}>{description}</Text>}
  </View>
);

const SolicitudCard = ({ item, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isAprobado = item.estado?.toLowerCase() === 'aprobado';
  
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
    >
      <Animated.View style={[styles.eventCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.eventCardTop}>
          <View style={[styles.stateBadge, { backgroundColor: isAprobado ? COLORS.successLight : COLORS.warningLight }]}>
            <Text style={[styles.stateBadgeText, { color: isAprobado ? COLORS.success : COLORS.warning }]}>
              {item.estado}
            </Text>
          </View>
          <Text style={styles.eventCardId}>ID #{item.id}</Text>
        </View>
        <Text style={styles.eventCardTitle}>{item.nombreEvento}</Text>
        <Text style={styles.solicitanteName}>{item.solicitante}</Text>
        <View style={styles.eventCardMeta}>
          <View style={styles.eventCardMetaItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textTertiary} />
            <Text style={styles.eventCardMetaText}>{item.fechaEvento}</Text>
          </View>
          <View style={styles.eventCardMetaItem}>
            <Ionicons name="cube-outline" size={13} color={COLORS.textTertiary} />
            <Text style={styles.eventCardMetaText}>{item.totalRecursos} rec.</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── PANTALLA PRINCIPAL ───

export default function DafServicios() {
  const params = useLocalSearchParams();
  const nombreUsuario = params.nombre || 'Administrador DAF';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [stats, setStats] = useState({ pendientes: 0, aprobadas: 0, rechazadas: 0, total: 0 });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const res = await axios.get(`${API_BASE_URL}/solicitudes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const [dashRes, eventsRes, notifsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }),
        axios.get(`${API_BASE_URL}/eventos`,          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }),
        axios.get(`${API_BASE_URL}/notificaciones`,   { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }).catch(() => ({ data: [] })),
      ]);
      const dataRes = dashRes.data || {};
      
       setDashboardStats([
        { title: 'Usuarios Activos',      value: (dataRes.activeUsers || 0).toLocaleString(),          icon: 'people-outline',        color: COLORS.primary,  description: 'Cuentas habilitadas' },
        { title: 'Eventos Totales',       value: (dataRes.totalEvents || 0).toString(),                 icon: 'calendar-outline',      color: COLORS.info,     description: 'Todos los eventos' },
        { title: 'Contenidos Pendientes', value: (dataRes.estadoCounts?.pendiente || 0).toString(),     icon: 'document-text-outline', color: COLORS.warning,  description: 'Esperando revisión' },
        { title: 'Estabilidad Sistema',   value: `${dataRes.systemStability || 0}%`,                    icon: 'pulse-outline',         color: COLORS.success,  description: 'Rendimiento del sistema' },
      ]);
      
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped = data.map(e => ({
        id: e.idevento,
        nombreEvento: e.nombreevento || 'Sin título',
        solicitante: e.academicoCreador ? `${e.academicoCreador.nombre} ${e.academicoCreador.apellidopat}` : 'Desconocido',
        fechaEvento: e.fechaevento ? new Date(e.fechaevento).toLocaleDateString('es-ES') : 'N/A',
       estado: (e.estadoDAF || e.estado || 'Pendiente').toLowerCase(),
        totalRecursos: e.recursos?.length || 0,
      }));
      setAllEventos(mapped);
      setSolicitudes(mapped);
      setStats({
        pendientes: mapped.filter(s => s.estado.toLowerCase() === 'pendiente').length,
        aprobadas: mapped.filter(s => s.estado.toLowerCase() === 'aprobado').length,
        rechazadas: mapped.filter(s => s.estado.toLowerCase() === 'rechazado').length,
        total: mapped.length
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        router.replace('/');
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Cabecera Estilo Daf.js */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerGreeting}>Panel de Gestión,</Text>
              <Text style={styles.headerName}>{nombreUsuario}</Text>
            </View>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => fetchData(true)}>
              {refreshing ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="refresh-outline" size={22} color={COLORS.textSecondary} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Servicios DAF</Text>
          {lastUpdated && <Text style={styles.lastUpdated}>Sincronizado: {lastUpdated.toLocaleTimeString()}</Text>}
        </View>

        {/* KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de Solicitudes</Text>
          <View style={styles.kpiGrid}>
            <DashboardCard title="Pendientes" value={stats.pendientes} icon="time-outline" color={COLORS.warning} description="Por revisar" />
            <DashboardCard title="Aprobadas" value={stats.aprobadas} icon="checkmark-circle-outline" color={COLORS.success} description="Listas para entrega" />
            <DashboardCard title="Rechazadas" value={stats.rechazadas} icon="close-circle-outline" color={COLORS.danger} description="Este mes" />
            <DashboardCard title="Total" value={stats.total} icon="list-outline" color={COLORS.info} description="Histórico fase 2" />
          </View>
        </View>

        {/* Lista de Solicitudes Pendientes */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Solicitudes Recientes</Text>
            <TouchableOpacity onPress={() => router.push('/admin/Solicitudes')}>
              <Text style={styles.sectionActionText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : solicitudes.length === 0 ? (
            <Text style={styles.emptyText}>No hay solicitudes pendientes.</Text>
          ) : (
            solicitudes.slice(0, 5).map((item, i) => (
              <SolicitudCard 
                key={item.id} 
                item={item} 
                onPress={() => router.push({ pathname: '/admin/DetalleSolicitud', params: { id: item.id } })}
              />
            ))
          )}
        </View>

        {/* Herramientas Rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Herramientas</Text>
          {[
            { title: 'Inventario de Recursos', icon: 'cube-outline', route: '../admin/Inventario', color: COLORS.info },
            { title: 'Reportes y Métricas', icon: 'bar-chart-outline', route: '../admin/reportes', color: COLORS.secondary },
            { title: 'Reportes y Métricas', icon: 'bar-chart-outline', route: '../admin/Recursos', color: COLORS.secondary },
          ].map((action, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} onPress={() => router.push(action.route)}>
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Dock Inferior (De Daf.js) */}
      <View style={[styles.dock, { height: isMenuExpanded ? 180 : 70 }]}>
         <Pressable style={styles.dockToggle} onPress={() => setIsMenuExpanded(!isMenuExpanded)}>
            <Ionicons name={isMenuExpanded ? "chevron-down" : "chevron-up"} size={20} color="white" />
            <Text style={styles.dockToggleText}>Menú Principal</Text>
         </Pressable>
         {isMenuExpanded && (
           <View style={styles.dockContent}>
              <TouchableOpacity style={styles.dockLogout} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="white" />
                <Text style={styles.dockLogoutText}>Cerrar Sesión</Text>
              </TouchableOpacity>
           </View>
         )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 20, paddingTop: (StatusBar.currentHeight || 40) + 10, paddingBottom: 20,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerGreeting: { fontSize: 14, color: COLORS.textSecondary },
  headerName: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.primary, marginTop: 5 },
  headerIconBtn: { padding: 8, borderRadius: 10, backgroundColor: COLORS.background },
  lastUpdated: { fontSize: 11, color: COLORS.textTertiary, marginTop: 5 },
  
  section: { paddingHorizontal: 20, marginTop: 25 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 15 },
  sectionActionText: { color: COLORS.primary, fontWeight: '600' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    backgroundColor: COLORS.surface, borderRadius: 15, padding: 15, width: '48%',
    borderTopWidth: 3, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
  },
  kpiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiIconWrap: { padding: 8, borderRadius: 10 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  kpiTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  kpiDesc: { fontSize: 11, color: COLORS.textTertiary },

  eventCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 15, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, elevation: 1,
  },
  eventCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  stateBadgeText: { fontSize: 11, fontWeight: '700' },
  eventCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  solicitanteName: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  eventCardMeta: { flexDirection: 'row', gap: 15 },
  eventCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventCardMetaText: { fontSize: 12, color: COLORS.textTertiary },
  eventCardId: { fontSize: 11, color: COLORS.textTertiary },

  actionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  actionIcon: { padding: 10, borderRadius: 10, marginRight: 15 },
  actionTitle: { flex: 1, fontSize: 15, fontWeight: '600' },

  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  dockToggle: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 10 },
  dockToggleText: { color: 'white', fontWeight: '700' },
  dockContent: { paddingBottom: 20 },
  dockLogout: {
    backgroundColor: COLORS.danger, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', padding: 15, borderRadius: 12, gap: 10,
  },
  dockLogoutText: { color: 'white', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: COLORS.textTertiary, marginTop: 20 },
});