import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions, Platform,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import dayjs from 'dayjs';
import AdminHeader from '../../components/admin/AdminHeader';
import { CustomLineChart, CustomBarChart, COLORS, STATE_COLORS, safeArray, safeObj } from '../../components/admin/ChartsVisuales';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

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

const AnalisisVisualScreen = () => {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventosPorEstado, setEventosPorEstado] = useState(null);
  const [tendenciaMensual, setTendenciaMensual] = useState(null);
  const [estadosBarra, setEstadosBarra] = useState(null);
  const [totalEventos, setTotalEventos] = useState(0);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const token = await getTokenAsync();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      router.replace('/');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [statsRes, histRes, comiteRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/dashboard/my-stats`, { headers, timeout: 8000 }),
        axios.get(`${API_BASE_URL}/dashboard/my-historical`, { headers, timeout: 8000 }),
        axios.get(`${API_BASE_URL}/dashboard/my-committee-events`, { headers, timeout: 8000 }),
      ]);

      const counts = { aprobado: 0, pendiente: 0, rechazado: 0, vencido: 0, cancelado: 0, completado: 0 };

      if (statsRes.status === 'fulfilled' && statsRes.value && statsRes.value.data) {
        const d = statsRes.value.data;
        const raw = Array.isArray(d) ? d : d.stats;
        if (Array.isArray(raw)) {
          raw.map((s) => safeObj(s));
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

      let events = [];
      if (comiteRes.status === 'fulfilled' && comiteRes.value && comiteRes.value.data) {
        const d = comiteRes.value.data;
        events = safeArray(Array.isArray(d) ? d : d.events);
        events.forEach((ev) => {
          const k = String(ev.estado || 'pendiente').toLowerCase();
          if (counts[k] !== undefined && isEventActive(ev)) counts[k] += 1;
        });
      }
      setTotalEventos(events.length);

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
    } catch (error) {
      console.error('Error al cargar análisis visual:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartWidth = Math.max(windowWidth - 88, 280);

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Análisis Visual"
        subtitle="Distribución y tendencias de tus eventos"
        eyebrow="Gráficos"
        backTo="/admin/HomeAcademico"
        primaryColor={COLORS.primary}
        rightActions={(
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => fetchData(true)}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Actualizar"
          >
            {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="refresh-outline" size={22} color="#fff" />}
          </TouchableOpacity>
        )}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[COLORS.primary]} />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando gráficos…</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Ionicons name="analytics-outline" size={26} color={COLORS.primary} />
              <View style={styles.summaryBody}>
                <Text style={styles.summaryValue}>{totalEventos}</Text>
                <Text style={styles.summaryLabel}>eventos en tu comité</Text>
              </View>
            </View>

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
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40 },
  refreshBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center', alignItems: 'center',
  },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  summaryBody: { flex: 1 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  chartCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  chartCardHeader: { marginBottom: 12 },
  chartCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  chartCardSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  chartEmpty: { alignItems: 'center', paddingVertical: 32 },
  chartEmptyText: { marginTop: 10, fontSize: 14, color: COLORS.textTertiary },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 10, fontSize: 14, color: COLORS.textSecondary },
});

export default AnalisisVisualScreen;