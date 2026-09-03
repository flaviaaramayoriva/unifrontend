import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../../context/ThemeContext';

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('adminAuthToken');
  } else {
    return await SecureStore.getItemAsync('adminAuthToken');
  }
};

export default function ChatAnalysisScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      const response = await axios.get(
        `${API_BASE_URL}/chat/event/${eventId}/analysis`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setAnalysis(response.data.data);
        setError(null);
      } else {
        setError('Error al cargar el análisis');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudo cargar el análisis del chat');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalysis();
  }, [fetchAnalysis]);

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return colors.success;
      case 'negative': return colors.accent;
      default: return colors.warning;
    }
  };

  const getEngagementColor = (level) => {
    switch (level) {
      case 'muy_alto': return colors.accent;
      case 'alto': return colors.success;
      case 'medio': return colors.warning;
      default: return colors.textTertiary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Analizando chat con IA...
        </Text>
      </View>
    );
  }

  if (error || !analysis || analysis.total_mensajes === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Análisis del Chat</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
            {error || 'No hay mensajes para analizar'}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchAnalysis}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Análisis IA del Chat</Text>
          <View style={styles.aiBadge}>
            <Ionicons name="brain" size={14} color={colors.primary} />
            <Text style={styles.aiBadgeText}>Machine Learning</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Sentimiento General */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="happy-outline" size={24} color={getSentimentColor(analysis.sentimiento.general)} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sentimiento General</Text>
          </View>
          
          <View style={styles.sentimentContainer}>
            <Text style={[styles.sentimentEmoji, { color: getSentimentColor(analysis.sentimiento.general) }]}>
              {analysis.sentimiento.emoji}
            </Text>
            <Text style={[styles.sentimentText, { color: colors.textPrimary }]}>
              {analysis.sentimiento.general === 'positive' ? 'Muy Positivo' : 
               analysis.sentimiento.general === 'negative' ? 'Negativo' : 'Neutral'}
            </Text>
          </View>

          <View style={styles.sentimentBars}>
            <View style={styles.sentimentBar}>
              <View style={[styles.barLabel, { width: 60 }]}>
                <Text style={[styles.barLabelText, { color: colors.success }]}>Positivo</Text>
              </View>
              <View style={[styles.bar, { backgroundColor: colors.background }]}>
                <View 
                  style={[
                    styles.barFill, 
                    { 
                      width: `${analysis.sentimiento.score.positive}%`, 
                      backgroundColor: colors.success 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                {analysis.sentimiento.score.positive}%
              </Text>
            </View>

            <View style={styles.sentimentBar}>
              <View style={[styles.barLabel, { width: 60 }]}>
                <Text style={[styles.barLabelText, { color: colors.textTertiary }]}>Neutral</Text>
              </View>
              <View style={[styles.bar, { backgroundColor: colors.background }]}>
                <View 
                  style={[
                    styles.barFill, 
                    { 
                      width: `${analysis.sentimiento.score.neutral}%`, 
                      backgroundColor: colors.textTertiary 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                {analysis.sentimiento.score.neutral}%
              </Text>
            </View>

            <View style={styles.sentimentBar}>
              <View style={[styles.barLabel, { width: 60 }]}>
                <Text style={[styles.barLabelText, { color: colors.accent }]}>Negativo</Text>
              </View>
              <View style={[styles.bar, { backgroundColor: colors.background }]}>
                <View 
                  style={[
                    styles.barFill, 
                    { 
                      width: `${analysis.sentimiento.score.negative}%`, 
                      backgroundColor: colors.accent 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                {analysis.sentimiento.score.negative}%
              </Text>
            </View>
          </View>
        </View>

        {/* Engagement */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="flame-outline" size={24} color={getEngagementColor(analysis.engagement.nivel)} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Nivel de Engagement</Text>
          </View>

          <View style={styles.engagementContainer}>
            <Text style={[styles.engagementEmoji, { color: getEngagementColor(analysis.engagement.nivel) }]}>
              {analysis.engagement.emoji}
            </Text>
            <View style={styles.engagementInfo}>
              <Text style={[styles.engagementLevel, { color: getEngagementColor(analysis.engagement.nivel) }]}>
                {analysis.engagement.nivel.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={[styles.engagementScore, { color: colors.textSecondary }]}>
                Score: {analysis.engagement.score}/100
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {analysis.total_mensajes}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Mensajes</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color={colors.info} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {analysis.usuarios_participantes}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Participantes</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {analysis.engagement.mensajes_por_dia}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Mensajes/día</Text>
            </View>
          </View>
        </View>

        {/* Temas Principales */}
        {analysis.temas_principales.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="pricetag-outline" size={24} color={colors.warning} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Temas Más Mencionados</Text>
            </View>

            <View style={styles.topicsContainer}>
              {analysis.temas_principales.map((topic, index) => (
                <View key={index} style={styles.topicItem}>
                  <View style={[styles.topicRank, { backgroundColor: colors.primary }]}>
                    <Text style={styles.topicRankText}>#{index + 1}</Text>
                  </View>
                  <Text style={[styles.topicWord, { color: colors.textPrimary }]}>{topic.word}</Text>
                  <View style={[styles.topicCount, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.topicCountText, { color: colors.primary }]}>
                      {topic.count} {topic.count === 1 ? 'vez' : 'veces'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Predicción de Asistencia */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.info }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={24} color={colors.info} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Predicción de Asistencia</Text>
          </View>

          <View style={styles.predictionContainer}>
            <Text style={[styles.predictionNumber, { color: colors.info }]}>
              {analysis.prediccion_asistencia.estimada}
            </Text>
            <Text style={[styles.predictionLabel, { color: colors.textSecondary }]}>
              asistentes estimados
            </Text>
            <View style={[styles.confidenceBadge, { backgroundColor: colors.info + '20' }]}>
              <Text style={[styles.confidenceText, { color: colors.info }]}>
                Confianza: {analysis.prediccion_asistencia.confianza}
              </Text>
            </View>
          </View>
        </View>

        {/* Alertas */}
        {analysis.alertas.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.accent }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Alertas Detectadas</Text>
            </View>

            {analysis.alertas.map((alert, index) => (
              <View key={index} style={[styles.alertItem, { backgroundColor: colors.accent + '10' }]}>
                <Ionicons name="warning" size={20} color={colors.accent} />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertMessage, { color: colors.textPrimary }]}>
                    {alert.mensaje}
                  </Text>
                  <Text style={[styles.alertUser, { color: colors.textSecondary }]}>
                    {alert.usuario} • {new Date(alert.fecha).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="analytics" size={16} color={colors.textTertiary} />
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Análisis generado con Inteligencia Artificial • {analysis.periodo_analisis} días analizados
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sentimentContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sentimentEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  sentimentText: {
    fontSize: 18,
    fontWeight: '700',
  },
  sentimentBars: {
    gap: 12,
  },
  sentimentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    alignItems: 'flex-end',
  },
  barLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  engagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  engagementEmoji: {
    fontSize: 48,
  },
  engagementInfo: {
    flex: 1,
  },
  engagementLevel: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  engagementScore: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  topicsContainer: {
    gap: 10,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  topicRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topicWord: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  topicCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topicCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  predictionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  predictionNumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  predictionLabel: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  alertUser: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});