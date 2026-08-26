import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

//const API_BASE_URL = 'https://evento.cidtec-uc.com'; // ✅ Sin espacios
const API_BASE_URL = 'unibackend-production-a0f8.up.railway.app';//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FFEDD5',
  accent: '#EF4444',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  white: '#FFFFFF',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'Sin fecha';
  try {
    let date;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Formato: YYYY-MM-DD
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);

    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      // Formato: DD/MM/YYYY o D/M/YYYY  ← este es tu caso (22/3/2026)
      const [day, month, year] = dateString.split('/').map(Number);
      date = new Date(year, month - 1, day);

    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      console.warn('Fecha inválida recibida:', dateString);
      return 'Sin fecha';
    }

    return date.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Sin fecha';
  }
};

const RejectedEventCard = ({ event, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.eventCard} 
      onPress={() => onPress(event)}
      activeOpacity={0.85}
    >
      <View style={styles.eventHeader}>
        <View style={[styles.statusBadge, { backgroundColor: COLORS.accent + '18' }]}>
          <Ionicons name="close-circle" size={14} color={COLORS.accent} />
          <Text style={[styles.statusText, { color: COLORS.accent }]}>Rechazado</Text>
        </View>
        <Text style={styles.eventDate}>{formatDate(event.fechaevento)}</Text>
      </View>

      <Text style={styles.eventTitle} numberOfLines={2}>
        {event.nombreevento || 'Sin título'}
      </Text>
      
      {event.descripcion && (
        <Text style={styles.eventDescription} numberOfLines={3}>
          {event.descripcion}
        </Text>
      )}

      <View style={styles.eventMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText}>{event.lugarevento || 'Sin ubicación'}</Text>
        </View>
        {event.facultad && (
          <View style={styles.metaItem}>
            <Ionicons name="school-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.metaText}>{event.facultad}</Text>
          </View>
        )}
      </View>

      {event.razon_rechazo && (
        <View style={styles.rejectionReason}>
          <Text style={styles.rejectionLabel}>Motivo:</Text>
          <Text style={styles.rejectionText}>{event.razon_rechazo}</Text>
        </View>
      )}

      <View style={styles.eventFooter}>
        <View style={styles.academicoInfo}>
          <Ionicons name="person-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.academicoName}>
            {event.academico?.nombre || 'Académico'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

const EventosCancelados = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRejectedEvents = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente.');
        router.replace('/');
        return;
      }

      console.log('🔍 Solicitando eventos cancelados...');
      const response = await axios.get(`${API_BASE_URL}/eventos/cancelados`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      console.log('✅ Eventos cancelados recibidos:', response.data.length);
      if (response.data.length > 0) {
        console.log('📅 Primer evento:', response.data[0]);
      }
      
      setEvents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('❌ Error fetching canceled events:', error);
      
      let message = 'No se pudieron cargar los eventos cancelados.';
      
      if (error.response?.status === 401) {
        message = 'Sesión expirada. Inicia sesión nuevamente.';
        router.replace('/');
      } else if (error.response?.status === 403) {
        message = 'No tienes permisos para ver esta sección.';
      } else if (error.response?.status === 404) {
        message = 'Endpoint no encontrado.';
      } else if (error.code === 'ECONNABORTED') {
        message = 'Tiempo de espera agotado.';
      }
      
      Alert.alert('Error', message, [
        { text: 'Reintentar', onPress: fetchRejectedEvents },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRejectedEvents();
  }, [fetchRejectedEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRejectedEvents();
  }, [fetchRejectedEvents]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.nombreevento?.toLowerCase().includes(query) ||
      event.descripcion?.toLowerCase().includes(query) ||
      event.lugarevento?.toLowerCase().includes(query) ||
      event.facultad?.toLowerCase().includes(query) ||
      event.academico?.nombre?.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  const handleEventPress = (event) => {
    router.push({ 
      pathname: '/admin/EventoDetalle', 
      params: { 
        id: event.idevento || event.id,
        from: 'rechazados'
      } 
    });
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando eventos rechazados...</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Eventos Cancelados</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="close-circle-outline" size={80} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Sin eventos cancelados</Text>
          <Text style={styles.emptyText}>
            No hay eventos con estado "cancelado" en este momento.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
            <Text style={styles.emptyButtonText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Eventos Cancelados</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, facultad, académico..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.resultsCount}>
          {filteredEvents.length} de {events.length} eventos
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <View style={[styles.statCard, { backgroundColor: COLORS.accent }]}>
          <Ionicons name="close-circle-outline" size={20} color={COLORS.white} />
          <Text style={styles.statNumber}>{events.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
          <Ionicons name="school-outline" size={20} color={COLORS.white} />
          <Text style={styles.statNumber}>
            {[...new Set(events.map(e => e.facultad).filter(Boolean))].length}
          </Text>
          <Text style={styles.statLabel}>Facultades</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="person-outline" size={20} color={COLORS.white} />
          <Text style={styles.statNumber}>
            {[...new Set(events.map(e => e.idacademico).filter(Boolean))].length}
          </Text>
          <Text style={styles.statLabel}>Académicos</Text>
        </View>
      </ScrollView>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => `event-${item.idevento || item.id}`}
        renderItem={({ item }) => <CanceledEventCard event={item} onPress={handleEventPress} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={searchQuery ? (
          <View style={styles.emptySearch}>
            <Ionicons name="search-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptySearchTitle}>Sin resultados</Text>
            <Text style={styles.emptySearchText}>
              No se encontraron eventos que coincidan con "{searchQuery}"
            </Text>
            <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>Limpiar búsqueda</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.primary },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  refreshButton: { padding: 4 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, padding: 0 },
  resultsCount: { fontSize: 12, color: COLORS.textTertiary, marginTop: 8, textAlign: 'right' },
  statsScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  statCard: { width: 120, paddingVertical: 12,paddingHorizontal: 10, borderRadius: 12, alignItems: 'center',justifyContent: 'center', gap: 4 },
  statNumber: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 11, color: COLORS.white, opacity: 0.9, textAlign: 'center', includeFontPadding: false },
  listContent: { padding: 16, gap: 12 },
  eventCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  eventDate: { fontSize: 12, color: COLORS.textTertiary },
  eventTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6, lineHeight: 22 },
  eventDescription: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 18 },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  rejectionReason: { backgroundColor: COLORS.accent + '08', borderRadius: 8, padding: 10, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  rejectionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.accent, marginBottom: 2 },
  rejectionText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  academicoInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  academicoName: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  emptySearch: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptySearchTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySearchText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  clearSearchButton: { marginTop: 8 },
  clearSearchText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});

EventosCancelados.options = { headerShown: false };

export default EventosCancelados;