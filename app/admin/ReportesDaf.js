import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';';const TOKEN_KEY = 'adminAuthToken';
const getToken = async () => {
  if (Platform.OS === 'web') { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
};

const C = {
  primary: '#E95A0C', primaryLight: '#FFF0E6',
  success: '#10B981', successLight: '#D1FAE5',
  warning: '#F59E0B', warningLight: '#FEF3C7',
  danger: '#EF4444',  dangerLight: '#FEE2E2',
  info: '#3B82F6',    infoLight: '#DBEAFE',
  bg: '#F3F4F6', surface: '#FFFFFF',
  t1: '#111827', t2: '#6B7280', t3: '#9CA3AF', border: '#E5E7EB',
};

const PERIODOS = [
  { id: 'semana',  label: 'Esta semana' },
  { id: 'mes',     label: 'Este mes' },
  { id: 'trimestre', label: 'Trimestre' },
];

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color, colorLight, sub }) => (
  <View style={r.statCard}>
    <View style={[r.statIcon, { backgroundColor: colorLight }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={r.statVal}>{value}</Text>
    <Text style={r.statLabel}>{label}</Text>
    {sub ? <Text style={r.statSub}>{sub}</Text> : null}
  </View>
);

// ─── Barra horizontal de recurso más usado ────────────────────────────────────
const RecursoBar = ({ nombre, usos, maxUsos, color }) => {
  const pct = maxUsos > 0 ? usos / maxUsos : 0;
  return (
    <View style={r.recursoBarRow}>
      <Text style={r.recursoBarName} numberOfLines={1}>{nombre}</Text>
      <View style={r.recursoBarTrack}>
        <View style={[r.recursoBarFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[r.recursoBarCount, { color }]}>{usos}</Text>
    </View>
  );
};

// ─── Evento card en reporte ───────────────────────────────────────────────────
const EventoReporteCard = ({ item }) => (
  <View style={r.evCard}>
    <View style={r.evCardTop}>
      <Text style={r.evCardTitle} numberOfLines={1}>{item.nombreEvento}</Text>
      <View style={[r.badge, { backgroundColor: item.estado === 'Aprobado' ? C.successLight : C.warningLight }]}>
        <Text style={[r.badgeText, { color: item.estado === 'Aprobado' ? C.success : C.warning }]}>{item.estado}</Text>
      </View>
    </View>
    <Text style={r.evCardSub}>{item.solicitante}</Text>
    <View style={r.evCardMeta}>
      <View style={r.metaItem}><Ionicons name="calendar-outline" size={11} color={C.t3} /><Text style={r.metaText}>{item.fecha}</Text></View>
      <View style={r.metaDivider} />
      <View style={r.metaItem}><Ionicons name="cube-outline" size={11} color={C.t3} /><Text style={r.metaText}>{item.totalRecursos} recursos</Text></View>
    </View>
  </View>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Reportes() {
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [periodo, setPeriodo]   = useState('mes');
  const [data, setData]         = useState(null);

  const fetchReportes = useCallback(async (p) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE_URL}/reportes?periodo=${p}`, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 10000,
      });
      const data = res.data;
      if(!data|| typeof data !== 'object') throw new Error('Respuesta inválida de la API');

      setData({
      totalSolicitudes: data.totalSolicitudes ?? 0,
      aprobadas: data.aprobadas ?? 0,
      rechazadas: data.rechazadas ?? 0,
      pendientes: data.pendientes ?? 0,
      recursosMasUsados: Array.isArray(data.recursosMasUsados) ? data.recursosMasUsados : [],
      eventoRecientes: Array.isArray(data.eventoRecientes) ? data.eventoRecientes : [],
    });
    } catch (err) {
      console.error(err);
      // Datos de demo si la API falla
      setData({
        totalSolicitudes: 0,
        aprobadas: 0,
        rechazadas: 0,
        pendientes: 0,
        recursosMasUsados: [],
        eventoRecientes: [],
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReportes(periodo); }, [periodo, fetchReportes]);

  const maxUsos = data?.recursosMasUsados?.[0]?.usos || 1;
  const barColors = [C.primary, C.info, C.success, C.warning, C.danger];

  return (
    <View style={r.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={r.header}>
        <TouchableOpacity style={r.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.t1} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={r.hTitle}>Reportes</Text>
          <Text style={r.hSub}>Uso de recursos y estadísticas</Text>
        </View>
      </View>

      {/* Selector de período */}
      <View style={r.periodoRow}>
        {PERIODOS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[r.periodoBtn, periodo === p.id && { backgroundColor: C.primary, borderColor: C.primary }]}
            onPress={() => setPeriodo(p.id)}
          >
            <Text style={[r.periodoBtnText, periodo === p.id && { color: C.surface }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={r.loadingBox}><ActivityIndicator color={C.primary} /><Text style={r.loadingText}>Cargando reportes…</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Stats */}
          <Text style={r.secLabel}>Resumen del período</Text>
          <View style={r.statsGrid}>
            <StatCard label="Solicitudes"  value={data.totalSolicitudes} icon="clipboard-outline"         color={C.primary} colorLight={C.primaryLight} sub="Total recibidas" />
            <StatCard label="Aprobadas"    value={data.aprobadas}        icon="checkmark-circle-outline"  color={C.success} colorLight={C.successLight} sub={`${Math.round(data.aprobadas / (data.totalSolicitudes || 1) * 100)}% aprobación`} />
            <StatCard label="Rechazadas"   value={data.rechazadas}       icon="close-circle-outline"      color={C.danger}  colorLight={C.dangerLight}  sub="No atendidas" />
            <StatCard label="Pendientes"   value={data.pendientes}       icon="time-outline"              color={C.warning} colorLight={C.warningLight} sub="En espera" />
          </View>

          {/* Recursos más usados */}
          <Text style={[r.secLabel, { marginTop: 24 }]}>Recursos más solicitados</Text>
          <View style={r.card}>
            {data.recursosMasUsados?.length === 0 ? (
              <Text style={r.loadingText}>Sin datos para el período</Text>
            ) : (
              data.recursosMasUsados?.map((rec, i) => (
                <RecursoBar key={i} nombre={rec.nombre} usos={rec.usos} maxUsos={maxUsos} color={barColors[i % barColors.length]} />
              ))
            )}
          </View>

          {/* Donut visual simple */}
          <Text style={[r.secLabel, { marginTop: 24 }]}>Estado de solicitudes</Text>
          <View style={r.card}>
            {[
              { label: 'Aprobadas',  val: data.aprobadas,        color: C.success },
              { label: 'Rechazadas', val: data.rechazadas,       color: C.danger  },
              { label: 'Pendientes', val: data.pendientes,       color: C.warning },
            ].map((item, i) => {
              const pct = data.totalSolicitudes > 0 ? item.val / data.totalSolicitudes : 0;
              return (
                <View key={i} style={r.stateRow}>
                  <View style={[r.stateDot, { backgroundColor: item.color }]} />
                  <Text style={r.stateLabel}>{item.label}</Text>
                  <View style={r.stateTrack}>
                    <View style={[r.stateFill, { width: `${pct * 100}%`, backgroundColor: item.color }]} />
                  </View>
                  <Text style={[r.stateCount, { color: item.color }]}>{item.val}</Text>
                  <Text style={r.statePct}>{Math.round(pct * 100)}%</Text>
                </View>
              );
            })}
          </View>

          {/* Eventos recientes */}
          <Text style={[r.secLabel, { marginTop: 24 }]}>Solicitudes recientes</Text>
          {data.eventoRecientes?.map(ev => (
            <EventoReporteCard key={ev.id} item={ev} />
          ))}

        </ScrollView>
      )}
    </View>
  );
}

const r = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: (StatusBar.currentHeight || 40) + 12, paddingBottom: 14,
    borderBottomWidth: 0.5, borderColor: C.border, gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: C.border },
  hTitle: { fontSize: 20, fontWeight: '800', color: C.t1 },
  hSub: { fontSize: 12, color: C.t2 },

  periodoRow: { flexDirection: 'row', padding: 16, gap: 8 },
  periodoBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.surface, alignItems: 'center' },
  periodoBtnText: { fontSize: 12, fontWeight: '600', color: C.t2 },

  secLabel: { fontSize: 11, fontWeight: '600', color: C.t3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { backgroundColor: C.surface, borderRadius: 14, padding: 14, width: '48%', borderWidth: 0.5, borderColor: C.border },
  statIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statVal: { fontSize: 26, fontWeight: '800', color: C.t1, marginBottom: 2 },
  statLabel: { fontSize: 12, color: C.t2, fontWeight: '500' },
  statSub: { fontSize: 11, color: C.t3, marginTop: 4 },

  card: { backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: C.border },

  recursoBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  recursoBarName: { fontSize: 13, color: C.t1, fontWeight: '500', width: 120 },
  recursoBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.bg, overflow: 'hidden' },
  recursoBarFill: { height: '100%', borderRadius: 4 },
  recursoBarCount: { fontSize: 13, fontWeight: '700', minWidth: 28, textAlign: 'right' },

  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  stateDot: { width: 8, height: 8, borderRadius: 4 },
  stateLabel: { fontSize: 13, color: C.t2, width: 80 },
  stateTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.bg, overflow: 'hidden' },
  stateFill: { height: '100%', borderRadius: 4 },
  stateCount: { fontSize: 13, fontWeight: '700', minWidth: 24, textAlign: 'right' },
  statePct: { fontSize: 11, color: C.t3, minWidth: 34, textAlign: 'right' },

  evCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: C.border },
  evCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  evCardTitle: { fontSize: 14, fontWeight: '700', color: C.t1, flex: 1 },
  evCardSub: { fontSize: 12, color: C.t2, marginBottom: 8 },
  evCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: C.t2 },
  metaDivider: { width: 1, height: 10, backgroundColor: C.border },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: C.t2 },
});