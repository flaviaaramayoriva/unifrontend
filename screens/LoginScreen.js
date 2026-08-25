import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
//import {Picker} from '@react-native-picker/picker';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers]=useState([]);
 /* const userTypes=[
    { label: 'Estudiante', value: 'Estudiante' },
    { label: 'Administrador', value: 'Administrador' },
    { label: 'Director de carrera', value: 'Director' },
  ];*/

  const handleLogin = async () => {
    setLoading(true);
    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      console.log("send",{trimmedUsername,trimmedPassword});
    const response = await axios.post('http://192.168.0.167:5000/auth/login', { 
      userName: trimmedUsername,
      contrasenia: trimmedPassword }, {
      timeout: 5000,
    });
    if (response.status === 200) {
      const { userId, token } = response.data; // Assuming your backend returns userId and token
      await AsyncStorage.setItem('userToken', token);
      
    
      const usersResponse = await axios.get('http://192.168.0.167:5000/events', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigation.navigate('EventosAdmin',{event:Event.data});
      
    }
  } catch (error) {
    if (error.response) {
      alert(`Login failed: ${error.response.data.error || 'Invalid credentials'}`);
    } else if (error.request) {
      alert('Network error: Unable to connect to the server');
    } else {
      alert('An error occurred: ' + error.message);
    }
  } finally {
    setLoading(false);
  }
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={(text)=>setPassword(text.trim())}
          secureTextEntry
          autoCapitalize="none"
          multiline={false}
          returnKeyType='done'
        />
       
        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.buttonColor, loading && styles.buttonDisabled]}
          disabled={loading}
        >
          <Text style={styles.TextbuttonColor}>{loading ? 'Loading...' : 'Login'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: 'black',
  },
  input: {
    width: '80%',
    height: 40,
    borderWidth: 1,
    borderColor: '#FF5733',
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  sectionContainer: {
    padding: 15,
    flex: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    margin: 100,
    borderRadius: 20,
  },
  buttonColor: {
    backgroundColor: '#FF5733',
    width: 100,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonDisabled: {
    backgroundColor: '#FFA07A',
  },
  TextbuttonColor: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LoginScreen;