import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SectionHeader = ({ title, subtitle, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    {subtitle ? (
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    ) : null}
  </View>
);

const TopEnrollment = ({ events, colors }) => {
  const topEvents = useMemo(() => {
    const list = events
      .map(e => ({
        id: e.idevento,
        nombre: e.nombreevento || 'Sin título',
        count: Array.isArray(e.estudiantes) ? e.estudiantes.length : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return list;
  }, [events]);

  const maxCount = topEvents.length > 0 ? topEvents[0].count : 0;

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Top Eventos por Inscripciones"
        subtitle="Eventos con más participación de tu facultad"
        colors={colors}
      />

      {topEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="people-outline" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            Aún no hay inscripciones registradas.
          </Text>
        </View>
      ) : (
        topEvents.map((item, index) => (
          <View key={item.id} style={[styles.row, { backgroundColor: colors.surface }]}>
            <View style={[styles.rank, { backgroundColor: index === 0 ? colors.primary : `${colors.primary}18` }]}>
              <Text style={[styles.rankText, { color: index === 0 ? colors.white : colors.primary }]}>
                {index + 1}
              </Text>
            </View>

            <View style={styles.barColumn}>
              <View style={styles.titleRow}>
                <Text style={[styles.eventName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text style={[styles.countText, { color: colors.primary }]}>{item.count}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: index === 0 ? colors.primary : `${colors.primary}99`,
                      width: maxCount > 0 ? `${Math.max((item.count / maxCount) * 100, 4)}%` : '4%',
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 12,
  },
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rank: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
  },
  barColumn: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  eventName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
});

export default TopEnrollment;