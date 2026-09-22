import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, useWindowDimensions, Platform,
  Modal, TextInput, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PieChart } from 'react-native-chart-kit';
import * as FileSystem from 'expo-file-system';
import Svg, { Path, Line as SvgLine, Circle, Text as SvgText, Rect as SvgRect } from 'react-native-svg';
import AdminHeader from '../../components/admin/AdminHeader';

const COLORS = {
  primary: '#C44200',
  primaryLight: '#FFF0E6',
  secondary: '#0F172A',
  accent: '#EF4444',
  success: '#047857',
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
  cancelado: { bg: '#D1D5DB', text: '#0F172A', icon: 'ban' },
  vencido: { bg: '#FFF0E6', text: '#c2410c', icon: 'alert-circle' },
};
const estadoBadgeFallback = { bg: '#D1D5DB', text: '#64748B' };

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

const KpiCard = ({ label, value, icon, color, sub, delta, deltaTxt, invert, onPress, active }) => {
  const buenSigno = delta !== null && delta !== undefined ? (invert ? delta <= 0 : delta >= 0) : null;
  const deltaColor = buenSigno === null ? COLORS.textTertiary : buenSigno ? COLORS.success : COLORS.error;
  const deltaIcon = buenSigno === null ? 'remove' : buenSigno ? 'trending-up' : 'trending-down';
  return (
    <TouchableOpacity
      style={[styles.kpiCard, { borderTopColor: color }, active && { borderColor: color, backgroundColor: color + '0A' }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
      {delta !== null && delta !== undefined ? (
        <View style={styles.kpiDelta}>
          <Ionicons name={deltaIcon} size={13} color={deltaColor} />
          <Text style={[styles.kpiDeltaText, { color: deltaColor }]}>
            {delta >= 0 ? '+' : ''}{delta}%
          </Text>
          <Text style={styles.kpiDeltaSub}>{deltaTxt || 'vs ant.'}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

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

// ── Gráfico de línea + área propio (evita el LineChart de chart-kit, que no
//    dibuja la línea en web) ─────────────────────────────────────────────────
const TrendLine = ({ labels = [], months = [], values = [], valuesYoy = null, width, height = 230, color = '#3B82F6', onPoint }) => {
  const n = Math.min(labels.length, values.length);
  if (!n) return null;

  const num = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const padL = 36, padR = 10, padT = 12, padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const todas = [...values.slice(0, n), ...(valuesYoy ? valuesYoy.slice(0, n) : [])].map(num);
  let maxV = 0;
  let minV = 0;
  todas.forEach(v => {
    if (v > maxV) maxV = v;
    if (v < minV) minV = v;
  });
  if (maxV === minV) maxV = minV + 1;

  const X = (i) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const Y = (v) => padT + innerH - ((num(v) - minV) / (maxV - minV)) * innerH;
  const baseY = padT + innerH;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, t) => minV + ((maxV - minV) * t) / ticks);
  const pts = (arr) => arr.slice(0, n).map((v, i) => `${X(i)},${Y(v)}`).join(' L');
  const lineD = `M${pts(values)}`;
  const areaD = `M${pts(values)} L${X(n - 1)},${baseY} L${X(0)},${baseY} Z`;
  const yoyD = valuesYoy ? `M${pts(valuesYoy)}` : null;

  return (
    <>
      <Svg width={width} height={height}>
        {yTicks.map((tick, t) => (
          <SvgLine
            key={`g${t}`}
            x1={padL}
            x2={width - padR}
            y1={Y(tick)}
            y2={Y(tick)}
            stroke={COLORS.border}
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
        ))}
        {yTicks.map((tick, t) => (
          <SvgText key={`yl${t}`} x={padL - 6} y={Y(tick) + 3} fontSize={10} fill={COLORS.textTertiary} textAnchor="end">
            {Math.round(tick * 10) / 10}
          </SvgText>
        ))}
        <Path d={areaD} fill={color + '1A'} strokeWidth={0} />
        {yoyD ? <Path d={yoyD} fill="none" stroke="#94A3B8" strokeWidth={1.6} strokeDasharray="6 6" /> : null}
        <Path d={lineD} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {values.slice(0, n).map((v, i) => (
          <Circle
            key={`d${i}`}
            cx={X(i)}
            cy={Y(v)}
            r={5}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth={1.6}
            onPress={() => onPoint && onPoint(i)}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: padL, paddingRight: padR }}>
        {labels.slice(0, n).map((lb, i) => (
          <Text key={`x${i}`} numberOfLines={1} style={{ flex: 1, fontSize: 10, color: COLORS.textTertiary, textAlign: 'center' }}>
            {lb}
          </Text>
        ))}
      </View>
    </>
  );
};

// ── Gráfico de barras propio (evita el BarChart de chart-kit, que sale en
//    fondo oscuro en web) ──────────────────────────────────────────────────
const MiniBarChart = ({ labels = [], values = [], width, height = 220, color = COLORS.primary, onBar }) => {
  const n = Math.min(labels.length, values.length);
  if (!n) return null;

  const num = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const padL = 36, padR = 10, padT = 12, padB = 4;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const baseY = padT + innerH;

  const dataVals = values.slice(0, n).map(num);
  const maxV = Math.max(...dataVals, 1);

  const slot = innerW / n;
  const barW = Math.min(slot * 0.55, 34);

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, t) => (maxV * t) / ticks);
  const Y = (v) => padT + innerH - (num(v) / maxV) * innerH;

  return (
    <>
      <Svg width={width} height={height}>
        {yTicks.map((tick, t) => (
          <SvgLine
            key={`g${t}`}
            x1={padL}
            x2={width - padR}
            y1={Y(tick)}
            y2={Y(tick)}
            stroke={COLORS.border}
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
        ))}
        {yTicks.map((tick, t) => (
          <SvgText key={`yl${t}`} x={padL - 6} y={Y(tick) + 3} fontSize={10} fill={COLORS.textTertiary} textAnchor="end">
            {Math.round(tick * 10) / 10}
          </SvgText>
        ))}
        {dataVals.map((v, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const barH = Math.max(baseY - Y(v), 0);
          return (
            <SvgRect
              key={`b${i}`}
              x={x}
              y={baseY - barH}
              width={barW}
              height={barH}
              rx={4}
              fill={color}
              fillOpacity={0.92}
              onPress={() => onBar && onBar(i)}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', paddingLeft: padL, paddingRight: padR }}>
        {labels.slice(0, n).map((lb, i) => (
          <Text key={`bxl${i}`} numberOfLines={1} style={{ flex: 1, fontSize: 10, color: COLORS.textTertiary, textAlign: 'center' }}>
            {lb}
          </Text>
        ))}
      </View>
    </>
  );
};

// ── Constructor de reportes HTML (período y anual) ─────────────
const buildReporteHtml = ({ recursos, inscripciones, operacionales, economicos, tipos, mensual, gestion, contexto, rangoTxt, titulo, anio, tipo }) => {
  const r = recursos || {};
  const eco = (economicos && economicos.resumen) || null;
  const bal = eco ? Number(eco.balance_real) : null;
  const g = gestion || null;
  const asisMap = {};
  (g?.asistenciaPorEvento || []).forEach(ev => { asisMap[String(ev.idevento)] = ev; });
  const ejeMap = {};
  (g?.ejecucionPorEvento || []).forEach(ev => { ejeMap[String(ev.idevento)] = ev; });
  const porEstado = Array.isArray(operacionales?.porEstado) ? operacionales.porEstado : [];
  const estadoColor = { aprobado: '#047857', completado: '#1d4ed8', finalizado: '#1d4ed8', pendiente: '#F59E0B', rechazado: '#EF4444', cancelado: '#94A3B8', vencido: '#EA580C' };
  const porEvento = Array.isArray(economicos?.porEvento) ? economicos.porEvento : [];
  const porMerode = Array.isArray(economicos?.porMoneda) ? economicos.porMoneda : [];

  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);

  const eventRows = (ev) => {
    const e = String(ev.estado || '').toLowerCase();
    const col = estadoBadgeStyles[e] || estadoBadgeFallback;
    const asis = asisMap[String(ev.id)] || null;
    const eje = ejeMap[String(ev.id)] || null;
    const asisTxt = asis && asis.tasa !== null && asis.tasa !== undefined ? `${asis.tasa}%` : '–';
    const ejeTxt = eje && eje.porcentaje !== null && eje.porcentaje !== undefined ? `${eje.porcentaje}%` : '–';
    return `<tr><td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;font-weight:600;">${h(ev.nombreEvento || ev.nombre)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;">${ev.fecha ? String(ev.fecha).slice(0, 10) : '–'}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;">${h(ev.lugarevento || ev.lugar)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;">${h(ev.solicitante)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${fmtNum(ev.totalRecursos !== undefined ? ev.totalRecursos : ev.recursos)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${asisTxt}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${ejeTxt}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;"><span style="background:${col.bg};color:${col.text};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">${capStr(ev.estado)}</span></td></tr>`;
  };

  const economicoRows = porMerode.map(m => {
    const git = m.tipo === 'gasto' ? m.total : null;
    const ing = m.tipo === 'ingreso' ? m.total : null;
    return `<tr><td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;font-weight:600;">${h(m.moneda)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:right;">${fmtBs(ing)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:right;">${fmtBs(git)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:right;${(bal || 0) >= 0 ? 'color:#047857;' : 'color:#dc2626;'};font-weight:700;">${fmtBs(bal)}</td></tr>`;
  }).join('');

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
          <td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;font-weight:600;">${MONTH_NAMES_FULL[i - 1]}</td>
          <td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;font-weight:700;">${fmtNum(ev)}</td>
          <td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;">
            <div style="background:#E6E9EF;border-radius:5px;height:9px;min-width:60px;"><div style="width:${pctEv}%;height:100%;background:#3B82F6;border-radius:5px;"></div></div>
          </td>
          <td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${fmtNum(ap)} <span style="color:#047857;font-size:10px;">(${pctAp}%)</span></td>
          <td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;font-weight:700;">${fmtNum(inscr)}</td>
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
    return `<tr><td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;"><span style="color:${c};font-weight:700;">${capStr(x.estado)}</span></td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${x.total}</td></tr>`;
  }).join('');

  const recRows = (r.recursosMasUsados || []).slice(0, 8).map(x => {
    const maxv = Math.max(...(r.recursosMasUsados || []).map(y => y.usos || 0), 1);
    const pct = Math.round(((x.usos || 0) / maxv) * 100);
    return `<tr><td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;font-weight:600;">${h(x.nombre)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${fmtNum(x.usos)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;"><div style="background:#E6E9EF;border-radius:5px;height:9px;"><div style="width:${pct}%;height:100%;background:#3B82F6;border-radius:5px;"></div></div></td></tr>`;
  }).join('');

  const facRows = (inscripciones?.porFacultad || []).slice(0, 8).map(x => {
    const maxv = Math.max(...(inscripciones?.porFacultad || []).map(y => y.inscritos || 0), 1);
    const pct = Math.round(((x.inscritos || 0) / maxv) * 100);
    return `<tr><td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;font-weight:600;">${h(x.facultad)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${fmtNum(x.inscritos)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;"><div style="background:#E6E9EF;border-radius:5px;height:9px;"><div style="width:${pct}%;height:100%;background:#8B5CF6;border-radius:5px;"></div></div></td></tr>`;
  }).join('');

  const tipoRows = (tipos || []).slice(0, 8).map(x => {
    return `<tr><td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;font-weight:600;">${h(x.tipo)}</td>` +
      `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${fmtNum(x.total)}</td></tr>`;
  }).join('');

  const solRows = (g?.topSolicitantes || []).slice(0, 10).map(x =>
    `<tr><td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;font-weight:600;">${h(x.nombre)}</td>` +
    `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;">${fmtNum(x.total)}</td>` +
    `<td style="padding:8px;border:1px solid #E6E9EF;font-size:12px;text-align:center;color:#047857;font-weight:700;">${fmtNum(x.aprobados)}</td></tr>`
  ).join('');

  const tasaAceptGlobal = g ? pct(g.aprobados, g.totalEventos) : null;
  const hayGestion = g && (g.tasaAsistencia !== null || g.diasPromedioAprobacion !== null || g.ejecucionPresupuestaria?.porcentaje !== null || tasaAceptGlobal !== null);
  const gestionHtml = hayGestion ? `
    <div class="section-h">Indicadores de gestión</div>
    <div class="stats-grid">
      <div class="stat-card" style="border-left-color:#8b5cf6"><div class="stat-label">Asistencia</div><div class="stat-value" style="color:#8b5cf6">${g.tasaAsistencia !== null && g.tasaAsistencia !== undefined ? g.tasaAsistencia + '%' : '–'}</div><div style="font-size:10px;color:#64748b;">${fmtNum(g.asistentes)} de ${fmtNum(g.inscritos)} inscritos</div></div>
      <div class="stat-card" style="border-left-color:#3B82F6"><div class="stat-label">Días hasta aprobación</div><div class="stat-value" style="color:#1d4ed8">${g.diasPromedioAprobacion !== null && g.diasPromedioAprobacion !== undefined ? g.diasPromedioAprobacion + ' d' : '–'}</div><div style="font-size:10px;color:#64748b;">promedio del período</div></div>
      <div class="stat-card" style="border-left-color:#C44200"><div class="stat-label">Ejecución presupuesto</div><div class="stat-value" style="color:#C44200">${g.ejecucionPresupuestaria?.porcentaje !== null && g.ejecucionPresupuestaria?.porcentaje !== undefined ? g.ejecucionPresupuestaria.porcentaje + '%' : '–'}</div><div style="font-size:10px;color:#64748b;">Egresos reales Bs ${fmtNum(g.ejecucionPresupuestaria?.real_egresos || 0)}</div></div>
      <div class="stat-card" style="border-left-color:#f59e0b"><div class="stat-label">Aceptación por facultad</div><div class="stat-value" style="color:#f59e0b">${tasaAceptGlobal !== null ? tasaAceptGlobal + '%' : '–'}</div><div style="font-size:10px;color:#64748b;">${fmtNum(g.aprobados)} aprobados de ${fmtNum(g.totalEventos)} eventos</div></div>
    </div>
    <div class="section-h">Top solicitantes</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Solicitante</th><th style="width:18%;text-align:center;">Eventos</th><th style="width:22%;text-align:center;">Aprobados</th></tr></thead><tbody>${solRows || '<tr><td colspan="3" style="padding:12px;color:#94A3B8;text-align:center;">Sin datos</td></tr>'}</tbody></table>` : '';

  const listaEventos = (r.eventoRecientes || []).slice(0, 80).map(ev => {
    const econ = porEvento.find(x => String(x.idevento) === String(ev.id));
    ev.balance = econ ? econ.balance_real : null;
    return eventRows(ev);
  }).join('');

  const kpiGrid = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Solicitudes</div><div class="stat-value">${fmtNum(r.totalSolicitudes)}</div></div>
      <div class="stat-card" style="border-left-color:#047857"><div class="stat-label">Aprobados</div><div class="stat-value" style="color:#047857">${fmtNum(r.aprobadas)}</div></div>
      <div class="stat-card" style="border-left-color:#f59e0b"><div class="stat-label">Pendientes</div><div class="stat-value" style="color:#f59e0b">${fmtNum(r.pendientes)}</div></div>
      <div class="stat-card" style="border-left-color:#8b5cf6"><div class="stat-label">Inscritos</div><div class="stat-value" style="color:#8b5cf6">${fmtNum(inscripciones?.total)}</div></div>
    </div>`;

  const economiaHtml = (eco && (bal !== null && bal !== undefined)) ? `
    <div style="margin-top:22px;">
      <div class="section-h">Resumen económico</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;">
        <div style="flex:1;min-width:150px;background:#fff;border:1px solid #E6E9EF;border-radius:10px;padding:14px;text-align:center;border-top:4px solid #3B82F6;">
          <div class="stat-label">Ingresos registrados</div>
          <div style="font-size:17px;font-weight:800;color:#1d4ed8;">${fmtBs(eco.real_ingresos)}</div></div>
        <div style="flex:1;min-width:150px;background:#fff;border:1px solid #E6E9EF;border-radius:10px;padding:14px;text-align:center;border-top:4px solid #ef4444;">
          <div class="stat-label">Egresos registrados</div>
          <div style="font-size:17px;font-weight:800;color:#dc2626;">${fmtBs(eco.real_egresos)}</div></div>
        <div style="flex:1;min-width:150px;background:#fff;border:1px solid #E6E9EF;border-radius:10px;padding:14px;text-align:center;border-top:4px solid ${bal >= 0 ? '#047857' : '#dc2626'};">
          <div class="stat-label">Balance real</div>
          <div style="font-size:17px;font-weight:800;color:${bal >= 0 ? '#047857' : '#dc2626'};">${fmtBs(bal)}</div></div>
      </div>
      ${economicoRows ? `<div style="margin-top:16px;"><table class="main-table"><thead><tr><th style="text-align:left;">Moneda</th><th style="width:26%;text-align:right;">Ingresos</th><th style="width:26%;text-align:right;">Egresos</th><th style="width:26%;text-align:right;">Balance</th></tr></thead><tbody>${economicoRows}</tbody></table></div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    @page{size:A4 portrait;margin:14mm 12mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#D1D5DB;color:#1f2937;font-size:12px;line-height:1.5}
    .wrap{max-width:1000px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08)}
    .cover{background:linear-gradient(135deg,#B54708 0%,#E95A0C 55%,#F2701C 100%);color:#fff;padding:40px 38px;position:relative}
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
    .stat-card{background:#fff;border:1px solid #E6E9EF;border-radius:10px;padding:13px;text-align:center;border-left:4px solid #C44200}
    .stat-label{font-size:9px;color:#64748B;margin-bottom:4px;text-transform:uppercase;letter-spacing:.7px;font-weight:700}
    .stat-value{font-size:20px;font-weight:800;color:#111827}
    .section-h{font-size:14px;font-weight:800;margin:22px 0 10px;color:#111827;text-transform:uppercase;border-left:4px solid #C44200;padding-left:10px;letter-spacing:.5px}
    .main-table{width:100%;border-collapse:collapse;margin-top:8px}
    .main-table th{background:#E95A0C;color:#fff;padding:8px 10px;border:1px solid #E95A0C;text-align:left;font-weight:700;font-size:11px}
    .main-table td{padding:7px 9px;border:1px solid #E6E9EF;vertical-align:top;font-size:11.5px}
    .main-table tr:nth-child(even){background:#f8faf8}
    .page-break{page-break-before:always}
    .footer{margin-top:28px;text-align:center;font-size:10.5px;color:#94A3B8;padding:14px 0 4px;border-top:1px solid #E6E9EF}
    .footer strong{color:#64748B}
    @media print{.cover{background:#E95A0C}.wrap{box-shadow:none}body{background:#fff}}
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
      ${contexto ? `<div class="meta-chip">🎯 ${contexto}</div>` : ''}
    </div>
    <div class="accent-bar"></div>
  </div>
  <div class="content">
    ${kpiGrid}
    ${gestionHtml}
    ${monthlyHtml}
    <div class="section-h">Distribución por estado</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Estado</th><th style="width:20%;text-align:center;">Cantidad</th></tr></thead><tbody>${estadosHtml || '<tr><td colspan="2" style="padding:12px;color:#94A3B8;text-align:center;">Sin datos</td></tr>'}</tbody></table>
    <div class="section-h">Recursos más solicitados</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Recurso</th><th style="width:14%;text-align:center;">Usos</th><th style="width:34%;">Distribución</th></tr></thead><tbody>${recRows || '<tr><td colspan="3" style="padding:12px;color:#94A3B8;text-align:center;">Sin datos</td></tr>'}</tbody></table>
    <div class="section-h">Inscritos por facultad</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Facultad</th><th style="width:14%;text-align:center;">Inscritos</th><th style="width:34%;">Distribución</th></tr></thead><tbody>${facRows || '<tr><td colspan="3" style="padding:12px;color:#94A3B8;text-align:center;">Sin datos</td></tr>'}</tbody></table>
    <div class="section-h">Tipos de evento</div>
    <table class="main-table"><thead><tr><th style="text-align:left;">Tipo</th><th style="width:20%;text-align:center;">Cantidad</th></tr></thead><tbody>${tipoRows || '<tr><td colspan="2" style="padding:12px;color:#94A3B8;text-align:center;">Sin datos</td></tr>'}</tbody></table>
    ${economiaHtml}
    <div class="page-break"></div>
    <div class="section-h">Detalle de eventos</div>
    <table class="main-table">
      <thead><tr><th style="text-align:left;">Evento</th><th style="width:10%;">Fecha</th><th style="width:14%;">Lugar</th><th style="width:14%;">Solicitante</th><th style="width:7%;text-align:center;">Recursos</th><th style="width:9%;text-align:center;">Asist.</th><th style="width:9%;text-align:center;">Presup.</th><th style="width:12%;text-align:center;">Estado</th></tr></thead>
      <tbody>${listaEventos || '<tr><td colspan="8" style="padding:12px;color:#94A3B8;text-align:center;">Sin eventos</td></tr>'}</tbody>
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
  const router = useRouter();
  const chartWidth = Math.max(windowWidth - 56, 240);
  const tableWidth = Math.max(windowWidth - 62, 600);
  const isNarrow = windowWidth < 960;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filtro de fechas
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');
  const [periodoPreset, setPeriodoPreset] = useState('mes');
  const [drillMes, setDrillMes] = useState(null); // 'YYYY-MM' al tocar un punto del gráfico
  const [pickerTarget, setPickerTarget] = useState(null); // 'desde' | 'hasta' | null
  const [anioModalAbierto, setAnioModalAbierto] = useState(false);
  const [menuExportAbierto, setMenuExportAbierto] = useState(false);
  const [mesModalAbierto, setMesModalAbierto] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);

  // Interactividad
  const [tendenciaMetrica, setTendenciaMetrica] = useState('eventos');
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState(null);
  const [ordenRecursos, setOrdenRecursos] = useState('desc');
  const [ordenTipos, setOrdenTipos] = useState('desc');
  const [prevData, setPrevData] = useState(null); // período anterior para comparar

  // Fase 1: segmentación y comparación
  const [facultadFiltro, setFacultadFiltro] = useState(null); // id facultad | null
  const [tipoFiltro, setTipoFiltro] = useState(null); // id tipo de evento | null
  const [listaFacultades, setListaFacultades] = useState([]);
  const [comparacionTipo, setComparacionTipo] = useState('prev'); // 'prev' | 'anio'

  // Alcance por usuario: académicos solo ven sus propios eventos; admin/DAF + selector por académico
  const [usuarioMe, setUsuarioMe] = useState(null); // { role, id, nombre }
  const [listaAcademicos, setListaAcademicos] = useState([]);
  const [academicoFiltro, setAcademicoFiltro] = useState(null); // idacademico | null
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false); // panel de filtros plegable

  // Datos
  const [repRecursos, setRepRecursos] = useState(null);
  const [repInscripciones, setRepInscripciones] = useState(null);
  const [repOperacionales, setRepOperacionales] = useState(null);
  const [repEconomicos, setRepEconomicos] = useState(null);
  const [repTipos, setRepTipos] = useState([]);
  const [repMensual, setRepMensual] = useState([]);
  const [repGestion, setRepGestion] = useState(null);

  const showError = (msg) => Alert.alert('Error', msg, [{ text: 'OK' }]);

  const esAcademico = usuarioMe?.role === 'academico';

  const filtrosActivos = (facultadFiltro ? 1 : 0) + (tipoFiltro ? 1 : 0) + (!esAcademico && academicoFiltro ? 1 : 0);

  const paramsReportes = useMemo(() => {
    const p = {};
    if (reporteDesde) p.desde = reporteDesde;
    if (reporteHasta) p.hasta = reporteHasta;
    if (facultadFiltro) p.facultad_id = facultadFiltro;
    if (tipoFiltro) p.tipo = tipoFiltro;
    if (!esAcademico && academicoFiltro) p.idacademico = academicoFiltro;
    return p;
  }, [reporteDesde, reporteHasta, facultadFiltro, tipoFiltro, esAcademico, academicoFiltro]);

  // Solo los filtros de alcance (sin rango), para reutilizar en reportes con fechas propias
  const paramsAlcance = useMemo(() => {
    const p = {};
    if (facultadFiltro) p.facultad_id = facultadFiltro;
    if (tipoFiltro) p.tipo = tipoFiltro;
    if (!esAcademico && academicoFiltro) p.idacademico = academicoFiltro;
    return p;
  }, [facultadFiltro, tipoFiltro, esAcademico, academicoFiltro]);

  const fetchDatos = useCallback(async (params) => {
    const token = await getTokenAsync();
    if (!token) return null;
    const headers = { Authorization: `Bearer ${token}` };
    const [recRes, inscRes, opRes, ecoRes, tipoRes, mesRes, gesRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/reportes/recursos`, { params: { periodo: 'mes', ...params }, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/inscripciones`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/operacionales`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/economicos`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/tipos`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/mensual`, { params, headers }).catch(() => null),
      axios.get(`${API_BASE_URL}/reportes/gestion`, { params, headers }).catch(() => null),
    ]);
    const datos = {
      recursos: recRes?.data || null,
      inscripciones: inscRes?.data || null,
      operacionales: opRes?.data || null,
      economicos: ecoRes?.data || null,
      tipos: Array.isArray(tipoRes?.data?.porTipo) ? tipoRes.data.porTipo : [],
      mensual: Array.isArray(mesRes?.data) ? mesRes.data : [],
      gestion: gesRes?.data || null,
    };
    const ok = recRes || inscRes || opRes || ecoRes || tipoRes || mesRes || gesRes;
    return { ...datos, ok: !!ok };
  }, []);

  // Ventana anterior (misma duración, inmediatamente antes) para comparación
  const rangoAnterior = useMemo(() => {
    const hoy = new Date();
    let ini, fin;
    if (reporteDesde || reporteHasta) {
      ini = reporteDesde ? new Date(reporteDesde + 'T00:00:00') : new Date(hoy);
      fin = reporteHasta ? new Date(reporteHasta + 'T00:00:00') : new Date(hoy);
      if (fin < ini) fin = new Date(ini);
    } else {
      ini = new Date(hoy); ini.setDate(ini.getDate() - 30);
      fin = new Date(hoy);
    }
    const dias = Math.round((fin - ini) / 86400000) + 1;
    const iniPrev = new Date(ini);
    iniPrev.setDate(iniPrev.getDate() - dias);
    const finPrev = new Date(ini);
    finPrev.setDate(finPrev.getDate() - 1);
    return { desde: fmtLocalDate(iniPrev), hasta: fmtLocalDate(finPrev) };
  }, [reporteDesde, reporteHasta]);

  // Ventana del año anterior (mismo rango, 12 meses antes) para comparación YoY
  const rangoAnteriorAnio = useMemo(() => {
    const hoy = new Date();
    const ini = reporteDesde ? new Date(reporteDesde + 'T00:00:00') : new Date(hoy);
    const fin = reporteHasta ? new Date(reporteHasta + 'T00:00:00') : new Date(hoy);
    const iniPrev = new Date(ini);
    iniPrev.setFullYear(iniPrev.getFullYear() - 1);
    const finPrev = new Date(fin);
    finPrev.setFullYear(finPrev.getFullYear() - 1);
    if (finPrev < iniPrev) finPrev.setDate(iniPrev.getDate());
    return { desde: fmtLocalDate(iniPrev), hasta: fmtLocalDate(finPrev) };
  }, [reporteDesde, reporteHasta]);

  const cargarDatos = useCallback(async (silent) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const datos = await fetchDatos(paramsReportes);
      if (!datos) { if (!silent) setError('Sesión no encontrada.'); return; }
      setRepRecursos(datos.recursos);
      setRepInscripciones(datos.inscripciones);
      setRepOperacionales(datos.operacionales);
      setRepEconomicos(datos.economicos);
      setRepTipos(datos.tipos);
      setRepMensual(datos.mensual);
      setRepGestion(datos.gestion);
      if (!datos.ok && !silent) setError('No se pudo contactar el servidor.');

      try {
        const token = await getTokenAsync();
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const rangoComp = comparacionTipo === 'anio' ? rangoAnteriorAnio : rangoAnterior;
        const paramsComp = { ...paramsReportes, ...rangoComp };
        const [prevRec, prevInsc, prevGes] = await Promise.all([
          axios.get(`${API_BASE_URL}/reportes/recursos`, { params: { periodo: 'mes', ...paramsComp }, headers }).catch(() => null),
          axios.get(`${API_BASE_URL}/reportes/inscripciones`, { params: paramsComp, headers }).catch(() => null),
          axios.get(`${API_BASE_URL}/reportes/gestion`, { params: paramsComp, headers }).catch(() => null),
        ]);
        setPrevData(prevRec?.data ? {
          solicitudes: prevRec.data.totalSolicitudes || 0,
          aprobados: prevRec.data.aprobadas || 0,
          inscritos: prevInsc?.data?.total || 0,
          gestion: prevGes?.data ? {
            asistentes: prevGes.data.asistentes || 0,
            dias: prevGes.data.diasPromedioAprobacion,
            ejecucion: prevGes.data.ejecucionPresupuestaria?.porcentaje ?? null,
            tasaAsistencia: prevGes.data.tasaAsistencia ?? null,
            tasaAceptacion: prevGes.data.aprobados > 0 && prevGes.data.totalEventos > 0
              ? Math.round((prevGes.data.aprobados / prevGes.data.totalEventos) * 100) : null,
          } : null,
        } : null);
      } catch (e) { /* comparación opcional */ }
    } catch (err) {
      console.error(err);
      if (!silent) setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchDatos, paramsReportes, rangoAnterior, rangoAnteriorAnio, comparacionTipo]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Lista de facultades para el filtro de segmentación
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const token = await getTokenAsync();
        if (!token) return;
        const [facRes, meRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/facultades`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (activo && Array.isArray(facRes.data)) setListaFacultades(facRes.data);
        if (activo && meRes?.data) setUsuarioMe(meRes.data);
        if (activo && meRes?.data && meRes.data.role !== 'academico') {
          const acRes = await axios.get(`${API_BASE_URL}/reportes/academicos`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
          if (activo && Array.isArray(acRes?.data)) setListaAcademicos(acRes.data);
        }
      } catch (e) { /* lista opcional */ }
    })();
    return () => { activo = false; };
  }, []);

  const limpiarFiltro = () => { setReporteDesde(''); setReporteHasta(''); };
  const limpiarDrill = () => { setDrillMes(null); setReporteDesde(''); setReporteHasta(''); setPeriodoPreset('todo'); };

  // Presets rápidos de período
  const PERIODOS = [
    { id: '7d', label: '7 días' },
    { id: 'mes', label: 'Este mes' },
    { id: '3m', label: '3 meses' },
    { id: 'anio', label: 'Año' },
    { id: 'todo', label: 'Todo' },
  ];
  const aplicarPeriodo = (id) => {
    setPeriodoPreset(id);
    setDrillMes(null);
    const hoy = new Date();
    if (id === 'todo') { setReporteDesde(''); setReporteHasta(''); return; }
    if (id === '7d') { const d = new Date(hoy); d.setDate(d.getDate() - 6); setReporteDesde(fmtLocalDate(d)); setReporteHasta(fmtLocalDate(hoy)); return; }
    if (id === 'mes') { setReporteDesde(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`); setReporteHasta(fmtLocalDate(hoy)); return; }
    if (id === '3m') { const d = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1); setReporteDesde(fmtLocalDate(d)); setReporteHasta(fmtLocalDate(hoy)); return; }
    if (id === 'anio') { setReporteDesde(`${hoy.getFullYear()}-01-01`); setReporteHasta(fmtLocalDate(hoy)); }
  };
  const presetActivo = useMemo(() => {
    if (drillMes) return 'drill';
    if (!reporteDesde && !reporteHasta) return 'todo';
    return periodoPreset;
  }, [drillMes, reporteDesde, reporteHasta, periodoPreset]);

  // Drill-down: tocar un mes en la tendencia
  const aplicarMes = (mesKey) => {
    const anio = parseInt(mesKey.slice(0, 4), 10);
    const mes = parseInt(mesKey.slice(5, 7), 10);
    setReporteDesde(`${anio}-${String(mes).padStart(2, '0')}-01`);
    setReporteHasta(`${anio}-${String(mes).padStart(2, '0')}-${String(lastDayOfMonth(anio, mes)).padStart(2, '0')}`);
    setDrillMes(mesKey);
    setPeriodoPreset(null);
  };

  const deltaPct = (v, pv) => {
    if (pv === null || pv === undefined) return null;
    if (pv <= 0) return v > 0 ? 100 : 0;
    return Math.round(((v - pv) / pv) * 100);
  };

  // ── Derivados para gráficos ──────────────────────────────
  const kpis = useMemo(() => {
    const r = repRecursos || {};
    const g = repGestion || null;
    const eco = repEconomicos?.resumen || null;
    const bal = eco ? Number(eco.balance_real) : null;
    const PV = prevData || null;
    const PVg = PV?.gestion || null;
    const isAnio = comparacionTipo === 'anio';
    const dtxt = isAnio ? 'vs año ant.' : 'vs ant.';
    const d = (v, pv) => (PV || PVg ? deltaPct(v, pv) : null);
    const onEstado = (f) => () => setEstadoFiltro(estadoFiltro === f ? null : f);
    const tasaAceptActual = g ? (g.totalEventos > 0 ? Math.round((g.aprobados / g.totalEventos) * 100) : null) : null;
    const mejorFac = (g?.aceptacionPorFacultad || []).find(f => f.tasa !== null && f.tasa !== undefined) || null;
    return [
      { label: 'Solicitudes', value: fmtNum(r.totalSolicitudes), icon: 'file-tray-full-outline', color: COLORS.cyan, sub: 'total de recursos', delta: d(r.totalSolicitudes || 0, PV?.solicitudes), deltaTxt: dtxt, onPress: onEstado(null), active: estadoFiltro === null },
      { label: 'Aprobados', value: fmtNum(r.aprobadas), icon: 'checkmark-done-outline', color: COLORS.success, sub: 'eventos aprobados', delta: d(r.aprobadas || 0, PV?.aprobados), deltaTxt: dtxt, onPress: onEstado('aprobado'), active: estadoFiltro === 'aprobado' },
      { label: 'Pendientes', value: fmtNum(r.pendientes), icon: 'time-outline', color: COLORS.warning, sub: 'en revisión', onPress: onEstado('pendiente'), active: estadoFiltro === 'pendiente' },
      { label: 'Rechazados', value: fmtNum((r.rechazadas || 0) + (r.canceladas || 0)), icon: 'close-circle-outline', color: COLORS.error, sub: 'rechazados + cancelados', onPress: onEstado('rechazado'), active: estadoFiltro === 'rechazado' },
      { label: 'Inscritos', value: fmtNum(repInscripciones?.total), icon: 'person-add-outline', color: COLORS.purple, sub: 'participantes', delta: d(repInscripciones?.total || 0, PV?.inscritos), deltaTxt: dtxt },
      { label: 'Balance real', value: bal === null || bal === undefined ? '–' : fmtBs(bal), icon: 'wallet-outline', color: bal >= 0 ? COLORS.success : COLORS.error, sub: 'informes de cierre' },
      { label: 'Tasa aprobación', value: r.totalSolicitudes ? Math.round((r.aprobadas / r.totalSolicitudes) * 100) + '%' : '–', icon: 'analytics-outline', color: COLORS.info, sub: 'sobre solicitudes' },
      { label: 'Asistencia', value: g?.tasaAsistencia !== null && g?.tasaAsistencia !== undefined ? g.tasaAsistencia + '%' : '–', icon: 'location-outline', color: COLORS.success, sub: g ? `${fmtNum(g.asistentes)} de ${fmtNum(g.inscritos)} inscritos` : 'sin informes', delta: d(g?.tasaAsistencia, PVg?.tasaAsistencia), deltaTxt: dtxt },
      { label: 'Días hasta aprobación', value: g?.diasPromedioAprobacion !== null && g?.diasPromedioAprobacion !== undefined ? `${g.diasPromedioAprobacion} d` : '–', icon: 'hourglass-outline', color: COLORS.purple, sub: 'promedio del período', delta: d(g?.diasPromedioAprobacion, PVg?.dias), deltaTxt: dtxt, invert: true },
      { label: 'Ejecución presupuesto', value: g?.ejecucionPresupuestaria?.porcentaje !== null && g?.ejecucionPresupuestaria?.porcentaje !== undefined ? g.ejecucionPresupuestaria.porcentaje + '%' : '–', icon: 'pie-chart-outline', color: COLORS.primary, sub: g ? `Egresos reales: ${fmtBs(g.ejecucionPresupuestaria?.real_egresos || 0)}` : 'sin presupuesto', delta: d(g?.ejecucionPresupuestaria?.porcentaje, PVg?.ejecucion), deltaTxt: dtxt },
      { label: 'Aceptación por facultad', value: tasaAceptActual !== null ? tasaAceptActual + '%' : '–', icon: 'ribbon-outline', color: COLORS.warning, sub: mejorFac ? `Mejor: ${mejorFac.facultad} (${mejorFac.tasa}%)` : 'global', delta: d(tasaAceptActual, PVg?.tasaAceptacion), deltaTxt: dtxt },
    ];
  }, [repRecursos, repInscripciones, repEconomicos, repGestion, prevData, estadoFiltro, comparacionTipo, deltaPct]);

  const pieEstados = useMemo(() => {
    const colorMap = {
      aprobado: '#047857', completado: '#1d4ed8', finalizado: '#1d4ed8',
      pendiente: '#F59E0B', rechazado: '#EF4444', cancelado: '#94A3B8', vencido: '#EA580C',
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
    const mes = Array.isArray(repMensual) ? repMensual : [];
    const seriePorMes = {};
    mes.forEach(m => { if (m && m.mes) seriePorMes[m.mes] = m; });
    // Ordena de más antiguo a más reciente y normaliza los números
    const meses = Object.keys(seriePorMes).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const fila = (key) => {
      const r = seriePorMes[key];
      return {
        total: Number(r?.totalEvents) || 0,
        aprob: Number(r?.aprobado) || 0,
      };
    };
    // Capa comparativa YoY: para cada mes del rango actual, su equivalente de hace 12 meses
    let anioTot = null;
    let anioApr = null;
    if (comparacionTipo === 'anio' && meses.length) {
      anioTot = meses.map(key => {
        const d = new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10) - 1, 1);
        d.setFullYear(d.getFullYear() - 1);
        const pk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const row = seriePorMes[pk];
        return row ? (Number(row.totalEvents) || 0) : 0;
      });
      anioApr = meses.map(key => {
        const d = new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10) - 1, 1);
        d.setFullYear(d.getFullYear() - 1);
        const pk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const row = seriePorMes[pk];
        return row ? (Number(row.aprobado) || 0) : 0;
      });
    }
    return {
      labels: meses.map(monthLabel),
      meses,
      total: meses.map(k => fila(k).total),
      aprob: meses.map(k => fila(k).aprob),
      anioTot,
      anioApr,
    };
  }, [repMensual, comparacionTipo]);

  const inscritosPorMes = useMemo(() => {
    const porMes = Array.isArray(repInscripciones?.porMes) ? repInscripciones.porMes : [];
    return {
      labels: porMes.map(r => monthLabel(r.mes)),
      meses: porMes.map(r => r.mes),
      values: porMes.map(r => r.inscritos || 0),
    };
  }, [repInscripciones]);

  const rankingRecursos = useMemo(() => {
    const arr = (repRecursos?.recursosMasUsados || []).map(r => ({ name: r.nombre, value: r.usos }));
    return ordenRecursos === 'asc' ? [...arr].sort((a, b) => a.value - b.value) : arr;
  }, [repRecursos, ordenRecursos]);

  const rankingFacultades = useMemo(() =>
    (repInscripciones?.porFacultad || []).map(r => ({ name: r.facultad, value: r.inscritos })),
  [repInscripciones]);

  const rankingTipos = useMemo(() => {
    const arr = repTipos.map(r => ({ name: r.tipo, value: r.total }));
    return ordenTipos === 'asc' ? [...arr].sort((a, b) => a.value - b.value) : arr;
  }, [repTipos, ordenTipos]);

  const rankingSolicitantes = useMemo(() =>
    (repGestion?.topSolicitantes || []).map(r => ({ name: r.nombre, value: r.aprobados })),
  [repGestion]);

  const tablaEventos = useMemo(() => {
    const recientes = repRecursos?.eventoRecientes || [];
    const econMap = {};
    (repEconomicos?.porEvento || []).forEach(ev => { econMap[String(ev.idevento)] = ev; });
    const asisMap = {};
    (repGestion?.asistenciaPorEvento || []).forEach(ev => { asisMap[String(ev.idevento)] = ev; });
    const ejeMap = {};
    (repGestion?.ejecucionPorEvento || []).forEach(ev => { ejeMap[String(ev.idevento)] = ev; });
    return recientes.map(ev => {
      const asis = asisMap[String(ev.id)] || null;
      const eje = ejeMap[String(ev.id)] || null;
      return {
        id: ev.id,
        nombre: ev.nombreEvento,
        fecha: ev.fecha || ev.fechaevento,
        lugar: ev.lugarevento,
        solicitante: ev.solicitante,
        recursos: ev.totalRecursos,
        estado: ev.estado,
        balance: econMap[String(ev.id)] ? econMap[String(ev.id)].balance_real : null,
        asistentes: asis?.asistentes ?? null,
        inscritos: asis?.inscritos ?? null,
        tasaAsistencia: asis?.tasa ?? null,
        ejecucion: eje?.porcentaje ?? null,
      };
    });
  }, [repRecursos, repEconomicos, repGestion]);

  // ── Exportación CSV ─────────────────────────────────────
  const exportarCSV = async () => {
    try {
      if (!tablaEventos.length) { showError('No hay eventos para exportar.'); return; }
      const head = ['ID', 'Evento', 'Fecha', 'Lugar', 'Solicitante', 'Recursos', 'Asistencia %', 'Ejecución %', 'Estado', 'Balance'];
      const rows = tablaEventos.map(r => [
        r.id,
        `"${(r.nombre || '').replace(/"/g, '""')}"`,
        r.fecha || '',
        `"${(r.lugar || '').replace(/"/g, '""')}"`,
        `"${(r.solicitante || '').replace(/"/g, '""')}"`,
        r.recursos,
        r.tasaAsistencia !== null && r.tasaAsistencia !== undefined ? r.tasaAsistencia : '',
        r.ejecucion !== null && r.ejecucion !== undefined ? r.ejecucion : '',
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

  // ── Contexto de filtros activos (para reportes) ─────────
  const contextoFiltros = () => {
    const parts = [];
    if (!esAcademico && academicoFiltro) {
      const a = listaAcademicos.find(x => String(x.idacademico) === String(academicoFiltro));
      if (a) parts.push(`Académico: ${a.nombre}`);
    }
    if (facultadFiltro) {
      const f = listaFacultades.find(x => String(x.facultad_id) === String(facultadFiltro));
      if (f) parts.push(`Facultad: ${f.nombre_facultad}`);
    }
    if (tipoFiltro) {
      const t = repTipos.find(x => String(x.idtipoevento) === String(tipoFiltro));
      if (t) parts.push(`Tipo: ${t.tipo}`);
    }
    return parts.join(' · ') || null;
  };

  // ── Exportación PDF (resumen de la vista filtrada actual) ────────
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
        gestion: repGestion,
        contexto: contextoFiltros(),
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
      const datos = await fetchDatos({ desde, hasta, ...paramsAlcance });
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
        gestion: datos.gestion,
        contexto: contextoFiltros(),
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
      const datos = await fetchDatos({ desde, hasta, ...paramsAlcance });
      if (!datos) { showError('Sesión no encontrada. Vuelve a iniciar sesión.'); return; }
      const html = buildReporteHtml({
        recursos: datos.recursos,
        inscripciones: datos.inscripciones,
        operacionales: datos.operacionales,
        economicos: datos.economicos,
        tipos: datos.tipos,
        mensual: datos.mensual,
        gestion: datos.gestion,
        contexto: contextoFiltros(),
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
      <style>table{border-collapse:collapse}th{background:#C44200;color:#fff;padding:5px 8px;font-weight:bold}td{padding:4px 8px;border:1px solid #ccc;mso-number-format:"\\@"}</style>
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

  // ── Filtros de búsqueda y estado aplicados a las listas ──
  const coincideEstado = (est) => {
    const e = String(est || '').toLowerCase();
    if (!estadoFiltro) return true;
    if (estadoFiltro === 'rechazado') return e === 'rechazado' || e === 'cancelado';
    return e === estadoFiltro;
  };
  const coincideBusqueda = (nombre, solicitante) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return String(nombre || '').toLowerCase().includes(q) || String(solicitante || '').toLowerCase().includes(q);
  };
  const tablaEventosFiltrados = useMemo(() =>
    tablaEventos.filter(r => coincideEstado(r.estado) && coincideBusqueda(r.nombre, r.solicitante)),
  [tablaEventos, estadoFiltro, busqueda]);

  const ESTADOS_FILTRO = [
    { id: null, label: 'Todos' },
    { id: 'aprobado', label: 'Aprobado' },
    { id: 'pendiente', label: 'Pendiente' },
    { id: 'rechazado', label: 'Rechazado' },
    { id: 'cancelado', label: 'Cancelado' },
    { id: 'vencido', label: 'Vencido' },
  ];

  const irDetalleEvento = (id) => {
    if (!id && id !== 0) return;
    router.push({ pathname: '/admin/EventDetailUpdateScreen', params: { eventId: String(id) } });
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
              <TouchableOpacity style={styles.iconBtnPrimary} onPress={() => setMenuExportAbierto(true)} accessibilityRole="button" accessibilityLabel="Generar documentos">
                <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => cargarDatos(true)} accessibilityRole="button" accessibilityLabel="Actualizar datos">
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
                        setPeriodoPreset(null);
                        setDrillMes(null);
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
                    {reporteDesde || reporteHasta || drillMes ? (
                      <TouchableOpacity style={styles.modalBtnGhost} onPress={() => { limpiarDrill(); setPickerTarget(null); }}>
                        <Text style={styles.modalBtnGhostText}>Limpiar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          ) : null}
        </View>

        {/* Presets rápidos de período */}
        <View style={styles.presetsRow}>
          {PERIODOS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.presetChip, presetActivo === p.id && styles.presetChipActivo]}
              onPress={() => aplicarPeriodo(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`Período ${p.label}`}
            >
              <Text style={[styles.presetChipText, presetActivo === p.id && styles.presetChipTextActivo]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
          {drillMes ? (
            <TouchableOpacity style={[styles.presetChip, styles.drillChip]} onPress={limpiarDrill} accessibilityRole="button" accessibilityLabel="Quitar filtro de mes">
              <Ionicons name="close-circle" size={13} color={COLORS.white} />
              <Text style={styles.drillChipText}>Mes {drillMes.slice(0, 4)}-{drillMes.slice(5, 7)}</Text>
            </TouchableOpacity>
          ) : null}
          {!esAcademico && (listaAcademicos.length > 0 || listaFacultades.length > 0 || repTipos.length > 0) ? (
            <TouchableOpacity
              style={[styles.presetChip, styles.filtrosToggle, filtrosAbiertos && styles.presetChipActivo]}
              onPress={() => setFiltrosAbiertos(v => !v)}
              accessibilityRole="button"
              accessibilityLabel="Abrir o cerrar filtros avanzados"
            >
              <Ionicons name="funnel-outline" size={13} color={filtrosAbiertos ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.presetChipText, filtrosActivos > 0 && styles.presetChipTextConFiltro, filtrosAbiertos && styles.presetChipTextActivo]}>Filtros</Text>
              {filtrosActivos > 0 ? (
                <View style={[styles.filtrosBadge, filtrosAbiertos && { backgroundColor: COLORS.white }]}>
                  <Text style={[styles.filtrosBadgeText, filtrosAbiertos && { color: COLORS.primary }]}>{filtrosActivos}</Text>
                </View>
              ) : null}
              <Ionicons name={filtrosAbiertos ? 'chevron-up' : 'chevron-down'} size={12} color={filtrosAbiertos ? COLORS.white : COLORS.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Banner de alcance para académicos */}
        {usuarioMe && esAcademico ? (
          <View style={styles.scopeBanner}>
            <Ionicons name="person-circle-outline" size={16} color={COLORS.purple} />
            <Text style={styles.scopeBannerText}>
              Estás viendo solo tus propios eventos, {usuarioMe.nombre?.split(' ')[0] || 'docente'}.
            </Text>
          </View>
        ) : null}

        {/* Filtros avanzados: académico, facultad y tipo (colapsados por defecto) */}
        {filtrosAbiertos && !esAcademico && (listaAcademicos.length > 0 || listaFacultades.length > 0 || repTipos.length > 0) ? (
          <View style={styles.segWrap}>
            {listaAcademicos.length > 0 ? (
              <View style={styles.segGroup}>
                <Text style={styles.segLabel}><Ionicons name="person-outline" size={12} color={COLORS.primary} /> Ver reportes de</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segChipsRow}>
                  <TouchableOpacity
                    style={[styles.segChip, !academicoFiltro && styles.segChipActivo]}
                    onPress={() => setAcademicoFiltro(null)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.segChipText, !academicoFiltro && styles.segChipTextActivo]}>Todos</Text>
                  </TouchableOpacity>
                  {listaAcademicos.map(a => (
                    <TouchableOpacity
                      key={a.idacademico}
                      style={[styles.segChip, academicoFiltro === a.idacademico && styles.segChipActivo]}
                      onPress={() => setAcademicoFiltro(academicoFiltro === a.idacademico ? null : a.idacademico)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver reportes de ${a.nombre}`}
                    >
                      <Text style={[styles.segChipText, academicoFiltro === a.idacademico && styles.segChipTextActivo]} numberOfLines={1}>
                        {a.nombre}{a.facultad && a.facultad !== 'Sin facultad' ? ` · ${a.facultad}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {listaFacultades.length > 0 ? (
              <View style={styles.segGroup}>
                <Text style={styles.segLabel}><Ionicons name="school-outline" size={12} color={COLORS.purple} /> Facultad</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segChipsRow}>
                  <TouchableOpacity
                    style={[styles.segChip, !facultadFiltro && styles.segChipActivo]}
                    onPress={() => setFacultadFiltro(null)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.segChipText, !facultadFiltro && styles.segChipTextActivo]}>Todas</Text>
                  </TouchableOpacity>
                  {listaFacultades.map(f => (
                    <TouchableOpacity
                      key={f.facultad_id}
                      style={[styles.segChip, facultadFiltro === f.facultad_id && styles.segChipActivo]}
                      onPress={() => setFacultadFiltro(facultadFiltro === f.facultad_id ? null : f.facultad_id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtrar por ${f.nombre_facultad}`}
                    >
                      <Text style={[styles.segChipText, facultadFiltro === f.facultad_id && styles.segChipTextActivo]} numberOfLines={1}>{f.nombre_facultad}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {repTipos.length > 0 ? (
              <View style={styles.segGroup}>
                <Text style={styles.segLabel}><Ionicons name="pricetags-outline" size={12} color={COLORS.info} /> Tipo de evento</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segChipsRow}>
                  <TouchableOpacity
                    style={[styles.segChip, !tipoFiltro && styles.segChipActivo]}
                    onPress={() => setTipoFiltro(null)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.segChipText, !tipoFiltro && styles.segChipTextActivo]}>Todos</Text>
                  </TouchableOpacity>
                  {repTipos.map(t => (
                    <TouchableOpacity
                      key={t.idtipoevento}
                      style={[styles.segChip, tipoFiltro === t.idtipoevento && styles.segChipActivo]}
                      onPress={() => setTipoFiltro(tipoFiltro === t.idtipoevento ? null : t.idtipoevento)}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtrar por ${t.tipo}`}
                    >
                      <Text style={[styles.segChipText, tipoFiltro === t.idtipoevento && styles.segChipTextActivo]} numberOfLines={1}>{t.tipo}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Comparar con período anterior o mismo período del año anterior */}
        <View style={styles.compareRow}>
          <Ionicons name="git-compare-outline" size={13} color={COLORS.info} />
          <Text style={styles.compareLabel}>Comparar con:</Text>
          <View style={styles.segment}>
            <TouchableOpacity style={[styles.segmentBtn, comparacionTipo === 'prev' && styles.segmentBtnActivo]} onPress={() => setComparacionTipo('prev')} accessibilityRole="button" accessibilityLabel="Comparar con período anterior">
              <Text style={[styles.segmentText, comparacionTipo === 'prev' && styles.segmentTextActivo]}>Período anterior</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentBtn, comparacionTipo === 'anio' && styles.segmentBtnActivo]} onPress={() => setComparacionTipo('anio')} accessibilityRole="button" accessibilityLabel="Comparar con mismo período del año anterior">
              <Text style={[styles.segmentText, comparacionTipo === 'anio' && styles.segmentTextActivo]}>Mismo {new Date().getFullYear() - 1}</Text>
            </TouchableOpacity>
          </View>
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
                <Text style={styles.menuItemTitle}>Imprimir vista actual (PDF)</Text>
                <Text style={styles.menuItemSub}>Todo lo que ves en pantalla, con filtros y gestión</Text>
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => cargarDatos(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando reportes…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={44} color={COLORS.textTertiary} />
            <Text style={styles.loadingText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => cargarDatos(false)}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Intro: qué contiene esta pantalla y cómo usarla */}
            <View style={styles.introCard}>
              <TouchableOpacity
                style={styles.introHeader}
                onPress={() => setIntroVisible(v => !v)}
                accessibilityRole="button"
                accessibilityLabel={introVisible ? 'Esconder ayuda' : 'Mostrar ayuda'}
              >
                <View style={styles.introHeaderLeft}>
                  <View style={styles.introIconWrap}>
                    <Ionicons name="help-circle-outline" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.introTitle}>¿Para qué sirve esta pantalla?</Text>
                    <Text style={styles.introSub}>Resumen de la actividad académica en el período seleccionado</Text>
                  </View>
                </View>
                <Ionicons name={introVisible ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
              {introVisible ? (
                <View style={styles.introBody}>
                  <View style={styles.introRow}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.info} style={styles.introRowIcon} />
                    <Text style={styles.introRowText}>
                      <Text style={styles.introRowTextStrong}>Qué verás aquí: </Text>
                      cuántas solicitudes y eventos han existido, cuántos fueron aprobados, cuántas personas asistieron y cómo se usó el presupuesto.
                    </Text>
                  </View>
                  <View style={styles.introRow}>
                    <Ionicons name="albums-outline" size={16} color={COLORS.purple} style={styles.introRowIcon} />
                    <Text style={styles.introRowText}>
                      <Text style={styles.introRowTextStrong}>Tarjetas (KPIs): </Text>
                      resumen rápido del período. Toca una tarjeta para filtrar la lista por ese estado (por ejemplo, «Aprobados»).
                    </Text>
                  </View>
                  <View style={styles.introRow}>
                    <Ionicons name="trending-up-outline" size={16} color={COLORS.cyan} style={styles.introRowIcon} />
                    <Text style={styles.introRowText}>
                      <Text style={styles.introRowTextStrong}>Gráficos: </Text>
                      evolución mensual (toca un punto para ver ese mes), distribución por estado y rankings de recursos, facultades, tipos y solicitantes.
                    </Text>
                  </View>
                  <View style={styles.introRow}>
                    <Ionicons name="reader-outline" size={16} color={COLORS.primary} style={styles.introRowIcon} />
                    <Text style={styles.introRowText}>
                      <Text style={styles.introRowTextStrong}>Tabla y detalle por evento: </Text>
                      cada evento con su estado; ábrelo para ver fichas con presupuesto, asistencia y balance.
                    </Text>
                  </View>
                  <View style={styles.introRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.warning} style={styles.introRowIcon} />
                    <Text style={styles.introRowText}>
                      <Text style={styles.introRowTextStrong}>Filtros: </Text>
                      fija las fechas (Desde / Hasta) o usa los atajos «7 días», «Este mes», «3 meses», «Año» y «Todo» para acotar la información.
                    </Text>
                  </View>
                  <View style={styles.introRow}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.success} style={styles.introRowIcon} />
                    <Text style={styles.introRowText}>
                      <Text style={styles.introRowTextStrong}>Documentos: </Text>
                      usa el icono de documento (esquina superior derecha) para generar el informe en PDF, Excel, CSV o imprimir el reporte.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.introBtn} onPress={() => setIntroVisible(false)} accessibilityRole="button" accessibilityLabel="Cerrar ayuda">
                    <Text style={styles.introBtnText}>Entendido</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* Tendencia mensual */}
            <View style={styles.section}>
              <SectionHeader
                icon="trending-up-outline"
                title="Tendencia mensual"
                subtitle="Toca un punto para filtrar al mes"
                action={(
                  <View style={styles.segment}>
                    <TouchableOpacity style={[styles.segmentBtn, tendenciaMetrica === 'eventos' && styles.segmentBtnActivo]} onPress={() => setTendenciaMetrica('eventos')} accessibilityRole="button">
                      <Text style={[styles.segmentText, tendenciaMetrica === 'eventos' && styles.segmentTextActivo]}>Eventos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.segmentBtn, tendenciaMetrica === 'aprobados' && styles.segmentBtnActivo]} onPress={() => setTendenciaMetrica('aprobados')} accessibilityRole="button">
                      <Text style={[styles.segmentText, tendenciaMetrica === 'aprobados' && styles.segmentTextActivo]}>Aprobados</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
              <View style={styles.card}>
                {trendData.labels.length ? (
                  <TrendLine
                    height={230}
                    width={chartWidth}
                    labels={trendData.labels}
                    months={trendData.meses}
                    values={tendenciaMetrica === 'aprobados' ? trendData.aprob : trendData.total}
                    valuesYoy={comparacionTipo === 'anio' ? (tendenciaMetrica === 'aprobados' ? trendData.anioApr : trendData.anioTot) : null}
                    color={tendenciaMetrica === 'aprobados' ? '#16A34A' : '#3B82F6'}
                    onPoint={(i) => {
                      const mesKey = trendData.meses[i];
                      if (mesKey) aplicarMes(mesKey);
                    }}
                  />
                ) : <Text style={styles.emptyNote}>Sin datos mensuales para este rango.</Text>}
                <Text style={styles.chartHint}>
                  <Ionicons name="finger-print" size={11} color={COLORS.textTertiary} /> Toca un punto de la línea para filtrar KPIs y listas a ese mes.
                </Text>
                {comparacionTipo === 'anio' && trendData.anioTot ? (
                  <View style={styles.chartLegend}>
                    <View style={styles.chartLegendItem}><View style={[styles.chartLegendDot, { backgroundColor: tendenciaMetrica === 'aprobados' ? '#047857' : '#3B82F6' }]} /><Text style={styles.chartLegendText}>Actual</Text></View>
                    <View style={styles.chartLegendItem}><View style={styles.chartLegendDash} /><Text style={styles.chartLegendText}>{new Date().getFullYear() - 1}</Text></View>
                  </View>
                ) : null}
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
              <SectionHeader icon="bar-chart-outline" title="Inscritos por mes" subtitle="Toca una barra para filtrar" />
              <View style={styles.card}>
                {inscritosPorMes.labels.length ? (
                  <MiniBarChart
                    labels={inscritosPorMes.labels}
                    values={inscritosPorMes.values}
                    width={chartWidth}
                    height={220}
                    color={COLORS.primary}
                    onBar={(i) => {
                      const mesKey = inscritosPorMes.meses[i];
                      if (mesKey) aplicarMes(mesKey);
                    }}
                  />
                ) : <Text style={styles.emptyNote}>Sin datos de inscripciones para este rango.</Text>}
              </View>
            </View>

            {/* Rankings */}
            <View style={styles.rankGrid}>
              <View style={styles.cardFull}>
                <SectionHeader
                  icon="cube-outline"
                  title="Recursos más solicitados"
                  action={(
                    <TouchableOpacity style={styles.orderBtn} onPress={() => setOrdenRecursos(ordenRecursos === 'desc' ? 'asc' : 'desc')} accessibilityRole="button" accessibilityLabel="Cambiar orden de recursos">
                      <Text style={styles.orderBtnText}>{ordenRecursos === 'desc' ? 'Más usados' : 'Menos usados'}</Text>
                      <Ionicons name={ordenRecursos === 'desc' ? 'arrow-down' : 'arrow-up'} size={13} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                />
                <RankBar rows={rankingRecursos} />
              </View>
              <View style={styles.cardFull}>
                <SectionHeader icon="school-outline" title="Inscritos por facultad" />
                <RankBar rows={rankingFacultades} />
              </View>
              <View style={styles.cardFull}>
                <SectionHeader
                  icon="pricetags-outline"
                  title="Tipos de evento"
                  action={(
                    <TouchableOpacity style={styles.orderBtn} onPress={() => setOrdenTipos(ordenTipos === 'desc' ? 'asc' : 'desc')} accessibilityRole="button" accessibilityLabel="Cambiar orden de tipos">
                      <Text style={styles.orderBtnText}>{ordenTipos === 'desc' ? 'Más usados' : 'Menos usados'}</Text>
                      <Ionicons name={ordenTipos === 'desc' ? 'arrow-down' : 'arrow-up'} size={13} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                />
                <RankBar rows={rankingTipos} />
              </View>
              <View style={styles.cardFull}>
                <SectionHeader icon="people-outline" title="Top solicitantes" subtitle="por eventos aprobados" />
                <RankBar rows={rankingSolicitantes} />
              </View>
            </View>

            {/* Tabla exportable y filtrable */}
            <View style={styles.section}>
              <SectionHeader
                icon="list-outline"
                title="Eventos recientes"
                subtitle={`${tablaEventosFiltrados.length} de ${tablaEventos.length}`}
                action={
                  <TouchableOpacity style={styles.exportBtn} onPress={exportarCSV} accessibilityRole="button" accessibilityLabel="Exportar eventos">
                    <Ionicons name="download-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.exportBtnText}>CSV</Text>
                  </TouchableOpacity>
                }
              />
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={COLORS.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por evento o solicitante…"
                  placeholderTextColor={COLORS.textTertiary}
                  value={busqueda}
                  onChangeText={setBusqueda}
                  autoCorrect={false}
                />
                {busqueda ? (
                  <TouchableOpacity onPress={() => setBusqueda('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
                    <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.estadoChipsWrap}>
                <View style={styles.estadoChips}>
                  {ESTADOS_FILTRO.map(e => (
                    <TouchableOpacity
                      key={e.label}
                      style={[styles.estadoChip, estadoFiltro === e.id && styles.estadoChipActivo]}
                      onPress={() => setEstadoFiltro(estadoFiltro === e.id ? null : e.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtrar por ${e.label}`}
                    >
                      <Text style={[styles.estadoChipText, estadoFiltro === e.id && styles.estadoChipTextActivo]}>{e.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.card}>
                {tablaEventosFiltrados.length ? (
                  isNarrow ? (
                    <View>
                      {tablaEventosFiltrados.slice(0, 25).map((r, i) => (
                        <TouchableOpacity
                          key={`m-${i}-${r.id || r.nombre}`}
                          style={[styles.mobileEventCard, i % 2 === 1 && styles.tableRowAlt]}
                          onPress={() => irDetalleEvento(r.id)}
                          activeOpacity={0.6}
                        >
                          <View style={styles.mobileEventTop}>
                            <Text style={styles.mobileEventTitle} numberOfLines={2}>{r.nombre || 'Sin nombre'}</Text>
                            <EstadoBadge estado={r.estado} />
                          </View>
                          <View style={styles.mobileEventMeta}>
                            <View style={styles.mobileEventMetaItem}>
                              <Ionicons name="calendar-outline" size={12} color={COLORS.textTertiary} />
                              <Text style={styles.mobileEventMetaText}>{fechaTxt(r.fecha)}</Text>
                            </View>
                            <View style={styles.mobileEventMetaItem}>
                              <Ionicons name="person-outline" size={12} color={COLORS.textTertiary} />
                              <Text style={[styles.mobileEventMetaText, { flexShrink: 1 }]} numberOfLines={1}>{r.solicitante || '–'}</Text>
                            </View>
                          </View>
                          <View style={styles.mobileEventFoot}>
                            <View style={styles.mobileEventFootItem}>
                              <Text style={styles.mobileEventFootLabel}>Recursos</Text>
                              <Text style={styles.mobileEventFootValue}>{fmtNum(r.recursos)}</Text>
                            </View>
                            <View style={styles.mobileEventFootItem}>
                              <Text style={styles.mobileEventFootLabel}>Asistencia</Text>
                              <Text style={[styles.mobileEventFootValue, { color: r.tasaAsistencia === null ? COLORS.textTertiary : r.tasaAsistencia >= 70 ? COLORS.success : r.tasaAsistencia >= 40 ? COLORS.warning : COLORS.error }]}>
                                {r.tasaAsistencia === null ? '–' : r.tasaAsistencia + '%'}
                              </Text>
                            </View>
                            <View style={styles.mobileEventFootItem}>
                              <Text style={styles.mobileEventFootLabel}>Presup.</Text>
                              <Text style={styles.mobileEventFootValue}>{r.ejecucion === null ? '–' : r.ejecucion + '%'}</Text>
                            </View>
                            <Ionicons name="open-outline" size={15} color={COLORS.primary} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={[styles.tInner, { width: tableWidth, minWidth: tableWidth }]}>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tCell, styles.tHead, styles.tColEvento]}>Evento</Text>
                          <Text style={[styles.tCell, styles.tHead, styles.tColFecha]}>Fecha</Text>
                          <Text style={[styles.tCell, styles.tHead, styles.tColSolicitante]}>Solicitante</Text>
                          <Text style={[styles.tCell, styles.tHead, styles.tColRecursos, { textAlign: 'right' }]}>Recursos</Text>
                          <Text style={[styles.tCell, styles.tHead, styles.tColEstado, { textAlign: 'center' }]}>Estado</Text>
                          <Text style={[styles.tCell, styles.tHead, styles.tColAsistencia, { textAlign: 'center', color: COLORS.purple }]}>Asistencia</Text>
                          <Text style={[styles.tCell, styles.tHead, styles.tColPresup]}>Presup. ejecutado</Text>
                          <Text style={[styles.tCell, styles.tHead, styles.tColVer, { textAlign: 'center' }]}>Ver</Text>
                        </View>
                        {tablaEventosFiltrados.slice(0, 25).map((r, i) => (
                          <TouchableOpacity key={`${i}-${r.id || r.nombre}`} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]} onPress={() => irDetalleEvento(r.id)} activeOpacity={0.6}>
                            <Text style={[styles.tCell, styles.tColEvento, { fontWeight: '600' }]} numberOfLines={1}>{r.nombre || 'Sin nombre'}</Text>
                            <Text style={[styles.tCell, styles.tColFecha]} numberOfLines={1}>{fechaTxt(r.fecha)}</Text>
                            <Text style={[styles.tCell, styles.tColSolicitante, { color: COLORS.textSecondary }]} numberOfLines={1}>{r.solicitante || '–'}</Text>
                            <Text style={[styles.tCell, styles.tColRecursos, { textAlign: 'right' }]} numberOfLines={1}>{fmtNum(r.recursos)}</Text>
                            <View style={[styles.tCell, styles.tColEstado, { alignItems: 'center' }]}><EstadoBadge estado={r.estado} /></View>
                            <Text style={[styles.tCell, styles.tColAsistencia, { textAlign: 'center', fontWeight: '700', color: r.tasaAsistencia === null ? COLORS.textTertiary : r.tasaAsistencia >= 70 ? COLORS.success : r.tasaAsistencia >= 40 ? COLORS.warning : COLORS.error }]}>
                              {r.tasaAsistencia === null ? '–' : r.tasaAsistencia + '%'}
                            </Text>
                            <View style={[styles.tCell, styles.tColPresup]}>
                              {r.ejecucion === null ? (
                                <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>–</Text>
                              ) : (
                                <View style={styles.ejecBar}>
                                  <View style={styles.ejecBarTrack}>
                                    <View style={[styles.ejecBarFill, { width: `${Math.min(100, Math.max(3, r.ejecucion))}%`, backgroundColor: r.ejecucion > 100 ? COLORS.error : r.ejecucion >= 70 ? COLORS.success : r.ejecucion >= 40 ? COLORS.warning : COLORS.info }]} />
                                  </View>
                                  <Text style={styles.ejecPct}>{r.ejecucion}%</Text>
                                </View>
                              )}
                            </View>
                            <View style={[styles.tCell, styles.tColVer, { alignItems: 'center' }]}>
                              <Ionicons name="open-outline" size={15} color={COLORS.primary} />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Ionicons name="search-outline" size={26} color={COLORS.textTertiary} />
                    <Text style={styles.emptyNote}>Sin coincidencias con el filtro actual.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* KPIs */}
            <View style={styles.section}>
              <SectionHeader
                icon="pulse-outline"
                title="Métricas del período"
                subtitle={drillMes ? `Filtrado a ${MONTH_NAMES_FULL[parseInt(drillMes.slice(5, 7), 10) - 1]} ${drillMes.slice(0, 4)}` : (reporteDesde || reporteHasta ? `${reporteDesde || '…'} → ${reporteHasta || 'hoy'}` : 'Sin filtro')}
                action={
                  drillMes ? (
                    <TouchableOpacity style={styles.exportBtn} onPress={limpiarDrill} accessibilityRole="button" accessibilityLabel="Quitar filtro de mes">
                      <Ionicons name="close" size={14} color={COLORS.primary} />
                      <Text style={styles.exportBtnText}>Quitar mes</Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
              <View style={styles.kpiGrid}>
                {kpis.slice(0, 4).map(k => (
                  <KpiCard key={k.label} {...k} />
                ))}
              </View>
              <View style={styles.kpiGrid}>
                {kpis.slice(4, 8).map(k => (
                  <KpiCard key={k.label} {...k} />
                ))}
              </View>
              <View style={styles.kpiGrid}>
                {kpis.slice(8, 12).map(k => (
                  <KpiCard key={k.label} {...k} />
                ))}
              </View>
              {estadoFiltro ? (
                <TouchableOpacity style={styles.filtroActivoChip} onPress={() => setEstadoFiltro(null)} accessibilityRole="button">
                  <Ionicons name="funnel-outline" size={14} color={COLORS.white} />
                  <Text style={styles.filtroActivoText}>Filtrando eventos: {ESTADOS_FILTRO.find(e => e.id === estadoFiltro)?.label}: toca para quitar</Text>
                </TouchableOpacity>
              ) : null}
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
  introCard: {
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, marginBottom: 20, overflow: 'hidden',
  },
  introHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  introHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  introIconWrap: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  introTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  introSub: { fontSize: 11.5, color: COLORS.textTertiary, marginTop: 1 },
  introBody: {
    borderTopWidth: 1, borderTopColor: COLORS.divider,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  introRowIcon: { marginTop: 2 },
  introRowText: { flex: 1, fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 18 },
  introRowTextStrong: { fontWeight: '700', color: COLORS.textPrimary },
  introBtn: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primary,
    borderRadius: 9, paddingHorizontal: 18, paddingVertical: 8, marginTop: 8, marginBottom: 14,
  },
  introBtnText: { color: COLORS.white, fontSize: 12.5, fontWeight: '700' },
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
  tInner: { minWidth: '100%' },
  tColEvento: { flex: 2, minWidth: 150 },
  tColFecha: { flex: 1, minWidth: 92 },
  tColSolicitante: { flex: 1.2, minWidth: 100 },
  tColRecursos: { flex: 0.7, minWidth: 64 },
  tColEstado: { flex: 0.9, minWidth: 100 },
  tColAsistencia: { flex: 0.7, minWidth: 64 },
  tColPresup: { flex: 1.1, minWidth: 120 },
  tColVer: { flex: 0.3, minWidth: 36 },
  mobileEventCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  mobileEventTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  mobileEventTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 19 },
  mobileEventMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 8 },
  mobileEventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  mobileEventMetaText: { fontSize: 12, color: COLORS.textSecondary },
  mobileEventFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10,
    paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
  },
  mobileEventFootItem: { flex: 1 },
  mobileEventFootLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: COLORS.textTertiary },
  mobileEventFootValue: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginTop: 1 },
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
  kpiDelta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  kpiDeltaText: { fontSize: 12.5, fontWeight: '800' },
  kpiDeltaSub: { fontSize: 10, color: COLORS.textTertiary, marginLeft: 2 },
  filtroActivoChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 9, paddingVertical: 8, marginTop: 4,
  },
  filtroActivoText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  presetChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  presetChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  presetChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  presetChipTextActivo: { color: COLORS.white },
  drillChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  drillChipText: { fontSize: 12, fontWeight: '800', color: COLORS.white },
  filtrosToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto', paddingVertical: 7 },
  filtrosBadge: {
    minWidth: 17, height: 17, borderRadius: 99, paddingHorizontal: 4,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  filtrosBadgeText: { fontSize: 10.5, fontWeight: '800', color: COLORS.white },
  presetChipTextConFiltro: { color: COLORS.primary },
  segWrap: { paddingHorizontal: 16, marginTop: 12 },
  segGroup: { marginBottom: 9 },
  segLabel: {
    fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6,
    color: COLORS.textTertiary, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  segChipsRow: { gap: 6, paddingRight: 8 },
  segChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, maxWidth: 190,
  },
  segChipActivo: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  segChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  segChipTextActivo: { color: COLORS.white },
  scopeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    backgroundColor: COLORS.purple + '12', borderWidth: 1, borderColor: COLORS.purple + '35',
  },
  scopeBannerText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary, lineHeight: 17 },
  compareRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 12,
    flexWrap: 'wrap',
  },
  compareLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chartLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chartLegendDot: { width: 10, height: 10, borderRadius: 5 },
  chartLegendDash: { width: 16, height: 0, borderTopWidth: 2, borderTopColor: '#94A3B8', borderStyle: 'dashed', marginRight: 5 },
  chartLegendText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  ejecBar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ejecBarTrack: { flex: 1, height: 8, borderRadius: 5, backgroundColor: COLORS.divider, overflow: 'hidden' },
  ejecBarFill: { height: '100%', borderRadius: 5, minWidth: 3 },
  ejecPct: { width: 36, textAlign: 'right', fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  segment: { flexDirection: 'row', backgroundColor: COLORS.divider, borderRadius: 9, padding: 3 },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 7 },
  segmentBtnActivo: { backgroundColor: COLORS.white },
  segmentText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  segmentTextActivo: { color: COLORS.primary },
  chartHint: { fontSize: 11, color: COLORS.textTertiary, marginTop: 8, textAlign: 'center', flexDirection: 'row' },
  orderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: COLORS.primaryLight },
  orderBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  estadoChipsWrap: { marginBottom: 10 },
  estadoChips: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  estadoChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  estadoChipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  estadoChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  estadoChipTextActivo: { color: COLORS.white },
});

export default ReportesAvanzadosScreen;