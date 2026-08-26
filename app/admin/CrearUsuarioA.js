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
  Switch,
  Dimensions
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import DropDownPicker from 'react-native-dropdown-picker';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const CARRERA_A_FACULTAD = {
  '1':'1', '2':'2', '3':'2', '4':'2', '5':'2', '6':'2', '7':'2', 
  '8':'3', '9':'3', '10':'3', '11':'3', '12':'4', '13':'4', '14':'4', 
  '15':'5', '16':'5', '17':'5', 
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

const CrearUsuarioA = () => {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState(null);
  const [open, setOpen] = useState(false); 
  const [role, setRole] = useState(null); 
  const [facultadSeleccionada, setFacultadSeleccionada] = useState(null);
  const [openFacultad, setOpenFacultad] = useState(false);
  const [opcionesFacultad, setOpcionesFacultad] = useState([]);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  
  const [items] = useState([ 
    { label: 'Administrador', value: 'admin', icon: () => <Ionicons name="shield-checkmark" size={20} color="#e74c3c" /> },
    { label: 'Estudiante', value: 'student', icon: () => <Ionicons name="person" size={20} color="#2ecc71" /> },
    { label: 'Director de Carrera', value: 'academico', icon: () => <Ionicons name="person-circle" size={20} color="#8e44ad" /> },
    { label: 'DAF', value: 'daf', icon: () => <Ionicons name="calculator" size={20} color="#9b59b6" /> },
  ]);

  const [openCarrera, setOpenCarrera] = useState(false);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(null);
  const [carrerasDocente, setCarrerasDocente] = useState([]);
  const [opcionesCarrera] = useState([ 
    { label: 'Ingeniería de Sistemas', value: '1' },
    { label: 'Administración de Empresas', value: '2' },
    { label: 'Administración de Hotelería y Turismo', value: '3' },
    { label: 'Contaduría Pública', value: '4' },
    { label: 'Ingeniería Comercial', value: '5' },
    { label: 'Ingeniería Económica', value: '6' },
    { label: 'Ingeniería Económica y Financiera', value: '7' },
    { label: 'Bioquímica y Farmacia', value: '8' },
    { label: 'Enfermería', value: '9' },
    { label: 'Medicina', value: '10' },
    { label: 'Odontología', value: '11' },
    { label: 'Arquitectura', value: '12' },
    { label: 'Diseño Gráfico y Producción Cross Media', value: '13' },
    { label: 'Publicidad y Marketing', value: '14' },
    { label: 'Derecho', value: '15' },
    { label: 'Psicología', value: '16' },
    { label: 'Periodismo', value: '17' },
  ]);

  const [formData, setFormData] = useState({
    username: '',
    nombre: '',
    apellidopat: '',
    apellidomat: '',
    email: '',
    contrasenia: '',
    habilitado: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const getToken = async () => {
    const TOKEN_KEY = 'adminAuthToken';
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(TOKEN_KEY);
      } else {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  };

  const roleNeedsCarreras = (selectedRole) => {
    return ['student', 'docente', 'academico'].includes(selectedRole);
  };

  useEffect(() => {
    const fetchFacultades = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Token no encontrado.');
        
        const response = await axios.get(`${API_BASE_URL}/facultades`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        
        if (response.data && Array.isArray(response.data)) {
          const facultadesFormateadas = response.data.map(facultad => ({
            label: facultad.nombre_facultad || 'Sin nombre',
            value: facultad.facultad_id?.toString() || ''
          })).filter(f => f.value && f.label);
          setOpcionesFacultad(facultadesFormateadas);
        } else {
          setOpcionesFacultad([
            { label: 'Facultad de Ingeniería', value: '1' },
            { label: 'Facultad de Ciencias Económicas', value: '2' },
            { label: 'Facultad de Ciencias de la Salud', value: '3' },
            { label: 'Facultad de Diseño y Tecnología', value: '4' },
            { label: 'Facultad de Ciencias Jurídicas', value: '5' },
          ]);
        }
      } catch (error) {
        console.error('Error al obtener las Facultades', error);
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

  const capitalizeFirstLetter = (text) => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();
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

  useEffect(() => {
    if (role !== 'docente') {
      setCarrerasDocente([]);
    }
    if (role !== 'student' && role !== 'academico') {
      setCarreraSeleccionada(null);
      setFacultadSeleccionada(null);
    }
    setOpenCarrera(false);
    setOpenFacultad(false);
    setOpen(false);
  }, [role]);

  const updateFormData = (field, value) => {
    let formattedValue = value;
    if (['nombre', 'apellidopat', 'apellidomat'].includes(field)) {
      formattedValue = capitalizeFirstLetter(value);
    }
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

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
        
      case 3:
        if (!role) {
          newErrors.role = 'El rol es requerido.';
        }
        if (roleNeedsCarreras(role)) {
          const carreraValida = role === 'docente' ? 
            (carrerasDocente && carrerasDocente.length > 0) : 
            carreraSeleccionada;
          if (!carreraValida) {
            if (role === 'student') {
              newErrors.carrera = 'Debe seleccionar la carrera del estudiante.';
            } else if (role === 'academico') { 
              newErrors.carrera = 'Debe seleccionar la carrera que dirigirá.';
            } else if (role === 'docente') {
              newErrors.carrera = 'Debe seleccionar al menos una carrera donde enseñará.';
            }
          }
          if (role === 'student' && !facultadSeleccionada) {
            newErrors.facultad = 'La facultad es requerida.';
          }
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
    if (!validateStep(3)) return;
    
    setIsLoading(true);
    console.log("=== DIAGNÓSTICO ===");
    console.log("Role seleccionado:", role);
    console.log("Carrera seleccionada:", carreraSeleccionada);
    console.log("Facultad seleccionada:", facultadSeleccionada);
    console.log("Carreras docente:", carrerasDocente);
    
    try {
      const token = await getToken();
      if (!token) throw new Error('Token no encontrado. Por favor, inicia sesión nuevamente.');

      const newUserPayload = {
        username: formData.username.trim(),
        nombre: formData.nombre.trim(),
        apellidopat: formData.apellidopat.trim(),
        apellidomat: formData.apellidomat.trim(),
        email: formData.email.trim().toLowerCase(),
        contrasenia: formData.contrasenia,
        role: role,
        habilitado: formData.habilitado ? 1 : 0,
      };

      if (roleNeedsCarreras(role)) {
        if (role === 'student' || role === 'academico') {
          if (carreraSeleccionada) {
            newUserPayload.idcarrera = parseInt(carreraSeleccionada);
            newUserPayload.idfacultad = parseInt(facultadSeleccionada || CARRERA_A_FACULTAD[carreraSeleccionada]);
          }
        } else if (role === 'docente') {
          if (carrerasDocente && carrerasDocente.length > 0) {
            newUserPayload.carreras_ids = carrerasDocente.map(id => parseInt(id));
          }
        }
      }
     
      console.log("FRONTEND - Payload enviado:", JSON.stringify(newUserPayload, null, 2));
      
      const endpoint = role === 'student' ? '/auth/registerStudent' : '/auth/register';
      
      console.log("=== ENVIANDO AL BACKEND ===");
      console.log("Endpoint:", `${API_BASE_URL}${endpoint}`);
      console.log("Payload completo:", newUserPayload);
      console.log("Valor de 'role' que se envía:", newUserPayload.role);
      
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, newUserPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 201 || response.status === 200) {
  setSuccessMessage(role === 'student' ? '¡Estudiante creado correctamente!' : '¡Usuario creado correctamente!');
  setShowSuccessActions(true);

  setTimeout(() => {
    setSuccessMessage(null);
    
    if (Platform.OS === 'web') {
      if (window.confirm('✅ Usuario creado. ¿Deseas crear otro?')) {
        // Crear otro: resetea y se queda en la pantalla
        resetForm();
      } else {
        // Volver al panel SIN cerrar sesión
        router.back();
      }
    } else {
      Alert.alert(
        '✅ Usuario creado',
        '¿Qué deseas hacer ahora?',
        [
          {
            text: 'Crear otro',
            onPress: () => resetForm(),
            style: 'default',
          },
          {
            text: 'Volver al panel',
            onPress: () => router.back(),
            style: 'cancel',
          },
        ],
        { cancelable: false }
      );
    }
  }, 2500);
  return;
}
      
    } catch (error) {
      console.error("Error al crear usuario:", error);
      
      let errorMessage = 'Error desconocido al crear usuario.';
      const newErrors = {};
      let stepToRevert = 1;

      if (error.response) {
        console.error("Respuesta del servidor:", error.response.data);
        
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
                } else if (['role', 'carrera', 'idcarrera', 'idfacultad', 'carreras_ids'].some(f => fieldPath.includes(f))) {
                  stepToRevert = Math.min(stepToRevert, 3);
                }
              }
              errorMessages.push(message);
            });
            errorMessage = errorMessages.join('\n');
          }
        } else if (error.response.status === 409) {
          errorMessage = 'El usuario ya existe. Intenta con otro nombre de usuario o email.';
          stepToRevert = 1;
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Datos inválidos. Verifica la información.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      } else {
        errorMessage = error.message || 'Error al configurar la petición.';
      }

      setErrors(prev => ({ ...prev, ...newErrors }));
      setCurrentStep(stepToRevert);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
  setFormData({
    username: '',
    nombre: '',
    apellidopat: '',
    apellidomat: '',
    email: '',
    contrasenia: '',
    habilitado: true,
  });
  setRole(null);
  setCarreraSeleccionada(null);
  setFacultadSeleccionada(null);
  setCarrerasDocente([]);
  setCurrentStep(1);
  setErrors({});
};
  const closeAllDropdowns = () => {
    setOpen(false);
    setOpenCarrera(false);
    setOpenFacultad(false);
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((step) => (
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
          {step < 3 && (
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
    const titles = ['Información Personal', 'Credenciales', 'Rol y Configuración'];
    return <Text style={styles.stepTitle}>{titles[currentStep - 1]}</Text>;
  };

  // ✅ ACTUALIZADO: Se agregaron propiedades de seguridad al TextInput
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
          onFocus={closeAllDropdowns}
          // Propiedades de seguridad para evitar autocompletado inseguro
          autoComplete={options.autoComplete || 'off'}
          textContentType={options.textContentType || 'none'}
          autoCorrect={options.autoCorrect !== undefined ? options.autoCorrect : false}
          spellCheck={options.spellCheck !== undefined ? options.spellCheck : false}
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
        autoCapitalize: 'none',
        autoComplete: 'new-username', // Indica que es un usuario nuevo
        textContentType: 'none',
        autoCorrect: false,
        spellCheck: false
      })}
      {renderInputField('Nombre(s)', 'nombre', 'Ej: Juan Carlos', {
        required: true, icon: 'card-outline', autoCapitalize: 'words'
      })}
      {renderInputField('Apellido Paterno', 'apellidopat', 'Ej: Pérez', {
        required: true, icon: 'card-outline', autoCapitalize: 'words'
      })}
      {renderInputField('Apellido Materno', 'apellidomat', 'Ej: López (Opcional)', {
        icon: 'card-outline', autoCapitalize: 'words'
      })}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {renderInputField('Correo Electrónico', 'email', 'ejemplo@correo.com', {
        required: true, 
        icon: 'mail-outline', 
        keyboardType: 'email-address', 
        autoCapitalize: 'none',
        autoComplete: 'off', // Desactiva sugerencias de correo
        textContentType: 'none', // iOS: no sugerir
        autoCorrect: false,
        spellCheck: false
      })}
      {renderInputField('Contraseña', 'contrasenia', 'Mínimo 6 caracteres', {
        required: true, 
        icon: 'lock-closed-outline',
        autoComplete: 'new-password', // Indica al gestor que es una contraseña nueva
        textContentType: 'newPassword', // iOS: trata como nueva contraseña
        autoCorrect: false,
        spellCheck: false
      })}
      <View style={styles.passwordStrengthContainer}>
        <View style={styles.passwordStrength}>
          <View style={[styles.strengthBar, formData.contrasenia.length >= 6 && styles.strengthBarWeak]} />
          <View style={[styles.strengthBar, formData.contrasenia.length >= 8 && /[A-Z]/.test(formData.contrasenia) && styles.strengthBarMedium]} />
          <View style={[styles.strengthBar, formData.contrasenia.length >= 8 && /[A-Z]/.test(formData.contrasenia) && /[0-9]/.test(formData.contrasenia) && styles.strengthBarStrong]} />
        </View>
        <Text style={styles.passwordHint}>
          Usa al menos 6 caracteres con mayúsculas y números para mayor seguridad
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.label}>
        Rol <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.dropdownContainer, { zIndex: 3000 }]}>
        <DropDownPicker
          open={open}
          value={role}
          items={items}
          setOpen={setOpen}
          setValue={setRole}
          placeholder="Selecciona un rol"
          style={[styles.dropdown, errors.role && styles.inputError]}
          dropDownContainerStyle={[styles.dropdownList, { zIndex: 3000, elevation: isWeb ? 0 : 3000 }]}
          listMode={isWeb ? "FLATLIST" : "SCROLLVIEW"}
          textStyle={styles.dropdownText}
          placeholderStyle={styles.dropdownPlaceholder}
          onOpen={() => {
            setOpenCarrera(false);
            setOpenFacultad(false);
          }}
          searchable={false}
          showArrowIcon={true}
          showTickIcon={true}
          itemSeparator={true}
          itemSeparatorStyle={{ backgroundColor: "#f0f0f0" }}
        />
      </View>
      {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}

      {roleNeedsCarreras(role) && (
        <View style={styles.conditionalContainer}>
          <Text style={styles.label}>
            {role === 'student' && 'Carrera del Estudiante'}
            {role === 'academico' && 'Carrera a Dirigir'}
            {role === 'docente' && 'Carreras donde Enseña'}
            <Text style={styles.required}> *</Text>
          </Text>
          
          {role === 'student' && (
            <View style={styles.roleBadgeContainerStudent}>
              <View style={styles.roleBadgeStudent}>
                <Ionicons name="person" size={20} color="#2ecc71" />
                <Text style={styles.roleBadgeTextStudent}>Rol: Estudiante</Text>
              </View>
              <Text style={styles.roleInfoTextStudent}>
                Esta pantalla está diseñada exclusivamente para crear cuentas de estudiantes
              </Text>
            </View>
          )}
          
          {role === 'academico' && (
            <View style={styles.roleBadgeContainer}>
              <View style={styles.roleBadge}>
                <Ionicons name="person-circle" size={20} color="#8e44ad" />
                <Text style={styles.roleBadgeText}>Rol: Director de Carrera</Text>
              </View>
              <Text style={styles.roleInfoText}>Selecciona la carrera que dirigirá</Text>
            </View>
          )}
          
          <View style={[styles.dropdownContainer, { 
            marginBottom: openCarrera ? 280 : 20,
            zIndex: role === 'student' ? 2500 : role === 'academico' ? 2000 : 1500
          }]}>
            <DropDownPicker
              multiple={role === 'docente'}
              min={1}
              max={role === 'docente' ? 5 : 1}
              open={openCarrera}
              value={role === 'docente' ? carrerasDocente : carreraSeleccionada}
              items={opcionesCarrera}
              setOpen={setOpenCarrera}
              setValue={role === 'docente' ? setCarrerasDocente : setCarreraSeleccionada}
              placeholder={
                role === 'student' ? 'Selecciona la carrera del estudiante' :
                role === 'academico' ? 'Selecciona la carrera a dirigir' : 
                'Selecciona las carreras donde enseñará'
              }
              style={[styles.dropdown, role === 'academico' && styles.carreraDropdown, errors.carrera && styles.inputError]}
              dropDownContainerStyle={[styles.dropdownList, { 
                zIndex: role === 'student' ? 2500 : role === 'academico' ? 2000 : 1500, 
                elevation: role === 'student' ? 2500 : role === 'academico' ? 2000 : 1500,
                maxHeight: 250,
              }]}
              listMode={isWeb ? "FLATLIST" : "SCROLLVIEW"}
              textStyle={styles.dropdownText}
              placeholderStyle={styles.dropdownPlaceholder}
              multipleText={role === 'docente' ? "%d carreras seleccionadas" : undefined}
              onOpen={() => {
                setOpen(false);
                setOpenFacultad(false);
              }}
              searchable={role === 'academico' || role === 'student'}
              searchPlaceholder={role === 'academico' || role === 'student' ? "Buscar carrera..." : undefined}
              showArrowIcon={true}
              showTickIcon={true}
              itemSeparator={true}
              itemSeparatorStyle={{ backgroundColor: "#f0f0f0" }}
            />
          </View>
          {errors.carrera && <Text style={styles.errorText}>{errors.carrera}</Text>}
          
          <View style={styles.roleInfoContainer}>
            <Text style={styles.roleInfoText}>
              {role === 'student' && '💡 Selecciona la carrera y la facultad se asignará automáticamente'}
              {role === 'academico' && '💡 Este usuario será el director de la carrera seleccionada'}
              {role === 'docente' && '💡 El docente podrá enseñar en las carreras seleccionadas'}
            </Text>
          </View>

          {role === 'student' && (
            <View style={[styles.conditionalContainer, { zIndex: 1000, marginTop: 25 }]}>
              <Text style={styles.label}>
                Facultad del Estudiante <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.dropdownContainer, { marginTop: 5 }]}>
                <DropDownPicker
                  open={openFacultad}
                  value={facultadSeleccionada}
                  items={opcionesFacultad}
                  setOpen={setOpenFacultad}
                  setValue={setFacultadSeleccionada}
                  placeholder="La facultad se asignará automáticamente"
                  style={[styles.dropdown, errors.facultad && styles.inputError]}
                  dropDownContainerStyle={styles.dropdownList}
                  listMode="SCROLLVIEW"
                  textStyle={styles.dropdownText}
                  placeholderStyle={styles.dropdownPlaceholder}
                  onOpen={() => setOpenCarrera(false)}
                  disabled={!!carreraSeleccionada}
                  disabledStyle={{ backgroundColor: '#f0f0f0' }}
                  disabledTextStyle={{ color: '#666', fontWeight: '600' }}
                  zIndex={1000}
                  zIndexInverse={1000}
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
          )}
        </View>
      )}
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
            title: role === 'student' ? 'Nuevo Estudiante' : 'Nuevo Usuario',
            headerStyle: { backgroundColor: '#e95a0c' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
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
          {currentStep === 3 && renderStep3()}

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
                    {currentStep === totalSteps ? (role === 'student' ? 'Crear Estudiante' : 'Crear Usuario') : 'Siguiente'}
                  </Text>
                  {currentStep < totalSteps && (
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
         <Toast visible={!!successMessage} message={successMessage}  />
         {showSuccessActions && (
  <View style={styles.successActionsContainer}>
    <TouchableOpacity
      style={styles.successActionButton}
      onPress={() => {
        resetForm();
        setShowSuccessActions(false);
        setSuccessMessage(null);
      }}
    >
      <Ionicons name="person-add-outline" size={20} color="#fff" />
      <Text style={styles.successActionText}>Crear otro</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.successActionButton, styles.successActionSecondary]}
      onPress={() => {
        setShowSuccessActions(false);
        setSuccessMessage(null);
        router.back();
      }}
    >
      <Ionicons name="home-outline" size={20} color="#e95a0c" />
      <Text style={[styles.successActionText, { color: '#e95a0c' }]}>Volver al panel</Text>
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
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 150 },
  header: { paddingVertical: 20, alignItems: 'center' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  progressCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center',
  },
  progressCircleActive: { backgroundColor: '#e95a0c' },
  progressNumber: { fontSize: 16, fontWeight: 'bold', color: '#999' },
  progressNumberActive: { color: '#fff' },
  progressLine: { width: 50, height: 2, backgroundColor: '#e0e0e0', marginHorizontal: 5 },
  progressLineActive: { backgroundColor: '#e95a0c' },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  stepContainer: { paddingVertical: 20, paddingBottom: 200 },
  conditionalContainer: { marginTop: 20 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '600' },
  required: { color: '#e74c3c' },
  inputWrapper: { position: 'relative' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15, fontSize: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 3.84, elevation: 2,
  },
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
  dropdownContainer: { marginBottom: 15 },
  dropdown: { backgroundColor: '#fff', borderColor: '#ddd', borderWidth: 1, borderRadius: 12, minHeight: 50 },
  carreraDropdown: {
    paddingVertical: 15, paddingHorizontal: 15,
    minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#ddd',
  },
  dropdownList: { backgroundColor: '#fff', borderColor: '#ddd', borderWidth: 1, borderRadius: 12 },
  dropdownText: { fontSize: 16, color: '#333' },
  dropdownPlaceholder: { fontSize: 16, color: '#999' },
  roleInfoContainer: {
    backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12,
    marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#e95a0c',
  },
  roleInfoText: { fontSize: 14, color: '#666' },
  roleBadgeContainer: {
    backgroundColor: '#f5f0ff', borderRadius: 12, padding: 15,
    marginBottom: 20, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#8e44ad',
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#8e44ad',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8,
  },
  roleBadgeText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  roleBadgeContainerStudent: {
    backgroundColor: '#e8f5e9', borderRadius: 12, padding: 15,
    marginBottom: 20, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#2ecc71',
  },
  roleBadgeStudent: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2ecc71',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8,
  },
  roleBadgeTextStudent: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  roleInfoTextStudent: { fontSize: 14, color: '#27ae60', textAlign: 'center', marginTop: 5 },
  autoSelectionBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f8f5',
    padding: 10, borderRadius: 8, marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#27ae60',
  },
  autoSelectionText: { fontSize: 14, color: '#27ae60', marginLeft: 8, fontWeight: '500' },
  buttonContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 30, paddingBottom: 20, gap: 15,
  },
  primaryButton: {
    backgroundColor: '#e95a0c', paddingVertical: 15, paddingHorizontal: 30,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', flex: 1, shadowColor: '#e95a0c',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 30,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', flex: 1, borderWidth: 2, borderColor: '#e95a0c',
  },
  fullWidthButton: { flex: 1 },
  buttonDisabled: { backgroundColor: '#f9bda3', shadowOpacity: 0.1 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  secondaryButtonText: { color: '#e95a0c', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  toastContainer: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    alignItems: 'center', zIndex: 9999, paddingHorizontal: 20,
  },
  toastContent: {
    backgroundColor: '#27ae60', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8, minWidth: 280,
  },
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

export default CrearUsuarioA;