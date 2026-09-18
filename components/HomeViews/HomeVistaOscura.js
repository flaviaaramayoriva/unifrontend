import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ImageBackground,
  Image,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  mockCategories,
  filterEventsByFaculty,
  getDateParts,
  getEventTitle,
  getEventLocation,
  getEventHour,
  useHomeEvents,
} from './homeShared';

// ── VISTA 3 · "EDITORIAL DARK" ──
// Estilo premium oscuro: hero con imagen de fondo, chips de vidrio
// (glassmorphism) y eventos como lista editorial con fecha en formato
// de agenda de gran formato.

const COLORS = {
  primary: '#FF7A45',
  primarySoft: 'rgba(255,122,69,0.16)',
  bg: '#0E1219',
  surface: '#151B26',
  line: 'rgba(255,255,255,0.10)',
  text: '#F5F7FA',
  textMid: '#AEB6C4',
  textLight: '#7C8798',
};

export default function HomeVistaOscura() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { width } = useWindowDimensions();
  const tileWidth = (Math.min(width, 600) - 40 - 12) / 2;
  const { allEvents, loading, error } = useHomeEvents();
  const [selectedFacultad, setSelectedFacultad] = useState(mockCategories[0]);

  const eventos = useMemo(
    () => filterEventsByFaculty(allEvents, selectedFacultad.id),
    [allEvents, selectedFacultad]
  );

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

  const scrollToEvents = () => {
    scrollRef.current?.scrollTo({ y: 330, animated: true });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* HERO */}
        <ImageBackground
          source={require('../../assets/images/ind.jpg')}
          style={styles.hero}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(14,18,25,0.55)', 'rgba(14,18,25,0.4)', 'rgba(14,18,25,0.96)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroTop}>
              <View style={styles.brandLockup}>
                <View style={styles.brandDot} />
                <Text style={styles.brand}>UFT EVENTOS</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                onPress={() => router.push('/Login')}
              >
                <Ionicons name="person-outline" size={15} color="#fff" />
                <Text style={styles.ghostBtnText}>Iniciar sesión</Text>
              </Pressable>
            </View>

            <View style={styles.heroBody}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
                onPress={scrollToEvents}
              >
                <Text style={styles.ctaBtnText}>Explorar eventos</Text>
                <Ionicons name="arrow-down" size={17} color={COLORS.bg} />
              </Pressable>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* FACULTADES */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>EXPLORAR POR</Text>
            <Text style={styles.sectionTitle}>Facultades</Text>
          </View>
          <View style={styles.facGrid}>
            {mockCategories.map((cat) => {
              const active = cat.id === selectedFacultad.id;
              return (
                <Pressable
                  key={cat.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedFacultad(cat)}
                  style={({ pressed }) => [
                    { width: tileWidth },
                    styles.facCard,
                    active && styles.facCardActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Image source={cat.image} style={styles.facImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['rgba(14,18,25,0.45)', 'rgba(14,18,25,0.7)', 'rgba(8,11,17,0.92)']}
                    style={styles.facGradient}
                  />
                  {active && (
                    <View style={styles.facCheck}>
                      <Ionicons name="checkmark" size={13} color="#0E1219" />
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
        </View>

        {/* EVENTOS */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>AGENDA · {selectedFacultad.sigla}</Text>
              <Text style={styles.sectionTitle}>Próximos eventos</Text>
            </View>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{eventos.length}</Text>
            </View>
          </View>

          {eventos.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={36} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Sin eventos activos</Text>
              <Text style={styles.emptySub}>Elige otra facultad o vuelve más tarde.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {eventos.map((ev, idx) => {
                const dateParts = getDateParts(ev);
                const location = getEventLocation(ev);
                const hour = getEventHour(ev);
                return (
                  <Pressable
                    key={String(ev.idevento ?? idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver detalles de ${getEventTitle(ev)}`}
                    onPress={() => router.push(`/admin/ItemDetail/${ev.idevento}`)}
                    style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                  >
                    <View style={styles.itemDate}>
                      {dateParts ? (
                        <>
                          <Text style={styles.itemDay}>{dateParts.day}</Text>
                          <Text style={styles.itemMonth}>{dateParts.month}</Text>
                        </>
                      ) : (
                        <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
                      )}
                    </View>

                    <View style={styles.itemBody}>
                      <Text style={styles.itemCat}>{selectedFacultad.sigla} · EVENTO</Text>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {getEventTitle(ev)}
                      </Text>
                      {(location || hour) && (
                        <Text style={styles.itemMeta}>
                          {[location && `Ubicación: ${location}`, hour && `Hora: ${hour}`]
                            .filter(Boolean)
                            .join('  ·  ')}
                        </Text>
                      )}
                    </View>

                    <Ionicons name="arrow-forward" size={18} color={COLORS.textLight} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* CTA */}
        <View style={styles.ctaBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaBannerTitle}>¿Organizas un evento?</Text>
            <Text style={styles.ctaBannerSub}>Publica y gestiona tus actividades universitarias.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.ctaBannerBtn, pressed && styles.pressed]}
            onPress={() => router.push('/Login')}
          >
            <Text style={styles.ctaBannerBtnText}>Unirse</Text>
          </Pressable>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: COLORS.bg },
  centerHint: { color: COLORS.textMid, fontSize: 14 },
  centerError: { color: COLORS.textMid, fontSize: 15, maxWidth: 260, textAlign: 'center' },
  scroll: { backgroundColor: COLORS.bg },

  // Hero
  hero: { width: '100%', height: 340 },
  heroGradient: { flex: 1, padding: 20, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  brand: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44,
    paddingHorizontal: 14, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.08)',
  },
  ghostBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroBody: { alignItems: 'flex-start' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48,
    backgroundColor: COLORS.primary, paddingHorizontal: 20, borderRadius: 24,
  },
  ctaBtnText: { color: COLORS.bg, fontSize: 14, fontWeight: '800' },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 26 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  sectionTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },

  // Facultades grid (bento dark)
  facGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  facCard: {
    height: 118, borderRadius: 18, overflow: 'hidden',
    backgroundColor: COLORS.surface, borderWidth: 2, borderColor: 'transparent',
  },
  facCardActive: { borderColor: COLORS.primary },
  facImage: { width: '100%', height: '100%' },
  facGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  facCheck: {
    position: 'absolute', top: 10, right: 10, width: 24, height: 24,
    borderRadius: 12, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  facBody: { position: 'absolute', left: 12, bottom: 12, right: 12, gap: 3 },
  facName: { color: '#fff', fontSize: 12.5, fontWeight: '700', lineHeight: 16 },
  facSigla: { color: '#FFB38C', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  countChip: { backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: 'rgba(255,122,69,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
  countChipText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },

  // List editorial
  list: { backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    minHeight: 92, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.line,
  },
  itemDate: { width: 52, alignItems: 'center' },
  itemDay: { color: COLORS.primary, fontSize: 28, fontWeight: '900', lineHeight: 30 },
  itemMonth: { color: COLORS.textMid, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  itemBody: { flex: 1 },
  itemCat: { color: COLORS.primary, fontSize: 8, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
  itemTitle: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 5 },
  itemMeta: { color: COLORS.textMid, fontSize: 11, fontWeight: '500', lineHeight: 16 },

  emptyBox: { alignItems: 'center', gap: 8, padding: 34, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 4 },
  emptySub: { color: COLORS.textMid, fontSize: 12, textAlign: 'center' },

  // CTA banner
  ctaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginTop: 28, marginHorizontal: 20, padding: 18, borderRadius: 20,
    backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: 'rgba(255,122,69,0.35)',
  },
  ctaBannerTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  ctaBannerSub: { color: COLORS.textMid, fontSize: 11, lineHeight: 16 },
  ctaBannerBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ctaBannerBtnText: { color: COLORS.bg, fontSize: 13, fontWeight: '800' },

  pressed: { opacity: 0.72 },
});