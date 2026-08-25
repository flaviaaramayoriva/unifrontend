import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import { fetchRegisteredEvents } from '../services/eventService'; // Necesitarás un endpoint para esto
// import EventCard from '../components/EventCard';
// import { AuthContext } from '../contexts/AuthContext';

const MOCK_REGISTERED_EVENTS = [
    { id: '1', title: 'Charla de IA', date: '2024-08-15', location: 'Auditorio A' },
];

const EstudianteEvents = () => {
  const navigation = useNavigation();
  // const { user, token } = useContext(AuthContext);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadRegisteredEvents = async () => {
    // if (!token) return; // Asegurarse que el usuario está logueado
    setLoading(true);
    setError('');
    try {
      // const data = await fetchRegisteredEvents(token);
      // setRegisteredEvents(data);
      setRegisteredEvents(MOCK_REGISTERED_EVENTS); // Usando datos mock
      console.log('Eventos registrados cargados (simulado)');
    } catch (err) {
      setError('Error al cargar tus eventos registrados.');
      console.error("Fetch registered events error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRegisteredEvents();
    }, []) // Añadir 'token' si se usa
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRegisteredEvents().then(() => setRefreshing(false));
  }, []); // Añadir 'token' si se usa

  const renderEventItem = ({ item }) => (
    // <EventCard event={item} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} />
    <View style={S.eventItem}>
      <Text style={S.eventTitle}>{item.title}</Text>
      <Text>{item.date} - {item.location}</Text>
      <Button title="Ver Detalles" onPress={() => navigation.navigate('EventDetail', { eventId: item.id, eventTitle: item.title })} />
    </View>
  );

  // if (!user) {
  //   return <View style={styles.centered}><Text>Por favor, inicia sesión para ver tus eventos.</Text></View>;
  // }

  if (loading && !refreshing) {
    return <View style={S.centered}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  if (error) {
    return <View style={S.centered}><Text style={S.errorText}>{error}</Text><Button title="Reintentar" onPress={loadRegisteredEvents} /></View>;
  }

  return (
    <View style={S.container}>
      <Text style={S.title}>Mis Eventos Registrados</Text>
      <FlatList
        data={registeredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={S.emptyText}>No estás registrado en ningún evento.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

// Reutilizar estilos de HomeScreen o crear unos específicos
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

export default EstudianteEvents;