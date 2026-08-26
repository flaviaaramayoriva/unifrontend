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
import axios from 'axios'; 
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'unibackend-production-a0f8.up.railway.app';

const CARRERA_A_FACULTAD = {
  '2': '3', '3': '4', '1': '5', '4': '2', '5': '2', '6': '2', '7': '2', 
  '8': '2', '9': '2', '10': '4', '11': '4', '12': '4', '13': '3', 
  '14': '3', '15': '3', '16': '3', '17': '1',
};

const NOMBRES_FACULTADES = {
  '1': 'Facultad de Ingeniería',
  '2': 'Facultad de Ciencias Económicas',
  '3': 'Facultad de Ciencias de la Salud',
  '4': 'Facultad de Diseño y Tecnología',
  '5': 'Facultad de Ciencias Jurídicas',
};

const Toast = ({ visible, message }) => {
  if (!visible) return null;
  return (
    <View style={styles.toastContainer}>
      <View style={styles.toastContent}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  );
};

const CrearUsuarioEstudiante = () => {
  const router = useRouter();
  const role = 'student';

  const [facultadSeleccionada, setFacultadSeleccionada] = useState(null); 
  const [openFacultad, setOpenFacultad] = useState(false);
  const [opcionesFacultad, setOpcionesFacultad] = useState([]);

  const [openCarrera, setOpenCarrera] = useState(false);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(null);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [opcionesCarrera, setOpcionesCarrera] = useState([
    { label: 'Derecho', value: '1' }, { label: 'Psicología', value: '2' },
    { label: 'Periodismo', value: '3' }, { label: 'Administración de Empresas', value: '4' },
    { label: 'Administración de Hotelería y Turismo', value: '5' }, { label: 'Contaduría Pública', value: '6' }, 
    { label: 'Ingeniería Comercial', value: '7' }, { label: 'Ingeniería Económica', value: '8' },
    { label: 'Ingeniería Económica y Financiera', value: '9' }, { label: 'Arquitectura', value: '10' },
    { label: 'Diseño Gráfico y Producción Cross Media', value: '11' }, { label: 'Publicidad y Marketing', value: '12' },
    { label: 'Bioquímica y Farmacia', value: '13' }, { label: 'Enfermería', value: '14' },
    { label: 'Medicina', value: '15' }, { label: 'Odontología', value: '16' },
    { label: 'Ingeniería de Sistemas', value: '17' },
  ]);

  const capitalizeFirstLetter = (text) => {
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const validate = (field, value) => {
    let error = null;
    switch (field) {
      case 'username':
        if (!value.trim()) error = 'El nombre de usuario es requerido.';
        else if (value.length < 3) error = 'Debe tener al menos 3 caracteres.';
        break;
      case 'nombre':
        if (!value.trim()) error = 'El nombre es requerido.';
        else if (value.length < 2) error = 'El nombre debe tener al menos 2 caracteres.';
        break;
      case 'apellidopat':
        if (!value.trim()) error = 'El apellido paterno es requerido.';
        else if (value.length < 2) error = 'El apellido debe tener al menos 2 caracteres.';
        break;
      case 'email':
        if (!value.trim()) error = 'El email es requerido.';
        else if (!/\S+@\S+\.\S+/.test(value)) error = 'Formato de email inválido.';
        break;
      case 'contrasenia':
        if (!value) error = 'La contraseña es requerida.';
        else if (value.length < 6) error = 'Mínimo 6 caracteres.';
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };
  
  const [formData, setFormData] = useState({
    username: '', nombre: '', apellidopat: '', apellidomat: '',
    email: '', contrasenia: '', habilitado: true,
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  const getToken = async () => {
     const TOKEN_KEY = 'adminAuthToken';
  try {
     if (Platform.OS === 'web') {
      console.log('🔍 Claves en localStorage:', Object.keys(localStorage));
      console.log('🔍 adminAuthToken existe:', !!localStorage.getItem('adminAuthToken'));
      console.log('🔍 studentAuthToken existe:', !!localStorage.getItem('studentAuthToken'));
    } else {
      const allKeys = await SecureStore.getItemAsync('debug_keys');
      console.log('🔍 Claves conocidas:', allKeys);
    }
    let usuarioStr = null;
    if (Platform.OS === 'web') {
      usuarioStr = localStorage.getItem('usuario');
    } else {
      usuarioStr = await AsyncStorage.getItem('usuario');
    }

    if (!usuarioStr) {
      console.error('❌ No se encontró información de usuario');
      return null;
    }

    const usuario = JSON.parse(usuarioStr);
    console.log('👤 Usuario actual:', usuario.role);

    // 2. Determinar la clave del token según el rol
    let TOKEN_KEY;
    switch (usuario.role) {
      case 'admin':
      case 'academico':
      case 'daf':
        TOKEN_KEY = 'adminAuthToken';
        break;
      case 'student':
        TOKEN_KEY = 'studentAuthToken';
        break;
      case 'comunicacion':
        TOKEN_KEY = 'comunicacionAuthToken';
        break;
      case 'TI':
        TOKEN_KEY = 'tiAuthToken';
        break;
      case 'recursos':
        TOKEN_KEY = 'recursosAuthToken';
        break;
      case 'Admisiones':
        TOKEN_KEY = 'admisionesAuthToken';
        break;
      case 'Serv. Estudiatil':
        TOKEN_KEY = 'serviciosEstudiantilesAuthToken';
        break;
      default:
        console.warn('⚠️ Rol no reconocido:', usuario.role);
        TOKEN_KEY = 'authToken';
    }

    // 3. Obtener el token con la clave correcta
    let token = null;
    if (Platform.OS === 'web') {
      token = localStorage.getItem(TOKEN_KEY);
    } else {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    }

    console.log('🔑 Token obtenido:', token ? `Existe (${TOKEN_KEY})` : 'NO EXISTE');

    return token;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    return null;
  }
};

const handleAuthError = () => {
  Alert.alert(
    'Sesión Expirada',
    'Tu sesión ha expirado o no tienes permisos. Por favor, inicia sesión nuevamente.',
    [
      { 
        text: 'Iniciar Sesión', 
        onPress: async () => {
          // Limpiar token antes de redirigir
          try {
            if (Platform.OS === 'web') {
              localStorage.removeItem('studentAuthToken');
              localStorage.removeItem('usuario');
            } else {
              await SecureStore.deleteItemAsync('studentAuthToken');
              await AsyncStorage.removeItem('usuario');
            }
          } catch (e) {
            console.error('Error limpiando storage:', e);
          }
          router.replace('/LoginAdmin');
        }
      }
    ]
  );
};
  useEffect(() => {
    const fetchFacultades = async () => {
      try {
        const token = await getToken();
         if (!token) {
        console.error('❌ Sin token, redirigiendo al login');
        handleAuthError();
        return;
      }

        const config = {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        };
        
        // Solo agregamos el token si existe (ej: si un admin está creando al estudiante)
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(`${API_BASE_URL}/facultades`, config);
        
        if (response.data && Array.isArray(response.data)) {
          const facultadesFormateadas = response.data.map(facultad => ({
            label: facultad.nombre_facultad || 'Sin nombre',
            value: facultad.facultad_id?.toString() || facultad.id?.toString() || ''
          })).filter(f => f.value && f.label);
          
           console.log('✅ Facultades obtenidas:', facultadesFormateadas.length);
          setOpcionesFacultad(facultadesFormateadas);
        } else {
          throw new Error('Formato de respuesta inválido');
        }
      } catch (error) {
        console.error('❌ Error al obtener las Facultades:', error.message);
         console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
        // Fallback seguro para que la pantalla nunca se quede vacía
        setOpcionesFacultad([
          { label: 'Facultad de Ingeniería', value: '1' },
          { label: 'Facultad de Ciencias Económicas', value: '2' },
          { label: 'Facultad de Ciencias de la Salud', value: '3' },
          { label: 'Facultad de Diseño y Tecnología', value: '4' },
          { label: 'Facultad de Ciencias Jurídicas', value: '5' },
        ]);
      }
    };
    fetchFacultades();
  }, []);


  useEffect(() => {
    if (carreraSeleccionada) {
      const facultadId = CARRERA_A_FACULTAD[carreraSeleccionada];
      if (facultadId) {
        setFacultadSeleccionada(facultadId);
        setOpenFacultad(false);
      }
    }
  }, [carreraSeleccionada]);

  const updateFormData = (field, value) => {
    let formattedValue = value;
    if (['nombre', 'apellidopat', 'apellidomat'].includes(field)) {
      formattedValue = capitalizeFirstLetter(value);
    }
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    if (field !== 'contrasenia') {
      validate(field, formattedValue);
    }
  };

  const handleBlur = (field, value) => {
    validate(field, value);
  };

  const validateStep = (step) => {
    const newErrors = {};
    switch (step) {
      case 1: 
        if (!formData.username.trim()) newErrors.username = 'El nombre de usuario es requerido.';
        else if (formData.username.length < 3) newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres.';
        if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido.';
        if (!formData.apellidopat.trim()) newErrors.apellidopat = 'El apellido paterno es requerido.';
        break;
      case 2: 
        if (!formData.email.trim()) newErrors.email = 'El email es requerido.';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'El formato del email no es válido.';
        if (!formData.contrasenia) newErrors.contrasenia = 'La contraseña es requerida.';
        else if (formData.contrasenia.length < 6) newErrors.contrasenia = 'La contraseña debe tener al menos 6 caracteres.';
        break;
      case 3:
        if (!carreraSeleccionada) newErrors.carrera = 'Debe seleccionar la carrera del estudiante.';
        if (!facultadSeleccionada) newErrors.facultad = 'Debe seleccionar la facultad del estudiante.';
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

  const resetForm = () => {
  setFormData({
    username: '', nombre: '', apellidopat: '', apellidomat: '',
    email: '', contrasenia: '', habilitado: true,
  });
  setCarreraSeleccionada(null);
  setFacultadSeleccionada(null);
  setCurrentStep(1);
  setErrors({});
};
  const handleAddUser = async () => {
  if (!validateStep(3)) return;
  
  setIsLoading(true);
  try {
    const token = await getToken();
    
    // ✅ Si no hay token, redirigir al login
    if (!token) {
      console.error('❌ Sin token, redirigiendo al login');
      handleAuthError();
      setIsLoading(false);
      return;
    }
    
    const newUserPayload = {
      username: formData.username.trim(),
      nombre: formData.nombre.trim(),
      apellidopat: formData.apellidopat.trim(),
      apellidomat: formData.apellidomat.trim(),
      email: formData.email.trim().toLowerCase(),
      contrasenia: formData.contrasenia,
      role: role,
      habilitado: formData.habilitado ? 1 : 0,
      idcarrera: parseInt(carreraSeleccionada),
      idfacultad: parseInt(facultadSeleccionada),
    };
   
    console.log('📦 Creando estudiante:', newUserPayload);
    
    const config = {
      timeout: 30000,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const response = await axios.post(`${API_BASE_URL}/auth/registerStudent`, newUserPayload, config);

    console.log('✅ Estudiante creado:', response.status);

    if (response.status === 201 || response.status === 200) {
      setSuccessMessage('¡Estudiante creado correctamente!');
      setShowSuccessActions(true);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);

      return;
    }
  } catch (error) {
    console.error('❌ Error al crear estudiante:', error.message);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Data:', error.response?.data);
    
    // ✅ Manejar específicamente error 401
    if (error.response?.status === 401) {
      handleAuthError();
      setIsLoading(false);
      return;
    }
    
    let errorMessage = 'Error desconocido al crear estudiante.';
    
    if (error.response?.data) {
      errorMessage = typeof error.response.data === 'string' 
        ? error.response.data 
        : (error.response.data.message || error.response.data.error || 'Error en el servidor');
    } else if (error.request) {
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu internet.';
    }

    Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
  } finally {
    setIsLoading(false);
  }
};
// ✅ INGRESAR DIRECTO: hace login automático con las credenciales del estudiante recién creado
const handleDirectLogin = async () => {
  try {
    setIsLoading(true);
    console.log('🔐 Intentando ingreso directo como:', formData.email);

    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        email: formData.email.trim().toLowerCase(),
        password: formData.contrasenia,
      },
      { timeout: 30000 }
    );

    const { token, user } = response.data;

    if (!token || !user) {
      throw new Error('Respuesta de login inválida');
    }

    // Guardar sesión del estudiante (igual que lo hace el LoginScreen)
    if (Platform.OS === 'web') {
      localStorage.setItem('studentAuthToken', token);
      localStorage.setItem('studentUserData', JSON.stringify(user));
      localStorage.setItem('usuario', JSON.stringify({
        id: user.id,
        nombre: user.nombre || user.username,
        role: user.role,
      }));
    } else {
      await SecureStore.setItemAsync('studentAuthToken', token);
      await SecureStore.setItemAsync('studentUserData', JSON.stringify(user));
      await AsyncStorage.setItem('usuario', JSON.stringify({
        id: user.id,
        nombre: user.nombre || user.username,
        role: user.role,
      }));
    }

    console.log('✅ Ingreso directo exitoso, redirigiendo a HomeEstudiante');
    setShowSuccessActions(false);
    setSuccessMessage(null);
    router.replace('/admin/HomeEstudiante');
  } catch (error) {
    console.error('❌ Error en ingreso directo:', error.response?.data || error.message);
    Alert.alert(
      'Error',
      'No se pudo ingresar automáticamente. Inicia sesión manualmente con las credenciales creadas.'
    );
  } finally {
    setIsLoading(false);
  }
};
  const closeAllDropdowns = () => {
    setOpenCarrera(false);
    setOpenFacultad(false);
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.progressStep}>
          <View style={[styles.progressCircle, currentStep >= step && styles.progressCircleActive]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[styles.progressNumber, currentStep >= step && styles.progressNumberActive]}>{step}</Text>
            )}
          </View>
          {step < 3 && <View style={[styles.progressLine, currentStep > step && styles.progressLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderStepTitle = () => {
    const titles = ['Información Personal', 'Credenciales', 'Configuración Académica'];
    return <Text style={styles.stepTitle}>{titles[currentStep - 1]}</Text>;
  };

  const renderInputField = (label, field, placeholder, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}{options.required && <Text style={styles.required}> *</Text>}</Text>
      <View style={styles.inputWrapper}>
        {options.icon && <Ionicons name={options.icon} size={20} color="#666" style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, options.icon && styles.inputWithIcon, errors[field] && styles.inputError]}
          placeholder={placeholder}
          value={formData[field]}
          onChangeText={(value) => updateFormData(field, value)}
          onBlur={() => handleBlur(field, formData[field])}
          secureTextEntry={field === 'contrasenia' && !showPassword}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize={options.autoCapitalize || 'none'}
          placeholderTextColor="#999"
          onFocus={closeAllDropdowns}
        />
        {field === 'contrasenia' && (
          <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {renderInputField('Nombre de Usuario', 'username', 'Ej: jperez', { required: true, icon: 'person-outline', autoCapitalize: 'none' })}
      {renderInputField('Nombre(s)', 'nombre', 'Ej: Juan Carlos', { required: true, icon: 'card-outline', autoCapitalize: 'words' })}
      {renderInputField('Apellido Paterno', 'apellidopat', 'Ej: Pérez', { required: true, icon: 'card-outline', autoCapitalize: 'words' })}
      {renderInputField('Apellido Materno', 'apellidomat', 'Ej: López (Opcional)', { icon: 'card-outline', autoCapitalize: 'words' })}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {renderInputField('Correo Electrónico', 'email', 'ejemplo@correo.com', { required: true, icon: 'mail-outline', keyboardType: 'email-address', autoCapitalize: 'none' })}
      {renderInputField('Contraseña', 'contrasenia', 'Mínimo 6 caracteres', { required: true, icon: 'lock-closed-outline' })}
      <View style={styles.passwordStrengthContainer}>
        <View style={styles.passwordStrength}>
          <View style={[styles.strengthBar, formData.contrasenia.length >= 6 && styles.strengthBarWeak]} />
          <View style={[styles.strengthBar, formData.contrasenia.length >= 8 && /[A-Z]/.test(formData.contrasenia) && styles.strengthBarMedium]} />
          <View style={[styles.strengthBar, formData.contrasenia.length >= 8 && /[A-Z]/.test(formData.contrasenia) && /[0-9]/.test(formData.contrasenia) && styles.strengthBarStrong]} />
        </View>
        <Text style={styles.passwordHint}>Usa al menos 6 caracteres con mayúsculas y números</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.roleBadgeContainer}>
        <View style={styles.roleBadge}>
          <Ionicons name="person" size={20} color="#2ecc71" />
          <Text style={styles.roleBadgeText}>Rol: Estudiante</Text>
        </View>
        <Text style={styles.roleInfoText}>Esta pantalla está diseñada exclusivamente para crear cuentas de estudiantes</Text>
      </View>

      <View style={[styles.conditionalContainer, { zIndex: 2000 }]}>
        <Text style={styles.label}>Carrera del Estudiante <Text style={styles.required}>*</Text></Text>
        <View style={[styles.dropdownContainer, { marginBottom: openCarrera ? 280 : 20 }]}>
          <DropDownPicker
            open={openCarrera} value={carreraSeleccionada} items={opcionesCarrera}
            setOpen={setOpenCarrera} setValue={setCarreraSeleccionada} setItems={setOpcionesCarrera}
            placeholder="Selecciona la carrera del estudiante"
            style={[styles.dropdown, styles.carreraDropdown, errors.carrera && styles.inputError]}
            dropDownContainerStyle={[styles.dropdownList, { zIndex: 2000, elevation: 2000, maxHeight: 250 }]}
            listMode="SCROLLVIEW" textStyle={styles.dropdownText} placeholderStyle={styles.dropdownPlaceholder}
            onOpen={() => setOpenFacultad(false)} searchable={true} searchPlaceholder="Buscar carrera..."
            showArrowIcon={true} showTickIcon={true} itemSeparator={true} itemSeparatorStyle={{ backgroundColor: "#f0f0f0" }}
          />
        </View>
        {errors.carrera && <Text style={styles.errorText}>{errors.carrera}</Text>}
        <View style={styles.roleInfoContainer}>
          <Text style={styles.roleInfoText}>💡 Selecciona la carrera y la facultad se asignará automáticamente</Text>
        </View>
      </View>

      <View style={[styles.conditionalContainer, { zIndex: 1000 }]}>
        <Text style={styles.label}>Facultad del Estudiante <Text style={styles.required}>*</Text></Text>
        <View style={[styles.dropdownContainer, { marginTop: 5 }]}>
          <DropDownPicker
            open={openFacultad} value={facultadSeleccionada} items={opcionesFacultad}
            setOpen={setOpenFacultad} setValue={setFacultadSeleccionada} setItems={setOpcionesFacultad}
            placeholder="La facultad se asignará automáticamente"
            style={[styles.dropdown, errors.facultad && styles.inputError]}
            dropDownContainerStyle={styles.dropdownList} listMode="SCROLLVIEW"
            textStyle={styles.dropdownText} placeholderStyle={styles.dropdownPlaceholder}
            onOpen={() => setOpenCarrera(false)} disabled={!!carreraSeleccionada}
            disabledStyle={{ backgroundColor: '#f0f0f0' }} disabledTextStyle={{ color: '#666', fontWeight: '600' }}
            zIndex={1000} zIndexInverse={1000}
          />
        </View>
        {errors.facultad && <Text style={styles.errorText}>{errors.facultad}</Text>}
        {carreraSeleccionada && facultadSeleccionada && (
          <View style={styles.autoSelectionBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#27ae60" />
            <Text style={styles.autoSelectionText}>
              {NOMBRES_FACULTADES[facultadSeleccionada]} (asignada automáticamente)
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <Stack.Screen options={{ title: 'Nuevo Estudiante', headerStyle: { backgroundColor: '#e95a0c' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' } }} />
        
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            {renderProgressBar()}
            {renderStepTitle()}
          </View>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.secondaryButton} onPress={prevStep} disabled={isLoading}>
                <Ionicons name="arrow-back" size={20} color="#e95a0c" />
                <Text style={styles.secondaryButtonText}>Anterior</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled, currentStep === 1 && styles.fullWidthButton]}
              onPress={currentStep === totalSteps ? handleAddUser : nextStep}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>{currentStep === totalSteps ? 'Crear Estudiante' : 'Siguiente'}</Text>
                  {currentStep < totalSteps && <Ionicons name="arrow-forward" size={20} color="#fff" />}
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
       <Toast visible={!!successMessage} message={successMessage} />

{showSuccessActions && (
  <View style={styles.successActionsContainer}>
    {/* ✅ INGRESAR DIRECTO como el estudiante creado */}
    <TouchableOpacity
      style={styles.successActionButton}
      onPress={handleDirectLogin}
      disabled={isLoading}
    >
      <Ionicons name="log-in-outline" size={20} color="#fff" />
      <Text style={styles.successActionText}>Ingresar directo</Text>
    </TouchableOpacity>

    {/* ✅ VOLVER AL MENÚ del administrador */}
    <TouchableOpacity
      style={[styles.successActionButton, styles.successActionSecondary]}
      onPress={() => {
        setShowSuccessActions(false);
        setSuccessMessage(null);
        router.back(); // vuelve al panel de donde viniste
      }}
    >
      <Ionicons name="home-outline" size={20} color="#e95a0c" />
      <Text style={[styles.successActionText, { color: '#e95a0c' }]}>Volver al menú</Text>
    </TouchableOpacity>
  </View>
)}


      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e95a0c' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingVertical: 20, alignItems: 'center' },
  carreraDropdown: { paddingVertical: 15, paddingHorizontal: 15, minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  progressCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  progressCircleActive: { backgroundColor: '#e95a0c' },
  progressNumber: { fontSize: 16, fontWeight: 'bold', color: '#999' },
  progressNumberActive: { color: '#fff' },
  progressLine: { width: 50, height: 2, backgroundColor: '#e0e0e0', marginHorizontal: 5 },
  progressLineActive: { backgroundColor: '#e95a0c' },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  stepContainer: { paddingVertical: 20 },
  conditionalContainer: { marginTop: 25 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '600' },
  required: { color: '#e74c3c' },
  inputWrapper: { position: 'relative' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15, fontSize: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3.84, elevation: 2 },
  inputWithIcon: { paddingLeft: 50 },
  inputIcon: { position: 'absolute', left: 15, top: 17, zIndex: 1 },
  passwordToggle: { position: 'absolute', right: 15, top: 17 },
  inputError: { borderColor: '#e74c3c', borderWidth: 2 },
  errorText: { color: '#e74c3c', fontSize: 12, marginTop: 5, marginLeft: 5 },
  passwordStrengthContainer: { marginTop: 10 },
  passwordStrength: { flexDirection: 'row', marginBottom: 5 },
  strengthBar: { height: 4, flex: 1, backgroundColor: '#e0e0e0', marginRight: 5, borderRadius: 2 },
  strengthBarWeak: { backgroundColor: '#e74c3c' },
  strengthBarMedium: { backgroundColor: '#f39c12' },
  strengthBarStrong: { backgroundColor: '#27ae60' },
  passwordHint: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  dropdownContainer: { marginBottom: 10 },
  dropdown: { backgroundColor: '#fff', borderColor: '#ddd', borderWidth: 1, borderRadius: 12, minHeight: 50 },
  dropdownList: { backgroundColor: '#fff', borderColor: '#ddd', borderWidth: 1, borderRadius: 12 },
  dropdownText: { fontSize: 16, color: '#333' },
  dropdownPlaceholder: { fontSize: 16, color: '#999' },
  roleBadgeContainer: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 15, marginBottom: 25, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#2ecc71' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  roleBadgeText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  roleInfoText: { fontSize: 14, color: '#27ae60', textAlign: 'center', marginTop: 5 },
  roleInfoContainer: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#e95a0c' },
  autoSelectionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f8f5', padding: 10, borderRadius: 8, marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#27ae60' },
  autoSelectionText: { fontSize: 14, color: '#27ae60', marginLeft: 8, fontWeight: '500' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 30, gap: 15 },
  primaryButton: { backgroundColor: '#e95a0c', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flex: 1, shadowColor: '#e95a0c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  secondaryButton: { backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flex: 1, borderWidth: 2, borderColor: '#e95a0c' },
  fullWidthButton: { flex: 1 },
  buttonDisabled: { backgroundColor: '#f9bda3', shadowOpacity: 0.1 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  secondaryButtonText: { color: '#e95a0c', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  toastContainer: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center', zIndex: 9999, paddingHorizontal: 20 },
  toastContent: { backgroundColor: '#27ae60', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8, minWidth: 280 },
  toastText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 12, textAlign: 'center' },
  successActionsContainer: {
  position: 'absolute',
  bottom: 30,
  left: 20,
  right: 20,
  flexDirection: 'row',
  gap: 10,
  zIndex: 9998,
},
successActionButton: {
  flex: 1,
  backgroundColor: '#27ae60',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  paddingHorizontal: 20,
  borderRadius: 12,
  gap: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 5,
},
successActionSecondary: {
  backgroundColor: '#fff',
  borderWidth: 2,
  borderColor: '#e95a0c',
},
successActionText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '600',
},
});

export default CrearUsuarioEstudiante;