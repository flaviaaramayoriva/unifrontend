import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AdminHeader from '../../components/admin/AdminHeader';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#C44B0A',
  primaryLight: '#FFEDD5',
  accent: '#EF4444',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E6E9EF',
  success: '#16A34A',
  warning: '#F59E0B',
  info: '#3B82F6',
  secondary: '#4B5563',
  white: '#FFFFFF',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
};

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'aprobado', label: 'Aprobados' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'completado', label: 'Completados' },
  { key: 'vencido', label: 'Vencidos' },
];

const typeIcons = {
  aprobado: 'checkmark-circle',
  pendiente: 'time',
  completado: 'checkmark-done-circle',
  vencido: 'hourglass',
  rechazado: 'close-circle',
};

const EventosComite = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [counts, setCounts] = useState({});
  const scrollRef = useRef(null);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const token = await getTokenAsync();
      if (!token) { router.replace('/'); return; }
      const response = await axios.get(`${API_BASE_URL}/dashboard/my-committee-events`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const lista = response.data.events || [];
      setEvents(lista);
      const c = {};
      lista.forEach(e => {
        const st = e.estado || 'sin_estado';
        c[st] = (c[st] || 0) + 1;
      });
      c['todos'] = lista.length;
      setCounts(c);
    } catch (error) {
      console.error('Error al cargar eventos como comité:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'todos') return events;
    return events.filter(e => (e.estado || '') === activeFilter);
  }, [events, activeFilter]);

  const topStats = useMemo(() => {
    const aprobados = counts['aprobado'] || 0;
    const pendientes = counts['pendiente'] || 0;
    const finalizados = (counts['completado'] || 0) + (counts['vencido'] || 0);
    return { aprobados, pendientes, finalizados };
  }, [counts]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
  };

  const getIniciales = (e) => {
    const n = e.creador?.nombre || e.responsable_evento || '';
    return n.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(true)} colors={[COLORS.primary]} />
        }
      >
        <AdminHeader
          eyebrow="Mi participación"
          title="Mis Eventos como Comité"
          subtitle="Eventos en los que participas como miembro del comité"
          primaryColor={COLORS.primary}
        />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.success + '18' }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.success} />
            </View>
            <View>
              <Text style={styles.statValue}>{topStats.aprobados}</Text>
              <Text style={styles.statLabel}>Aprobados</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '18' }]}>
              <Ionicons name="time-outline" size={22} color={COLORS.warning} />
            </View>
            <View>
              <Text style={styles.statValue}>{topStats.pendientes}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.info }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.info + '18' }]}>
              <Ionicons name="flag-outline" size={22} color={COLORS.info} />
            </View>
            <View>
              <Text style={styles.statValue}>{topStats.finalizados}</Text>
              <Text style={styles.statLabel}>Finalizados</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label} ({counts[f.key] || 0})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando tus eventos como comité...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={44} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No hay eventos en esta categoría.</Text>
          </View>
        ) : (
          filteredEvents.map((item) => {
            const estado = item.estado || 'sin_estado';
            const estadoColor = estado === 'aprobado' ? COLORS.success
              : estado === 'pendiente' ? COLORS.warning
              : estado === 'completado' ? COLORS.info
              : COLORS.accent;
            return (
              <TouchableOpacity
                key={item.idevento}
                style={styles.card}
                onPress={() => router.push(`/admin/EventDetailComite?eventId=${item.idevento}`)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.statusBadge, { backgroundColor: estadoColor + '1A' }]}>
                    <Ionicons name={typeIcons[estado] || 'ellipse'} size={14} color={estadoColor} />
                    <Text style={[styles.statusText, { color: estadoColor }]}>
                      {estado.charAt(0).toUpperCase() + estado.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getIniciales(item)}</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>{item.nombreevento || 'Sin título'}</Text>
                {item.fechaevento && (
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={15} color={COLORS.textTertiary} />
                    <Text style={styles.dateText}>{formatDate(item.fechaevento)}</Text>
                  </View>
                )}
                <View style={styles.cardFooter}>
                  <View style={[styles.roleBadge, { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons name="shield-checkmark" size={15} color={COLORS.primary} />
                    <Text style={styles.roleText}>Como Comité</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 60 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 18 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  loadingBox: { alignItems: 'center', padding: 50 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary },
  emptyBox: { alignItems: 'center', padding: 50 },
  emptyText: { marginTop: 12, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, marginHorizontal: 20, marginTop: 14,
    padding: 18, borderLeftWidth: 4, borderLeftColor: COLORS.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dateText: { fontSize: 13, color: COLORS.textTertiary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  roleText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
});

export default EventosComite;