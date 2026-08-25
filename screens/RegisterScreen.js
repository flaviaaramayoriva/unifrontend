import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// import { registerUser } from '../services/authService';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // await registerUser({ name, email, password });
      console.log('Registro exitoso (simulado)');
      Alert.alert('Registro Exitoso', 'Ahora puedes iniciar sesión.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro. Intenta de nuevo.');
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={S.container}>
      <Text style={S.title}>Crear Cuenta</Text>
      {error ? <Text style={S.errorText}>{error}</Text> : null}
      <TextInput
        style={S.input}
        placeholder="Nombre Completo"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={S.input}
        placeholder="Correo Electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={S.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={S.input}
        placeholder="Confirmar Contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title="Registrarse" onPress={handleRegister} />
      )}
      <Button
        title="¿Ya tienes cuenta? Inicia Sesión"
        onPress={() => navigation.navigate('Login')}
        color="#888"
      />
    </View>
  );
};

// Usar los mismos estilos de LoginScreen o crear unos específicos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default RegisterScreen;