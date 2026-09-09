import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS = {
  aprobado: { bg: '#10B981', fg: '#047857' },
  pendiente: { bg: '#F59E0B', fg: '#B45309' },
  completado: { bg: '#3B82F6', fg: '#1D4ED8' },
  avanzado: { bg: '#9B59B6', fg: '#7E22CE' },
  rechazado: { bg: '#EF4444', fg: '#B91C1C' },
  vencido: { bg: '#6B7280', fg: '#4B5563' },
};
const DEFAULT_STATUS = { bg: '#EF4444', fg: '#B91C1C' };

const FILTER_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'aprobado', label: 'Aprobados' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'completado', label: 'Completados' },
  { key: 'avanzado', label: 'Avanzados' },
  { key: 'rechazado', label: 'Rechazados' },
  { key: 'vencido', label: 'Vencidos' },
];

const statusColor = (estado) => STATUS_COLORS[estado] || DEFAULT_STATUS;

const SectionHeader = ({ title, subtitle, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    {subtitle ? (
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    ) : null}
  </View>
);

const CommitteeEventsList = ({ events, loading, onSelectEvent, colors }) => {
  const [filter, setFilter] = useState('todos');

  const eventsLast30Days = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const dateA = new Date(a.fechaevento || 0);
      const dateB = new Date(b.fechaevento || 0);
      return dateB - dateA;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return sorted.filter(e => {
      if (!e.fechaevento) return false;
      return new Date(e.fechaevento) >= thirtyDaysAgo;
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (filter === 'todos') return eventsLast30Days;
    return eventsLast30Days.filter(e => e.estado === filter);
  }, [eventsLast30Days, filter]);

  const countByStatus = useMemo(() => {
    const counts = { todos: eventsLast30Days.length };
    FILTER_TABS.slice(1).forEach(tab => {
      counts[tab.key] = eventsLast30Days.filter(e => e.estado === tab.key).length;
    });
    return counts;
  }, [eventsLast30Days]);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Mis Eventos como Comité"
        subtitle="Eventos en los que participas como miembro del comité"
        colors={colors}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {FILTER_TABS.map(tab => {
          const active = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.chip,
                active && styles.chipActive,
                { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
              ]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.white : colors.textSecondary },
                ]}
              >
                {`${tab.label} (${countByStatus[tab.key] ?? 0})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando tus eventos como comité...
          </Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="calendar-outline" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            No hay eventos en esta categoría.
          </Text>
        </View>
      ) : (
        filteredEvents.map((item) => {
          const status = statusColor(item.estado);
          return (
            <TouchableOpacity
              key={item.idevento}
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderLeftColor: colors.primary },
              ]}
              onPress={() => onSelectEvent(item.idevento)}
              activeOpacity={0.75}
            >
              <View style={styles.statusColumn}>
                {item.estado && (
                  <View style={[styles.statusPill, { backgroundColor: `${status.bg}1A` }]}>
                    <View style={[styles.statusDot, { backgroundColor: status.fg }]} />
                    <Text style={[styles.statusText, { color: status.fg }]}>
                      {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.infoColumn}>
                <Text style={[styles.eventName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.nombreevento || 'Sin título'}
                </Text>

                {item.fechaevento && (
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
                    <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                      {new Date(item.fechaevento).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.roleColumn}>
                <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Comité</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
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
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 2,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
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
    paddingHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 3,
  },
  statusColumn: {
    width: 96,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  infoColumn: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  roleColumn: {
    alignItems: 'center',
    gap: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
});

export default CommitteeEventsList;