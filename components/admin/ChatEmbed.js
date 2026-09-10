import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY    = 'adminAuthToken';

const COLORS = {
  primary: '#C44200', primaryLight: '#FFEDD5',
  success: '#047857', warning: '#F59E0B',
  accent: '#EF4444',  secondary: '#4B5563',
  surface: '#FFFFFF', background: '#F4F7F9',
  border: '#E6E9EF',  textPrimary: '#1F2937',
  textSecondary: '#6B7280', textTertiary: '#9CA3AF',
  white: '#FFFFFF',
};

const ROL_COLORS = {
  admin: '#FF6B35', creador: '#007AFF',
  logistica: '#34C759', academico: '#9B59B6',
};

const getToken = async () => {
  if (Platform.OS === 'web') return sessionStorage.getItem(TOKEN_KEY);
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

const initialDe = (nombre) => (nombre || '?').trim().charAt(0).toUpperCase();

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const fechaStr = (e) => {
  const v = e?.fechaevento || e?.fechaEvento || '';
  return String(v).split('T')[0];
};

const hoyStr = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const roomPrivadaId = (a, b) => 'private_' + [String(a), String(b)].map(Number).sort((x, y) => x - y).join('_');

const formatearFecha = (f) => {
  const s = (f || '').toString().split('T')[0];
  if (s.length !== 10) return 'Fecha por definir';
  const [y, m, d] = s.split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  if (!y || !m || !d) return 'Fecha por definir';
  return `${String(d).padStart(2, '0')} ${meses[m - 1]} ${y}`;
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

const Burbuja = ({ item, myId, esPrimero }) => {
  if (item.system) return (
    <View style={{ alignItems: 'center', marginVertical: 6 }}>
      <Text style={{ fontSize: 11, color: '#b0b3bb', fontStyle: 'italic' }}>{item.text}</Text>
    </View>
  );

  const isBot = Boolean(item.esBot) || item.userId === 0;

  if (isBot) return (
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

  const isMe = String(item.userId) === String(myId);
  const color = ROL_COLORS[item.role] || COLORS.secondary;

  if (isMe) return (
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

const InputPanel = ({ input, setInput, onSend, connected }) => {
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

const VistaChat = ({ eventoId, titulo, subtitulo, roomId, userId, userRole, userName, onVolver, onRoomChange }) => {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [connected, setConnected] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [usuarios, setUsuarios]   = useState([]);
  const socketRef  = useRef(null);
  const flatRef    = useRef(null);

  const roomIdRef   = useRef(roomId);
  const userIdRef   = useRef(userId);
  const userRoleRef = useRef(userRole);
  const userNameRef = useRef(userName);
  const eventoIdRef = useRef(eventoId);

  useEffect(() => {
    roomIdRef.current = roomId;
    userIdRef.current = userId;
    userRoleRef.current = userRole;
    userNameRef.current = userName;
    eventoIdRef.current = eventoId;
  }, [roomId, userId, userRole, userName, eventoId]);

  useEffect(() => {
    let socket;
    let isMounted = true;

    const initSocket = async () => {
      const _roomId   = roomIdRef.current;
      const _userId   = userIdRef.current;
      const _userRole = userRoleRef.current;
      const _userName = userNameRef.current;
      const _eventoId = eventoIdRef.current;

      const mod = await import('socket.io-client');
      const io = mod.io || mod.default;

      socket = io(API_BASE_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 20000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (!isMounted) return;
        setConnected(true);

        if (_roomId.startsWith('private_')) {
          socket.emit('join_private', { roomId: _roomId, userId: _userId, userName: _userName });
        } else {
          socket.emit('join_event', {
            eventoId: String(_eventoId),
            userId: _userId,
            role: _userRole,
            userName: _userName
          });
        }
      });

      socket.on('history', (h) => {
        if (!isMounted) return;
        if (h.length > 0) {
          setMessages(h.map((m, i) => ({ ...m, id: `h_${i}` })));
        }
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      });

      socket.on('receive_message', (msg) => {
        if (!isMounted) return;
        setMessages(prev => [...prev, { ...msg, id: `m_${Date.now()}_${Math.random()}` }]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('private_message', (msg) => {
        if (!isMounted) return;
        setMessages(prev => [...prev, { ...msg, id: `p_${Date.now()}_${Math.random()}` }]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('user_list', (l) => {
        if (isMounted) setUsuarios(l || []);
      });

      socket.on('user_joined', (u) => {
        if (!isMounted) return;
        setUsuarios(prev => prev.some(x => String(x.userId) === String(u.userId)) ? prev : [...prev, u]);
      });

      socket.on('user_left', (u) => {
        if (!isMounted) return;
        setUsuarios(prev => prev.filter(x => String(x.userId) !== String(u.userId)));
      });

      socket.on('bot_typing', () => {
        if (!isMounted) return;
        setBotTyping(true);
        setTimeout(() => setBotTyping(false), 2000);
      });

      socket.on('connect_error', () => {
        if (isMounted) setConnected(false);
      });

      socket.on('disconnect', () => {
        if (isMounted) setConnected(false);
      });

      socket.on('error', (e) => {
        Alert.alert('Error', e.message || 'Error en el chat');
      });
    };

    initSocket();

    return () => {
      isMounted = false;
      if (socket) {
        const _roomId = roomIdRef.current;
        const _eventoId = eventoIdRef.current;

        if (_roomId.startsWith('private_')) {
          socket.emit('leave_private', { roomId: _roomId });
        } else {
          socket.emit('leave_event', { eventoId: String(_eventoId) });
        }
        socket.disconnect();
      }
    };
  }, [roomId, eventoId]);

  useEffect(() => {
    onRoomChange && onRoomChange(roomId);
    return () => onRoomChange && onRoomChange(null);
  }, [roomId]);

  const handleSend = () => {
    const texto = input.trim();
    if (!texto) return;

    if (!socketRef.current?.connected) {
      Alert.alert('Error', 'No hay conexión con el servidor de chat');
      return;
    }

    const _roomId = roomIdRef.current;
    const _userId = userIdRef.current;
    const _userRole = userRoleRef.current;
    const _userName = userNameRef.current;
    const _eventoId = eventoIdRef.current;

    if (_roomId.startsWith('private_')) {
      socketRef.current.emit('send_private', {
        roomId: _roomId,
        userId: _userId,
        userName: _userName,
        role: _userRole,
        message: texto
      });
    } else {
      socketRef.current.emit('send_message', {
        eventoId: String(_eventoId),
        userId: _userId,
        role: _userRole,
        userName: _userName,
        message: texto
      });
    }

    setInput('');
  };

  const esPrivado = roomId.startsWith('private_');
  const statusText = connected
    ? `${subtitulo}${usuarios.length ? ` · ${usuarios.length} en línea` : ''}`
    : 'Conectando...';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 10, paddingVertical: 10,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.border,
      }}>
        <TouchableOpacity
          onPress={onVolver}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: COLORS.primaryLight,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {esPrivado
          ? <Avatar nombre={titulo} color={COLORS.primary} size={38} />
          : (
            <View style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: COLORS.primaryLight,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
            </View>
          )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.textPrimary }} numberOfLines={1}>
            {titulo}
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
        ref={flatRef}
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
          return <Burbuja item={item} myId={userId} esPrimero={esPrimero} />;
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

      <InputPanel input={input} setInput={setInput} onSend={handleSend} connected={connected} />
    </View>
  );
};

const VistaEvento = ({ evento, userId, userRole, userName, onVolver, onRoomChange }) => {
  const [tab, setTab]         = useState('grupal');
  const [chatPrivado, setChatPrivado] = useState(null);

  const creadorId = String(evento.idacademico);
  const miembrosComite = (evento.Comite || []).filter(m => String(m.idusuario) !== String(userId));

  const miembros = String(userId) !== creadorId
    ? [...miembrosComite, { idusuario: creadorId, nombre: 'Creador del evento', rol_comite: 'creador' }]
    : miembrosComite;

  if (chatPrivado) {
    const roomId = 'private_' + [userId, chatPrivado.idusuario]
      .map(String)
      .map(Number)
      .sort((a, b) => a - b)
      .join('_');

    return (
      <VistaChat
        eventoId={evento.idevento}
        titulo={chatPrivado.nombre || chatPrivado.usuario?.nombre || `Usuario ${chatPrivado.idusuario}`}
        subtitulo="Chat privado"
        roomId={roomId}
        userId={userId} userRole={userRole} userName={userName}
        onRoomChange={onRoomChange}
        onVolver={() => setChatPrivado(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.border,
      }}>
        <TouchableOpacity onPress={onVolver} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }} numberOfLines={1}>
          {evento.nombreevento || 'Evento'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.border }}>
        {[
          { id: 'grupal',   label: 'Chat',     icon: 'chatbubbles-outline' },
          { id: 'miembros', label: 'Miembros', icon: 'people-outline' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTab(t.id)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 12,
              borderBottomWidth: tab === t.id ? 2 : 0,
              borderBottomColor: COLORS.primary,
            }}
          >
            <Ionicons name={t.icon} size={16} color={tab === t.id ? COLORS.primary : COLORS.textTertiary} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: tab === t.id ? COLORS.primary : COLORS.textTertiary }} numberOfLines={1}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'grupal' ? (
        <VistaChat
          eventoId={evento.idevento}
          titulo={`#${evento.nombreevento}`}
          subtitulo={`${(evento.Comite || []).length} miembros`}
          roomId={String(evento.idevento)}
          userId={userId} userRole={userRole} userName={userName}
          onRoomChange={onRoomChange}
          onVolver={onVolver}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {miembros.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Ionicons name="people-outline" size={40} color="#d3d6dc" />
              <Text style={{ color: '#a6aab2', fontSize: 13, marginTop: 8 }}>No hay otros miembros</Text>
            </View>
          ) : (
            miembros.map((m) => {
              const nombre = m.nombre || m.usuario?.nombre || `Usuario ${m.idusuario}`;
              const apellido = m.apellidopat || m.usuario?.apellidopat || '';
              const rol = m.rol_comite || m.role || 'miembro';
              const colorRol = ROL_COLORS[rol] || COLORS.secondary;

              return (
                <TouchableOpacity
                  key={m.idusuario}
                  onPress={() => setChatPrivado(m)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: COLORS.white, borderRadius: 12,
                    padding: 14, marginBottom: 8,
                    shadowColor: '#000', shadowOpacity: 0.04,
                    shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 1,
                  }}
                >
                  <Avatar nombre={`${nombre} ${apellido}`} color={colorRol} size={44} />

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>
                      {nombre} {apellido}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colorRol }} />
                      <Text style={{ fontSize: 11, color: COLORS.textTertiary, textTransform: 'capitalize' }}>{rol}</Text>
                    </View>
                  </View>

                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: COLORS.primaryLight, borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 6,
                  }}>
                    <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary }}>Mensaje</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const ChatEmbed = ({ userId, userRole, userName, onRoomChange, noLeidos = {}, activeRoom = null }) => {
  const [tabMain, setTabMain]           = useState('grupo'); // 'grupo' | 'personal'
  const [vista, setVista]               = useState('eventos'); // 'chat' (general) | 'eventos'
  const [eventos, setEventos]           = useState([]);
  const [contactos, setContactos]       = useState([]);
  const [loadingEventos, setLoading]    = useState(true);
  const [eventoActual, setEventoActual] = useState(null);
  const [chatPrivado, setChatPrivado]   = useState(null);
  const [abriendoEvento, setAbriendoEvento] = useState(false);
  const [aviso, setAviso]               = useState(null);
  const avisoTimer = useRef(null);
  const activeRoomRef = useRef(activeRoom);

  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  useEffect(() => {
    if (!userId) return;
    let activo = true;
    let socket;
    const init = async () => {
      try {
        const token = await getToken();
        const mod = await import('socket.io-client');
        const io = mod.io || mod.default;
        socket = io(API_BASE_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          timeout: 20000,
        });
        socket.on('connect', () => socket.emit('register_user', { userId }));
        socket.on('chat_notification', (n) => {
          if (!activo) return;
          const cur = activeRoomRef.current;
          if (cur && String(n.roomId) === String(cur)) return;
          if (String(n.userId) === String(userId)) return;
          setAviso({ ...n, userId: n.userId, userName: n.userName, roomId: n.roomId, roomName: n.roomName, type: n.type, message: n.message });
          clearTimeout(avisoTimer.current);
          avisoTimer.current = setTimeout(() => setAviso(null), 4000);
        });
      } catch (e) {
        console.warn('ChatEmbed: error escuchando notificaciones', e && e.message);
      }
    };
    init();
    return () => { activo = false; if (socket) socket.disconnect(); clearTimeout(avisoTimer.current); };
  }, [userId]);

  const irAEvento = async (id) => {
    const ev = eventos.find(e => String(e.idevento) === String(id));
    if (ev) { abrirEvento(ev); return; }
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/eventos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detalle = await res.json();
      setEventoActual(detalle);
    } catch (e) {
      console.warn('ChatEmbed: no se pudo abrir evento del aviso', e && e.message);
    }
  };

  const abrirAviso = () => {
    if (!aviso) return;
    const roomId = String(aviso.roomId);
    setAviso(null);
    if (roomId === 'general') { setVista('chat'); setEventoActual(null); setChatPrivado(null); return; }
    if (roomId.startsWith('private_')) {
      setChatPrivado({ idusuario: String(aviso.userId), nombre: aviso.userName || 'Usuario', roomId });
      return;
    }
    irAEvento(roomId);
  };

  const tabUnreads = {
    grupo: Object.keys(noLeidos).reduce((acc, k) => acc + (k.startsWith('private_') ? 0 : (noLeidos[k] || 0)), 0),
    personal: Object.keys(noLeidos).reduce((acc, k) => acc + (k.startsWith('private_') ? (noLeidos[k] || 0) : 0), 0),
  };

  const onRoomChangeRef = useRef(onRoomChange);
  useEffect(() => { onRoomChangeRef.current = onRoomChange; }, [onRoomChange]);

  useEffect(() => {
    if (eventoActual || chatPrivado) return;
    onRoomChangeRef.current && onRoomChangeRef.current(vista === 'chat' ? 'general' : null);
  }, [vista, eventoActual, chatPrivado]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const token = await getToken();

        const [resComite, resCreados] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/my-committee-events`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/eventos`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        const dataComite = await resComite.json();
        const dataCreados = await resCreados.json();
        const eventosComite = dataComite.events || [];

        const hoy = hoyStr();
        const esFuturo = (e) => {
          const s = fechaStr(e);
          return s.length === 10 && s >= hoy;
        };

        const eventosComiteFuturos = eventosComite.filter(esFuturo);

        const eventosCreados = Array.isArray(dataCreados)
          ? dataCreados.filter(e => {
            return e.estado === 'aprobado'
              && String(e.idacademico) === String(userId)
              && esFuturo(e);
          })
          : [];

        const idsVistos = new Set();
        const eventosUnicos = [...eventosComiteFuturos, ...eventosCreados]
          .filter(e => {
            if (idsVistos.has(e.idevento)) return false;
            idsVistos.add(e.idevento);
            return true;
          })
          .sort((a, b) => (fechaStr(a) || '9999').localeCompare(fechaStr(b) || '9999'));

        setEventos(eventosUnicos);

        const mapContactos = new Map();
        eventosUnicos.forEach((ev) => {
          const comite = ev.Comite || ev.comite || [];
          comite.forEach((m) => {
            const idC = String(m.idusuario);
            if (idC !== String(userId) && !mapContactos.has(idC)) {
              mapContactos.set(idC, { idusuario: idC, nombre: m.nombre || m.usuario?.nombre, apellidopat: m.apellidopat || m.usuario?.apellidopat, rol_comite: m.rol_comite || m.role || 'miembro' });
            }
          });
          if (ev.idacademico && String(ev.idacademico) !== String(userId)) {
            const idA = String(ev.idacademico);
            if (!mapContactos.has(idA)) {
              mapContactos.set(idA, { idusuario: idA, nombre: 'Creador del evento', apellidopat: '', rol_comite: 'creador' });
            }
          }
        });
        setContactos(Array.from(mapContactos.values()));
      } catch (e) {
        Alert.alert('Error', 'No se pudieron cargar los chats');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [userId]);

  const abrirEvento = async (evento) => {
    setAbriendoEvento(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/eventos/${evento.idevento}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detalle = await res.json();
      setEventoActual(detalle);
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir el evento');
    } finally {
      setAbriendoEvento(false);
    }
  };

  const abrirPrivado = (contacto) => {
    const roomId = roomPrivadaId(userId, contacto.idusuario);
    setChatPrivado({ ...contacto, roomId });
  };

  let contenido = null;
  if (eventoActual) {
    contenido = (
      <VistaEvento
        evento={eventoActual}
        userId={userId} userRole={userRole} userName={userName}
        onRoomChange={onRoomChangeRef.current}
        onVolver={() => { setVista('eventos'); setEventoActual(null); }}
      />
    );
  }

  if (chatPrivado) {
    contenido = (
      <VistaChat
        eventoId={chatPrivado.idusuario}
        titulo={chatPrivado.nombre || `Usuario ${chatPrivado.idusuario}`}
        subtitulo="Chat privado"
        roomId={chatPrivado.roomId}
        userId={userId} userRole={userRole} userName={userName}
        onRoomChange={onRoomChangeRef.current}
        onVolver={() => setChatPrivado(null)}
      />
    );
  }

  if (vista === 'chat') {
    contenido = (
      <VistaChat
        eventoId="general"
        titulo="Chat General"
        subtitulo="Todos los usuarios de la plataforma"
        roomId="general"
        userId={userId} userRole={userRole} userName={userName}
        onRoomChange={onRoomChangeRef.current}
        onVolver={() => setVista('eventos')}
      />
    );
  }

  if (!eventoActual && !chatPrivado && vista !== 'chat') {
    contenido = (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{
        flexDirection: 'row', backgroundColor: COLORS.white,
        borderBottomWidth: 1, borderColor: COLORS.border,
      }}>
        {[
          { id: 'grupo',    label: 'Grupo',    icon: 'chatbubbles-outline' },
          { id: 'personal', label: 'Personal', icon: 'person-outline' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTabMain(t.id)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 12,
              borderBottomWidth: tabMain === t.id ? 2 : 0,
              borderBottomColor: COLORS.primary,
            }}
          >
            <Ionicons name={t.icon} size={16} color={tabMain === t.id ? COLORS.primary : COLORS.textTertiary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: tabMain === t.id ? COLORS.primary : COLORS.textTertiary }}>
              {t.label}
            </Text>
            {(tabUnreads[t.id] || 0) > 0 && (
              <View style={{
                minWidth: 18, height: 18, borderRadius: 9,
                backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 4,
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                  {tabUnreads[t.id] > 99 ? '99+' : tabUnreads[t.id]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loadingEventos ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : tabMain === 'personal' ? (
        contactos.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
            }}>
              <Ionicons name="person-outline" size={34} color="#d3d6dc" />
            </View>
            <Text style={{ color: '#a6aab2', marginTop: 12, textAlign: 'center' }}>
              No tienes contactos aún
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 12 }}>
            {contactos.map((c) => {
              const nombre = c.nombre || `Usuario ${c.idusuario}`;
              const apellido = c.apellidopat || '';
              const rol = c.rol_comite || 'miembro';
              const colorRol = ROL_COLORS[rol] || COLORS.secondary;
              const pendPriv = noLeidos[roomPrivadaId(userId, c.idusuario)] || 0;
              return (
                <TouchableOpacity
                  key={c.idusuario}
                  onPress={() => abrirPrivado(c)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: COLORS.white, borderRadius: 12,
                    padding: 14, marginBottom: 8,
                    shadowColor: '#000', shadowOpacity: 0.04,
                    shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 1,
                  }}
                >
                  <Avatar nombre={`${nombre} ${apellido}`} color={colorRol} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>
                      {nombre} {apellido}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colorRol }} />
                      <Text style={{ fontSize: 11, color: COLORS.textTertiary, textTransform: 'capitalize' }}>{rol}</Text>
                    </View>
                  </View>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: COLORS.primaryLight, borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 6,
                  }}>
                    <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary }}>Mensaje</Text>
                  </View>
                  {pendPriv > 0 && (
                    <View style={{
                      minWidth: 20, height: 20, borderRadius: 10,
                      backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
                      paddingHorizontal: 5,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                        {pendPriv > 99 ? '99+' : pendPriv}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{
            padding: 14, backgroundColor: COLORS.background,
          }}>
            <TouchableOpacity
              onPress={() => { setVista('chat'); setEventoActual(null); setChatPrivado(null); }}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: COLORS.primaryLight, borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10,
              }}
            >
              <Ionicons name="chatbubbles" size={18} color={COLORS.primary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary }}>Ir al Chat General</Text>
              {(noLeidos['general'] || 0) > 0 && (
                <View style={{
                  minWidth: 20, height: 20, borderRadius: 10,
                  backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 5,
                }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                    {noLeidos['general'] > 99 ? '99+' : noLeidos['general']}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {abriendoEvento && (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(255,255,255,0.6)', zIndex: 10,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}

          {eventos.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
              }}>
                <Ionicons name="calendar-outline" size={34} color="#d3d6dc" />
              </View>
              <Text style={{ color: '#a6aab2', marginTop: 12, textAlign: 'center' }}>
                No tienes eventos próximos
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 }}>
                Tus eventos
              </Text>
              {eventos.map((evento) => {
                const comite = evento.Comite || evento.comite || [];
                const nMiembros = comite.length;
                const esHoy = fechaStr(evento) === hoyStr();
                const pendEvento = noLeidos[String(evento.idevento)] || 0;

                return (
                  <TouchableOpacity
                    key={evento.idevento}
                    onPress={() => abrirEvento(evento)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: pendEvento > 0 ? '#FFF7ED' : COLORS.white, borderRadius: 14, padding: 12,
                      marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
                      borderLeftWidth: 4, borderLeftColor: pendEvento > 0 ? '#DC2626' : COLORS.primary,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                    }}
                  >
                    {pendEvento > 0 && (
                      <View style={{
                        position: 'absolute', top: 0, right: 0,
                        backgroundColor: '#DC2626', borderTopRightRadius: 14, borderBottomLeftRadius: 10,
                        paddingHorizontal: 10, paddingVertical: 4,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                          {pendEvento} nuevo{pendEvento !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                    <View style={{
                      width: 46, height: 46, borderRadius: 12,
                      backgroundColor: esHoy ? '#FFF7ED' : COLORS.primaryLight,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="calendar" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 }} numberOfLines={1}>
                        {evento.nombreevento || 'Sin nombre'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
                        <Text style={{ fontSize: 12, color: COLORS.textSecondary }} numberOfLines={1}>
                          {formatearFecha(fechaStr(evento))} {esHoy ? '· Hoy' : ''}
                        </Text>
                      </View>
                      {evento.lugarevento ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Ionicons name="location-outline" size={12} color={COLORS.textTertiary} />
                          <Text style={{ fontSize: 12, color: COLORS.textTertiary }} numberOfLines={1}>
                            {evento.lugarevento}
                          </Text>
                        </View>
                      ) : null}
                      {pendEvento > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
                          <Ionicons name="chatbubble" size={12} color="#DC2626" />
                          <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>
                            {pendEvento} mensaje{pendEvento !== 1 ? 's' : ''} nuevo{pendEvento !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      {nMiembros > 0 && (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: COLORS.primaryLight, borderRadius: 12,
                          paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                          <Ionicons name="people-outline" size={11} color={COLORS.primary} />
                          <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '700' }}>{nMiembros}</Text>
                        </View>
                      )}
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: COLORS.primary, borderRadius: 16,
                        paddingHorizontal: 10, paddingVertical: 5,
                      }}>
                        <Ionicons name="chatbubbles-outline" size={13} color="#fff" />
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>Abrir</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <Text style={{ textAlign: 'center', color: '#a6aab2', fontSize: 11, marginVertical: 6 }}>
                {eventos.length > 0 ? 'Solo se muestran eventos próximos' : ''}
              </Text>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
  }

  return (
    <View style={{ flex: 1 }}>
      {contenido}
      {aviso && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={abrirAviso}
          style={{
            position: 'absolute', top: 8, left: 8, right: 8, zIndex: 60,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            padding: 12, borderRadius: 14, backgroundColor: '#1F2937',
            borderLeftWidth: 4,
            borderLeftColor: aviso.type === 'private' ? '#3B82F6' : aviso.type === 'general' ? '#F59E0B' : COLORS.primary,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
          }}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: aviso.type === 'private' ? '#3B82F6' : '#C44200',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name={aviso.type === 'private' ? 'person' : 'megaphone'} size={17} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
              {aviso.type === 'private' ? `Mensaje de ${aviso.userName}` : `Nuevo mensaje en ${aviso.roomName || (aviso.type === 'general' ? 'Chat General' : 'evento')}`}
            </Text>
            <Text style={{ color: '#cbd5e1', fontSize: 13 }} numberOfLines={1}>{aviso.message}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ChatEmbed;