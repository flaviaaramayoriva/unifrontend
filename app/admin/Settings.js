import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  Switch,
  StatusBar
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext'; // Asegúrate que la ruta sea correcta
import { ACCENT_PRESETS } from '../../utils/colorUtils'; // Asegúrate que la ruta sea correcta

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken'; 

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch (e) { return null; }
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('usuario'); } catch (e) { console.error("Error en web:", e); }
  } else {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); await AsyncStorage.removeItem('usuario'); } catch (e) { console.error("Error en nativo:", e); }
  }
};

const SettingsScreen = () => {
  const router = useRouter();
  // ✅ Ahora también obtenemos "colors" (paleta completa) y el accentColor/setAccentColor
  const { colorScheme, setTheme: setGlobalTheme, colors, accentColor, setAccentColor: setGlobalAccentColor } = useTheme();

  const [loading, setLoading] = useState(true);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [user, setUser] = useState({ 
    id: null, nombre: '', apellidopat: '', apellidomat: '', email: '', role: '', facultad: '', theme: 'light', color_acento: '#E95A0C'
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Autenticación Requerida', 
          'No se encontró el token.', [{ text: 'OK', onPress: () => router.replace('/LoginAdmin') }]);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const userData = response.data.user || response.data; 
      console.log('👤 Perfil recibido del backend:', userData);

      const savedTheme = userData.theme || 'light';
      const savedAccent = userData.color_acento || '#E95A0C';
      if (savedTheme)  setGlobalTheme(savedTheme);
      if (savedAccent) setGlobalAccentColor(savedAccent);

      setUser(prev => ({
      ...prev,
      id: userData.id ?? prev.id,
      nombre: userData.nombre ?? prev.nombre,
      apellidopat: userData.apellidopat ?? prev.apellidopat,
      apellidomat: userData.apellidomat ?? prev.apellidomat,
      email: userData.email || prev.email,
      role: userData.role || prev.role,
      facultad: userData.facultad || prev.facultad,
      theme: savedTheme || globalTheme,          
      color_acento: savedAccent || accentColor,  
    }));
      
    } catch (error) {
      console.error("❌ Settings: Error al cargar perfil:", error);
      if (error.response?.status === 401) {
        Alert.alert('Sesión Expirada', 'Tu sesión ha expirado.', [{ text: 'OK', onPress: () => router.replace('/LoginAdmin') }]);
        return;
      }
      Alert.alert('Error', 'No se pudo cargar la información del perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Guarda el modo claro/oscuro en el backend
  const handleThemeChange = async (newValue) => {
    const newTheme = newValue ? 'dark' : 'light';
    
    setGlobalTheme(newTheme);
    setUser(prev => ({ ...prev, theme: newTheme }));
    
    try {
      setSavingTheme(true);
      const token = await getTokenAsync();
      await axios.put(
        `${API_BASE_URL}/users/${user.id}`, 
        { theme: newTheme }, 
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log(`✅ Tema '${newTheme}' guardado en el backend`);
    } catch (error) {
      console.error("❌ Error al guardar el tema:", error);
      Alert.alert('Error', 'No se pudo guardar tu preferencia de tema');
      setGlobalTheme(user.theme);
    } finally {
      setSavingTheme(false);
    }
  };

  const handleAccentColorChange = async (newColor) => {
    const previousColor = user.color_acento;

    // Cambiar visualmente de inmediato (optimista)
    setGlobalAccentColor(newColor);
    setUser(prev => ({ ...prev, color_acento: newColor }));

    try {
      setSavingColor(true);
      const token = await getTokenAsync();
      await axios.put(
        `${API_BASE_URL}/users/${user.id}`,
        { color_acento: newColor },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log(`✅ Color de acento '${newColor}' guardado en el backend`);
    } catch (error) {
      console.error("❌ Error al guardar el color:", error);
      Alert.alert('Error', 'No se pudo guardar tu color preferido');
      // Revertir si falló
      setGlobalAccentColor(previousColor);
      setUser(prev => ({ ...prev, color_acento: previousColor }));
    } finally {
      setSavingColor(false);
    }
  };

  const handleLogout = async () => {
    const performLogout = async () => {
      try {
        await deleteTokenAsync();
        router.replace('/LoginAdmin'); 
      } catch (error) {
        router.replace('/LoginAdmin');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Está seguro que desea cerrar la sesión actual?')) await performLogout();
    } else {
      Alert.alert('Confirmar Cierre de Sesión', '¿Está seguro que desea cerrar la sesión actual?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: performLogout },
      ]);
    }
  };



  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando configuración...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const nombreCompleto = `${user.nombre} ${user.apellidopat} ${user.apellidomat}`.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.primary} />
      
      <Stack.Screen
        options={{
          title: 'Ajustes',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.onPrimary,
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 15, padding: 5 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.onPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mi Cuenta</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.inputText}>{nombreCompleto || 'No especificado'}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.inputText}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Facultad</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.inputText}>{user.facultad}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rol Actual</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
                <Text style={[styles.inputText, { color: colors.success, fontWeight: '600' }]}>
                  {user.role.toUpperCase()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (!user.id) {
                  Alert.alert('Error', 'No se pudo identificar tu ID de usuario.');
                  return;
                }
                router.push(`/admin/editUser/${user.id}`);
              }}
              style={styles.editProfileButton}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.onPrimary} />
              <Text style={[styles.editProfileButtonText, { color: colors.onPrimary }]}>Editar mi Perfil</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferencias</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>Notificaciones</Text>
                <Text style={styles.hintText}>Recibir alertas de eventos y comité</Text>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={colors.primary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>Modo Oscuro</Text>
                <Text style={styles.hintText}>Cambiar la apariencia de la aplicación</Text>
              </View>
              <Switch
                value={user.theme === 'dark'}
                onValueChange={handleThemeChange}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={user.theme === 'dark' ? colors.primary : colors.textTertiary}
                disabled={savingTheme}
              />
            </View>
            
            {savingTheme && (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.savingText}>Guardando preferencia...</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* ✅ Selector de color de acento personal */}
            <Text style={styles.label}>Color de Acento</Text>
            <Text style={styles.hintText}>Elige el color principal de tu app</Text>

            <View style={styles.colorGrid}>
              {ACCENT_PRESETS.map((preset) => {
                const isSelected = accentColor?.toLowerCase() === preset.value.toLowerCase();
                return (
                  <TouchableOpacity
                    key={preset.value}
                    onPress={() => handleAccentColorChange(preset.value)}
                    disabled={savingColor}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: preset.value },
                      isSelected && styles.colorSwatchSelected
                    ]}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {savingColor && (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.savingText}>Guardando color...</Text>
              </View>
            )}
          </View>

          

          <View style={styles.actions}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.versionText}>Desarrollado por Fla6346</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ✅ Los estilos ahora son una función que recibe la paleta dinámica
const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  formContainer: { padding: 20, paddingBottom: 40 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryLight,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
  },
  inputText: { flex: 1, fontSize: 16, color: colors.textPrimary, marginLeft: 10 },
  hintText: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  switchLabel: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 15 },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  itemSubtitle: { fontSize: 12, color: colors.textTertiary },
  actions: { marginTop: 10 },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    gap: 8,
  },
  editProfileButtonText: { fontSize: 15, fontWeight: '600' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: 15,
    gap: 8,
  },
  logoutButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  versionText: { textAlign: 'center', fontSize: 12, color: colors.textTertiary, marginTop: 20 },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  savingText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // ✅ Nuevos estilos para el selector de color
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 14,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.textPrimary,
    transform: [{ scale: 1.1 }],
  },
});

export default SettingsScreen;