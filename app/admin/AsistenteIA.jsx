import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const COLORS = {
  primary: '#E95A0C',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  border: '#E5E7EB',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  success: '#10B981',
};

export default function AsistenteIAScreen() {
  const { eventId } = useLocalSearchParams();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      userId: 0,
      userName: '🤖 Asistente IA',
      message: '¡Hola! Soy tu asistente virtual. Pregúntame sobre:\n\n• 🕐 Horarios\n• 📍 Ubicación\n• 📜 Certificados\n• 💰 Costos\n• 📋 Requisitos',
      esBot: true,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  const handleSend = async () => {
    const texto = input.trim();
    if (!texto) return;

    // Agregar mensaje del usuario
    const userMessage = {
      id: `user_${Date.now()}`,
      userId: 1,
      userName: 'Tú',
      message: texto,
      esBot: false,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Llamar directamente al endpoint del bot
      const response = await fetch(`${API_BASE_URL}/chat/event/${eventId}/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: texto,
          userId: 1,
          userName: 'Usuario'
        })
      });

      const data = await response.json();
      
      const botMessage = {
        id: `bot_${Date.now()}`,
        userId: 0,
        userName: '🤖 Asistente IA',
        message: data.respuesta || 'Lo siento, no entendí tu pregunta. ¿Puedes reformularla?',
        esBot: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo conectar con el asistente');
    } finally {
      setLoading(false);
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }) => {
    const isBot = item.esBot || item.userId === 0;
    
    return (
      <View style={{ 
        flexDirection: 'row', 
        marginVertical: 4, 
        justifyContent: isBot ? 'flex-start' : 'flex-end' 
      }}>
        <View style={{ maxWidth: '80%' }}>
          {!isBot && (
            <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 2, textAlign: 'right' }}>
              {item.userName}
            </Text>
          )}
          {isBot && (
            <Text style={{ fontSize: 11, color: '#9B59B6', fontWeight: '600', marginBottom: 2, marginLeft: 4 }}>
              {item.userName}
            </Text>
          )}
          <View style={{
            backgroundColor: isBot ? '#F3E5F5' : COLORS.primary,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            borderBottomLeftRadius: isBot ? 2 : 16,
            borderBottomRightRadius: isBot ? 16 : 2,
            borderLeftWidth: isBot ? 3 : 0,
            borderLeftColor: '#9B59B6',
          }}>
            <Text style={{ fontSize: 14, color: isBot ? '#1F2937' : '#FFFFFF' }}>
              {item.message}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border,
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: '#9B59B6',
          justifyContent: 'center', alignItems: 'center'
        }}>
          <Ionicons name="robot" size={24} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>
            Asistente IA
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.success }}>
            ● En línea
          </Text>
        </View>
      </View>

      {/* Lista de mensajes */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderMessage}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{
          flexDirection: 'row', padding: 12, backgroundColor: COLORS.surface,
          borderTopWidth: 1, borderColor: COLORS.border, gap: 8, alignItems: 'center',
        }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            style={{
              flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 24,
              paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
              backgroundColor: COLORS.background, maxHeight: 100,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || loading}
            style={{
              backgroundColor: (input.trim() && !loading) ? COLORS.primary : COLORS.textTertiary,
              borderRadius: 24, width: 44, height: 44,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            {loading ? (
              <Ionicons name="ellipsis-horizontal" size={18} color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}