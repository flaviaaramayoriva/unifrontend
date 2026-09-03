import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants/colors'; // Ajusta la ruta si es necesario

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';

export default function AsistenteIAScreen() {
  const { eventId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  // Mensaje de bienvenida del bot
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        userId: 0,
        userName: '🤖 Asistente IA',
        message: '¡Hola! Soy tu asistente virtual. Puedo ayudarte con:\n\n• 🕐 Horarios y fechas del evento\n• 📍 Ubicación y lugar\n•  Certificados y requisitos\n• 💰 Costos e inscripciones\n• 📋 Información general\n\n¡Pregúntame lo que necesites!',
        esBot: true,
        timestamp: new Date().toISOString()
      }
    ]);
    setLoading(false);
  }, []);

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

    // Simular que el bot está "pensando"
    setTimeout(async () => {
      try {
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
          userName: ' Asistente IA',
          message: data.respuesta || 'Lo siento, no entendí tu pregunta. ¿Puedes reformularla?',
          esBot: true,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', 'No se pudo conectar con el asistente');
      }
    }, 500);
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
          <View style={{
            backgroundColor: isBot ? '#F3E5F5' : COLORS.primary,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            borderBottomLeftRadius: isBot ? 2 : 16,
            borderBottomRightRadius: isBot ? 16 : 2,
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
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.border,
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
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{
          flexDirection: 'row', padding: 12, backgroundColor: COLORS.white,
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
            disabled={!input.trim()}
            style={{
              backgroundColor: input.trim() ? COLORS.primary : COLORS.textTertiary,
              borderRadius: 24, width: 44, height: 44,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}