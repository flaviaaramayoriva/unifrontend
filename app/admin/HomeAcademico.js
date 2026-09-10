import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import ChatEmbed from '../../components/ChatEmbed';
import ChatFlotante from '../../components/ChatFlotante';
import DashboardStats from '../../components/admin/DashboardStats';
import OverviewCharts from '../../components/admin/OverviewCharts';
import UpcomingEvents from '../../components/admin/UpcomingEvents';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

// ✅ statsRowStyles DEFINIDO AQUÍ - NIVEL MÓDULO (accesible en todo el archivo)
const statsRowStyles = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  marginBottom: 20,
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#C44B0A',
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
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    // Login.js guarda el token en sessionStorage. localStorage puede tener
    // un token OBSOLETO de builds antiguos que provoca "invalid signature".
    try {
      const sessionToken = sessionStorage.getItem(TOKEN_KEY);
      if (sessionToken) return sessionToken;
      localStorage.removeItem(TOKEN_KEY);
      return null;
    } catch (e) {
      console.error("Error al acceder a sessionStorage en web:", e);
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

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token en web:", e);
    }
  } else {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token de SecureStore en nativo:", e);
    }
  }
};

const HomeAcademicoScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Estado local para datos seguros
  const [userProfile, setUserProfile] = useState({
    nombre: '',
    role: 'academico',
    loading: true,
  });

  const [error, setError] = useState('');

  // Datos seguros con defaults vacíos (nunca undefined)
  const [dashboardStats, setDashboardStats] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [comiteeEvents, setComiteeEvents] = useState([]);
  const [statusData, setStatusData] = useState({});

  useEffect(() => {
    const init = async () => {
      const token = await getTokenAsync();
      if (!token) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        router.replace('/');
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        const user = response.data;
        setUserProfile({
          nombre: user.nombre || 'Manfred',
          role: user.role || 'academico',
          loading: false,
        });
      } catch (err) {
        console.error('Error al cargar perfil:', err);
        setError('No se pudo cargar tu información.');
        setUserProfile({ nombre: 'Manfred', role: 'academico', loading: false });
      }
    };

    init();
  }, [router]);

  const navigateTo = (route) => {
    router.push(route);
  };

  const handleLogout = async () => {
    await deleteTokenAsync();
    setUserProfile({ nombre: '', role: 'academico', loading: false });
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" />

      <View style={styles.content}>
        <Text style={styles.title}>Panel Académico</Text>
        <Text style={styles.welcome}>
          Bienvenido, {userProfile.nombre || 'Administrador'}
        </Text>

        <Text style={styles.role}>Rol: {userProfile.role}</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* ✅ Usando statsRowStyles definido al nivel módulo - NUNCA undefined */}
        <View style={statsRowStyles}>
          <UpcomingEvents 
            onSelectEvent={navigateTo} 
            colors={colors} 
            events={comiteeEvents} 
          />
          <DashboardStats 
            stats={dashboardStats} 
            historicalData={historicalData} 
            loading={userProfile.loading}
            colors={colors}
          />
          <OverviewCharts 
            estadoCounts={statusData} 
            historicalData={historicalData} 
            colors={colors}
          />
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  welcome: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  role: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 30,
  },
  error: {
    color: '#EF4444',
    marginBottom: 10,
    fontSize: 14,
  },
  logoutBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  logoutText: {
    color: colors.white,
    fontWeight: '600',
  },
});

export default HomeAcademicoScreen;