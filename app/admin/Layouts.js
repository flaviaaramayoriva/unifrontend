// app/admin/layouts.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
// Misma paleta que InventarioDAF.js para mantener consistencia visual
const C = {
  primary: '#C44200', primaryLight: '#FFF0E6',
  success: '#047857', successLight: '#D1FAE5',
  danger: '#EF4444',  dangerLight: '#FEE2E2',
  info: '#3B82F6',    infoLight: '#DBEAFE',
  bg: '#D1D5DB', surface: '#FFFFFF',
  t1: '#111827', t2: '#64748B', t3: '#94A3B8', border: '#E6E9EF',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem('adminAuthToken'); } catch (e) { return null; }
  }
  try { return await SecureStore.getItemAsync('adminAuthToken'); } catch (e) { return null; }
};

const SUGERENCIAS_IA = [
  { label: 'Aula', sub: 'filas de pupitres', prompt: 'distribución de aula para 50 personas en un salón de conferencias' },
  { label: 'Patio', sub: 'bancas alrededor', prompt: 'layout de patio exterior para 50 personas, evento al aire libre' },
  { label: 'Circular', sub: 'banquete', prompt: 'mesas circulares para 50 personas ' },
  { label: 'Auditorio', sub: 'escenario al frente', prompt: 'layout de auditorio con escenario al frente y filas de asientos para 50 personas' },
  { label: 'Feria', sub: 'stands de exposición', prompt: 'layout de feria con stands de exposición distribuidos para 50 personas' },
  { label: 'Comedor', sub: 'mesas rectangulares', prompt: 'layout de comedor con mesas rectangulares para 50 personas tipo banquete' },
];

const uriToBlob = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

const LayoutsScreen = () => {
  const router = useRouter();
  const [nombreLayout, setNombreLayout] = useState('');
  const [imagenUri, setImagenUri] = useState(null);
  const [promptIA, setPromptIA] = useState('');
  const [generandoIA, setGenerandoIA] = useState(false);
  const [recursosDisponibles, setRecursosDisponibles] = useState([]);
  const [recursosSeleccionados, setRecursosSeleccionados] = useState([]);
  const [cargandoRecursos, setCargandoRecursos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [layouts, setLayouts] = useState([]);
  const [loadingLayouts, setLoadingLayouts] = useState(true);
  const [layoutSeleccionado, setLayoutSeleccionado] = useState(null);
  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitas permitir el acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImagenUri(result.assets[0].uri);
    }
  };
  const cargarLayouts = async () => {
  setLoadingLayouts(true);
  try {
    const token = await getTokenAsync();
    const response = await axios.get(`${API_BASE_URL}/layouts`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    setLayouts(response.data);
  } catch (error) {
    console.error('Error al cargar layouts:', error);
  } finally {
    setLoadingLayouts(false);
  }
};
const eliminarLayout = async (layout) => {
  const confirmar = Platform.OS === 'web'
    ? window.confirm(`¿Eliminar "${layout.nombre}"? Esta acción no se puede deshacer.`)
    : await new Promise((resolve) => {
        Alert.alert(
          'Eliminar layout',
          `¿Eliminar "${layout.nombre}"? Esta acción no se puede deshacer.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });

  if (!confirmar) return;

  try {
    const token = await getTokenAsync();
    await axios.delete(`${API_BASE_URL}/layouts/${layout.idlayout}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    setLayoutSeleccionado(null);
    cargarLayouts();
  } catch (error) {
    console.error('Error al eliminar layout:', error);
    const msg = Platform.OS === 'web' ? window.alert('No se pudo eliminar el layout.') : Alert.alert('Error', 'No se pudo eliminar el layout.');
  }
  };
const subirLayout = async () => {
    if (!nombreLayout.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el layout.');
      return;
    }
    if (!imagenUri) {
      Alert.alert('Error', 'Por favor selecciona una imagen o genera con IA.');
      return;
    }

    setLoading(true);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Error', 'No estás autenticado.');
        return;
      }

      const formData = new FormData();
      formData.append('nombre', nombreLayout);
      if (Platform.OS === 'web') {
        const blob = await uriToBlob(imagenUri);
        formData.append('imagen', blob, `layout_${Date.now()}.jpg`);
      } else {
        formData.append('imagen', {
          uri: imagenUri,
          type: 'image/jpeg',
          name: `layout_${Date.now()}.jpg`,
        });
      }

      await axios.post(`${API_BASE_URL}/layouts`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Éxito', 'Layout subido correctamente.');
      setNombreLayout('');
      setImagenUri(null);
      cargarLayouts();

    } catch (error) {
      console.error('Error al subir layout:', error);
      Alert.alert('Error', 'No se pudo subir el layout. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  };

  const generarConIA = async () => {
    if (!promptIA.trim()) {
      Alert.alert('Error', 'Por favor ingresa un prompt para la IA.');
      return;
    }
    setGenerandoIA(true);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Error', 'No estás autenticado.');
        return;
      }

      await axios.post(`${API_BASE_URL}/layouts/ia`, { prompt: promptIA, recursos: recursosParaIA() }, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      Alert.alert('Éxito', 'Layout generado con IA. Ahora puedes usarlo directamente.');
      setPromptIA('');
      setGenerandoIA(false);
      cargarLayouts();

    } catch (error) {
      console.error('Error al generar layout con IA:', error);
      Alert.alert('Error', 'No se pudo generar el layout con IA.');
    } finally {
      setGenerandoIA(false);
    }
  };

  const cargarRecursosDisponibles = async () => {
    setCargandoRecursos(true);
    try {
      const token = await getTokenAsync();
      if (!token) return;
      const response = await axios.get(`${API_BASE_URL}/recursos`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.recursos || []);
      const activos = raw.filter(r => r && (r.habilitado === 1 || r.habilitado === true || r.habilitado === '1'));
      setRecursosDisponibles(activos);
    } catch (error) {
      console.error('Error al cargar recursos:', error);
      setRecursosDisponibles([]);
    } finally {
      setCargandoRecursos(false);
    }
  };

  const toggleRecursoSeleccionado = (recurso) => {
    setRecursosSeleccionados(prev => {
      const existe = prev.find(r => r.idrecurso === recurso.idrecurso);
      if (existe) return prev.filter(r => r.idrecurso !== recurso.idrecurso);
      return [...prev, { ...recurso, cantidadIA: 1 }];
    });
  };

  const cambiarCantidadRecursoIA = (idrecurso, delta) => {
    setRecursosSeleccionados(prev => prev.map(r => {
      if (r.idrecurso !== idrecurso) return r;
      const disponible = parseInt(r.cantidad) || 1;
      const nueva = Math.min(Math.max(1, (r.cantidadIA || 1) + delta), disponible);
      return { ...r, cantidadIA: nueva };
    }));
  };

  const recursosParaIA = () => recursosSeleccionados.map(r => ({
    nombre_recurso: r.nombre_recurso,
    recurso_tipo: r.recurso_tipo,
    cantidad: r.cantidadIA || 1,
  }));

  const puedeSubir = nombreLayout.trim().length > 0 && !!imagenUri && !loading;

  useEffect(() => {
  cargarLayouts();
  cargarRecursosDisponibles();
}, []);

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.t1} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.hTitle}>Layouts</Text>
          <Text style={st.hSub}>Planos y distribuciones de tu evento</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        <View style={st.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={C.info} />
          <Text style={st.infoBannerText}>
            El layout se usará como referencia visual para ubicar mesas y recursos en el evento.
          </Text>
        </View>

        {/* Generar con IA */}
        <View style={st.card}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="sparkles-outline" size={17} color={C.primary} />
            </View>
            <View style={st.sectionHeadText}>
              <Text style={st.sectionTitle}>Generar con IA</Text>
              <Text style={st.sectionSub}>Crea el plano automáticamente en segundos</Text>
            </View>
          </View>

          <Text style={st.label}>Describe el layout</Text>
          <View style={st.inputWrap}>
            <Ionicons name="chatbox-ellipses-outline" size={17} color={C.t3} />
            <TextInput
              style={st.input}
              placeholder="Ej: distribución de aula para 50 personas"
              placeholderTextColor={C.t3}
              accessibilityLabel="Descripción del layout"
              value={promptIA}
              onChangeText={setPromptIA}
            />
          </View>

          <View style={st.sugWrap}>
            <Text style={st.sugTitle}>Estilos disponibles</Text>
            <View style={st.sugRow}>
              {SUGERENCIAS_IA.map((s) => (
                <TouchableOpacity
                  key={s.label}
                  style={st.sugChip}
                  onPress={() => setPromptIA(s.prompt)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={st.sugChipLabel}>{s.label}</Text>
                  <Text style={st.sugChipSub} numberOfLines={1}>{s.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={st.sugWrap}>
            <Text style={st.sugTitle}>Recursos disponibles</Text>
            {cargandoRecursos ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : recursosDisponibles.length === 0 ? (
              <Text style={st.emptyRecursos}>No hay recursos activos en el inventario.</Text>
            ) : (
              <View style={st.sugRow}>
                {recursosDisponibles.map((recurso) => {
                  const seleccionado = recursosSeleccionados.find(r => r.idrecurso === recurso.idrecurso);
                  const icRecurso = recurso.recurso_tipo === 'tecnologico' ? 'hardware-chip-outline'
                    : recurso.recurso_tipo === 'vajilla' ? 'restaurant-outline'
                    : 'grid-outline';
                  return (
                    <View key={recurso.idrecurso} style={st.recursoWrap}>
                      <TouchableOpacity
                        style={[st.recursoChip, seleccionado && st.recursoChipSel]}
                        onPress={() => toggleRecursoSeleccionado(recurso)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={icRecurso} size={14} color={seleccionado ? C.primary : C.t3} />
                        <Text style={[st.recursoChipLabel, seleccionado && st.recursoChipLabelSel]} numberOfLines={1}>
                          {recurso.nombre_recurso}
                        </Text>
                        <Text style={st.recursoChipSub}>disp. {recurso.cantidad}</Text>
                      </TouchableOpacity>
                      {seleccionado && (
                        <View style={st.recursoQtyRow}>
                          <TouchableOpacity
                            style={st.recursoQtyBtn}
                            onPress={() => cambiarCantidadRecursoIA(recurso.idrecurso, -1)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="remove" size={14} color={C.primary} />
                          </TouchableOpacity>
                          <Text style={st.recursoQtyText}>{seleccionado.cantidadIA}</Text>
                          <TouchableOpacity
                            style={st.recursoQtyBtn}
                            onPress={() => cambiarCantidadRecursoIA(recurso.idrecurso, 1)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add" size={14} color={C.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {generandoIA ? (
            <View style={st.genLoading}>
              <ActivityIndicator color={C.primary} size="small" />
              <Text style={st.genLoadingText}>Generando layout…</Text>
            </View>
          ) : (
            <TouchableOpacity style={st.primaryBtn} onPress={generarConIA} activeOpacity={0.85}>
              <Ionicons name="sparkles-outline" size={18} color={C.surface} />
              <Text style={st.primaryBtnText}>Generar layout con IA</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Subir imagen */}
        <View style={st.card}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: C.successLight }]}>
              <Ionicons name="cloud-upload-outline" size={17} color={C.success} />
            </View>
            <View style={st.sectionHeadText}>
              <Text style={st.sectionTitle}>Subir imagen</Text>
              <Text style={st.sectionSub}>Sube un plano o foto del salón ya existente</Text>
            </View>
          </View>

          <Text style={st.label}>Nombre del layout</Text>
          <View style={st.inputWrap}>
            <Ionicons name="pricetag-outline" size={17} color={C.t3} />
            <TextInput
              style={st.input}
              placeholder="Ej: Layout Salón Principal"
              placeholderTextColor={C.t3}
              accessibilityLabel="Nombre del layout"
              value={nombreLayout}
              onChangeText={setNombreLayout}
            />
          </View>

          {imagenUri ? (
            <View style={st.previewCard}>
              <Image source={{ uri: imagenUri }} style={st.previewImage} resizeMode="contain" />
              <View style={st.previewFooter}>
                <View style={st.previewBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={C.success} />
                  <Text style={st.previewBadgeText}>Imagen seleccionada</Text>
                </View>
                <TouchableOpacity style={st.changeBtn} onPress={seleccionarImagen} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="swap-horizontal-outline" size={15} color={C.success} />
                  <Text style={[st.changeBtnText, { color: C.success }]}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={st.dropZone} onPress={seleccionarImagen} activeOpacity={0.7}>
              <View style={st.dropIconWrap}>
                <Ionicons name="image-outline" size={26} color={C.success} />
              </View>
              <Text style={st.dropTitle}>Toca para seleccionar una imagen</Text>
              <Text style={st.dropSub}>PNG o JPG · recomendado 4:3</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[st.primaryBtn, !puedeSubir && st.primaryBtnDisabled]}
            onPress={subirLayout}
            disabled={!puedeSubir}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.surface} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={C.surface} />
                <Text style={st.primaryBtnText}>Subir layout</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Layouts guardados */}
        <View style={st.savedHeader}>
          <Text style={st.savedTitle}>Layouts guardados</Text>
          {!loadingLayouts && layouts.length > 0 && (
            <View style={st.countBadge}>
              <Text style={st.countBadgeText}>{layouts.length}</Text>
            </View>
          )}
        </View>

        {loadingLayouts ? (
          <View style={st.emptyCard}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : layouts.length === 0 ? (
          <View style={st.emptyCard}>
            <Ionicons name="images-outline" size={28} color={C.t3} />
            <Text style={st.emptyText}>
              Aún no hay layouts guardados.
            </Text>
          </View>
        ) : (
          <View style={st.galleryGrid}>
            {layouts.map((layout) => (
              <TouchableOpacity
                key={layout.idlayout}
                style={st.galleryCard}
                onPress={() => setLayoutSeleccionado(layout)}
                activeOpacity={0.85}
              >
                {layout.imagenUrl ? (
                  <Image source={{ uri: layout.imagenUrl }} style={st.galleryImage} resizeMode="cover" />
                ) : (
                  <View style={[st.galleryImage, st.galleryImageEmpty]}>
                    <Ionicons name="image-outline" size={24} color={C.t3} />
                  </View>
                )}
                <Text style={st.galleryName} numberOfLines={1}>{layout.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de vista ampliada */}
      <Modal
        visible={!!layoutSeleccionado}
        transparent
        animationType="fade"
        onRequestClose={() => setLayoutSeleccionado(null)}
        accessibilityViewIsModal={true}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <TouchableOpacity
              style={st.modalClose}
              onPress={() => setLayoutSeleccionado(null)}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={C.t1} />
            </TouchableOpacity>

            {layoutSeleccionado && (
              <>
                {layoutSeleccionado.imagenUrl ? (
                  <Image
                    source={{ uri: layoutSeleccionado.imagenUrl }}
                    style={st.modalImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[st.modalImage, st.galleryImageEmpty]}>
                    <Ionicons name="image-outline" size={28} color={C.t3} />
                  </View>
                )}
                <Text style={st.modalTitle}>{layoutSeleccionado.nombre}</Text>

                <TouchableOpacity
                  style={st.deleteBtn}
                  onPress={() => eliminarLayout(layoutSeleccionado)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={18} color={C.surface} />
                  <Text style={st.deleteBtnText}>Eliminar layout</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: (StatusBar.currentHeight || 40) + 12,
    paddingBottom: 14, borderBottomWidth: 0.5, borderColor: C.border, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg,
    justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: C.border,
  },
  hTitle: { fontSize: 18, fontWeight: '800', color: C.t1 },
  hSub:   { fontSize: 12, color: C.t2, marginTop: 1 },

  content: { padding: 16, paddingBottom: 40 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.infoLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 0.5, borderColor: C.info + '40', marginBottom: 16,
  },
  infoBannerText: { fontSize: 13, color: C.info, flex: 1, lineHeight: 18 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 0.5, borderColor: C.border,
    padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIcon: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionHeadText: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.t1 },
  sectionSub: { fontSize: 12, color: C.t2, marginTop: 1, lineHeight: 16 },

  label: { fontSize: 13, fontWeight: '700', color: C.t1, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 14,
  },
  input: { flex: 1, fontSize: 14, color: C.t1, padding: 0 },

  sugWrap: { marginBottom: 16, gap: 8 },
  sugTitle: { fontSize: 12, fontWeight: '700', color: C.t2 },
  sugRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sugChip: {
    flexGrow: 1, flexBasis: '30%', backgroundColor: C.primaryLight, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center', borderWidth: 1, borderColor: C.primary + '2E',
  },
  sugChipLabel: { fontSize: 13, fontWeight: '700', color: C.primary },
  sugChipSub: { fontSize: 10, color: C.t2, marginTop: 2, textAlign: 'center' },
  emptyRecursos: { fontSize: 13, color: C.t3, fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
  recursoWrap: { flexGrow: 1, flexBasis: '30%', minWidth: 100 },
  recursoChip: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', marginBottom: 4,
  },
  recursoChipSel: { backgroundColor: C.primaryLight, borderColor: C.primary },
  recursoChipLabel: { fontSize: 12, fontWeight: '600', color: C.t1, marginTop: 2, width: '100%' },
  recursoChipLabelSel: { color: C.primary },
  recursoChipSub: { fontSize: 10, color: C.t3, marginTop: 1 },
  recursoQtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 },
  recursoQtyBtn: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.primary + '2E',
  },
  recursoQtyText: { fontSize: 14, fontWeight: '700', color: C.primary },

  genLoading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primaryLight, borderRadius: 12, paddingVertical: 15,
  },
  genLoadingText: { fontSize: 14, fontWeight: '600', color: C.primary },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 15, borderRadius: 12,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: C.surface, fontSize: 15, fontWeight: '700' },

  dropZone: {
    backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: '#C2CBD6', paddingVertical: 22, alignItems: 'center', gap: 4, marginBottom: 14,
  },
  dropIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  dropTitle: { fontSize: 14, fontWeight: '600', color: C.t1 },
  dropSub: { fontSize: 12, color: C.t3 },

  previewCard: {
    backgroundColor: C.bg, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', marginBottom: 14,
  },
  previewImage: { width: '100%', height: 200, backgroundColor: C.bg },
  previewFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewBadgeText: { fontSize: 12, fontWeight: '600', color: C.success },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.successLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },

  savedHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 6, marginBottom: 12,
  },
  savedTitle: { fontSize: 16, fontWeight: '800', color: C.t1 },
  countBadge: {
    backgroundColor: C.primaryLight, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: C.primary },

  emptyCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.border,
    paddingVertical: 28, alignItems: 'center', gap: 8,
  },
  emptyText: { fontSize: 13, color: C.t3, textAlign: 'center' },

  galleryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  galleryCard: {
    width: '47%', backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  galleryImage: {
    width: '100%', height: 110, backgroundColor: C.bg,
  },
  galleryImageEmpty: {
    justifyContent: 'center', alignItems: 'center',
  },
  galleryName: {
    fontSize: 12, fontWeight: '600', color: C.t1,
    paddingHorizontal: 10, paddingVertical: 8,
  },

  modalOverlay: {
  flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
  justifyContent: 'center', alignItems: 'center', padding: 20,
},
modalContent: {
  backgroundColor: C.surface, borderRadius: 16, padding: 16,
  width: '100%', maxWidth: 480, alignItems: 'center',
},
modalClose: {
  alignSelf: 'flex-end', padding: 4, marginBottom: 4,
},
modalImage: {
  width: '100%', height: 280, backgroundColor: C.bg, borderRadius: 12,
},
modalTitle: {
  fontSize: 15, fontWeight: '700', color: C.t1, marginTop: 12, marginBottom: 16,
},
deleteBtn: {
  flexDirection: 'row', alignItems: 'center', gap: 8,
  backgroundColor: C.danger, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
},
deleteBtnText: {
  color: C.surface, fontSize: 14, fontWeight: '700',
},
});

export default LayoutsScreen;