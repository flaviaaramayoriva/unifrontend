import React, { Fragment } from 'react';
import Svg, { Line, Circle, Text as SvgText, Path, Rect, G } from 'react-native-svg';

export const COLORS = {
  primary: '#C44200', primaryLight: '#FFF0E6', secondary: '#0F172A',
  accent: '#EF4444', success: '#047857', warning: '#F59E0B',
  info: '#3B82F6', background: '#F6F7F9', surface: '#FFFFFF',
  textPrimary: '#1F2937', textSecondary: '#64748B', textTertiary: '#94A3B8',
  border: '#E6E9EF', divider: '#D1D5DB', shadow: 'rgba(0,0,0,0.05)',
  white: '#FFFFFF', black: '#000000',
};

export const STATE_COLORS = {
  aprobado: COLORS.success,
  pendiente: COLORS.warning,
  rechazado: COLORS.accent,
  cancelado: COLORS.info,
  vencido: COLORS.secondary,
  completado: COLORS.info,
};

export const safeArray = (value) => (Array.isArray(value) ? value : []);
export const safeObj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export const CustomLineChart = ({ data, width, height, color = COLORS.primary }) => {
  if (!data?.labels?.length) return null;
  const labels = data.labels;
  const values = data.datasets[0].data;
  const padding = { top: 24, right: 20, bottom: 36, left: 44 };
  const cw = width - padding.left - padding.right;
  const ch = height - padding.top - padding.bottom;
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;
  const pts = values.map((v, i) => ({
    x: padding.left + (i / Math.max(values.length - 1, 1)) * cw,
    y: padding.top + ch - ((v - minV) / range) * ch,
    v, label: labels[i],
  }));
  let line = '';
  pts.forEach((p, i) => {
    if (i === 0) { line = `M ${p.x} ${p.y}`; return; }
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    line += ` C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  });
  const area = `${line} L ${pts[pts.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
  return (
    <Svg width={width} height={height}>
      <G>
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + ch * (1 - pct);
          return (
            <Fragment key={i}>
              <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4" />
              <SvgText x={padding.left - 6} y={y + 4} fontSize="10" fill={COLORS.textSecondary} textAnchor="end">{Math.round(minV + range * pct)}</SvgText>
            </Fragment>
          );
        })}
      </G>
      <Path d={area} fill={color} fillOpacity={0.1} />
      <Path d={line} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <G>
        {pts.map((p, i) => (
          <Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={5} fill={COLORS.surface} stroke={color} strokeWidth={2} />
            <Circle cx={p.x} cy={p.y} r={3} fill={color} />
            <SvgText x={p.x} y={height - padding.bottom + 22} fontSize="11" fill={COLORS.textSecondary} textAnchor="middle" fontWeight="500">{p.label}</SvgText>
          </Fragment>
        ))}
      </G>
    </Svg>
  );
};

export const CustomBarChart = ({ data, width, height, color = COLORS.success }) => {
  if (!data?.labels?.length) return null;
  const labels = data.labels;
  const values = data.datasets[0].data;
  const padding = { top: 24, right: 16, bottom: 50, left: 44 };
  const cw = width - padding.left - padding.right;
  const ch = height - padding.top - padding.bottom;
  const maxV = Math.max(...values, 1);
  const barW = Math.max((cw / labels.length) * 0.55, 8);
  const gap = cw / labels.length;
  return (
    <Svg width={width} height={height}>
      <G>
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + ch * (1 - pct);
          return (
            <Fragment key={i}>
              <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4" />
              <SvgText x={padding.left - 6} y={y + 4} fontSize="10" fill={COLORS.textSecondary} textAnchor="end">{Math.round(maxV * pct)}</SvgText>
            </Fragment>
          );
        })}
      </G>
      <G>
        {values.map((v, i) => {
          const barH = (v / maxV) * ch;
          const x = padding.left + gap * i + (gap - barW) / 2;
          const y = padding.top + ch - barH;
          const labelX = x + barW / 2;
          const labelY = padding.top + ch + 12;
          return (
            <Fragment key={i}>
              <Rect x={x} y={y} width={barW} height={barH} fill={color} rx={4} fillOpacity={0.85} />
              {v > 0 && (
                <SvgText x={labelX} y={y - 5} fontSize="10" fill={color} textAnchor="middle" fontWeight="700">{v}</SvgText>
              )}
              <SvgText x={labelX} y={labelY} fontSize="10" fill={COLORS.textSecondary} textAnchor="middle" fontWeight="500">{labels[i]}</SvgText>
            </Fragment>
          );
        })}
      </G>
    </Svg>
  );
};