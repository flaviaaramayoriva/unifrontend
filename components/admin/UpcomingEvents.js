import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

const SectionHeader = ({ title, subtitle, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    {subtitle ? (
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    ) : null}
  </View>
);

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const eventDate = dayjs(dateStr).startOf('day');
  if (!eventDate.isValid()) return null;
  return Math.round(eventDate.diff(dayjs().startOf('day'), 'day', true));
};

const UpcomingEvents = ({ events = [], onSelectEvent, colors }) => {
  const upcoming = useMemo(() => {
    return events
      .map(e => ({ ...e, daysUntil: getDaysUntil(e.fechaevento) }))
      .filter(e => e.daysUntil !== null && e.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [events]);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Próximos Eventos"
        subtitle="Tus próximas fechas como comité"
        colors={colors}
      />

      {upcoming.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="calendar-outline" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            No hay eventos próximos programados.
          </Text>
        </View>
      ) : (
        upcoming.map((evento, index) => {
          const eventDate = dayjs(evento.fechaevento);
          const days = evento.daysUntil ?? 0;
          const urgent = days <= 7;
          return (
            <TouchableOpacity
              key={evento.idevento}
              style={[styles.row, { backgroundColor: colors.surface }]}
              onPress={() => onSelectEvent(evento.idevento)}
              activeOpacity={0.75}
            >
              <View style={[styles.dateBox, { backgroundColor: `${colors.primary}12` }]}>
                <Text style={[styles.dateDay, { color: colors.primary }]}>
                  {eventDate.isValid() ? eventDate.format('DD') : '--'}
                </Text>
                <Text style={[styles.dateMonth, { color: colors.primary }]}>
                  {eventDate.isValid() ? eventDate.format('MMM').toUpperCase() : ''}
                </Text>
              </View>

              <View style={styles.info}>
                <Text style={[styles.eventName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {evento.nombreevento || 'Sin título'}
                </Text>
                {evento.lugar ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]} numberOfLines={1}>
                      {evento.lugar}
                    </Text>
                    {index === 0 && (
                      <>
                        <Text style={[styles.metaSep, { color: colors.textTertiary }]}>•</Text>
                        <Ionicons name="trophy-outline" size={12} color={colors.textTertiary} />
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>Comité</Text>
                      </>
                    )}
                  </View>
                ) : null}
              </View>

              <View style={[styles.daysPill, { backgroundColor: urgent ? `${'#EF4444'}1A` : `${'#16A34A'}1A` }]}>
                <Text style={[styles.daysText, { color: urgent ? '#EF4444' : '#16A34A' }]}>
                  {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
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
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dateBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  metaSep: {
    fontSize: 10,
  },
  daysPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default UpcomingEvents;