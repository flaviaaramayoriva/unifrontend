import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Image,
  ImageBackground,
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
    <ImageBackground
      source={require('../../assets/images/FONDO NARANJA_Mesa de trabajo 1.jpeg')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(15,23,42,0.68)', 'rgba(40,22,12,0.45)', 'rgba(15,8,4,0.84)']}
        style={styles.overlay}
      />

      <Animated.View
        style={[styles.content, { opacity: contentAnim, transform: [{ scale: contentAnim }] }]}
      >
        <View style={styles.brand}>
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} />
          </View>
          <Text style={styles.brandName}>UFT Eventos</Text>
          <Text style={styles.brandSub}>Organiza y automatiza tus eventos</Text>
        </View>

        <Pressable style={styles.buttonPrimary} onPress={() => router.push('/Home')}>
          <Text style={styles.buttonPrimaryText}>Explorar Eventos</Text>
        </Pressable>

        <Pressable style={styles.buttonSecondary} onPress={() => router.push('/Login')}>
          <Text style={styles.buttonSecondaryText}>Iniciar Sesión</Text>
        </Pressable>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 14,
  },
  logo: {
    width: 88,
    height: 88,
    resizeMode: 'contain',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginTop: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
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
    maxWidth: 380,
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