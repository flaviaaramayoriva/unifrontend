import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar } from 'react-native-big-calendar';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

// Configuración de dayjs y constantes
dayjs.locale('es');
const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api';
const getTokenAsync = async () => "token-de-prueba-para-desarrollo";

const AgendaDia = () => {
  const router = useRouter();
  const { date } = useLocalSearchParams();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const initialDate = date ? dayjs(date).toDate() : new Date();

  useEffect(() => {
    if (!dayjs(initialDate).isValid()) {
      console.error("Fecha inicial inválida:", initialDate);
      setIsLoading(false);
      return;
    }

    const fetchEventsForDay = async () => {
      setIsLoading(true);
      try {
        const token = await getTokenAsync();
        const response = await fetch(`${API_BASE_URL}/eventos`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const allEvents = await response.json();
        
        const eventosDelDia = allEvents.filter(evento => 
          dayjs(evento.fechaevento).isSame(initialDate, 'day')
        );
        
        const eventTypeColors = {
          '1': '#e95a0c', '2': '#3498db', '3': '#2ecc71',
          '4': '#9b59b6', '5': '#f1c40f', '6': '#7f8c8d',
        };

        const formattedEvents = eventosDelDia.map(evento => {
          const eventDate = dayjs(evento.fechaevento);
          const [hour, minute] = evento.horaevento.split(':');
          
          const start = eventDate.hour(hour).minute(minute).toDate();
          const end = dayjs(start).add(1, 'hour').toDate();

          return {
            title: evento.nombreevento,
            start,
            end,
            location: evento.lugarevento,
            color: eventTypeColors[String(evento.idtipoevento)] || '#bdc3c7',
          };
        });

        setEvents(formattedEvents);
      } catch (error) {
        console.error("Error fetching events for day view:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventsForDay();
  }, [date]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e95a0c" />
        <Text style={styles.loadingText}>Cargando agenda...</Text>
      </View>
    );
  }

  if (!dayjs(initialDate).isValid()) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Fecha no válida</Text>
        <Text style={styles.errorText}>Por favor, vuelve y selecciona una fecha.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Agenda del ${dayjs(initialDate).format('D [de] MMMM')}` }} />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Calendar
          // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
          // La función renderHeader ahora usa 'initialDate' que sabemos que es válida.
          renderHeader={() => (
            <View style={styles.customHeader}>
              <Text style={styles.customHeaderDayText}>
                {dayjs(initialDate).format('dddd')}
              </Text>
              <Text style={styles.customHeaderDateText}>
                {dayjs(initialDate).format('D')}
              </Text>
            </View>
          )}
          events={events}
          date={initialDate}
          mode="day"
          height={24 * 60}
          locale="es"
          ampm={true}
          showTime={true}
          eventCellStyle={event => ({
            backgroundColor: event.color,
            borderRadius: 5,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)',
            padding: 2,
          })}
          hourStyle={{ color: '#555' }}
          onPressCell={(date) => {
            const dateString = dayjs(date).format('YYYY-MM-DD');
            const hourString = dayjs(date).format('HH');
            
            console.log(`Navegando a CrearEvento con fecha: ${dateString} y hora: ${hourString}`);
            router.push(`/admin/Contenido?selectedDate=${dateString}&selectedHour=${hourString}`);
          }}
        />
      </ScrollView>
    </View>
  );
};

// --- AÑADIMOS LOS ESTILOS QUE FALTABAN ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
    fontSize: 16,
  },
  errorText: {
    color: '#c0392b',
    fontSize: 18,
    textAlign: 'center',
  },
  // Estilos para el nuevo encabezado personalizado
  customHeader: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  customHeaderDayText: {
    fontSize: 16,
    color: '#555',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  customHeaderDateText: {
    fontSize: 28,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default AgendaDia;