import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

const COLORS = {
  primary: '#C44200', primaryLight: '#FFEDD5',
  accent: '#EF4444', secondary: '#4B5563',
  surface: '#FFFFFF', background: '#F4F7F9',
  border: '#E6E9EF', textPrimary: '#1F2937',
  textSecondary: '#6B7280', textTertiary: '#9CA3AF',
  white: '#FFFFFF',
};

export default function ChatFlotante({ eventId, visible, onClose, userId, userName, userRole }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      userId: 0,
      userName: '🤖 Asistente IA',
      message: '¡Hola! Soy tu asistente virtual. Pregúntame sobre:\n\n• Horarios y fechas\n• Ubicación\n• Certificados\n• Costos\n• Inscripciones\n• Comité organizador\n• Objetivos del evento',
      esBot: true,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    console.log('🔍 ChatFlotante - eventId:', eventId);
    console.log('🔍 ChatFlotante - userId:', userId);
  }, [eventId, userId]);

  const handleSend = async () => {
    const texto = input.trim();
    if (!texto) return;

    if (!eventId || eventId === 'undefined' || eventId === 'null') {
      const errorMessage = {
        id: `error_${Date.now()}`,
        userId: 0,
        userName: '  Sistema',
        message: 'No hay un evento seleccionado. Por favor, selecciona un evento primero.',
        esBot: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage = {
      id: `user_${Date.now()}`,
      userId: userId || 1,
      userName: userName || 'Tú',
      message: texto,
      esBot: false,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/event/${eventId}/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: texto,
          userId: userId || 1,
          userName: userName || 'Usuario',
          userRole: userRole || 'academico',
          eventId: eventId,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log('✅ Respuesta del backend:', data);

      const botMessage = {
        id: `bot_${Date.now()}`,
        userId: 0,
        userName: '🤖 Asistente IA',
        message: data.respuesta || data.reply || 'Lo siento, no entendí. Prueba con "ayuda"',
        esBot: true,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('❌ Error en ChatFlotante:', error);
      const errorMessage = {
        id: `error_${Date.now()}`,
        userId: 0,
        userName: '  Error',
        message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
        esBot: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }) => {
    const isBot = item.esBot || item.userId === 0;

    return (
      <View style={{
        flexDirection: 'row', marginVertical: 3,
        justifyContent: isBot ? 'flex-start' : 'flex-end',
      }}>
        {isBot && (
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#9B59B655',
            alignItems: 'center', justifyContent: 'center', marginRight: 6, marginTop: 2,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#9B59B6' }}>IA</Text>
          </View>
        )}
        <View style={{ maxWidth: '78%' }}>
          {isBot && (
            <Text style={{ fontSize: 10, color: '#9B59B6', fontWeight: '700', marginBottom: 2, marginLeft: 2 }}>
              🤖 Asistente IA
            </Text>
          )}
          {!isBot && (
            <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginBottom: 2, textAlign: 'right' }}>
              {item.userName}
            </Text>
          )}
          <View style={{
            backgroundColor: isBot ? '#F3E5F5' : COLORS.primary,
            paddingHorizontal: 12, paddingVertical: 9,
            borderRadius: 14,
            borderTopLeftRadius: isBot ? 4 : 14,
            borderTopRightRadius: isBot ? 14 : 4,
            borderLeftWidth: isBot ? 3 : 0,
            borderLeftColor: isBot ? '#9B59B6' : 'transparent',
          }}>
            <Text style={{ fontSize: 13, color: isBot ? COLORS.textPrimary : COLORS.white, lineHeight: 19 }}>
              {item.message}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000,
    }}>
      <View style={{
        width: '88%', maxWidth: 400, height: '100%',
        backgroundColor: COLORS.background,
        borderTopRightRadius: 24, borderBottomRightRadius: 24,
        elevation: 12, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 6, height: 0 },
        shadowOpacity: 0.2, shadowRadius: 14,
      }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 14, paddingTop: (StatusBar.currentHeight || 30) + 8, paddingBottom: 12,
          backgroundColor: '#9B59B6',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="hardware-chip-outline" size={20} color="#9B59B6" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                Asistente IA
              </Text>
              <Text style={{ fontSize: 11, color: '#E0D4F0' }}>
                ● En línea
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
          renderItem={renderMessage}
          style={{ flex: 1 }}
        />

        {/* Loading indicator */}
        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 6 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3E5F5', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9B59B6' }}>IA</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9B59B6', opacity: 0.4 }} />
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9B59B6', opacity: 0.6 }} />
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9B59B6', opacity: 0.8 }} />
            </View>
          </View>
        )}

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{
            flexDirection: 'row', padding: 10,
            borderTopWidth: 1, borderColor: COLORS.border,
            backgroundColor: COLORS.white, gap: 8,
          }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Pregúntale a la IA..."
              placeholderTextColor={COLORS.textTertiary}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              style={{
                flex: 1, backgroundColor: COLORS.background,
                borderRadius: 20, paddingHorizontal: 14,
                fontSize: 13, height: 40,
                borderWidth: 1, borderColor: COLORS.border,
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || loading}
              style={{
                backgroundColor: input.trim() ? '#9B59B6' : '#D1D5DB',
                borderRadius: 22, width: 42, height: 42,
                justifyContent: 'center', alignItems: 'center',
              }}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
