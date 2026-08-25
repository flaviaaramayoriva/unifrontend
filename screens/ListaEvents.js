import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import { fetchEvents } from '../services/eventService';
// import EventCard from '../components/EventCard'; // Componente para mostrar cada evento

// Datos de ejemplo si no tienes API aún
const MOCK_EVENTS = [
  { id: '1', title: 'Charla de IA', description: 'Introducción a la Inteligencia Artificial.', date: '2024-08-15', time: '10:00 AM', location: 'Auditorio A', category: 'Académico' },
  { id: '2', title: 'Torneo de Fútbol', description: 'Gran torneo inter-facultades.', date: '2024-08-20', time: '02:00 PM', location: 'Cancha Principal', category: 'Deportivo' },
];

const ListaEvents = () => {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      // const data = await fetchEvents();
      // setEvents(data);
      setEvents(MOCK_EVENTS); // Usando datos mock
      console.log('Eventos cargados (simulado)');
    } catch (err) {
      setError('Error al cargar eventos.');
      console.error("Fetch events error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar eventos cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents().then(() => setRefreshing(false));
  }, []);

  const renderEventItem = ({ item }) => (
    // <EventCard event={item} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} />
    <View style={styles.eventItem}>
      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text>{item.date} - {item.time}</Text>
      <Text>{item.location}</Text>
      <Button title="Ver Detalles" onPress={() => navigation.navigate('EventDetail', { eventId: item.id, eventTitle: item.title })} />
    </View>
  );

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text><Button title="Reintentar" onPress={loadEvents} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Próximos Eventos</Text>
      {/* Aquí podrías añadir filtros o un botón para crear evento si el usuario es organizador/admin */}
      {/* <Button title="Crear Evento" onPress={() => navigation.navigate('CreateEvent')} /> */}
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay eventos disponibles.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

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
  eventItem: { // Estilo temporal para el item, idealmente usar EventCard
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
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

export default ListaEvents;