import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, TextInput, Modal,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend1-production.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';
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

// Mismo mapeo de colores que tu CrearRecurso.js
const TIPO_COLORS = {
  tecnologico: { color: '#3B82F6', bg: '#DBEAFE', label: 'Tecnológico' },
  mobiliario:  { color: '#8B5CF6', bg: '#EDE9FE', label: 'Mobiliario'  },
  vajilla:     { color: '#F59E0B', bg: '#FEF3C7', label: 'Vajilla'     },
};
const tipoStyle = (tipo) =>
  TIPO_COLORS[tipo] || { color: C.t3, bg: C.bg, label: tipo || 'Otro' };

const stateColor = (s) => ({
  pendiente: { color: C.warning, bg: C.warningLight },
  aprobado:  { color: C.success, bg: C.successLight },
  rechazado: { color: C.danger,  bg: C.dangerLight  },
})[s?.toLowerCase()] || { color: C.t3, bg: C.bg };

const FILTROS = ['Todos', 'Pendiente', 'Aprobado', 'Rechazado'];

// ─── Chip filtro ──────────────────────────────────────────────────────────────
const Chip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[s.chip, active && { backgroundColor: C.primary, borderColor: C.primary }]}
    onPress={onPress}
  >
    <Text style={[s.chipText, active && { color: C.surface }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Fila de recurso en el modal ──────────────────────────────────────────────
// Usa exactamente: idrecurso, nombre_recurso, recurso_tipo de tu BD
const RecursoRow = ({ recurso, onChangeAprobado, editable }) => {
  const ts = tipoStyle(recurso.recurso_tipo);
  const [val, setVal] = useState(
    recurso.cantidadAprobada != null
      ? recurso.cantidadAprobada.toString()
      : recurso.cantidadSolicitada.toString()
  );

  const handleChange = (text) => {
    if (text === '') {
      setVal('');
      onChangeAprobado(recurso.idrecurso, 0);
      return;
    }
    const n = parseInt(text, 10);
    if (!isNaN(n) && n >= 0 && n <= recurso.cantidadSolicitada) {
      setVal(text);
      onChangeAprobado(recurso.idrecurso, n);
    }
  };

  return (
    <View style={s.recursoRow}>
      <View style={s.recursoLeft}>
        {/* Badge tipo — mismo estilo que tu app */}
        <View style={[s.tipoBadge, { backgroundColor: ts.bg }]}>
          <Text style={[s.tipoBadgeText, { color: ts.color }]}>{ts.label}</Text>
        </View>
        <Text style={s.recursoNombre}>{recurso.nombre_recurso}</Text>
        <Text style={s.recursoSolicitado}>Solicitado: {recurso.cantidadSolicitada}</Text>
      </View>

      <View style={s.recursoRight}>
        <Text style={s.inputLabel}>Aprobar</Text>
        {editable ? (
          <TextInput
            style={s.cantInput}
            keyboardType="numeric"
            value={val}
            onChangeText={handleChange}
            maxLength={4}
          />
        ) : (
          <View style={[s.cantStatic, {
            backgroundColor: recurso.cantidadAprobada != null ? C.successLight : C.bg,
          }]}>
            <Text style={[s.cantStaticText, {
              color: recurso.cantidadAprobada != null ? C.success : C.t3,
            }]}>
              {recurso.cantidadAprobada ?? '–'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Modal detalle / aprobación ───────────────────────────────────────────────
const DetalleSolicitudModal = ({ visible, solicitud, onClose, onSubmit, submitting }) => {
  const [recursos, setRecursos]           = useState([]);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (solicitud) {
      setRecursos(
        solicitud.recursos.map(r => ({
          ...r,
          cantidadAprobada: r.cantidadAprobada ?? r.cantidadSolicitada,
        }))
      );
      setObservaciones('');
    }
  }, [solicitud]);

  const handleChangeAprobado = (idrecurso, val) =>
    setRecursos(prev => prev.map(r =>
      r.idrecurso === idrecurso ? { ...r, cantidadAprobada: val } : r
    ));

  const handleAprobar = () =>
    onSubmit({
      solicitudId: solicitud.id,
      accion: 'aprobar',
      recursos: recursos.map(r => ({ idrecurso: r.idrecurso, cantidadAprobada: r.cantidadAprobada })),
      observaciones,
    });

  const handleRechazar = () => {
    if (!observaciones.trim()) {
      Alert.alert('Motivo requerido', 'Escribe el motivo del rechazo en Observaciones.');
      return;
    }
    Alert.alert('Confirmar rechazo', '¿Seguro que deseas rechazar esta solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive',
        onPress: () => onSubmit({
          solicitudId: solicitud.id,
          accion: 'rechazar',
          recursos: recursos.map(r => ({ idrecurso: r.idrecurso, cantidadAprobada: 0 })),
          observaciones,
        }),
      },
    ]);
  };

  if (!solicitud) return null;
  const sc          = stateColor(solicitud.estado);
  const isPendiente = solicitud.estado.toLowerCase() === 'pendiente';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalWrap}>

          {/* Header modal */}
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={C.t2} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Solicitud #{solicitud.id}</Text>
            <View style={[s.badge, { backgroundColor: sc.bg }]}>
              <Text style={[s.badgeText, { color: sc.color }]}>{solicitud.estado}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>

            {/* Info evento */}
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>{solicitud.nombreEvento}</Text>
              <Text style={s.infoSolicitante}>{solicitud.solicitante}</Text>
              <View style={s.infoMeta}>
                <View style={s.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color={C.t3} />
                  <Text style={s.metaText}>{solicitud.fechaEvento}</Text>
                </View>
                <View style={s.metaDivider} />
                <View style={s.metaItem}>
                  <Ionicons name="time-outline" size={13} color={C.t3} />
                  <Text style={s.metaText}>{solicitud.horaEvento}</Text>
                </View>
                {solicitud.lugar ? (
                  <>
                    <View style={s.metaDivider} />
                    <View style={s.metaItem}>
                      <Ionicons name="location-outline" size={13} color={C.t3} />
                      <Text style={s.metaText}>{solicitud.lugar}</Text>
                    </View>
                  </>
                ) : null}
              </View>
              {solicitud.descripcion ? (
                <Text style={s.infoDesc}>{solicitud.descripcion}</Text>
              ) : null}
            </View>

            {/* Tabla de recursos */}
            <View style={s.recursoCard}>
              <Text style={s.secLabel}>Recursos solicitados</Text>
              {isPendiente && (
                <Text style={s.secSub}>
                  Modifica las cantidades a aprobar (máx. = cantidad solicitada)
                </Text>
              )}
              {recursos.length === 0 ? (
                <Text style={s.secEmpty}>Sin recursos en esta solicitud</Text>
              ) : (
                recursos.map(r => (
                  <RecursoRow
                    key={r.idrecurso}
                    recurso={r}
                    onChangeAprobado={handleChangeAprobado}
                    editable={isPendiente}
                  />
                ))
              )}
            </View>

            {/* Observaciones */}
            <View style={s.recursoCard}>
              <Text style={s.secLabel}>
                {isPendiente ? 'Observaciones' : 'Observaciones DAF'}
              </Text>
              {isPendiente ? (
                <TextInput
                  style={s.obsInput}
                  multiline
                  numberOfLines={3}
                  placeholder="Notas o motivo de rechazo…"
                  placeholderTextColor={C.t3}
                  value={observaciones}
                  onChangeText={setObservaciones}
                />
              ) : (
                <Text style={s.obsStatic}>
                  {solicitud.observaciones || 'Sin observaciones'}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Botones acción — solo si está pendiente */}
          {isPendiente && (
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.actionBtn, s.btnReject]}
                onPress={handleRechazar}
                disabled={submitting}
              >
                <Ionicons name="close-circle-outline" size={18} color={C.danger} />
                <Text style={[s.actionBtnText, { color: C.danger }]}>Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.btnApprove]}
                onPress={handleAprobar}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color={C.surface} />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={18} color={C.surface} />
                      <Text style={[s.actionBtnText, { color: C.surface }]}>Aprobar</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Solicitudes() {
  const router = useRouter();
  const [loading, setLoading]           = useState(true);
  const [solicitudes, setSolicitudes]   = useState([]);
  const [filtro, setFiltro]             = useState('Todos');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE_URL}/daf/solicitudes`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const data = Array.isArray(res.data) ? res.data : [];

      setSolicitudes(data.map(e => ({
        id:            e.idevento,
        nombreEvento:  e.nombreevento || 'Sin título',
        solicitante:   e.academicoCreador
          ? `${e.academicoCreador.nombre || ''} ${e.academicoCreador.apellidopat || ''}`.trim()
          : 'Desconocido',
        fechaEvento:   e.fechaevento
          ? new Date(e.fechaevento).toLocaleDateString('es-ES', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })
          : 'N/A',
        horaEvento:    e.horaevento ? e.horaevento.substring(0, 5) : 'N/A',
        estado:        e.estadoDAF  || 'Pendiente',
        lugar:         e.lugar      || '',
        descripcion:   e.descripcion || '',
        observaciones: e.observacionesDAF || '',

        // Recursos: el backend devuelve el array con los campos de tu tabla /recursos
        // idrecurso, nombre_recurso, recurso_tipo + cantidadSolicitada, cantidadAprobada del evento
        recursos: (e.recursosEvento || e.recursos || []).map(r => ({
          idrecurso:          r.idrecurso,
          nombre_recurso:     r.nombre_recurso     || r.nombre    || 'Recurso',
          recurso_tipo:       r.recurso_tipo        || r.tipo      || 'otro',
          cantidadSolicitada: r.cantidadSolicitada  || r.cantidad  || 0,
          cantidadAprobada:   r.cantidadAprobada    ?? null,
        })),
      })));
    } catch (err) {
      console.error('fetchSolicitudes:', err);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  // Aprobar o rechazar
  // Body que envía al backend: { recursos: [{ idrecurso, cantidadAprobada }], observaciones }
  const handleSubmit = async ({ solicitudId, accion, recursos, observaciones }) => {
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.put(
        `${API_BASE_URL}/daf/solicitudes/${solicitudId}/${accion}`,
        { recursos, observaciones },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      Alert.alert(
        accion === 'aprobar' ? '✅ Aprobada' : '❌ Rechazada',
        accion === 'aprobar'
          ? 'Recursos asignados correctamente al evento.'
          : 'El solicitante será notificado del rechazo.'
      );
      setModalVisible(false);
      fetchSolicitudes();
    } catch (err) {
      console.error('handleSubmit:', err);
      Alert.alert('Error', `No se pudo ${accion === 'aprobar' ? 'aprobar' : 'rechazar'} la solicitud.`);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = solicitudes.filter(sol => {
    const matchF = filtro === 'Todos' || sol.estado.toLowerCase() === filtro.toLowerCase();
    const matchS = !search
      || sol.nombreEvento.toLowerCase().includes(search.toLowerCase())
      || sol.solicitante.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const pendientesCount = solicitudes.filter(s => s.estado.toLowerCase() === 'pendiente').length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.t1} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.hTitle}>Solicitudes de recursos</Text>
          <Text style={s.hSub}>{solicitudes.length} total · {pendientesCount} pendientes</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchSolicitudes}>
          <Ionicons name="refresh-outline" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={17} color={C.t3} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar evento o solicitante…"
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
        {FILTROS.map(f => <Chip key={f} label={f} active={filtro === f} onPress={() => setFiltro(f)} />)}
      </ScrollView>

      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator color={C.primary} />
          <Text style={s.loadText}>Cargando solicitudes…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centerBox}>
          <Ionicons name="clipboard-outline" size={42} color={C.t3} />
          <Text style={s.emptyTitle}>Sin solicitudes</Text>
          <Text style={s.emptyText}>No hay resultados para el filtro seleccionado.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {filtered.map(item => {
            const sc = stateColor(item.estado);
            return (
              <TouchableOpacity
                key={item.id}
                style={[s.card, { borderLeftColor: sc.color }]}
                onPress={() => { setSelected(item); setModalVisible(true); }}
                activeOpacity={0.85}
              >
                <View style={s.cardTop}>
                  <Text style={s.cardTitle} numberOfLines={1}>{item.nombreEvento}</Text>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeText, { color: sc.color }]}>{item.estado}</Text>
                  </View>
                </View>

                <Text style={s.cardSub}>{item.solicitante}</Text>

                <View style={s.cardMeta}>
                  <View style={s.metaItem}>
                    <Ionicons name="calendar-outline" size={11} color={C.t3} />
                    <Text style={s.metaText}>{item.fechaEvento}</Text>
                  </View>
                  <View style={s.metaDivider} />
                  <View style={s.metaItem}>
                    <Ionicons name="time-outline" size={11} color={C.t3} />
                    <Text style={s.metaText}>{item.horaEvento}</Text>
                  </View>
                  <View style={s.metaDivider} />
                  <View style={s.metaItem}>
                    <Ionicons name="cube-outline" size={11} color={C.t3} />
                    <Text style={s.metaText}>{item.recursos.length} recursos</Text>
                  </View>
                </View>

                {/* Tipos de recursos solicitados — mismo badge que tu CrearRecurso */}
                {item.recursos.length > 0 && (
                  <View style={s.tiposRow}>
                    {[...new Set(item.recursos.map(r => r.recurso_tipo))].map(tipo => {
                      const ts = tipoStyle(tipo);
                      return (
                        <View key={tipo} style={[s.tipoBadge, { backgroundColor: ts.bg }]}>
                          <Text style={[s.tipoBadgeText, { color: ts.color }]}>{ts.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {item.estado.toLowerCase() === 'pendiente' && (
                  <View style={s.hintRow}>
                    <Ionicons name="hand-left-outline" size={12} color={C.primary} />
                    <Text style={s.hintText}>Toca para revisar y aprobar</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <DetalleSolicitudModal
        visible={modalVisible}
        solicitud={selected}
        onClose={() => { setModalVisible(false); setSelected(null); }}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </View>
  );
}

const s = StyleSheet.create({
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
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, marginHorizontal: 16, marginTop: 14, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: C.t1, padding: 0 },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.surface },
  chipText: { fontSize: 13, color: C.t2, fontWeight: '500' },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: C.border, borderLeftWidth: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.t1, flex: 1 },
  cardSub:   { fontSize: 12, color: C.t2, marginBottom: 8 },
  cardMeta:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  metaItem:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:  { fontSize: 11, color: C.t2 },
  metaDivider: { width: 1, height: 10, backgroundColor: C.border },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  tiposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  tipoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tipoBadgeText: { fontSize: 11, fontWeight: '600' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  hintText: { fontSize: 11, color: C.primary, fontWeight: '500' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  loadText: { fontSize: 13, color: C.t2 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  emptyText:  { fontSize: 13, color: C.t2, textAlign: 'center' },

  // Modal
  modalWrap: { flex: 1, backgroundColor: C.bg },
  modalHeader: { backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 16 : (StatusBar.currentHeight || 0) + 12, paddingBottom: 14, borderBottomWidth: 0.5, borderColor: C.border },
  closeBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: C.border },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.t1 },
  infoCard: { backgroundColor: C.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: C.border },
  infoTitle: { fontSize: 18, fontWeight: '800', color: C.t1, marginBottom: 4 },
  infoSolicitante: { fontSize: 13, color: C.t2, marginBottom: 10 },
  infoMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  infoDesc: { fontSize: 13, color: C.t2, marginTop: 10, lineHeight: 18 },
  recursoCard: { backgroundColor: C.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: C.border },
  secLabel: { fontSize: 11, fontWeight: '700', color: C.t1, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  secSub:   { fontSize: 12, color: C.t3, marginBottom: 14 },
  secEmpty: { fontSize: 13, color: C.t3, paddingVertical: 8 },
  recursoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderColor: C.border },
  recursoLeft: { flex: 1, paddingRight: 12 },
  recursoNombre: { fontSize: 14, fontWeight: '600', color: C.t1, marginTop: 4 },
  recursoSolicitado: { fontSize: 12, color: C.t3, marginTop: 2 },
  recursoRight: { alignItems: 'center', gap: 4 },
  inputLabel: { fontSize: 10, color: C.t3, fontWeight: '600', textTransform: 'uppercase' },
  cantInput: { width: 60, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 4, textAlign: 'center', fontSize: 18, fontWeight: '700', color: C.t1, backgroundColor: C.bg },
  cantStatic: { width: 60, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cantStaticText: { fontSize: 18, fontWeight: '700' },
  obsInput: { borderWidth: 0.5, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.t1, minHeight: 80, textAlignVertical: 'top', backgroundColor: C.bg, marginTop: 8 },
  obsStatic: { fontSize: 14, color: C.t2, marginTop: 8, lineHeight: 20 },
  modalActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, backgroundColor: C.surface, borderTopWidth: 0.5, borderColor: C.border, paddingBottom: Platform.OS === 'ios' ? 28 : 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  btnReject:  { backgroundColor: C.dangerLight, borderColor: C.danger },
  btnApprove: { backgroundColor: C.primary,     borderColor: C.primary },
});