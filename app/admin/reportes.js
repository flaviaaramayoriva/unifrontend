import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, useWindowDimensions, Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import * as FileSystem from 'expo-file-system';
import AdminHeader from '../../components/admin/AdminHeader';

const COLORS = {
  primary: '#C44B0A',
  primaryLight: '#FFEDD5',
  secondary: '#0F172A',
  accent: '#EF4444',
  success: '#16A34A',
  warning: '#F59E0B',
  info: '#3B82F6',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E6E9EF',
  divider: '#F1F5F9',
  white: '#FFFFFF',
  error: '#DC2626',
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

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const fmtLocalDate = (d) => {
  const anyo = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anyo}-${mes}-${dia}`;
};

const fmtBs = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '–';
  return `Bs ${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
};
const fmtNum = (n) => {
  if (n === null || n === undefined) return '–';
  return Number(n).toLocaleString('es-BO');
};
const capStr = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const monthLabel = (m) => {
  if (!m || m.length < 7) return m || '';
  const n = MONTH_NAMES_SHORT[parseInt(m.slice(5, 7), 10) - 1] || m.slice(5, 7);
  return n + (m.slice(0, 4) !== String(new Date().getFullYear()) ? " '" + m.slice(2, 4) : '');
};

// ── Barra horizontal reutilizable (rankings) ─────────────────
const RankBar = ({ rows, unit }) => {
  if (!rows || !rows.length) {
    return <Text style={styles.emptyNote}>Sin datos para este rango.</Text>;
  }
  const max = Math.max.apply(null, rows.map(r => r.value || 0));
  const CHART_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F59E0B', '#047857'];
  return (
    <>
      {rows.slice(0, 8).map((r, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const pct = max > 0 ? Math.round(((r.value || 0) / max) * 100) : 0;
        return (
          <View key={`${i}-${r.name}`} style={styles.rankRow}>
            <Text style={styles.rankName} numberOfLines={1}>{r.name}</Text>
            <View style={styles.rankTrack}>
              <View style={[styles.rankFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.rankVal, { color }]}>{fmtNum(r.value)}</Text>
          </View>
        );
      })}
    </>
  );
};

const KpiCard = ({ label, value, icon, color, sub }) => (
  <View style={[styles.kpiCard, { borderTopColor: color }]}>
    <View style={[styles.kpiIconWrap, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
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

const estadoBadgeStyles = {
  aprobado: { bg: '#d1fae5', text: '#059669', icon: 'checkmark-circle' },
  completado: { bg: '#dbeafe', text: '#1d4ed8', icon: 'checkmark-done-circle' },
  finalizado: { bg: '#dbeafe', text: '#1d4ed8', icon: 'checkmark-done-circle' },
  pendiente: { bg: '#fef3c7', text: '#d97706', icon: 'time' },
  rechazado: { bg: '#fee2e2', text: '#dc2626', icon: 'close-circle' },
  cancelado: { bg: '#f3f4f6', text: '#4b5563', icon: 'ban' },
  vencido: { bg: '#ffedd5', text: '#c2410c', icon: 'alert-circle' },
};
const EstadoBadge = ({ estado }) => {
  const e = String(estado || '').toLowerCase();
  const s = estadoBadgeStyles[e] || { bg: '#f3f4f6', text: '#6b7280', icon: 'help-circle' };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={12} color={s.text} />
      <Text style={[styles.badgeText, { color: s.text }]}>{capStr(estado)}</Text>
    </View>
  );
};

const ReportesAvanzadosScreen = () => {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(windowWidth - 56, 240);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtro de fechas
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');
  const [pickerTarget, setPickerTarget] = useState(null); // 'desde' | 'hasta' | null

  // Datos
  const [repRecursos, setRepRecursos] = useState(null);
  const [repInscripciones, setRepInscripciones] = useState(null);
  const [repOperacionales, setRepOperacionales] = useState(null);
  const [repEconomicos, setRepEconomicos] = useState(null);
  const [repTipos, setRepTipos] = useState([]);
  const [repMensual, setRepMensual] = useState([]);

  const showError = (msg) => Alert.alert('Error', msg, [{ text: 'OK' }]);

  const paramsReportes = useMemo(() => {
    const p = {};
    if (reporteDesde) p.desde = reporteDesde;
    if (reporteHasta) p.hasta = reporteHasta;
    return p;
  }, [reporteDesde, reporteHasta]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenAsync();
      if (!token) { setError('Sesión no encontrada.'); return; }

      const headers = { Authorization: `Bearer ${token}` };
      const [recRes, inscRes, opRes, ecoRes, tipoRes, mesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/reportes/recursos`, { params: { periodo: 'mes', ...paramsReportes }, headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/reportes/inscripciones`, { params: paramsReportes, headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/reportes/operacionales`, { params: paramsReportes, headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/reportes/economicos`, { params: paramsReportes, headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/reportes/tipos`, { params: paramsReportes, headers }).catch(() => null),
        axios.get(`${API_BASE_URL}/dashboard/mensual`, { params: paramsReportes, headers }).catch(() => null),
      ]);

      setRepRecursos(recRes?.data || null);
      setRepInscripciones(inscRes?.data || null);
      setRepOperacionales(opRes?.data || null);
      setRepEconomicos(ecoRes?.data || null);
      setRepTipos(Array.isArray(tipoRes?.data?.porTipo) ? tipoRes.data.porTipo : []);
      setRepMensual(Array.isArray(mesRes?.data) ? mesRes.data : []);

      if (!recRes && !inscRes && !opRes && !ecoRes && !tipoRes && !mesRes) {
        setError('No se pudo contactar el servidor.');
      }
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [paramsReportes]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const limpiarFiltro = () => { setReporteDesde(''); setReporteHasta(''); };

  // ── Derivados para gráficos ──────────────────────────────
  const kpis = useMemo(() => {
    const r = repRecursos || {};
    const eco = repEconomicos?.resumen || null;
    const bal = eco ? Number(eco.balance_real) : null;
    return [
      { label: 'Solicitudes', value: fmtNum(r.totalSolicitudes), icon: 'file-tray-full-outline', color: COLORS.cyan, sub: 'total de recursos' },
      { label: 'Aprobados', value: fmtNum(r.aprobadas), icon: 'checkmark-done-outline', color: COLORS.success, sub: 'eventos aprobados' },
      { label: 'Pendientes', value: fmtNum(r.pendientes), icon: 'time-outline', color: COLORS.warning, sub: 'en revisión' },
      { label: 'Rechazados', value: fmtNum((r.rechazadas || 0) + (r.canceladas || 0)), icon: 'close-circle-outline', color: COLORS.error, sub: 'rechazados + cancelados' },
      { label: 'Inscritos', value: fmtNum(repInscripciones?.total), icon: 'person-add-outline', color: COLORS.purple, sub: 'participantes' },
      { label: 'Balance real', value: bal === null || bal === undefined ? '–' : fmtBs(bal), icon: 'wallet-outline', color: bal >= 0 ? COLORS.success : COLORS.error, sub: 'informes de cierre' },
      { label: 'Tasa aprobación', value: r.totalSolicitudes ? Math.round((r.aprobadas / r.totalSolicitudes) * 100) + '%' : '–', icon: 'analytics-outline', color: COLORS.info, sub: 'sobre solicitudes' },
    ];
  }, [repRecursos, repInscripciones, repEconomicos]);

  const pieEstados = useMemo(() => {
    const colorMap = {
      aprobado: '#16A34A', completado: '#1d4ed8', finalizado: '#1d4ed8',
      pendiente: '#F59E0B', rechazado: '#EF4444', cancelado: '#9CA3AF', vencido: '#EA580C',
    };
    const porEstado = Array.isArray(repOperacionales?.porEstado) ? repOperacionales.porEstado : [];
    const items = porEstado
      .filter(x => (x.total || 0) > 0)
      .map(x => ({
        name: capStr(x.estado),
        population: x.total,
        color: colorMap[String(x.estado).toLowerCase()] || '#3B82F6',
        legendFontColor: COLORS.textSecondary,
        legendFontSize: 11,
      }));
    return items;
  }, [repOperacionales]);

  const trendData = useMemo(() => {
    const mes = repMensual;
    return {
      labels: mes.map(m => monthLabel(m.mes)),
      total: mes.map(m => m.totalEvents || 0),
      aprob: mes.map(m => m.aprobado || 0),
    };
  }, [repMensual]);

  const inscritosPorMes = useMemo(() => {
    const porMes = Array.isArray(repInscripciones?.porMes) ? repInscripciones.porMes : [];
    return {
      labels: porMes.map(r => monthLabel(r.mes)),
      values: porMes.map(r => r.inscritos || 0),
    };
  }, [repInscripciones]);

  const rankingRecursos = useMemo(() =>
    (repRecursos?.recursosMasUsados || []).map(r => ({ name: r.nombre, value: r.usos })),
  [repRecursos]);

  const rankingFacultades = useMemo(() =>
    (repInscripciones?.porFacultad || []).map(r => ({ name: r.facultad, value: r.inscritos })),
  [repInscripciones]);

  const rankingTipos = useMemo(() =>
    repTipos.map(r => ({ name: r.tipo, value: r.total })),
  [repTipos]);

  const tablaEventos = useMemo(() => {
    const recientes = repRecursos?.eventoRecientes || [];
    const econMap = {};
    (repEconomicos?.porEvento || []).forEach(ev => { econMap[String(ev.idevento)] = ev; });
    return recientes.map(ev => ({
      id: ev.id,
      nombre: ev.nombreEvento,
      fecha: ev.fecha || ev.fechaevento,
      lugar: ev.lugarevento,
      solicitante: ev.solicitante,
      recursos: ev.totalRecursos,
      estado: ev.estado,
      balance: econMap[String(ev.id)] ? econMap[String(ev.id)].balance_real : null,
    }));
  }, [repRecursos, repEconomicos]);

  // ── Exportación CSV ─────────────────────────────────────
  const exportarCSV = async () => {
    try {
      if (!tablaEventos.length) { showError('No hay eventos para exportar.'); return; }
      const head = ['ID', 'Evento', 'Fecha', 'Lugar', 'Solicitante', 'Recursos', 'Estado', 'Balance'];
      const rows = tablaEventos.map(r => [
        r.id,
        `"${(r.nombre || '').replace(/"/g, '""')}"`,
        r.fecha || '',
        `"${(r.lugar || '').replace(/"/g, '""')}"`,
        `"${(r.solicitante || '').replace(/"/g, '""')}"`,
        r.recursos,
        r.estado || '',
        r.balance !== null && r.balance !== undefined ? r.balance : '',
      ]);
      const csv = '\uFEFF' + [head.join(';'), ...rows.map(x => x.join(';'))].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reportes_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Éxito', 'Archivo CSV descargado. Ábrelo con Excel.');
      } else {
        const path = FileSystem.documentDirectory + `reportes_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar a Excel' });
      }
    } catch (err) {
      console.error(err);
      showError('Error al exportar: ' + err.message);
    }
  };

  // ── Exportación PDF (resumen del período) ───────────────
  const generarPDF = async () => {
    try {
      const r = repRecursos || {};
      const eco = repEconomicos?.resumen || null;
      const bal = eco ? Number(eco.balance_real) : null;
      const rangoTxt = (reporteDesde || reporteHasta)
        ? `${reporteDesde || 'inicio'} al ${reporteHasta || 'hoy'}`
        : 'Todo el período';

      const estadosRows = pieEstados.map(e =>
        `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${e.name}</td>` +
        `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;color:${e.color};font-weight:700;">${e.population}</td></tr>`
      ).join('');

      const recRows = rankingRecursos.slice(0, 8).map((x, i) => {
        const maxv = Math.max(...rankingRecursos.map(y => y.value), 1);
        const pct = Math.round(((x.value || 0) / maxv) * 100);
        return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;font-weight:600;">${x.name}</td>` +
          `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${x.value}</td>` +
          `<td style="padding:8px;border:1px solid #e5e7eb;"><div style="background:#e5e7eb;border-radius:5px;height:9px;"><div style="width:${pct}%;height:100%;background:#3B82F6;border-radius:5px;"></div></div></td></tr>`;
      }).join('');

      const evRows = tablaEventos.slice(0, 50).map(ev => {
        const e = String(ev.estado || '').toLowerCase();
        const col = estadoBadgeStyles[e] || { bg: '#f3f4f6', text: '#6b7280' };
        return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;font-weight:600;">${(ev.nombre || '–').replace(/</g, '&lt;')}</td>` +
          `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${ev.fecha ? String(ev.fecha).slice(0, 10) : '–'}</td>` +
          `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${ev.lugar || '–'}</td>` +
          `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${ev.solicitante || '–'}</td>` +
          `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${fmtNum(ev.recursos)}</td>` +
          `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;"><span style="background:${col.bg};color:${col.text};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">${capStr(ev.estado)}</span></td></tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page{size:A4 portrait;margin:14mm 12mm}
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#f3f4f6;color:#1f2937;font-size:12px;line-height:1.5}
        .wrap{max-width:1000px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08)}
        .cover{background:linear-gradient(135deg,#123314 0%,#2d5016 55%,#C44B0A 100%);color:#fff;padding:40px 38px;position:relative}
        .cover .uft-logo{display:flex;align-items:center;gap:14px;margin-bottom:20px}
        .cover .uft-monogram{width:54px;height:54px;border-radius:12px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800}
        .cover .uft-name{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
        .cover .uft-sub{font-size:10.5px;opacity:.85}
        .cover .reporte-kicker{font-size:10px;letter-spacing:4px;text-transform:uppercase;opacity:.8;margin-top:4px}
        .cover h1{font-size:27px;font-weight:800;margin:6px 0;line-height:1.15}
        .cover-meta{display:flex;gap:14px;margin-top:14px;flex-wrap:wrap}
        .meta-chip{background:rgba(255,255,255,.12);padding:6px 14px;border-radius:18px;font-size:11px;font-weight:600}
        .accent-bar{position:absolute;left:0;right:0;bottom:0;height:5px;background:#fff}
        .content{padding:26px 32px 38px}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
        .stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:13px;text-align:center;border-left:4px solid #C44B0A}
        .stat-label{font-size:9px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.7px;font-weight:700}
        .stat-value{font-size:20px;font-weight:800;color:#111827}
        .section-h{font-size:14px;font-weight:800;margin:22px 0 10px;color:#111827;text-transform:uppercase;border-left:4px solid #C44B0A;padding-left:10px;letter-spacing:.5px}
        .main-table{width:100%;border-collapse:collapse;margin-top:8px}
        .main-table th{background:#2d5016;color:#fff;padding:8px 10px;border:1px solid #2d5016;text-align:left;font-weight:700;font-size:11px}
        .main-table td{padding:7px 9px;border:1px solid #e5e7eb;vertical-align:top;font-size:11.5px}
        .main-table tr:nth-child(even){background:#f8faf8}
        .footer{margin-top:28px;text-align:center;font-size:10.5px;color:#9ca3af;padding:14px 0 4px;border-top:1px solid #e5e7eb}
        .footer strong{color:#6b7280}
        @media print{.cover{background:#2d5016}.wrap{box-shadow:none}body{background:#fff}}
      </style></head><body><div class="wrap">
      <div class="cover">
        <div class="uft-logo">
          <div class="uft-monogram">UFT</div>
          <div><div class="uft-name">Universidad Franz Tamayo</div><div class="uft-sub">Autoridad de Fiscalización y Transparencia Universitaria</div></div>
        </div>
        <div class="reporte-kicker">Informe de Gestión</div>
        <h1>Reporte de Eventos y Recursos</h1>
        <div class="cover-meta">
          <div class="meta-chip">📅 Rango: ${rangoTxt}</div>
          <div class="meta-chip">🗂 ${fmtNum(r.totalSolicitudes)} solicitudes</div>
        </div>
        <div class="accent-bar"></div>
      </div>
      <div class="content">
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Solicitudes</div><div class="stat-value">${fmtNum(r.totalSolicitudes)}</div></div>
          <div class="stat-card" style="border-left-color:#16a34a"><div class="stat-label">Aprobados</div><div class="stat-value" style="color:#16a34a">${fmtNum(r.aprobadas)}</div></div>
          <div class="stat-card" style="border-left-color:#f59e0b"><div class="stat-label">Pendientes</div><div class="stat-value" style="color:#f59e0b">${fmtNum(r.pendientes)}</div></div>
          <div class="stat-card" style="border-left-color:#3b82f6"><div class="stat-label">Inscritos</div><div class="stat-value" style="color:#3b82f6">${fmtNum(repInscripciones?.total)}</div></div>
        </div>
        <div class="section-h">Distribución por estado</div>
        <table class="main-table"><thead><tr><th style="text-align:left;">Estado</th><th style="width:20%;text-align:center;">Cantidad</th></tr></thead><tbody>${estadosRows}</tbody></table>
        <div class="section-h">Recursos más solicitados</div>
        <table class="main-table"><thead><tr><th style="text-align:left;">Recurso</th><th style="width:14%;text-align:center;">Usos</th><th style="width:34%;">Distribución</th></tr></thead><tbody>${recRows}</tbody></table>
        <div class="section-h">Detalle de eventos recientes</div>
        <table class="main-table">
          <thead><tr><th style="text-align:left;">Evento</th><th style="width:12%;">Fecha</th><th style="width:18%;">Lugar</th><th style="width:18%;">Solicitante</th><th style="width:10%;text-align:center;">Recursos</th><th style="width:14%;text-align:center;">Estado</th></tr></thead>
          <tbody>${evRows}</tbody>
        </table>
        <div class="footer"><strong>Panel de Administración UFT</strong> · Sistema de Gestión de Eventos · Generado el ${new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
      </div></body></html>`;

      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 800); }
        else showError('Permite ventanas emergentes para ver el reporte.');
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir Reporte' });
      }
    } catch (err) {
      console.error('Error al generar PDF:', err);
      showError('Error al generar PDF: ' + err.message);
    }
  };

  const fechaTxt = (v) => {
    if (!v) return '–';
    const d = new Date(String(v).slice(0, 10) + 'T00:00:00');
    return isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toLocaleDateString('es-BO');
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <AdminHeader
          title="Reportes"
          subtitle="Vista ejecutiva del sistema"
          eyebrow="Reportes"
          rightActions={(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={exportarCSV} accessibilityRole="button" accessibilityLabel="Exportar CSV">
                <Ionicons name="download-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={generarPDF} accessibilityRole="button" accessibilityLabel="Generar PDF">
                <Ionicons name="print-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={cargarDatos} accessibilityRole="button" accessibilityLabel="Actualizar datos">
                <Ionicons name="refresh" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Filtro por fechas */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: reporteDesde ? COLORS.primary : COLORS.border }]}
            onPress={() => setPickerTarget('desde')}
            accessibilityRole="button"
            accessibilityLabel="Fecha desde"
          >
            <Ionicons name="calendar-outline" size={14} color={reporteDesde ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.filterChipText, { color: reporteDesde ? COLORS.primary : COLORS.textSecondary }]}>
              {reporteDesde || 'Desde'}
            </Text>
          </TouchableOpacity>
          <Ionicons name="arrow-forward" size={14} color={COLORS.textTertiary} />
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: reporteHasta ? COLORS.primary : COLORS.border }]}
            onPress={() => setPickerTarget('hasta')}
            accessibilityRole="button"
            accessibilityLabel="Fecha hasta"
          >
            <Ionicons name="calendar-outline" size={14} color={reporteHasta ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.filterChipText, { color: reporteHasta ? COLORS.primary : COLORS.textSecondary }]}>
              {reporteHasta || 'Hasta'}
            </Text>
          </TouchableOpacity>
          {pickerTarget ? (
            <Modal transparent animationType="fade" onRequestClose={() => setPickerTarget(null)}>
              <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerTarget(null)}>
                <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
                  <Text style={styles.modalTitle}>Selecciona la fecha {pickerTarget === 'desde' ? 'de inicio' : 'de fin'}</Text>
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                    onChange={(ev, date) => {
                      if (ev.type === 'set' && date) {
                        const val = fmtLocalDate(date);
                        if (pickerTarget === 'desde') {
                          if (reporteHasta && val > reporteHasta) setReporteHasta(val);
                          setReporteDesde(val);
                        } else {
                          if (reporteDesde && val < reporteDesde) setReporteDesde(val);
                          setReporteHasta(val);
                        }
                      }
                      if (Platform.OS !== 'ios') setPickerTarget(null);
                    }}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setPickerTarget(null)}>
                      <Text style={styles.modalBtnGhostText}>Cancelar</Text>
                    </TouchableOpacity>
                    {reporteDesde || reporteHasta ? (
                      <TouchableOpacity style={styles.modalBtnGhost} onPress={() => { limpiarFiltro(); setPickerTarget(null); }}>
                        <Text style={styles.modalBtnGhostText}>Limpiar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando reportes…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={44} color={COLORS.textTertiary} />
            <Text style={styles.loadingText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={cargarDatos}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* KPIs */}
            <View style={styles.section}>
              <SectionHeader
                icon="pulse-outline"
                title="Métricas del período"
                subtitle={reporteDesde || reporteHasta ? `${reporteDesde || '…'} → ${reporteHasta || 'hoy'}` : 'Sin filtro'}
                action={
                  <TouchableOpacity onPress={exportarCSV} accessibilityRole="button" accessibilityLabel="Exportar CSV">
                    <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                }
              />
              <View style={styles.kpiGrid}>
                {kpis.slice(0, 4).map(k => (
                  <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color} sub={k.sub} />
                ))}
              </View>
              <View style={styles.kpiGrid}>
                {kpis.slice(4).map(k => (
                  <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color} sub={k.sub} />
                ))}
              </View>
            </View>

            {/* Tendencia mensual */}
            <View style={styles.section}>
              <SectionHeader icon="trending-up-outline" title="Tendencia mensual" subtitle="Eventos vs aprobados" />
              <View style={styles.card}>
                {trendData.labels.length ? (
                  <LineChart
                    data={{
                      labels: trendData.labels,
                      datasets: [
                        { data: trendData.total, color: (o = 1) => `rgba(59, 130, 246, ${o})`, strokeWidth: 2.5 },
                        { data: trendData.aprob, color: (o = 1) => `rgba(22, 163, 74, ${o})`, strokeWidth: 2.5 },
                      ],
                      legend: ['Eventos', 'Aprobados'],
                    }}
                    width={chartWidth}
                    height={230}
                    fromZero
                    chartConfig={{
                      backgroundGradientFrom: COLORS.surface,
                      backgroundGradientTo: COLORS.surface,
                      decimalPlaces: 0,
                      color: (o = 1) => `rgba(196, 75, 10, ${o})`,
                      labelColor: (o = 1) => `rgba(100, 116, 139, ${o})`,
                      propsForBackgroundLines: { stroke: COLORS.border, strokeWidth: 0.5 },
                    }}
                    bezier
                  />
                ) : <Text style={styles.emptyNote}>Sin datos mensuales para este rango.</Text>}
              </View>
            </View>

            {/* Distribución por estado */}
            <View style={styles.section}>
              <SectionHeader icon="pie-chart-outline" title="Distribución por estado" subtitle="Eventos del período" />
              <View style={styles.card}>
                {pieEstados.length ? (
                  <PieChart
                    data={pieEstados}
                    width={chartWidth}
                    height={190}
                    chartConfig={{
                      color: (o = 1) => `rgba(0, 0, 0, ${o})`,
                      labelColor: (o = 1) => `rgba(100, 116, 139, ${o})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="12"
                    absolute
                  />
                ) : <Text style={styles.emptyNote}>Sin datos para este rango.</Text>}
              </View>
            </View>

            {/* Inscritos por mes */}
            <View style={styles.section}>
              <SectionHeader icon="bar-chart-outline" title="Inscritos por mes" subtitle="Asistencias registradas" />
              <View style={styles.card}>
                {inscritosPorMes.labels.length ? (
                  <BarChart
                    data={{
                      labels: inscritosPorMes.labels,
                      datasets: [{ data: inscritosPorMes.values }],
                    }}
                    width={chartWidth}
                    height={220}
                    fromZero
                    chartConfig={{
                      backgroundGradientFrom: COLORS.surface,
                      backgroundGradientTo: COLORS.surface,
                      decimalPlaces: 0,
                      color: (o = 1) => `rgba(46, 16, 101, ${o})`,
                      labelColor: (o = 1) => `rgba(100, 116, 139, ${o})`,
                      propsForBackgroundLines: { stroke: COLORS.border, strokeWidth: 0.5 },
                    }}
                    style={{ borderRadius: 10 }}
                  />
                ) : <Text style={styles.emptyNote}>Sin datos de inscripciones para este rango.</Text>}
              </View>
            </View>

            {/* Rankings */}
            <View style={styles.rankGrid}>
              <View style={styles.cardFull}>
                <SectionHeader icon="cube-outline" title="Recursos más solicitados" />
                <RankBar rows={rankingRecursos} />
              </View>
              <View style={styles.cardFull}>
                <SectionHeader icon="school-outline" title="Inscritos por facultad" />
                <RankBar rows={rankingFacultades} />
              </View>
              <View style={styles.cardFull}>
                <SectionHeader icon="pricetags-outline" title="Tipos de evento" />
                <RankBar rows={rankingTipos} />
              </View>
            </View>

            {/* Tabla exportable */}
            <View style={styles.section}>
              <SectionHeader
                icon="list-outline"
                title="Eventos recientes"
                subtitle="Exportable"
                action={
                  <TouchableOpacity style={styles.exportBtn} onPress={exportarCSV} accessibilityRole="button" accessibilityLabel="Exportar eventos">
                    <Ionicons name="download-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.exportBtnText}>CSV</Text>
                  </TouchableOpacity>
                }
              />
              <View style={styles.card}>
                {tablaEventos.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tCell, styles.tHead, { width: 220 }]}>Evento</Text>
                        <Text style={[styles.tCell, styles.tHead, { width: 100 }]}>Fecha</Text>
                        <Text style={[styles.tCell, styles.tHead, { width: 140 }]}>Lugar</Text>
                        <Text style={[styles.tCell, styles.tHead, { width: 140 }]}>Solicitante</Text>
                        <Text style={[styles.tCell, styles.tHead, { width: 80, textAlign: 'right' }]}>Recursos</Text>
                        <Text style={[styles.tCell, styles.tHead, { width: 110, textAlign: 'center' }]}>Estado</Text>
                        <Text style={[styles.tCell, styles.tHead, { width: 100, textAlign: 'right' }]}>Balance</Text>
                      </View>
                      {tablaEventos.slice(0, 25).map((r, i) => (
                        <View key={`${i}-${r.id || r.nombre}`} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                          <Text style={[styles.tCell, { width: 220, fontWeight: '600' }]} numberOfLines={1}>{r.nombre || 'Sin nombre'}</Text>
                          <Text style={[styles.tCell, { width: 100 }]}>{fechaTxt(r.fecha)}</Text>
                          <Text style={[styles.tCell, { width: 140, color: COLORS.textSecondary }]} numberOfLines={1}>{r.lugar || '–'}</Text>
                          <Text style={[styles.tCell, { width: 140, color: COLORS.textSecondary }]} numberOfLines={1}>{r.solicitante || '–'}</Text>
                          <Text style={[styles.tCell, { width: 80, textAlign: 'right' }]}>{fmtNum(r.recursos)}</Text>
                          <View style={[styles.tCell, { width: 110, alignItems: 'center' }]}><EstadoBadge estado={r.estado} /></View>
                          <Text style={[styles.tCell, { width: 100, textAlign: 'right' }]}>
                            {r.balance === null || r.balance === undefined ? '–' : fmtBs(r.balance)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ) : <Text style={styles.emptyNote}>No hay eventos recientes en este rango.</Text>}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topHeader: {
    backgroundColor: COLORS.surface,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginTop: 12,
  },
  filterChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 48 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  loadingText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 14 },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: COLORS.white, fontWeight: '700' },
  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingHorizontal: 2,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sectionSubtitle: { fontSize: 11, color: COLORS.textTertiary },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardFull: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10,
  },
  kpiCard: {
    flex: 1, minWidth: 150, backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, borderTopWidth: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  kpiIconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },
  kpiSub: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  emptyNote: { color: COLORS.textTertiary, fontSize: 13, paddingVertical: 20, textAlign: 'center' },
  rankGrid: { gap: 14, marginBottom: 22 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rankName: { width: '34%', fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  rankTrack: { flex: 1, height: 10, borderRadius: 6, backgroundColor: COLORS.divider, overflow: 'hidden' },
  rankFill: { height: '100%', borderRadius: 6, minWidth: 3 },
  rankVal: { width: 52, textAlign: 'right', fontSize: 13, fontWeight: '800' },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  exportBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  tableHeader: {
    flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  tableRowAlt: { backgroundColor: '#FAFBFC' },
  tCell: { paddingHorizontal: 10, paddingVertical: 10, fontSize: 13, color: COLORS.textPrimary },
  tHead: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: COLORS.textSecondary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  modalBtnGhost: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9, backgroundColor: COLORS.divider },
  modalBtnGhostText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});

export default ReportesAvanzadosScreen;