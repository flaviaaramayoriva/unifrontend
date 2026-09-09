import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Link } from 'expo-router';
import axios from 'axios';
import dayjs from 'dayjs';

import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const windowWidth = Dimensions.get('window').width;
const IS_WIDE = windowWidth >= 780;
const CAROUSEL_LIST_WIDTH = windowWidth - (IS_WIDE ? 32 : 0);
const CAROUSEL_ITEM_WIDTH = IS_WIDE
  ? Math.min(CAROUSEL_LIST_WIDTH * 0.45, 520)
  : Math.min(windowWidth * 0.62, 420);
const CAROUSEL_ITEM_HEIGHT = Math.min(Math.round(CAROUSEL_ITEM_WIDTH * 0.6), 240);
const ITEM_MARGIN = 10;
const SNAP_TO_INTERVAL = CAROUSEL_ITEM_WIDTH + ITEM_MARGIN * 2;
const CAROUSEL_SPACING = Math.max(0, (CAROUSEL_LIST_WIDTH - CAROUSEL_ITEM_WIDTH) / 2);

const COLORS = {
  primary: '#C44200',
  primaryDark: '#C8390A',
  accent: '#FFB38C',
  white: '#FFFFFF',
  lightGray: '#F6F7F9',
  medGray: '#E8ECF0',
  textDark: '#0F172A',
  textMid: '#5B5B6E',
  textLight: '#5A6275',
};

const mockCategories = [
  { id: 1, name: 'Ingeniería',                          sigla: 'ING', image: require('../../assets/images/tec.jpg'),   icon: '⚙️' },
  { id: 2, name: 'Ciencias Económicas y Empresariales', sigla: 'ECO', image: require('../../assets/images/econ.jpg'),  icon: '📊' },
  { id: 3, name: 'Ciencias de la Salud',                sigla: 'SAL', image: require('../../assets/images/sal.jpg'),   icon: '🏥' },
  { id: 4, name: 'Diseño y Tecnología Crossmedia',      sigla: 'DIS', image: require('../../assets/images/arqui.jpg'), icon: '🎨' },
  { id: 5, name: 'Ciencias Jurídicas y Sociales',       sigla: 'DER', image: require('../../assets/images/der.jpg'),   icon: '⚖️' },
];

const getEventTitle = (ev) =>
  ev.nombreevento ?? ev.titulo ?? ev.title ?? ev.nombre ?? ev.name ?? 'Sin título';
const getEventDescription = (ev) => ev.descripcion ?? ev.description ?? ev.detalle ?? '';
const getEventFacultadId  = (ev) => ev.facultadId ?? ev.facultad_id ?? ev.faculty_id ?? ev.id_facultad ?? null;
const getEventImage       = (ev) => {
  const path = ev.imagen ?? ev.imagenUrl ?? ev.image ?? ev.foto ?? null;
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
};
const getEventDate = (ev) => ev.fechaevento ?? ev.date ?? ev.fecha ?? ev.fechaInicio ?? null;
const getEventLocation = (ev) => ev.lugar ?? ev.location ?? ev.ubicacion ?? ev.auditorio ?? '';
const getEventHour = (ev) => ev.horaevento ?? ev.hora ?? ev.time ?? ev.horaInicio ?? '';

const isEventActive = (ev) => {
  const dateStr = getEventDate(ev);
  if (!dateStr) return true;

  let eventDate;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    eventDate = dayjs(dateStr, 'YYYY-MM-DD');
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    eventDate = dayjs(dateStr, 'DD/MM/YYYY');
  } else {
    eventDate = dayjs(dateStr);
  }

  if (!eventDate.isValid()) return true;

  return eventDate.isSame(dayjs().startOf('day')) || eventDate.isAfter(dayjs().startOf('day'));
};

const getDateParts = (ev) => {
  const dateStr = getEventDate(ev);
  if (!dateStr) return null;
  let eventDate;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    eventDate = dayjs(dateStr, 'YYYY-MM-DD');
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    eventDate = dayjs(dateStr, 'DD/MM/YYYY');
  } else {
    eventDate = dayjs(dateStr);
  }
  if (!eventDate.isValid()) return null;
  return { day: eventDate.format('DD'), month: eventDate.format('MMM').toUpperCase() };
};

export default function Home() {
  const router = useRouter();
  const [allEvents, setAllEvents]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);

  const [selectedFacultad, setSelectedFacultad] = useState(mockCategories[0]);
  const [activeCatIndex, setActiveCatIndex]   = useState(0);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const eventsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    axios.get(`${API_BASE_URL}/eventos/con-facultad`)
      .then((res) => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data.data ?? data.eventos ?? data.events ?? [];
        setAllEvents(list);
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
        ]).start();
      })
      .catch((e) => {
        console.error(e);
        setError('No se pudieron cargar los eventos');
        setLoading(false);
      });
  }, []);

  const eventos = allEvents.filter((ev) => {
    const matchesFacultad = getEventFacultadId(ev) === selectedFacultad.id;
    return matchesFacultad && isEventActive(ev);
  });

  const animateEvents = () => {
    eventsAnim.setValue(0);
    Animated.timing(eventsAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start();
  };

  const handleSelectFacultad = (facultad, index) => {
    setSelectedFacultad(facultad);
    setActiveCatIndex(index);
    animateEvents();
  };

  const isWide = windowWidth >= 780;
  const innerWidth = Math.min(windowWidth, 1100) - 32;
  const numColumns = innerWidth >= 520 ? 2 : 1;
  const GAP = 14;
  const cardWidth = numColumns === 2 ? (innerWidth - GAP) / 2 : innerWidth;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando eventos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ fontSize: 36 }}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); setError(null); }}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── BANNER ── */}
        <View style={styles.bannerContainer}>
          <Image source={require('../../assets/images/ind.jpg')} style={styles.bannerImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'rgba(15,23,42,0.35)', 'rgba(15,23,42,0.88)']}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>UNIFRANZ · EVENTOS</Text>
            </View>
            <Text style={styles.bannerTitle}>Conviértete en un{'\n'}profesional con propósito</Text>
            <Text style={styles.bannerSubtitle}>Aprende haciendo</Text>
          </LinearGradient>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* ── CARRUSEL DE FACULTADES ── */}
          <View style={[styles.sectionContainer, isWide && styles.sectionContainerWide]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Facultades</Text>
              <View style={styles.swipeHint}>
                <Ionicons name="swap-horizontal" size={13} color={COLORS.primary} />
                <Text style={styles.swipeHintText}>Desliza</Text>
              </View>
            </View>

            <FlatList
              data={mockCategories}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_TO_INTERVAL}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: CAROUSEL_SPACING, paddingBottom: 4 }}
              scrollEventThrottle={16}
              windowSize={5}
              renderItem={({ item, index }) => {
                const isActive = item.id === selectedFacultad.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => handleSelectFacultad(item, index)}
                    style={{
                      ...styles.categoryCard,
                      width: CAROUSEL_ITEM_WIDTH,
                      height: CAROUSEL_ITEM_HEIGHT,
                      marginHorizontal: ITEM_MARGIN,
                      borderWidth: isActive ? 3 : 0,
                      borderColor: isActive ? COLORS.primary : 'transparent',
                    }}
                  >
                    <Image source={item.image} style={styles.categoryImage} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(254,80,0,0.25)', 'rgba(15,18,34,0.85)']}
                      style={styles.categoryOverlay}
                    />
                    <View style={styles.categoryChipSigla}>
                      <Text style={styles.categoryChipSiglaText}>{item.sigla}</Text>
                    </View>
                    <View style={styles.categoryContent}>
                      <Text style={styles.categoryIcon}>{item.icon}</Text>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <View style={[styles.categoryChip, isActive && styles.categoryChipActive]}>
                        <Text style={styles.categoryChipText}>
                          {isActive ? '✓ Seleccionada' : 'Ver eventos'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.pagination}>
              {mockCategories.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSelectFacultad(mockCategories[i], i)}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  style={{
                    ...styles.dot,
                    ...(activeCatIndex === i ? styles.dotActive : {}),
                  }}
                />
              ))}
            </View>
          </View>

          {/* ── EVENTOS DE LA FACULTAD SELECCIONADA ── */}
          <Animated.View
            style={{
              opacity: eventsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              transform: [{ translateY: eventsAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            }}
          >
            <View style={[styles.sectionContainer, isWide && styles.sectionContainerWide]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Eventos</Text>
                  <Text style={styles.sectionSubtitle} numberOfLines={1}>{selectedFacultad.name}</Text>
                </View>
                <View style={styles.eventsBadge}>
                  <Text style={styles.eventsBadgeText}>{eventos.length}</Text>
                </View>
              </View>

              {eventos.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={40} color={COLORS.textLight} />
                  <Text style={styles.emptyTitle}>Sin eventos</Text>
                  <Text style={styles.emptySubtitle}>Esta facultad no tiene eventos activos por ahora</Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  numColumns={numColumns}
                  data={eventos}
                  key={`grid-${numColumns}`}
                  keyExtractor={(ev, idx) => String(ev.idevento ?? idx)}
                  columnWrapperStyle={numColumns === 2 ? { gap: GAP } : undefined}
                  renderItem={({ item: ev, index: idx }) => {
                    const imgUrl = getEventImage(ev);
                    const dateParts = getDateParts(ev);
                    const location = getEventLocation(ev);
                    const hour = getEventHour(ev);
                    return (
                      <Link
                        key={ev.idevento ?? idx}
                        href={`/admin/ItemDetail/${ev.idevento}`}
                        asChild
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={{ width: cardWidth, marginBottom: GAP, ...styles.eventCard }}
                        >
                          <View style={styles.eventCardImageWrap}>
                            {imgUrl ? (
                              <Image source={{ uri: imgUrl }} style={styles.eventCardImage} resizeMode="cover" />
                            ) : (
                              <View style={[styles.eventCardImagePlaceholder, { width: '100%' }]}>
                                <Ionicons name="images-outline" size={34} color={COLORS.primary} />
                              </View>
                            )}
                            {dateParts && (
                              <View style={styles.dateBadge}>
                                <Text style={styles.dateBadgeDay}>{dateParts.day}</Text>
                                <Text style={styles.dateBadgeMonth}>{dateParts.month}</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.eventCardBody}>
                            <Text style={styles.eventCardTitle} numberOfLines={2}>
                              {getEventTitle(ev)}
                            </Text>
                            <Text style={styles.eventCardDesc} numberOfLines={2}>
                              {getEventDescription(ev)}
                            </Text>

                            <View style={styles.eventCardMeta}>
                              {(location || hour) && (
                                <View style={styles.eventCardMetaRow}>
                                  {location ? (
                                    <View style={styles.metaItem}>
                                      <Ionicons name="location-outline" size={13} color={COLORS.textLight} />
                                      <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
                                    </View>
                                  ) : null}
                                  {hour ? (
                                    <View style={styles.metaItem}>
                                      <Ionicons name="time-outline" size={13} color={COLORS.textLight} />
                                      <Text style={styles.metaText}>{hour}</Text>
                                    </View>
                                  ) : null}
                                </View>
                              )}
                              <View style={styles.eventCardFooter}>
                                <Text style={styles.eventCardLink}>Ver detalles</Text>
                                <Ionicons name="arrow-forward-circle" size={20} color={COLORS.primary} />
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Link>
                    );
                  }}
                />
              )}
            </View>
          </Animated.View>
        </Animated.View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB Login */}
      <TouchableOpacity style={styles.fabLogin} onPress={() => router.push('/Login')} activeOpacity={0.85}>
        <Ionicons name="person" size={20} color={COLORS.white} />
        <Text style={styles.fabLabel}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  loadingText:      { marginTop: 10, fontSize: 14, color: COLORS.textMid, fontWeight: '500' },
  errorContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12, backgroundColor: COLORS.lightGray },
  errorText:        { fontSize: 15, color: COLORS.textMid, textAlign: 'center' },
  retryButton:      { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 30, marginTop: 8 },
  retryButtonText:  { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // Banner
  bannerContainer: { width: '100%', height: 220 },
  bannerImage:     { width: '100%', height: '100%', position: 'absolute' },
  bannerGradient:  { flex: 1, padding: 24, justifyContent: 'flex-end' },
  bannerBadge:     { backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 12 },
  bannerBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  bannerTitle:     { color: COLORS.white, fontSize: 24, fontWeight: '800', lineHeight: 31, marginBottom: 6 },
  bannerSubtitle:  { color: COLORS.accent, fontSize: 15, fontWeight: '700' },

  // Section
  sectionContainer: { paddingTop: 24, paddingBottom: 8 },
  sectionContainerWide: { paddingLeft: 16, paddingRight: 16 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginLeft: 16, marginRight: 16, gap: 10 },
  sectionAccent:    { width: 4, height: 24, backgroundColor: COLORS.primary, borderRadius: 2 },
  sectionTitle:     { fontSize: 19, fontWeight: '800', color: COLORS.textDark },
  sectionSubtitle:  { fontSize: 12, color: COLORS.textMid, marginTop: 2 },
  swipeHint:        { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF0E6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  swipeHintText:    { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  eventsBadge:      { backgroundColor: COLORS.primary, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 20 },
  eventsBadgeText:  { color: COLORS.white, fontSize: 12, fontWeight: '800' },

  // Facultad card
  categoryCard:    { borderRadius: 18, overflow: 'hidden', height: 210, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 5 },
  categoryImage:   { width: '100%', height: '100%', position: 'absolute' },
  categoryOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  categoryChipSigla: { position: 'absolute', top: 12, right: 12, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  categoryChipSiglaText: { color: COLORS.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  categoryContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  categoryIcon:    { fontSize: 22, marginBottom: 5 },
  categoryName:    { color: COLORS.white, fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 9 },
  categoryChip:    { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

  // Pagination dots
  pagination: { flexDirection: 'row', justifyContent: 'center', marginTop: 14, gap: 6 },
  dot:        { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.medGray },
  dotActive:  { width: 28, height: 12, backgroundColor: COLORS.primary, borderRadius: 6 },

  // Event grid + cards
  eventsGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center', alignSelf: 'center' },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  eventCardImageWrap: { position: 'relative', height: 130, width: '100%' },
  eventCardImage:      { width: '100%', height: '100%' },
  eventCardImagePlaceholder: { height: '100%', backgroundColor: '#FFEFE6', justifyContent: 'center', alignItems: 'center' },
  dateBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBadgeDay:   { color: COLORS.white, fontSize: 15, fontWeight: '800', lineHeight: 17 },
  dateBadgeMonth: { color: 'rgba(255,255,255,0.92)', fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  eventCardBody:  { padding: 13 },
  eventCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, lineHeight: 19, marginBottom: 5 },
  eventCardDesc:  { fontSize: 12, color: COLORS.textMid, lineHeight: 17, marginBottom: 10 },
  eventCardMeta:  { marginTop: 'auto' },
  eventCardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '48%' },
  metaText:       { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  eventCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F3F6', paddingTop: 10 },
  eventCardLink:  { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // Empty
  emptyBox:      { marginLeft: 16, marginRight: 16, padding: 34, borderRadius: 18, backgroundColor: COLORS.white, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginTop: 4 },
  emptySubtitle: { fontSize: 12, color: COLORS.textMid, textAlign: 'center', lineHeight: 18 },

  // FAB Login
  fabLogin: { position: 'absolute', right: 20, bottom: 80, backgroundColor: COLORS.primary, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  fabIcon:  { fontSize: 20 },
  fabLabel: { color: COLORS.white, fontSize: 9, fontWeight: '700', marginTop: 1, letterSpacing: 0.5 },
});