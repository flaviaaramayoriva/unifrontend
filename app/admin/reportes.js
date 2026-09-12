import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, useWindowDimensions, Platform,
  Switch, Modal, TextInput, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import AdminHeader from '../../components/admin/AdminHeader';
import Svg, { Rect, Text as SvgText, G, Line } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';

const COLORS = {
  primary: '#C44B0A',
  primaryLight: '#FFEDD5',
  secondary: '#0F172A',
  accent: '#EF4444',
  success: '#16A34A',
  warning: '#F59E0B',
  info: '#3B82F6',
  purple: '#8B5CF6',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E6E9EF',
  divider: '#F1F5F9',
  white: '#FFFFFF',
  error: '#DC2626',
  // Dark mode colors
  darkBackground: '#111827',
  darkSurface: '#1F2937',
  darkTextPrimary: '#F9FAFB',
  darkTextSecondary: '#D1D5DB',
  darkBorder: '#374151',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const MONTH_NAMES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_NAMES_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// 🔥 NUEVO: Componente HorizontalBarChart mejorado
const HorizontalBarChart = ({ data, width, height = 300 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const CHART_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F59E0B', '#047857'];

  return (
    <View style={{ width }}>
      {data.map((d, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const pct = Math.min((d.value / max) * 100, 100);
        return (
          <View key={i} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }} numberOfLines={2}>
                {d.label}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color, marginLeft: 10 }}>{d.value}</Text>
            </View>
            <View style={{ height: 14, borderRadius: 7, backgroundColor: COLORS.divider, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', borderRadius: 7, backgroundColor: color }} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

// 🔥 MEJORADO: Componente Heatmap Calendar con fechas alineadas correctamente
const CalendarHeatmap = ({ data, width, darkMode }) => {
  const cellSize = 14;
  const cellGap = 4;
  const weeks = 52;
  const days = 7;
  
  const getColor = (value) => {
    if (!value || value === 0) return darkMode ? '#374151' : COLORS.divider;
    if (value <= 2) return '#BBF7D0';
    if (value <= 5) return '#86EFAC';
    if (value <= 10) return '#22C55E';
    return '#16A34A';
  };

  // Calcular la fecha de inicio (hace 52 semanas, alineado al domingo)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeks * 7) + today.getDay());

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 10 }}>
      <Svg width={weeks * (cellSize + cellGap) + 40} height={days * (cellSize + cellGap) + 20}>
        {/* Días de la semana (eje Y) */}
        {DAYS_SHORT.map((day, i) => (
          <SvgText 
            key={i} 
            x={0} 
            y={i * (cellSize + cellGap) + cellSize + 6} 
            fontSize="9" 
            fill={darkMode ? COLORS.darkTextSecondary : COLORS.textTertiary}
            fontWeight="500"
          >
            {day}
          </SvgText>
        ))}
        
        {/* Celdas del heatmap */}
        {Array.from({ length: weeks }).map((_, week) => 
          Array.from({ length: days }).map((_, day) => {
            // Calcular la fecha exacta para cada celda
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + (week * 7) + day);
            const dateStr = cellDate.toISOString().split('T')[0];
            const value = data[dateStr] || 0;
            
            return (
              <Rect
                key={`${week}-${day}`}
                x={week * (cellSize + cellGap) + 25}
                y={day * (cellSize + cellGap)}
                width={cellSize}
                height={cellSize}
                fill={getColor(value)}
                rx={3}
              />
            );
          })
        )}
      </Svg>
    </ScrollView>
  );
};

const KpiCard = ({ label, value, icon, color, sub, trend }) => (
  <View style={[styles.kpiCard, { borderTopColor: color }]}>
    <View style={styles.kpiHeader}>
      <View style={[styles.kpiIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      {trend !== undefined && (
        <View style={[styles.trendBadge, trend >= 0 ? styles.trendUp : styles.trendDown]}>
          <Ionicons name={trend >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={trend >= 0 ? COLORS.success : COLORS.error} />
          <Text style={[styles.trendText, trend >= 0 ? { color: COLORS.success } : { color: COLORS.error }]}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
    {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
  </View>
);

const SectionHeader = ({ title, subtitle, icon, action }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      {action}
    </View>
  </View>
);

// 🔥 NUEVO: Card de insight para el Resumen Ejecutivo (win / alert / info)
const InsightCard = ({ icon, title, value, subtitle, color, type = 'info' }) => {
  const fg = type === 'alert' ? COLORS.accent : type === 'win' ? COLORS.success : (color || COLORS.primary);
  const bg = type === 'alert' ? '#FEF2F2' : type === 'win' ? '#F0FDF4' : (color || COLORS.primary) + '15';
  return (
    <View style={[styles.card, { backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <View style={[styles.insightIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.insightValue, { color: fg }]} numberOfLines={1}>{value}</Text>
        <Text style={[styles.insightTitle, { color: COLORS.textPrimary }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.insightSub, { color: COLORS.textSecondary }]} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

// 🔥 NUEVO: Fila horizontal con valor + barra proporcional (reutilizable)
const MiniBarRow = ({ label, value, color, max }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }} numberOfLines={1}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: color || COLORS.primary, marginLeft: 10 }}>{value}</Text>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: COLORS.divider, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: color || COLORS.primary }} />
      </View>
    </View>
  );
};

const ReportesAvanzadosScreen = () => {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  // Estados existentes
  const [loading, setLoading] = useState(false);
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [stats, setStats] = useState(null);
  const [reportesMensuales, setReportesMensuales] = useState([]);
  const [eventosPorEstado, setEventosPorEstado] = useState(null);
  const [rankingFacultades, setRankingFacultades] = useState([]);
  const [eventosRecientes, setEventosRecientes] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // 🔥 NUEVOS ESTADOS
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultad, setSelectedFacultad] = useState('todas');
  const [todasFacultades, setTodasFacultades] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [heatmapData, setHeatmapData] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [showFacultadFilter, setShowFacultadFilter] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen'); // resumen, dashboard, calendario, analisis

  // 🔥 NUEVO: Filtros de reporte VISIBLES + comparativa de años
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');
  const [analisisSub, setAnalisisSub] = useState('inscripciones'); // inscripciones, operacional, economico, recursos
  const [anioComparar, setAnioComparar] = useState(new Date().getFullYear() - 1);
  const [mostrarComparacion, setMostrarComparacion] = useState(false);

  // Selectores
  const [showSelector, setShowSelector] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [todosLosEventos, setTodosLosEventos] = useState([]);

  // 🔥 REPORTES AMPLIADOS
  const [repInscripciones, setRepInscripciones] = useState(null);
  const [repOperacionales, setRepOperacionales] = useState(null);
  const [repEconomicos, setRepEconomicos] = useState(null);
  const [repRecursos, setRepRecursos] = useState(null);
  const [repTipos, setRepTipos] = useState([]);

  // 🔥 NUEVO: KPIs filtrados por período + días activos para el calendario
  const [statsFiltrado, setStatsFiltrado] = useState(null);
  const [diasActivos, setDiasActivos] = useState([]);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = MONTH_NAMES_FULL.map((name, i) => ({ value: i + 1, name }));

  const showError = (msg) => Alert.alert('Error', msg, [{ text: 'OK' }]);

  // 🔥 NUEVO: Calcular tendencias
  const calcularTendencia = (actual, anterior) => {
    if (!anterior || anterior === 0) return 0;
    return Math.round(((actual - anterior) / anterior) * 100);
  };

  const cargarDatos = useCallback(async () => {
    setLoadingMain(true);
    try {
      const token = await getTokenAsync();
      if (!token) { router.replace('/'); return; }

      // 🔥 Filtros aplicados a los reportes (backend soporta desde/hasta)
      const paramsReportes = {};
      if (reporteDesde) paramsReportes.desde = reporteDesde;
      if (reporteHasta) paramsReportes.hasta = reporteHasta;

      const paramsEventos = {};
      if (reporteDesde) paramsEventos.fechaInicio = reporteDesde;
      if (reporteHasta) paramsEventos.fechaFin = reporteHasta;
      if (selectedFacultad !== 'todas') paramsEventos.facultad = selectedFacultad;

      const [statsRes, mensualRes, eventosRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/dashboard/mensual`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/eventos`, { headers: { Authorization: `Bearer ${token}` }, params: paramsEventos }),
      ]);

      // 🔥 Reportes ampliados (parallel, tolerantes a fallos)
      const [inscRes, opRes, ecoRes, recRes, tipoRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/reportes/inscripciones`, { headers: { Authorization: `Bearer ${token}` }, params: paramsReportes }).catch(() => null),
        axios.get(`${API_BASE_URL}/reportes/operacionales`, { headers: { Authorization: `Bearer ${token}` }, params: paramsReportes }).catch(() => null),
        axios.get(`${API_BASE_URL}/reportes/economicos`, { headers: { Authorization: `Bearer ${token}` }, params: paramsReportes }).catch(() => null),
        axios.get(`${API_BASE_URL}/reportes/recursos?periodo=mes`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axios.get(`${API_BASE_URL}/reportes/tipos`, { headers: { Authorization: `Bearer ${token}` }, params: paramsReportes }).catch(() => null),
      ]);
      setRepInscripciones(inscRes?.data || null);
      setRepOperacionales(opRes?.data || null);
      setRepEconomicos(ecoRes?.data || null);
      setRepRecursos(recRes?.data || null);
      setRepTipos(Array.isArray(tipoRes?.data?.porTipo) ? tipoRes.data.porTipo : []);

      const data = statsRes.data;
      setStats(data);

      // Extraer todas las facultades únicas
      if (data.eventosPorFacultad) {
        const facs = [...new Set(data.eventosPorFacultad.map(f => f.facultad))].filter(Boolean);
        setTodasFacultades(facs);
      }

      // Pie por estado → usa el reporte operacional (respeta filtro de fechas)
      const porEstadoOp = Array.isArray(opRes?.data?.porEstado) ? opRes.data.porEstado : [];
      const colorMap = {
        aprobado: COLORS.success, pendiente: COLORS.warning, rechazado: COLORS.accent,
        cancelado: COLORS.textTertiary, vencido: COLORS.textTertiary,
      };
      const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
      const pie = porEstadoOp
        .filter(x => (x.total || 0) > 0)
        .map(x => ({
          name: cap(x.estado),
          population: x.total,
          color: colorMap[String(x.estado).toLowerCase()] || COLORS.info,
          legendFontColor: darkMode ? COLORS.darkTextPrimary : COLORS.textPrimary,
          legendFontSize: 12,
        }));
      setEventosPorEstado(pie.length ? pie : null);

      // KPIs del período filtrado por fechas
      const porEstadoOK = Array.isArray(opRes?.data?.porEstado);
      const totalFiltrado = (porEstadoOK ? porEstadoOp : []).reduce((s, x) => s + (x.total || 0), 0);
      const aprobFiltrado = (porEstadoOK ? porEstadoOp : []).find(x => x.estado === 'aprobado')?.total || 0;
      const pendFiltrado = (porEstadoOK ? porEstadoOp : []).find(x => x.estado === 'pendiente')?.total || 0;
      const rechFiltrado = (porEstadoOK ? porEstadoOp : []).find(x => x.estado === 'rechazado')?.total || 0;
      const tAprobFiltrado = totalFiltrado > 0 ? Math.round((aprobFiltrado / totalFiltrado) * 100) : 0;
      setStatsFiltrado({
        total: porEstadoOK ? totalFiltrado : (data?.totalEvents || 0),
        aprobados: porEstadoOK ? aprobFiltrado : (data?.estadoCounts?.aprobado || 0),
        pendientes: porEstadoOK ? pendFiltrado : (data?.estadoCounts?.pendiente || 0),
        rechazados: porEstadoOK ? rechFiltrado : (data?.estadoCounts?.rechazado || 0),
        tasa: porEstadoOK ? tAprobFiltrado : (data?.tasaAprobacion || 0),
      });

      // Ranking facultades → derivado de los eventos filtrados (o fallback global)
      const evs = Array.isArray(eventosRes.data) ? eventosRes.data : [];
      const facMap = {};
      evs.forEach(ev => {
        const fam = ev.facultad || (ev.organizador || '').split(' ')[0] || null;
        if (!fam) return;
        facMap[fam] = (facMap[fam] || 0) + 1;
      });
      const rankingDerivado = Object.entries(facMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      if (rankingDerivado.length > 0 && (reporteDesde || selectedFacultad !== 'todas')) {
        setRankingFacultades(rankingDerivado);
      } else if (Array.isArray(data.eventosPorFacultad)) {
        setRankingFacultades(
          data.eventosPorFacultad
            .map(f => ({ label: f.facultad || 'N/A', value: f.aprobados || 0 }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
        );
      }

      // Reportes mensuales
      const reportes = Array.isArray(mensualRes.data)
        ? mensualRes.data.sort((a, b) => new Date(b.mes) - new Date(a.mes))
        : [];
      setReportesMensuales(reportes);

      // 🔥 NUEVO: Tendencia mensual respetando el rango de fechas (si hay filtro)
      const enRango = (mes) => {
        if (!reporteDesde && !reporteHasta) return true;
        const m = mes;
        if (reporteDesde && m < reporteDesde) return false;
        if (reporteHasta && m > reporteHasta) return false;
        return true;
      };
      const reportesRango = reportes.filter(r => enRango(r.mes));
      const base = reportesRango.length ? reportesRango : reportes.slice(0, 12);
      const trend = base
        .slice()
        .reverse()
        .map(r => {
          const [y, m] = r.mes.split('-');
          return {
            mes: r.mes,
            year: parseInt(y),
            month: `${MONTH_NAMES_SHORT[parseInt(m) - 1]} ${String(y).slice(2)}`,
            aprobados: r.aprobado || 0,
            rechazados: r.rechazado || 0,
            total: r.totalEvents || 0,
          };
        });
      setTrendData(trend);

      //  NUEVO: Heatmap data (ya filtrado por /eventos)
      const heatData = {};
      evs.forEach(ev => {
        if (ev.fechaevento) {
          const dateStr = ev.fechaevento.split('T')[0];
          heatData[dateStr] = (heatData[dateStr] || 0) + 1;
        }
      });
      setHeatmapData(heatData);

      // 🔥 Extraer días con actividad para el calendario
      setDiasActivos(Object.entries(heatData).map(([fecha, total]) => ({ fecha, total })).sort((a, b) => b.total - a.total).slice(0, 6));

    } catch (err) {
      console.error(err);
      showError('No se pudieron cargar los datos del dashboard.');
    } finally {
      setLoadingMain(false);
    }
  }, [darkMode, reporteDesde, reporteHasta, selectedFacultad]);

  const cargarEventos = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const token = await getTokenAsync();
      if (!token) return;
      
      let params = {};
      if (filtroEstado !== 'todos') params.estado = filtroEstado;
      if (selectedFacultad !== 'todas') params.facultad = selectedFacultad;
      if (fechaInicio) params.fechaInicio = fechaInicio;
      if (fechaFin) params.fechaFin = fechaFin;
      if (searchQuery) params.busqueda = searchQuery;

      const res = await axios.get(`${API_BASE_URL}/eventos`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      
      const lista = Array.isArray(res.data) ? res.data : [];
      const anioActual = new Date().getFullYear();
      const eventosFiltrados = lista.filter(ev => {
        if (!ev.fechaevento) return false;
        const fechaEvento = new Date(ev.fechaevento);
        return fechaEvento.getFullYear() === anioActual;
      });
      
      setEventosRecientes(eventosFiltrados.slice(0, 15));
    } catch (err) {
      console.error(err);
      setEventosRecientes([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [filtroEstado, selectedFacultad, fechaInicio, fechaFin, searchQuery]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  useEffect(() => { cargarEventos(); }, [cargarEventos]);

    const exportarCSV = async () => {
    try {
      const token = await getTokenAsync();
      if (!token) return;
      const res = await axios.get(`${API_BASE_URL}/eventos`, { headers: { Authorization: `Bearer ${token}` } });
      const eventos = Array.isArray(res.data) ? res.data : [];
      if (!eventos.length) { showError('No hay eventos para exportar.'); return; }

      const headers = ['ID', 'Nombre', 'Fecha', 'Lugar', 'Estado', 'Responsable'];
      const rows = eventos.map(e => [
        e.idevento,
        `"${e.nombreevento || ''}"`,
        e.fechaevento?.split('T')[0] || '',
        `"${e.lugarevento || ''}"`,
        e.estado || '',
        `"${e.responsable_evento || ''}"`,
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `eventos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Éxito', 'Archivo CSV descargado correctamente.');
      } else {
        const path = FileSystem.documentDirectory + `eventos_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
      }
    } catch (err) {
      console.error(err);
      showError('Error al exportar: ' + err.message);
    }
  };

 
  const exportarExcel = async () => {
  try {
    const token = await getTokenAsync();
    if (!token) return;
    
    const res = await axios.get(`${API_BASE_URL}/eventos`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    const eventos = Array.isArray(res.data) ? res.data : [];
    
    if (!eventos.length) { showError('No hay eventos para exportar.'); return; }

    // Crear CSV con punto y coma para Excel en español
    const headers = ['ID', 'Nombre del Evento', 'Fecha', 'Lugar', 'Estado', 'Facultad', 'Responsable', 'Descripción'];
    const rows = eventos.map(e => [
      e.idevento || '',
      `"${(e.nombreevento || '').replace(/"/g, '""')}"`,
      e.fechaevento ? e.fechaevento.split('T')[0] : '',
      `"${(e.lugarevento || '').replace(/"/g, '""')}"`,
      e.estado || '',
    ].join(';'));
    
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n'); // ✅ PUNTO Y COMA

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventos_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      Alert.alert('Éxito', 'Archivo CSV descargado. Ábrelo con Excel.');
    } else {
      const path = FileSystem.documentDirectory + `eventos_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar a Excel' });
    }
  } catch (err) {
    console.error(err);
    showError('Error al exportar: ' + err.message);
  }
};

  const cargarEventosParaPicker = async () => {
    setLoading(true);
    try {
      const token = await getTokenAsync();
      if (!token) return;
      const res = await axios.get(`${API_BASE_URL}/eventos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lista = Array.isArray(res.data) ? res.data : [];
      const eventosFase2 = lista.filter(ev => ev.idfase === 2);
      eventosFase2.sort((a, b) => new Date(b.fechaevento || 0) - new Date(a.fechaevento || 0));
      setTodosLosEventos(eventosFase2);
      setShowEventPicker(true);
    } catch (err) {
      console.error(err);
      showError('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const navegarADetalleEvento = (evento) => {
    setShowEventPicker(false);
    router.push(`/admin/EventoDetalleImp?eventId=${evento.idevento}`);
  };

   const generarPDF = async (mesFormato) => {
  setLoading(true);
  try {
    const token = await getTokenAsync();
    if (!token) { setLoading(false); return; }

    const reporte = reportesMensuales.find(r => r.mes === mesFormato);
    if (!reporte) { 
      setLoading(false);
      showError(`Sin datos para ${mesFormato}.`); 
      return; 
    }

    const [year, monthNum] = mesFormato.split('-');
    const mesNombre = MONTH_NAMES_FULL[parseInt(monthNum) - 1];

    const res = await axios.get(`${API_BASE_URL}/eventos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const todosEventos = Array.isArray(res.data) ? res.data : [];
    
    const yearNum = parseInt(year);
    const monthNum2 = parseInt(monthNum);
    
    const eventosDelMes = todosEventos.filter(ev => {
      if (!ev.fechaevento) return false;
      const fechaEvento = new Date(ev.fechaevento);
      return fechaEvento.getFullYear() === yearNum && (fechaEvento.getMonth() + 1) === monthNum2;
    });

    // Función para formatear hora correctamente
    const formatTime = (timeStr) => {
      if (!timeStr) return '–';
      
      // Si ya es un string con formato HH:MM o HH:MM:SS
      if (typeof timeStr === 'string') {
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return timeStr;
      }
      
      // Si es un objeto Date o timestamp
      try {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      } catch (e) {
        // Ignorar errores
      }
      
      return '–';
    };

    const apMes = eventosDelMes.filter(e => e.estado === 'aprobado').length;
    const peMes = eventosDelMes.filter(e => e.estado === 'pendiente').length;
    const reMes = eventosDelMes.filter(e => e.estado === 'rechazado').length;
    const totMes = eventosDelMes.length;
    const tasaMes = totMes > 0 ? Math.round((apMes / totMes) * 100) : 0;

    const filasReporte = eventosDelMes.map(ev => {
      const fecha = ev.fechaevento
        ? new Date(ev.fechaevento).toLocaleDateString('es-BO', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          })
        : '–';
      
      const horaFormateada = formatTime(ev.horaevento);
      
      const estadoColors = {
        aprobado: { bg: '#d1fae5', text: '#059669' },
        pendiente: { bg: '#fef3c7', text: '#d97706' },
        rechazado: { bg: '#fee2e2', text: '#dc2626' },
      };
      const estadoStyle = estadoColors[(ev.estado || '').toLowerCase()] || { bg: '#f3f4f6', text: '#6b7280' };
      
      return `
        <tr>
          <!-- 1. Fecha -->
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;font-size:12px;">${fecha}</td>
          
          <!-- 2. Lugar -->
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;font-size:12px;">${ev.lugarevento || '–'}</td>
          
          <!-- 3. Hora formateada -->
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;font-size:12px;text-align:center;">
            <strong>${horaFormateada}</strong>
          </td>
          
          <!-- 4. Tema -->
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;font-size:12px;">
            <strong>${ev.nombreevento || '–'}</strong><br>
            <span style="color:#6b7280;font-size:11px;">${ev.tipo_evento || ev.tipoEvento || ''}</span>
          </td>
          
          <!-- 5. Estado -->
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;text-align:center;">
            <span style="background:${estadoStyle.bg};color:${estadoStyle.text};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;min-width:80px;">
              ${(ev.estado || 'N/A').charAt(0).toUpperCase() + (ev.estado || '').slice(1)}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page{size:A4 portrait;margin:14mm 12mm}
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#f3f4f6;color:#1f2937;font-size:12px;line-height:1.5}
        .wrap{max-width:1000px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08)}
        .cover{background:linear-gradient(135deg,#123314 0%,#2d5016 55%,#C44B0A 100%);color:#fff;padding:40px 38px;position:relative}
        .cover .uft-logo{display:flex;align-items:center;gap:14px;margin-bottom:18px}
        .cover .uft-monogram{width:54px;height:54px;border-radius:12px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800}
        .cover .uft-name{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
        .cover .uft-sub{font-size:10.5px;opacity:.85}
        .cover .reporte-kicker{font-size:10px;letter-spacing:4px;text-transform:uppercase;opacity:.8;margin-top:4px}
        .cover h1{font-size:27px;font-weight:800;margin:6px 0;line-height:1.15}
        .cover .cover-meta{display:flex;gap:14px;margin-top:14px;flex-wrap:wrap}
        .cover .meta-chip{background:rgba(255,255,255,.12);padding:6px 14px;border-radius:18px;font-size:11px;font-weight:600}
        .cover .accent-bar{position:absolute;left:0;right:0;bottom:0;height:5px;background:#fff}
        @media print{.cover{background:#2d5016}.wrap{box-shadow:none}}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:22px 0}
        .stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center;border-left:4px solid #C44B0A}
        .stat-card:nth-of-type(2){border-left-color:#16a34a}
        .stat-card:nth-of-type(3){border-left-color:#f59e0b}
        .stat-card:nth-of-type(4){border-left-color:#3b82f6}
        .stat-label{font-size:10px;color:#6b7280;margin-bottom:5px;text-transform:uppercase;letter-spacing:.8px;font-weight:600}
        .stat-value{font-size:26px;font-weight:800;color:#111827}
        .section-h{font-size:14px;font-weight:800;margin:24px 0 10px;color:#111827;text-transform:uppercase;border-left:4px solid #C44B0A;padding-left:10px;letter-spacing:.5px}
        .main-table{width:100%;border-collapse:collapse;margin-top:10px}
        .main-table th{background:#2d5016;color:#fff;padding:9px 10px;border:1px solid #2d5016;text-align:left;font-weight:700;font-size:11px}
        .main-table td{padding:8px 10px;border:1px solid #e5e7eb;vertical-align:top;font-size:11.5px}
        .main-table tr:nth-child(even){background:#f8faf8}
        .content{padding:26px 34px 38px}
        .footer{margin-top:30px;text-align:center;font-size:10.5px;color:#9ca3af;padding:14px 0 4px;border-top:1px solid #e5e7eb}
        .footer strong{color:#6b7280}
        @media print{body{background:#fff}}
      </style></head><body><div class="wrap">

      <!-- PORTADA -->
      <div class="cover">
        <div class="uft-logo">
          <div class="uft-monogram">UFT</div>
          <div>
            <div class="uft-name">Universidad Franz Tamayo</div>
            <div class="uft-sub">Autoridad de Fiscalización y Transparencia Universitaria</div>
          </div>
        </div>
        <div class="reporte-kicker">Informe de Gestión</div>
        <h1>Reporte Mensual de Eventos</h1>
        <div class="cover-meta">
          <div class="meta-chip">📅 ${mesNombre} ${year}</div>
          <div class="meta-chip">🗂 ${totMes} eventos</div>
          <div class="meta-chip">✅ ${apMes} aprobados</div>
        </div>
        <div class="accent-bar"></div>
      </div>

      <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Eventos</div>
          <div class="stat-value">${totMes}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Aprobados</div>
          <div class="stat-value" style="color:#16a34a">${apMes}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pendientes</div>
          <div class="stat-value" style="color:#f59e0b">${peMes}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tasa de Aprobación</div>
          <div class="stat-value">${tasaMes}%</div>
        </div>
      </div>
      
      <div class="section-h">Detalle de Eventos del Mes</div>
      <table class="main-table">
        <thead>
          <tr>
            <th style="width:15%">Fecha</th>
            <th style="width:15%">Lugar</th>
            <th style="width:10%">Hora</th>
            <th style="width:30%">Tema</th>
            <th style="width:15%">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${filasReporte}
        </tbody>
      </table>
      
      <div class="footer">
        <strong>Panel de Administración UFT</strong> · Sistema de Gestión de Eventos · ${mesNombre} ${year}
      </div>
      </div>
      </div></body></html>`;

    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (w) { 
        w.document.write(html); 
        w.document.close(); 
        setTimeout(() => w.print(), 800); 
      } else {
        showError('Permite ventanas emergentes para ver el reporte.');
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir Reporte' });
    }
  } catch (err) {
    console.error('Error al generar PDF:', err);
    showError('Error al generar PDF: ' + err.message);
  } finally {
    setLoading(false);
  }
};

  const generarReporteAnual = async (year) => {
  setLoading(true);
  try {
    const token = await getTokenAsync();
    if (!token) return;

    const res = await axios.get(`${API_BASE_URL}/eventos`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { year: year }
    });
    const todosEventos = Array.isArray(res.data) ? res.data : [];

    const eventosAnuales = todosEventos.filter(ev => {
      if (!ev.fechaevento) return false;
      return new Date(ev.fechaevento).getFullYear() === year;
    });

    const formatTime = (timeStr) => {
      if (!timeStr) return '–';
      if (typeof timeStr === 'string') {
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return timeStr;
      }
      try {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      } catch (e) {}
      return '–';
    };

    // Generar filas de la tabla (mismo formato que reporte mensual)
    const eventosRows = eventosAnuales.map(ev => {
      const fecha = ev.fechaevento
        ? new Date(ev.fechaevento).toLocaleDateString('es-BO', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          })
        : '–';
      
      const horaFormateada = formatTime(ev.horaevento);
      
      const estadoColors = {
        aprobado: { bg: '#d1fae5', text: '#059669' },
        pendiente: { bg: '#fef3c7', text: '#d97706' },
        rechazado: { bg: '#fee2e2', text: '#dc2626' },
      };
      const estadoStyle = estadoColors[(ev.estado || '').toLowerCase()] || { bg: '#f3f4f6', text: '#6b7280' };
      
      return `
        <tr>
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;font-size:12px;">${fecha}</td>
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;font-size:12px;">${ev.lugarevento || '–'}</td>
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;font-size:12px;text-align:center;">
            <strong>${horaFormateada}</strong>
          </td>
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;font-size:12px;">
            <strong>${ev.nombreevento || '–'}</strong><br>
            <span style="color:#6b7280;font-size:11px;">${ev.tipo_evento || ev.tipoEvento || ''}</span>
          </td>
          <td style="padding:10px;border:1px solid #ddd;vertical-align:top;text-align:center;">
            <span style="background:${estadoStyle.bg};color:${estadoStyle.text};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;min-width:80px;">
              ${(ev.estado || 'N/A').charAt(0).toUpperCase() + (ev.estado || '').slice(1)}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    // Calcular estadísticas
    const aprobados = eventosAnuales.filter(e => e.estado === 'aprobado').length;
    const pendientes = eventosAnuales.filter(e => e.estado === 'pendiente').length;
    const rechazados = eventosAnuales.filter(e => e.estado === 'rechazado').length;
    const total = eventosAnuales.length;
    const tasaAprobacion = total > 0 ? Math.round((aprobados / total) * 100) : 0;

    // 🔥 NUEVO: Datos complementarios del año (inscripciones + ejecución económica)
    const desde = `${year}-01-01`;
    const hasta = `${year}-12-31`;
    const headersAuth = { Authorization: `Bearer ${token}` };
    const [inscRes, ecoRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/reportes/inscripciones`, { headers: headersAuth, params: { desde, hasta } }).catch(() => ({ data: null })),
      axios.get(`${API_BASE_URL}/reportes/economicos`, { headers: headersAuth, params: { desde, hasta } }).catch(() => ({ data: null })),
    ]);
    const insAnual = inscRes?.data || null;
    const ecoAnual = ecoRes?.data || null;
    const inscritosAnio = Number(insAnual?.total) || 0;
    const facRanking = Array.isArray(insAnual?.porFacultad) ? insAnual.porFacultad.slice(0, 8) : [];
    const ecoResumen = ecoAnual?.resumen || null;
    const ecoActivo = ecoResumen && (Number(ecoResumen.real_egresos) + Number(ecoResumen.real_ingresos) + Number(ecoResumen.balance_real)) !== 0;

    // Actividad mensual (eventos y aprobaciones por mes)
    const meses = Array.from({ length: 12 }, (_, i) => {
      const evs = eventosAnuales.filter(ev => ev.fechaevento && new Date(ev.fechaevento).getMonth() === i);
      return {
        nombre: MONTH_NAMES_SHORT[i],
        total: evs.length,
        aprobados: evs.filter(e => (e.estado || '').toLowerCase() === 'aprobado').length,
      };
    });
    const maxMes = Math.max(...meses.map(m => m.total), 1);
    const mesTop = [...meses].sort((a, b) => b.total - a.total)[0];
    const facCabeza = facRanking[0];
    const generadoEn = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
    const fmtBsAnio = (n) => 'Bs ' + Math.round(Number(n) || 0).toLocaleString('es-BO');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page{size:A4 portrait;margin:14mm 12mm}
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#f3f4f6;color:#1f2937;font-size:12px;line-height:1.5}
        .wrap{max-width:1000px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08)}
        /* Portada UFT */
        .cover{background:linear-gradient(135deg,#123314 0%,#2d5016 55%,#C44B0A 100%);color:#fff;padding:48px 40px;position:relative}
        .cover .uft-logo{display:flex;align-items:center;gap:14px;margin-bottom:26px}
        .cover .uft-monogram{width:62px;height:62px;border-radius:14px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff}
        .cover .uft-name{font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
        .cover .uft-sub{font-size:11px;opacity:.85}
        .cover .reporte-kicker{font-size:11px;letter-spacing:4px;text-transform:uppercase;opacity:.8;margin-top:6px}
        .cover h1{font-size:34px;font-weight:800;margin:8px 0 6px;line-height:1.15}
        .cover .cover-meta{display:flex;gap:24px;margin-top:20px;flex-wrap:wrap}
        .cover .meta-chip{background:rgba(255,255,255,.12);padding:8px 16px;border-radius:20px;font-size:12px;font-weight:600}
        .cover .accent-bar{position:absolute;left:0;right:0;bottom:0;height:6px;background:#fff}
        @media print{.cover{background:#2d5016}.wrap{box-shadow:none}}
        /* Resumen ejecutivo */
        .exec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0}
        .exec-item{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;border-top:4px solid #C44B0A}
        .exec-item.green{border-top-color:#16a34a}
        .exec-item.blue{border-top-color:#3b82f6}
        .exec-item .k{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#6b7280;margin-bottom:4px}
        .exec-item .v{font-size:22px;font-weight:800;color:#111827}
        .exec-item .s{font-size:11px;color:#6b7280;margin-top:2px}
        /* Secciones y tablas */
        .section-h{font-size:14px;font-weight:800;margin:26px 0 10px;color:#111827;text-transform:uppercase;border-left:4px solid #C44B0A;padding-left:10px;letter-spacing:.5px}
        .main-table{width:100%;border-collapse:collapse;margin-top:10px;background:#fff}
        .main-table th{background:#2d5016;color:#fff;padding:9px 10px;border:1px solid #2d5016;text-align:left;font-weight:700;font-size:11px;letter-spacing:.4px}
        .main-table td{padding:8px 10px;border:1px solid #e5e7eb;vertical-align:top;font-size:11.5px}
        .main-table tr:nth-child(even){background:#f8faf8}
        .bar-track{background:#eef0ee;border-radius:6px;height:12px;overflow:hidden;min-width:100px}
        .bar-fill{height:100%;background:linear-gradient(90deg,#C44B0A,#e2702a);border-radius:6px}
        .info-row{display:flex;gap:12px;margin:16px 0}
        .info-field{flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px}
        .info-label{font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.8px}
        .info-value{font-size:14px;font-weight:600;color:#111827;margin-top:3px}
        .note{background:#f8faf8;border-left:3px solid #C44B0A;padding:12px 16px;margin:20px 0;font-size:12px;color:#374151;border-radius:0 8px 8px 0}
        .content{padding:28px 36px 40px}
        .footer{margin-top:34px;text-align:center;font-size:10.5px;color:#9ca3af;padding:14px 0 4px;border-top:1px solid #e5e7eb;position:relative}
        .footer strong{color:#6b7280}
        @media print{body{background:#fff}.content{padding:20px 8px 30px}}
      </style></head><body><div class="wrap">

      <!-- PORTADA -->
      <div class="cover">
        <div class="uft-logo">
          <div class="uft-monogram">UFT</div>
          <div>
            <div class="uft-name">Universidad Franz Tamayo</div>
            <div class="uft-sub">Autoridad de Fiscalización y Transparencia Universitaria</div>
          </div>
        </div>
        <div class="reporte-kicker">Informe de Gestión</div>
        <h1>Reporte Anual de Eventos ${year}</h1>
        <div class="cover-meta">
          <div class="meta-chip">📅 Periodo: ${year}-01-01 al ${year}-12-31</div>
          <div class="meta-chip">🗂 ${total} eventos registrados</div>
          <div class="meta-chip">👥 ${inscritosAnio} inscritos</div>
        </div>
        <div class="accent-bar"></div>
      </div>

      <div class="content">
      <!-- Resumen ejecutivo -->
      <div class="exec-grid">
        <div class="exec-item"><div class="k">Tasa de Aprobación</div><div class="v" style="color:#16a34a">${tasaAprobacion}%</div><div class="s">${aprobados} de ${total} eventos</div></div>
        <div class="exec-item green"><div class="k">Inscritos / Participantes</div><div class="v" style="color:#3b82f6">${inscritosAnio}</div><div class="s">En eventos del año</div></div>
        <div class="exec-item blue"><div class="k">Mes más activo</div><div class="v" style="color:#C44B0A">${mesTop?.nombre || '—'}</div><div class="s">${mesTop?.total || 0} eventos</div></div>
      </div>

      ${facCabeza ? `<div class="note"><strong>Dato destacado:</strong> la facultad con más inscritos del año fue <strong>${facCabeza.facultad}</strong> con <strong>${facCabeza.inscritos}</strong> participantes.</div>` : ''}

      <!-- Estadísticas del año -->
      <div class="section-h">Indicadores del Año</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Eventos</div>
          <div class="stat-value">${total}</div>
        </div>
        <div class="stat-card" style="border-left-color:#10b981">
          <div class="stat-label">Aprobados</div>
          <div class="stat-value" style="color:#10b981">${aprobados}</div>
        </div>
        <div class="stat-card" style="border-left-color:#f59e0b">
          <div class="stat-label">Pendientes</div>
          <div class="stat-value" style="color:#f59e0b">${pendientes}</div>
        </div>
        <div class="stat-card" style="border-left-color:#dc2626">
          <div class="stat-label">Rechazados</div>
          <div class="stat-value" style="color:#dc2626">${rechazados}</div>
        </div>
        <div class="stat-card" style="border-left-color:#3B82F6">
          <div class="stat-label">Tasa Aprobación</div>
          <div class="stat-value" style="color:#3B82F6">${tasaAprobacion}%</div>
        </div>
        <div class="stat-card" style="border-left-color:#8B5CF6">
          <div class="stat-label">Inscritos</div>
          <div class="stat-value" style="color:#8B5CF6">${inscritosAnio}</div>
        </div>
        ${ecoActivo ? `
        <div class="stat-card" style="border-left-color:#0ea5e9">
          <div class="stat-label">Balance Real</div>
          <div class="stat-value" style="color:#0ea5e9">${fmtBsAnio(ecoResumen.balance_real)}</div>
        </div>
        <div class="stat-card" style="border-left-color:#C44B0A">
          <div class="stat-label">Egresos Real</div>
          <div class="stat-value" style="color:#C44B0A">${fmtBsAnio(ecoResumen.real_egresos)}</div>
        </div>` : ''}
      </div>

      <!-- Actividad mensual -->
      <div class="section-h">Actividad Mensual</div>
      <table class="main-table">
        <thead>
          <tr>
            <th style="width:20%">Mes</th>
            <th style="width:15%">Eventos</th>
            <th style="width:15%">Aprobados</th>
            <th style="width:50%">Distribución</th>
          </tr>
        </thead>
        <tbody>
          ${meses.map(m => `
            <tr>
              <td>${m.nombre}</td>
              <td><strong>${m.total}</strong></td>
              <td style="color:#10b981;font-weight:bold">${m.aprobados}</td>
              <td>
                <div class="bar-track"><div class="bar-fill" style="width:${(m.total / maxMes) * 100}%"></div></div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>

      ${facRanking.length ? `
      <!-- Ranking de facultades -->
      <div class="section-h">Ranking de Facultades por Inscritos</div>
      <table class="main-table">
        <thead>
          <tr>
            <th style="width:8%">#</th>
            <th>Facultad</th>
            <th style="width:16%">Inscritos</th>
          </tr>
        </thead>
        <tbody>
          ${facRanking.map((f, i) => `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td>${f.facultad}</td>
              <td><strong>${f.inscritos}</strong></td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}

      ${ecoActivo ? `
      <!-- Resumen económico -->
      <div class="section-h">Resumen Económico del Año</div>
      <table class="main-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Presupuestado</th>
            <th>Ejecutado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ingresos</td>
            <td>${fmtBsAnio(ecoResumen.pres_ingresos)}</td>
            <td>${fmtBsAnio(ecoResumen.real_ingresos)}</td>
          </tr>
          <tr>
            <td>Egresos</td>
            <td>${fmtBsAnio(ecoResumen.pres_egresos)}</td>
            <td>${fmtBsAnio(ecoResumen.real_egresos)}</td>
          </tr>
          <tr>
            <td><strong>Balance</strong></td>
            <td>–</td>
            <td><strong>${fmtBsAnio(ecoResumen.balance_real)}</strong></td>
          </tr>
        </tbody>
      </table>` : ''}

      <!-- Listado de eventos -->
      <div class="section-h">Listado de Eventos del Año</div>
      <table class="main-table">
        <thead>
          <tr>
            <th style="width:15%">Fecha</th>
            <th style="width:15%">Lugar</th>
            <th style="width:10%">Hora</th>
            <th style="width:30%">Tema</th>
            <th style="width:15%">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${eventosRows}
        </tbody>
      </table>
      
      <div class="footer">
        <strong>Panel de Administración UFT</strong> · Sistema de Gestión de Eventos · Año ${year}<br>
        Generado el ${generadoEn} · Documento confidencial de uso institucional
      </div>
      </div>
      </div></body></html>`;

    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (w) { 
        w.document.write(html); 
        w.document.close(); 
        setTimeout(() => w.print(), 800); 
      } else {
        showError('Permite ventanas emergentes para ver el reporte.');
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Reporte Anual Completo' });
    }
  } catch (err) {
    showError('Error al generar reporte: ' + err.message);
  } finally {
    setLoading(false);
  }
};

  const chartW = windowWidth - 48;

  // 🔥 NUEVO: Tendencias reales (mes actual vs mes anterior) en vez de valores hardcodeados
  const tendReal = (key) => {
    if (!reportesMensuales || reportesMensuales.length < 2) return undefined;
    const c = reportesMensuales[0]?.[key] || 0;
    const p = reportesMensuales[1]?.[key] || 0;
    if (!p) return undefined;
    return Math.round(((c - p) / p) * 100);
  };
  const tendTasa = (() => {
    if (!reportesMensuales || reportesMensuales.length < 2) return undefined;
    const calc = (r) => { const t = r?.totalEvents; return t ? Math.round(((r.aprobado || 0) / t) * 100) : 0; };
    const c = calc(reportesMensuales[0]);
    const p = calc(reportesMensuales[1]);
    if (!p) return undefined;
    return Math.round(((c - p) / p) * 100);
  })();
  const fmtBs = (n) => `Bs ${(Math.round(Number(n) || 0)).toLocaleString('es-BO')}`;
  const faseLabel = (f) => ({ 1: 'Creación', 2: 'Aprobación', 3: 'Programación', 4: 'Cierre' })[Number(f)] || `Fase ${f}`;
  const capStr = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

  // 🔥 NUEVO: Datos del Resumen Ejecutivo (insights + alertas + comparativa anual)
  const resumenData = useMemo(() => {
    const mesesPeriodo = reportesMensuales
      .filter(r => {
        if (!reporteDesde && !reporteHasta) return true;
        if (reporteDesde && r.mes < reporteDesde) return false;
        if (reporteHasta && r.mes > reporteHasta) return false;
        return true;
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));

    const totals = mesesPeriodo.reduce((acc, r) => {
      acc.eventos += r.totalEvents || 0;
      acc.aprobados += r.aprobado || 0;
      acc.pendientes += r.pendiente || 0;
      acc.rechazados += r.rechazado || 0;
      return acc;
    }, { eventos: 0, aprobados: 0, pendientes: 0, rechazados: 0 });

    const mejorMes = mesesPeriodo.length
      ? mesesPeriodo.reduce((a, b) => ((b.totalEvents || 0) > (a.totalEvents || 0) ? b : a))
      : null;

    const tiempoProm = (repOperacionales?.tiempoAprobacionPorMes || []);
    const tiempoPromedio = tiempoProm.length
      ? Math.round(tiempoProm.reduce((s, x) => s + (x.horas || 0), 0) / tiempoProm.length)
      : null;

    const facTop = (repInscripciones?.porFacultad || [])[0];
    const recTop = (repRecursos?.recursosMasUsados || [])[0];
    const tipoTop = (repTipos || [])[0];
    const eco = repEconomicos?.resumen || null;

    const tasaPeriodo = totals.eventos > 0 ? Math.round((totals.aprobados / totals.eventos) * 100) : 0;
    const balancePeriodo = eco ? Number(eco.balance_real) : null;
    const inscritos = Number(repInscripciones?.total) || 0;

    // Comparativa interanual usando el historial mensual (24 meses disponibles)
    const anual = (y) => {
      const m = reportesMensuales.filter(r => r.mes.startsWith(String(y)));
      const ev = m.reduce((s, r) => s + (r.totalEvents || 0), 0);
      const ap = m.reduce((s, r) => s + (r.aprobado || 0), 0);
      const pe = m.reduce((s, r) => s + (r.pendiente || 0), 0);
      return { eventos: ev, aprobados: ap, pendientes: pe, tasa: ev > 0 ? Math.round((ap / ev) * 100) : 0 };
    };
    const anioA = anual(selectedYear);
    const anioB = anual(selectedYear - 1);
    const delta = (a, b) => b > 0 ? Math.round(((a - b) / b) * 100) : undefined;

    // Alertas automáticas
    const alertas = [];
    if (tasaPeriodo < 50 && totals.eventos > 0) {
      alertas.push({ icon: 'warning-outline', type: 'alert', title: 'Baja tasa de aprobación', subtitle: `Solo ${tasaPeriodo}% de los eventos del período fueron aprobados.` });
    }
    if (totals.rechazados > totals.aprobados && totals.eventos > 0) {
      alertas.push({ icon: 'close-circle-outline', type: 'alert', title: 'Rechazos dominan', subtitle: `Hay ${totals.rechazados} rechazados frente a ${totals.aprobados} aprobados en el período.` });
    }
    if (balancePeriodo !== null && balancePeriodo < 0) {
      alertas.push({ icon: 'trending-down-outline', type: 'alert', title: 'Balance económico negativo', subtitle: `El balance real del período es ${fmtBs(balancePeriodo)}.` });
    }
    const conCero = mesesPeriodo.find(r => (r.totalEvents || 0) === 0);
    if (conCero && mesesPeriodo.length >= 3) {
      alertas.push({ icon: 'moon-outline', type: 'info', title: 'Meses sin actividad', subtitle: `${capStr(MONTH_NAMES_FULL[parseInt(conCero.mes.split('-')[1]) - 1])} no registró eventos en el período.` });
    }
    const ultUltimo = mesesPeriodo.slice(-2);
    if (ultUltimo.length === 2 && ultUltimo[1].pendiente > ultUltimo[0].pendiente) {
      alertas.push({ icon: 'hourglass-outline', type: 'info', title: 'Pendientes en aumento', subtitle: `Pasaron de ${ultUltimo[0].pendiente} a ${ultUltimo[1].pendiente} solicitudes pendientes.` });
    }
    if (mejorMes) {
      alertas.push({ icon: 'trophy-outline', type: 'win', title: 'Mes más activo', subtitle: `${capStr(MONTH_NAMES_FULL[parseInt(mejorMes.mes.split('-')[1]) - 1])} con ${mejorMes.totalEvents} eventos.` });
    }

    return {
      totals, mejorMes, tasaPeriodo, balancePeriodo, inscritos, tiempoPromedio,
      facTop, recTop, tipoTop,
      anioA, anioB, deltaEventos: delta(anioA.eventos, anioB.eventos), deltaAprob: delta(anioA.aprobados, anioB.aprobados),
      alertas,
    };
  }, [reportesMensuales, repOperacionales, repInscripciones, repRecursos, repTipos, repEconomicos, reporteDesde, reporteHasta, selectedYear]);

  // 🔥 NUEVO: Datos para la tendencia con comparativa interanual
  const tendenciaAnual = useMemo(() => {
    const cur = (reporteDesde || reporteHasta)
      ? reportesMensuales.filter(r => (reporteDesde ? r.mes >= reporteDesde : true) && (reporteHasta ? r.mes <= reporteHasta : true)).sort((a, b) => a.mes.localeCompare(b.mes))
      : reportesMensuales.filter(r => r.mes.startsWith(String(selectedYear))).sort((a, b) => a.mes.localeCompare(b.mes));
    const prev = reportesMensuales.filter(r => r.mes.startsWith(String(anioComparar))).sort((a, b) => a.mes.localeCompare(b.mes));
    const prevByMonth = {};
    prev.forEach(r => { const [, m] = r.mes.split('-'); prevByMonth[parseInt(m)] = r; });
    const labels = cur.map(r => { const [, m] = r.mes.split('-'); return MONTH_NAMES_SHORT[parseInt(m) - 1]; });
    return {
      labels,
      curAprobados: cur.map(r => r.aprobado || 0),
      curRechazados: cur.map(r => r.rechazado || 0),
      prevAprobados: cur.map(r => { const [, m] = r.mes.split('-'); const p = prevByMonth[parseInt(m)]; return p ? (p.aprobado || 0) : 0; }),
      hasPrev: prev.length > 0,
    };
  }, [reportesMensuales, reporteDesde, reporteHasta, selectedYear, anioComparar]);

  // 🔥 NUEVO: Colores dinámicos según dark mode
  const theme = {
    background: darkMode ? COLORS.darkBackground : COLORS.background,
    surface: darkMode ? COLORS.darkSurface : COLORS.surface,
    textPrimary: darkMode ? COLORS.darkTextPrimary : COLORS.textPrimary,
    textSecondary: darkMode ? COLORS.darkTextSecondary : COLORS.textSecondary,
    border: darkMode ? COLORS.darkBorder : COLORS.border,
    divider: darkMode ? '#374151' : COLORS.divider,
  };

  const barChartConfig = {
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(196, 75, 10, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    propsForBackgroundLines: { stroke: theme.border, strokeWidth: 0.5 },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🔥 NUEVO: Header con tabs y dark mode toggle */}
      <View style={[styles.topHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <AdminHeader
          title="Reportes Avanzados"
          subtitle="Análisis completo del sistema"
          eyebrow="Reportes"
          rightActions={(
            <TouchableOpacity
              style={styles.darkModeToggle}
              onPress={() => setDarkMode(!darkMode)}
              accessibilityRole="button"
              accessibilityLabel="Cambiar tema"
            >
              <Ionicons name={darkMode ? 'sunny' : 'moon'} size={20} color={darkMode ? COLORS.warning : COLORS.white} />
            </TouchableOpacity>
          )}
        />
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { id: 'resumen', label: 'Resumen', icon: 'flash-outline' },
            { id: 'dashboard', label: 'Dashboard', icon: 'speedometer' },
            { id: 'calendario', label: 'Calendario', icon: 'calendar' },
            { id: 'analisis', label: 'Análisis', icon: 'analytics' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive, { backgroundColor: theme.divider }]}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${tab.label}`}
            >
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? COLORS.primary : theme.textSecondary} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive, { color: activeTab === tab.id ? COLORS.primary : theme.textSecondary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 🔥 NUEVO: Barra de filtros visibles */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.filterChipX, { backgroundColor: theme.divider }]}
          onPress={() => setShowDateFilter(true)}
          accessibilityRole="button"
          accessibilityLabel="Filtrar por fechas"
        >
          <Ionicons name="calendar-outline" size={14} color={(reporteDesde || reporteHasta) ? COLORS.primary : theme.textSecondary} />
          <Text style={[styles.filterChipTextX, { color: (reporteDesde || reporteHasta) ? COLORS.primary : theme.textSecondary }]}>
            {reporteDesde ? `${reporteDesde.slice(5)} → ${(reporteHasta || 'hoy').slice(5)}` : 'Fechas'}
          </Text>
          {(reporteDesde || reporteHasta) ? (
            <Ionicons name="close-circle" size={14} color={COLORS.primary} onPress={() => { setReporteDesde(''); setReporteHasta(''); }} />
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChipX, { backgroundColor: theme.divider }]}
          onPress={() => setShowFacultadFilter(true)}
          accessibilityRole="button"
          accessibilityLabel="Filtrar por facultad"
        >
          <Ionicons name="school-outline" size={14} color={selectedFacultad !== 'todas' ? COLORS.primary : theme.textSecondary} />
          <Text style={[styles.filterChipTextX, { color: selectedFacultad !== 'todas' ? COLORS.primary : theme.textSecondary }]} numberOfLines={1}>
            {selectedFacultad === 'todas' ? 'Facultad' : selectedFacultad}
          </Text>
          {selectedFacultad !== 'todas' ? (
            <Ionicons name="close-circle" size={14} color={COLORS.primary} onPress={() => setSelectedFacultad('todas')} />
          ) : null}
        </TouchableOpacity>

        <View style={styles.filterChipSpacer} />
        {(reporteDesde || reporteHasta || selectedFacultad !== 'todas') ? (
          <TouchableOpacity onPress={() => { setReporteDesde(''); setReporteHasta(''); setSelectedFacultad('todas'); }}>
            <Text style={[styles.filterClear, { color: COLORS.primary }]}>Limpiar</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.filterHint, { color: theme.textTertiary ?? COLORS.textTertiary }]} numberOfLines={1}>Rango y facultad aplican a todo el reporte</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loadingMain ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando datos…</Text>
          </View>
        ) : (
          <>
            {/* TAB: RESUMEN EJECUTIVO */}
            {activeTab === 'resumen' && (
              <>
                {/* Comparativa interanual */}
                <View style={styles.section}>
                  <SectionHeader icon="swap-horizontal-outline" title="Comparativa Anual" subtitle={`${selectedYear} vs ${selectedYear - 1}`} />
                  {/* Selector de años */}
                  <View style={styles.kpiGrid}>
                    {years.slice(0, 4).map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.yearChip, selectedYear === y && styles.yearChipActive, { backgroundColor: theme.divider, borderColor: selectedYear === y ? COLORS.primary : theme.border }]}
                        onPress={() => setSelectedYear(y)}
                        accessibilityRole="button"
                        accessibilityLabel={`Comparar año ${y}`}
                      >
                        <Text style={[styles.yearChipText, { color: selectedYear === y ? COLORS.primary : theme.textSecondary }]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.kpiGrid}>
                    <KpiCard label={`Eventos ${selectedYear}`} value={resumenData.anioA.eventos} icon="calendar-outline" color={COLORS.info} trend={resumenData.deltaEventos} sub={`vs ${selectedYear - 1}`} />
                    <KpiCard label={`Aprobados ${selectedYear}`} value={resumenData.anioA.aprobados} icon="checkmark-done-outline" color={COLORS.success} trend={resumenData.deltaAprob} sub={`vs ${selectedYear - 1}`} />
                    <KpiCard label={`Tasa ${selectedYear}`} value={`${resumenData.anioA.tasa}%`} icon="analytics-outline" color={COLORS.primary} sub={`Año ${selectedYear - 1}: ${resumenData.anioB.tasa}%`} />
                    <KpiCard label={`Pendientes ${selectedYear}`} value={resumenData.anioA.pendientes} icon="hourglass-outline" color={COLORS.warning} sub={`Total acumulado`} />
                  </View>
                </View>

                {/* Highlights del período */}
                <View style={styles.section}>
                  <SectionHeader icon="star-outline" title="Highlights del Período" subtitle={reporteDesde || reporteHasta ? 'Con filtro activo' : 'Todos los datos'} />
                  <View style={styles.kpiGrid}>
                    <InsightCard
                      icon="trophy-outline"
                      title="Mes más activo"
                      value={resumenData.mejorMes ? `${MONTH_NAMES_FULL[parseInt(resumenData.mejorMes.mes.split('-')[1]) - 1]} · ${resumenData.mejorMes.totalEvents}` : '–'}
                      subtitle={`${resumenData.mejorMes ? resumenData.mejorMes.aprobado + ' aprobados' : ''}`}
                      type="win"
                    />
                    <InsightCard
                      icon="school-outline"
                      title="Facultad con más inscritos"
                      value={resumenData.facTop ? resumenData.facTop.facultad : '–'}
                      subtitle={resumenData.facTop ? `${resumenData.facTop.inscritos} inscritos` : ''}
                      color={COLORS.info}
                    />
                    <InsightCard
                      icon="cube-outline"
                      title="Recurso más solicitado"
                      value={resumenData.recTop ? resumenData.recTop.nombre : '–'}
                      subtitle={resumenData.recTop ? `${resumenData.recTop.usos} solicitudes` : ''}
                      color={COLORS.purple}
                    />
                    <InsightCard
                      icon="pricetags-outline"
                      title="Tipo de evento más común"
                      value={resumenData.tipoTop ? resumenData.tipoTop.tipo : '–'}
                      subtitle={resumenData.tipoTop ? `${resumenData.tipoTop.total} eventos` : ''}
                      color={COLORS.warning}
                    />
                  </View>
                </View>

                {/* Alertas automáticas */}
                <View style={styles.section}>
                  <SectionHeader icon="notifications-outline" title="Alertas y Observaciones" subtitle="Detectadas automáticamente" />
                  <View style={styles.kpiGrid}>
                    {resumenData.alertas.length ? (
                      resumenData.alertas.slice(0, 6).map((a, i) => (
                        <InsightCard key={i} icon={a.icon} title={a.title} value={a.subtitle} type={a.type} />
                      ))
                    ) : (
                      <InsightCard icon="checkmark-circle-outline" title="Todo en orden" value="No se detectaron alertas en el período" type="win" />
                    )}
                  </View>
                </View>

                {/* KPIs rápidos */}
                <View style={styles.section}>
                  <SectionHeader icon="pulse-outline" title="Métricas del Período" />
                  <View style={styles.kpiGrid}>
                    <KpiCard label="Eventos" value={resumenData.totals.eventos} icon="calendar-outline" color={COLORS.info} sub={`Tasa ${resumenData.tasaPeriodo}%`} />
                    <KpiCard label="Inscritos" value={resumenData.inscritos} icon="person-add-outline" color={COLORS.success} sub="En el período" />
                    <KpiCard label="Balance Real" value={resumenData.balancePeriodo !== null ? fmtBs(resumenData.balancePeriodo) : '–'} icon="wallet-outline" color={resumenData.balancePeriodo >= 0 ? COLORS.success : COLORS.accent} />
                    <KpiCard label="Tiempo Prom." value={resumenData.tiempoPromedio !== null ? `${resumenData.tiempoPromedio}h` : '–'} icon="time-outline" color={COLORS.warning} sub="Para aprobar" />
                  </View>
                </View>

                {/* Actividad mensual del período */}
                <View style={styles.section}>
                  <SectionHeader icon="bar-chart-outline" title={`Actividad ${selectedYear}`} subtitle="Eventos por mes" />
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    {(() => {
                      const mesesA = (reporteDesde || reporteHasta)
                        ? reportesMensuales.filter(r => (reporteDesde ? r.mes >= reporteDesde : true) && (reporteHasta ? r.mes <= reporteHasta : true)).sort((a, b) => a.mes.localeCompare(b.mes))
                        : reportesMensuales.filter(r => r.mes.startsWith(String(selectedYear))).sort((a, b) => a.mes.localeCompare(b.mes));
                      if (!mesesA.length) {
                        return (
                          <View style={styles.emptyChart}>
                            <Ionicons name="bar-chart-outline" size={40} color={COLORS.textTertiary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin datos para este período</Text>
                          </View>
                        );
                      }
                      const maxM = Math.max(...mesesA.map(m => m.totalEvents || 0), 1);
                      return mesesA.map((m, i) => {
                        const [, mm] = m.mes.split('-');
                        return (
                          <MiniBarRow
                            key={i}
                            label={`${MONTH_NAMES_FULL[parseInt(mm) - 1]}`}
                            value={m.totalEvents || 0}
                            color={COLORS.primary}
                            max={maxM}
                          />
                        );
                      });
                    })()}
                  </View>
                </View>
              </>
            )}

            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <>
                {/* KPIs con tendencias */}
                <View style={styles.section}>
                  <SectionHeader icon="pulse-outline" title="Indicadores Clave" subtitle={reporteDesde || reporteHasta ? 'Período filtrado' : 'Métricas principales'} />
                  <View style={styles.kpiGrid}>
                    <KpiCard 
                    label="Usuarios Activos" 
                    value={stats?.activeUsers ?? '–'} 
                    icon="people-outline" 
                    color={COLORS.primary}
                    sub="Cuentas habilitadas"
                  />
                    <KpiCard 
                      label="Eventos Totales" 
                      value={statsFiltrado?.total ?? stats?.totalEvents ?? '–'} 
                      icon="calendar-outline" 
                      color={COLORS.info}
                      trend={tendReal('totalEvents')}
                      sub="vs mes anterior"
                    />
                    <KpiCard 
                      label="Tasa Aprobación" 
                      value={`${statsFiltrado?.tasa ?? stats?.tasaAprobacion ?? 0}%`} 
                      icon="checkmark-done-outline" 
                      color={COLORS.success}
                      trend={tendTasa}
                      sub="Global"
                    />
                    <KpiCard 
                      label="Tiempo Prom." 
                      value={`${repOperacionales?.tiempoAprobacionPorMes?.length ? repOperacionales.tiempoAprobacionPorMes.slice(-1)[0].horas : (stats?.tiempoPromedioAprobacion ?? 0)}h`} 
                      icon="time-outline" 
                      color={COLORS.warning}
                      sub="Para aprobar"
                    />
                    <KpiCard 
                      label="Pendientes" 
                      value={statsFiltrado?.pendientes ?? stats?.estadoCounts?.pendiente ?? 0} 
                      icon="hourglass-outline" 
                      color={COLORS.warning} 
                      sub="Sin revisar"
                      trend={tendReal('pendiente')}
                    />
                    <KpiCard 
                      label="Nuevos Usuarios" 
                      value={stats?.usuariosNuevosEsteMes ?? 0} 
                      icon="person-add-outline" 
                      color={COLORS.purple} 
                      sub="Este mes"
                    />
                  </View>
                </View>

                {/* Gráfico de tendencia con comparativa */}
                {tendenciaAnual.labels.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      icon="trending-up-outline"
                      title={reporteDesde || reporteHasta ? 'Tendencia del Período' : `Tendencia ${selectedYear}`}
                      subtitle={mostrarComparacion && tendenciaAnual.hasPrev ? `vs ${anioComparar}` : 'Mensual'}
                      action={(
                        <View style={styles.compareRow}>
                          <Text style={[styles.compareLabel, { color: theme.textSecondary }]}>vs {anioComparar}</Text>
                          <Switch
                            value={mostrarComparacion}
                            onValueChange={setMostrarComparacion}
                            trackColor={{ false: theme.divider, true: COLORS.primary }}
                            thumbColor={mostrarComparacion ? COLORS.white : COLORS.textTertiary}
                          />
                        </View>
                      )}
                    />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <LineChart
                        data={{
                          labels: tendenciaAnual.labels,
                          datasets: mostrarComparacion && tendenciaAnual.hasPrev
                            ? [
                                { data: tendenciaAnual.curAprobados, color: (o = 1) => `rgba(16, 185, 129, ${o})`, strokeWidth: 3 },
                                { data: tendenciaAnual.prevAprobados, color: (o = 1) => `rgba(59, 130, 246, ${o})`, strokeWidth: 2, dashedArray: [6, 4] },
                              ]
                            : [
                                { data: tendenciaAnual.curAprobados, color: (o = 1) => `rgba(16, 185, 129, ${o})`, strokeWidth: 3 },
                                { data: tendenciaAnual.curRechazados, color: (o = 1) => `rgba(239, 68, 68, ${o})`, strokeWidth: 3 },
                              ],
                        }}
                        width={chartW}
                        height={220}
                        chartConfig={{
                          backgroundColor: theme.surface,
                          backgroundGradientFrom: theme.surface,
                          backgroundGradientTo: theme.surface,
                          decimalPlaces: 0,
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          style: { borderRadius: 16 },
                          propsForDots: { r: '3', strokeWidth: '2', stroke: '#fff' },
                          propsForBackgroundLines: { strokeDasharray: '', stroke: theme.border, strokeWidth: 0.5 },
                        }}
                        bezier
                        style={{ borderRadius: 16 }}
                        fromZero
                      />
                      <View style={styles.legend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Aprobados {selectedYear}</Text>
                        </View>
                        {mostrarComparacion && tendenciaAnual.hasPrev ? (
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: COLORS.info }]} />
                            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Aprobados {anioComparar}</Text>
                          </View>
                        ) : (
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
                            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Rechazados</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* Distribución por estado */}
                <View style={styles.section}>
                  <SectionHeader icon="pie-chart-outline" title="Distribución por Estado" />
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    {eventosPorEstado ? (
                      <PieChart
                        data={eventosPorEstado}
                        width={chartW}
                        height={220}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="10"
                        absolute
                        chartConfig={{ color: (o = 1) => `rgba(0,0,0,${o})` }}
                      />
                    ) : (
                      <View style={styles.emptyChart}>
                        <Ionicons name="pie-chart-outline" size={40} color={COLORS.textTertiary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin datos de estados</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Ranking de facultades con HorizontalBarChart */}
                <View style={styles.section}>
                  <SectionHeader icon="school-outline" title="Ranking de Facultades" subtitle="Top 8 facultades" />
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    {rankingFacultades.length > 0 ? (
                      <HorizontalBarChart data={rankingFacultades} width={chartW} height={350} />
                    ) : (
                      <View style={styles.emptyChart}>
                        <Ionicons name="school-outline" size={40} color={COLORS.textTertiary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin datos de facultades</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Histórico mensual */}
                {reportesMensuales.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="bar-chart-outline" title="Histórico Mensual" subtitle="Últimos períodos" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <View style={[styles.tableRow, styles.tableHead]}>
                        {['Mes', 'Eventos', 'Aprob.', 'Tasa', 'Acción'].map((h, i) => (
                          <Text key={i} style={[styles.tableHeadText, { color: theme.textSecondary }, i === 0 ? { flex: 2 } : { flex: 1, textAlign: 'center' }]}>{h}</Text>
                        ))}
                      </View>
                      {reportesMensuales.map((r, i) => {
                        const [y, m] = r.mes.split('-');
                        const ap = r.aprobado || 0;
                        const pe = r.pendiente || 0;
                        const re = r.rechazado || 0;
                        const tot = r.totalEvents || (ap + pe + re);
                        const tasa = r.tasaAprobacion || (tot > 0 ? Math.round((ap / tot) * 100) : 0);
                        const mesTexto = `${MONTH_NAMES_SHORT[parseInt(m) - 1]} ${y}`;

                        return (
                          <View key={i} style={[styles.tableRow, { borderBottomColor: theme.divider }, i % 2 === 0 && { backgroundColor: theme.divider }]}>
                            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.tableCell, { color: theme.textPrimary, flex: 2 }]}>{mesTexto}</Text>
                            <Text numberOfLines={1} style={[styles.tableCell, { color: theme.textPrimary, flex: 1, textAlign: 'center' }]}>{tot}</Text>
                            <Text numberOfLines={1} style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.success, fontWeight: '600' }]}>{ap}</Text>
                            <Text numberOfLines={1} style={[styles.tableCell, { color: theme.textPrimary, flex: 1, textAlign: 'center' }]}>{tasa}%</Text>
                            <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => generarPDF(r.mes)}>
                              <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* TAB: CALENDARIO */}
            {activeTab === 'calendario' && (
              <>
                <View style={styles.section}>
                  <SectionHeader icon="calendar-outline" title="Calendario de Actividad" subtitle={`${reporteDesde || reporteHasta ? 'Período filtrado' : 'Últimas 52 semanas'}`} />
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <CalendarHeatmap data={heatmapData} width={chartW} />
                    <View style={styles.heatmapLegend}>
                      <Text style={[styles.heatmapLegendText, { color: theme.textSecondary }]}>Menos</Text>
                      <View style={styles.heatmapLegendColors}>
                        <View style={[styles.heatmapLegendBox, { backgroundColor: COLORS.divider }]} />
                        <View style={[styles.heatmapLegendBox, { backgroundColor: '#BBF7D0' }]} />
                        <View style={[styles.heatmapLegendBox, { backgroundColor: '#86EFAC' }]} />
                        <View style={[styles.heatmapLegendBox, { backgroundColor: '#22C55E' }]} />
                        <View style={[styles.heatmapLegendBox, { backgroundColor: '#16A34A' }]} />
                      </View>
                      <Text style={[styles.heatmapLegendText, { color: theme.textSecondary }]}>Más</Text>
                    </View>
                  </View>
                </View>

                {/* Resumen mensual */}
                <View style={styles.section}>
                  <SectionHeader icon="bar-chart-outline" title="Resumen Mensual" subtitle="Eventos por mes del período" />
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    {(() => {
                      const mesesC = (reporteDesde || reporteHasta)
                        ? reportesMensuales.filter(r => (reporteDesde ? r.mes >= reporteDesde : true) && (reporteHasta ? r.mes <= reporteHasta : true)).sort((a, b) => a.mes.localeCompare(b.mes))
                        : reportesMensuales.slice(0, 12).sort((a, b) => a.mes.localeCompare(b.mes));
                      if (!mesesC.length) {
                        return (
                          <View style={styles.emptyChart}>
                            <Ionicons name="bar-chart-outline" size={40} color={COLORS.textTertiary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin datos para este período</Text>
                          </View>
                        );
                      }
                      const maxC = Math.max(...mesesC.map(m => m.totalEvents || 0), 1);
                      return mesesC.slice(0, 12).map((m, i) => {
                        const [, mm] = m.mes.split('-');
                        const ap = m.aprobado || 0;
                        const pe = m.pendiente || 0;
                        const t = m.totalEvents || 0;
                        return (
                          <View key={i} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, flex: 1 }}>{MONTH_NAMES_FULL[parseInt(mm) - 1]}</Text>
                              <Text style={{ fontSize: 12, color: theme.textSecondary }}>{pe} pend · </Text>
                              <Text style={{ fontSize: 12, color: COLORS.success, fontWeight: '600' }}>{ap} ap.</Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.primary, marginLeft: 10, width: 32, textAlign: 'right' }}>{t}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                              <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: theme.divider, overflow: 'hidden' }}>
                                <View style={{ width: `${(t / maxC) * 100}%`, height: '100%', borderRadius: 5, backgroundColor: COLORS.primary }} />
                              </View>
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </View>
                </View>

                {/* Patrón por trimestre */}
                <View style={styles.section}>
                  <SectionHeader icon="git-network-outline" title="Patrón por Trimestre" subtitle="Concentración de actividad" />
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    {(() => {
                      const trimestre = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
                      const mesesT = (reporteDesde || reporteHasta)
                        ? reportesMensuales.filter(r => (reporteDesde ? r.mes >= reporteDesde : true) && (reporteHasta ? r.mes <= reporteHasta : true))
                        : reportesMensuales.slice(0, 12);
                      mesesT.forEach(r => {
                        const mm = parseInt(r.mes.split('-')[1]);
                        if (mm <= 3) trimestre.Q1 += r.totalEvents || 0;
                        else if (mm <= 6) trimestre.Q2 += r.totalEvents || 0;
                        else if (mm <= 9) trimestre.Q3 += r.totalEvents || 0;
                        else trimestre.Q4 += r.totalEvents || 0;
                      });
                      const maxQ = Math.max(...Object.values(trimestre), 1);
                      return Object.entries(trimestre).map(([q, v]) => (
                        <MiniBarRow key={q} label={`Trimestre ${q.replace('Q', '')}`} value={v} color={COLORS.info} max={maxQ} />
                      ));
                    })()}
                  </View>
                </View>

                {/* Días más activos */}
                <View style={styles.section}>
                  <SectionHeader icon="flash-outline" title="Días Más Activos" subtitle="Top 5 fechas con más eventos" />
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    {diasActivos.length ? (
                      diasActivos.map((d, i) => (
                        <View key={i} style={[styles.tableRow, { borderBottomColor: theme.divider }, i % 2 === 0 && { backgroundColor: theme.divider }]}>
                          <Text style={[styles.diasRank, { color: COLORS.primary }]}>#{i + 1}</Text>
                          <Text style={[styles.tableCell, { color: theme.textPrimary, flex: 2 }]}>
                            {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Text>
                          <Text style={[styles.tableCell, { color: COLORS.success, fontWeight: '700', textAlign: 'right' }]}>{d.total} eventos</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyChart}>
                        <Ionicons name="calendar-outline" size={40} color={COLORS.textTertiary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin actividad registrada</Text>
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}

            {/* TAB: ANÁLISIS */}
            {activeTab === 'analisis' && (
              <View style={styles.section}>
                <SectionHeader icon="analytics-outline" title="Análisis Detallado" subtitle="Métricas consolidadas" />

                {/* KPIs ampliados */}
                <View style={styles.kpiGrid}>
                  <KpiCard label="Inscritos Totales" value={repInscripciones?.total ?? '–'} icon="person-add-outline" color={COLORS.info} sub="En todos los eventos" />
                  <KpiCard label="Balance Real" value={repEconomicos?.resumen ? fmtBs(repEconomicos.resumen.balance_real) : '–'} icon="wallet-outline" color={COLORS.success} sub="Informes de cierre" />
                  <KpiCard label="Tiempo Prom. Aprobación" value={repOperacionales?.tiempoAprobacionPorMes?.length ? `${repOperacionales.tiempoAprobacionPorMes.slice(-1)[0].horas}h` : '–'} icon="time-outline" color={COLORS.warning} sub="Último mes" />
                  <KpiCard label="Recursos Solicitados" value={repRecursos?.totalSolicitudes ?? '–'} icon="cube-outline" color={COLORS.purple} sub="Este mes" />
                </View>

                {/* Sub-tabs de análisis */}
                <View style={styles.analisisSubTabs}>
                  {[
                    { id: 'inscripciones', label: 'Inscripciones', icon: 'person-add-outline' },
                    { id: 'operacional', label: 'Operacional', icon: 'git-branch-outline' },
                    { id: 'economico', label: 'Económico', icon: 'wallet-outline' },
                    { id: 'recursos', label: 'Recursos', icon: 'cube-outline' },
                  ].map(st => (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.analisisSubTab, { borderColor: analisisSub === st.id ? COLORS.primary : theme.border }, analisisSub === st.id && styles.analisisSubTabActive]}
                      onPress={() => setAnalisisSub(st.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver ${st.label}`}
                    >
                      <Ionicons name={st.icon} size={14} color={analisisSub === st.id ? COLORS.white : theme.textSecondary} />
                      <Text style={[styles.analisisSubTabText, { color: analisisSub === st.id ? COLORS.white : theme.textSecondary }]}>{st.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Distribución por tipo de evento */}
                {analisisSub === 'inscripciones' && repTipos.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="pricetags-outline" title="Eventos por Tipo" subtitle="Distribución" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <PieChart
                        data={repTipos.map((t, i) => ({
                          name: String(t.tipo).length > 16 ? String(t.tipo).slice(0, 16) + '…' : t.tipo,
                          population: t.total,
                          color: ['#C44B0A', '#3B82F6', '#16A34A', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'][i % 8],
                          legendFontColor: theme.textSecondary,
                          legendFontSize: 11,
                        }))}
                        width={chartW}
                        height={200}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="10"
                        absolute
                        chartConfig={{ color: (o = 1) => `rgba(0,0,0,${o})` }}
                      />
                    </View>
                  </View>
                )}

                {/* Funnel por fase */}
                {analisisSub === 'operacional' && repOperacionales?.porFase?.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="git-branch-outline" title="Embudo por Fase" subtitle="Eventos en cada etapa" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      {repOperacionales.porFase
                        .slice()
                        .sort((a, b) => a.idfase - b.idfase)
                        .map((f, i) => {
                          const max = Math.max(...repOperacionales.porFase.map(x => x.total), 1);
                          return (
                            <View key={i} style={styles.funnelRow}>
                              <View style={styles.funnelLabelWrap}>
                                <Text style={[styles.funnelLabel, { color: theme.textPrimary }]}>{faseLabel(f.idfase)}</Text>
                                <Text style={[styles.funnelCount, { color: COLORS.primary }]}>{f.total}</Text>
                              </View>
                              <View style={[styles.funnelTrack, { backgroundColor: theme.divider }]}>
                                <View style={[styles.funnelFill, { width: `${(f.total / max) * 100}%`, backgroundColor: COLORS.primary }]} />
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  </View>
                )}

                {/* Top eventos con más inscritos */}
                {analisisSub === 'inscripciones' && repInscripciones?.topEventos?.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="ribbon-outline" title="Eventos con más Inscritos" subtitle="Top 10" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <HorizontalBarChart
                        data={repInscripciones.topEventos.map(e => ({ label: e.nombreevento, value: e.inscritos }))}
                        width={chartW}
                        height={Math.min(repInscripciones.topEventos.length * 50 + 40, 400)}
                      />
                    </View>
                  </View>
                )}

                {/* Inscripciones por mes */}
                {analisisSub === 'inscripciones' && repInscripciones?.porMes?.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="calendar-outline" title="Inscripciones por Mes" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <BarChart
                        data={{
                          labels: repInscripciones.porMes.map(r => { const [, m] = r.mes.split('-'); return MONTH_NAMES_SHORT[parseInt(m) - 1]; }),
                          datasets: [{ data: repInscripciones.porMes.map(r => r.inscritos) }],
                        }}
                        width={chartW}
                        height={220}
                        chartConfig={barChartConfig}
                        style={{ borderRadius: 16 }}
                        fromZero
                      />
                    </View>
                  </View>
                )}

                {/* Tiempo de aprobación por mes */}
                {analisisSub === 'operacional' && repOperacionales?.tiempoAprobacionPorMes?.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="timer-outline" title="Tiempo de Aprobación" subtitle="Horas promedio por mes" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <BarChart
                        data={{
                          labels: repOperacionales.tiempoAprobacionPorMes.map(r => { const [, m] = r.mes.split('-'); return MONTH_NAMES_SHORT[parseInt(m) - 1]; }),
                          datasets: [{ data: repOperacionales.tiempoAprobacionPorMes.map(r => r.horas) }],
                        }}
                        width={chartW}
                        height={220}
                        chartConfig={barChartConfig}
                        style={{ borderRadius: 16 }}
                        fromZero
                      />
                      <Text style={[styles.chartHint, { color: theme.textSecondary }]}>Desde la creación del evento hasta su aprobación</Text>
                    </View>
                  </View>
                )}

                {/* Balance económico por mes */}
                {analisisSub === 'economico' && repEconomicos?.porMes?.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="trending-down-outline" title="Balance Económico por Mes" subtitle="Egresos vs Ingresos reales" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <BarChart
                        data={{
                          labels: repEconomicos.porMes.map(r => { const [, m] = r.mes.split('-'); return MONTH_NAMES_SHORT[parseInt(m) - 1]; }),
                          datasets: [
                            { data: repEconomicos.porMes.map(r => r.egresos), color: (o = 1) => `rgba(239, 68, 68, ${o})` },
                            { data: repEconomicos.porMes.map(r => r.ingresos), color: (o = 1) => `rgba(22, 163, 74, ${o})` },
                          ],
                        }}
                        width={chartW}
                        height={220}
                        chartConfig={barChartConfig}
                        style={{ borderRadius: 16 }}
                        fromZero
                      />
                      <View style={styles.legend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
                          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Egresos</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Ingresos</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Costo promedio por facultad */}
                {analisisSub === 'economico' && repEconomicos?.porFacultad?.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="business-outline" title="Costo Promedio por Facultad" subtitle="Egresos reales (promedio)" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <HorizontalBarChart
                        data={repEconomicos.porFacultad.map(f => ({ label: f.facultad, value: f.egresos_promedio }))}
                        width={chartW}
                        height={Math.min(repEconomicos.porFacultad.length * 50 + 40, 400)}
                      />
                    </View>
                  </View>
                )}

                {/* Presupuesto vs Real */}
                {analisisSub === 'economico' && repEconomicos?.porEvento?.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="swap-horizontal-outline" title="Presupuesto vs Real" subtitle="Últimos eventos con informe" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <View style={[styles.tableRow, styles.tableHead]}>
                        {['Evento', 'Pres. Egr.', 'Real Egr.', 'Balance'].map((h, i) => (
                          <Text key={i} style={[styles.tableHeadText, { color: theme.textSecondary }, i === 0 ? { flex: 2 } : { flex: 1, textAlign: 'right' }]}>{h}</Text>
                        ))}
                      </View>
                      {repEconomicos.porEvento.slice(0, 8).map((ev, i) => (
                        <View key={i} style={[styles.tableRow, { borderBottomColor: theme.divider }, i % 2 === 0 && { backgroundColor: theme.divider }]}>
                          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.tableCell, { color: theme.textPrimary, flex: 2 }]}>{ev.nombreevento}</Text>
                          <Text style={[styles.tableCell, { color: theme.textTertiary, flex: 1, textAlign: 'right' }]}>{fmtBs(ev.pres_egresos)}</Text>
                          <Text style={[styles.tableCell, { color: theme.textPrimary, flex: 1, textAlign: 'right' }]}>{fmtBs(ev.real_egresos)}</Text>
                          <Text style={[styles.tableCell, { color: ev.balance_real >= 0 ? COLORS.success : COLORS.accent, fontWeight: '700', flex: 1, textAlign: 'right' }]}>{fmtBs(ev.balance_real)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Recursos más usados */}
                {analisisSub === 'recursos' && repRecursos?.recursosMasUsados?.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="cube-outline" title="Recursos Más Solicitados" subtitle="Este mes" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <HorizontalBarChart
                        data={repRecursos.recursosMasUsados.map(r => ({ label: r.nombre, value: r.usos }))}
                        width={chartW}
                        height={Math.min(repRecursos.recursosMasUsados.length * 50 + 40, 400)}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Exportar y Reportes */}
            <View style={styles.section}>
              <SectionHeader icon="settings-outline" title="Exportar y Reportes" />
              
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]} 
                onPress={() => generarReporteAnual(new Date().getFullYear())}
              >
                <Ionicons name="document-lock-outline" size={22} color="#F59E0B" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionTitle, { color: '#F59E0B' }]}>Reporte Anual Completo {new Date().getFullYear()}</Text>
                  <Text style={styles.actionSub}>PDF con TODOS los eventos y facultades del año</Text>
                </View>
                {loading && <ActivityIndicator size="small" color="#F59E0B" />}
                <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#F3E8FF', borderColor: '#8B5CF6' }]} 
                onPress={cargarEventosParaPicker}
              >
                <Ionicons name="list-circle-outline" size={22} color={COLORS.purple} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionTitle, { color: COLORS.purple }]}>Ver Detalle de Evento</Text>
                  <Text style={styles.actionSub}>Selecciona 1 evento para ver toda su información</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.purple} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primaryLight }]} onPress={() => setShowSelector(true)}>
                <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionTitle, { color: COLORS.primary }]}>Reporte Mensual PDF</Text>
                  <Text style={styles.actionSub}>Selecciona mes y año para generar</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]} onPress={exportarExcel}>
                <Ionicons name="file-tray-full-outline" size={22} color={COLORS.info} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionTitle, { color: COLORS.info }]}>Exportar a Excel (CSV)</Text>
                  <Text style={styles.actionSub}>CSV con separador «;» compatible con Excel</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.info} />
              </TouchableOpacity>

              
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {showSelector && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Seleccionar Mes y Año</Text>
            
            <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Año</Text>
            <TouchableOpacity style={[styles.pickerBtn, { borderColor: theme.border, backgroundColor: theme.divider }]} onPress={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}>
              <Text style={[styles.pickerBtnText, { color: theme.textPrimary }]}>{selectedYear}</Text>
              <Ionicons name={showYearPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textPrimary} />
            </TouchableOpacity>
            {showYearPicker && (
              <View style={[styles.dropdown, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                {years.map(y => (
                  <TouchableOpacity key={y} style={[styles.dropItem, { borderColor: theme.divider }, selectedYear === y && styles.dropItemActive]}
                    onPress={() => { setSelectedYear(y); setShowYearPicker(false); }}>
                    <Text style={[styles.dropText, { color: theme.textPrimary }, selectedYear === y && { color: COLORS.primary, fontWeight: '700' }]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.pickerLabel, { marginTop: 12, color: theme.textSecondary }]}>Mes</Text>
            <TouchableOpacity style={[styles.pickerBtn, { borderColor: theme.border, backgroundColor: theme.divider }]} onPress={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}>
              <Text style={[styles.pickerBtnText, { color: theme.textPrimary }]}>{MONTH_NAMES_FULL[selectedMonth - 1]}</Text>
              <Ionicons name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textPrimary} />
            </TouchableOpacity>
            {showMonthPicker && (
              <ScrollView style={[styles.dropdown, { borderColor: theme.border, backgroundColor: theme.surface }]} nestedScrollEnabled>
                {months.map(mo => (
                  <TouchableOpacity key={mo.value} style={[styles.dropItem, { borderColor: theme.divider }, selectedMonth === mo.value && styles.dropItemActive]}
                    onPress={() => { setSelectedMonth(mo.value); setShowMonthPicker(false); }}>
                    <Text style={[styles.dropText, { color: theme.textPrimary }, selectedMonth === mo.value && { color: COLORS.primary, fontWeight: '700' }]}>{mo.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.secondary }]} onPress={() => setShowSelector(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={() => {
                const mes = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
                setShowSelector(false);
                generarPDF(mes);
              }}>
                <Text style={styles.modalBtnText}>Generar PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 2. MODAL: Selector de Evento para Detalle */}
      {showEventPicker && (
        <View style={styles.overlay}>
          <View style={[styles.modal, { width: '90%', maxWidth: 420, maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Seleccionar Evento</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 12, textAlign: 'center' }}>
              Toca un evento para ver todos sus detalles completos
            </Text>
            
            <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
              {todosLosEventos.length === 0 ? (
                <View style={styles.emptyChart}>
                  <Ionicons name="calendar-outline" size={40} color={COLORS.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay eventos disponibles</Text>
                </View>
              ) : (
                todosLosEventos.map((ev, i) => (
                  <TouchableOpacity
                    key={ev.idevento || i}
                    style={[styles.dropItem, { paddingVertical: 12, paddingHorizontal: 14, borderColor: theme.divider }]}
                    onPress={() => navegarADetalleEvento(ev)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dropText, { color: theme.textPrimary, fontWeight: '700', marginBottom: 4, fontSize: 14 }]} numberOfLines={1}>
                          {ev.nombreevento || 'Sin nombre'}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                          {ev.fechaevento ? new Date(ev.fechaevento).toLocaleDateString('es-ES') : 'Sin fecha'} · {ev.lugarevento || 'Sin lugar'}
                        </Text>
                      </View>
                      <View style={[styles.badge, ev.estado === 'aprobado' ? styles.badgeaprobado : ev.estado === 'pendiente' ? styles.badgependiente : styles.badgerechazado]}>
                        <Text style={styles.badgeText}>{(ev.estado || 'N/A').charAt(0).toUpperCase() + (ev.estado || '').slice(1)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.secondary }]} onPress={() => setShowEventPicker(false)}>
                <Text style={styles.modalBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 3. MODAL: Filtro de Fechas */}
      {showDateFilter && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Filtrar por Fechas</Text>

            {/* Atajos rápidos */}
            <View style={styles.quickRanges}>
              {[
                { label: 'Este año', calc: () => [new Date().getFullYear() + '-01-01', ''] },
                { label: 'Año anterior', calc: () => [(new Date().getFullYear() - 1) + '-01-01', (new Date().getFullYear() - 1) + '-12-31'] },
                { label: 'Este mes', calc: () => { const d = new Date(); return [d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01', '']; } },
                { label: 'Últimos 6 meses', calc: () => { const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); return [d.toISOString().split('T')[0], '']; } },
              ].map(p => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.rangeChip, { backgroundColor: theme.divider, borderColor: theme.border }]}
                  onPress={() => { const [d, h] = p.calc(); setReporteDesde(d); setReporteHasta(h); setShowDateFilter(false); }}
                  accessibilityRole="button"
                  accessibilityLabel={p.label}
                >
                  <Text style={[styles.rangeChipText, { color: theme.textPrimary }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.rangeChip, { backgroundColor: theme.divider, borderColor: theme.border }]}
                onPress={() => { setReporteDesde(''); setReporteHasta(''); setShowDateFilter(false); }}
              >
                <Text style={[styles.rangeChipText, { color: COLORS.primary, fontWeight: '700' }]}>Todo</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Fecha Inicio (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.pickerBtn, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.divider }]}
              placeholder="2024-01-01"
              placeholderTextColor={COLORS.textTertiary}
              accessibilityLabel="Fecha Inicio"
              value={reporteDesde}
              onChangeText={setReporteDesde}
            />
            <Text style={[styles.pickerLabel, { marginTop: 12, color: theme.textSecondary }]}>Fecha Fin (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.pickerBtn, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.divider }]}
              placeholder="2024-12-31"
              placeholderTextColor={COLORS.textTertiary}
              accessibilityLabel="Fecha Fin"
              value={reporteHasta}
              onChangeText={setReporteHasta}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.secondary }]} onPress={() => setShowDateFilter(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={() => setShowDateFilter(false)}>
                <Text style={styles.modalBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 4. MODAL: Filtro de Facultad */}
      {showFacultadFilter && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Seleccionar Facultad</Text>
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              <TouchableOpacity 
                style={[styles.dropItem, { borderColor: theme.divider }, selectedFacultad === 'todas' && styles.dropItemActive]}
                onPress={() => { setSelectedFacultad('todas'); setShowFacultadFilter(false); }}
              >
                <Text style={[styles.dropText, { color: theme.textPrimary }, selectedFacultad === 'todas' && { color: COLORS.primary, fontWeight: '700' }]}>Todas las facultades</Text>
              </TouchableOpacity>
              {todasFacultades.map((fac, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.dropItem, { borderColor: theme.divider }, selectedFacultad === fac && styles.dropItemActive]}
                  onPress={() => { setSelectedFacultad(fac); setShowFacultadFilter(false); }}
                >
                  <Text style={[styles.dropText, { color: theme.textPrimary }, selectedFacultad === fac && { color: COLORS.primary, fontWeight: '700' }]} numberOfLines={1}>{fac}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.secondary }]} onPress={() => setShowFacultadFilter(false)}>
                <Text style={styles.modalBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 60 },
  centered: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14 },

  // Header mejorado
  topHeader: { borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  topTitle: { fontSize: 28, fontWeight: '800' },
  topSub: { fontSize: 14, marginTop: 2 },
  darkModeToggle: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  
  // Tabs
  tabsContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: { fontWeight: '700' },

  // Filtros avanzados
  filtersCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  filtersHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: '700' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },

  // 🔥 NUEVO: Barra de filtros
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, flexWrap: 'wrap' },
  filterChipX: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, maxWidth: 170 },
  filterChipTextX: { fontSize: 12, fontWeight: '600' },
  filterChipSpacer: { flex: 1 },
  filterClear: { fontSize: 12, fontWeight: '700' },
  filterHint: { fontSize: 11, flexShrink: 1 },
  quickRanges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  rangeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  rangeChipText: { fontSize: 12, fontWeight: '600' },

  // 🔥 NUEVO: Chips de comparativa anual
  yearChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, minWidth: 56, alignItems: 'center' },
  yearChipActive: { borderWidth: 1.5 },
  yearChipText: { fontSize: 14, fontWeight: '700' },

  // 🔥 NUEVO: Insights del resumen
  insightIconWrap: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  insightValue: { fontSize: 15, fontWeight: '800', marginBottom: 1 },
  insightTitle: { fontSize: 13, fontWeight: '600' },
  insightSub: { fontSize: 11, marginTop: 2 },

  // 🔥 NUEVO: Toggle comparativa
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compareLabel: { fontSize: 11, fontWeight: '600' },

  // 🔥 NUEVO: Sub-tabs de análisis
  analisisSubTabs: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  analisisSubTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  analisisSubTabActive: { backgroundColor: COLORS.primary },
  analisisSubTabText: { fontSize: 12, fontWeight: '700' },

  // Ranking de días
  diasRank: { fontSize: 13, fontWeight: '800', width: 30 },
  quickFilters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  activeFilters: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  activeFilterTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.primaryLight, borderRadius: 16 },
  activeFilterText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // KPIs mejorados
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, width: '47.5%', borderTopWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  kpiIconWrap: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendUp: { backgroundColor: '#D1FAE5' },
  trendDown: { backgroundColor: '#FEE2E2' },
  trendText: { fontSize: 11, fontWeight: '700' },
  kpiValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  kpiSub: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

  // Gráficos
  card: { borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },

  // Heatmap
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  heatmapLegendColors: { flexDirection: 'row', gap: 4 },
  heatmapLegendBox: { width: 16, height: 16, borderRadius: 3 },
  heatmapLegendText: { fontSize: 11 },

  // Funnel por fase
  funnelRow: { marginBottom: 12 },
  funnelLabelWrap: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  funnelLabel: { fontSize: 13, fontWeight: '600' },
  funnelCount: { fontSize: 13, fontWeight: '700' },
  funnelTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  funnelFill: { height: '100%', borderRadius: 5 },
  chartHint: { fontSize: 11, marginTop: 8, textAlign: 'center' },

  // Estadísticas
  statsGrid: { flexDirection: 'row', gap: 16 },
  statItem: { flex: 1, padding: 12, backgroundColor: COLORS.divider, borderRadius: 8 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },

  // Tabla
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center' },
  tableHead: { borderBottomWidth: 2 },
  tableHeadText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tableCell: { fontSize: 13 },

  // Filtros estado
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  filterTextActive: { color: COLORS.white, fontWeight: '700' },

  // Filtros avanzados (búsqueda, fechas, facultad)
  filterAdvancedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  searchBox: { flex: 1, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  // Eventos
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  eventName: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  eventMeta: { fontSize: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeaprobado: { backgroundColor: '#D1FAE5' },
  badgependiente: { backgroundColor: '#FEF3C7' },
  badgerechazado: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Acciones
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  actionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  actionSub: { fontSize: 12, color: COLORS.textSecondary },

  // Utilidades
  emptyChart: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 8, fontSize: 13 },

  // Modales (simplificado)
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  pickerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.background },
  pickerBtnText: { fontSize: 15, fontWeight: '500' },
  dropdown: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4, maxHeight: 160, backgroundColor: COLORS.surface },
  dropItem: { paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: COLORS.divider },
  dropItemActive: { backgroundColor: COLORS.primaryLight },
  dropText: { fontSize: 14 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

export default ReportesAvanzadosScreen;