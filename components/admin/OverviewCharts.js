import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { hexToRgb } from '../../utils/colorUtils';

const rgba = (hex, opacity) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const STATUS_SEGMENTS = [
  { key: 'aprobado', label: 'Aprobados', color: '#16A34A' },
  { key: 'pendiente', label: 'Pendientes', color: '#F59E0B' },
  { key: 'completado', label: 'Completados', color: '#3B82F6' },
  { key: 'vencido', label: 'Vencidos', color: '#6B7280' },
  { key: 'rechazado', label: 'Rechazados', color: '#EF4444' },
];

const SectionHeader = ({ kicker, title, subtitle, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionKicker, { color: colors.primary }]}>{kicker}</Text>
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    {subtitle ? (
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    ) : null}
  </View>
);

const OverviewCharts = ({ estadoCounts, historicalData, colors }) => {
  const { width: windowWidth } = useWindowDimensions();

  const gridState = useMemo(() => {
    const paired = windowWidth >= 700;
    const cols = paired ? 2 : 1;
    const gap = 12;
    const cardWidth = Math.floor((windowWidth - 40 - (cols - 1) * gap) / cols);
    return { paired, cardWidth };
  }, [windowWidth]);

  const total = Object.values(estadoCounts || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);

  const pieData = useMemo(() => {
    const segments = STATUS_SEGMENTS.map(seg => ({
      name: seg.label,
      population: Number(estadoCounts?.[seg.key]) || 0,
      color: seg.color,
      legendFontColor: colors.textSecondary,
      legendFontSize: 12,
    })).filter(s => s.population > 0);

    if (segments.length === 0) {
      return [{ name: 'Sin datos', population: 1, color: colors.divider, legendFontColor: colors.textSecondary, legendFontSize: 12 }];
    }
    return segments;
  }, [estadoCounts, colors]);

  const monthDelta = useMemo(() => {
    if (!historicalData || historicalData.length < 2) return null;
    const last = Number(historicalData[historicalData.length - 1]?.eventos ?? NaN);
    const prev = Number(historicalData[historicalData.length - 2]?.eventos ?? NaN);
    if (isNaN(last) || isNaN(prev) || prev === 0) return null;
    return {
      current: last,
      previous: prev,
      pct: Math.round(((last - prev) / prev) * 100),
    };
  }, [historicalData]);

  const chartWidth = gridState.cardWidth - (gridState.paired ? 60 : 36);

  return (
    <View style={styles.container}>
      <SectionHeader
        kicker="Analítica"
        title="Estado de Eventos"
        subtitle="Distribución y comparativa mensual"
        colors={colors}
      />

      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: colors.surface, width: gridState.cardWidth }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Por Estado</Text>
            <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
          </View>

          {total === 0 ? (
            <View style={styles.placeholder}>
              <Ionicons name="analytics-outline" size={34} color={colors.textTertiary} />
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                Aún no hay datos de estados
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.pieWrap}>
                <PieChart
                  data={pieData}
                  width={Math.max(chartWidth, 160)}
                  height={190}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  hasLegend={false}
                  chartConfig={{
                    color: (opacity = 1) => rgba(colors.primary, opacity),
                    labelColor: (opacity = 1) => rgba(colors.textSecondary, opacity),
                  }}
                />
                <View style={styles.pieCenter}>
                  <Text style={[styles.pieTotal, { color: colors.textPrimary }]}>{total}</Text>
                  <Text style={[styles.pieTotalLabel, { color: colors.textSecondary }]}>
                    {total === 1 ? 'evento' : 'eventos'}
                  </Text>
                </View>
              </View>
              <View style={styles.legend}>
                {pieData.map(item => (
                  <View key={item.name} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                      {item.name === 'Sin datos' ? '' : item.population}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, width: gridState.cardWidth }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Trend Mensual</Text>
            <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
          </View>

          {monthDelta ? (
            <View style={styles.compareBody}>
              <View style={styles.barsRow}>
                <View style={styles.barColumn}>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                    {historicalData[historicalData.length - 2]?.name || 'Mes anterior'}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { backgroundColor: `${colors.primary}55`, height: Math.max(6, 8) * Math.min(monthDelta.previous / Math.max(monthDelta.current, monthDelta.previous, 1), 1) },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barValue, { color: colors.textPrimary }]}>{monthDelta.previous}</Text>
                </View>
                <View style={styles.barColumn}>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                    {historicalData[historicalData.length - 1]?.name || 'Este mes'}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { backgroundColor: colors.primary, height: Math.max(6, 56) * Math.min(monthDelta.current / Math.max(monthDelta.current, monthDelta.previous, 1), 1) },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barValue, { color: colors.textPrimary }]}>{monthDelta.current}</Text>
                </View>
              </View>

              <View style={[styles.deltaPill, { backgroundColor: monthDelta.pct >= 0 ? `${'#16A34A'}1A` : `${'#EF4444'}1A` }]}>
                <Ionicons
                  name={monthDelta.pct >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={monthDelta.pct >= 0 ? '#16A34A' : '#EF4444'}
                />
                <Text style={[styles.deltaText, { color: monthDelta.pct >= 0 ? '#16A34A' : '#EF4444' }]}>
                  {Math.abs(monthDelta.pct)}% vs mes anterior
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="bar-chart-outline" size={34} color={colors.textTertiary} />
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                Se necesita histórico de 2 meses
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionHeader: {
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  placeholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeholderText: {
    fontSize: 13,
    textAlign: 'center',
  },
  legend: {
    marginTop: 4,
    gap: 6,
  },
  pieWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieTotal: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pieTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  compareBody: {
    gap: 14,
  },
  barsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  barTrack: {
    height: 60,
    width: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 11,
  },
  barValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 999,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default OverviewCharts;