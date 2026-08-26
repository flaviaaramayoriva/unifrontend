import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  ScrollView,
  Platform,
  Switch
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'unibackend-production-a0f8.up.railway.app';

const getTokenAsync = async () => {
  const TOKEN_KEY = 'adminAuthToken';
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al acceder a localStorage en web:", e);
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error al obtener token de SecureStore en nativo:", e);
      return null;
    }
  }
};

// ✅ Nueva función: Obtener el ID del usuario actualmente logueado
const getCurrentUserId = async () => {
  try {
    let userData = null;
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem('usuario');
      if (stored) userData = JSON.parse(stored);
    } else {
      const stored = await AsyncStorage.getItem('usuario');
      if (stored) userData = JSON.parse(stored);
    }
    return userData?.id || userData?.idusuario || null;
  } catch (e) {
    console.error("Error al obtener usuario actual:", e);
    return null;
  }
};

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FFEDD5',
  secondary: '#4B5563',
  accent: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#D1D5DB',
  shadow: 'rgba(0, 0, 0, 0.05)',
  white: '#FFFFFF',
  black: '#000000',
  error: '#DC2626',
};

const EditUser = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false); // ✅ Nuevo estado
  const [formData, setFormData] = useState({
    username: '',
    nombre: '',
    apellidopat: '',
    apellidomat: '',
    email: '',
    role: 'daf',
    habilitado: true,
    contrasenia: '',
    idcarrera: '',
    idfacultad: ''
  });
  
  const [facultades, setFacultades] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUserData();
    fetchFacultades();
    fetchCarreras();
  }, [id]);

  const fetchUserData = async () => {
    try {
      const token = await getTokenAsync();
      console.log('🔑 Token obtenido:', token ? `${token.substring(0, 20)}...` : 'NULL');
      
      if (!token) {
        Alert.alert('Error', 'No autenticado. Por favor inicia sesión nuevamente.');
        router.replace('/LoginAdmin');
        return;
      }

      // ✅ Verificar si el usuario está editando su propio perfil
      const currentUserId = await getCurrentUserId();
      const targetUserId = parseInt(id);
      const isOwn = currentUserId === targetUserId;
      setIsOwnProfile(isOwn);
      
      console.log(`👤 Usuario actual ID: ${currentUserId}, Editando ID: ${targetUserId}, ¿Es propio?: ${isOwn}`);

      let response;
      
      // ✅ Si es su propio perfil, usar /profile (funciona para cualquier rol)
      // Si es otro usuario, usar /users/${id} (solo para admin)
      if (isOwn) {
        console.log(' Usando endpoint /profile (perfil propio)');
        response = await axios.get(`${API_BASE_URL}/profile`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        console.log(`📡 Solicitando usuario con ID: ${id} (endpoint /users)`);
        response = await axios.get(`${API_BASE_URL}/users/${id}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log('✅ Usuario recibido:', response.data);

      const userData = response.data.user || response.data;
      setUser(userData);
      
      setFormData({
        username: userData.username || '',
        nombre: userData.nombre || '',
        apellidopat: userData.apellidopat || '',
        apellidomat: userData.apellidomat || '',
        email: userData.email || '',
        role: userData.role || 'daf',
        habilitado: userData.habilitado === 'true' || userData.habilitado === true,
        contrasenia: '',
        idcarrera: userData.academico?.idcarrera || userData.idcarrera || '',
        idfacultad: userData.academico?.facultad_id || userData.facultad_id || userData.idfacultad || ''
      });
      
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        
        if (error.response.status === 403) {
          Alert.alert(
            'Sin Permisos', 
            'No tienes permisos para editar este usuario. Solo puedes editar tu propio perfil.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else if (error.response.status === 401) {
          Alert.alert(
            'Sesión Expirada', 
            'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
            [{ text: 'OK', onPress: () => router.replace('/LoginAdmin') }]
          );
        } else {
          Alert.alert('Error', error.response.data?.message || 'No se pudo cargar el usuario');
        }
      } else {
        Alert.alert('Error', 'No se pudo conectar al servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFacultades = async () => {
    try {
      const token = await getTokenAsync();
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/facultades`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('📚 Facultades cargadas:', response.data.length);
      setFacultades(response.data);
    } catch (error) {
      console.error('Error fetching facultades:', error);
    }
  };

  const fetchCarreras = async () => {
    try {
      const token = await getTokenAsync();
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/carreras`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('🎓 Carreras cargadas:', response.data.length);
      setCarreras(response.data);
    } catch (error) {
      console.error('Error fetching carreras:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) newErrors.username = 'Usuario requerido';
    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre requerido';
    if (!formData.apellidopat.trim()) newErrors.apellidopat = 'Apellido paterno requerido';
    if (!formData.email.trim()) {
      newErrors.email = 'Email requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Por favor completa los campos requeridos');
      return;
    }

    try {
      setSaving(true);
      const token = await getTokenAsync();
      
      if (!token) {
        Alert.alert('Error', 'No autenticado. Inicia sesión nuevamente.');
        router.replace('/LoginAdmin');
        return;
      }

      const updateData = {
        username: formData.username.trim(),
        nombre: formData.nombre.trim(),
        apellidopat: formData.apellidopat.trim(),
        apellidomat: formData.apellidomat.trim(),
        email: formData.email.trim().toLowerCase(),
        habilitado: formData.habilitado,
      };

      if (formData.contrasenia && formData.contrasenia.trim() !== '') {
        updateData.contrasenia = formData.contrasenia.trim();
      }

      console.log('📤 Payload que se enviará:', updateData);

      // ✅ Usar el endpoint correcto según si es perfil propio o no
      const endpoint = isOwnProfile 
        ? `${API_BASE_URL}/profile` 
        : `${API_BASE_URL}/users/${id}`;
      
      console.log(`📡 Enviando PUT a: ${endpoint}`);

      const response = await axios.put(endpoint, updateData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Respuesta del servidor:', response.data);

      Alert.alert(
        '¡Éxito!',
        'El usuario ha sido actualizado correctamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (isOwnProfile) {
                router.back();
              } else {
                router.push({
                  pathname: '/admin/UsuariosDaf',
                  params: { refresh: Date.now().toString() }
                });
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error detallado:', error);
      
      if (error.response) {
        console.error('🔴 Respuesta del servidor:', error.response.data);
        
        let msg = 'No se pudo actualizar el usuario';
        if (error.response.status === 403) {
          msg = error.response.data?.message || 'No tienes permisos (403).';
        } else if (error.response.status === 400) {
          msg = error.response.data?.message || 'Datos inválidos (400).';
        }
        Alert.alert(`Error ${error.response.status}`, msg);
      } else {
        Alert.alert('Error', 'No se pudo conectar al servidor');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando usuario...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: isOwnProfile ? 'Editar mi Perfil' : 'Editar Usuario',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Información Básica */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Básica</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Usuario *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  placeholder="Nombre de usuario"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={[styles.input, errors.nombre && styles.inputError]}
                  value={formData.nombre}
                  onChangeText={(value) => handleInputChange('nombre', value)}
                  placeholder="Nombre"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              {errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Apellido Paterno *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={[styles.input, errors.apellidopat && styles.inputError]}
                  value={formData.apellidopat}
                  onChangeText={(value) => handleInputChange('apellidopat', value)}
                  placeholder="Apellido paterno"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              {errors.apellidopat && <Text style={styles.errorText}>{errors.apellidopat}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Apellido Materno</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.apellidomat}
                  onChangeText={(value) => handleInputChange('apellidomat', value)}
                  placeholder="Apellido materno"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.contrasenia}
                  onChangeText={(value) => handleInputChange('contrasenia', value)}
                  placeholder="Dejar en blanco para mantener la actual"
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry
                />
              </View>
              <Text style={styles.hintText}>Deja en blanco si no quieres cambiarla</Text>
            </View>
          </View>

          {/* Configuración de Cuenta */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuración de Cuenta</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rol</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="shield-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.background }]}
                  value={formData.role.toUpperCase()}
                  editable={false}
                />
              </View>
            </View>

            {/* ✅ Solo mostrar el switch de "Habilitado" si NO es perfil propio */}
            {!isOwnProfile && (
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.label}>Usuario Habilitado</Text>
                  <Text style={styles.hintText}>Permitir acceso al sistema</Text>
                </View>
                <Switch
                  value={formData.habilitado}
                  onValueChange={(value) => handleInputChange('habilitado', value)}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                  thumbColor={formData.habilitado ? COLORS.primary : COLORS.textTertiary}
                />
              </View>
            )}
          </View>

          {/* Información Académica (si aplica) */}
          {formData.role === 'academico' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Académica</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Facultad</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={formData.idfacultad ? 
                      facultades.find(f => f.facultad_id === parseInt(formData.idfacultad))?.nombre_facultad || '' 
                      : 'Sin facultad'}
                    editable={false}
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Carrera</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="school-outline" size={20} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={formData.idcarrera ? 
                      carreras.find(c => c.idcarrera === parseInt(formData.idcarrera))?.nombrecarrera || '' 
                      : 'Sin carrera'}
                    editable={false}
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Botones de Acción */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="save-outline" size={20} color={COLORS.white} />
              )}
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryLight,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginLeft: 5,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 5,
    marginLeft: 5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 15,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 15,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default EditUser;