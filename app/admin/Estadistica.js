import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { PieChart, LineChart } from 'react-native-chart-kit';

//const API_BASE_URL = 'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('adminAuthToken');
  } else {
    return await SecureStore.getItemAsync('adminAuthToken');
  }
};

const getUserRoleAsync = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userRole'); // guarda el rol al hacer login
  } else {
    return await SecureStore.getItemAsync('userRole');
  }
};

const COLORS = {
  primary: '#E95A0C',
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

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const EstadisticaScreen = () => {
  const router = useRouter();
  const { width: windowWidth } = Dimensions.get('window');

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('6m');
  const [stats, setStats] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenAsync();
      if (!token) {
        router.replace('/');
        return;
      }

      const role = await getUserRoleAsync();
      console.log('🔑 Role:', role);

      // Elegir endpoint correcto según rol
      const historicalEndpoint = role === 'academico'
        ? `${API_BASE_URL}/dashboard/my-historical`
        : `${API_BASE_URL}/dashboard/historical`;

      const statsEndpoint = role === 'academico'
        ? `${API_BASE_URL}/dashboard/my-stats`
        : `${API_BASE_URL}/dashboard/stats`;

      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, historicalRes] = await Promise.all([
        axios.get(statsEndpoint, { headers }),
        axios.get(historicalEndpoint, { headers })
      ]);

      console.log('📊 statsRes.data:', JSON.stringify(statsRes.data, null, 2));
      console.log('📈 historicalRes.data:', JSON.stringify(historicalRes.data, null, 2));

      const statsData = statsRes.data;

      // Distribución por estado
      const estadoCounts = statsData.estadoCounts || {};
      const pieData = [
        { name: 'Aprobados', population: estadoCounts.aprobado || 0, color: COLORS.success, legendFontColor: COLORS.textSecondary, legendFontSize: 12 },
        { name: 'Pendientes', population: estadoCounts.pendiente || 0, color: COLORS.warning, legendFontColor: COLORS.textSecondary, legendFontSize: 12 },
        { name: 'Rechazados', population: estadoCounts.rechazado || 0, color: COLORS.accent, legendFontColor: COLORS.textSecondary, legendFontSize: 12 },
      ];
      setStatusDistribution(pieData);

      // Datos históricos - normalizar campos (backend devuelve {mes, total} o {name, eventos})
      const rawHistorical = historicalRes.data?.historical || historicalRes.data || [];
      const normalized = rawHistorical.map(item => ({
        name: item.name || item.mes || '?',
        eventos: item.eventos ?? item.total ?? 0,
      }));
      setHistoricalData(normalized);
      setStats(statsData);

    } catch (err) {
      console.error('❌ Error al cargar datos:', err?.response?.data || err.message);
      setError(err?.response?.data?.message || err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartConfig = useMemo(() => ({
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    color: (opacity = 1) => `rgba(233, 90, 12, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
    style: { borderRadius: 16 },
    propsForLabels: { fontSize: 10 },
    barPercentage: 0.7,
    decimalPlaces: 0,
  }), []);

  // Datos seguros para LineChart - nunca vacíos ni NaN
  const lineChartData = useMemo(() => {
    const safeData = historicalData.length > 0
      ? historicalData
      : [{ name: 'Sin datos', eventos: 0 }];

    return {
      labels: safeData.map(d => String(d.name || '')),
      datasets: [{
        data: safeData.map(d => {
          const val = Number(d.eventos);
          return isNaN(val) ? 0 : val;
        }),
        color: (opacity = 1) => `rgba(233, 90, 12, ${opacity})`,
        strokeWidth: 2
      }],
      legend: ["Eventos"]
    };
  }, [historicalData]);

  // Datos seguros para PieChart - si todos son 0, muestra placeholder
  const safePieData = useMemo(() => {
    const allZero = statusDistribution.every(d => d.population === 0);
    if (allZero || statusDistribution.length === 0) {
      return [{ name: 'Sin datos', population: 1, color: COLORS.border, legendFontColor: COLORS.textSecondary, legendFontSize: 12 }];
    }
    return statusDistribution.filter(d => d.population > 0);
  }, [statusDistribution]);

  const dateFilters = [
    { label: '1M', value: '1m' },
    { label: '3M', value: '3m' },
    { label: '6M', value: '6m' },
    { label: '1A', value: '1y' },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Generando análisis...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: COLORS.accent, textAlign: 'center', marginHorizontal: 24 }]}>
          {error}
        </Text>
        <TouchableOpacity onPress={fetchData} style={[styles.exportButton, { marginTop: 16 }]}>
          <Text style={styles.exportButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Análisis de Datos</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filtros de Fecha */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Período:</Text>
        <View style={styles.filterButtons}>
          {dateFilters.map(filter => (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterButton, dateRange === filter.value && styles.filterButtonActive]}
              onPress={() => setDateRange(filter.value)}
            >
              <Text style={[styles.filterButtonText, dateRange === filter.value && styles.filterButtonTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Métricas */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.metricValue}>{stats?.estadoCounts?.aprobado || 0}</Text>
          <Text style={styles.metricLabel}>Aprobados</Text>
          <Text style={styles.metricTrend}>{stats?.tasaAprobacion || 0}% tasa de aprobación</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.metricValue}>{stats?.estadoCounts?.pendiente || 0}</Text>
          <Text style={styles.metricLabel}>Pendientes</Text>
          <Text style={styles.metricTrend}>Requieren revisión</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.info }]}>
          <Text style={styles.metricValue}>{stats?.totalEvents || 0}</Text>
          <Text style={styles.metricLabel}>Total Eventos</Text>
          <Text style={styles.metricTrend}>Histórico completo</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.metricValue}>{stats?.usuariosNuevosEsteMes || 0}</Text>
          <Text style={styles.metricLabel}>Nuevos Usuarios</Text>
          <Text style={styles.metricTrend}>Este mes</Text>
        </View>
      </View>

      {/* Gráfico de Línea */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📈 Tendencia de Eventos (Últimos 6 meses)</Text>
        {historicalData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Ionicons name="bar-chart-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>Sin datos históricos disponibles</Text>
          </View>
        ) : (
          <LineChart
            data={lineChartData}
            width={windowWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            verticalLabelRotation={15}
            fromZero
          />
        )}
      </View>

      {/* Gráfico de Pastel */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🥧 Distribución por Estado</Text>
        <PieChart
          data={safePieData}
          width={windowWidth - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Tabla Resumen */}
      {historicalData.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.chartTitle}>📋 Resumen Detallado</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: '700' }]}>Mes</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', fontWeight: '700' }]}>Eventos</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>Tendencia</Text>
          </View>
          {historicalData.map((item, index) => {
            const prev = historicalData[index - 1]?.eventos || 0;
            const current = item.eventos || 0;
            const trend = prev > 0 ? Math.round(((current - prev) / prev) * 100) : 0;
            return (
              <View key={item.name + index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{current}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: trend >= 0 ? COLORS.success : COLORS.accent }]}>
                  {index === 0 ? '-' : `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%`}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Exportar */}
      <TouchableOpacity style={styles.exportButton}>
        <Ionicons name="download-outline" size={20} color={COLORS.white} />
        <Text style={styles.exportButtonText}>Exportar Reporte (PDF)</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 16,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  placeholder: { width: 40 },

  filterContainer: {
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderColor: COLORS.border
  },
  filterLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  filterButtons: { flexDirection: 'row', gap: 8 },
  filterButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border
  },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterButtonTextActive: { color: COLORS.white },

  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12, justifyContent: 'space-between'
  },
  metricCard: {
    width: '48%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  metricValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  metricLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  metricTrend: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

  chartCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  chart: { marginVertical: 8, borderRadius: 8 },
  emptyChart: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 8, color: COLORS.textTertiary, fontSize: 14 },

  tableCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.divider },
  tableCell: { fontSize: 13, color: COLORS.textSecondary },

  exportButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, marginHorizontal: 16, marginBottom: 32,
    paddingVertical: 14, borderRadius: 12
  },
  exportButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white }
});

export default EstadisticaScreen;