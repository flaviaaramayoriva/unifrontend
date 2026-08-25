import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Link } from 'expo-router'; // Importar de expo-router
import axios from 'axios';
import {
  StyleSheet, 
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
const windowWidth=Dimensions.get('window').width;

const placeholderImages = {
  banner: require('../../assets/images/ind.jpg'), 
  category1: require('../../assets/images/der.jpg'),
  category2: require('../../assets/images/econ.jpg'),
  category3: require('../../assets/images/der.jpg'),
  category4: require('../../assets/images/sal.jpg'),
  category5: require('../../assets/images/tec.jpg'),
};

 const mockCategories = [
          { id: 1, name: 'Ciencias Juridicas y Sociales',image:require('../../assets/images/der.jpg')},
          { id: 2, name: 'Ciencias Economicas y Empresariales', image: require('../../assets/images/econ.jpg') },
          { id: 3, name: 'Diseno y Tecnologia Crossmedia', image: require('../../assets/images/arqui.jpg') },
          { id: 4, name: 'Ciencias de la Salud', image: require('../../assets/images/sal.jpg')},
          { id: 5, name: 'Ingenieria', image: require('../../assets/images/tec.jpg')},
        ];
        
        const mockFeatured = [
          { id: 1, title: 'Destacado 1', description: 'Descripción breve del elemento destacado 1', image: placeholderImages.featured1 },
          { id: 2, title: 'Destacado 2', description: 'Descripción breve del elemento destacado 2', image: placeholderImages.featured2 },
          { id: 3, title: 'Destacado 3', description: 'Descripción breve del elemento destacado 3', image: placeholderImages.featured3 },
        ];

const Inscripcion = () => {
  const router = useRouter(); // Hook para navegación programática

  const [categories, setCategories] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setTimeout(() => {
        setCategories(mockCategories); // mockCategories definido arriba con rutas de imagen corregidas
        setFeaturedItems(mockFeatured); // mockFeatured definido arriba
        setLoading(true);
      }, 1000);
    };
    fetchData();
  }, []);


  // ... (if loading, if error siguen igual) ...

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner principal */}
        <View style={styles.bannerContainer}>
          <Image
            source={require('../../assets/images/ind.jpg')} // Ruta corregida
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>
        
        {/* Categorías */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Facultades</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ScrollViewContent}
          >
            {categories.map((category) => (
              // Usar Link para navegación declarativa o router.push para programática
              <Link key={category.id} href={`/CategoryDetail/${category.id}`} asChild>
                <TouchableOpacity style={styles.categoryContainer}>
                  <Image 
                    source={category.image} 
                    style={styles.categoryImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              </Link>
            ))}
          </ScrollView>
        </View>

        {/* Elementos Destacados */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Eventos Destacados</Text>
          {featuredItems.map((item) => (
            <Link key={item.id} href={`/ItemDetail/${item.id}`} asChild>
              <TouchableOpacity style={styles.featuredItem}>
                <Image 
                  source={item.image} // Usar la imagen del mockFeatured
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
                <View style={styles.featuredContent}>
                  <Text style={styles.featuredTitle}>{item.title}</Text>
                  <Text style={styles.featuredDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </ScrollView>
      
     
    </View>
  );
};

const styles = StyleSheet.create({
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
  retryButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bannerContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  bannerSubtitle: {
    color: '#fff',
    fontSize: 16,
  },
  sectionContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    marginLeft:10
  },
  categoriesScrollView: {
    paddingBottom: 10,
  },
  categoryItem: {
    marginRight: 15,
    width: 120,
    alignItems: 'center',
    justifyContent:'center'
  },
  categoryImage: {
    width: 210,
    height: 210,
    borderRadius: 10,
    margin:10,
  },
  categoryName: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    width:100
  },
  featuredItem: {
    elevation:2,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  featuredImage: {
    width: 120,
    height: 120,
  },
  featuredContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  featuredDescription: {
    fontSize: 14,
    color: '#666',
  },
  chatbotButton: {
    elevation:5,
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#FF5733',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  chatbotButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  LoginButton:{
    position: 'absolute',
    left: 20,
    bottom: 20,
    backgroundColor: '#333',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  categoryContainer:{
    marginRight:10,
    alignItems:'center',
  },
  scrollViewContent:{
    flexGrow:1,
    paddingHorizontal:10,
  }
  
});

export default Inscripcion;

