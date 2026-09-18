import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  mockCategories,
  filterEventsByFaculty,
  filterEventsByText,
  getDateParts,
  getEventTitle,
  getEventLocation,
  getEventHour,
  useHomeEvents,
  windowWidth,
} from './homeShared';

// ── VISTA 1 · "AGENDA" ──
// Lista vertical limpia e institucional: buscador integrado, filtros por
// facultad en chips y eventos como filas de agenda con bloque de fecha.

const COLORS = {
  primary: '#C44200',
  primarySoft: '#FFEFE6',
  bg: '#F7F8FA',
  card: '#FFFFFF',
  line: '#EAEDF2',
  text: '#0F172A',
  textMid: '#5A6275',
  textLight: '#8A93A6',
};

const contentWidth = Math.min(windowWidth, 760);

function AgendaRow({ ev }) {
  const router = useRouter();
  const dateParts = getDateParts(ev);
  const location = getEventLocation(ev);
  const hour = getEventHour(ev);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalles de ${getEventTitle(ev)}`}
      onPress={() => router.push(`/admin/ItemDetail/${ev.idevento}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {dateParts && (
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{dateParts.day}</Text>
          <Text style={styles.dateMonth}>{dateParts.month}</Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {getEventTitle(ev)}
        </Text>
        {(location || hour) && (
          <View style={styles.rowMeta}>
            {!!location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
              </View>
            )}
            {!!hour && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.metaText}>{hour}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
    </Pressable>
  );
}

export default function HomeVistaAgenda() {
  const router = useRouter();
  const { allEvents, loading, error } = useHomeEvents();
  const [selectedFacultad, setSelectedFacultad] = useState(mockCategories[0]);
  const [search, setSearch] = useState('');

  const eventosBase = useMemo(
    () => filterEventsByFaculty(allEvents, selectedFacultad.id),
    [allEvents, selectedFacultad]
  );
  const eventos = useMemo(() => filterEventsByText(eventosBase, search), [eventosBase, search]);

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

  const header = (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View>
          <Text style={styles.brand}>UFT Eventos</Text>
          <Text style={styles.brandSub}>Vida universitaria</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.loginBtn, pressed && styles.rowPressed]}
          onPress={() => router.push('/Login')}
        >
          <Ionicons name="person-outline" size={15} color={COLORS.primary} />
          <Text style={styles.loginBtnText}>Entrar</Text>
        </Pressable>
      </View>

      <Text style={styles.pageTitle}>Próximos eventos</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.textLight} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o descripción"
          placeholderTextColor={COLORS.textLight}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable hitSlop={12} onPress={() => setSearch('')} accessibilityRole="button">
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </Pressable>
        )}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Facultades</Text>
      </View>
      <FlatList
        horizontal
        data={mockCategories}
        keyExtractor={(item) => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsWrap}
        renderItem={({ item }) => {
          const active = item.id === selectedFacultad.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedFacultad(item)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.rowPressed,
              ]}
            >
              <Ionicons name={item.icon} size={16} color={active ? '#fff' : COLORS.primary} />
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Eventos de {selectedFacultad.name}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{eventos.length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <FlatList
          data={eventos}
          keyExtractor={(ev, idx) => String(ev.idevento ?? idx)}
          ListHeaderComponent={header}
          renderItem={({ item }) => <AgendaRow ev={item} />}
          contentContainerStyle={{ width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingBottom: 96 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-clear-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptySub}>No hay eventos activos que coincidan con tu búsqueda.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: COLORS.bg },
  centerHint: { color: COLORS.textMid, fontSize: 14 },
  centerError: { color: COLORS.textMid, fontSize: 15, maxWidth: 260, textAlign: 'center' },

  header: { padding: 18, paddingTop: 10 },

  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  brand: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  brandSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, minHeight: 44,
  },
  loginBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, lineHeight: 32, marginBottom: 14 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 14,
    paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: COLORS.line,
    marginBottom: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, flex: 1 },
  countBadge: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },

  chipsWrap: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    paddingHorizontal: 14, height: 46, borderRadius: 23, maxWidth: 240,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, flexShrink: 1 },
  chipTextActive: { color: '#fff' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16,
    marginHorizontal: 18, marginBottom: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.line,
  },
  rowPressed: { opacity: 0.72 },
  dateBlock: {
    width: 56, height: 60, borderRadius: 12,
    backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { fontSize: 21, fontWeight: '800', color: COLORS.primary, lineHeight: 24 },
  dateMonth: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  rowBody: { flex: 1, paddingVertical: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 20, marginBottom: 6 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 96, marginRight: 8 },
  metaText: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },

  empty: { alignItems: 'center', gap: 8, padding: 40, marginHorizontal: 18, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', lineHeight: 18 },
});