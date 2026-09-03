import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';

// Usa la misma URL que tu app principal
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem('adminAuthToken');
    } catch (e) {
      console.error("Error al acceder a localStorage en web:", e);
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync('adminAuthToken');
    } catch (e) {
      console.error("Error al obtener token de SecureStore en nativo:", e);
      return null;
    }
  }
};

export default function PrediccionIAScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [tipo, setTipo] = useState('');
  const [facultad, setFacultad] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const handlePredecir = useCallback(async () => {
    if (!tipo || !facultad || !fecha) {
      Alert.alert('Datos incompletos', 'Por favor, completa todos los campos del evento.');
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const token = await getTokenAsync();
      
      const response = await axios.post(
        `${API_BASE_URL}/api/predictions/predecir`,
        {
          tipo,
          facultad,
          fecha: new Date(fecha).toISOString().split('T')[0], // Formato YYYY-MM-DD
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );

      const data = response.data;

      if (data.success) {
        setResultado(data.data);
      } else {
        setError(data.error || 'Error al generar la predicción');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setError(err.response?.data?.error || 'Error de conexión con el servidor. Verifica tu red.');
    } finally {
      setLoading(false);
    }
  }, [tipo, facultad, fecha]);

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setFecha(selectedDate);
    }
  };

  const getConfianzaColor = (confianza) => {
    switch (confianza?.toLowerCase()) {
      case 'alta': return colors.success;
      case 'media': return colors.warning;
      case 'baja': return colors.accent;
      default: return colors.secondary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={colors.barStyle || 'dark-content'} 
        backgroundColor={colors.surface} 
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Predicción con IA</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🤖 Machine Learning</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Formulario */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Datos del Evento
            </Text>

            {/* Tipo de Evento */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo de Evento</Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Picker
                  selectedValue={tipo}
                  onValueChange={(itemValue) => setTipo(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona un tipo..." value="" />
                  <Picker.Item label="Conferencia" value="1" />
                  <Picker.Item label="Taller" value="2" />
                  <Picker.Item label="Seminario" value="3" />
                  <Picker.Item label="Congreso" value="4" />
                  <Picker.Item label="Otros" value="5" />
                </Picker>
              </View>
            </View>

            {/* Facultad */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Facultad Organizadora</Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Picker
                  selectedValue={facultad}
                  onValueChange={(itemValue) => setFacultad(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona una facultad..." value="" />
                  <Picker.Item label="Ingeniería" value="1" />
                  <Picker.Item label="Administración" value="2" />
                  <Picker.Item label="Derecho" value="3" />
                  <Picker.Item label="Salud" value="4" />
                  <Picker.Item label="Arquitectura" value="5" />
                </Picker>
              </View>
            </View>

            {/* Fecha */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Fecha del Evento</Text>
              <TouchableOpacity 
                style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
                  {new Date(fecha).toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={fecha}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  textColor={colors.textPrimary}
                />
              )}
            </View>

            {/* Botón de Acción */}
            <TouchableOpacity 
              style={[styles.button, loading && { backgroundColor: colors.textTertiary }]} 
              onPress={handlePredecir}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="analytics" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Generar Predicción con IA</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Mensaje de Error */}
          {error && (
            <View style={[styles.resultCard, { backgroundColor: colors.surface, borderLeftColor: colors.accent }]}>
              <View style={styles.resultHeader}>
                <Ionicons name="alert-circle" size={24} color={colors.accent} />
                <Text style={[styles.resultTitle, { color: colors.accent }]}>Error</Text>
              </View>
              <Text style={[styles.resultText, { color: colors.textSecondary }]}>{error}</Text>
            </View>
          )}

          {/* Resultado de la IA */}
          {resultado && !error && (
            <View style={[styles.resultCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>Resultado de la Predicción</Text>
              </View>
              
              <View style={styles.predictionContainer}>
                <Text style={[styles.predictionNumber, { color: colors.primary }]}>{resultado.prediccion}</Text>
                <Text style={[styles.predictionLabel, { color: colors.textSecondary }]}>Asistentes estimados</Text>
              </View>

              <View style={styles.badgeContainer}>
                <View style={[styles.confianzaBadge, { backgroundColor: getConfianzaColor(resultado.confianza) + '20' }]}>
                  <Ionicons 
                    name={resultado.confianza === 'alta' ? 'checkmark-circle' : 'information-circle'} 
                    size={16} 
                    color={getConfianzaColor(resultado.confianza)} 
                  />
                  <Text style={[styles.confianzaText, { color: getConfianzaColor(resultado.confianza) }]}>
                    Confianza: {resultado.confianza?.toUpperCase()}
                  </Text>
                </View>
                {resultado.modelo && (
                  <View style={[styles.confianzaBadge, { backgroundColor: colors.info + '20' }]}>
                    <Ionicons name="hardware-chip" size={16} color={colors.info} />
                    <Text style={[styles.confianzaText, { color: colors.info }]}>
                      {resultado.modelo}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>{resultado.mensaje}</Text>
              
              {resultado.eventos_analizados && (
                <View style={styles.resultDetailContainer}>
                  <Ionicons name="bar-chart" size={16} color={colors.textTertiary} />
                  <Text style={[styles.resultDetail, { color: colors.textTertiary }]}>
                    Basado en el análisis de {resultado.eventos_analizados} eventos históricos
                  </Text>
                </View>
              )}

              {resultado.promedio_historico && (
                <View style={styles.resultDetailContainer}>
                  <Ionicons name="trending-up" size={16} color={colors.textTertiary} />
                  <Text style={[styles.resultDetail, { color: colors.textTertiary }]}>
                    Promedio histórico: {resultado.promedio_historico} asistentes
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Info adicional */}
          <View style={[styles.infoCard, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                ¿Cómo funciona la predicción?
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Nuestra IA analiza patrones históricos de eventos similares (mismo tipo, facultad y fecha) 
                para predecir la asistencia esperada. El modelo se entrena constantemente con nuevos datos 
                para mejorar su precisión.
              </Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  aiBadge: {
    backgroundColor: colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  aiBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 50,
    paddingHorizontal: 16,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 15,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  predictionContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  predictionNumber: {
    fontSize: 56,
    fontWeight: '800',
  },
  predictionLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  confianzaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confianzaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  resultDetailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  resultDetail: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});