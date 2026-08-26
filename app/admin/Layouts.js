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

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
// Misma paleta que InventarioDAF.js para mantener consistencia visual
const C = {
  primary: '#E95A0C', primaryLight: '#FFF0E6',
  success: '#10B981', successLight: '#D1FAE5',
  danger: '#EF4444',  dangerLight: '#FEE2E2',
  info: '#3B82F6',    infoLight: '#DBEAFE',
  bg: '#F3F4F6', surface: '#FFFFFF',
  t1: '#111827', t2: '#6B7280', t3: '#9CA3AF', border: '#E5E7EB',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem('adminAuthToken'); } catch (e) { return null; }
  }
  try { return await SecureStore.getItemAsync('adminAuthToken'); } catch (e) { return null; }
};



const uriToBlob = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

const LayoutsScreen = () => {
  const router = useRouter();
  const [nombreLayout, setNombreLayout] = useState('');
  const [imagenUri, setImagenUri] = useState(null);
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
      Alert.alert('Error', 'Por favor selecciona una imagen.');
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

  const puedeSubir = nombreLayout.trim().length > 0 && !!imagenUri && !loading;

  useEffect(() => {
  cargarLayouts();
}, []);

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header — mismo patrón que InventarioDAF */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.t1} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.hTitle}>Subir layout</Text>
          <Text style={st.hSub}>Sube un plano o imagen del salón</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <View style={st.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={C.info} />
          <Text style={st.infoBannerText}>
            El layout se usará como referencia visual para ubicar mesas y recursos en el evento.
          </Text>
        </View>

        <Text style={st.label}>Nombre del layout</Text>
        <View style={st.inputWrap}>
          <Ionicons name="pricetag-outline" size={17} color={C.t3} />
          <TextInput
            style={st.input}
            placeholder="Ej: Layout Salón Principal"
            placeholderTextColor={C.t3}
            value={nombreLayout}
            onChangeText={setNombreLayout}
          />
        </View>

        <Text style={st.label}>Imagen del layout</Text>

        {imagenUri ? (
          <View style={st.previewCard}>
            <Image source={{ uri: imagenUri }} style={st.previewImage} resizeMode="contain" />
            <View style={st.previewFooter}>
              <View style={st.previewBadge}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={st.previewBadgeText}>Imagen seleccionada</Text>
              </View>
              <TouchableOpacity style={st.changeBtn} onPress={seleccionarImagen}>
                <Ionicons name="swap-horizontal-outline" size={15} color={C.primary} />
                <Text style={st.changeBtnText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={st.dropZone} onPress={seleccionarImagen} activeOpacity={0.7}>
            <View style={st.dropIconWrap}>
              <Ionicons name="image-outline" size={26} color={C.primary} />
            </View>
            <Text style={st.dropTitle}>Toca para seleccionar una imagen</Text>
            <Text style={st.dropSub}>PNG o JPG · recomendado 4:3</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[st.submitBtn, !puedeSubir && st.submitBtnDisabled]}
          onPress={subirLayout}
          disabled={!puedeSubir}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.surface} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={18} color={C.surface} />
              <Text style={st.submitBtnText}>Subir layout</Text>
            </>
          )}
        </TouchableOpacity>
        {/* Layouts guardados */}
          <Text style={[st.label, { marginTop: 28 }]}>Layouts guardados</Text>

          {loadingLayouts ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : layouts.length === 0 ? (
            <Text style={{ color: C.t3, fontSize: 13, textAlign: 'center', marginTop: 12 }}>
              Aún no hay layouts guardados.
            </Text>
          ) : (
          <View style={st.galleryGrid}>
            {layouts.map((layout) => (
              <TouchableOpacity
                key={layout.idlayout}
                style={st.galleryCard}
                onPress={() => setLayoutSeleccionado(layout)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: layout.imagenUrl }}
                  style={st.galleryImage}
                  resizeMode="cover"
                />
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
      >
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <TouchableOpacity
              style={st.modalClose}
              onPress={() => setLayoutSeleccionado(null)}
            >
              <Ionicons name="close" size={22} color={C.t1} />
            </TouchableOpacity>

            {layoutSeleccionado && (
              <>
                <Image
                  source={{ uri: layoutSeleccionado.imagenUrl }}
                  style={st.modalImage}
                  resizeMode="contain"
                />
                <Text style={st.modalTitle}>{layoutSeleccionado.nombre}</Text>

                <TouchableOpacity
                  style={st.deleteBtn}
                  onPress={() => eliminarLayout(layoutSeleccionado)}
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

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.infoLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 0.5, borderColor: C.info + '40', marginBottom: 20,
  },
  infoBannerText: { fontSize: 13, color: C.info, flex: 1, lineHeight: 18 },

  label: { fontSize: 13, fontWeight: '700', color: C.t1, marginBottom: 8 },
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
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface,
    borderRadius: 12, borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 20,
  },
  input: { flex: 1, fontSize: 14, color: C.t1, padding: 0 },
galleryGrid: {
  flexDirection: 'row', flexWrap: 'wrap', gap: 12,
},
galleryCard: {
  width: '47%', backgroundColor: C.surface, borderRadius: 12,
  borderWidth: 0.5, borderColor: C.border, overflow: 'hidden',
},
galleryImage: {
  width: '100%', height: 110, backgroundColor: C.bg,
},
galleryName: {
  fontSize: 12, fontWeight: '600', color: C.t1,
  paddingHorizontal: 10, paddingVertical: 8,
},
  dropZone: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: C.border, paddingVertical: 20, alignItems: 'center', gap: 4, marginBottom: 20,
  },
  dropIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  dropTitle: { fontSize: 14, fontWeight: '600', color: C.t1 },
  dropSub: { fontSize: 12, color: C.t3 },

  previewCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.border,
    overflow: 'hidden', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  previewImage: { width: '100%', height: 220, backgroundColor: C.bg },
  previewFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 0.5, borderColor: C.border,
  },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewBadgeText: { fontSize: 12, fontWeight: '600', color: C.success },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  changeBtnText: { fontSize: 12, fontWeight: '600', color: C.primary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 15, borderRadius: 12,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: C.surface, fontSize: 15, fontWeight: '700' },
});

export default LayoutsScreen;