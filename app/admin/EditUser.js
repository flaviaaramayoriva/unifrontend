import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import DropDownPicker from 'react-native-dropdown-picker';

// ✅ URL de producción (igual que en CrearUsuarioA y UsuarioA)
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';';
const CARRERA_A_FACULTAD = {
  '1':'1', '2':'2', '3':'2', '4':'2', '5':'2', '6':'2', '7':'2',
  '8':'3', '9':'3', '10':'3', '11':'3',
  '12':'4', '13':'4', '14':'4',
  '15':'5', '16':'5', '17':'5',
};

const NOMBRES_FACULTADES = {
  '1': 'Facultad de Ingeniería',
  '2': 'Facultad de Ciencias Económicas',
  '3': 'Facultad de Ciencias de la Salud',
  '4': 'Facultad de Diseño y Tecnología',
  '5': 'Facultad de Ciencias Jurídicas',
};

const OPCIONES_CARRERA = [
  { label: 'Ingeniería de Sistemas', value: '1' },
  { label: 'Administración de Empresas', value: '2' },
  { label: 'Administración de Hotelería y Turismo', value: '3' },
  { label: 'Contaduría Pública', value: '4' },
  { label: 'Ingeniería Comercial', value: '5' },
  { label: 'Ingeniería Económica', value: '6' },
  { label: 'Ingeniería Económica y Financiera', value: '7' },
  { label: 'Bioquímica y Farmacia', value: '8' },
  { label: 'Enfermería', value: '9' },
  { label: 'Medicina', value: '10' },
  { label: 'Odontología', value: '11' },
  { label: 'Arquitectura', value: '12' },
  { label: 'Diseño Gráfico y Producción Cross Media', value: '13' },
  { label: 'Publicidad y Marketing', value: '14' },
  { label: 'Derecho', value: '15' },
  { label: 'Psicología', value: '16' },
  { label: 'Periodismo', value: '17' },
];

const ROLES_CON_CARRERA = ['student', 'academico', 'docente'];

const getTokenAsync = async () => {
  const TOKEN_KEY = 'adminAuthToken';
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  } else {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error('Error al obtener token:', e);
      return null;
    }
  }
};

const Toast = ({ visible, message }) => {
  if (!visible) return null;
  return (
    <View style={styles.toastContainer}>
      <View style={styles.toastContent}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  );
};

const InputField = ({ label, required, value, onChangeText, placeholder, keyboardType, autoCapitalize, error, onFocus }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
    <TextInput
      style={[styles.input, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#999"
      keyboardType={keyboardType || 'default'}
      autoCapitalize={autoCapitalize || 'none'}
      onFocus={onFocus}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const EditUser = () => {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [formData, setFormData] = useState({
    nombre: '',
    apellidopat: '',
    apellidomat: '',
    email: '',
    contrasenia: '',
    role: '',
    habilitado: true,
  });

  const [openCarrera, setOpenCarrera] = useState(false);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(null);
  const [facultadSeleccionada, setFacultadSeleccionada] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'ID de usuario no válido');
      router.replace('/admin/UsuarioA');
      return;
    }
    fetchUserData();
  }, [id]);

  const fetchUserData = async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Error', 'Sesión expirada. Por favor, inicia sesión nuevamente.');
        router.replace('/LoginAdmin');
        return;
      }

      console.log('EditUser: Cargando usuario ID:', id);
      const response = await axios.get(`${API_BASE_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      let userData = response.data;
      if (userData?.user) userData = userData.user;

      console.log('EditUser: Datos recibidos:', JSON.stringify(userData, null, 2));

      setFormData({
        nombre: userData.nombre || '',
        apellidopat: userData.apellidopat || '',
        apellidomat: userData.apellidomat || '',
        email: userData.email || '',
        contrasenia: '',
        role: userData.role || '',
        habilitado: userData.habilitado === 1 || userData.habilitado === true,
      });

      // Cargar carrera si el rol la requiere — busca en múltiples campos posibles
      const carreraId =
        userData.idcarrera?.toString() ||
        userData.carrera_id?.toString() ||
        userData.academico?.idcarrera?.toString() ||
        userData.estudiante?.idcarrera?.toString() ||
        null;

      if (carreraId) {
        setCarreraSeleccionada(carreraId);
        const fid = CARRERA_A_FACULTAD[carreraId];
        if (fid) setFacultadSeleccionada(fid);
      }

    } catch (error) {
      console.error('EditUser: Error al cargar usuario:', error);
      let message = 'No se pudo cargar los datos del usuario.';
      if (error.response?.status === 404) message = 'Usuario no encontrado.';
      else if (error.response?.status === 401) {
        message = 'Sesión no autorizada.';
        router.replace('/LoginAdmin');
        return;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      Alert.alert('Error', message);
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-asignar facultad al cambiar carrera
  useEffect(() => {
    if (carreraSeleccionada) {
      const fid = CARRERA_A_FACULTAD[carreraSeleccionada];
      if (fid) setFacultadSeleccionada(fid);
    }
  }, [carreraSeleccionada]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido.';
    if (!formData.apellidopat.trim()) newErrors.apellidopat = 'El apellido paterno es requerido.';
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido.';
    }
    if (formData.contrasenia && formData.contrasenia.length < 6) {
      newErrors.contrasenia = 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (ROLES_CON_CARRERA.includes(formData.role) && !carreraSeleccionada) {
      newErrors.carrera = 'Debe seleccionar una carrera.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token no disponible');

      const payload = {
        nombre: formData.nombre.trim(),
        apellidopat: formData.apellidopat.trim(),
        apellidomat: formData.apellidomat.trim(),
        email: formData.email.trim().toLowerCase(),
        habilitado: formData.habilitado ? 1 : 0,
      };

      if (formData.contrasenia.trim()) {
        payload.contrasenia = formData.contrasenia;
      }

      if (ROLES_CON_CARRERA.includes(formData.role) && carreraSeleccionada) {
        payload.idcarrera = parseInt(carreraSeleccionada);
        payload.idfacultad = parseInt(CARRERA_A_FACULTAD[carreraSeleccionada]);
      }

      console.log('EditUser: Payload enviado:', JSON.stringify(payload, null, 2));

      await axios.put(`${API_BASE_URL}/users/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      setSuccessMessage('¡Usuario actualizado correctamente!');
      setTimeout(() => {
        setSuccessMessage(null);
        router.replace('/admin/UsuarioA');
      }, 2000);

    } catch (error) {
      console.error('EditUser: Error al guardar:', error);
      let message = 'No se pudo actualizar el usuario.';
      if (error.response?.data?.message) message = error.response.data.message;
      else if (error.response?.status === 409) message = 'El email ya está en uso.';
      else if (error.response?.status === 401) {
        router.replace('/LoginAdmin');
        return;
      }
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{
          title: 'Editar Usuario',
          headerStyle: { backgroundColor: '#E95A0C' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E95A0C" />
          <Text style={styles.loadingText}>Cargando usuario...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const needsCarrera = ROLES_CON_CARRERA.includes(formData.role);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{
        title: 'Editar Usuario',
        headerStyle: { backgroundColor: '#E95A0C' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(formData.nombre || formData.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {formData.nombre} {formData.apellidopat}
              </Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{formData.role || 'Sin rol'}</Text>
              </View>
            </View>
          </View>

          {/* Información Personal */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={18} color="#E95A0C" />
              <Text style={styles.sectionTitle}>Información Personal</Text>
            </View>
            <InputField label="Nombre(s)" required value={formData.nombre}
              onChangeText={(t) => setFormData({ ...formData, nombre: t })}
              placeholder="Ej: Juan Carlos" autoCapitalize="words"
              error={errors.nombre} onFocus={() => setOpenCarrera(false)} />
            <InputField label="Apellido Paterno" required value={formData.apellidopat}
              onChangeText={(t) => setFormData({ ...formData, apellidopat: t })}
              placeholder="Ej: Pérez" autoCapitalize="words"
              error={errors.apellidopat} onFocus={() => setOpenCarrera(false)} />
            <InputField label="Apellido Materno" value={formData.apellidomat}
              onChangeText={(t) => setFormData({ ...formData, apellidomat: t })}
              placeholder="Ej: López (Opcional)" autoCapitalize="words"
              onFocus={() => setOpenCarrera(false)} />
          </View>

          {/* Contacto */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="mail-outline" size={18} color="#E95A0C" />
              <Text style={styles.sectionTitle}>Contacto</Text>
            </View>
            <InputField label="Correo Electrónico" required value={formData.email}
              onChangeText={(t) => setFormData({ ...formData, email: t })}
              placeholder="ejemplo@correo.com" keyboardType="email-address"
              error={errors.email} onFocus={() => setOpenCarrera(false)} />
          </View>

          {/* Contraseña */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={18} color="#E95A0C" />
              <Text style={styles.sectionTitle}>Seguridad</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Nueva Contraseña <Text style={styles.optional}>(Opcional)</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, styles.inputPadRight, errors.contrasenia && styles.inputError]}
                  value={formData.contrasenia}
                  onChangeText={(t) => setFormData({ ...formData, contrasenia: t })}
                  placeholder="Déjalo vacío para no cambiarla"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                  onFocus={() => setOpenCarrera(false)}
                />
                <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {errors.contrasenia && <Text style={styles.errorText}>{errors.contrasenia}</Text>}
            </View>
          </View>

          {/* Carrera/Facultad */}
          {needsCarrera && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="school-outline" size={18} color="#E95A0C" />
                <Text style={styles.sectionTitle}>Configuración Académica</Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Carrera <Text style={styles.required}>*</Text></Text>
                <View style={[styles.dropdownWrapper, { marginBottom: openCarrera ? 290 : 8, zIndex: 2000 }]}>
                  <DropDownPicker
                    open={openCarrera}
                    value={carreraSeleccionada}
                    items={OPCIONES_CARRERA}
                    setOpen={setOpenCarrera}
                    setValue={setCarreraSeleccionada}
                    placeholder="Selecciona la carrera"
                    style={[styles.dropdown, errors.carrera && styles.inputError]}
                    dropDownContainerStyle={[styles.dropdownList, { zIndex: 2000, elevation: 2000, maxHeight: 280 }]}
                    listMode={Platform.OS === 'web' ? 'FLATLIST' : 'SCROLLVIEW'}
                    textStyle={styles.dropdownText}
                    placeholderStyle={styles.dropdownPlaceholder}
                    searchable
                    searchPlaceholder="Buscar carrera..."
                    showArrowIcon showTickIcon itemSeparator
                    itemSeparatorStyle={{ backgroundColor: '#f0f0f0' }}
                  />
                </View>
                {errors.carrera && <Text style={styles.errorText}>{errors.carrera}</Text>}
              </View>
              {carreraSeleccionada && facultadSeleccionada && (
                <View style={styles.facultadBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                  <Text style={styles.facultadBadgeText}>{NOMBRES_FACULTADES[facultadSeleccionada]}</Text>
                </View>
              )}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>💡 La facultad se asigna automáticamente según la carrera</Text>
              </View>
            </View>
          )}

          {/* Estado */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="toggle-outline" size={18} color="#E95A0C" />
              <Text style={styles.sectionTitle}>Estado de la Cuenta</Text>
            </View>
            <TouchableOpacity
              style={styles.toggleContainer}
              onPress={() => setFormData({ ...formData, habilitado: !formData.habilitado })}
            >
              <View style={[styles.toggleSwitch, formData.habilitado && styles.toggleSwitchActive]}>
                <View style={[styles.toggleCircle, formData.habilitado && styles.toggleCircleActive]} />
              </View>
              <Text style={styles.toggleText}>
                {formData.habilitado ? '✅ Habilitado' : '🚫 Deshabilitado'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isSaving}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave} disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>  Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={!!successMessage} message={successMessage} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#6B7280' },
  scrollContainer: { padding: 20, paddingBottom: 60 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#E95A0C',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E95A0C', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  rolePill: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0E8',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  rolePillText: { color: '#E95A0C', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    marginBottom: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '600' },
  required: { color: '#E74C3C' },
  optional: { color: '#9CA3AF', fontWeight: '400' },
  inputWrapper: { position: 'relative' },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: '#1F2937',
  },
  inputPadRight: { paddingRight: 48 },
  passwordToggle: { position: 'absolute', right: 14, top: 15 },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 2 },

  dropdownWrapper: { marginBottom: 8 },
  dropdown: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, minHeight: 50 },
  dropdownList: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12 },
  dropdownText: { fontSize: 15, color: '#1F2937' },
  dropdownPlaceholder: { fontSize: 15, color: '#9CA3AF' },

  facultadBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#27ae60',
  },
  facultadBadgeText: { fontSize: 13, color: '#15803d', fontWeight: '500', flex: 1 },
  infoBox: { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#E95A0C' },
  infoText: { fontSize: 13, color: '#92400e' },

  toggleContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14,
  },
  toggleSwitch: {
    width: 50, height: 28, borderRadius: 14, backgroundColor: '#D1D5DB',
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleSwitchActive: { backgroundColor: '#10B981' },
  toggleCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  toggleCircleActive: { alignSelf: 'flex-end' },
  toggleText: { marginLeft: 12, fontSize: 15, color: '#1F2937', fontWeight: '500' },

  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 30 },
  cancelButton: {
    flex: 1, paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E95A0C',
  },
  cancelButtonText: { color: '#E95A0C', fontSize: 15, fontWeight: '700' },
  saveButton: {
    flex: 2, backgroundColor: '#E95A0C', paddingVertical: 15,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', shadowColor: '#E95A0C',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  saveButtonDisabled: { backgroundColor: '#f9bda3', shadowOpacity: 0.1 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  toastContainer: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    alignItems: 'center', zIndex: 9999, paddingHorizontal: 20,
  },
  toastContent: {
    backgroundColor: '#27ae60', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8, minWidth: 280,
  },
  toastText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 12, textAlign: 'center' },
});

export default EditUser;