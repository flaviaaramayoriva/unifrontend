import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  TextInput, KeyboardAvoidingView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import dayjs from 'dayjs';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

const COLORS = {
  primary: '#C44200', primaryLight: '#FFF0E6', secondary: '#0F172A',
  accent: '#EF4444', success: '#047857', warning: '#F59E0B',
  info: '#3B82F6', background: '#F6F7F9', surface: '#FFFFFF',
  textPrimary: '#1F2937', textSecondary: '#64748B', textTertiary: '#94A3B8',
  border: '#E6E9EF', divider: '#D1D5DB', shadow: 'rgba(0,0,0,0.05)',
  white: '#FFFFFF', black: '#000000',
};

const SALA_GENERAL = 'general';
const ROL_COLORS = { admin: '#FF6B35', creador: '#007AFF', logistica: '#34C759' };

const initialDe = (nombre) => (nombre || '?').trim().charAt(0).toUpperCase();

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const isEventActive = (ev) => {
  const dateStr = ev.fechaevento ?? ev.date ?? ev.fecha ?? ev.fechaInicio ?? null;
  if (!dateStr) return true;
  let eventDate;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    eventDate = dayjs(dateStr, 'YYYY-MM-DD');
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    eventDate = dayjs(dateStr, 'DD/MM/YYYY');
  } else {
    eventDate = dayjs(dateStr);
  }
  if (!eventDate.isValid()) return true;
  return eventDate.isSame(dayjs().startOf('day')) || eventDate.isAfter(dayjs().startOf('day'));
};

const Avatar = ({ nombre, color, size = 32 }) => (
  <View style={{
    width: size, height: size, borderRadius: size / 2,
    backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55',
    alignItems: 'center', justifyContent: 'center',
  }}>
    <Text style={{ fontSize: size * 0.42, fontWeight: '700', color }}>{initialDe(nombre)}</Text>
  </View>
);

const BurbujaAdmin = ({ item, myId, esPrimero }) => {
  if (item.system) return (
    <View style={{ alignItems: 'center', marginVertical: 6 }}>
      <Text style={{ fontSize: 11, color: '#b0b3bb', fontStyle: 'italic' }}>{item.text}</Text>
    </View>
  );

  const isBot = Boolean(item.esBot) || item.userId === 0;

  if (isBot) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: esPrimero ? 5 : 1, justifyContent: 'flex-start' }}>
        {esPrimero ? <Avatar nombre="IA" color="#9B59B6" /> : <View style={{ width: 32, height: 32 }} />}
        <View style={{ maxWidth: '76%' }}>
          {esPrimero && (
            <Text style={{ fontSize: 11, color: '#9B59B6', fontWeight: '700', marginBottom: 3, marginLeft: 4 }}>
              🤖 Asistente IA
            </Text>
          )}
          <View style={{
            backgroundColor: '#F3E5F5', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18,
            borderTopLeftRadius: esPrimero ? 5 : 18,
            borderLeftWidth: 3, borderLeftColor: '#9B59B6',
          }}>
            <Text style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 }}>{item.message}</Text>
          </View>
          <Text style={{ fontSize: 10, color: COLORS.textTertiary, marginTop: 2, marginLeft: 4 }}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }

  const isMe = String(item.userId) === String(myId);
  const color = ROL_COLORS[item.role] || COLORS.secondary;

  if (isMe) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginVertical: esPrimero ? 5 : 1 }}>
        <View style={{ maxWidth: '76%', alignItems: 'flex-end' }}>
          <View style={{
            backgroundColor: COLORS.primary, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18,
            borderBottomRightRadius: esPrimero ? 5 : 18,
          }}>
            <Text style={{ fontSize: 14, color: '#fff', lineHeight: 20 }}>{item.message}</Text>
          </View>
          <Text style={{ fontSize: 10, color: COLORS.textTertiary, marginTop: 2, marginRight: 4 }}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: esPrimero ? 5 : 1, justifyContent: 'flex-start' }}>
      {esPrimero ? <Avatar nombre={item.userName} color={color} /> : <View style={{ width: 32, height: 32 }} />}
      <View style={{ maxWidth: '76%' }}>
        {esPrimero && (
          <Text style={{ fontSize: 11, color, fontWeight: '700', marginBottom: 3, marginLeft: 4 }}>
            {item.userName || 'Usuario'}
          </Text>
        )}
        <View style={{
          backgroundColor: COLORS.white, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18,
          borderTopLeftRadius: esPrimero ? 5 : 18,
          borderWidth: 1, borderColor: COLORS.border,
        }}>
          <Text style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 }}>{item.message}</Text>
        </View>
        <Text style={{ fontSize: 10, color: COLORS.textTertiary, marginTop: 2, marginLeft: 4 }}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const InputPanelAdmin = ({ input, setInput, onSend, connected }) => {
  const disabled = !input.trim() || !connected;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.border,
      }}>
        <View style={{
          flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22,
          paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 5,
          maxHeight: 110,
        }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={connected ? 'Escribe un mensaje...' : 'Conectando...'}
            placeholderTextColor={COLORS.textTertiary}
            accessibilityLabel="Escribe un mensaje"
            editable={connected}
            multiline
            style={{ fontSize: 14, color: COLORS.textPrimary, maxHeight: 100, padding: 0 }}
          />
        </View>
        <TouchableOpacity
          onPress={onSend}
          disabled={disabled}
          activeOpacity={0.7}
          style={{
            width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
            backgroundColor: disabled ? COLORS.border : COLORS.primary,
          }}
        >
          <Ionicons name="send" size={17} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const ChatEmbed = ({ userId, userRole, userName, onRoomChange }) => {
  const [vista, setVista]           = useState('eventos'); // 'eventos' | 'chat'
  const [eventos, setEventos]       = useState([]);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [eventoActual, setEventoActual]     = useState(null); // null = chat general
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [connected, setConnected]   = useState(false);
  const [botTyping, setBotTyping]   = useState(false);
  const [usuarios, setUsuarios]     = useState([]);
  const socketRef   = useRef(null);
  const flatListRef = useRef(null);
  const ioRef       = useRef(null);
  const salaRef     = useRef(SALA_GENERAL);
  const onRoomChangeRef = useRef(onRoomChange);

  useEffect(() => { onRoomChangeRef.current = onRoomChange; }, [onRoomChange]);
  useEffect(() => { onRoomChangeRef.current && onRoomChangeRef.current(null); }, []);

  useEffect(() => {
    const cargarEventos = async () => {
      try {
        const token = Platform.OS === 'web'
          ? sessionStorage.getItem('adminAuthToken')
          : await SecureStore.getItemAsync('adminAuthToken');

        const res = await fetch(`${API_BASE_URL}/eventos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const aprobados = Array.isArray(data)
          ? data.filter(e => e.estado === 'aprobado' && isEventActive(e))
          : [];
        setEventos(aprobados);
      } catch (e) {
        console.warn('Error cargando eventos:', e.message);
      } finally {
        setLoadingEventos(false);
      }
    };
    cargarEventos();
  }, []);

  const conectarSala = (eventoId) => {
    salaRef.current = String(eventoId);
    onRoomChangeRef.current && onRoomChangeRef.current(String(eventoId));
    setMessages([]);
    setVista('chat');

    import('socket.io-client').then(mod => {
      ioRef.current = mod.io || mod.default;

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = ioRef.current(API_BASE_URL, {
        transports: Platform.OS === 'web' ? ['polling', 'websocket'] : ['websocket']
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join_event', {
          eventoId: String(eventoId),
          userId,
          role: userRole,
          userName: userName || userId
        });
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on('history', (h) => {
        setMessages(h.map((m, i) => ({ ...m, id: `h_${i}` })));
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      });

      socket.on('receive_message', (msg) => {
        setMessages(prev => [...prev, { ...msg, id: `m_${Date.now()}` }]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('user_list', (l) => {
        setUsuarios(l || []);
      });

      socket.on('user_joined', (u) => {
        setUsuarios(prev => prev.some(x => String(x.userId) === String(u.userId)) ? prev : [...prev, u]);
      });

      socket.on('user_left', (u) => {
        setUsuarios(prev => prev.filter(x => String(x.userId) !== String(u.userId)));
      });

      socket.on('bot_typing', () => {
        setBotTyping(true);
        setTimeout(() => setBotTyping(false), 2000);
      });
    });
  };

  const abrirChat = (evento) => {
    setEventoActual(evento);
    conectarSala(evento.idevento || evento.id);
  };

  const abrirGeneral = () => {
    setEventoActual(null);
    conectarSala(SALA_GENERAL);
  };

  const volverAEventos = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_event', { eventoId: salaRef.current });
      socketRef.current.disconnect();
    }
    onRoomChangeRef.current && onRoomChangeRef.current(null);
    setVista('eventos');
    setConnected(false);
    setMessages([]);
  };

  const handleSend = () => {
    const texto = input.trim();
    if (!texto || !socketRef.current?.connected) return;
    socketRef.current.emit('send_message', {
      eventoId: salaRef.current,
      userId, role: userRole, userName: userName || userId, message: texto
    });
    setInput('');
  };

  if (vista === 'eventos') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <View style={{ padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10 }}>
            Selecciona un evento o vuelve al chat general
          </Text>
          <TouchableOpacity
            onPress={abrirGeneral}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: COLORS.primaryLight, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 10,
            }}
          >
            <Ionicons name="chatbubbles" size={18} color={COLORS.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary }}>Ir al Chat General</Text>
          </TouchableOpacity>
        </View>

        {loadingEventos ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : eventos.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Ionicons name="calendar-outline" size={40} color="#ccc" />
            <Text style={{ color: '#aaa', marginTop: 10, textAlign: 'center' }}>
              No hay eventos aprobados disponibles
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 12 }}>
            {eventos.map((evento) => (
              <TouchableOpacity
                key={evento.idevento || evento.id}
                onPress={() => abrirChat(evento)}
                style={{
                  backgroundColor: '#fff', borderRadius: 12, padding: 14,
                  marginBottom: 10, flexDirection: 'row', alignItems: 'center',
                  borderLeftWidth: 4, borderLeftColor: COLORS.primary,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>
                    {evento.nombreevento || 'Sin nombre'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#888' }}>
                    {evento.fechaevento?.split('T')[0] || '–'} · {evento.lugarevento || '–'}
                  </Text>
                  {evento.Comite && evento.Comite.length > 0 && (
                    <Text style={{ fontSize: 11, color: COLORS.primary, marginTop: 4 }}>
                      👥 {evento.Comite.length} miembro{evento.Comite.length > 1 ? 's' : ''} en el comité
                    </Text>
                  )}
                </View>
                <Ionicons name="chatbubbles-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  const statusText = connected
    ? `${eventoActual ? `${(eventoActual.Comite || []).length} miembros` : 'Todos los usuarios'}${usuarios.length ? ` · ${usuarios.length} en línea` : ''}`
    : 'Conectando...';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 10, paddingVertical: 10,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.border,
      }}>
        <TouchableOpacity
          onPress={volverAEventos}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: COLORS.primaryLight,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={{
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: COLORS.primaryLight,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.textPrimary }} numberOfLines={1}>
            {eventoActual ? (eventoActual.nombreevento || 'Evento') : 'Chat General'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: connected ? COLORS.success : COLORS.accent,
            }} />
            <Text style={{ fontSize: 11, color: COLORS.textTertiary }} numberOfLines={1}>
              {statusText}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const esPrimero = !prev
            || String(prev.userId) !== String(item.userId)
            || Boolean(prev.esBot) !== Boolean(item.esBot);
          return <BurbujaAdmin item={item} myId={userId} esPrimero={esPrimero} />;
        }}
        ListFooterComponent={
          botTyping ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, gap: 6 }}>
              <ActivityIndicator size="small" color="#9B59B6" />
              <Text style={{ fontSize: 12, color: '#9B59B6' }}>🤖 Asistente IA está escribiendo...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
            }}>
              <Ionicons name="chatbubbles-outline" size={34} color="#d3d6dc" />
            </View>
            <Text style={{ color: '#a6aab2', fontSize: 13, marginTop: 12 }}>
              {connected ? 'Aún no hay mensajes. ¡Escribe el primero!' : 'Conectando al chat...'}
            </Text>
          </View>
        }
      />

      <InputPanelAdmin input={input} setInput={setInput} onSend={handleSend} connected={connected} />
    </View>
  );
};

export default ChatEmbed;