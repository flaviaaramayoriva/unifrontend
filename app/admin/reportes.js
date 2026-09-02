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
import Svg, { Rect, Text as SvgText, G, Line } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FFEDD5',
  secondary: '#4B5563',
  accent: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  purple: '#8B5CF6',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  white: '#FFFFFF',
  error: '#DC2626',
  // Dark mode colors
  darkBackground: '#111827',
  darkSurface: '#1F2937',
  darkTextPrimary: '#F9FAFB',
  darkTextSecondary: '#D1D5DB',
  darkBorder: '#374151',
};

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
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
  const barHeight = 36;
  const spacing = 14;
  const totalHeight = Math.min(data.length * (barHeight + spacing) + 40, height);
  const CHART_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F59E0B', '#10B981'];
  const labelWidth = 120;

  return (
    <Svg width={width} height={totalHeight}>
      {data.map((d, i) => {
        const barMaxWidth = width - labelWidth - 60;
        const barWidth = (d.value / max) * barMaxWidth;
        const y = 20 + i * (barHeight + spacing);
        const color = CHART_COLORS[i % CHART_COLORS.length];

        return (
          <G key={i}>
            <SvgText x={0} y={y + barHeight / 2 + 4} fontSize="12" fill={COLORS.textPrimary} fontWeight="600">
              {d.label.length > 18 ? d.label.slice(0, 18) + '…' : d.label}
            </SvgText>
            <Rect x={labelWidth} y={y} width={barMaxWidth} height={barHeight} fill={COLORS.divider} rx={8} />
            <Rect x={labelWidth} y={y} width={barWidth} height={barHeight} fill={color} rx={8} />
            <SvgText x={width - 10} y={y + barHeight / 2 + 4} fontSize="14" fill={color} fontWeight="700" textAnchor="end">
              {d.value}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

// 🔥 NUEVO: Componente Heatmap Calendar
const CalendarHeatmap = ({ data, width }) => {
  const cellSize = 16;
  const cellGap = 3;
  const weeks = 52;
  const days = 7;
  
  const getColor = (value) => {
    if (!value || value === 0) return COLORS.divider;
    if (value <= 2) return '#BBF7D0';
    if (value <= 5) return '#86EFAC';
    if (value <= 10) return '#22C55E';
    return '#16A34A';
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={weeks * (cellSize + cellGap) + 40} height={days * (cellSize + cellGap) + 30}>
        {DAYS_SHORT.map((day, i) => (
          <SvgText key={i} x={0} y={i * (cellSize + cellGap) + 12} fontSize="8" fill={COLORS.textTertiary}>{day}</SvgText>
        ))}
        {Array.from({ length: weeks }).map((_, week) => 
          Array.from({ length: days }).map((_, day) => {
            const date = new Date();
            date.setDate(date.getDate() - (weeks - week) * 7 + day);
            const dateStr = date.toISOString().split('T')[0];
            const value = data[dateStr] || 0;
            
            return (
              <Rect
                key={`${week}-${day}`}
                x={week * (cellSize + cellGap) + 25}
                y={day * (cellSize + cellGap) + 15}
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

// 🔥 NUEVO: KPI con tendencia
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
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, calendario, analisis

  // Selectores
  const [showSelector, setShowSelector] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [todosLosEventos, setTodosLosEventos] = useState([]);

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

      const [statsRes, mensualRes, eventosRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/dashboard/mensual`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/eventos`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const data = statsRes.data;
      setStats(data);

      // Extraer todas las facultades únicas
      if (data.eventosPorFacultad) {
        const facs = [...new Set(data.eventosPorFacultad.map(f => f.facultad))].filter(Boolean);
        setTodasFacultades(facs);
      }

      // Pie chart estados
      if (data.estadoCounts) {
        const colorMap = { aprobado: COLORS.success, pendiente: COLORS.warning, rechazado: COLORS.accent };
        const pie = Object.entries(data.estadoCounts)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => ({
            name: k.charAt(0).toUpperCase() + k.slice(1),
            population: v,
            color: colorMap[k.toLowerCase()] || COLORS.info,
            legendFontColor: darkMode ? COLORS.darkTextPrimary : COLORS.textPrimary,
            legendFontSize: 12,
          }));
        setEventosPorEstado(pie.length ? pie : null);
      }

      // Ranking facultades
      if (Array.isArray(data.eventosPorFacultad)) {
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

      // 🔥 NUEVO: Datos para gráfico de tendencia
      const trend = reportes.slice(0, 6).reverse().map(r => {
        const [y, m] = r.mes.split('-');
        return {
          month: `${MONTH_NAMES_SHORT[parseInt(m) - 1]}`,
          aprobados: r.aprobado || 0,
          rechazados: r.rechazado || 0,
        };
      });
      setTrendData(trend);

      //  NUEVO: Heatmap data
      const eventos = Array.isArray(eventosRes.data) ? eventosRes.data : [];
      const heatData = {};
      eventos.forEach(ev => {
        if (ev.fechaevento) {
          const dateStr = ev.fechaevento.split('T')[0];
          heatData[dateStr] = (heatData[dateStr] || 0) + 1;
        }
      });
      setHeatmapData(heatData);

    } catch (err) {
      console.error(err);
      showError('No se pudieron cargar los datos del dashboard.');
    } finally {
      setLoadingMain(false);
    }
  }, [darkMode]);

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

      // Crear CSV mejorado (compatible con Excel)
      const headers = ['ID', 'Nombre del Evento', 'Fecha', 'Lugar', 'Estado', 'Facultad', 'Responsable', 'Descripción'];
      const rows = eventos.map(e => [
        e.idevento,
        `"${(e.nombreevento || '').replace(/"/g, '""')}"`,
        e.fechaevento?.split('T')[0] || '',
        `"${(e.lugarevento || '').replace(/"/g, '""')}"`,
        e.estado || '',
        `"${(e.facultad || '').replace(/"/g, '""')}"`,
        `"${(e.responsable_evento || '').replace(/"/g, '""')}"`,
        `"${(e.descripcion || '').replace(/"/g, '""')}"`,
      ].join(','));
      
      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eventos_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Éxito', 'Archivo Excel descargado correctamente.');
      } else {
        const path = FileSystem.documentDirectory + `eventos_${Date.now()}.xls`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'application/vnd.ms-excel', dialogTitle: 'Exportar Excel' });
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

      const filasReporte = eventosDelMes.map(ev => {
        const fecha = ev.fechaevento
          ? new Date(ev.fechaevento).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '–';
        
        return `
          <tr>
            <td style="padding:10px;border:1px solid #ddd;vertical-align:top;">${fecha}</td>
            <td style="padding:10px;border:1px solid #ddd;vertical-align:top;">${ev.lugarevento || '–'}</td>
            <td style="padding:10px;border:1px solid #ddd;vertical-align:top;">${ev.publicoMeta || ev.descripcion || '–'}</td>
            <td style="padding:10px;border:1px solid #ddd;vertical-align:top;">${ev.nombreevento || '–'}</td>
            <td style="padding:10px;border:1px solid #ddd;vertical-align:top;">&nbsp;</td>
          </tr>
        `;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:40px;background:#fff}
          .wrap{max-width:1200px;margin:0 auto}
          .header-table{width:100%;border:2px solid #2d5016;margin-bottom:20px;}
          .header-table td{padding:15px;text-align:center;}
          .reporte-title{font-size:32px;font-weight:bold;color:#000;text-transform:lowercase;}
          .info-row{display:flex;justify-content:space-between;margin-bottom:20px;border:1px solid #ddd;}
          .info-field{flex:1;padding:10px;border-right:1px solid #ddd;}
          .info-field:last-child{border-right:none;}
          .info-label{font-weight:bold;background:#f0f0f0;padding:5px 10px;display:inline-block;margin-bottom:5px;}
          .info-value{padding:5px 10px;min-height:30px;}
          .main-table{width:100%;border-collapse:collapse;margin-top:20px;}
          .main-table th{background:#ccc;padding:12px;border:1px solid #999;text-align:left;font-weight:bold;font-size:14px;}
          .main-table td{padding:10px;border:1px solid #ddd;vertical-align:top;font-size:13px;}
          .main-table tr:nth-child(even){background:#f9f9f9;}
          .footer{margin-top:30px;text-align:center;font-size:12px;color:#666;padding-top:20px;border-top:1px solid #ddd;}
          @media print{body{padding:0}.wrap{box-shadow:none}}
        </style></head><body><div class="wrap">
        
        <table class="header-table">
          <tr><td><div class="reporte-title">reporte</div></td></tr>
        </table>
        
        <div class="info-row">
          <div class="info-field">
            <div class="info-label">Periodo</div>
            <div class="info-value">${mesNombre} ${year}</div>
          </div>
          <div class="info-field">
            <div class="info-label">Responsable de la Informacion</div>
            <div class="info-value">&nbsp;</div>
          </div>
        </div>
        
        <table class="main-table">
          <thead>
            <tr>
              <th style="width:15%">Fecha</th>
              <th style="width:20%">Lugar</th>
              <th style="width:25%">Publico Meta</th>
              <th style="width:25%">Tema</th>
              <th style="width:15%">Observaciones y Sugerencias</th>
            </tr>
          </thead>
          <tbody>
            ${filasReporte}
          </tbody>
        </table>
        
        <div class="footer">
          <strong>Panel de Administración UFT</strong> · Sistema de Gestión de Eventos
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

      const aprobados = eventosAnuales.filter(e => e.estado === 'aprobado').length;
      const pendientes = eventosAnuales.filter(e => e.estado === 'pendiente').length;
      const rechazados = eventosAnuales.filter(e => e.estado === 'rechazado').length;
      const total = eventosAnuales.length;

      const statsRes = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const todasFacultades = statsRes.data.eventosPorFacultad || [];

      const facultadesRows = todasFacultades.map((f, i) => {
        const maxVal = todasFacultades[0]?.aprobados || 1;
        const width = Math.round((f.aprobados / maxVal) * 100);
        return `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:${i < 3 ? '#E95A0C' : '#6b7280'}">${i + 1}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:600;">${f.facultad}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;width:150px;">
              <div style="background:#f3f4f6;border-radius:4px;height:10px;overflow:hidden;">
                <div style="background:#E95A0C;height:100%;width:${width}%;border-radius:4px;"></div>
              </div>
            </td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#10b981">${f.aprobados}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#f59e0b">${f.pendientes}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#ef4444">${f.rechazados}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:800">${f.total}</td>
          </tr>
        `;
      }).join('');

      const eventosRows = eventosAnuales.map(ev => {
        const estadoColors = {
          aprobado: { bg: '#d1fae5', text: '#059669' },
          pendiente: { bg: '#fef3c7', text: '#d97706' },
          rechazado: { bg: '#fee2e2', text: '#dc2626' },
        };
        const estadoStyle = estadoColors[(ev.estado || '').toLowerCase()] || { bg: '#f3f4f6', text: '#6b7280' };
        const fecha = ev.fechaevento?.split('T')[0] || '–';
        
        return `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280">${ev.idevento}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
              <div style="font-weight:600;color:#1f2937;">${ev.nombreevento || 'Sin nombre'}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">${fecha} · ${ev.lugarevento || '–'}</div>
            </td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">
              <span style="background:${estadoStyle.bg};color:${estadoStyle.text};padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700;">
                ${(ev.estado || 'N/A').charAt(0).toUpperCase() + (ev.estado || '').slice(1)}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const tasaAprobacion = total > 0 ? Math.round((aprobados / total) * 100) : 0;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:30px;background:#f9fafb;line-height:1.5}
          .wrap{max-width:900px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
          .header{text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:4px solid #E95A0C}
          h1{color:#E95A0C;font-size:32px;margin-bottom:8px;font-weight:800}
          .sub{color:#6b7280;font-size:14px}
          .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px}
          .card{background:#f9fafb;border-radius:12px;padding:18px;border-left:4px solid #E95A0C;text-align:center}
          .card-label{font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
          .card-value{font-size:28px;font-weight:800;color:#1f2937}
          .section{margin-bottom:32px;page-break-inside:avoid}
          .section-title{font-size:20px;font-weight:700;color:#1f2937;margin-bottom:16px;display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:2px solid #f3f4f6}
          .section-title::before{content:'';width:5px;height:24px;background:#E95A0C;border-radius:2px}
          table{width:100%;border-collapse:collapse;font-size:13px}
          th{background:#f9fafb;padding:12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb}
          .estado-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
          .estado-card{background:#f9fafb;border-radius:8px;padding:20px;text-align:center}
          .estado-num{font-size:36px;font-weight:800;margin-bottom:4px}
          .estado-label{font-size:12px;color:#6b7280}
          .aprobado{color:#10b981;border-top:4px solid #10b981}
          .pendiente{color:#f59e0b;border-top:4px solid #f59e0b}
          .rechazado{color:#ef4444;border-top:4px solid #ef4444}
          .footer{text-align:center;color:#9ca3af;font-size:12px;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb}
          .page-break{page-break-after:always}
          @media print{body{padding:0}.wrap{box-shadow:none}}
        </style></head><body><div class="wrap">
        
        <div class="header">
          <h1>📊 Reporte Anual Completo ${year}</h1>
          <p class="sub">Sistema de Gestión de Eventos · Generado el ${new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'})}</p>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-label">Total Eventos</div>
            <div class="card-value">${total}</div>
          </div>
          <div class="card" style="border-left-color:#10b981">
            <div class="card-label">Aprobados</div>
            <div class="card-value" style="color:#10b981">${aprobados}</div>
          </div>
          <div class="card" style="border-left-color:#f59e0b">
            <div class="card-label">Pendientes</div>
            <div class="card-value" style="color:#f59e0b">${pendientes}</div>
          </div>
          <div class="card" style="border-left-color:#3B82F6">
            <div class="card-label">Tasa Aprobación</div>
            <div class="card-value" style="color:#3B82F6">${tasaAprobacion}%</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📈 Distribución por Estado</div>
          <div class="estado-grid">
            <div class="estado-card aprobado">
              <div class="estado-num">${aprobados}</div>
              <div class="estado-label">Aprobados (${total > 0 ? Math.round((aprobados/total)*100) : 0}%)</div>
            </div>
            <div class="estado-card pendiente">
              <div class="estado-num">${pendientes}</div>
              <div class="estado-label">Pendientes (${total > 0 ? Math.round((pendientes/total)*100) : 0}%)</div>
            </div>
            <div class="estado-card rechazado">
              <div class="estado-num">${rechazados}</div>
              <div class="estado-label">Rechazados (${total > 0 ? Math.round((rechazados/total)*100) : 0}%)</div>
            </div>
          </div>
        </div>

        <div class="section page-break">
          <div class="section-title">🏛️ Ranking Completo de Facultades (${todasFacultades.length} facultades)</div>
          <table>
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>Facultad</th>
                <th style="width:150px">Progreso</th>
                <th style="width:80px;text-align:right;color:#10b981">Aprob.</th>
                <th style="width:80px;text-align:right;color:#f59e0b">Pend.</th>
                <th style="width:80px;text-align:right;color:#ef4444">Rech.</th>
                <th style="width:80px;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${facultadesRows}
            </tbody>
          </table>
        </div>

        <div class="section page-break">
          <div class="section-title">📋 Listado Completo de Eventos (${eventosAnuales.length} eventos)</div>
          <table>
            <thead>
              <tr>
                <th style="width:60px">ID</th>
                <th>Evento</th>
                <th style="width:120px;text-align:center">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${eventosRows}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <strong>Panel de Administración UFT</strong> · Sistema de Gestión de Eventos · Año ${year}
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

  // 🔥 NUEVO: Colores dinámicos según dark mode
  const theme = {
    background: darkMode ? COLORS.darkBackground : COLORS.background,
    surface: darkMode ? COLORS.darkSurface : COLORS.surface,
    textPrimary: darkMode ? COLORS.darkTextPrimary : COLORS.textPrimary,
    textSecondary: darkMode ? COLORS.darkTextSecondary : COLORS.textSecondary,
    border: darkMode ? COLORS.darkBorder : COLORS.border,
    divider: darkMode ? '#374151' : COLORS.divider,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🔥 NUEVO: Header con tabs y dark mode toggle */}
      <View style={[styles.topHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.topTitle, { color: theme.textPrimary }]}>Reportes Avanzados</Text>
            <Text style={[styles.topSub, { color: theme.textSecondary }]}>Análisis completo del sistema</Text>
          </View>
          <TouchableOpacity 
            style={[styles.darkModeToggle, { backgroundColor: theme.divider }]}
            onPress={() => setDarkMode(!darkMode)}
          >
            <Ionicons name={darkMode ? 'sunny' : 'moon'} size={20} color={darkMode ? COLORS.warning : COLORS.secondary} />
          </TouchableOpacity>
        </View>
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'speedometer' },
            { id: 'calendario', label: 'Calendario', icon: 'calendar' },
            { id: 'analisis', label: 'Análisis', icon: 'analytics' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive, { backgroundColor: theme.divider }]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? COLORS.primary : theme.textSecondary} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive, { color: activeTab === tab.id ? COLORS.primary : theme.textSecondary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loadingMain ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando datos…</Text>
          </View>
        ) : (
          <>
            {/* 🔥 NUEVO: Filtros avanzados */}
            {(activeTab === 'dashboard' || activeTab === 'analisis') && (
              <View style={styles.section}>
                <View style={[styles.filtersCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.filtersHeader}>
                    <Ionicons name="filter" size={18} color={COLORS.primary} />
                    <Text style={[styles.filtersTitle, { color: theme.textPrimary }]}>Filtros Avanzados</Text>
                  </View>
                  
                  {/* Búsqueda */}
                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color={COLORS.textTertiary} />
                    <TextInput
                      style={[styles.searchInput, { color: theme.textPrimary, backgroundColor: theme.divider }]}
                      placeholder="Buscar eventos..."
                      placeholderTextColor={COLORS.textTertiary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Filtros rápidos */}
                  <View style={styles.quickFilters}>
                    <TouchableOpacity 
                      style={[styles.filterChip, selectedFacultad === 'todas' && styles.filterChipActive]}
                      onPress={() => setSelectedFacultad('todas')}
                    >
                      <Text style={styles.filterChipText}>Todas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterChip, filtroEstado === 'todos' && styles.filterChipActive]}
                      onPress={() => setFiltroEstado('todos')}
                    >
                      <Text style={styles.filterChipText}>Todos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterChip, { backgroundColor: COLORS.primaryLight }]}
                      onPress={() => setShowDateFilter(true)}
                    >
                      <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                      <Text style={[styles.filterChipText, { color: COLORS.primary }]}>Fechas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterChip, { backgroundColor: COLORS.primaryLight }]}
                      onPress={() => setShowFacultadFilter(true)}
                    >
                      <Ionicons name="school-outline" size={14} color={COLORS.primary} />
                      <Text style={[styles.filterChipText, { color: COLORS.primary }]}>Facultad</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Filtros activos */}
                  {(selectedFacultad !== 'todas' || fechaInicio || fechaFin) && (
                    <View style={styles.activeFilters}>
                      {selectedFacultad !== 'todas' && (
                        <View style={styles.activeFilterTag}>
                          <Text style={styles.activeFilterText}>{selectedFacultad}</Text>
                          <TouchableOpacity onPress={() => setSelectedFacultad('todas')}>
                            <Ionicons name="close" size={14} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      )}
                      {(fechaInicio || fechaFin) && (
                        <View style={styles.activeFilterTag}>
                          <Text style={styles.activeFilterText}>
                            {fechaInicio || 'Inicio'} - {fechaFin || 'Fin'}
                          </Text>
                          <TouchableOpacity onPress={() => { setFechaInicio(''); setFechaFin(''); }}>
                            <Ionicons name="close" size={14} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <>
                {/* KPIs con tendencias */}
                <View style={styles.section}>
                  <SectionHeader icon="pulse-outline" title="Indicadores Clave" subtitle="Métricas principales" />
                  <View style={styles.kpiGrid}>
                    <KpiCard 
                      label="Usuarios Activos" 
                      value={stats?.activeUsers ?? '–'} 
                      icon="people-outline" 
                      color={COLORS.primary}
                      trend={5.2}
                    />
                    <KpiCard 
                      label="Eventos Totales" 
                      value={stats?.totalEvents ?? '–'} 
                      icon="calendar-outline" 
                      color={COLORS.info}
                      trend={12.5}
                    />
                    <KpiCard 
                      label="Tasa Aprobación" 
                      value={`${stats?.tasaAprobacion ?? 0}%`} 
                      icon="checkmark-done-outline" 
                      color={COLORS.success}
                      trend={-2.3}
                    />
                    <KpiCard 
                      label="Tiempo Prom." 
                      value={`${stats?.tiempoPromedioAprobacion ?? 0}h`} 
                      icon="time-outline" 
                      color={COLORS.warning}
                      trend={-8.1}
                    />
                    <KpiCard 
                      label="Pendientes" 
                      value={stats?.estadoCounts?.pendiente ?? 0} 
                      icon="hourglass-outline" 
                      color={COLORS.warning} 
                      sub="Sin revisar"
                    />
                    <KpiCard 
                      label="Nuevos Usuarios" 
                      value={stats?.usuariosNuevosEsteMes ?? 0} 
                      icon="person-add-outline" 
                      color={COLORS.purple} 
                      sub="Este mes"
                      trend={15.7}
                    />
                  </View>
                </View>

                {/* Gráfico de tendencia */}
                {trendData.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader icon="trending-up-outline" title="Tendencia Mensual" subtitle="Últimos 6 meses" />
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <LineChart
                        data={{
                          labels: trendData.map(d => d.month),
                          datasets: [
                            {
                              data: trendData.map(d => d.aprobados),
                              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                              strokeWidth: 3,
                            },
                            {
                              data: trendData.map(d => d.rechazados),
                              color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                              strokeWidth: 3,
                            },
                          ],
                        }}
                        width={chartW}
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{
                          backgroundColor: theme.surface,
                          backgroundGradientFrom: theme.surface,
                          backgroundGradientTo: theme.surface,
                          decimalPlaces: 0,
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          style: { borderRadius: 16 },
                          propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff' },
                          propsForBackgroundLines: { strokeDasharray: '', stroke: theme.border, strokeWidth: 0.5 },
                        }}
                        bezier
                        style={{ borderRadius: 16 }}
                        fromZero
                      />
                      <View style={styles.legend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Aprobados</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
                          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Rechazados</Text>
                        </View>
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
              <View style={styles.section}>
                <SectionHeader icon="calendar-outline" title="Calendario de Actividad" subtitle="Últimas 52 semanas" />
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
            )}

            {/* TAB: ANÁLISIS */}
            {activeTab === 'analisis' && (
              <View style={styles.section}>
                <SectionHeader icon="analytics-outline" title="Análisis Detallado" />
                
                {/* Estadísticas adicionales */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Métricas Avanzadas</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Promedio eventos/mes</Text>
                      <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                        {reportesMensuales.length > 0 
                          ? Math.round(reportesMensuales.reduce((acc, r) => acc + (r.totalEvents || 0), 0) / reportesMensuales.length)
                          : 0
                        }
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mejor mes</Text>
                      <Text style={[styles.statValue, { color: COLORS.success }]}>
                        {reportesMensuales.length > 0 
                          ? (() => {
                              const best = reportesMensuales.reduce((max, r) => (r.totalEvents || 0) > (max.totalEvents || 0) ? r : max, reportesMensuales[0]);
                              return `${MONTH_NAMES_FULL[parseInt(best.mes.split('-')[1]) - 1]} ${best.mes.split('-')[0]}`;
                            })()
                          : 'N/A'
                        }
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Eventos recientes - visible en dashboard y analisis */}
            {(activeTab === 'dashboard' || activeTab === 'analisis') && (
              <View style={styles.section}>
                <SectionHeader icon="list-outline" title="Eventos Recientes" subtitle={`${eventosRecientes.length} eventos`} />
                <View style={styles.filterRow}>
                  {['todos', 'pendiente', 'aprobado', 'rechazado'].map(f => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFiltroEstado(f)}
                      style={[styles.filterBtn, filtroEstado === f && styles.filterBtnActive]}
                    >
                      <Text style={[styles.filterText, filtroEstado === f && styles.filterTextActive]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                  {loadingEvents ? (
                    <View style={styles.centered}><ActivityIndicator color={COLORS.primary} /></View>
                  ) : eventosRecientes.length === 0 ? (
                    <View style={styles.emptyChart}>
                      <Ionicons name="calendar-outline" size={40} color={COLORS.textTertiary} />
                      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin eventos para mostrar</Text>
                    </View>
                  ) : (
                    eventosRecientes.map((ev, i) => (
                      <View key={i} style={[styles.eventRow, i < eventosRecientes.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.eventName, { color: theme.textPrimary }]} numberOfLines={1}>{ev.nombreevento || 'Sin nombre'}</Text>
                          <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>
                            {ev.fechaevento?.split('T')[0] || '–'} · {ev.lugarevento || '–'}
                          </Text>
                        </View>
                        <View style={[styles.badge, styles[`badge${ev.estado}`]]}>
                          <Text style={styles.badgeText}>{(ev.estado || 'N/A').charAt(0).toUpperCase() + (ev.estado || '').slice(1)}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
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
                  <Text style={[styles.actionTitle, { color: COLORS.info }]}>Exportar a Excel</Text>
                  <Text style={styles.actionSub}>Descarga en formato XLSX con todos los datos</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.info} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]} onPress={exportarCSV}>
                <Ionicons name="download-outline" size={22} color={COLORS.secondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionTitle, { color: COLORS.secondary }]}>Exportar CSV</Text>
                  <Text style={styles.actionSub}>Formato simple compatible con cualquier sistema</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
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
            <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Fecha Inicio (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.pickerBtn, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.divider }]}
              placeholder="2024-01-01"
              placeholderTextColor={COLORS.textTertiary}
              value={fechaInicio}
              onChangeText={setFechaInicio}
            />
            <Text style={[styles.pickerLabel, { marginTop: 12, color: theme.textSecondary }]}>Fecha Fin (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.pickerBtn, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.divider }]}
              placeholder="2024-12-31"
              placeholderTextColor={COLORS.textTertiary}
              value={fechaFin}
              onChangeText={setFechaFin}
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
  topHeader: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  topTitle: { fontSize: 28, fontWeight: '800' },
  topSub: { fontSize: 14, marginTop: 2 },
  darkModeToggle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  // Tabs
  tabsContainer: { flexDirection: 'row', gap: 8 },
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