import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform, 
  ImageBackground
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store'; 
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://https://unibackend-production-a0f8.up.railway.app';';

const showAlert = (title, message) => {
  console.warn(`🚨 ALERT: ${title} - ${message}`);
  
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [contrasenia, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
          localStorage.setItem('usuario', JSON.stringify({
            id: user.id,
            nombre: user.nombre || user.username,
            role: user.role
          }));
        }

        console.log('🧹 Limpiando claves anteriores...');
        if (Platform.OS === 'web') {
          allKeys.forEach(key => localStorage.removeItem(key));
        } else {
          for (const key of allKeys) {
            await SecureStore.deleteItemAsync(key);
          }
        }

        console.log(`💾 Guardando datos con claves: ${TOKEN_KEY} / ${USER_DATA_KEY}`);
        if (Platform.OS === 'web') {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
        } else {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
          await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
        }

        const savedToken = Platform.OS === 'web' 
          ? localStorage.getItem(TOKEN_KEY)
          : await SecureStore.getItemAsync(TOKEN_KEY);
        const savedUser = Platform.OS === 'web'
          ? localStorage.getItem(USER_DATA_KEY)
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
      // OPCIÓN A: Si tu archivo está dentro de la carpeta app/admin/
      router.push('/admin/RegistroEstudianteScreen');
      
      // OPCIÓN B: Si tu archivo está directamente en la carpeta app/ (raíz), usa esta en su lugar:
      // router.push('/RegistroEstudianteScreen');
      
    } catch (error) {
      console.error('❌ Error de navegación:', error);
      Alert.alert(
        'Error de Navegación', 
        'No se pudo abrir la pantalla de registro. Verifica que el archivo "RegistroEstudianteScreen.js" exista en la carpeta correcta.'
      );
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/FONDO NARANJA_Mesa de trabajo 1.jpeg')} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <View style={styles.content}>
        <Text style={styles.title}>Iniciar Sesión</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo Electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={contrasenia}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRegisterStudent}
          style={styles.registerLinkContainer}
        >
          <Text style={styles.registerLinkText}>
            ¿No tienes cuenta?{' '}
            <Text style={styles.registerLinkHighlight}>Crear cuenta de estudiante</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    padding: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 25,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#e95a0c',
    width: '100%',
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#b6470a',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerLinkContainer: {
    marginTop: 25,
    paddingVertical: 10,
  },
  registerLinkText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  registerLinkHighlight: {
    color: '#FFD700',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;