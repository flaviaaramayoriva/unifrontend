import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const lastDayOfMonth = (anio, mes) => new Date(anio, mes, 0).getDate();

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
const h = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const estadoBadgeStyles = {
  aprobado: { bg: '#d1fae5', text: '#059669', icon: 'checkmark-circle' },
  completado: { bg: '#dbeafe', text: '#1d4ed8', icon: 'checkmark-done-circle' },
  finalizado: { bg: '#dbeafe', text: '#1d4ed8', icon: 'checkmark-done-circle' },
  pendiente: { bg: '#fef3c7', text: '#d97706', icon: 'time' },
  rechazado: { bg: '#fee2e2', text: '#dc2626', icon: 'close-circle' },
  cancelado: { bg: '#f3f4f6', text: '#4b5563', icon: 'ban' },
  vencido: { bg: '#ffedd5', text: '#c2410c', icon: 'alert-circle' },
};
const estadoBadgeFallback = { bg: '#f3f4f6', text: '#6b7280' };

// ── Barra horizontal reutilizable (rankings) ─────────────────
const RankBar = ({ rows }) => {
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

const EstadoBadge = ({ estado }) => {
  const e = String(estado || '').toLowerCase();
  const s = estadoBadgeStyles[e] || { ...estadoBadgeFallback, icon: 'help-circle' };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={12} color={s.text} />
      <Text style={[styles.badgeText, { color: s.text }]}>{capStr(estado)}</Text>
    </View>
  );
};

// ── Constructor de reportes HTML (período y anual) ─────────────
const buildReporteHtml = ({ recursos, inscripciones, operacionales, economicos, tipos, mensual, rangoTxt, titulo, anio, tipo }) => {
  const r = recursos || {};
  const eco = (economicos && economicos.resumen) || null;
  const bal = eco ? Number(eco.balance_real) : null;
  const porEstado = Array.isArray(operacionales?.porEstado) ? operacionales.porEstado : [];
  const estadoColor = { aprobado: '#16A34A', completado: '#1d4ed8', finalizado: '#1d4ed8', pendiente: '#F59E0B', rechazado: '#EF4444', cancelado: '#9CA3AF', vencido: '#EA580C' };
  const porEvento = Array.isArray(economicos?.porEvento) ? economicos.porEvento : [];
  const porMerode = Array.isArray(economicos?.porMoneda) ? economicos.porMoneda : [];

  const economicoRows = porMerode.map(m => {
    const git = m.tipo === 'gasto' ? m.total : null;
    const ing = m.tipo === 'ingreso' ? m.total : null;
    return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;font-weight:600;">${h(m.moneda)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:right;">${fmtBs(ing)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:right;">${fmtBs(git)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:right;${(bal || 0) >= 0 ? 'color:#16a34a;' : 'color:#dc2626;'};font-weight:700;">${fmtBs(bal)}</td></tr>`;
  }).join('');

  const eventRows = (ev) => {
    const e = String(ev.estado || '').toLowerCase();
    const col = estadoBadgeStyles[e] || estadoBadgeFallback;
    return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;font-weight:600;">${h(ev.nombre)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${ev.fecha ? String(ev.fecha).slice(0, 10) : '–'}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${h(ev.lugar)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${h(ev.solicitante)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${fmtNum(ev.recursos)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;"><span style="background:${col.bg};color:${col.text};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">${capStr(ev.estado)}</span></td></tr>`;
  };

  // Evolución mensual para el anual
  let monthlyHtml = '';
  if (anio && tipo === 'anual') {
    const byMes = (arr, key) => {
      const m = {};
      (arr || []).forEach(x => { if (x.mes) m[String(x.mes)] = Number(x[key]) || 0; });
      return m;
    };
    const evMes = byMes(mensual, 'totalEvents');
    const apMes = byMes(mensual, 'aprobado');
    const inMes = byMes(inscripciones?.porMes, 'inscritos');
    const vals = Object.keys(evMes).concat(Object.keys(inMes));
    const maxEv = Math.max(1, ...vals.map(k => evMes[k] || 0));
    const rows = [];
    for (let i = 1; i <= 12; i++) {
      const key = `${anio}-${String(i).padStart(2, '0')}`;
      const ev = evMes[key] || 0;
      const ap = apMes[key] || 0;
      const inscr = inMes[key] || 0;
      const pctEv = Math.round((ev / maxEv) * 100);
      const pctAp = ev > 0 ? Math.round((ap / ev) * 100) : 0;
      rows.push(`<tr>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;font-weight:600;">${MONTH_NAMES_FULL[i - 1]}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;font-weight:700;">${fmtNum(ev)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">
            <div style="background:#e5e7eb;border-radius:5px;height:9px;min-width:60px;"><div style="width:${pctEv}%;height:100%;background:#3B82F6;border-radius:5px;"></div></div>
          </td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${fmtNum(ap)} <span style="color:#16a34a;font-size:10px;">(${pctAp}%)</span></td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;font-weight:700;">${fmtNum(inscr)}</td>
        </tr>`);
    }
    monthlyHtml = `
      <div class="section-h">Evolución mensual · ${anio}</div>
      <table class="main-table">
        <thead><tr>
          <th style="text-align:left;">Mes</th>
          <th style="width:10%;text-align:center;">Eventos</th>
          <th style="width:24%;">Intensidad</th>
          <th style="width:16%;text-align:center;">Aprobados</th>
          <th style="width:12%;text-align:center;">Inscritos</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>`;
  }

  const estadosHtml = porEstado.filter(x => (x.total || 0) > 0).map(x => {
    const c = estadoColor[String(x.estado).toLowerCase()] || '#3B82F6';
    return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;"><span style="color:${c};font-weight:700;">${capStr(x.estado)}</span></td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${x.total}</td></tr>`;
  }).join('');

  const recRows = (r.recursosMasUsados || []).slice(0, 8).map(x => {
    const maxv = Math.max(...(r.recursosMasUsados || []).map(y => y.usos || 0), 1);
    const pct = Math.round(((x.usos || 0) / maxv) * 100);
    return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;font-weight:600;">${h(x.nombre)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${fmtNum(x.usos)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;"><div style="background:#e5e7eb;border-radius:5px;height:9px;"><div style="width:${pct}%;height:100%;background:#3B82F6;border-radius:5px;"></div></div></td></tr>`;
  }).join('');

  const facRows = (inscripciones?.porFacultad || []).slice(0, 8).map(x => {
    const maxv = Math.max(...(inscripciones?.porFacultad || []).map(y => y.inscritos || 0), 1);
    const pct = Math.round(((x.inscritos || 0) / maxv) * 100);
    return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;font-weight:600;">${h(x.facultad)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${fmtNum(x.inscritos)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;"><div style="background:#e5e7eb;border-radius:5px;height:9px;"><div style="width:${pct}%;height:100%;background:#8B5CF6;border-radius:5px;"></div></div></td></tr>`;
  }).join('');

  const tipoRows = (tipos || []).slice(0, 8).map(x => {
    return `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;font-weight:600;">${h(x.tipo)}</td>` +
      `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${fmtNum(x.total)}</td></tr>`;
  }).join('');

  const listaEventos = (r.eventoRecientes || []).slice(0, 80).map(ev => {
    const econ = porEvento.find(x => String(x.idevento) === String(ev.id));
    ev.balance = econ ? econ.balance_real : null;
    return eventRows(ev);
  }).join('');

  const kpiGrid = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Solicitudes</div><div class="stat-value">${fmtNum(r.totalSolicitudes)}</div></div>
      <div class="stat-card" style="border-left-color:#16a34a"><div class="stat-label">Aprobados</div><div class="stat-value" style="color:#16a34a">${fmtNum(r.aprobadas)}</div></div>
      <div class="stat-card" style="border-left-color:#f59e0b"><div class="stat-label">Pendientes</div><div class="stat-value" style="color:#f59e0b">${fmtNum(r.pendientes)}</div></div>
      <div class="stat-card" style="border-left-color:#8b5cf6"><div class="stat-label">Inscritos</div><div class="stat-value" style="color:#8b5cf6">${fmtNum(inscripciones?.total)}</div></div>
    </div>`;

  const economiaHtml = (eco && (bal !== null && bal !== undefined)) ? `
    <div style="margin-top:22px;">
      <div class="section-h">Resumen económico</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;">
        <div style="flex:1;min-width:150px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center;border-top:4px solid #3B82F6;">
          <div class="stat-label">Ingresos registrados</div>
          <div style="font-size:17px;font-weight:800;color:#1d4ed8;">${fmtBs(eco.ingreso_total)}</div></div>
        <div style="flex:1;min-width:150px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center;border-top:4px solid #ef4444;">
          <div class="stat-label">Egresos registrados</div>
          <div style="font-size:17px;font-weight:800;color:#dc2626;">${fmtBs(eco.egreso_total)}</div></div>
        <div style="flex:1;min-width:150px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center;border-top:4px solid ${bal >= 0 ? '#16a34a' : '#dc2626'};">
          <div class="stat-label">Balance real</div>
          <div style="font-size:17px;font-weight:800;color:${bal >= 0 ? '#16a34a' : '#dc2626'};">${fmtBs(bal)}</div></div>
      </div>
      ${economicoRows ? `<div style="margin-top:16px;"><table class="main-table"><thead><tr><th style="text-align:left;">Moneda</th><th style="width:26%;text-align:right;">Ingresos</th><th style="width:26%;text-align:right;">Egresos</th><th style="width:26%;text-align:right;">Balance</th></tr></thead><tbody>${economicoRows}</tbody></table></div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    @page{size:A4 portrait;margin:14mm 12mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#f3f4f6;color:#1f2937;font-size:12px;line-height:1.5}
    .wrap{max-width:1000px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08)}
    .cover{background:linear-gradient(135deg,#123314 0%,#2d5016 55%,#C44B0A 100%);color:#fff;padding:40px 38px;position:relative}
    .uft-logo{display:flex;align-items:center;gap:14px;margin-bottom:20px}
    .uft-monogram{width:54px;height:54px;border-radius:12px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800}
    .uft-name{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
    .uft-sub{font-size:10.5px;opacity:.85}
    .reporte-kicker{font-size:10px;letter-spacing:4px;text-transform:uppercase;opacity:.8;margin-top:4px}
    .cover h1{font-size:27px;font-weight:800;margin:6px 0;line-height:1.15}
    .cover-meta{display:flex;gap:14px;margin-top:14px;flex-wrap:wrap}
    .meta-chip{background:rgba(255,255,255,.12);padding:6px 14px;border-radius:18px;font-size:11px;font-weight:600}
    .accent-bar{position:absolute;left:0;right:0;bottom:0;height:5px;background:#fff}
    .content{padding:26px 32px 38px;page-break-inside:avoid}
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
    .stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:13px;text-align:center;border-left:4px solid #C44B0A}
    .stat-label{font-size:9px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.7px;font-weight:700}
    .stat-value{font-size:20px;font-weight:800;color:#111827}
    .section-h{font-size:14px;font-weight:800;margin:22px 0 10px;color:#111827;text-transform:uppercase;border-left:4px solid #C44B0A;padding-left:10px;letter-spacing:.5px}
    .main-table{width:100%;border-collapse:collapse;margin-top:8px}
    .main-table th{background:#2d5016;color:#fff;padding:8px 10px;border:1px solid #2d5016;text-align:left;font-weight:700;font-size:11px}
    .main-table td{padding:7px 9px;border:1px solid #e5e7eb;vertical-align:top;font-size:11.5px}
    .main-table tr:nth-child(even){background:#f8faf8}
    .page-break{page-break-before:always}
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
    <h1>${titulo}</h1>
    <div class="cover-meta">
      <div class="meta-chip">📅 ${rangoTxt}</div>
      <div class="meta-chip">🗂 ${fmtNum(r.totalSolicitudes)} solicitudes</div>
      ${tipo === 'anual' && anio ? `<div class="meta-chip">🗓 Año ${anio}</div>` : ''}
    </div>
    <div class="accent-bar"></div>
  </div>
  <div class="content">
    ${kpiGrid}
    ${monthlyHtml}
    <div class="section-h">Distribución por estado</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Estado</th><th style="width:20%;text-align:center;">Cantidad</th></tr></thead><tbody>${estadosHtml || '<tr><td colspan="2" style="padding:12px;color:#9ca3af;text-align:center;">Sin datos</td></tr>'}</tbody></table>
    <div class="section-h">Recursos más solicitados</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Recurso</th><th style="width:14%;text-align:center;">Usos</th><th style="width:34%;">Distribución</th></tr></thead><tbody>${recRows || '<tr><td colspan="3" style="padding:12px;color:#9ca3af;text-align:center;">Sin datos</td></tr>'}</tbody></table>
    <div class="section-h">Inscritos por facultad</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Facultad</th><th style="width:14%;text-align:center;">Inscritos</th><th style="width:34%;">Distribución</th></tr></thead><tbody>${facRows || '<tr><td colspan="3" style="padding:12px;color:#9ca3af;text-align:center;">Sin datos</td></tr>'}</tbody></table>
    <div class="section-h">Tipos de evento</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Tipo</th><th style="width:20%;text-align:center;">Cantidad</th></tr></thead><tbody>${tipoRows || '<tr><td colspan="2" style="padding:12px;color:#9ca3af;text-align:center;">Sin datos</td></tr>'}</tbody></table>
    ${economiaHtml}
    <div class="page-break"></div>
    <div class="section-h">Detalle de eventos</div>
    <table class="main-table">
      <thead><tr><th style="text-align:left;">Evento</th><th style="width:11%;">Fecha</th><th style="width:17%;">Lugar</th><th style="width:17%;">Solicitante</th><th style="width:9%;text-align:center;">Recursos</th><th style="width:13%;text-align:center;">Estado</th></tr></thead>
      <tbody>${listaEventos || '<tr><td colspan="6" style="padding:12px;color:#9ca3af;text-align:center;">Sin eventos</td></tr>'}</tbody>
    </table>
    <div class="footer"><strong>Panel de Administración UFT</strong> · Sistema de Gestión de Eventos · Generado el ${new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>
  </div></body></html>`;
};

const emitirDocumento = async (html, nombre, ventanaPrevia) => {
  if (Platform.OS === 'web') {
    const w = ventanaPrevia || window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 800);
    } else {
      Alert.alert('Aviso', 'Permite ventanas emergentes para ver/imprimir el reporte.');
    }
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir Reporte' });
  }
};

const ReportesAvanzadosScreen = () => {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(windowWidth - 56, 240);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generando, setGenerando] = useState(false);

  // Filtro de fechas
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');
  const [pickerTarget, setPickerTarget] = useState(null); // 'desde' | 'hasta' | null
  const [anioModalAbierto, setAnioModalAbierto] = useState(false);
  const [menuExportAbierto, setMenuExportAbierto] = useState(false);
  const [mesModalAbierto, setMesModalAbierto] = useState(false);
  const [eventoExpandido, setEventoExpandido] = useState(null);

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

  const fetchDatos = useCallback(async (params) => {
    const token = await getTokenAsync();
    if (!token) return null;
    const headers = { Authorization: `Bearer ${token}` };
    const [recRes, inscRes, opRes, ecoRes, tipoRes, mesRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/reportes/recursos`, { params: { periodo: 'mes', ...params }, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/inscripciones`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/operacionales`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/economicos`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/tipos`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/dashboard/mensual`, { params, headers }).catch(() => null),
    ]);
    const datos = {
      recursos: recRes?.data || null,
      inscripciones: inscRes?.data || null,
      operacionales: opRes?.data || null,
      economicos: ecoRes?.data || null,
      tipos: Array.isArray(tipoRes?.data?.porTipo) ? tipoRes.data.porTipo : [],
      mensual: Array.isArray(mesRes?.data) ? mesRes.data : [],
    };
    const ok = recRes || inscRes || opRes || ecoRes || tipoRes || mesRes;
    return { ...datos, ok: !!ok };
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const datos = await fetchDatos(paramsReportes);
      if (!datos) { setError('Sesión no encontrada.'); return; }
      setRepRecursos(datos.recursos);
      setRepInscripciones(datos.inscripciones);
      setRepOperacionales(datos.operacionales);
      setRepEconomicos(datos.economicos);
      setRepTipos(datos.tipos);
      setRepMensual(datos.mensual);
      if (!datos.ok) setError('No se pudo contactar el servidor.');
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [fetchDatos, paramsReportes]);

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

  // ── Detalle evento por evento ──────────────────────────
  const detalleEventos = useMemo(() => {
    const recientes = repRecursos?.eventoRecientes || [];
    const econMap = {};
    (repEconomicos?.porEvento || []).forEach(ev => { econMap[String(ev.idevento)] = ev; });
    const inscMap = {};
    (repInscripciones?.topEventos || []).forEach(ev => { inscMap[String(ev.idevento)] = ev; });
    return recientes.map(ev => {
      const econ = econMap[String(ev.id)] || null;
      const insc = inscMap[String(ev.id)] || null;
      return {
        id: ev.id,
        nombre: ev.nombreEvento || 'Sin nombre',
        fecha: ev.fecha || ev.fechaevento || null,
        lugar: ev.lugarevento || null,
        solicitante: ev.solicitante || null,
        recursos: ev.totalRecursos || 0,
        estado: ev.estado,
        economia: econ ? {
          pres_ingresos: econ.pres_ingresos,
          pres_egresos: econ.pres_egresos,
          real_ingresos: econ.real_ingresos,
          real_egresos: econ.real_egresos,
          balance_real: econ.balance_real,
        } : null,
        inscritos: insc ? insc.inscritos : null,
        facultad: insc ? insc.facultad : null,
      };
    });
  }, [repRecursos, repEconomicos, repInscripciones]);

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
        a.download = `reportes_${reporteDesde || 'todo'}_${reporteHasta || 'hoy'}.csv`.replace(/[^\w.-]/g, '_');
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

  // ── Exportación PDF (resumen del período filtrado) ────────
  const generarPDF = async () => {
    try {
      const rangoTxt = (reporteDesde || reporteHasta)
        ? `${reporteDesde || 'inicio'} al ${reporteHasta || 'hoy'}`
        : 'Todo el período';
      const html = buildReporteHtml({
        recursos: repRecursos,
        inscripciones: repInscripciones,
        operacionales: repOperacionales,
        economicos: repEconomicos,
        tipos: repTipos,
        mensual: repMensual,
        rangoTxt,
        titulo: 'Reporte de Eventos y Recursos',
        tipo: 'periodo',
      });
      await emitirDocumento(html, 'reporte_periodo');
    } catch (err) {
      console.error('Error al generar PDF:', err);
      showError('Error al generar PDF: ' + err.message);
    }
  };

  // ── Reporte anual completo ──────────────────────────────
  const generarReporteAnual = async (anio) => {
    setAnioModalAbierto(false);
    setGenerando(true);
    let ventanaPrevia = null;
    if (Platform.OS === 'web') ventanaPrevia = window.open('', '_blank');
    try {
      const desde = `${anio}-01-01`;
      const hasta = `${anio}-12-31`;
      const datos = await fetchDatos({ desde, hasta });
      if (!datos) { showError('Sesión no encontrada. Vuelve a iniciar sesión.'); return; }
      const anioActual = new Date().getFullYear();
      const hastaTxt = anio === anioActual ? 'hoy' : '31 de diciembre';
      const html = buildReporteHtml({
        recursos: datos.recursos,
        inscripciones: datos.inscripciones,
        operacionales: datos.operacionales,
        economicos: datos.economicos,
        tipos: datos.tipos,
        mensual: datos.mensual,
        rangoTxt: `01 de enero al ${hastaTxt}`,
        titulo: `Reporte Anual de Gestión`,
        anio,
        tipo: 'anual',
      });
      await emitirDocumento(html, `reporte_anual_${anio}`, ventanaPrevia);
    } catch (err) {
      console.error('Error al generar reporte anual:', err);
      showError('Error al generar reporte anual: ' + err.message);
    } finally {
      setGenerando(false);
    }
  };

  // ── Reporte mensual (PDF) ─────────────────────────────
  const generarReporteMensual = async (mesKey) => {
    setMesModalAbierto(false);
    setGenerando(true);
    let ventanaPrevia = null;
    if (Platform.OS === 'web') ventanaPrevia = window.open('', '_blank');
    try {
      const anio = parseInt(mesKey.slice(0, 4), 10);
      const mes = parseInt(mesKey.slice(5, 7), 10);
      const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
      const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(lastDayOfMonth(anio, mes)).padStart(2, '0')}`;
      const datos = await fetchDatos({ desde, hasta });
      if (!datos) { showError('Sesión no encontrada. Vuelve a iniciar sesión.'); return; }
      const html = buildReporteHtml({
        recursos: datos.recursos,
        inscripciones: datos.inscripciones,
        operacionales: datos.operacionales,
        economicos: datos.economicos,
        tipos: datos.tipos,
        mensual: datos.mensual,
        rangoTxt: `${MONTH_NAMES_FULL[mes - 1]} ${anio}`,
        titulo: `Reporte Mensual · ${MONTH_NAMES_FULL[mes - 1]} ${anio}`,
        tipo: 'mensual',
      });
      await emitirDocumento(html, `reporte_mensual_${mesKey}`, ventanaPrevia);
    } catch (err) {
      console.error('Error al generar reporte mensual:', err);
      showError('Error al generar reporte mensual: ' + err.message);
    } finally {
      setGenerando(false);
    }
  };

  // ── Exportar a Excel (.xls) ───────────────────────────
  const exportarExcel = async () => {
    setMenuExportAbierto(false);
    try {
      const csvFila = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

      // Hoja 1: Eventos
      const evRows = tablaEventos.map(r =>
        `<tr><td>${csvFila(r.nombre)}</td><td>${csvFila(fechaTxt(r.fecha))}</td><td>${csvFila(r.lugar)}</td><td>${csvFila(r.solicitante)}</td>` +
        `<td>${r.recursos ?? ''}</td><td>${csvFila(r.estado)}</td><td>${r.balance ?? ''}</td></tr>`).join('');
      const hojaEventos = `<div id="Eventos"><table border="1"><thead><tr><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Solicitante</th><th>Recursos</th><th>Estado</th><th>Balance</th></tr></thead><tbody>${evRows}</tbody></table></div>`;

      // Hoja 2: Resumen económico por evento
      const ecoRows = (repEconomicos?.porEvento || []).map(ev =>
        `<tr><td>${csvFila(ev.nombreevento)}</td><td>${csvFila(ev.fechaevento)}</td>` +
        `<td>${ev.pres_ingresos ?? ''}</td><td>${ev.pres_egresos ?? ''}</td><td>${ev.real_ingresos ?? ''}</td><td>${ev.real_egresos ?? ''}</td><td>${ev.balance_real ?? ''}</td></tr>`).join('');
      const hojaEco = `<div id="Economico"><table border="1"><thead><tr><th>Evento</th><th>Fecha</th><th>Pres. Ingresos</th><th>Pres. Egresos</th><th>Real Ingresos</th><th>Real Egresos</th><th>Balance Real</th></tr></thead><tbody>${ecoRows}</tbody></table></div>`;

      // Hoja 3: Evolución mensual
      const mesRows = repMensual.map(m =>
        `<tr><td>${m.mes}</td><td>${m.totalEvents ?? ''}</td><td>${m.aprobado ?? ''}</td><td>${m.pendiente ?? ''}</td><td>${m.rechazado ?? ''}</td></tr>`).join('');
      const hojaMes = `<div id="Mensual"><table border="1"><thead><tr><th>Mes</th><th>Eventos</th><th>Aprobados</th><th>Pendientes</th><th>Rechazados</th></tr></thead><tbody>${mesRows}</tbody></table></div>`;

      const xls = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">
      <xml><x:ExcelWorkbook><x:Worksheets>
        <x:Worksheet><x:Name>Eventos</x:Name></x:Worksheet>
        <x:Worksheet><x:Name>Economico</x:Name></x:Worksheet>
        <x:Worksheet><x:Name>Mensual</x:Name></x:Worksheet>
      </x:Worksheets></x:ExcelWorkbook></xml>
      <style>table{border-collapse:collapse}th{background:#C44B0A;color:#fff;padding:5px 8px;font-weight:bold}td{padding:4px 8px;border:1px solid #ccc;mso-number-format:"\\@"}</style>
      </head><body>${hojaEventos}${hojaEco}${hojaMes}</body></html>`;

      if (Platform.OS === 'web') {
        const blob = new Blob(['\uFEFF' + xls], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_excel_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Éxito', 'Libro Excel descargado (.xls). Ábrelo con Excel.');
      } else {
        const path = FileSystem.documentDirectory + `reporte_excel_${Date.now()}.xls`;
        await FileSystem.writeAsStringAsync(path, '\uFEFF' + xls, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'application/vnd.ms-excel', dialogTitle: 'Exportar a Excel', UTI: 'com.microsoft.excel.xls' });
      }
    } catch (err) {
      console.error(err);
      showError('Error al exportar a Excel: ' + err.message);
    }
  };

  const mesesDisponibles = useMemo(() => {
    const hoy = new Date();
    const lista = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      lista.push({ mes: d.getMonth() + 1, anio: d.getFullYear(), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
    }
    return lista;
  }, []);

  const aniosDisponibles = useMemo(() => {
    const actual = new Date().getFullYear();
    const lista = [];
    for (let a = actual + 1; a >= actual - 6; a--) lista.push(a);
    return lista;
  }, []);

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
              <TouchableOpacity style={styles.iconBtnPrimary} onPress={() => setMenuExportAbierto(true)} accessibilityRole="button" accessibilityLabel="Generar documentos">
                <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
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

      {/* Modal selector de año para el reporte anual */}
      <Modal transparent visible={anioModalAbierto} animationType="fade" onRequestClose={() => setAnioModalAbierto(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={[styles.kpiIconWrap, { backgroundColor: COLORS.primaryLight, width: 52, height: 52 }]}>
                <Ionicons name="calendar-number" size={26} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>Reporte anual completo</Text>
              <Text style={styles.modalSub}>Selecciona el año para generar el informe de gestión con evolución mensual, distribuciones, rankings y el detalle de todos los eventos.</Text>
            </View>
            <View style={styles.anioGrid}>
              {aniosDisponibles.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.anioChip, a === new Date().getFullYear() && styles.anioChipActual]}
                  onPress={() => generarReporteAnual(a)}
                  disabled={generando}
                  accessibilityRole="button"
                  accessibilityLabel={`Generar reporte ${a}`}
                >
                  <Text style={[styles.anioChipText, a === new Date().getFullYear() && styles.anioChipTextActual]}>
                    {a}{a === new Date().getFullYear() ? ' · actual' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {generando ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.modalSub}>Generando reporte anual…</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setAnioModalAbierto(false)}>
                <Text style={styles.modalBtnGhostText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal menú de documentos (PDF mensual/anual, Excel, CSV) */}
      <Modal transparent visible={menuExportAbierto} animationType="fade" onRequestClose={() => setMenuExportAbierto(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuExportAbierto(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.menuCard} onPress={() => {}}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.kpiIconWrap, { backgroundColor: COLORS.primaryLight, width: 52, height: 52 }]}>
                <Ionicons name="documents-outline" size={26} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>Generar documentos</Text>
              <Text style={styles.modalSub}>Elige qué informe generar de los reportes cargados.</Text>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuExportAbierto(false); setMesModalAbierto(true); }} accessibilityRole="button">
              <View style={[styles.menuIconWrap, { backgroundColor: '#EFF6FF' }]}><Ionicons name="calendar-outline" size={20} color={COLORS.info} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemTitle}>Reporte mensual en PDF</Text>
                <Text style={styles.menuItemSub}>Informe imprimible de un mes específico</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuExportAbierto(false); setAnioModalAbierto(true); }} accessibilityRole="button">
              <View style={[styles.menuIconWrap, { backgroundColor: '#FFF7ED' }]}><Ionicons name="calendar-number-outline" size={20} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemTitle}>Reporte anual completo</Text>
                <Text style={styles.menuItemSub}>Informe de gestión con evolución de 12 meses</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={exportarExcel} accessibilityRole="button">
              <View style={[styles.menuIconWrap, { backgroundColor: '#F0FDF4' }]}><Ionicons name="tablet-portrait-outline" size={20} color={COLORS.success} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemTitle}>Exportar a Excel</Text>
                <Text style={styles.menuItemSub}>Libro .xls con hojas por sección</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuExportAbierto(false); exportarCSV(); }} accessibilityRole="button">
              <View style={[styles.menuIconWrap, { backgroundColor: '#F5F3FF' }]}><Ionicons name="download-outline" size={20} color={COLORS.purple} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemTitle}>Exportar CSV de eventos</Text>
                <Text style={styles.menuItemSub}>Lista de eventos del período filtrado</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuExportAbierto(false); generarPDF(); }} accessibilityRole="button">
              <View style={[styles.menuIconWrap, { backgroundColor: '#ECFEFF' }]}><Ionicons name="print-outline" size={20} color={COLORS.cyan} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemTitle}>PDF del período filtrado</Text>
                <Text style={styles.menuItemSub}>Reporte con el rango de fechas elegido</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal selector de mes para el reporte mensual */}
      <Modal transparent visible={mesModalAbierto} animationType="fade" onRequestClose={() => setMesModalAbierto(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={[styles.kpiIconWrap, { backgroundColor: COLORS.primaryLight, width: 52, height: 52 }]}>
                <Ionicons name="calendar-outline" size={26} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>Reporte mensual</Text>
              <Text style={styles.modalSub}>Selecciona el mes para generar el informe en PDF con KPIs, distribuciones, rankings y el detalle de eventos del mes.</Text>
            </View>
            <View style={styles.mesGrid}>
              {mesesDisponibles.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.mesChip, m.key === mesesDisponibles[0].key && styles.mesChipActual]}
                  onPress={() => generarReporteMensual(m.key)}
                  disabled={generando}
                  accessibilityRole="button"
                  accessibilityLabel={`Generar reporte de ${MONTH_NAMES_FULL[m.mes - 1]} ${m.anio}`}
                >
                  <Text style={[styles.mesChipText, m.key === mesesDisponibles[0].key && styles.mesChipTextActual]}>
                    {MONTH_NAMES_SHORT[m.mes - 1]} {m.anio}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {generando ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.modalSub}>Generando reporte mensual…</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setMesModalAbierto(false)}>
                <Text style={styles.modalBtnGhostText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

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

            {/* Detalle evento por evento */}
            <View style={styles.section}>
              <SectionHeader
                icon="reader-outline"
                title="Detalle por evento"
                subtitle="Toca una tarjeta para expandir"
                action={
                  <TouchableOpacity
                    style={[styles.exportBtn, eventoExpandido !== null && { backgroundColor: COLORS.primary }]}
                    onPress={() => setEventoExpandido(eventoExpandido !== null ? null : detalleEventos[0]?.id ?? null)}
                    accessibilityRole="button"
                    accessibilityLabel={eventoExpandido !== null ? 'Contraer todos' : 'Expandir primero'}
                  >
                    <Text style={[styles.exportBtnText, eventoExpandido !== null && { color: COLORS.white }]}>
                      {eventoExpandido !== null ? 'Contraer' : 'Expandir'}
                    </Text>
                  </TouchableOpacity>
                }
              />
              {detalleEventos.length ? (
                detalleEventos.map(ev => {
                  const abierto = eventoExpandido === ev.id;
                  const bal = ev.economia ? Number(ev.economia.balance_real) : null;
                  return (
                    <View key={`det-${ev.id}`} style={[styles.detCard, abierto && styles.detCardAbierto]}>
                      <TouchableOpacity
                        style={styles.detHeader}
                        onPress={() => setEventoExpandido(abierto ? null : ev.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Detalle de ${ev.nombre}`}
                      >
                        <View style={styles.detHeaderLeft}>
                          <View style={styles.detNumero}><Text style={styles.detNumeroText}>{detalleEventos.indexOf(ev) + 1}</Text></View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.detNombre} numberOfLines={2}>{ev.nombre}</Text>
                            <Text style={styles.detMeta}>
                              {fechaTxt(ev.fecha)}{ev.lugar ? ` · ${ev.lugar}` : ''}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.detHeaderRight}>
                          <EstadoBadge estado={ev.estado} />
                          <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textTertiary} />
                        </View>
                      </TouchableOpacity>
                      {abierto ? (
                        <View style={styles.detBody}>
                          <View style={styles.detFila}><Text style={styles.detLabel}>Solicitante</Text><Text style={styles.detValor}>{ev.solicitante || '–'}</Text></View>
                          <View style={styles.detFila}><Text style={styles.detLabel}>Recursos solicitados</Text><Text style={styles.detValor}>{fmtNum(ev.recursos)}</Text></View>
                          {ev.facultad ? <View style={styles.detFila}><Text style={styles.detLabel}>Facultad</Text><Text style={styles.detValor}>{ev.facultad}</Text></View> : null}
                          <View style={styles.detFila}><Text style={styles.detLabel}>Inscritos</Text><Text style={styles.detValor}>{ev.inscritos === null || ev.inscritos === undefined ? '–' : fmtNum(ev.inscritos)}</Text></View>
                          <View style={styles.detEco}>
                            <View style={styles.detEcoCol}>
                              <Text style={styles.detEcoTitulo}>Presupuesto</Text>
                              <Text style={[styles.detEcoValor, { color: COLORS.info }]}>Ing: {ev.economia ? fmtBs(ev.economia.pres_ingresos) : '–'}</Text>
                              <Text style={[styles.detEcoValor, { color: COLORS.error }]}>Egr: {ev.economia ? fmtBs(ev.economia.pres_egresos) : '–'}</Text>
                            </View>
                            <View style={styles.detEcoCol}>
                              <Text style={styles.detEcoTitulo}>Ejecutado</Text>
                              <Text style={[styles.detEcoValor, { color: COLORS.info }]}>Ing: {ev.economia ? fmtBs(ev.economia.real_ingresos) : '–'}</Text>
                              <Text style={[styles.detEcoValor, { color: COLORS.error }]}>Egr: {ev.economia ? fmtBs(ev.economia.real_egresos) : '–'}</Text>
                            </View>
                            <View style={styles.detEcoCol}>
                              <Text style={styles.detEcoTitulo}>Balance</Text>
                              <Text style={[styles.detEcoValor, { color: bal === null ? COLORS.textTertiary : bal >= 0 ? COLORS.success : COLORS.error }]}>
                                {bal === null ? '–' : fmtBs(bal)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              ) : <Text style={styles.emptyNote}>Sin eventos para mostrar.</Text>}
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
  modalTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  modalBtnGhost: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9, backgroundColor: COLORS.divider },
  modalBtnCancel: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, backgroundColor: COLORS.divider, alignItems: 'center', marginTop: 16 },
  modalBtnGhostText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  anioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  anioChip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: COLORS.border,
    minWidth: 86, alignItems: 'center',
  },
  anioChipActual: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  anioChipText: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  anioChipTextActual: { color: COLORS.primary },
  iconBtnPrimary: {
    width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  menuCard: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 18,
    maxHeight: '88%',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  menuIconWrap: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  menuItemSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  mesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  mesChip: {
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: COLORS.border,
    minWidth: 96, alignItems: 'center',
  },
  mesChipActual: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  mesChipText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  mesChipTextActual: { color: COLORS.primary },
  detCard: {
    backgroundColor: COLORS.surface, borderRadius: 13, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  detCardAbierto: { borderColor: COLORS.primary, borderWidth: 1.5 },
  detHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  detNumero: {
    width: 28, height: 28, borderRadius: 9, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  detNumeroText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  detNombre: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  detMeta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  detHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detBody: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 10 },
  detFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  detLabel: { fontSize: 12.5, color: COLORS.textSecondary },
  detValor: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  detEco: {
    flexDirection: 'row', gap: 10, marginTop: 10,
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10,
  },
  detEcoCol: { flex: 1 },
  detEcoTitulo: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, color: COLORS.textTertiary, marginBottom: 3 },
  detEcoValor: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
});

export default ReportesAvanzadosScreen;