import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  mockCategories,
  filterEventsByFaculty,
  getDateParts,
  getEventTitle,
  getEventDescription,
  getEventImage,
  getEventLocation,
  getEventHour,
  useHomeEvents,
} from './homeShared';

// ── VISTA 2 · "BENTO" ──
// Panel tipo dashboard: estadísticas en la parte superior, evento destacado a
// pantalla ancha y grilla tipo bento para facultades y eventos.

const COLORS = {
  primary: '#C44200',
  primaryDeep: '#8F2E00',
  primarySoft: '#FFF0E8',
  bg: '#F6F7F9',
  card: '#FFFFFF',
  text: '#0F172A',
  textMid: '#5B5B6E',
  textLight: '#7A8399',
  line: '#EDEFF3',
};

function EventBentoCard({ ev, wide, widthProp }) {
  const router = useRouter();
  const imgUrl = getEventImage(ev);
  const dateParts = getDateParts(ev);
  const location = getEventLocation(ev);
  const hour = getEventHour(ev);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalles de ${getEventTitle(ev)}`}
      onPress={() => router.push(`/admin/ItemDetail/${ev.idevento}`)}
      style={({ pressed }) => [
        styles.eventCard,
        wide && styles.eventCardWide,
        widthProp ? { width: widthProp } : null,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.eventCardImageWrap, wide && { height: 170 }]}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.eventCardImage} resizeMode="cover" />
        ) : (
          <View style={styles.eventImagePlaceholder}>
            <Ionicons name="images-outline" size={30} color={COLORS.primary} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(15,23,42,0.45)']}
          style={styles.eventCardGradient}
        />
        {dateParts && (
          <View style={styles.datePill}>
            <Text style={styles.datePillDay}>{dateParts.day}</Text>
            <Text style={styles.datePillMonth}>{dateParts.month}</Text>
          </View>
        )}
      </View>

      <View style={styles.eventCardBody}>
        <Text style={styles.eventCardTitle} numberOfLines={2}>{getEventTitle(ev)}</Text>
        {wide && (
          <Text style={styles.eventCardDesc} numberOfLines={2}>
            {getEventDescription(ev)}
          </Text>
        )}
        {(location || hour) && (
          <View style={styles.eventMetaRow}>
            {!!location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={COLORS.textLight} />
                <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
              </View>
            )}
            {!!hour && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={COLORS.textLight} />
                <Text style={styles.metaText}>{hour}</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.eventFooter}>
          <Text style={styles.eventLink}>Ver detalles</Text>
          <Ionicons name="arrow-forward-circle" size={20} color={COLORS.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeVistaBento() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { allEvents, loading, error } = useHomeEvents();
  const [selectedFacultad, setSelectedFacultad] = useState(mockCategories[0]);

  const eventos = useMemo(
    () => filterEventsByFaculty(allEvents, selectedFacultad.id),
    [allEvents, selectedFacultad]
  );

  const activeCount = useMemo(() => allEvents.length, [allEvents]);
  const featured = eventos[0];
  const rest = useMemo(() => eventos.slice(1), [eventos]);

  const innerWidth = Math.min(width, 1100) - 36;
  const numColumns = innerWidth >= 640 ? 3 : innerWidth >= 420 ? 2 : 1;
  const GAP = 12;
  const cardWidth = numColumns === 1 ? innerWidth : (innerWidth - GAP * (numColumns - 1)) / numColumns;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.centerHint}>Cargando eventos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={44} color={COLORS.textLight} />
        <Text style={styles.centerError}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center' }}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Buen día</Text>
              <Text style={styles.headerSub}>Descubre qué pasa en tu universidad</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
              onPress={() => router.push('/Login')}
            >
              <Ionicons name="log-in-outline" size={15} color="#fff" />
              <Text style={styles.loginBtnText}>Login</Text>
            </Pressable>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{activeCount}</Text>
              <Text style={styles.statLabel}>Eventos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{mockCategories.length}</Text>
              <Text style={styles.statLabel}>Facultades</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{eventos.length}</Text>
              <Text style={styles.statLabel}>{selectedFacultad.sigla}</Text>
            </View>
          </View>

          {/* DESTACADO */}
          <Text style={styles.sectionTitle}>Destacado</Text>
          {featured ? (
            <EventBentoCard ev={featured} wide />
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles-outline" size={34} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Sin eventos destacados</Text>
              <Text style={styles.emptySub}>Esta facultad no tiene eventos activos por ahora.</Text>
            </View>
          )}

          {/* FACULTADES */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Facultades</Text>
            <Text style={styles.sectionHint}>Toca para explorar</Text>
          </View>
          <View style={[styles.facGrid, { gap: GAP }]}>
            {mockCategories.map((cat) => {
              const active = cat.id === selectedFacultad.id;
              return (
                <Pressable
                  key={cat.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedFacultad(cat)}
                  style={({ pressed }) => [
                    { width: cardWidth },
                    styles.facCard,
                    active && styles.facCardActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Image source={cat.image} style={styles.facImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(15,18,34,0.82)']}
                    style={styles.facGradient}
                  />
                  {active && (
                    <View style={styles.facCheck}>
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    </View>
                  )}
                  <View style={styles.facBody}>
                    <Ionicons name={cat.icon} size={16} color="#FFB38C" />
                    <Text style={styles.facName} numberOfLines={2}>{cat.name}</Text>
                    <Text style={styles.facSigla}>{cat.sigla}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* EVENTOS */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Eventos de {selectedFacultad.name}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{rest.length + (featured ? 1 : 0)}</Text>
            </View>
          </View>
          {rest.length === 0 && !featured ? null : (
            <View style={[styles.eventsGrid, { gap: GAP }]}>
              {rest.map((ev, idx) => (
                <EventBentoCard
                  key={String(ev.idevento ?? idx)}
                  ev={ev}
                  wide={numColumns === 1}
                  widthProp={cardWidth}
                />
              ))}
            </View>
          )}
          {rest.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={34} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Sin eventos</Text>
              <Text style={styles.emptySub}>Los próximos eventos aparecerán aquí.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión"
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        onPress={() => router.push('/Login')}
      >
        <Ionicons name="person" size={22} color="#fff" />
        <Text style={styles.fabLabel}>Entrar</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: COLORS.bg },
  centerHint: { color: COLORS.textMid, fontSize: 14 },
  centerError: { color: COLORS.textMid, fontSize: 15, maxWidth: 260, textAlign: 'center' },
  scroll: { padding: 18, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 14, height: 44, borderRadius: 22,
  },
  loginBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  stat: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 18, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 18 },
  sectionHint: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  countBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 16 },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  eventCard: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    marginBottom: 12,
  },
  eventCardWide: { flexGrow: 1 },
  eventCardImageWrap: { width: '100%', height: 120 },
  eventCardImage: { width: '100%', height: '100%' },
  eventImagePlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  eventCardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 },
  datePill: {
    position: 'absolute', top: 10, left: 10, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
  },
  datePillDay: { color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  datePillMonth: { color: 'rgba(255,255,255,0.92)', fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  eventCardBody: { padding: 13, flex: 1 },
  eventCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19, marginBottom: 6 },
  eventCardDesc: { fontSize: 12, color: COLORS.textMid, lineHeight: 17, marginBottom: 8 },
  eventMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 90, marginRight: 6 },
  metaText: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 9 },
  eventLink: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  facGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  facCard: {
    height: 108, borderRadius: 18, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  facCardActive: { borderColor: COLORS.primary },
  facImage: { width: '100%', height: '100%', position: 'absolute' },
  facGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  facCheck: {
    position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  facBody: { flex: 1, justifyContent: 'flex-end', padding: 10, gap: 2 },
  facName: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 15 },
  facSigla: { color: '#FFB38C', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  eventsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyBox: {
    alignItems: 'center', gap: 6, padding: 30, borderRadius: 20, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.line, marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.textLight, textAlign: 'center' },

  fab: {
    position: 'absolute', right: 20, bottom: 84,
    backgroundColor: COLORS.primary, height: 64, width: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  fabLabel: { color: '#fff', fontSize: 9, fontWeight: '700', marginTop: 1, letterSpacing: 0.5 },
  pressed: { opacity: 0.75 },
});