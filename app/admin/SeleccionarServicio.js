// app/admin/SeleccionarServicioScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Platform, ScrollView,Image
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

let determinedApiBaseUrl;
/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://10.0.2.2:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://localhost:3001/api';
} else {
  determinedApiBaseUrl = 'http://localhost:3001/api';
}*/
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend1-production.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';

const getTokenAsync = async () => {
  // IMPLEMENTA TU LÓGICA REAL AQUÍ
  // Ejemplo:
  // import * as SecureStore from 'expo-secure-store';
  // const token = await SecureStore.getItemAsync('adminAuthToken');
  // return token;
  console.warn("getTokenAsync es un placeholder. Implementa la obtención real del token.");
  return "token-de-prueba-para-desarrollo"; // Temporal
};
// --- FIN ---

const SeleccionarServicioScreen = () => {
  const router = useRouter();
  const [servicios, setServicios] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Para la lista y el formulario
  const [searchTerm, setSearchTerm] = useState('');
  const [authToken, setAuthToken] = useState(null);

  // Estados para el formulario de creación
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nuevoNombreServicio, setNuevoNombreServicio] = useState('');
  const [caracteristica, setCaracteristica] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date()); // Usar setFechaEntrega
  const [showDatePickerEntrega, setShowDatePickerEntrega] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    const fetchTokenAndData = async () => {
      const token = await getTokenAsync();
      setAuthToken(token);
      if (token) {
        fetchServicios(token);
      } else {
        Alert.alert("Error de Autenticación", "No se pudo obtener el token. Por favor, inicie sesión de nuevo.");
        // Podrías redirigir al login aquí si es necesario
        // router.replace('/ruta-login');
      }
    };
    fetchTokenAndData();
  }, []);

  const fetchServicios = async (token) => {
    if (!token) return; // No hacer fetch si no hay token
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/servicios`, { // Asegúrate que este endpoint exista
        headers: { Authorization: `Bearer ${token}` },
      });
      setServicios(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error cargando servicios:", error.response?.data || error.message);
      Alert.alert("Error", "No se pudieron cargar los servicios.");
      setServicios([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectServicio = (servicio) => {
    router.replace({
      pathname: '/admin/Contenido', // Ruta de tu pantalla CrearEvento
      params: {
        selectedServicioId: servicio.idservicio,
        selectedServicioNombre: servicio.nombreservicio,
      },
    });
  };

  const formatToISODate = (date) => {
    if (!(date instanceof Date) || isNaN(date.valueOf())) {
      console.warn("formatToISODate recibió una fecha inválida:", date);
      return new Date().toISOString().split('T')[0]; // Devuelve la fecha actual como fallback o maneja el error
    }
    return date.toISOString().split('T')[0];
  };

  const handleCrearNuevoServicio = async () => {
    if (!nuevoNombreServicio.trim() || !caracteristica.trim() || !authToken) {
      Alert.alert("Error de Validación", "Nombre y característica del servicio son requeridos.");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        nombreservicio: nuevoNombreServicio.trim(),
        caracteristica: caracteristica.trim(),
        fechaEntrega: formatToISODate(fechaEntrega),
        observaciones: observaciones.trim(),
      };
      // Asegúrate que el endpoint y el payload sean correctos para tu backend
      const response = await axios.post(`${API_BASE_URL}/servicios`, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      Alert.alert("Éxito", "Nuevo servicio creado.");
      setNuevoNombreServicio('');
      setCaracteristica('');
      setFechaEntrega(new Date()); // Resetear a new Date()
      setObservaciones('');
      setShowCreateForm(false); // Volver a la lista
      if (authToken) fetchServicios(authToken); // Recargar la lista
    } catch (error) {
      console.error("Error creando servicio:", error.response?.data || error.message);
      Alert.alert("Error", `No se pudo crear el nuevo servicio: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeFechaEntrega = (event, selectedDate) => {
    setShowDatePickerEntrega(Platform.OS === 'ios'); // Mantener visible en iOS hasta que se cierre manualmente
    if (selectedDate) { // Solo actualizar si se seleccionó una fecha
        if (selectedDate instanceof Date && !isNaN(selectedDate.valueOf())) {
            setFechaEntrega(selectedDate);
        }
        if (Platform.OS === 'android') { // Cerrar en Android después de seleccionar
            setShowDatePickerEntrega(false);
        }
    } else if (Platform.OS === 'android') { // Si se cancela en Android (selectedDate es undefined)
        setShowDatePickerEntrega(false);
    }
  };

  const filteredServicios = servicios.filter(s =>
    s.nombreservicio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => handleSelectServicio(item)}>
      <Text style={styles.itemText}>{item.nombreservicio}</Text>
      <Ionicons name="chevron-forward-outline" size={20} color="#e95a0c" />
    </TouchableOpacity>
  );

  // Renderiza el formulario de creación si showCreateForm es true
  if (showCreateForm) {
    return (
      <ScrollView style={styles.formViewContainer} contentContainerStyle={styles.formContentContainer} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: 'Crear Nuevo Servicio' }} />
        <TouchableOpacity onPress={() => setShowCreateForm(false)} style={styles.cancelButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#e95a0c" />
          <Text style={styles.cancelButtonText}>Volver a la Lista</Text>
        </TouchableOpacity>

        <View style={styles.imageContainer}>
            <Image style={styles.imagen} source={require("../../assets/images/logo.jpg")}></Image>
        </View>
        <Text style={styles.createFormTitle}>Crear Nuevo Servicio</Text>

        <Text style={styles.label}>Nombre del Servicio</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Catering Básico"
          value={nuevoNombreServicio}
          onChangeText={setNuevoNombreServicio}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Característica Principal</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Incluye bebidas y bocadillos"
          value={caracteristica}
          onChangeText={setCaracteristica}
          multiline
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Fecha de Entrega/Realización</Text>
        <TouchableOpacity onPress={() => setShowDatePickerEntrega(true)} style={styles.datePickerButton}>
          <Ionicons name="calendar-outline" size={20} color="#e95a0c" style={styles.inputIcon} />
          <Text style={styles.datePickerText}>
            {fechaEntrega instanceof Date && !isNaN(fechaEntrega.valueOf()) ? fechaEntrega.toLocaleDateString() : 'Seleccionar fecha'}
          </Text>
        </TouchableOpacity>
        {showDatePickerEntrega && (
          <DateTimePicker
            value={fechaEntrega instanceof Date && !isNaN(fechaEntrega.valueOf()) ? fechaEntrega : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeFechaEntrega}
          />
        )}

        <Text style={styles.label}>Observaciones</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Notas adicionales (opcional)"
          value={observaciones}
          onChangeText={setObservaciones}
          multiline
          numberOfLines={3}
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.buttonDisabled]}
          onPress={handleCrearNuevoServicio}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#e95a0c" size="small" />
          ) : (
            <Text style={styles.createButtonText}>Guardar Servicio</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Renderiza la lista de servicios si showCreateForm es false
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Seleccionar Servicio' }} />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar servicio..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholderTextColor="#aaa"
      />
      {isLoading && servicios.length === 0 ? (
        <ActivityIndicator size="large" style={{ flex: 1, marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredServicios}
          renderItem={renderItem}
          keyExtractor={(item) => item.idservicio.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron servicios. Presiona '+' para agregar.</Text>}
          refreshing={isLoading}
          onRefresh={() => authToken && fetchServicios(authToken)}
          contentContainerStyle={{ paddingBottom: 80 }} // Espacio para el FAB
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateForm(true)}>
        <Ionicons name="add-outline" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F9' },
  formViewContainer: {
    flex: 1,
    backgroundColor: '#F4F7F9',
  },
  formContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  imageContainer:{
    alignItems:'center',
    marginBottom:20,
  },
  imagen:{
    alignItems:'center',
    marginBottom:20,
    borderRadius:10
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10, // Ajuste para iOS
    margin: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Borde más suave
    color: '#333',
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 18, // Un poco más de padding
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10, // Más redondeado
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0', // Borde muy sutil
    elevation: 2, // Sombra ligera en Android
    shadowColor: '#000', // Sombra en iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    flex: 1, // Para que el texto no se corte si es largo
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#777',
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    backgroundColor: '#e95a0c',
    width: 56, // Tamaño estándar de FAB
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createFormTitle: {
    fontSize: 22,
    fontWeight: '600', // Semibold
    marginBottom: 25,
    textAlign: 'center',
    color: '#2c3e50', // Un azul oscuro/gris
  },
  label: {
    fontSize: 14,
    color: '#34495e', // Un gris más oscuro
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdc3c7', // Un gris más definido
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    marginBottom: 18, // Más espacio
    color: '#2c3e50',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    paddingHorizontal:10, // Padding para el contenido interno
    marginBottom: 18,
  },
  datePickerText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    marginLeft: 8,
  },
  inputIcon: {
    // marginRight: 8, // Espacio entre icono y texto si es necesario
  },
  createButton: {
    backgroundColor: '#e95a0c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 10, // Espacio sobre el botón
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#f9bda3',
    opacity: 0.8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginBottom: 10, // Espacio debajo del botón cancelar
  },
  cancelButtonText: {
    marginLeft: 6,
    color: '#e95a0c',
    fontSize: 16,
    fontWeight: '500',
  }
});

export default SeleccionarServicioScreen;