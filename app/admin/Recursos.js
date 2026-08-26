// app/admin/CrearRecurso.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#E95A0C',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  danger: '#EF4444',
  success: '#10B981',
};

//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem('adminAuthToken');
    } catch (e) {
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync('adminAuthToken');
    } catch (e) {
      return null;
    }
  }
};
const TIPO_LABELS = {
  tecnologico: 'Tecnológico',
  mobiliario: 'Mobiliario',
  vajilla: 'Vajilla',
};

const TIPO_COLORS = {
  tecnologico: '#3B82F6',
  mobiliario: '#8B5CF6',
  vajilla: '#F59E0B',
};

const Recurso = () => {
  const router = useRouter();

  const [nombre_recurso, setNombreRecurso] = useState('');
  const [recurso_tipo, setRecursoTipo] = useState('tecnologico');
  const [descripcion, setDescripcion] = useState('');
  const [habilitado, setHabilitado] = useState('1');
  const [cantidad, setCantidad] = useState('1');
  const [loading, setLoading] = useState(false);

  const [recursos, setRecursos] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [recursoEditando, setRecursoEditando] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTipo, setEditTipo] = useState('tecnologico');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editHabilitado, setEditHabilitado] = useState('1');
  const [editCantidad, setEditCantidad] = useState('1');
  const [editLoading, setEditLoading] = useState(false);

 const cargarRecursos = useCallback(async () => {
  setListLoading(true);
  try {
    const token = await getTokenAsync();
    if (!token) {
      console.warn('⚠️ No se encontró token');
      setRecursos([]);
      return;
    }
    
    const response = await axios.get(`${API_BASE_URL}/recursos`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    let raw = response.data;
    if (!Array.isArray(raw)) {
      raw = raw.data || raw.recursos || raw.items || [];
    }
    setRecursos(raw);
  } catch (error) {
    console.error('❌ Error cargando recursos:', error);
    if (error.response?.status === 404) {
      console.warn('⚠️ El endpoint /recursos no existe. Verifica la URL del backend.');
    } else if (error.response?.status === 401) {
      console.warn('⚠️ Token inválido o expirado');
      // Opcionalmente redirigir al login
    }
    setRecursos([]);
  } finally {
    setListLoading(false);
  }
}, []);

  useFocusEffect(cargarRecursos);

  // ── Crear recurso ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!nombre_recurso.trim()) {
      Alert.alert('Error', 'El nombre del recurso es obligatorio.');
      return;
    }
    const cantidadNum = parseInt(cantidad);
  if (isNaN(cantidadNum) || cantidadNum < 1) {
    Alert.alert('Error', 'La cantidad debe ser un número mayor a 0.');
    return;
  }
    setLoading(true);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Error', 'Sesión expirada.');
        router.replace('/');
        return;
      }
      await axios.post(
        `${API_BASE_URL}/recursos`,
        {
          nombre_recurso: nombre_recurso.trim(),
          recurso_tipo,
          descripcion: descripcion.trim() || null,
          habilitado: parseInt(habilitado),
          cantidad: cantidadNum,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Limpiar formulario y recargar lista
      setNombreRecurso('');
      setRecursoTipo('tecnologico');
      setDescripcion('');
      setHabilitado('1');
      setCantidad('1');
      await cargarRecursos();
      Alert.alert('✅ Éxito', 'Recurso creado correctamente.');
    } catch (error) {
      const message = error.response?.data?.message || 'No se pudo crear el recurso.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // ── Abrir modal de edición ──────────────────────────────────────────────
  const abrirEdicion = (recurso) => {
    setRecursoEditando(recurso);
    setEditNombre(recurso.nombre_recurso || '');
    setEditTipo(recurso.recurso_tipo || 'tecnologico');
    setEditDescripcion(recurso.descripcion || '');
    setEditHabilitado(String(recurso.habilitado ?? '1'));
    setEditCantidad(String(recurso.cantidad ?? '1'));
    setEditModalVisible(true);
  };

  const guardarEdicion = async () => {
    if (!editNombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }
    const cantidadNum = parseInt(editCantidad);
  if (isNaN(cantidadNum) || cantidadNum < 1) {
    Alert.alert('Error', 'La cantidad debe ser un número mayor a 0.');
    return;
  }
    setEditLoading(true);
    try {
      const token = await getTokenAsync();
      await axios.put(
        `${API_BASE_URL}/recursos/${recursoEditando.idrecurso}`,
        {
          nombre_recurso: editNombre.trim(),
          recurso_tipo: editTipo,
          descripcion: editDescripcion.trim() || null,
          habilitado: parseInt(editHabilitado),
          cantidad: cantidadNum,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditModalVisible(false);
      await cargarRecursos();
      Alert.alert('✅ Éxito', 'Recurso actualizado correctamente.');
    } catch (error) {
      const message = error.response?.data?.message || 'No se pudo actualizar el recurso.';
      Alert.alert('Error', message);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Deshabilitar recurso (soft delete) ─────────────────────────────────
  const eliminarRecurso = (recurso) => {
    Alert.alert(
      'Deshabilitar recurso',
      `¿Deseas deshabilitar "${recurso.nombre_recurso}"? Puedes volver a habilitarlo editándolo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deshabilitar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getTokenAsync();
              await axios.delete(`${API_BASE_URL}/recursos/${recurso.idrecurso}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              await cargarRecursos();
              Alert.alert('✅ Listo', 'Recurso deshabilitado correctamente.');
            } catch (error) {
              const message = error.response?.data?.message || 'No se pudo deshabilitar el recurso.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  // ── Render tarjeta de recurso ───────────────────────────────────────────
  const renderRecursoCard = (recurso) => (
    <View style={styles.recursoCard}>
      <View style={styles.recursoCardLeft}>
        <View style={[styles.tipoBadge, { backgroundColor: TIPO_COLORS[recurso.recurso_tipo] + '20' }]}>
          <Text style={[styles.tipoBadgeText, { color: TIPO_COLORS[recurso.recurso_tipo] }]}>
            {TIPO_LABELS[recurso.recurso_tipo] || recurso.recurso_tipo}
          </Text>
        </View>
        <Text style={styles.recursoNombre}>{recurso.nombre_recurso}</Text>
         <View style={styles.cantidadRow}>
        <Ionicons name="cube-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.cantidadText}>Cantidad: {recurso.cantidad || 0}</Text>
      </View>
        {recurso.descripcion ? (
          <Text style={styles.recursoDescripcion} numberOfLines={2}>{recurso.descripcion}</Text>
        ) : null}
        <View style={[styles.estadoBadge, { backgroundColor: recurso.habilitado == 1 ? '#D1FAE5' : '#FEE2E2' }]}>
          <Text style={{ fontSize: 12, color: recurso.habilitado == 1 ? '#065F46' : '#991B1B', fontWeight: '600' }}>
            {recurso.habilitado == 1 ? '● Habilitado' : '● Deshabilitado'}
          </Text>
        </View>
      </View>
      <View style={styles.recursoCardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => abrirEdicion(recurso)}>
          <Ionicons name="pencil" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      
      </View>
    </View>
  );



  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* ── Formulario Crear ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registrar Nuevo Recurso</Text>

        <Text style={styles.label}>Nombre del recurso *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Proyector Epson"
          value={nombre_recurso}
          onChangeText={setNombreRecurso}
          maxLength={100}
        />

        <Text style={styles.label}>Tipo de recurso *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={recurso_tipo}
            style={styles.picker}
            onValueChange={setRecursoTipo}
            dropdownIconColor={COLORS.textSecondary}
          >
            <Picker.Item label="Tecnológico" value="tecnologico" />
            <Picker.Item label="Mobiliario" value="mobiliario" />
            <Picker.Item label="Vajilla" value="vajilla" />
          </Picker>
        </View>
        <Text style={styles.label}>Cantidad *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 10"
          value={cantidad}
          onChangeText={setCantidad}
          keyboardType="numeric"
          maxLength={5}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.buttonText}>Crear Recurso</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Lista de Recursos ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}> Recursos Registrados</Text>
          <TouchableOpacity onPress={cargarRecursos} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {listLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : recursos.length === 0 ? (
          <Text style={styles.emptyText}>No hay recursos registrados aún.</Text>
        ) : (
          recursos.map((recurso) => (
            <View key={String(recurso.idrecurso)}>
              {renderRecursoCard(recurso)}
            </View>
          ))
        )}
      </View>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Recurso</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={editNombre}
                onChangeText={setEditNombre}
                placeholder="Nombre del recurso"
                maxLength={100}
              />

              <Text style={styles.label}>Tipo *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editTipo}
                  style={styles.picker}
                  onValueChange={setEditTipo}
                  dropdownIconColor={COLORS.textSecondary}
                >
                  <Picker.Item label="Tecnológico" value="tecnologico" />
                  <Picker.Item label="Mobiliario" value="mobiliario" />
                  <Picker.Item label="Vajilla" value="vajilla" />
                </Picker>
              </View>

              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editDescripcion}
                onChangeText={setEditDescripcion}
                placeholder="Detalles del recurso..."
                multiline
                numberOfLines={4}
              />
              <Text style={styles.label}>Cantidad *</Text>
                <TextInput
                  style={styles.input}
                  value={editCantidad}
                  onChangeText={setEditCantidad}
                  placeholder="Cantidad disponible"
                  keyboardType="numeric"
                  maxLength={5}
                />
              <Text style={styles.label}>Estado</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.radio, editHabilitado === '1' && styles.radioSelected]}
                  onPress={() => setEditHabilitado('1')}
                >
                  <Text style={editHabilitado === '1' ? styles.radioTextSelected : styles.radioText}>Habilitado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radio, editHabilitado === '0' && styles.radioSelected]}
                  onPress={() => setEditHabilitado('0')}
                >
                  <Text style={editHabilitado === '0' ? styles.radioTextSelected : styles.radioText}>Deshabilitado</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, editLoading && styles.buttonDisabled]}
                onPress={guardarEdicion}
                disabled={editLoading}
              >
                {editLoading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.buttonText}>Guardar Cambios</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  cantidadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  cantidadText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#FFF5ED',
  },
  label: {
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#FFF',
    color: COLORS.textPrimary,
  },
  textArea: {
    textAlignVertical: 'top',
    height: 100,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  radio: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  radioSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5ED',
  },
  radioText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  radioTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  button: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  // ── Tarjeta de recurso ────────────────────────────────────────────────
  recursoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recursoCardLeft: {
    flex: 1,
    marginRight: 10,
  },
  tipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 6,
  },
  tipoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recursoNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  recursoDescripcion: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  estadoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recursoCardActions: {
    flexDirection: 'column',
    gap: 8,
  },
  editBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5ED',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  // ── Modal ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
});
export default Recurso;