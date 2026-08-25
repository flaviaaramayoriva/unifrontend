// src/components/events/PredictAttendanceButton.jsx (React Native)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { predictSingleEvent } from '../../services/predictionApi';

const PredictAttendanceButton = ({ eventData }) => {
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      // eventData debe contener: { nombreevento, fechaevento, horaevento, idclasificacion, idacademico, idsubcategoria, evento_externo }
      const response = await predictSingleEvent(eventData);
      
      Alert.alert(
        '🤖 Predicción de Inteligencia Artificial',
        `Se predicen ${response.data.prediccion} asistentes.\n\nConfianza: ${response.data.confianza}\n${response.data.mensaje}`,
        [{ text: 'Entendido' }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar la predicción en este momento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handlePredict}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}> Predecir Asistencia con IA</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 15, alignItems: 'center' },
  button: {
    backgroundColor: '#6C63FF', // Color morado/tech para denotar IA
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#a0a0a0' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default PredictAttendanceButton;