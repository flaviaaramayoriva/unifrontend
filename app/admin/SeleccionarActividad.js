// app/admin/SeleccionarActividadScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Platform, ScrollView
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// --- LÓGICA API Y TOKEN ---
let determinedApiBaseUrl;
/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://10.0.2.2:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://localhost:3001/api';
} else {
  determinedApiBaseUrl = 'http://localhost:3001/api';
}*/
//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unifrontend-production-150c.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';


const getTokenAsync = async () => {
  // IMPLEMENTA TU LÓGICA REAL AQUÍ
  console.warn("getTokenAsync es un placeholder. Implementa la obtención real del token.");
  return "token-de-prueba-para-desarrollo"; // Temporal
};
// --- FIN ---

export default function SeleccionarActividadScreen() {
  const router = useRouter();
  const [actividades, setActividades] = useState([]); // Estado para la lista de actividades
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [authToken, setAuthToken] = useState(null);

  // Estados para el formulario de creación de actividad
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nombreNuevaActividad, setNombreNuevaActividad] = useState('');
  const [responsableNuevaActividad, setResponsableNuevaActividad] = useState('');
  const [fechaInicioNuevaActividad, setFechaInicioNuevaActividad] = useState(new Date());
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [fechaFinNuevaActividad, setFechaFinNuevaActividad] = useState(new Date());
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);
  // const [descripcionNuevaActividad, setDescripcionNuevaActividad] = useState(''); // Opcional

  useEffect(() => {
    const fetchTokenAndData = async () => {
      const token = await getTokenAsync();
      setAuthToken(token);
      if (token) {
        fetchActividades(token);
      } else {
        Alert.alert("Error de Autenticación", "No se pudo obtener el token.");
      }
    };
    fetchTokenAndData();
  }, []);

  const fetchActividades = async (token) => {
    if (!token) return;
    setIsLoading(true);
    try {
      // CAMBIA ESTE ENDPOINT A TU API DE ACTIVIDADES
      const response = await axios.get(`${API_BASE_URL}/actividades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActividades(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error cargando actividades:", error.response?.data || error.message);
      Alert.alert("Error", "No se pudieron cargar las actividades.");
      setActividades([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectActividad = (actividad) => {
    router.replace({
      pathname: '/admin/Contenido', // Ruta de tu pantalla CrearEvento
      params: {
        selectedActividadId: actividad.idactividad, // Asume que tu API devuelve estos campos
        selectedActividadNombre: actividad.nombreactividad, // Asume que tu API devuelve estos campos
      },
    });
  };

  const formatToISODate = (date) => {
    if (!(date instanceof Date) || isNaN(date.valueOf())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };

  const handleCrearNuevaActividad = async () => {
    if (!nombreNuevaActividad.trim() || !responsableNuevaActividad.trim() || !authToken) {
      Alert.alert("Error de Validación", "Nombre y responsable de la actividad son requeridos.");
      return;
    }
    // Validación de fechas (opcional pero recomendada)
    if (fechaFinNuevaActividad < fechaInicioNuevaActividad) {
        Alert.alert("Error de Validación", "La fecha de fin no puede ser anterior a la fecha de inicio.");
        return;
    }

    setIsLoading(true);
    try {
      const payload = {
        nombreactividad: nombreNuevaActividad.trim(),
        responsable: responsableNuevaActividad.trim(),
        fechaInicio: formatToISODate(fechaInicioNuevaActividad),
        fechaFin: formatToISODate(fechaFinNuevaActividad),
        // descripcion: descripcionNuevaActividad.trim(), // Si tienes descripción
      };
      console.log("Enviando payload de nueva actividad:", payload);

      // CAMBIA ESTE ENDPOINT A TU API DE ACTIVIDADES
      const response = await axios.post(`${API_BASE_URL}/actividades`, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      Alert.alert("Éxito", "Nueva actividad creada.");
      setNombreNuevaActividad('');
      setResponsableNuevaActividad('');
      setFechaInicioNuevaActividad(new Date());
      setFechaFinNuevaActividad(new Date());
      // setDescripcionNuevaActividad('');
      setShowCreateForm(false);
      if (authToken) fetchActividades(authToken);
    } catch (error) {
      console.error("Error creando actividad:", error.response?.data || error.message);
      Alert.alert("Error", `No se pudo crear la nueva actividad: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeFechaInicio = (event, selectedDate) => {
    setShowDatePickerInicio(Platform.OS === 'ios');
    if (selectedDate) {
      if (selectedDate instanceof Date && !isNaN(selectedDate.valueOf())) {
        setFechaInicioNuevaActividad(selectedDate);
        // Opcional: si la fecha de fin es anterior, ajustarla
        if (fechaFinNuevaActividad < selectedDate) {
            setFechaFinNuevaActividad(selectedDate);
        }
      }
      if (Platform.OS === 'android') setShowDatePickerInicio(false);
    } else if (Platform.OS === 'android') setShowDatePickerInicio(false);
  };

  const onChangeFechaFin = (event, selectedDate) => {
    setShowDatePickerFin(Platform.OS === 'ios');
    if (selectedDate) {
      if (selectedDate instanceof Date && !isNaN(selectedDate.valueOf())) {
        setFechaFinNuevaActividad(selectedDate);
      }
      if (Platform.OS === 'android') setShowDatePickerFin(false);
    } else if (Platform.OS === 'android') setShowDatePickerFin(false);
  };

  const filteredActividades = actividades.filter(act =>
    act.nombreactividad?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => handleSelectActividad(item)}>
      <Text style={styles.itemText}>{item.nombreactividad}</Text>
      {/* Podrías mostrar más info aquí, como item.responsable o fechas */}
      <Ionicons name="chevron-forward-outline" size={20} color="#e95a0c" />
    </TouchableOpacity>
  );

  // Renderiza el formulario de creación si showCreateForm es true
  if (showCreateForm) {
    return (
      <ScrollView style={styles.formViewContainer} contentContainerStyle={styles.formContentContainer} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: 'Crear Nueva Actividad' }} />
        <TouchableOpacity onPress={() => setShowCreateForm(false)} style={styles.cancelButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#e95a0c" />
          <Text style={styles.cancelButtonText}>Volver a la Lista</Text>
        </TouchableOpacity>

        <Text style={styles.createFormTitle}>Crear Nueva Actividad</Text>

        <Text style={styles.label}>Nombre de la Actividad</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Reunión de Planificación"
          value={nombreNuevaActividad}
          onChangeText={setNombreNuevaActividad}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Responsable</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Juan Pérez"
          value={responsableNuevaActividad}
          onChangeText={setResponsableNuevaActividad}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Fecha de Inicio</Text>
        <TouchableOpacity onPress={() => setShowDatePickerInicio(true)} style={styles.datePickerButton}>
          <Ionicons name="calendar-outline" size={20} color="#e95a0c" style={styles.inputIcon} />
          <Text style={styles.datePickerText}>
            {fechaInicioNuevaActividad.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showDatePickerInicio && (
          <DateTimePicker
            value={fechaInicioNuevaActividad}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeFechaInicio}
          />
        )}

        <Text style={styles.label}>Fecha de Fin</Text>
        <TouchableOpacity onPress={() => setShowDatePickerFin(true)} style={styles.datePickerButton}>
          <Ionicons name="calendar-outline" size={20} color="#e95a0c" style={styles.inputIcon} />
          <Text style={styles.datePickerText}>
            {fechaFinNuevaActividad.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showDatePickerFin && (
          <DateTimePicker
            value={fechaFinNuevaActividad}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeFechaFin}
            minimumDate={fechaInicioNuevaActividad} // No permitir fecha fin antes de inicio
          />
        )}

        {/*
        <Text style={styles.label}>Descripción (Opcional)</Text>
        <TextInput
            style={[styles.input, {height: 100, textAlignVertical: 'top'}]}
            placeholder="Detalles adicionales de la actividad..."
            value={descripcionNuevaActividad}
            onChangeText={setDescripcionNuevaActividad}
            multiline
            numberOfLines={3}
            placeholderTextColor="#aaa"
        />
        */}

        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.buttonDisabled]}
          onPress={handleCrearNuevaActividad}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.createButtonText}>Guardar Actividad</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Renderiza la lista de actividades si showCreateForm es false
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Seleccionar Actividad' }} />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar actividad..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholderTextColor="#aaa"
      />
      {isLoading && actividades.length === 0 ? (
        <ActivityIndicator size="large" style={{ flex: 1, marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredActividades}
          renderItem={renderItem}
          keyExtractor={(item) => item.idactividad.toString()} // Asume que el ID se llama idactividad
          ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron actividades. Presiona '+' para agregar.</Text>}
          refreshing={isLoading}
          onRefresh={() => authToken && fetchActividades(authToken)}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateForm(true)}>
        <Ionicons name="add-outline" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

// Reutiliza y adapta los estilos de SeleccionarServicioScreen.js
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
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    margin: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 18,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
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
    width: 56,
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
    fontWeight: '600',
    marginBottom: 25,
    textAlign: 'center',
    color: '#2c3e50',
  },
  label: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    marginBottom: 18,
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
    paddingHorizontal:10,
    marginBottom: 18,
  },
  datePickerText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    marginLeft: 8,
  },
  inputIcon: {
    // marginRight: 8,
  },
  createButton: {
    backgroundColor: '#e95a0c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 10,
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
    marginBottom: 10,
  },
  cancelButtonText: {
    marginLeft: 6,
    color: '#e95a0c',
    fontSize: 16,
    fontWeight: '500',
  }
});