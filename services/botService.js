// services/botService.js
import axios from 'axios';

// ✅ SOLUCIÓN: process.env funciona en Expo Web
// En móvil (iOS/Android) también funciona si usas app.config.js
//const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://evento.cidtec-uc.com';
//const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unifrontend.onrender.com';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend1-production.up.railway.app';

console.log('🔍 [BotService] BASE_URL:', BASE_URL);
const API = axios.create({
  baseURL: `${BASE_URL}/bot`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Logs de depuración
API.interceptors.request.use(config => {
  console.log('🚀 [API Request]', config.method.toUpperCase(), config.baseURL + config.url);
  console.log('📦 [API Data]', config.data);
  return config;
});

API.interceptors.response.use(
  response => {
    console.log('✅ [API Response]', response.data);
    return response;
  },
  error => {
    console.error('❌ [API Error]', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const BotService = {
  sendMessage: async (message, sender = 'invitado') => {
    try {
      console.log('💬 [BotService] Enviando mensaje:', message);
      const response = await API.post('/chat', { message, sender });
      console.log('✅ [BotService] Respuesta:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [BotService.sendMessage] Error:', error);
      throw error;
    }
  },

  getHistory: async (sender = 'invitado') => {
    try {
      const response = await API.get(`/history/${encodeURIComponent(sender)}`);
      return response.data;
    } catch (error) {
      console.warn('⚠️ [BotService.getHistory] Error:', error.message);
      return { messages: [] };
    }
  },

  getStatus: async () => {
    const response = await API.get('/status');
    return response.data;
  },
};