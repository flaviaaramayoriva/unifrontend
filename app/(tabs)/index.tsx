import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';

export default function Welcome() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 1200,
      useNativeDriver: true,
    }).start(async () => {
      await SplashScreen.hideAsync();
      Animated.spring(contentAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <LinearGradient
      colors={['#F37B2E', '#E95A0C', '#C44B0A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <Animated.View
        style={[styles.content, { opacity: contentAnim, transform: [{ scale: contentAnim }] }]}
      >
        <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} />
        <Text style={styles.title}>UFT Eventos</Text>
        <Text style={styles.subtitle}>Organiza y automatiza tus eventos con facilidad</Text>

        <Pressable style={styles.buttonPrimary} onPress={() => router.push('/Home')}>
          <Text style={styles.buttonPrimaryText}>Explorar Eventos</Text>
        </Pressable>

        <Pressable style={styles.buttonSecondary} onPress={() => router.push('/Login')}>
          <Text style={styles.buttonSecondaryText}>Iniciar Sesión</Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 24,
    maxWidth: '90%',
    width: 380,
  },
  logo: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 18,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 15,
    color: '#ffe3d2',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonPrimary: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonPrimaryText: {
    color: '#C44B0A',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  buttonSecondaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});