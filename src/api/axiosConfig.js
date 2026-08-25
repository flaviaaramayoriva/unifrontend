import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ✅ 1. URL corregida (sin espacios y con const)
//const API_BASE_URL = 'https://unibackend-1-izpi.onrender.com';
//const API_BASE_URL = 'https://evento.cidtec-uc.com'; 
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const API_BASE_URL = 'https://unifrontend-production-150c.up.railway.app'; // ✅ URL corregida y sin espacios
const apiClient = axios.create({
  baseURL: API_BASE_URL.trim(), // ✅ .trim() por seguridad extra
  timeout: 10000, // ✅ Agrega timeout para manejar errores de red
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ 2. Interceptor de token (tu código está bien)
const TOKEN_KEY = 'adminAuthToken';

apiClient.interceptors.request.use(
  async (config) => {
    let token;
    if (Platform.OS === 'web') {
      token = localStorage.getItem(TOKEN_KEY);
    } else {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ 3. Interceptor de respuesta para debug (opcional pero útil)
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('❌ Error en API:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default apiClient;