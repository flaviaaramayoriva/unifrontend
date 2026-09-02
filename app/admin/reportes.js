import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, useWindowDimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { PieChart } from 'react-native-chart-kit';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';

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

const SectionHeader = ({ title, subtitle, icon }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
  </View>
);

const ReportesAvanzadosScreen = () => {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const [loading, setLoading]             = useState(false);
  const [loadingMain, setLoadingMain]     = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [stats, setStats]                         = useState(null);
  const [reportesMensuales, setReportesMensuales] = useState([]);
  const [eventosPorEstado, setEventosPorEstado]   = useState(null);
  const [rankingFacultades, setRankingFacultades] = useState([]);
  const [eventosRecientes, setEventosRecientes]   = useState([]);
  const [filtroEstado, setFiltroEstado]           = useState('todos');

  const [showSelector, setShowSelector]       = useState(false);
  const [selectedYear, setSelectedYear]       = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth]     = useState(new Date().getMonth() + 1);
  const [showYearPicker, setShowYearPicker]   = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [todosLosEventos, setTodosLosEventos] = useState([]);

  const years  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = MONTH_NAMES_FULL.map((name, i) => ({ value: i + 1, name }));

  const showError = (msg) => Alert.alert('Error', msg, [{ text: 'OK' }]);

  const cargarDatos = useCallback(async () => {
    setLoadingMain(true);
    try {
      const token = await getTokenAsync();
      if (!token) { router.replace('/'); return; }

      const [statsRes, mensualRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/stats`,   { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/dashboard/mensual`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const data = statsRes.data;
      setStats(data);

      if (data.estadoCounts) {
        const colorMap = { aprobado: COLORS.success, pendiente: COLORS.warning, rechazado: COLORS.accent };
        const pie = Object.entries(data.estadoCounts)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => ({
            name: k.charAt(0).toUpperCase() + k.slice(1),
            population: v,
            color: colorMap[k.toLowerCase()] || COLORS.info,
            legendFontColor: COLORS.textPrimary,
            legendFontSize: 12,
          }));
        setEventosPorEstado(pie.length ? pie : null);
      }

      if (Array.isArray(data.eventosPorFacultad)) {
        setRankingFacultades(
          data.eventosPorFacultad
            .map(f => ({ label: f.facultad || 'N/A', value: f.aprobados || 0 }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)
        );
      }

      const reportes = Array.isArray(mensualRes.data)
        ? mensualRes.data.sort((a, b) => new Date(b.mes) - new Date(a.mes))
        : [];
      setReportesMensuales(reportes);

    } catch (err) {
      console.error(err);
      showError('No se pudieron cargar los datos del dashboard.');
    } finally {
      setLoadingMain(false);
    }
  }, []);

  const cargarEventos = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const token = await getTokenAsync();
      if (!token) return;
      const params = filtroEstado !== 'todos' ? { estado: filtroEstado } : {};
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
      
      setEventosRecientes(eventosFiltrados.slice(0, 10));
    } catch (err) {
      console.error(err);
      setEventosRecientes([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [filtroEstado]);

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
        const { FileSystem } = await import('expo-file-system');
        const path = FileSystem.documentDirectory + `eventos_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
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
      
      // ✅ Filtrar eventos del mes seleccionado
      const eventosDelMes = todosEventos.filter(ev => {
        if (!ev.fechaevento) return false;
        const fechaEvento = new Date(ev.fechaevento);
        return fechaEvento.getFullYear() === yearNum && (fechaEvento.getMonth() + 1) === monthNum2;
      });

      // ✅ Generar filas DENTRO de la función donde eventosDelMes sí existe
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <Text style={styles.topTitle}>Reportes</Text>
          <Text style={styles.topSub}>Análisis y métricas del sistema</Text>
        </View>

        {loadingMain ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando datos…</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <SectionHeader icon="pulse-outline" title="Indicadores Clave" />
              <View style={styles.kpiGrid}>
                <KpiCard label="Usuarios Activos"  value={stats?.activeUsers ?? '–'}                  icon="people-outline"         color={COLORS.primary} />
                <KpiCard label="Eventos Totales"   value={stats?.totalEvents ?? '–'}                  icon="calendar-outline"       color={COLORS.info}    />
                <KpiCard label="Tasa Aprobación"   value={`${stats?.tasaAprobacion ?? 0}%`}           icon="checkmark-done-outline" color={COLORS.success} />
                <KpiCard label="Tiempo Prom."      value={`${stats?.tiempoPromedioAprobacion ?? 0}h`} icon="time-outline"           color={COLORS.warning} />
                <KpiCard label="Pendientes"        value={stats?.estadoCounts?.pendiente ?? 0}        icon="hourglass-outline"      color={COLORS.warning} sub="Sin revisar" />
                <KpiCard label="Nuevos Usuarios"   value={stats?.usuariosNuevosEsteMes ?? 0}          icon="person-add-outline"     color={COLORS.purple}  sub="Este mes" />
              </View>
            </View>

            <View style={styles.section}>
              <SectionHeader icon="pie-chart-outline" title="Distribución por Estado" />
              <View style={styles.card}>
                {eventosPorEstado ? (
                  <PieChart
                    data={eventosPorEstado}
                    width={chartW}
                    height={200}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="10"
                    absolute
                    chartConfig={{ color: (o = 1) => `rgba(0,0,0,${o})` }}
                  />
                ) : (
                  <View style={styles.emptyChart}>
                    <Ionicons name="pie-chart-outline" size={40} color={COLORS.textTertiary} />
                    <Text style={styles.emptyText}>Sin datos de estados</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <SectionHeader icon="school-outline" title="Ranking de Facultades" subtitle="Eventos creados" />
              <View style={styles.card}>
                {rankingFacultades.length > 0 ? (
                  <View style={{ marginTop: 8 }}>
                    {rankingFacultades.map((f, i) => {
                      const maxVal = rankingFacultades[0]?.value || 1;
                      const pct = Math.round((f.value / maxVal) * 100);
                      const RANK_COLORS = ['#28B8CE', '#FFCC00', '#E84E0F', '#D3D800', '#E6007E'];
                      const colorIndex = i % RANK_COLORS.length;
                      const rankColor = RANK_COLORS[colorIndex];
                      const isLightColor = colorIndex === 1 || colorIndex === 3;
                      const textColor = isLightColor ? COLORS.textPrimary : COLORS.white;

                      return (
                        <View key={i} style={styles.rankRowNew}>
                          <View style={[styles.rankBadgeNew, { backgroundColor: rankColor }]}>
                            <Text style={[styles.rankNumNew, { color: textColor }]}>{i + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.rankLabelNew}>{f.label}</Text>
                            <View style={styles.rankBarBg}>
                              <View style={[styles.rankBarFill, { width: `${pct}%`, backgroundColor: rankColor }]} />
                            </View>
                          </View>
                          <Text style={[styles.rankValueNew, { color: rankColor }]}>{f.value}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyChart}>
                    <Ionicons name="school-outline" size={40} color={COLORS.textTertiary} />
                    <Text style={styles.emptyText}>Sin datos de facultades</Text>
                  </View>
                )}
              </View>
            </View>

            {reportesMensuales.length > 0 && (
              <View style={styles.section}>
                <SectionHeader icon="bar-chart-outline" title="Histórico Mensual" subtitle="Últimos períodos" />
                <View style={styles.card}>
                  <View style={[styles.tableRow, styles.tableHead]}>
                    {['Mes', 'Eventos', 'Aprob.', 'Tasa', 'PDF'].map((h, i) => (
                      <Text key={i} style={[styles.tableHeadText, i === 0 ? { flex: 2 } : { flex: 1, textAlign: 'center' }]}>{h}</Text>
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
                      <View key={i} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: COLORS.divider }]}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.tableCell, { flex: 2 }]}>
                          {mesTexto}
                        </Text>
                        <Text numberOfLines={1} style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{tot}</Text>
                        <Text numberOfLines={1} style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.success, fontWeight: '600' }]}>{ap}</Text>
                        <Text numberOfLines={1} style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{tasa}%</Text>
                        <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => generarPDF(r.mes)}>
                          <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <SectionHeader icon="list-outline" title="Eventos Recientes" />
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
              <View style={styles.card}>
                {loadingEvents ? (
                  <View style={styles.centered}><ActivityIndicator color={COLORS.primary} /></View>
                ) : eventosRecientes.length === 0 ? (
                  <View style={styles.emptyChart}>
                    <Ionicons name="calendar-outline" size={40} color={COLORS.textTertiary} />
                    <Text style={styles.emptyText}>Sin eventos para mostrar</Text>
                  </View>
                ) : (
                  eventosRecientes.map((ev, i) => {
                    const estadoColors = {
                      aprobado: { bg: '#d1fae5', text: '#059669' },
                      pendiente: { bg: '#fef3c7', text: '#d97706' },
                      rechazado: { bg: '#fee2e2', text: '#dc2626' },
                    };
                    const est = (ev.estado || '').toLowerCase();
                    const color = estadoColors[est] || { bg: '#f3f4f6', text: '#6b7280' };
                    
                    return (
                      <View key={i} style={[styles.eventRow, i < eventosRecientes.length - 1 && styles.eventRowBorder]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.eventName} numberOfLines={1}>{ev.nombreevento || 'Sin nombre'}</Text>
                          <Text style={styles.eventMeta}>
                            {ev.fechaevento?.split('T')[0] || '–'} · {ev.lugarevento || '–'}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: color.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ color: color.text, fontSize: 11, fontWeight: '700' }}>
                            {(ev.estado || 'N/A').charAt(0).toUpperCase() + (ev.estado || '').slice(1)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

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
                  <Text style={styles.actionSub}>Selecciona 1 evento para ver toda su información completa</Text>
                </View>
                {loading && <ActivityIndicator size="small" color={COLORS.purple} />}
                <Ionicons name="chevron-forward" size={18} color={COLORS.purple} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primaryLight }]} onPress={() => setShowSelector(true)}>
                <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionTitle, { color: COLORS.primary }]}>Reporte Mensual PDF</Text>
                  <Text style={styles.actionSub}>Selecciona mes y año para generar</Text>
                </View>
                {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]} onPress={exportarCSV}>
                <Ionicons name="download-outline" size={22} color={COLORS.info} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionTitle, { color: COLORS.info }]}>Exportar Eventos CSV</Text>
                  <Text style={styles.actionSub}>Descarga todos los eventos en formato Excel/CSV</Text>
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
            <Text style={styles.modalTitle}>Seleccionar Mes</Text>

            <Text style={styles.pickerLabel}>Año</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}>
              <Text style={styles.pickerBtnText}>{selectedYear}</Text>
              <Ionicons name={showYearPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>
            {showYearPicker && (
              <View style={styles.dropdown}>
                {years.map(y => (
                  <TouchableOpacity key={y} style={[styles.dropItem, selectedYear === y && styles.dropItemActive]}
                    onPress={() => { setSelectedYear(y); setShowYearPicker(false); }}>
                    <Text style={[styles.dropText, selectedYear === y && { color: COLORS.primary, fontWeight: '700' }]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.pickerLabel, { marginTop: 12 }]}>Mes</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}>
              <Text style={styles.pickerBtnText}>{MONTH_NAMES_FULL[selectedMonth - 1]}</Text>
              <Ionicons name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>
            {showMonthPicker && (
              <ScrollView style={styles.dropdown} nestedScrollEnabled>
                {months.map(mo => (
                  <TouchableOpacity key={mo.value} style={[styles.dropItem, selectedMonth === mo.value && styles.dropItemActive]}
                    onPress={() => { setSelectedMonth(mo.value); setShowMonthPicker(false); }}>
                    <Text style={[styles.dropText, selectedMonth === mo.value && { color: COLORS.primary, fontWeight: '700' }]}>{mo.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.secondary }]} onPress={() => setShowSelector(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => {
                  const mes = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
                  setShowSelector(false);
                  generarPDF(mes);
                }}
              >
                <Text style={styles.modalBtnText}>Generar PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showEventPicker && (
        <View style={styles.overlay}>
          <View style={[styles.modal, { width: '90%', maxWidth: 420, maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Seleccionar Evento</Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, textAlign: 'center' }}>
              Toca un evento para ver todos sus detalles completos
            </Text>
            
            <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
              {todosLosEventos.length === 0 ? (
                <View style={styles.emptyChart}>
                  <Ionicons name="calendar-outline" size={40} color={COLORS.textTertiary} />
                  <Text style={styles.emptyText}>No hay eventos disponibles</Text>
                </View>
              ) : (
                todosLosEventos.map((ev, i) => {
                  const estadoColors = {
                    aprobado: { bg: '#d1fae5', text: '#059669' },
                    pendiente: { bg: '#fef3c7', text: '#d97706' },
                    rechazado: { bg: '#fee2e2', text: '#dc2626' },
                  };
                  const est = (ev.estado || '').toLowerCase();
                  const color = estadoColors[est] || { bg: '#f3f4f6', text: '#6b7280' };

                  return (
                    <TouchableOpacity
                      key={ev.idevento || i}
                      style={[styles.dropItem, { paddingVertical: 12, paddingHorizontal: 14 }, i === todosLosEventos.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => navegarADetalleEvento(ev)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropText, { fontWeight: '700', marginBottom: 4, fontSize: 14 }]} numberOfLines={1}>
                            {ev.nombreevento || 'Sin nombre'}
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.textSecondary }} numberOfLines={1}>
                            {ev.fechaevento ? new Date(ev.fechaevento).toLocaleDateString('es-ES') : 'Sin fecha'} · {ev.lugarevento || 'Sin lugar'}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: color.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ color: color.text, fontSize: 10, fontWeight: '700' }}>
                            {(ev.estado || 'N/A').charAt(0).toUpperCase() + (ev.estado || '').slice(1)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.secondary }]} onPress={() => setShowEventPicker(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 60 },
  centered: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },

  topHeader: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border },
  topTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  topSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  sectionSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 28 },

  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, width: '47.5%', borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  kpiIconWrap: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  kpiSub: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  tableHead: { borderBottomWidth: 2, borderColor: COLORS.border, marginBottom: 2 },
  tableHeadText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  tableCell: { fontSize: 13, color: COLORS.textPrimary },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  filterTextActive: { color: COLORS.white, fontWeight: '700' },
  
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  eventRowBorder: { borderBottomWidth: 1, borderColor: COLORS.divider },
  eventName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 3 },
  eventMeta: { fontSize: 12, color: COLORS.textSecondary },

  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  actionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  actionSub: { fontSize: 12, color: COLORS.textSecondary },

  emptyChart: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 8, color: COLORS.textTertiary, fontSize: 13 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, width: '82%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16, textAlign: 'center' },
  pickerLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.background },
  pickerBtnText: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  dropdown: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4, maxHeight: 160, backgroundColor: COLORS.surface },
  dropItem: { paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: COLORS.divider },
  dropItemActive: { backgroundColor: COLORS.primaryLight },
  dropText: { fontSize: 14, color: COLORS.textPrimary },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  
  rankRowNew: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: COLORS.divider, gap: 12 },
  rankBadgeNew: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  rankNumNew: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  rankLabelNew: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  rankBarBg: { height: 6, backgroundColor: COLORS.divider, borderRadius: 3, overflow: 'hidden' },
  rankBarFill: { height: '100%', borderRadius: 3 },
  rankValueNew: { fontSize: 15, fontWeight: '800', minWidth: 36, textAlign: 'right' },
});

export default ReportesAvanzadosScreen;