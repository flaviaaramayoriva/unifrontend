import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Pressable,
  ImageBackground,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { createStackNavigator, StackScreenProps } from '@react-navigation/stack';
import Home from '../Home';

SplashScreen.preventAutoHideAsync();

export type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
};

type WelcomeScreenProps = StackScreenProps<RootStackParamList, 'Welcome'>;

const App: React.FC = () => {
  const [appIsReady, setAppIsReady] = useState<boolean>(false);
  const [fadeAnim] = useState<Animated.Value>(new Animated.Value(1));
  const [contentAnim] = useState<Animated.Value>(new Animated.Value(0));

  const Stack = createStackNavigator<RootStackParamList>();

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulación de carga
      } catch (e) {
        console.warn(e);
      } finally {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(async () => {
          setAppIsReady(true);
          await SplashScreen.hideAsync();
          Animated.timing(contentAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }).start();
        });
      }
    }

    prepare();
  }, [fadeAnim, contentAnim]);

  if (!appIsReady) {
    return (
        <ImageBackground
          source={require('../../assets/images/FONDO NARANJA_Mesa de trabajo 1.jpeg')}
          style={styles.background}
          resizeMode="cover"
        >
      <View style={styles.splashContainer}>
        <Animated.Image
          source={require('../../assets/images/logo.jpg')}
          style={[styles.splashImage, { opacity: fadeAnim }]}
          />
      </View>
      </ImageBackground>
    );
  }

  return (
    <Stack.Navigator initialRouteName="Welcome">
      <Stack.Screen
        name="Welcome"
        options={{ headerShown: false }}
        component={({ navigation }: WelcomeScreenProps) => (
          <ImageBackground
            source={require('../../assets/images/FONDO NARANJA_Mesa de trabajo 1.jpeg')} // ⚠️ Asegúrate de tener esta imagen
            style={styles.background}
            resizeMode="cover"
          >
            {/* Overlay semitransparente para mejorar legibilidad */}
            <View style={styles.overlay} />

            <Animated.View
              style={[
                styles.content,
                {
                  opacity: contentAnim,
                  transform: [{ scale: contentAnim }],
                },
              ]}
            >
              <Text style={styles.title}>¡Bienvenido a EventosApp!</Text>
              <Text style={styles.subtitle}>
                Organiza y automatiza tus eventos con facilidad
              </Text>
              <Pressable
                style={styles.button}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.buttonText}>Explorar Eventos</Text>
              </Pressable>
            </Animated.View>
          </ImageBackground>
        )}
      />
      <Stack.Screen
        name="Home"
        component={Home}
        options={{
          title: 'Home',
          headerLeft: () => null,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  splashBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  splashImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Capa oscura semitransparente
  },
  content: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    maxWidth: '90%',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    color: '#f5f5f5',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#e95a0c',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default App;