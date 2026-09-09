import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

const showAlert = (title, message) => {
  console.warn(`🚨 ALERT: ${title} - ${message}`);
  setToast({ title, message });
};

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [contrasenia, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = contrasenia.trim();

    if (!trimmedEmail) {
      showAlert('Error', 'Por favor, ingresa tu correo electrónico.');
      return;
    }

    if (!trimmedPassword) {
      showAlert('Error', 'Por favor, ingresa tu contraseña.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showAlert('Error', 'El formato del correo electrónico no es válido.');
      return;
    }

    setLoading(true);
    const apiUrl = `${API_BASE_URL}/auth/login`;
    console.log("🔐 Intentando login con:", { email: trimmedEmail });

    try {
      const response = await axios.post(apiUrl, {
        email: trimmedEmail,
        password: trimmedPassword,
      }, { timeout: 120000 });

      console.log("✅ Respuesta del servidor:", response.data);
      console.log("📊 Status:", response.status);

      if (!response.data) {
        showAlert('Error', 'El servidor no devolvió datos.');
        return;
      }

      if (response.status === 200 && response.data.token && response.data.user) {
        const { token, user } = response.data;

        let TOKEN_KEY, USER_DATA_KEY;

        switch (user.role) {
          case 'admin':
          case 'academico':
          case 'daf':
            TOKEN_KEY = 'adminAuthToken';
            USER_DATA_KEY = 'adminUserData';
            break;
          case 'student':
            TOKEN_KEY = 'studentAuthToken';
            USER_DATA_KEY = 'studentUserData';
            break;
          case 'comunicacion':
            TOKEN_KEY = 'comunicacionAuthToken';
            USER_DATA_KEY = 'comunicacionUserData';
            break;
          case 'TI':
            TOKEN_KEY = 'tiAuthToken';
            USER_DATA_KEY = 'tiUserData';
            break;
          case 'recursos':
            TOKEN_KEY = 'recursosAuthToken';
            USER_DATA_KEY = 'recursosUserData';
            break;
          case 'Admisiones':
            TOKEN_KEY = 'admisionesAuthToken';
            USER_DATA_KEY = 'admisionesUserData';
            break;
          case 'Serv. Estudiatil':
            TOKEN_KEY = 'serviciosEstudiantilesAuthToken';
            USER_DATA_KEY = 'serviciosEstudiantilesUserData';
            break;
          default:
            console.warn("⚠️ Rol no reconocido:", user.role);
            TOKEN_KEY = 'authToken';
            USER_DATA_KEY = 'userData';
        }

        const allKeys = [
          'adminAuthToken', 'adminUserData',
          'studentAuthToken', 'studentUserData',
          'academicoAuthToken', 'academicoUserData',
          'dafAuthToken', 'dafUserData',
          'comunicacionAuthToken', 'comunicacionUserData',
          'tiAuthToken', 'tiUserData',
          'recursosAuthToken', 'recursosUserData',
          'admisionesAuthToken', 'admisionesUserData',
          'serviciosEstudiantilesAuthToken', 'serviciosEstudiantilesUserData'
        ];

        await AsyncStorage.setItem('usuario', JSON.stringify({
          id: user.id,
          nombre: user.nombre,
          role: user.role
        }));

        if (Platform.OS === 'web') {
          sessionStorage.setItem('usuario', JSON.stringify({
            id: user.id,
            nombre: user.nombre || user.username,
            role: user.role
          }));
        }

        console.log('🧹 Limpiando claves anteriores...');
        if (Platform.OS === 'web') {
          allKeys.forEach(key => sessionStorage.removeItem(key));
        } else {
          for (const key of allKeys) {
            await SecureStore.deleteItemAsync(key);
          }
        }

        console.log(`💾 Guardando datos con claves: ${TOKEN_KEY} / ${USER_DATA_KEY}`);
        if (Platform.OS === 'web') {
          sessionStorage.setItem(TOKEN_KEY, token);
          sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
        } else {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
          await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
        }

        const savedToken = Platform.OS === 'web'
          ? sessionStorage.getItem(TOKEN_KEY)
          : await SecureStore.getItemAsync(TOKEN_KEY);
        const savedUser = Platform.OS === 'web'
          ? sessionStorage.getItem(USER_DATA_KEY)
          : await SecureStore.getItemAsync(USER_DATA_KEY);

        console.log('✅ Verificación de guardado:', {
          role: user.role,
          tokenSaved: !!savedToken,
          userSaved: !!savedUser
        });

        let targetRoute = '/';
        let routeParams = {};

        switch (user.role) {
          case 'admin':
            targetRoute = '/admin/HomeAdministradorScreen';
            routeParams = { nombre: user.nombre };
            break;
          case 'student':
            targetRoute = '/estudiante/HomeEstudiante';
            break;
          case 'academico':
            targetRoute = '/admin/HomeAcademico';
            routeParams = { nombre: user.nombre };
            break;
          case 'daf':
            targetRoute = '/admin/Daf';
            break;
          case 'comunicacion':
            targetRoute = '/admin/HomeComunicacion';
            break;
          case 'TI':
            targetRoute = '/admin/HomeTI';
            break;
          case 'recursos':
            targetRoute = '/admin/HomeRecursosHumanos';
            routeParams = { nombre: user.nombre, idUsuario: user.id };
            break;
          case 'Admisiones':
            targetRoute = '/admin/HomeAdmisiones';
            routeParams = { nombre: user.nombre, idUsuario: user.id };
            break;
          case 'Serv. Estudiatil':
            targetRoute = '/admin/HomeServiciosEstudiantiles';
            routeParams = { nombre: user.nombre, idUsuario: user.id };
            break;
          default:
            console.warn("⚠️ Rol no reconocido:", user.role);
            showAlert('Acceso', 'Tu rol no tiene una interfaz asignada.');
            targetRoute = '/';
            break;
        }

        console.log('🔄 Redirigiendo a:', targetRoute);

        setTimeout(() => {
          try {
            router.replace({ pathname: targetRoute, params: routeParams });
          } catch (error) {
            console.error('❌ Error en redirección:', error);
            showAlert('Error', 'No se pudo redirigir. Intenta nuevamente.');
          }
        }, 200);

      } else {
        const errorMsg = response.data?.message
          || response.data?.error
          || response.data?.msg
          || 'Credenciales inválidas o respuesta inesperada del servidor.';

        console.error('❌ Login fallido - Respuesta:', response.data);
        showAlert('Login Fallido', errorMsg);
      }

    } catch (err) {
      console.error("❌ Error en handleLogin:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        hasRequest: !!err.request
      });

      if (err.response) {
        const errorMsg = err.response.data?.message
          || err.response.data?.error
          || err.response.data?.msg
          || 'Credenciales inválidas.';

        showAlert(
          'Login Fallido',
          `${errorMsg} (Status: ${err.response.status})`
        );
      } else if (err.request) {
        showAlert(
          'Error de Red',
          'No se pudo conectar al servidor. Verifica tu conexión a internet.'
        );
      } else if (err.code === 'ECONNABORTED') {
        showAlert(
          'Tiempo Agotado',
          'La conexión tardó demasiado. Intenta nuevamente.'
        );
      } else {
        showAlert('Error', `Ocurrió un error inesperado: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStudent = () => {
    console.log('🔗 Intentando navegar al registro de estudiante...');
    try {
      router.push('/admin/RegistroEstudianteScreen');
    } catch (error) {
      console.error('❌ Error de navegación:', error);
      Alert.alert(
        'Error de Navegación',
        'No se pudo abrir la pantalla de registro. Verifica que el archivo "RegistroEstudianteScreen.js" exista en la carpeta correcta.'
      );
    }
  };

  const getFieldStyle = (field) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <ImageBackground
      source={require('../../assets/images/FONDO NARANJA_Mesa de trabajo 1.jpeg')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(15,23,42,0.68)', 'rgba(40,22,12,0.45)', 'rgba(15,8,4,0.84)']}
        style={styles.overlay}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Stack.Screen options={{ headerShown: false }} />

          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../assets/images/logo.jpg')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.brandName}>UFT Eventos</Text>
            <Text style={styles.brandSub}>Eventos · Formación · Comunidad</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Iniciar Sesión</Text>
            <Text style={styles.subtitle}>Bienvenido de nuevo, ingresa tus credenciales</Text>

            <View style={styles.fieldGroup}>
              <Ionicons
                name="mail-outline"
                size={19}
                color={focusedField === 'email' ? PRIMARY : INPUT_ICON}
                style={styles.inputIcon}
              />
              <TextInput
                style={getFieldStyle('email')}
                placeholder="Correo Electrónico"
                placeholderTextColor={PLACEHOLDER}
                accessibilityLabel="Correo Electrónico"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={focusedField === 'password' ? PRIMARY : INPUT_ICON}
                style={styles.inputIcon}
              />
              <TextInput
                style={getFieldStyle('password')}
                placeholder="Contraseña"
                placeholderTextColor={PLACEHOLDER}
                accessibilityLabel="Contraseña"
                value={contrasenia}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={INPUT_ICON}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              style={styles.buttonWrap}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ingresar"
            >
              <LinearGradient
                colors={[PRIMARY, '#C83E00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Ingresar</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>¿ERES ESTUDIANTE?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              onPress={handleRegisterStudent}
              style={styles.registerLinkContainer}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Ionicons name="person-add-outline" size={16} color={PRIMARY} />
              <Text style={styles.registerLinkText}>
                <Text style={styles.registerLinkHighlight}>Crear cuenta de estudiante</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            © {new Date().getFullYear()} UFT Eventos · Universidad Privada Franz Tamayo
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <View style={styles.toast} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={20} color="#fff" />
          <Text style={styles.toastText}>{toast.title}: {toast.message}</Text>
        </View>
      )}
    </ImageBackground>
  );
};

const PRIMARY = '#C44200';
const PRIMARY_DARK = '#C83E00';
const PLACEHOLDER = '#9CA3AF';
const INPUT_ICON = '#9CA3AF';

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 12,
  },
  logo: {
    width: 78,
    height: 78,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 430,
    paddingVertical: 32,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 26,
    lineHeight: 19,
  },
  fieldGroup: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    width: '100%',
    height: 54,
    backgroundColor: '#F5F6FA',
    borderWidth: 1.5,
    borderColor: '#E8EAF1',
    borderRadius: 14,
    paddingHorizontal: 46,
    fontSize: 15,
    color: '#1F2937',
  },
  inputFocused: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 17,
    zIndex: 2,
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    top: 17,
    zIndex: 2,
  },
  buttonWrap: {
    borderRadius: 14,
    marginTop: 6,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  button: {
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginHorizontal: 12,
  },
  registerLinkContainer: {
    marginTop: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: '#FFF4EC',
    borderWidth: 1,
    borderColor: '#FFD4BC',
  },
  registerLinkText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },
  registerLinkHighlight: {
    color: PRIMARY,
    fontWeight: '700',
  },
  footer: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(233, 30, 30, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
});

export default LoginScreen;