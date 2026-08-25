import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Button, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import { fetchOrganizedEvents } from '../services/eventService'; // Endpoint para eventos del organizador
// import EventCard from '../components/EventCard';
// import { AuthContext } from '../contexts/AuthContext';

const MOCK_ORGANIZED_EVENTS = [
    { id: '3', title: 'Taller de React Native', date: '2024-09-05', attendeesCount: 15 },
    { id: '4', title: 'Club de Lectura Sesión 1', date: '2024-09-10', attendeesCount: 8 },
];

const OrganizerScreen = () => {
  const navigation = useNavigation();
  // const { user, token } = useContext(AuthContext);
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadOrganizedEvents = async () => {
    // if (!token) return;
    setLoading(true);
    setError('');
    try {
      // const data = await fetchOrganizedEvents(token);
      // setOrganizedEvents(data);
      setOrganizedEvents(MOCK_ORGANIZED_EVENTS);
      console.log('Eventos organizados cargados (simulado)');
    } catch (err) {
      setError('Error al cargar tus eventos organizados.');
      console.error("Fetch organized events error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrganizedEvents();
    }, []) // token
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrganizedEvents().then(() => setRefreshing(false));
  }, []); // token

  const renderOrganizedEventItem = ({ item }) => (
    <View style={styles.eventItem}>
      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text>Fecha: {item.date}</Text>
      <Text>Asistentes: {item.attendeesCount}</Text>
      <View style={styles.actions}>
        <Button title="Editar" onPress={() => navigation.navigate('CreateEvent', { eventId: item.id })} />
        <Button title="Ver Detalles" onPress={() => navigation.navigate('EventDetail', { eventId: item.id, eventTitle: item.title })} />
        {/* <Button title="Ver Asistentes" onPress={() => navigation.navigate('EventAttendees', { eventId: item.id })} /> */}
      </View>
    </View>
  );

  // if (!user || user.role !== 'organizer' && user.role !== 'admin') {
  //   return <View style={styles.centered}><Text>No tienes permisos para ver esta sección.</Text></View>;
  // }

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text><Button title="Reintentar" onPress={loadOrganizedEvents} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Eventos Organizados</Text>
      <Button title="Crear Nuevo Evento" onPress={() => navigation.navigate('CreateEvent')} />
      <FlatList
        data={organizedEvents}
        renderItem={renderOrganizedEventItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No has organizado ningún evento aún.</Text>}
        style={{ marginTop: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

// Reutilizar estilos o crear nuevos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 15,
    textAlign: 'center',
    color: '#333',
  },
  eventItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default OrganizerScreen;