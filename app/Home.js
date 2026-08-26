import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Link } from 'expo-router';
import axios from 'axios';
import dayjs from 'dayjs'; // <-- 1. Agregado para manejo robusto de fechas

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

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const windowWidth = Dimensions.get('window').width;
const CAROUSEL_ITEM_WIDTH = windowWidth * 0.80;
const ITEM_MARGIN = 8;
const SNAP_TO_INTERVAL = CAROUSEL_ITEM_WIDTH + ITEM_MARGIN * 2;
const CAROUSEL_SPACING = (windowWidth - CAROUSEL_ITEM_WIDTH) / 2;

const COLORS = {
  primary: '#C8390A',
  dark: '#1A1A2E',
  accent: '#F5A623',
  white: '#FFFFFF',
  lightGray: '#F4F6F9',
  medGray: '#E8ECF0',
  textDark: '#1C1C2E',
  textMid: '#4A4A6A',
};

const mockCategories = [
  { id: 1, name: 'Ingeniería',                          image: require('../assets/images/tec.jpg'),   icon: '⚙️' },
  { id: 2, name: 'Ciencias Económicas y Empresariales', image: require('../assets/images/econ.jpg'),  icon: '📊' },
  { id: 3, name: 'Ciencias de la Salud',                image: require('../assets/images/sal.jpg'),   icon: '🏥' },
  { id: 4, name: 'Diseño y Tecnología Crossmedia',      image: require('../assets/images/arqui.jpg'), icon: '🎨' },
  { id: 5, name: 'Ciencias Jurídicas y Sociales',       image: require('../assets/images/der.jpg'),   icon: '⚖️' },
];

const getEventTitle = (ev) => 
  ev.nombreevento ?? ev.titulo ?? ev.title ?? ev.nombre ?? ev.name ?? 'Sin título';
const getEventDescription = (ev) => ev.descripcion  ?? ev.description ?? ev.detalle ?? '';
const getEventFacultadId  = (ev) => ev.facultadId   ?? ev.facultad_id ?? ev.faculty_id ?? ev.id_facultad ?? null;
const getEventImage       = (ev) => {
  const path = ev.imagen ?? ev.imagenUrl ?? ev.image ?? ev.foto ?? null;
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
};

// --- 2. NUEVO: Obtener la fecha del evento (soporta los nombres de campo que usas) ---
const getEventDate = (ev) => ev.fechaevento ?? ev.date ?? ev.fecha ?? ev.fechaInicio ?? null;

// --- 3. NUEVO: Verificar si el evento NO ha pasado (es hoy o está en el futuro) ---
const isEventActive = (ev) => {
  const dateStr = getEventDate(ev);
  if (!dateStr) return true; // Si no tiene fecha registrada, lo mostramos por defecto

  let eventDate;
  // Soporta formatos comunes: YYYY-MM-DD, DD/MM/YYYY, o string ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    eventDate = dayjs(dateStr, 'YYYY-MM-DD');
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    eventDate = dayjs(dateStr, 'DD/MM/YYYY');
  } else {
    eventDate = dayjs(dateStr);
  }

  if (!eventDate.isValid()) return true; // Si la fecha es inválida, lo mostramos por seguridad

  // Retorna true si la fecha del evento es hoy o en el futuro
  return eventDate.isSame(dayjs().startOf('day')) || eventDate.isAfter(dayjs().startOf('day'));
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
        console.log('=== DATOS CRUDOS ===', JSON.stringify(data, null, 2));
      
        const list = Array.isArray(data) ? data : data.data ?? data.eventos ?? data.events ?? [];
        console.log('=== EVENTOS EXTRAÍDOS ===', list.length, 'eventos');
        console.log('=== PRIMER EVENTO ===', list[0]);
        
        if (list.length > 0) {
          console.log('=== CAMPOS DEL PRIMER EVENTO ===', Object.keys(list[0]));
          console.log('=== FACULTAD ID ===', getEventFacultadId(list[0]));
        }
        setAllEvents(list);
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
      })
      .catch((e) => {
        console.error(e);
        setError('No se pudieron cargar los eventos');
        setLoading(false);
      });
  }, []);

  // --- 4. FILTRO ACTUALIZADO: Solo eventos de la facultad Y que no hayan pasado ---
  const eventos = allEvents.filter((ev) => {
    const matchesFacultad = getEventFacultadId(ev) === selectedFacultad.id;
    return matchesFacultad && isEventActive(ev);
  });

  useEffect(() => {
    console.log('=== FILTRANDO ===');
    console.log('Facultad seleccionada ID:', selectedFacultad.id);
    console.log('Total eventos:', allEvents.length);
    console.log('Eventos filtrados (activos):', eventos.length);
    if (eventos.length > 0) {
      console.log('Primer evento filtrado:', eventos[0]);
    }
  }, [selectedFacultad, allEvents, eventos]);

  const animateEvents = () => {
    eventsAnim.setValue(0);
    Animated.timing(eventsAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  const handleSelectFacultad = (facultad, index) => {
    setSelectedFacultad(facultad);
    setActiveCatIndex(index);
    animateEvents();
  };

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
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── BANNER ── */}
        <View style={styles.bannerContainer}>
          <Image source={require('../assets/images/ind.jpg')} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerGradient}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>UNIVERSIDAD</Text>
            </View>
            <Text style={styles.bannerTitle}>Conviértete en un{'\n'}profesional con propósito</Text>
            <Text style={styles.bannerSubtitle}>Aprende haciendo</Text>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── CARRUSEL DE FACULTADES ── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Facultades</Text>
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
              renderItem={({ item, index }) => {
                const isActive = item.id === selectedFacultad.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => handleSelectFacultad(item, index)}
                    style={{
                      ...styles.categoryCard,
                      width: CAROUSEL_ITEM_WIDTH,
                      marginHorizontal: ITEM_MARGIN,
                      borderWidth: isActive ? 3 : 0,
                      borderColor: isActive ? COLORS.primary : 'transparent',
                    }}
                  >
                    <Image source={item.image} style={styles.categoryImage} resizeMode="cover" />
                    <View style={styles.categoryOverlay} />
                    <View style={styles.categoryContent}>
                      <Text style={styles.categoryIcon}>{item.icon}</Text>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <View style={[styles.categoryChip, isActive && styles.categoryChipActive]}>
                        <Text style={styles.categoryChipText}>
                          {isActive ? '✓ Seleccionada' : 'Ver eventos →'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Indicadores */}
            <View style={styles.pagination}>
              {mockCategories.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSelectFacultad(mockCategories[i], i)}
                  style={{
                    ...styles.dot,
                    ...(activeCatIndex === i ? styles.dotActive : {}),
                  }}
                />
              ))}
            </View>
          </View>

          {/* ── EVENTOS DE LA FACULTAD SELECCIONADA ── */}
          <Animated.View style={{ opacity: eventsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), transform: [{ translateY: eventsAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
            <View style={styles.sectionContainer}>
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
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyTitle}>Sin eventos</Text>
                  <Text style={styles.emptySubtitle}>Esta facultad no tiene eventos activos por ahora</Text>
                </View>
              ) : (
                <View style={styles.eventsListContainer}>
                  {eventos.map((ev, idx) => {
                    const imgUrl = getEventImage(ev);
                    return (
                      <Link key={ev.idevento ?? idx} href={`/admin/ItemDetail/${ev.idevento}`} asChild>
                        <TouchableOpacity activeOpacity={0.85} style={styles.eventRow}>
                          {imgUrl ? (
                            <Image source={{ uri: imgUrl }} style={styles.eventRowImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.eventRowImagePlaceholder}>
                              <Text style={{ fontSize: 22 }}>{selectedFacultad.icon}</Text>
                            </View>
                          )}
                          <View style={styles.eventRowContent}>
                            <Text style={styles.eventRowTitle} numberOfLines={2}>
                              {getEventTitle(ev)}
                            </Text>
                            <Text style={styles.eventRowDesc} numberOfLines={2}>
                              {getEventDescription(ev)}
                            </Text>
                          </View>
                          <Text style={styles.eventRowArrow}>›</Text>
                        </TouchableOpacity>
                      </Link>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>

        </Animated.View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FABs */}
      <TouchableOpacity style={styles.fabLogin} onPress={() => router.push('./(tabs)/Login')} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>👤</Text>
        <Text style={styles.fabLabel}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  loadingText:      { marginTop: 10, fontSize: 14, color: COLORS.textMid, fontWeight: '500' },
  errorContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 },
  errorText:        { fontSize: 15, color: COLORS.textMid, textAlign: 'center' },
  retryButton:      { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 30, marginTop: 8 },
  retryButtonText:  { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // Banner
  bannerContainer: { width: '100%', height: 240 },
  bannerImage:     { width: '100%', height: '100%', position: 'absolute' },
  bannerGradient:  { flex: 1, backgroundColor: 'rgba(10,10,30,0.62)', padding: 24, justifyContent: 'flex-end' },
  bannerBadge:     { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 10 },
  bannerBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  bannerTitle:     { color: COLORS.white, fontSize: 24, fontWeight: '800', lineHeight: 32, marginBottom: 6 },
  bannerSubtitle:  { color: COLORS.accent, fontSize: 15, fontWeight: '600' },

  // Section
  sectionContainer: { paddingTop: 22, paddingBottom: 8 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginLeft: 16, marginRight: 16, gap: 10 },
  sectionAccent:    { width: 4, height: 22, backgroundColor: COLORS.primary, borderRadius: 2 },
  sectionTitle:     { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  sectionSubtitle:  { fontSize: 12, color: COLORS.textMid, marginTop: 1 },
  eventsBadge:      { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  eventsBadgeText:  { color: COLORS.white, fontSize: 12, fontWeight: '800' },

  // Facultad card
  categoryCard:    { borderRadius: 16, overflow: 'hidden', height: 175, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  categoryImage:   { width: '100%', height: '100%', position: 'absolute' },
  categoryOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,15,40,0.52)' },
  categoryContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  categoryIcon:    { fontSize: 22, marginBottom: 4 },
  categoryName:    { color: COLORS.white, fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 8 },
  categoryChip:    { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

  // Pagination dots
  pagination: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.medGray },
  dotActive:  { width: 20, backgroundColor: COLORS.primary, borderRadius: 3 },

  // Events list
  eventsListContainer: { marginHorizontal: 16, borderRadius: 16, backgroundColor: COLORS.white, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  eventRow:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.medGray, gap: 12 },
  eventRowImage:       { width: 56, height: 56, borderRadius: 10 },
  eventRowImagePlaceholder: { width: 56, height: 56, borderRadius: 10, backgroundColor: COLORS.medGray, justifyContent: 'center', alignItems: 'center' },
  eventRowContent:     { flex: 1 },
  eventRowTitle:       { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 3 },
  eventRowDesc:        { fontSize: 11, color: COLORS.textMid, lineHeight: 16 },
  eventRowArrow:       { fontSize: 24, color: COLORS.primary, fontWeight: '300' },

  // Empty
  emptyBox:      { marginHorizontal: 16, padding: 30, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', gap: 8 },
  emptyIcon:     { fontSize: 36 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  emptySubtitle: { fontSize: 12, color: COLORS.textMid, textAlign: 'center', lineHeight: 18 },

  // FABs
  fabChat:  { position: 'absolute', right: 20, bottom: 28, backgroundColor: COLORS.primary, width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  fabLogin: { position: 'absolute', left: 20, bottom: 28, backgroundColor: COLORS.dark, width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabIcon:  { fontSize: 20 },
  fabLabel: { color: COLORS.white, fontSize: 9, fontWeight: '700', marginTop: 1, letterSpacing: 0.5 },
});