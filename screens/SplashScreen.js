// frontend/screens/SplashScreen.js
import React,{useEffect} from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';

const SplashScreen = () => {
  useEffect(() => {
    console.log('SplashScreen montado.');
    return () => console.log('SplashScreen desmontado.');
  }, []);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff', // Un color de fondo suave
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  indicator: {
    marginTop: 20,
  },
});

export default SplashScreen;