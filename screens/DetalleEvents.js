import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
// import { fetchEventById, registerForEvent, unregisterFromEvent } from '../services/eventService';
// import { AuthContext } from '../contexts/AuthContext';

// Datos de ejemplo
const MOCK_EVENT_DETAIL = {
  id: '1',
  title: 'Charla de IA',
  description: 'Una charla profunda sobre los avances recientes en Inteligencia Artificial y sus implicaciones futuras. Cubriremos temas como Machine Learning, Deep Learning y NLP.',
  date: '2024-08-15',
  time: '10:00 AM - 12:00 PM',
  location: 'Auditorio A, Edificio Principal',
  category: 'Académico',
  organizer: 'Departamento de Ciencias de la Computación',
  capacity: 100,
  attendeesCount: 67, // Simulado
  isUserRegistered: false, // Simulado
};

const DetalleEvents = () => {
  const route = useRoute();
  const navigation = useNavigation();
  // const { user, token } = useContext(AuthContext); // Para saber si el usuario está logueado y su rol
  const { eventId, eventTitle } = route.params; // Obtener el ID del evento de los parámetros de navegación

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(MOCK_EVENT_DETAIL.isUserRegistered); // Simulado
  const [actionLoading, setActionLoading] = useState(false);

  const loadEventDetails = async () => {
    setLoading(true);
    setError('');
    try {
      // const data = await fetchEventById(eventId, token); // Pasar token si es necesario
      // setEvent(data);
      // setIsRegistered(data.isUserRegistered); // Suponiendo que la API devuelve esto
      setEvent(MOCK_EVENT_DETAIL); // Usando datos mock
      navigation.setOptions({ title: MOCK_EVENT_DETAIL.title }); // Actualizar título de la cabecera
      console.log('Detalles del evento cargados (simulado)');
    } catch (err) {
      setError('Error al cargar detalles del evento.');
      console.error("Fetch event detail error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEventDetails();
    }, [eventId])
  );

  const handleRegister = async () => {
    setActionLoading(true);
    try {
      // await registerForEvent(eventId, token);
      setIsRegistered(true);
      Alert.alert('Éxito', 'Te has registrado al evento.');
      // Actualizar el contador de asistentes si es necesario
      // setEvent(prev => ({ ...prev, attendeesCount: prev.attendeesCount + 1 }));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo registrar.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregister = async () => {
    setActionLoading(true);
    try {
      // await unregisterFromEvent(eventId, token);
      setIsRegistered(false);
      Alert.alert('Éxito', 'Has cancelado tu registro al evento.');
      // setEvent(prev => ({ ...prev, attendeesCount: prev.attendeesCount - 1 }));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo cancelar el registro.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <View style={S.centered}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  if (error || !event) {
    return <View style={S.centered}><Text style={S.errorText}>{error || 'Evento no encontrado.'}</Text></View>;
  }

  // const canEdit = user && (user.role === 'admin' || user.id === event.organizerId); // Lógica para editar

  return (
    <ScrollView style={S.container}>
      <Text style={S.title}>{event.title}</Text>
      {/* <Image source={{ uri: event.imageUrl }} style={S.image} /> // Si tienes imágenes */}
      <View style={S.detailItem}>
        <Text style={S.label}>Descripción:</Text>
        <Text style={S.value}>{event.description}</Text>
      </View>
      <View style={S.detailItem}>
        <Text style={S.label}>Fecha y Hora:</Text>
        <Text style={S.value}>{event.date} a las {event.time}</Text>
      </View>
      <View style={S.detailItem}>
        <Text style={S.label}>Ubicación:</Text>
        <Text style={S.value}>{event.location}</Text>
      </View>
      <View style={S.detailItem}>
        <Text style={S.label}>Categoría:</Text>
        <Text style={S.value}>{event.category}</Text>
      </View>
      <View style={S.detailItem}>
        <Text style={S.label}>Organizador:</Text>
        <Text style={S.value}>{event.organizer}</Text>
      </View>
      <View style={S.detailItem}>
        <Text style={S.label}>Capacidad:</Text>
        <Text style={S.value}>{event.attendeesCount} / {event.capacity || 'Ilimitada'}</Text>
      </View>

      {/* Lógica de botones según estado de registro y rol */}
      {/* {user && ( // Solo mostrar si el usuario está logueado
        isRegistered ? (
          <Button title={actionLoading ? "Cancelando..." : "Cancelar Registro"} onPress={handleUnregister} color="red" disabled={actionLoading} />
        ) : (
          (event.attendeesCount < event.capacity || !event.capacity) && // Si hay cupo
          <Button title={actionLoading ? "Registrando..." : "Registrarse"} onPress={handleRegister} disabled={actionLoading} />
        )
      )}
      {!user && <Text style={styles.infoText}>Inicia sesión para registrarte a eventos.</Text>} */}

      {/* Botón de ejemplo para simular registro */}
      <Button title={isRegistered ? "Cancelar Registro (Simulado)" : "Registrarse (Simulado)"} onPress={() => setIsRegistered(!isRegistered)} color={isRegistered ? "red" : "#007bff"} />


      {/* {canEdit && (
        <Button title="Editar Evento" onPress={() => navigation.navigate('CreateEvent', { eventId: event.id })} />
      )} */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  detailItem: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  infoText: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#666',
  }
});

export default DetalleEvents;