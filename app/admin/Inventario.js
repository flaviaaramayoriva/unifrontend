import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';';const TOKEN_KEY = 'adminAuthToken';
const getToken = async () => {
  if (Platform.OS === 'web') { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
};

const C = {
  primary: '#E95A0C', primaryLight: '#FFF0E6',
  success: '#10B981', successLight: '#D1FAE5',
  warning: '#F59E0B', warningLight: '#FEF3C7',
  danger: '#EF4444',  dangerLight: '#FEE2E2',
  info: '#3B82F6',    infoLight: '#DBEAFE',
  purple: '#8B5CF6',  purpleLight: '#EDE9FE',
  bg: '#F3F4F6', surface: '#FFFFFF',
  t1: '#111827', t2: '#6B7280', t3: '#9CA3AF', border: '#E5E7EB',
};

// Mismos colores que tu CrearRecurso.js, con icono agregado por tipo
const TIPO_COLORS = {
  tecnologico: { color: '#3B82F6', bg: '#DBEAFE', label: 'Tecnológico', icon: 'hardware-chip-outline' },
  mobiliario:  { color: '#8B5CF6', bg: '#EDE9FE', label: 'Mobiliario',  icon: 'cube-outline' },
  vajilla:     { color: '#F59E0B', bg: '#FEF3C7', label: 'Vajilla',     icon: 'restaurant-outline' },
};
const tipoStyle = (tipo) =>
  TIPO_COLORS[tipo] || { color: C.t3, bg: C.bg, label: tipo || 'Otro', icon: 'ellipse-outline' };

// Categorías para el filtro (incluye todos los tipos de tu Picker)
const CATEGORIAS = [
  { label: 'Todos', icon: 'apps-outline' },
  { label: 'Tecnológico', icon: 'hardware-chip-outline' },
  { label: 'Mobiliario', icon: 'cube-outline' },
  { label: 'Vajilla', icon: 'restaurant-outline' },
];
const categoriaToTipo = {
  'Tecnológico': 'tecnologico',
  'Mobiliario':  'mobiliario',
  'Vajilla':     'vajilla',
};

// ─── Tarjeta de recurso ───────────────────────────────────────────────────────
// Usa exactamente los campos de tu BD: idrecurso, nombre_recurso, recurso_tipo,
// descripcion, habilitado
const RecursoCard = ({ item, onEdit }) => {
  const ts        = tipoStyle(item.recurso_tipo);
  const habilitado = item.habilitado == 1;

  return (
    <View style={st.card}>
      <View style={[st.cardIcon, { backgroundColor: ts.bg }]}>
        <Ionicons name={ts.icon} size={20} color={ts.color} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={st.cardTop}>
          <Text style={st.cardName} numberOfLines={1}>{item.nombre_recurso}</Text>
          <TouchableOpacity style={st.editBtn} onPress={() => onEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={15} color={C.primary} />
          </TouchableOpacity>
        </View>

        {item.descripcion ? (
          <Text style={st.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
        ) : null}

        <View style={st.cardFooter}>
          <View style={[st.tipoBadge, { backgroundColor: ts.bg }]}>
            <Text style={[st.tipoBadgeText, { color: ts.color }]}>{ts.label}</Text>
          </View>
          <View style={st.estadoRow}>
            <View style={[st.dot, { backgroundColor: habilitado ? C.success : C.danger }]} />
            <Text style={[st.estadoText, { color: habilitado ? '#065F46' : '#991B1B' }]}>
              {habilitado ? 'Habilitado' : 'Deshabilitado'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const InventarioDAF = () => {
  const router = useRouter();

  const [loading, setLoading]     = useState(true);
  const [recursos, setRecursos]   = useState([]);
  const [filtro, setFiltro]       = useState('Todos');
  const [search, setSearch]       = useState('');

  // Cargar recursos desde el mismo endpoint que usa CrearRecurso.js: GET /recursos
  const cargarRecursos = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE_URL}/recursos`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      let raw = res.data;
      if (raw?.recursos && Array.isArray(raw.recursos)) {
        raw = raw.recursos;
      } else if (!Array.isArray(raw)) {
        raw = raw.data || [];
      }
      setRecursos(raw);
    } catch (err) {
      console.error('cargarRecursos:', err);
      Alert.alert('Error', 'No se pudo cargar el inventario de recursos.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recargar cuando la pantalla vuelve a estar en foco (igual que CrearRecurso)
  useFocusEffect(cargarRecursos);

  // Editar: redirige a la pantalla existente de CrearRecurso para no duplicar lógica
  const handleEdit = (recurso) => {
    router.push({
      pathname: '/admin/Recursos',
      params: { editId: recurso.idrecurso.toString() },
    });
  };

  // Filtrar por tipo y búsqueda
  const filtered = recursos.filter(r => {
    const matchF = filtro === 'Todos' || r.recurso_tipo === categoriaToTipo[filtro];
    const matchS = !search || r.nombre_recurso.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const habilitados    = recursos.filter(r => r.habilitado == 1).length;
  const deshabilitados = recursos.filter(r => r.habilitado != 1).length;

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.t1} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.hTitle}>Inventario de recursos</Text>
          <Text style={st.hSub}>
            {recursos.length} recursos · {habilitados} habilitados · {deshabilitados} deshabilitados
          </Text>
        </View>
        <TouchableOpacity style={st.refreshBtn} onPress={cargarRecursos}>
          <Ionicons name="refresh-outline" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Contenido scrollable: todo dentro de un único ScrollView vertical
          para evitar que el ScrollView horizontal de chips colapse su altura
          (la causa del solape que se veía antes). */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        stickyHeaderIndices={loading || filtered.length === 0 ? undefined : undefined}
      >
        {/* Banner informativo */}
        <View style={st.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={C.info} />
          <Text style={st.infoBannerText}>
            Para crear o editar recursos ve a{' '}
            <Text
              style={{ fontWeight: '700', color: C.primary }}
              onPress={() => router.push('/admin/Recursos')}
            >
              Creación de Recursos
            </Text>
          </Text>
        </View>

        {/* Buscador */}
        <View style={st.searchWrap}>
          <Ionicons name="search-outline" size={17} color={C.t3} />
          <TextInput
            style={st.searchInput}
            placeholder="Buscar recurso…"
            placeholderTextColor={C.t3}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={C.t3} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filtros por tipo — altura fija en el wrapper para que nunca colapse */}
        <View style={st.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.chipsRow}
          >
            {CATEGORIAS.map(c => {
              const active = filtro === c.label;
              return (
                <TouchableOpacity
                  key={c.label}
                  style={[st.chip, active && st.chipActive]}
                  onPress={() => setFiltro(c.label)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={c.icon} size={14} color={active ? C.surface : C.t2} />
                  <Text style={[st.chipText, active && { color: C.surface }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Resumen rápido por tipo */}
        {!loading && (
          <View style={st.summaryRow}>
            {Object.entries(TIPO_COLORS).map(([tipo, ts]) => {
              const count = recursos.filter(r => r.recurso_tipo === tipo && r.habilitado == 1).length;
              return (
                <View key={tipo} style={st.summaryCard}>
                  <View style={[st.summaryIconWrap, { backgroundColor: ts.bg }]}>
                    <Ionicons name={ts.icon} size={16} color={ts.color} />
                  </View>
                  <Text style={[st.summaryCount, { color: ts.color }]}>{count}</Text>
                  <Text style={st.summaryLabel}>{ts.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Lista */}
        {loading ? (
          <View style={st.centerBox}>
            <ActivityIndicator color={C.primary} />
            <Text style={st.loadText}>Cargando inventario…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={st.centerBox}>
            <Ionicons name="cube-outline" size={42} color={C.t3} />
            <Text style={st.emptyTitle}>Sin recursos</Text>
            <Text style={st.emptyText}>
              {search ? 'No hay recursos que coincidan con tu búsqueda.' : 'No hay recursos para este tipo.'}
            </Text>
            <TouchableOpacity
              style={st.goCreateBtn}
              onPress={() => router.push('/admin/Recursos')}
            >
              <Ionicons name="add-circle-outline" size={16} color={C.surface} />
              <Text style={st.goCreateText}>Ir a Creación de Recursos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {filtered.map(item => (
              <RecursoCard key={String(item.idrecurso)} item={item} onEdit={handleEdit} />
            ))}

            {/* Botón ir a crear */}
            <TouchableOpacity
              style={st.createFloatBtn}
              onPress={() => router.push('/admin/Recursos')}
            >
              <Ionicons name="add-circle-outline" size={18} color={C.primary} />
              <Text style={st.createFloatText}>Agregar nuevo recurso en Creación de Recursos</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: (StatusBar.currentHeight || 40) + 12,
    paddingBottom: 14, borderBottomWidth: 0.5, borderColor: C.border, gap: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: C.border },
  hTitle: { fontSize: 18, fontWeight: '800', color: C.t1 },
  hSub:   { fontSize: 12, color: C.t2, marginTop: 1 },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.infoLight, marginHorizontal: 16, marginTop: 14,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 0.5, borderColor: C.info + '40',
  },
  infoBannerText: { fontSize: 13, color: C.info, flex: 1, lineHeight: 18 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface,
    marginHorizontal: 16, marginTop: 12, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.t1, padding: 0 },

  // Wrapper con altura explícita: evita que el ScrollView horizontal
  // colapse a 0 y se solape con lo de abajo (el bug de la captura).
  chipsWrap: { height: 48 },
  chipsRow: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 0.5, borderColor: C.border, backgroundColor: C.surface,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.t2, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 14, marginTop: 4 },
  summaryCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 0.5, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryIconWrap: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  summaryCount: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: C.t2, marginTop: 2, textAlign: 'center' },

  // Tarjeta recurso — layout con icono a la izquierda
  card: {
    flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editBtn: { padding: 6, borderRadius: 8, backgroundColor: C.primaryLight, marginLeft: 8 },
  cardName: { fontSize: 15, fontWeight: '700', color: C.t1, flex: 1 },
  cardDesc: { fontSize: 13, color: C.t2, marginTop: 3, marginBottom: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  tipoBadgeText: { fontSize: 12, fontWeight: '600' },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  estadoText: { fontSize: 12, fontWeight: '600' },

  centerBox: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 48 },
  loadText: { fontSize: 13, color: C.t2 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  emptyText:  { fontSize: 13, color: C.t2, textAlign: 'center' },
  goCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  goCreateText: { fontSize: 14, fontWeight: '600', color: C.surface },

  createFloatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primaryLight, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: C.primary + '40', marginTop: 6 },
  createFloatText: { fontSize: 13, fontWeight: '600', color: C.primary },
});
export default InventarioDAF;