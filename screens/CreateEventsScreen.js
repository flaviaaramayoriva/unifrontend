import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
// import { createEvent, fetchEventById, updateEvent } from '../services/eventService';
// import { AuthContext } from '../contexts/AuthContext';
// Podrías usar react-native-picker/picker o un modal para seleccionar categoría/ubicación

const CreateEventScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // const { token } = useContext(AuthContext);
  const eventIdToEdit = route.params?.eventId; // Si se pasa un eventId, estamos editando

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(''); // Formato YYYY-MM-DD
  const [time, setTime] = useState(''); // Formato HH:MM AM/PM
  const [location, setLocation] = useState(''); // O ID de ubicación
  const [category, setCategory] = useState(''); // O ID de categoría
  const [capacity, setCapacity] = useState(''); // Número o vacío para ilimitado
  // const [imageUrl, setImageUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (eventIdToEdit) {
      navigation.setOptions({ title: 'Editar Evento' });
      const loadEventData = async () => {
        setLoading(true);
        try {
          // const eventData = await fetchEventById(eventIdToEdit, token);
          // setTitle(eventData.title);
          // setDescription(eventData.description);
          // setDate(eventData.date); // Asegúrate que el formato sea compatible
          // setTime(eventData.time);
          // setLocation(eventData.location.name || eventData.location); // Depende de cómo venga
          // setCategory(eventData.category.name || eventData.category);
          // setCapacity(eventData.capacity?.toString() || '');
          // setImageUrl(eventData.imageUrl || '');
          console.log('Datos del evento para editar cargados (simulado)');
          // Simulación:
          setTitle('Evento de Ejemplo para Editar');
          setDescription('Esta es una descripción de ejemplo.');
          setDate('2024-09-01');
          setTime('03:00 PM');
          setLocation('Salón Magno');
          setCategory('Conferencia');
          setCapacity('50');

        } catch (err) {
          setFormError('Error al cargar datos del evento para editar.');
        } finally {
          setLoading(false);
        }
      };
      loadEventData();
    } else {
        navigation.setOptions({ title: 'Crear Nuevo Evento' });
    }
  }, [eventIdToEdit, navigation]); // token

  const handleSubmit = async () => {
    if (!title || !description || !date || !time || !location || !category) {
      setFormError('Todos los campos marcados con * son obligatorios.');
      return;
    }
    setLoading(true);
    setFormError('');

    const eventData = {
      title,
      description,
      startDate: `${date}T${time}`, // Ajustar formato según backend
      endDate: `${date}T${time}`, // Simplificado, podrías tener campos separados
      location, // Podría ser un ID
      category, // Podría ser un ID
      capacity: capacity ? parseInt(capacity, 10) : null,
      // imageUrl,
    };

    try {
      if (eventIdToEdit) {
        // await updateEvent(eventIdToEdit, eventData, token);
        Alert.alert('Éxito', 'Evento actualizado correctamente.');
      } else {
        // await createEvent(eventData, token);
        Alert.alert('Éxito', 'Evento creado correctamente.');
      }
      console.log('Evento guardado (simulado)', eventData);
      navigation.goBack(); // O navegar a la lista de eventos
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al guardar el evento.');
      console.error("Save event error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !title && eventIdToEdit) { // Solo loading inicial si está editando
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{eventIdToEdit ? 'Editar Evento' : 'Crear Nuevo Evento'}</Text>
      {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

      <Text style={styles.label}>Título del Evento *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ej: Conferencia de Marketing Digital" />

      <Text style={styles.label}>Descripción *</Text>
      <TextInput style={styles.inputMulti} value={description} onChangeText={setDescription} placeholder="Detalles sobre el evento..." multiline numberOfLines={4} />

      <Text style={styles.label}>Fecha (YYYY-MM-DD) *</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="Ej: 2024-12-25" />

      <Text style={styles.label}>Hora (HH:MM AM/PM) *</Text>
      <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="Ej: 02:30 PM" />

      <Text style={styles.label}>Ubicación *</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ej: Auditorio Principal" />
      {/* Idealmente un Picker o selector para ubicaciones predefinidas */}

      <Text style={styles.label}>Categoría *</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Ej: Académico, Cultural" />
      {/* Idealmente un Picker o selector para categorías predefinidas */}

      <Text style={styles.label}>Capacidad (dejar vacío para ilimitada)</Text>
      <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} placeholder="Ej: 100" keyboardType="numeric" />

      {/* <Text style={styles.label}>URL de la Imagen (opcional)</Text>
      <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://ejemplo.com/imagen.jpg" /> */}

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }}/>
      ) : (
        <Button title={eventIdToEdit ? "Actualizar Evento" : "Crear Evento"} onPress={handleSubmit} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#444',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  inputMulti: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default CreateEventScreen;