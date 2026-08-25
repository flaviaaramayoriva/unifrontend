// src/components/PredictionScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getPredictionAnalysis } from '../services/predictionService';

const PredictionScreen = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadPredictions = async () => {
    try {
      const response = await getPredictionAnalysis();
      setPredictions(response.data || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar predicciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPredictions();
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'alta':
        return '#28a745';
      case 'media':
        return '#ffc107';
      case 'baja':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.eventName}>{item.nombreevento}</Text>
      <Text style={styles.eventDate}>
        📅 {new Date(item.fechaevento).toLocaleDateString()}
      </Text>
      <View style={styles.predictionRow}>
        <View style={styles.predictionItem}>
          <Text style={styles.label}>Inscripciones:</Text>
          <Text style={styles.value}>{item.participacion_esperada || 0}</Text>
        </View>
        <View style={styles.predictionItem}>
          <Text style={styles.label}>Predicción IA:</Text>
          <Text style={[styles.value, styles.predictionValue]}>
            {item.prediccion_ia} asistentes
          </Text>
        </View>
      </View>
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceLabel}>Nivel de confianza:</Text>
        <View
          style={[
            styles.confidenceBadge,
            { backgroundColor: getConfidenceColor(item.confianza_ia) },
          ]}
        >
          <Text style={styles.confidenceText}>{item.confianza_ia}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Cargando análisis de IA...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🤖 Predicciones de Asistencia</Text>
      <Text style={styles.subtitle}>
        Análisis predictivo generado por Inteligencia Artificial
      </Text>

      <FlatList
        data={predictions}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay eventos futuros con predicciones
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  predictionItem: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  predictionValue: {
    color: '#007bff',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
  },
});

export default PredictionScreen;