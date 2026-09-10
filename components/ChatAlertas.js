import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY    = 'adminAuthToken';

const getToken = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

const audioStates = {};

const sonarNotificacion = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    let ctx = audioStates.ctx;
    if (!ctx) { ctx = new Ctx(); audioStates.ctx = ctx; }
    if (ctx.state === 'suspended') ctx.resume();

    const notas = [
      { f: 659.25, t: 0 },
      { f: 880, t: 0.09 },
      { f: 1046.5, t: 0.18 },
    ];
    notas.forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const start = ctx.currentTime + t;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  } catch (e) {}
};

const notificacionNavegador = (titulo, cuerpo) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(titulo, {
      body: cuerpo,
      tag: 'chat_' + Date.now(),
      silent: true,
    });
    n.onclick = () => {
      window.focus();
      if (n.close) n.close();
    };
    setTimeout(() => { if (n.close) n.close(); }, 8000);
  } catch (e) {}
};

export default function ChatAlertas({ userId, userRole, userName, activeRoom = null, chatAbierto = false, onAbrir, onUnread = null }) {
  const [alertas, setAlertas] = useState([]);
  const stateRef = useRef({ activeRoom, chatAbierto });
  const onUnreadRef = useRef(onUnread);

  useEffect(() => {
    stateRef.current = { activeRoom, chatAbierto };
  }, [activeRoom, chatAbierto]);

  useEffect(() => {
    onUnreadRef.current = onUnread;
  }, [onUnread]);

  const quitar = (id) => setAlertas(prev => prev.filter(a => a.localId !== id));

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

        socket.on('connect', () => {
          socket.emit('register_user', { userId });
        });

        socket.on('chat_notification', (n) => {
          if (!activo) return;
          const st = stateRef.current;
          if (st.chatAbierto && st.activeRoom && String(n.roomId) === String(st.activeRoom)) return;
          if (String(n.userId) === String(userId)) return;

          if (onUnreadRef.current) {
            try { onUnreadRef.current(n); } catch (e) {}
          }

          const localId = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          setAlertas(prev => [...prev, { ...n, localId }].slice(-3));
          setTimeout(() => quitar(localId), 6000);
          sonarNotificacion();
          notificacionNavegador(
            n.type === 'private'
              ? `Mensaje de ${n.userName}`
              : (n.roomName ? `Nuevo mensaje en ${n.roomName}` : 'Nuevo mensaje en el chat'),
            n.message || ''
          );
        });
      } catch (e) {
        console.warn('ChatAlertas: error conectando', e && e.message);
      }
    };

    init();
    return () => { activo = false; if (socket) socket.disconnect(); };
  }, [userId, userRole, userName]);

  if (alertas.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 9000 }}
    >
      {alertas.map((a) => (
        <TouchableOpacity
          key={a.localId}
          activeOpacity={0.9}
          onPress={() => { quitar(a.localId); onAbrir && onAbrir(a); }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            padding: 12, borderRadius: 14, marginBottom: 8,
            backgroundColor: '#1F2937',
            borderLeftWidth: 4,
            borderLeftColor: a.type === 'private' ? '#3B82F6' : a.type === 'general' ? '#F59E0B' : '#C44B0A',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
          }}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: a.type === 'private' ? '#3B82F6' : '#C44B0A',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name={a.type === 'private' ? 'person' : 'megaphone'} size={17} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
              {a.type === 'private' ? `Mensaje de ${a.userName}` : `Nuevo mensaje en ${a.roomName || (a.type === 'general' ? 'Chat General' : 'evento')}`}
            </Text>
            <Text style={{ color: '#cbd5e1', fontSize: 13 }} numberOfLines={1}>{a.message}</Text>
          </View>
          <TouchableOpacity onPress={() => quitar(a.localId)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} accessibilityLabel="Cerrar" accessibilityRole="button">
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}