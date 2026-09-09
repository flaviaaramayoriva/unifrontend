import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SectionHeader = ({ title, subtitle, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    {subtitle ? (
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    ) : null}
  </View>
);

const StudentEnrollment = ({ events, loading, colors }) => {
  const [expandedEventId, setExpandedEventId] = useState(null);

  const toggleEvent = (eventId) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Estudiantes Inscritos"
        subtitle="Inscripciones de tu facultad por evento"
        colors={colors}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando inscripciones...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="people-outline" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            No hay estudiantes inscritos aún.
          </Text>
        </View>
      ) : (
        events.map((evento) => {
          const isExpanded = expandedEventId === evento.idevento;
          const count = evento.estudiantes.length;
          return (
            <View
              key={evento.idevento}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <TouchableOpacity
                onPress={() => toggleEvent(evento.idevento)}
                style={styles.cardHeader}
                activeOpacity={0.7}
              >
                <View style={[styles.iconTile, { backgroundColor: `${colors.primary}12` }]}>
                  <Ionicons name="school-outline" size={20} color={colors.primary} />
                </View>

                <View style={styles.cardText}>
                  <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {evento.nombreevento}
                  </Text>
                  <View style={styles.countRow}>
                    <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
                    <Text style={[styles.countText, { color: colors.textTertiary }]}>
                      {count} estudiante{count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                <View style={[styles.countBadge, { backgroundColor: `${colors.primary}12` }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primary }]}>{count}</Text>
                </View>

                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.expandedList}>
                  {evento.estudiantes.map((est, index) => (
                    <View
                      key={est.idestudiante}
                      style={[
                        styles.studentRow,
                        index > 0 && { borderTopColor: colors.divider, borderTopWidth: 1 },
                      ]}
                    >
                      <View style={[styles.studentAvatar, { backgroundColor: colors.background }]}>
                        <Text style={[styles.studentInitial, { color: colors.textPrimary }]}>
                          {(est.nombre || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={[styles.studentName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {est.nombre}
                        </Text>
                        {est.fecha_inscripcion ? (
                          <Text style={[styles.studentDate, { color: colors.textTertiary }]}>
                            {new Date(est.fecha_inscripcion).toLocaleDateString('es-ES', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                    </View>
                  ))}
                </View>
              )}
            </View>
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
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  expandedList: {
    marginTop: 14,
    paddingTop: 4,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  studentDate: {
    fontSize: 11,
    marginTop: 1,
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

export default StudentEnrollment;