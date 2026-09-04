import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  FlatList, KeyboardAvoidingView, Platform, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';

const COLORS = {
  primary: '#E95A0C',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  border: '#E5E7EB',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
};
export default function ChatFlotante({ eventId, visible, onClose, userId, userName, userRole }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      userId: 0,
      userName: '🤖 Asistente IA',
      message: '¡Hola! Soy tu asistente virtual. Pregúntame sobre:\n\n• Horarios y fechas\n• Ubicación\n• Certificados\n• Costos\n• Inscripciones',
      esBot: true,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  // ✅ Verificar que eventId sea válido
  useEffect(() => {
    console.log('🔍 ChatFlotante - eventId:', eventId);
    console.log('🔍 ChatFlotante - userId:', userId);
  }, [eventId, userId]);

  const handleSend = async () => {
    const texto = input.trim();
    if (!texto) return;

    // Validar que tengamos un eventId válido
    if (!eventId || eventId === 'undefined' || eventId === 'null') {
      const errorMessage = {
        id: `error_${Date.now()}`,
        userId: 0,
        userName: '️ Sistema',
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
      // ✅ Enviar TODA la información del usuario
      const response = await fetch(`${API_BASE_URL}/chat/event/${eventId}/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: texto,
          userId: userId || 1,
          userName: userName || 'Usuario',
          userRole: userRole || 'academico',
          eventId: eventId // ✅ Asegurar que se envíe el eventId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Respuesta del backend:', data);
      
      const botMessage = {
        id: `bot_${Date.now()}`,
        userId: 0,
        userName: ' Asistente IA',
        message: data.respuesta || data.reply || 'Lo siento, no entendí. Prueba con "/ayuda"',
        esBot: true,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('❌ Error en ChatFlotante:', error);
      const errorMessage = {
        id: `error_${Date.now()}`,
        userId: 0,
        userName: '️ Error',
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
        flexDirection: 'row', 
        marginVertical: 4, 
        justifyContent: isBot ? 'flex-start' : 'flex-end' 
      }}>
        <View style={{ maxWidth: '85%' }}>
          {!isBot && (
            <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginBottom: 2, textAlign: 'right' }}>
              {item.userName}
            </Text>
          )}
          {isBot && (
            <Text style={{ fontSize: 9, color: '#9B59B6', fontWeight: '600', marginBottom: 2 }}>
              {item.userName}
            </Text>
          )}
          <View style={{
            backgroundColor: isBot ? '#F3E5F5' : '#E95A0C',
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 12,
            borderBottomLeftRadius: isBot ? 2 : 12,
            borderBottomRightRadius: isBot ? 12 : 2,
          }}>
            <Text style={{ fontSize: 12, color: isBot ? '#1F2937' : '#FFFFFF' }}>
              {item.message}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <TouchableWithoutFeedback>
            <View style={{
              position: 'absolute',
              bottom: 80,
              right: 20,
              width: 320,
              height: 450,
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 12, paddingVertical: 10,
                backgroundColor: '#9B59B6',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: '#FFFFFF',
                    justifyContent: 'center', alignItems: 'center'
                  }}>
                    <Ionicons name="hardware-chip-outline" size={20} color="#9B59B6" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                      Asistente IA
                    </Text>
                    <Text style={{ fontSize: 10, color: '#E0E0E0' }}>
                      ● En línea
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 10 }}
                renderItem={renderMessage}
                style={{ flex: 1 }}
              />

              {/* Input */}
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={{
                  flexDirection: 'row', padding: 10,
                  borderTopWidth: 1, borderColor: COLORS.border, gap: 6,
                }}>
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="Escribe..."
                    placeholderTextColor={COLORS.textSecondary}
                    style={{
                      flex: 1, backgroundColor: COLORS.background,
                      borderRadius: 20, paddingHorizontal: 12,
                      fontSize: 12, height: 36,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!input.trim() || loading}
                    style={{
                      backgroundColor: input.trim() ? '#E95A0C' : '#CCCCCC',
                      borderRadius: 20, width: 36, height: 36,
                      justifyContent: 'center', alignItems: 'center',
                    }}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}