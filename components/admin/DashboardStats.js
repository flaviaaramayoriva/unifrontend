import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { hexToRgb } from '../../utils/colorUtils';

const rgba = (hex, opacity) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const CARD_MARGIN = 12;
const MIN_CARD_WIDTH_DASHBOARD = 156;
const MAX_COLUMNS_DASHBOARD = 4;

const SectionHeader = ({ kicker, title, subtitle, colors }) => (
  <View style={styles.sectionHeader}>
    {kicker ? (
      <Text style={[styles.sectionKicker, { color: colors.primary }]}>{kicker}</Text>
    ) : null}
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    {subtitle ? (
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    ) : null}
  </View>
);

const DashboardCard = ({ title, value, icon, color, trend, description, colors, cardWidth }) => {
  const trendColor = trend > 0 ? colors.success : colors.accent;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, width: cardWidth }]}>
      <View style={[styles.iconTile, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.valueRow}>
          <Text style={[styles.cardValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          {trend !== undefined && trend !== null ? (
            <View style={[styles.trendPill, { backgroundColor: `${trendColor}18` }]}>
              <Ionicons name={trend > 0 ? 'arrow-up' : 'arrow-down'} size={11} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>{Math.abs(trend)}%</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
        {description ? (
          <Text style={[styles.cardDescription, { color: colors.textTertiary }]} numberOfLines={1}>{description}</Text>
        ) : null}
      </View>
    </View>
  );
};

const useResponsiveColumns = (width, minCardWidth, maxColumns) => {
  let numColumns = Math.floor(width / (minCardWidth + CARD_MARGIN));
  numColumns = Math.min(numColumns, maxColumns);
  return Math.max(numColumns, 1);
};

const DashboardStats = ({ stats, loading, historicalData, colors }) => {
  const { width: windowWidth } = useWindowDimensions();
  const columns = useResponsiveColumns(windowWidth, MIN_CARD_WIDTH_DASHBOARD, MAX_COLUMNS_DASHBOARD);
  const totalMargin = CARD_MARGIN * (columns - 1);
  const cardWidth = Math.max((windowWidth - 40 - totalMargin) / columns, 120);

  let monthDelta = null;
  if (historicalData && historicalData.length >= 2) {
    const last = Number(historicalData[historicalData.length - 1]?.eventos ?? NaN);
    const prev = Number(historicalData[historicalData.length - 2]?.eventos ?? NaN);
    if (!isNaN(last) && !isNaN(prev) && prev !== 0) {
      monthDelta = Math.round(((last - prev) / prev) * 100);
    }
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        kicker="Dashboard"
        title="Resumen de Actividad"
        subtitle="Métricas clave del sistema"
        colors={colors}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando estadísticas...</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {stats.map((stat) => (
            <DashboardCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              trend={stat.title === 'Eventos Totales' && monthDelta !== null ? monthDelta : stat.trend}
              description={stat.description}
              cardWidth={cardWidth}
              colors={colors}
            />
          ))}
        </View>
      )}

      {historicalData.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderText}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Eventos por Mes</Text>
              <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Últimos 6 meses</Text>
            </View>
            <View style={[styles.periodPill, { backgroundColor: `${colors.primary}12` }]}>
              <Ionicons name="calendar-outline" size={13} color={colors.primary} />
              <Text style={[styles.periodPillText, { color: colors.primary }]}>6M</Text>
            </View>
          </View>
          <BarChart
            data={{
              labels: historicalData.map(d => d.name || ''),
              datasets: [{ data: historicalData.map(d => d.eventos ?? 0) }]
            }}
            width={windowWidth - 76}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              decimalPlaces: 0,
              color: (opacity = 1) => rgba(colors.primary, opacity),
              labelColor: (opacity = 1) => rgba(colors.textSecondary, opacity),
              style: { borderRadius: 16 },
              propsForLabels: { fontSize: 10, fontWeight: '600' },
              barPercentage: 0.55,
            }}
            style={styles.chart}
            verticalLabelRotation={0}
            showValuesOnTopOfBars
            fromZero
          />
        </View>
      )}
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
    gap: CARD_MARGIN,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: CARD_MARGIN,
    minHeight: 148,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardBody: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 12,
    marginTop: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  chartCard: {
    marginTop: 8,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartHeaderText: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chart: {
    borderRadius: 16,
    marginTop: 0,
  },
});

export default DashboardStats;