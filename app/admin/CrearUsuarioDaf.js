import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import DropDownPicker from 'react-native-dropdown-picker';
import axios from 'axios';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://unibackend-production.up.railway.app';
const CrearUsuarioDaf = () => {
  const router = useRouter();
  const role = 'daf';

  const [formData, setFormData] = useState({
    username: '',
    nombre: '',
    apellidopat: '',
    apellidomat: '',
    email: '',
    contrasenia: '',
    habilitado: true,
    role: 'daf',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  // --- NUEVA FUNCIÓN AGREGADA ---
  const capitalizeFirstLetter = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // --- FUNCIÓN ACTUALIZADA ---
  const updateFormData = (field, value) => {
    let formattedValue = value;
    
    // Aplicar capitalización solo a los campos de nombre y apellidos
    if (['nombre', 'apellidopat', 'apellidomat'].includes(field)) {
      formattedValue = capitalizeFirstLetter(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const TOKEN_KEY = 'adminAuthToken';
      let token;
      try {
        if (Platform.OS === 'web') {
          token = localStorage.getItem(TOKEN_KEY);
        } else {
          token = await SecureStore.getItemAsync(TOKEN_KEY);
        }
        
        if (!token) {
          Alert.alert("Acceso Denegado", "No estás autenticado. Por favor, inicia sesión.");
          router.replace('/Login');
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        Alert.alert("Error", "Error verificando la autenticación.");
      }
    };
    
    checkAuth();
  }, []);

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1: 
        if (!formData.username.trim()) {
          newErrors.username = 'El nombre de usuario es requerido.';
        } else if (formData.username.length < 3) {
          newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres.';
        }
        if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido.';
        if (!formData.apellidopat.trim()) newErrors.apellidopat = 'El apellido paterno es requerido.';
        break;
        
      case 2: 
        if (!formData.email.trim()) {
          newErrors.email = 'El email es requerido.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'El formato del email no es válido.';
        }
        if (!formData.contrasenia) {
          newErrors.contrasenia = 'La contraseña es requerida.';
        } else if (formData.contrasenia.length < 6) {
          newErrors.contrasenia = 'La contraseña debe tener al menos 6 caracteres.';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleAddUser = async () => {
    if (!validateStep(2)) return;
    
    setIsLoading(true);
    try {
      const newUserPayload = {
        username: formData.username.trim(),
        nombre: formData.nombre.trim(),
        apellidopat: formData.apellidopat.trim(),
        apellidomat: formData.apellidomat.trim(),
        email: formData.email.trim().toLowerCase(),
        contrasenia: formData.contrasenia,
        role: 'daf',
        habilitado: formData.habilitado ? 1 : 0,
      };

      console.log("Enviando datos:", newUserPayload);
      const response = await axios.post(`${API_BASE_URL}/auth/register`, newUserPayload);

      setFormData({
        username: '',
        nombre: '',
        apellidopat: '',
        apellidomat: '',
        email: '',
        contrasenia: '',
        habilitado: true,
      });
      setCurrentStep(1);
      router.replace('/Login');

    } catch (error) {
      console.error("Error al crear usuario:", error);
      
      let errorMessage = 'Error desconocido al crear usuario.';
      const newErrors = {};
      let stepToRevert = 1;

      if (error.response) {
        console.error("Respuesta del servidor:", error.response.data);
        console.error("Errores de validación:", error.response.data.errors);
        
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;

          if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
            const backendErrors = error.response.data.errors;
            const errorMessages = [];

            backendErrors.forEach(err => {
              const fieldPath = err.path || err.param;
              const message = err.message || err.msg;

              if (fieldPath) {
                newErrors[fieldPath] = message;
                if (['username', 'nombre', 'apellidopat', 'apellidomat'].includes(fieldPath)) {
                  stepToRevert = Math.min(stepToRevert, 1);
                } else if (['email', 'contrasenia'].includes(fieldPath)) {
                  stepToRevert = Math.min(stepToRevert, 2);
                }
              }
              errorMessages.push(message);
            });
            errorMessage = errorMessages.join('\n');
          }
        } else if (error.response.status === 409) {
          errorMessage = 'El usuario ya existe. Intenta con otro nombre de usuario o email.';
          stepToRevert = 1;
        } else if (error.response.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      }

      setErrors(prev => ({ ...prev, ...newErrors }));
      setCurrentStep(stepToRevert);

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2].map((step) => (
        <View key={step} style={styles.progressStep}>
          <View style={[
            styles.progressCircle,
            currentStep >= step && styles.progressCircleActive
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[
                styles.progressNumber,
                currentStep >= step && styles.progressNumberActive
              ]}>
                {step}
              </Text>
            )}
          </View>
          {step < 2 && (
            <View style={[
              styles.progressLine,
              currentStep > step && styles.progressLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepTitle = () => {
    const titles = [
      'Información Personal',
      'Credenciales',
    ];
    return (
      <Text style={styles.stepTitle}>
        {titles[currentStep - 1]}
      </Text>
    );
  };

  const renderInputField = (label, field, placeholder, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label}
        {options.required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.inputWrapper}>
        {options.icon && (
          <Ionicons name={options.icon} size={20} color="#666" style={styles.inputIcon} />
        )}
        <TextInput
          style={[
            styles.input,
            options.icon && styles.inputWithIcon,
            errors[field] && styles.inputError
          ]}
          placeholder={placeholder}
          value={formData[field]}
          onChangeText={(value) => updateFormData(field, value)}
          secureTextEntry={field === 'contrasenia' && !showPassword}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize={options.autoCapitalize || 'none'}
          placeholderTextColor="#999"
        />
        {field === 'contrasenia' && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        )}
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {renderInputField('Nombre de Usuario', 'username', 'Ej: jperez', {
        required: true,
        icon: 'person-outline',
        autoCapitalize: 'none'
      })}
      
      {renderInputField('Nombre(s)', 'nombre', 'Ej: Juan Carlos', {
        required: true,
        icon: 'card-outline',
        autoCapitalize: 'words'
      })}
      
      {renderInputField('Apellido Paterno', 'apellidopat', 'Ej: Pérez', {
        required: true,
        icon: 'card-outline',
        autoCapitalize: 'words'
      })}
      
      {renderInputField('Apellido Materno', 'apellidomat', 'Ej: López (Opcional)', {
        icon: 'card-outline',
        autoCapitalize: 'words'
      })}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {renderInputField('Correo Electrónico', 'email', 'ejemplo@correo.com', {
        required: true,
        icon: 'mail-outline',
        keyboardType: 'email-address',
        autoCapitalize: 'none'
      })}
      
      {renderInputField('Contraseña', 'contrasenia', 'Mínimo 6 caracteres', {
        required: true,
        icon: 'lock-closed-outline'
      })}
      
      <View style={styles.passwordStrengthContainer}>
        <View style={styles.passwordStrength}>
          <View style={[
            styles.strengthBar,
            formData.contrasenia.length >= 6 && styles.strengthBarWeak
          ]} />
          <View style={[
            styles.strengthBar,
            formData.contrasenia.length >= 8 && /[A-Z]/.test(formData.contrasenia) && styles.strengthBarMedium
          ]} />
          <View style={[
            styles.strengthBar,
            formData.contrasenia.length >= 8 && /[A-Z]/.test(formData.contrasenia) && /[0-9]/.test(formData.contrasenia) && styles.strengthBarStrong
          ]} />
        </View>
        <Text style={styles.passwordHint}>
          Usa al menos 6 caracteres con mayúsculas y números para mayor seguridad
        </Text>
        <View style={styles.fixedRoleIndicator}>
          <Text style={styles.fixedRoleLabel}>Rol del nuevo usuario:</Text>
          <View style={styles.fixedRoleBadge}>
            <Text style={styles.fixedRoleBadgeText}>DAF</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Stack.Screen 
          options={{ 
            title: 'Nuevo Usuario DAF',
            headerStyle: {
              backgroundColor: '#e95a0c',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }} 
        />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            {renderProgressBar()}
            {renderStepTitle()}
          </View>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={prevStep}
                disabled={isLoading}
              >
                <Ionicons name="arrow-back" size={20} color="#e95a0c" />
                <Text style={styles.secondaryButtonText}>Anterior</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isLoading && styles.buttonDisabled,
                currentStep === 1 && styles.fullWidthButton
              ]}
              onPress={currentStep === totalSteps ? handleAddUser : nextStep}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {currentStep === totalSteps ? 'Crear Usuario DAF' : 'Siguiente'}
                  </Text>
                  {currentStep < totalSteps && (
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e95a0c',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleActive: {
    backgroundColor: '#e95a0c',
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
  },
  progressNumberActive: {
    color: '#fff',
  },
  progressLine: {
    width: 50,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
  },
  progressLineActive: {
    backgroundColor: '#e95a0c',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  stepContainer: {
    paddingVertical: 20,
    paddingBottom: 80,
  },
  conditionalContainer: {
    marginTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  required: {
    color: '#e74c3c',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  inputWithIcon: {
    paddingLeft: 50,
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    top: 17,
    zIndex: 1,
  },
  passwordToggle: {
    position: 'absolute',
    right: 15,
    top: 17,
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  passwordStrengthContainer: {
    marginTop: 10,
  },
  passwordStrength: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginRight: 5,
    borderRadius: 2,
  },
  strengthBarWeak: {
    backgroundColor: '#e74c3c',
  },
  strengthBarMedium: {
    backgroundColor: '#f39c12',
  },
  strengthBarStrong: {
    backgroundColor: '#27ae60',
  },
  passwordHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  dropdownContainer: {
    marginBottom: 15,
    zIndex: 9999,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  roleInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#e95a0c',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 30,
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#e95a0c',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    shadowColor: '#e95a0c',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    borderWidth: 2,
    borderColor: '#e95a0c',
  },
  fullWidthButton: {
    flex: 1,
  },
  buttonDisabled: {
    backgroundColor: '#f9bda3',
    shadowOpacity: 0.1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#e95a0c',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  fixedRoleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff9e6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  fixedRoleLabel: {
    fontSize: 14,
    color: '#666',
  },
  fixedRoleBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fixedRoleBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default CrearUsuarioDaf;