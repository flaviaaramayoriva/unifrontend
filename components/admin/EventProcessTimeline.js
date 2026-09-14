import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#C44B0A',
  success: '#27ae60',
  warning: '#f39c12',
  info: '#3498db',
  purple: '#9b59b6',
  grayText: '#64748b',
  grayLight: '#F1F5F9',
  grayBorder: '#CBD5E1',
  line: '#E2E8F0',
  white: '#fff',
  red: '#B91C1C',
  redLight: '#FEE2E2',
  gray: '#4B5563',
  grayBg: '#F3F4F6',
  vencido: '#C2410C',
  vencidoLight: '#FFEDD5',
};

export const PHASES = [
  { number: 1, label: 'Planeación', icon: 'document-text-outline', color: COLORS.info },
  { number: 2, label: 'Revisión y aprobación', icon: 'clipboard-outline', color: COLORS.primary },
  { number: 3, label: 'Programación', icon: 'calendar-outline', color: COLORS.success },
  { number: 4, label: 'Ejecución', icon: 'play-circle-outline', color: COLORS.purple },
  { number: 5, label: 'Cierre e informe', icon: 'checkmark-done-outline', color: COLORS.grayText },
];

const TERMINAL_CONFIG = {
  rechazado: { label: 'Rechazado', fg: COLORS.red, bg: COLORS.redLight, icon: 'close-circle-outline' },
  cancelado: { label: 'Cancelado', fg: COLORS.gray, bg: COLORS.grayBg, icon: 'ban-outline' },
  vencido: { label: 'Vencido', fg: COLORS.vencido, bg: COLORS.vencidoLight, icon: 'alert-circle-outline' },
};

// Mapea estado + fase del backend a un número de fase visible (1..5)
export const resolveCurrentPhase = (estado, idfase, fases) => {
  const st = String(estado || 'pendiente').toLowerCase();
  const hasFases = Array.isArray(fases) && fases.length > 0;
  const nroFases = hasFases ? Number(fases[0]?.nrofase) : Number(idfase);
  const fallback = nroFases && !isNaN(nroFases) ? Math.min(Math.max(nroFases, 1), 5) : 1;

  const TERMINAL_PHASE = {
    rechazado: 'rechazado',
    cancelado: 'cancelado',
    vencido: 'vencido',
  };

  if (TERMINAL_PHASE[st]) return { phase: fallback, terminal: TERMINAL_PHASE[st] };
  if (st === 'completado' || st === 'finalizado') return { phase: 5 };
  if (st === 'aprobado') {
    if (fallback >= 3) return { phase: 4 };
    if (fallback === 2) return { phase: 3 };
    return { phase: 2 };
  }
  if (st === 'pendiente' || st === 'proyectado') return { phase: 1 };
  return { phase: fallback };
};

// Propuesta: `estado`, `idfase`, `fases`, `compact` (versión compacta para tarjetas)
const EventProcessTimeline = ({ estado, idfase, fases, compact = false, showLabel = true }) => {
  const resolved = useMemo(() => resolveCurrentPhase(estado, idfase, fases), [estado, idfase, fases]);
  const { phase: currentPhase, terminal } = resolved;
  const terminalCfg = terminal ? TERMINAL_CONFIG[terminal] : null;

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <View style={styles.compactTrack}>
          {PHASES.map((ph, idx) => {
            const done = ph.number <= currentPhase;
            const linePrev = idx === 0 ? styles.lineHidden : (ph.number - 1) <= currentPhase ? styles.lineActive : styles.line;
            const lineNext = idx === PHASES.length - 1 ? styles.lineHidden : done ? styles.lineActive : styles.line;
            return (
              <View key={ph.number} style={styles.compactStep}>
                <View style={styles.compactTrackRow}>
                  <View style={[styles.compactLine, linePrev]} />
                  <View style={[styles.compactDot, done && { backgroundColor: ph.color, borderColor: ph.color }]}>
                    <Ionicons name={done ? ph.icon : 'ellipse-outline'} size={9} color={done ? COLORS.white : COLORS.grayBorder} />
                  </View>
                  <View style={[styles.compactLine, lineNext]} />
                </View>
              </View>
            );
          })}
        </View>
        {terminalCfg ? (
          <View style={styles.terminalPillCompact}>
            <Ionicons name={terminalCfg.icon} size={12} color={terminalCfg.fg} />
            <Text style={[styles.terminalPillText, { color: terminalCfg.fg }]}>{terminalCfg.label}</Text>
          </View>
        ) : (
          <Text style={styles.compactStateText}>
            {PHASES.find(p => p.number === currentPhase)?.label || `Fase ${currentPhase}`}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showLabel && (
        <View style={styles.labelRow}>
          {terminalCfg ? (
            <View style={[styles.terminalPill, { backgroundColor: terminalCfg.bg }]}>
              <Ionicons name={terminalCfg.icon} size={16} color={terminalCfg.fg} />
              <Text style={[styles.terminalPillText, { color: terminalCfg.fg }]}>{terminalCfg.label}</Text>
            </View>
          ) : null}
          {!terminalCfg && (
            <Text style={styles.labelText}>
              Proceso del evento · {PHASES.find(p => p.number === currentPhase)?.label || `Fase ${currentPhase}`}
            </Text>
          )}
        </View>
      )}

      <View style={styles.track}>
        {PHASES.map((ph, idx) => {
          const done = ph.number <= currentPhase;
          const linePrev = idx === 0 ? styles.lineHidden : (ph.number - 1) <= currentPhase ? styles.lineActive : styles.line;
          const lineNext = idx === PHASES.length - 1 ? styles.lineHidden : done ? styles.lineActive : styles.line;
          return (
            <View key={ph.number} style={styles.step}>
              <View style={styles.stepTrack}>
                <View style={[styles.line, linePrev]} />
                <View style={[styles.dot, done && { backgroundColor: ph.color, borderColor: ph.color }]}>
                  <Ionicons name={done ? ph.icon : 'ellipse-outline'} size={13} color={done ? COLORS.white : COLORS.grayBorder} />
                </View>
                <View style={[styles.line, lineNext]} />
              </View>
              <Text style={[styles.label, done && { color: ph.color, fontWeight: '700' }]} numberOfLines={2}>
                {ph.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.grayText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  terminalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  terminalPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 6,
  },
  line: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.line,
  },
  lineActive: {
    backgroundColor: COLORS.primary,
  },
  lineHidden: {
    backgroundColor: 'transparent',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.grayBorder,
    backgroundColor: COLORS.grayLight,
  },
  label: {
    fontSize: 9,
    color: COLORS.grayText,
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 2,
  },
  compactWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  compactTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStep: {
    flex: 1,
  },
  compactTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactLine: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.line,
  },
  compactDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.grayBorder,
    backgroundColor: COLORS.grayLight,
  },
  compactStateText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.grayText,
    textAlign: 'center',
  },
  terminalPillCompact: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
});

export default EventProcessTimeline;