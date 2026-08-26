import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  StatusBar, ScrollView, ActivityIndicator, Platform, Modal, TextInput
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const COLORS = {
  // ... (todo tu código de colores)
};

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
// ... (todo el resto del código)

const HomeEstudianteScreen = () => {
  // ... (todo el contenido del componente)
};

const styles = StyleSheet.create({
  // ... (todos tus estilos)
});

export default HomeEstudianteScreen;  // ← Mantén este export