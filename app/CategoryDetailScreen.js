// frontend/app/CategoryDetail/[categoryId].js

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'; // <--- Hooks de Expo Router
// import axios from 'axios'; // Descomenta cuando uses API real

// --- Mueve tus datos mock fuera del componente ---
// Asegúrate que las rutas de las imágenes sean correctas desde ESTA ubicación de archivo
// Si este archivo está en app/CategoryDetail/[categoryId].js y assets en frontend/assets/images:
// la ruta es '../../../assets/images/nombre.jpg'

const ALL_FACULTIES_DATA = [
  { id: 1, name: 'Ciencias Juridicas y Sociales', image: require('../assets/images/der.jpg'), description: 'Bienvenido a la Facultad de Ciencias Jurídicas y Sociales...' },
  { id: 2, name: 'Ciencias Economicas y Empresariales', image: require('../assets/images/econ.jpg'), description: 'Explora nuestras carreras en Economía...' },
  { id: 3, name: 'Diseno y Tecnologia Crossmedia', image: require('../assets/images/arqui.jpg'), description: 'Sumérgete en el mundo del diseño...' },
  { id: 4, name: 'Ciencias de la Salud', image: require('../assets/images/sal.jpg'), description: 'Forma parte de la Facultad de Ciencias de la Salud...' },
  { id: 5, name: 'Ingenieria', image: require('../assets/images/tec.jpg'), description: 'Únete a la Facultad de Ingeniería...' },
];

// Eventos simulados, organizados por el ID de la facultad
const MOCK_EVENTS_BY_FACULTY = {
  1: [
    { id: 'fj1', title: 'Debate Legal Actual', description: 'Análisis de casos recientes.', image: require('../assets/images/der.jpg') },
    { id: 'fj2', title: 'Impacto Social de Leyes', description: 'Charla con expertos.', image: require('../assets/images/der.jpg') },
  ],
  2: [
    { id: 'fe1', title: 'Tendencias Económicas 2024', description: 'Proyecciones y análisis.', image: require('../assets/images/econ.jpg') },
  ],
  // ... y así para otras categorías
};
// --- Fin Datos Mock ---


// const CategoryDetailScreen = ({ navigation, route }) => { // <--- NO RECIBE ESTAS PROPS
const CategoryDetailScreen = () => {
  const router = useRouter(); // Para navegación
  const params = useLocalSearchParams(); // Para obtener parámetros de la ruta
  const categoryIdParam = params.categoryId; // El nombre aquí ('categoryId') debe coincidir con el nombre del archivo [categoryId].js

  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [facultyEvents, setFacultyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedFaculty(null); // Limpiar estado previo
    setFacultyEvents([]);    // Limpiar estado previo

    console.log("CategoryDetailScreen - Parámetro de ruta (categoryIdParam):", categoryIdParam);

    if (categoryIdParam === undefined || categoryIdParam === null) {
      setError('ID de facultad no proporcionado en la ruta.');
      setLoading(false);
      return;
    }

    const parsedCategoryId = parseInt(categoryIdParam, 10);
    console.log("CategoryDetailScreen - ID parseado:", parsedCategoryId);

    if (isNaN(parsedCategoryId)) {
      setError(`ID de facultad inválido: "${categoryIdParam}" no es un número.`);
      setLoading(false);
      return;
    }

    // Simular carga de datos
    setTimeout(() => {
      const foundFaculty = ALL_FACULTIES_DATA.find(fac => fac.id === parsedCategoryId);
      
      if (foundFaculty) {
        setSelectedFaculty(foundFaculty);
        setFacultyEvents(MOCK_EVENTS_BY_FACULTY[parsedCategoryId] || []);
      } else {
        setError(`Facultad con ID ${parsedCategoryId} no encontrada.`);
      }
      setLoading(false);
    }, 700); // Simular delay

  }, [categoryIdParam]); // Depender del parámetro de la ruta

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Cargando..." }} />
        <ActivityIndicator size="large" color="#FF5733" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: "Error" }} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selectedFaculty) {
    // Este caso se daría si el ID es válido pero no se encuentra la facultad,
    // o si el categoryIdParam era undefined y no se manejó un estado por defecto.
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: "No Encontrado" }} />
        <Text style={styles.errorText}>Información de la facultad no disponible.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Ahora selectedFaculty tiene la información de la facultad correcta
  // y facultyEvents tiene los eventos para esa facultad.
  // Ya NO necesitas el renderizado condicional masivo {categoryId === 1 && ...}
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: selectedFaculty.name }} />

      {/* Cabecera de la Facultad */}
      <View style={styles.headerContainer}>
        <Image
          source={selectedFaculty.image}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <Text style={styles.headerTitle}>{selectedFaculty.name}</Text>
      </View>

      {/* Descripción de la Facultad */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Sobre la Facultad</Text>
        <Text style={styles.sectionDescription}>
          {selectedFaculty.description}
        </Text>
      </View>
      
      {/* Eventos de la Facultad */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Próximos Eventos en {selectedFaculty.name}</Text>
        {facultyEvents.length > 0 ? (
          facultyEvents.map(event => (
            <TouchableOpacity 
              key={event.id} 
              style={styles.featuredItem} // Reutilizando estilo, puedes renombrarlo a eventItem
              onPress={() => router.push(`/ItemDetail/${event.id}`)}
            >
              <Image source={event.image} style={styles.featuredImage} resizeMode="cover" />
              <View style={styles.featuredContent}>
                <Text style={styles.featuredTitle}>{event.title}</Text>
                <Text style={styles.featuredDescription}>{event.description}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text>No hay eventos programados para esta facultad en este momento.</Text>
        )}
      </View>
    </ScrollView>
  );
};

// ... (Tus estilos. Asegúrate de que las rutas de las imágenes en los datos mock sean correctas)
// Por ejemplo, si este archivo está en app/CategoryDetail/[categoryId].js
// y assets en frontend/assets/images, la ruta es '../../../assets/images/nombre.jpg'
const styles = StyleSheet.create({
  // ... (copia los estilos de la versión adaptada que te di antes, o los tuyos ajustados)
  // He añadido el estilo actionButton y ajustado otros en el ejemplo anterior.
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#FF5733',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 3,
  },
  sectionContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginVertical: 5, // Espacio entre secciones
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    lineHeight: 22,
  },
  featuredItem: { // Puedes renombrar este estilo a eventItem si es más claro
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  featuredImage: { // Puedes renombrar a eventImage
    width: 100,
    height: 100,
  },
  featuredContent: { // Puedes renombrar a eventContent
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  featuredTitle: { // Puedes renombrar a eventTitle
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  featuredDescription: { // Puedes renombrar a eventShortDescription
    fontSize: 14,
    color: '#666',
  },
});


export default CategoryDetailScreen;