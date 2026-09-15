import React, { useState, useEffect, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

const COLORS = {
  primary: '#C44B0A',
  primaryLight: '#FFEDD5',
  secondary: '#4B5563',
  accent: '#EF4444',
  success: '#047857',
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

const parseHoraEvento = (h) => {
  const s = String(h || '').split('+')[0].trim();
  const m = /^(\d{1,2}):(\d{2})(?::\d{1,2})?/.exec(s);
  if (!m) return null;
  return dayjs().startOf('day').hour(Number(m[1])).minute(Number(m[2])).second(0);
};

const formatHoraEvento = (h, fallback = '--:--') => {
  const d = parseHoraEvento(h);
  return d ? d.format('HH:mm') : fallback;
};

const EventoVistaScreen = () => {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  const loadEvento = async () => {
    try {
      const token = await getTokenAsync();
      setAuthToken(token);
      if (!token) {
        router.replace('/login');
        return;
      }
      const res = await axios.get(`${API_BASE_URL}/eventos/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvento(res.data);
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'No se pudo cargar el evento');
    } finally {
      setLoading(false);
    }
  };

  const getTokenAsync = async () => {
    const TOKEN_KEY = 'adminAuthToken';
    try {
      let token;
      if (Platform.OS === 'web') {
        token = sessionStorage.getItem(TOKEN_KEY);
      } else {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
      }
      return (token && token !== 'null' && token !== '') ? token : null;
    } catch (e) {
      console.error("Error al obtener el token:", e);
      return null;
    }
  };

  useEffect(() => {
    loadEvento();
  }, [eventId]);

  if (loading || !evento) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando evento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Detalle del Evento</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close-outline" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentPadding}>
        <View style={styles.eventCard}>
          <View style={styles.eventInfoSection}>
            <Text style={styles.eventLabel}>Nombre del Evento</Text>
            <Text style={styles.eventValue}>{evento.nombreevento || 'N/A'}</Text>
          </View>

          <View style={styles.eventInfoSection}>
            <Text style={styles.eventLabel}>Fecha</Text>
            <Text style={styles.eventValue}>{dayjs(evento.fechaevento).format('DD/MM/YYYY')}</Text>
          </View>

          <View style={styles.eventInfoSection}>
            <Text style={styles.eventLabel}>Hora</Text>
            <Text style={styles.eventValue}>{formatHoraEvento(evento.horaevento)}</Text>
          </View>

          <View style={styles.eventInfoSection}>
            <Text style={styles.eventLabel}>Lugar</Text>
            <Text style={styles.eventValue}>{evento.lugarevento || 'N/A'}</Text>
          </View>

          <View style={styles.eventInfoSection}>
            <Text style={styles.eventLabel}>Estado</Text>
            <Text style={styles.eventValue}>{evento.estado || 'N/A'}</Text>
          </View>

          {evento.idcomite && (
            <View style={styles.eventInfoSection}>
              <Text style={styles.eventLabel}>Comit\u00e9</Text>
              <Text style={styles.eventValue}>{evento.nombrecomite || 'N/A'}</Text>
            </View>
          )}

          {evento.tipos_de_evento && evento.tipos_de_evento.length > 0 && (
            <View style={styles.eventInfoSection}>
              <Text style={styles.eventLabel}>Tipo(s) de Evento</Text>
              <Text style={styles.eventValue}>
                {evento.tipos_de_evento.map((t, i) => (i > 0 ? ', ' : '')) + evento.tipos_de_evento.map((t) => t.nombretipo || t.nombre).join(', ')}
              </Text>
            </View>
          )}

          {evento.objetivos && evento.objetivos.length > 0 && (
            <View style={styles.eventInfoSection}>
              <Text style={styles.eventLabel}>Objetivos</Text>
              <Text style={styles.eventValue} numberOfLines={3}>{evento.objetivos.map(o => o.descripcion || o.nombre).join(', ')}</Text>
            </View>
          )}

          {evento.resultados_esperados && (
            <View style={styles.eventInfoSection}>
              <Text style={styles.eventLabel}>Resultados Esperados</Text>
              <Text style={styles.eventValue}>{evento.resultados_esperados || 'N/A'}</Text>
            </View>
          )}

          {evento.fechainscripcion && (
            <View style={styles.eventInfoSection}>
              <Text style={styles.eventLabel}>Fecha Inscripci\u00f3n</Text>
              <Text style={styles.eventValue}>{dayjs(evento.fechainscripcion).format('DD/MM/YYYY')}</Text>
            </View>
          )}

          {evento.fechafinalizacion && (
            <View style={styles.eventInfoSection}>
              <Text style={styles.eventLabel}>Fecha Finalizaci\u00f3n</Text>
              <Text style={styles.eventValue}>{dayjs(evento.fechafinalizacion).format('DD/MM/YYYY')}</Text>
            </View>
          )}

          {evento.presupuesto && (
            <View style={styles.eventInfoSection}>
              <Text style={styles.eventLabel}>Presupuesto</Text>
              <Text style={styles.eventValue}>Bs {Number(evento.presupuesto).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, ',')}</Text>
            </View>
          )}

          {/* Botón de retroceso */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={20} color={COLORS.primary} />
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const getEstadoColor = (estado) => {
  const colores = {
    aprobado: '#059669',
    pendiente: '#D97706',
    rechazado: '#B42318',
    cancelado: '#6B7280',
    vencido: '#6B7280',
  };
  return colores[estado] || COLORS.textSecondary;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 24,
  },
  contentPadding: {
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  eventInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  eventValue: {
    fontSize: 16,
    color: '#1F2937',
    flex: 3,
    textAlign: 'right',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 14,
    color: '#6B7280',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backBtnText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#C44B0A',
    fontWeight: '500',
  },
});

export default EventoVistaScreen;