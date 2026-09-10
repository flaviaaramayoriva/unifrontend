import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import * as SecureStore from 'expo-secure-store';
import DashboardStats from '../../components/admin/DashboardStats';
import OverviewCharts from '../../components/admin/OverviewCharts';
import UpcomingEvents from '../../components/admin/UpcomingEvents';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const FALLBACK_COLORS = {
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
  white: '#FFFFFF',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      const sessionToken = sessionStorage.getItem(TOKEN_KEY);
      if (sessionToken) return sessionToken;
      localStorage.removeItem(TOKEN_KEY);
      return null;
    } catch (e) {
      console.error('Error al acceder a sessionStorage en web:', e);
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    console.error('Error al obtener token de SecureStore:', e);
    return null;
  }
};

const deleteTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Error al eliminar token en web:', e);
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {
    console.error('Error al eliminar token de SecureStore:', e);
  }
};

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const HomeAcademicoScreen = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const colors = themeColors || FALLBACK_COLORS;
  const styles = createStyles(colors);

  const [userProfile, setUserProfile] = useState({ nombre: '', role: 'academico', loading: true });
  const [dashboardStats, setDashboardStats] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [comiteeEvents, setComiteeEvents] = useState([]);
  const [statusData, setStatusData] = useState({});
  const [loadError, setLoadError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = await getTokenAsync();
      if (!token) {
        setUserProfile((p) => ({ ...p, loading: false }));
        setLoadingData(false);
        router.replace('/');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [prof, statsRes, histRes, comiteRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/profile`, { headers, timeout: 8000 }),
          axios.get(`${API_BASE_URL}/dashboard/my-stats`, { headers, timeout: 8000 }),
          axios.get(`${API_BASE_URL}/dashboard/my-historical`, { headers, timeout: 8000 }),
          axios.get(`${API_BASE_URL}/dashboard/my-committee-events`, { headers, timeout: 8000 }),
        ]);

        if (prof.status === 'fulfilled' && prof.value && prof.value.data) {
          const u = prof.value.data;
          setUserProfile({
            nombre: u.nombre || 'Manfred',
            role: u.role || 'academico',
            loading: false,
          });
        } else {
          setUserProfile({ nombre: 'Manfred', role: 'academico', loading: false });
        }

        if (statsRes.status === 'fulfilled' && statsRes.value && statsRes.value.data) {
          const d = statsRes.value.data;
          setDashboardStats(safeArray(Array.isArray(d) ? d : d.stats));
        }

        if (histRes.status === 'fulfilled' && histRes.value && histRes.value.data) {
          const d = histRes.value.data;
          setHistoricalData(safeArray(Array.isArray(d) ? d : d.data));
        }

        if (comiteRes.status === 'fulfilled' && comiteRes.value && comiteRes.value.data) {
          const d = comiteRes.value.data;
          const events = safeArray(Array.isArray(d) ? d : d.events);
          setComiteeEvents(events);
          const counts = {};
          events.forEach((ev) => {
            const key = ev && ev.estado ? ev.estado : 'pendiente';
            counts[key] = (counts[key] || 0) + 1;
          });
          setStatusData(counts);
        }
      } catch (err) {
        console.error('Error al cargar datos de HomeAcademico:', err);
        setLoadError('No se pudieron cargar algunos datos. Intenta recargar.');
      } finally {
        setLoadingData(false);
      }
    };

    init();
  }, [router]);

  const navigateTo = useCallback((route) => {
    if (route) router.push(route);
  }, [router]);

  const handleLogout = async () => {
    await deleteTokenAsync();
    setUserProfile({ nombre: '', role: 'academico', loading: false });
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="school-outline" size={28} color={colors.primary} />
          <Text style={styles.title}>Panel Académico</Text>
        </View>

        <Text style={styles.welcome}>
          Bienvenido, {userProfile.nombre || 'Administrador'}
        </Text>
        <Text style={styles.role}>Rol: {userProfile.role || 'academico'}</Text>

        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        {loadingData ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando tu panel...</Text>
          </View>
        ) : (
          <View style={styles.sections}>
            <UpcomingEvents events={comiteeEvents} onSelectEvent={navigateTo} colors={colors} />
            <DashboardStats
              stats={dashboardStats}
              historicalData={historicalData}
              loading={false}
              colors={colors}
            />
            <OverviewCharts
              estadoCounts={statusData}
              historicalData={historicalData}
              colors={colors}
            />
          </View>
        )}

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={16} color={colors.white} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    welcome: {
      fontSize: 17,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    role: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 2,
      textTransform: 'capitalize',
    },
    error: {
      color: colors.accent,
      marginTop: 14,
      fontSize: 13,
      textAlign: 'center',
    },
    loadingWrap: {
      marginTop: 60,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    sections: {
      width: '100%',
      marginTop: 20,
    },
    logoutBtn: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 28,
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    logoutText: {
      color: colors.white,
      fontWeight: '600',
      fontSize: 15,
    },
  });

export default HomeAcademicoScreen;