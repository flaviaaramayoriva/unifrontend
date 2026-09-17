import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const parseDateLocal = (dateInput) => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  }
  
  const dateStr = String(dateInput).trim();
  
  // Extraer YYYY-MM-DD de cualquier formato (incluye ISO con hora: 2026-09-30T00:00:00.000Z)
  const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }
  
  // Formato DD/MM/YYYY
  const dmyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }
  
  // Si tiene hora completa
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Formatea una fecha a YYYY-MM-DD usando hora LOCAL (no UTC)
 */
const formatToISODate = (date) => {
  let d = date;
  if (!(date instanceof Date)) {
    d = parseDateLocal(date);
  }
  
  if (!d || isNaN(d.getTime())) {
    d = new Date();
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una fecha a HH:MM usando hora LOCAL
 */
const formatToISOTime = (date) => {
  let d = date;
  if (!(date instanceof Date)) {
    d = parseDateLocal(date);
  }
  if (!d || isNaN(d.getTime())) {
    d = new Date();
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Convierte una fecha a string YYYY-MM-DD para enviar al backend
 */
const parseDateSafe = (date) => {
  if (!date) return formatToISODate(new Date());
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return formatToISODate(new Date());
    return formatToISODate(date);
  }
  const parsed = parseDateLocal(date);
  return formatToISODate(parsed);
};

// Formatters para el payload
const formatActivityForSubmit = (actividad) => ({
  nombreActividad: actividad.nombreActividad?.trim() || '',
  responsable: actividad.responsable?.trim() || '',
  fechaInicio: parseDateSafe(actividad.fechaInicio),
  fechaFin: parseDateSafe(actividad.fechaFin),
});

const formatServicioForSubmit = (servicio) => ({
  nombreServicio: servicio.nombreServicio?.trim() || '',
  caracteristica: servicio.caracteristica?.trim() || '',
  fechaInicio: parseDateSafe(servicio.fechaInicio),
  observaciones: servicio.observaciones?.trim() || '',
});

const formatAmbienteForSubmit = (ambiente) => ({
  nombre: ambiente.nombre?.trim() || '',
  requisito: ambiente.requisito?.trim() || '',
  observaciones: ambiente.observaciones?.trim() || '',
});

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return sessionStorage.getItem(TOKEN_KEY); }
    catch (e) { console.error("Error sessionStorage:", e); return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); }
    catch (e) { console.error("Error SecureStore:", e); return null; }
  }
};

const showAlert = (title, message, onOk) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (typeof onOk === 'function') onOk();
    return;
  }
  Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
};

LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene.','Feb.','Mar.','Abr.','May.','Jun.','Jul.','Ago.','Sep.','Oct.','Nov.','Dic.'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom.','Lun.','Mar.','Mié.','Jue.','Vie.','Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

const SectionHeader = ({ icon, title, color = '#C44200' }) => (
  <View style={styles.sectionHeaderRow}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const ACTIVIDAD_ICONS = {
  'Programación de Actividades Previas': 'calendar-outline',
  'Programación de Actividades Durante el Evento': 'play-circle-outline',
  'Programación de Actividades Después del Evento': 'checkmark-done-outline',
};

const SeccionActividades = ({ titulo, actividades, setActividades, handleActividadDateChange, errors, fechaBase }) => {
  const baseDate = fechaBase instanceof Date && !isNaN(fechaBase.getTime()) ? fechaBase : new Date();

  const agregarActividad = () => {
    setActividades(prev => [...prev, {
      key: `act-${titulo.replace(/\s/g, '')}-${Date.now()}-${Math.random()}`,
      nombreActividad: '',
      responsable: '',
      fechaInicio: new Date(baseDate),
      fechaFin: new Date(baseDate),
      showDatePickerInicio: false,
      showDatePickerFin: false,
    }]);
  };

  const eliminarActividad = (index) => {
    setActividades(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.formSection}>
      <SectionHeader icon={ACTIVIDAD_ICONS[titulo] || 'calendar-outline'} title={titulo} />
      {actividades.map((actividad, index) => (
        <View key={actividad.key} style={styles.actividadPreviaItemContainer}>
          <View style={styles.actividadItemHeader}>
            <Text style={styles.actividadPreviaTitle}>Actividad #{index + 1}</Text>
            <TouchableOpacity onPress={() => eliminarActividad(index)} style={styles.deleteButton}>
              <Ionicons name="trash-bin-outline" size={22} color="#c0392b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Actividad</Text>
          <View style={[styles.inputGroup, errors[`${titulo}_${index}_nombre`] && styles.inputError]}>
            <Ionicons name="archive-outline" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={actividad.nombreActividad}
              onChangeText={(text) => {
                setActividades(prev => {
                  const newState = [...prev];
                  newState[index] = { ...newState[index], nombreActividad: text };
                  return newState;
                });
              }}
              placeholder="Nombre de la Actividad"
              placeholderTextColor="#aaa"
              accessibilityLabel="Nombre de la Actividad"
            />
          </View>
          {errors[`${titulo}_${index}_nombre`] && <Text style={styles.errorText}>{errors[`${titulo}_${index}_nombre`]}</Text>}

          <Text style={styles.label}>Responsable</Text>
          <View style={[styles.inputGroup, errors[`${titulo}_${index}_responsable`] && styles.inputError]}>
            <Ionicons name="person-outline" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={actividad.responsable}
              onChangeText={(text) => {
                setActividades(prev => {
                  const newState = [...prev];
                  newState[index] = { ...newState[index], responsable: text };
                  return newState;
                });
              }}
              placeholder="Nombre del responsable"
              placeholderTextColor="#aaa"
              accessibilityLabel="Responsable"
            />
          </View>
          {errors[`${titulo}_${index}_responsable`] && <Text style={styles.errorText}>{errors[`${titulo}_${index}_responsable`]}</Text>}

          <Text style={styles.label}>Fecha Inicio Actividad</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={formatToISODate(actividad.fechaInicio)}
              onChange={(e) => {
                const date = parseDateLocal(e.target.value);
                handleActividadDateChange(index, 'fechaInicio', { type: 'set' }, date, setActividades);
              }}
              style={styles.webDateInput}
            />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  setActividades(prev => {
                    const newState = [...prev];
                    newState[index] = { ...newState[index], showDatePickerInicio: true };
                    return newState;
                  });
                }}
                style={styles.datePickerButton}
              >
                <Ionicons name="calendar-outline" size={20} color="#C44200" style={styles.inputIcon} />
                <Text style={styles.datePickerText}>{formatToISODate(actividad.fechaInicio).split('-').reverse().join('/')}</Text>
              </TouchableOpacity>
              {actividad.showDatePickerInicio && (
                <DateTimePicker
                  value={actividad.fechaInicio}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleActividadDateChange(index, 'fechaInicio', event, date, setActividades)}
                />
              )}
            </>
          )}

          <Text style={styles.label}>Fecha Fin Actividad</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={formatToISODate(actividad.fechaFin)}
              min={formatToISODate(actividad.fechaInicio)}
              onChange={(e) => {
                const date = parseDateLocal(e.target.value);
                handleActividadDateChange(index, 'fechaFin', { type: 'set' }, date, setActividades);
              }}
              style={styles.webDateInput}
            />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  setActividades(prev => {
                    const newState = [...prev];
                    newState[index] = { ...newState[index], showDatePickerFin: true };
                    return newState;
                  });
                }}
                style={styles.datePickerButton}
              >
                <Ionicons name="calendar-outline" size={20} color="#C44200" style={styles.inputIcon} />
                <Text style={styles.datePickerText}>{formatToISODate(actividad.fechaFin).split('-').reverse().join('/')}</Text>
              </TouchableOpacity>
              {actividad.showDatePickerFin && (
                <DateTimePicker
                  value={actividad.fechaFin}
                  mode="date"
                  display="default"
                  minimumDate={actividad.fechaInicio}
                  onChange={(event, date) => handleActividadDateChange(index, 'fechaFin', event, date, setActividades)}
                />
              )}
            </>
          )}
        </View>
      ))}
      <TouchableOpacity onPress={agregarActividad} style={styles.addButton}>
        <Ionicons name="add-circle" size={26} color="#C44200" />
        <Text style={styles.addButtonText}>Añadir Actividad</Text>
      </TouchableOpacity>
    </View>
  );
};

const programacionEvento = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isMountedRef = useRef(true);

  const getInitialDate = () => {
    if (params.selectedDate) {
      let initialDate = parseDateLocal(params.selectedDate);
      if (params.selectedHour) {
        const [hour, minute] = String(params.selectedHour).split(':').map(Number);
        initialDate.setHours(hour || 0, minute || 0, 0, 0);
      }
      return initialDate;
    }
    return new Date();
  };

  const [authToken, setAuthToken] = useState(null);
  const [nombreevento, setNombreevento] = useState('');
  const [lugarevento, setLugarevento] = useState('');
  const [responsable, setResponsable] = useState('');
  const [fechaHoraSeleccionada, setFechaHoraSeleccionada] = useState(getInitialDate());
  const [actividadesPrevias, setActividadesPrevias] = useState([]);
  const [actividadesDurante, setActividadesDurante] = useState([]);
  const [actividadesPost, setActividadesPost] = useState([]);
  const [idtipoevento, setIdtipoevento] = useState('');
  const [serviciosContratados, setServiciosContratados] = useState([]);
  const [ambientes, setAmbientes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoadingEventos, setIsLoadingEventos] = useState(false);
  const [comiteSeleccionado, setComiteSeleccionado] = useState([]);
  const [layoutsDisponibles, setLayoutsDisponibles] = useState([]);
  const [layoutSeleccionado, setLayoutSeleccionado] = useState(null);
  const [cargandoLayouts, setCargandoLayouts] = useState(false);

  const { idevento } = params;
  const isEditing = !!idevento;

  const calendarMarkedDates = {
    [formatToISODate(fechaHoraSeleccionada)]: {
      selected: true,
      selectedColor: '#C44200',
      selectedTextColor: '#fff',
    },
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handleActividadDateChange = (index, field, event, selectedDate, setActividades) => {
    const pickerFlag = field === 'fechaInicio' ? 'showDatePickerInicio' : 'showDatePickerFin';
    setActividades(prev => {
      const newState = [...prev];
      if (newState[index]) newState[index] = { ...newState[index], [pickerFlag]: false };
      return newState;
    });
    if (event.type === 'set' && selectedDate) {
      setActividades(prev => {
        const newState = [...prev];
        if (newState[index]) {
          newState[index] = { ...newState[index], [field]: selectedDate };
          if (field === 'fechaInicio' && newState[index].fechaFin < selectedDate) {
            newState[index].fechaFin = selectedDate;
          }
        }
        return newState;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!nombreevento.trim()) newErrors.nombreevento = 'El nombre del evento es requerido.';

    const validateActivityList = (list, listName) => {
      list.forEach((act, index) => {
        if (!act.nombreActividad?.trim()) {
          newErrors[`${listName}_${index}_nombre`] = 'Nombre de actividad requerido.';
        }
        if (!act.responsable?.trim()) {
          newErrors[`${listName}_${index}_responsable`] = 'Responsable requerido.';
        }
      });
    };

    if (actividadesPrevias.length > 0) validateActivityList(actividadesPrevias, 'Programación de Actividades Previas');
    if (actividadesDurante.length > 0) validateActivityList(actividadesDurante, 'Programación de Actividades Durante el Evento');
    if (actividadesPost.length > 0) validateActivityList(actividadesPost, 'Programación de Actividades Después del Evento');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const agregarServicio = () => setServiciosContratados(prev => [...prev, {
    key: `servicio_${Date.now()}`,
    nombreServicio: '',
    caracteristica: '',
    fechaInicio: new Date(fechaHoraSeleccionada),
    observaciones: '',
    showDatePickerInicio: false,
  }]);
  const eliminarServicio = (index) => setServiciosContratados(prev => prev.filter((_, i) => i !== index));
  const actualizarServicio = (index, campo, valor) => {
    setServiciosContratados(prev => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], [campo]: valor };
      return nuevos;
    });
  };
  const handleServicioDateChange = (index, field, event, selectedDate) => {
    actualizarServicio(index, 'showDatePickerInicio', false);
    if (event.type === 'set' && selectedDate) {
      actualizarServicio(index, field, selectedDate);
    }
  };

  const agregarAmbiente = () => setAmbientes(prev => [...prev, {
    key: `ambiente_${Date.now()}`,
    nombre: '',
    requisito: '',
    observaciones: ''
  }]);
  const eliminarAmbiente = (index) => setAmbientes(prev => prev.filter((_, i) => i !== index));
  const actualizarAmbiente = (index, campo, valor) => {
    setAmbientes(prev => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], [campo]: valor };
      return nuevos;
    });
  };

  const cargarLayouts = async (token) => {
    const authTokenToUse = token || authToken;
    if (!authTokenToUse) return [];

    setCargandoLayouts(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/layouts`, {
        headers: { 'Authorization': `Bearer ${authTokenToUse}` }
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setLayoutsDisponibles(data);
      return data;
    } catch (error) {
      console.error('Error al cargar layouts:', error.response?.data || error.message);
      showAlert('Error', 'No se pudieron cargar los layouts disponibles.');
      setLayoutsDisponibles([]);
      return [];
    } finally {
      if (isMountedRef.current) setCargandoLayouts(false);
    }
  };

  useEffect(() => {
    const initializeAndFetch = async () => {
      const token = await getTokenAsync();
      if (!isMountedRef.current) return;
      setAuthToken(token);

      if (!token) {
        showAlert('Error', 'No autenticado');
        router.navigate('/admin/EventosAprobados');
        return;
      }

      const layoutsData = await cargarLayouts(token);

      if (isEditing && idevento) {
        if (!isMountedRef.current) return;
        setIsLoadingEventos(true);
        try {
          const response = await axios.get(`${API_BASE_URL}/eventos/${idevento}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!isMountedRef.current) return;
          const evento = response.data;

          setNombreevento(evento.nombreevento || '');
          setLugarevento(evento.lugarevento || '');
          setResponsable(evento.responsable_evento || '');

          if (evento.fechaevento) {
            const fechaLocal = parseDateLocal(evento.fechaevento);
            if (evento.horaevento) {
              const [hours, minutes] = String(evento.horaevento).split(':').map(Number);
              fechaLocal.setHours(hours || 0, minutes || 0, 0, 0);
            }
            setFechaHoraSeleccionada(fechaLocal);
          }

          setIdtipoevento(evento.idtipoevento?.toString() || '');

          if (Array.isArray(evento.actividadesPrevias)) {
            setActividadesPrevias(evento.actividadesPrevias.map((act, i) => ({
              key: `act-prev-${i}-${Date.now()}-${Math.random()}`,
              nombreActividad: act.nombreActividad || '',
              responsable: act.responsable || '',
              fechaInicio: parseDateLocal(act.fechaInicio),
              fechaFin: parseDateLocal(act.fechaFin),
              showDatePickerInicio: false,
              showDatePickerFin: false,
            })));
          }

          if (Array.isArray(evento.actividadesDurante)) {
            setActividadesDurante(evento.actividadesDurante.map((act, i) => ({
              key: `act-durante-${i}-${Date.now()}-${Math.random()}`,
              nombreActividad: act.nombreActividad || '',
              responsable: act.responsable || '',
              fechaInicio: parseDateLocal(act.fechaInicio),
              fechaFin: parseDateLocal(act.fechaFin),
              showDatePickerInicio: false,
              showDatePickerFin: false,
            })));
          }

          if (Array.isArray(evento.actividadesPost)) {
            setActividadesPost(evento.actividadesPost.map((act, i) => ({
              key: `act-post-${i}-${Date.now()}-${Math.random()}`,
              nombreActividad: act.nombreActividad || '',
              responsable: act.responsable || '',
              fechaInicio: parseDateLocal(act.fechaInicio),
              fechaFin: parseDateLocal(act.fechaFin),
              showDatePickerInicio: false,
              showDatePickerFin: false,
            })));
          }

          if (Array.isArray(evento.serviciosContratados)) {
            setServiciosContratados(evento.serviciosContratados.map((serv, i) => ({
              key: `servicio-${i}-${Date.now()}`,
              nombreServicio: serv.nombreServicio || '',
              caracteristica: serv.caracteristica || '',
              fechaInicio: parseDateLocal(serv.fechaInicio),
              observaciones: serv.observaciones || '',
              showDatePickerInicio: false,
            })));
          }

          if (Array.isArray(evento.ambientes)) {
            setAmbientes(evento.ambientes.map((amb, i) => ({
              key: `ambiente-${i}-${Date.now()}`,
              nombre: amb.nombre || '',
              requisito: amb.requisito || '',
              observaciones: amb.observaciones || '',
            })));
          }

          if (evento.idlayout && layoutsData.length > 0) {
            const layoutEncontrado = layoutsData.find(l => l.idlayout === evento.idlayout);
            if (layoutEncontrado) {
              setLayoutSeleccionado(layoutEncontrado);
            }
          }

          if (Array.isArray(evento.comite)) {
            setComiteSeleccionado(evento.comite);
          }
        } catch (error) {
          console.error("Error al cargar el evento:", error);
          showAlert("Error", "No se pudo cargar el evento.");
          router.back();
        } finally {
          if (isMountedRef.current) setIsLoadingEventos(false);
        }
      }
    };
    initializeAndFetch();
  }, [idevento]);

  if (isEditing && isLoadingEventos) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C44200" />
        <Text style={{ marginTop: 10, color: '#555' }}>Cargando evento...</Text>
      </View>
    );
  }

  const handleCrearEvento = async () => {
    if (!isMountedRef.current) return;

    if (!validateForm()) {
      showAlert("Formulario Incompleto", "Por favor, revisa los campos marcados en rojo.");
      return;
    }

    if (!authToken) {
      showAlert("Error de Autenticación", "No estás autenticado.");
      return;
    }

    setIsLoading(true);
    try {
      if (!fechaHoraSeleccionada || isNaN(fechaHoraSeleccionada.getTime())) {
        throw new Error('Fecha del evento inválida');
      }

      const fasePayload = {
        nrofase: 2,
        ...(isEditing && idevento && { idevento: parseInt(idevento, 10) })
      };

      const payload = {
        nombreevento: nombreevento.trim(),
        lugarevento: lugarevento.trim(),
        fechaevento: formatToISODate(fechaHoraSeleccionada),
        horaevento: formatToISOTime(fechaHoraSeleccionada),
        responsable: responsable.trim(),
        actividadesPrevias: actividadesPrevias.map(formatActivityForSubmit),
        actividadesDurante: actividadesDurante.map(formatActivityForSubmit),
        actividadesPost: actividadesPost.map(formatActivityForSubmit),
        serviciosContratados: serviciosContratados.map(formatServicioForSubmit),
        ambientes: ambientes.map(formatAmbienteForSubmit),
        idlayout: layoutSeleccionado ? layoutSeleccionado.idlayout : null,
        comite: comiteSeleccionado,
        nuevaFase: fasePayload,
      };

      console.log('📦 Payload:', JSON.stringify(payload, null, 2));

      if (isEditing) {
        await axios.put(`${API_BASE_URL}/eventos/${idevento}`, payload, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });
        showAlert('Éxito', 'Evento actualizado correctamente.', () => {
          router.back(); // 👈 Vuelve a la pantalla anterior
        });
      } else {
        await axios.post(`${API_BASE_URL}/eventos`, payload, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        showAlert('Éxito', 'Evento creado correctamente.', () => {
          router.back(); // 👈 Vuelve a la pantalla anterior
        });
      }
    } catch (error) {
      console.error("Error al guardar evento:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || (typeof error.response?.data === 'string' ? error.response.data : '')
        || 'Ocurrió un error al guardar el evento.';
      showAlert('Error', errorMessage);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.pageHeaderText}>
          <Text style={styles.pageHeaderTitle}>{isEditing ? 'Programación del Evento' : 'Nuevo Evento'}</Text>
          <Text style={styles.pageHeaderSubtitle}>{isEditing ? 'Organiza actividades, servicios y ambientes' : 'Completa los datos de programación'}</Text>
        </View>
        <View style={styles.pageHeaderBadge}>
          <Ionicons name="calendar-clear-outline" size={22} color="#C44200" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Stack.Screen options={{ title: isEditing ? 'Programar Evento' : 'Crear Nuevo Evento', headerShown: false }} />

          <View style={styles.eventSummaryCard}>
            <View style={styles.eventSummaryHeader}>
              <Ionicons name="information-circle" size={22} color="#C44200" />
              <Text style={styles.eventSummaryHeaderText}>Información Principal</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBadge}>
                <Ionicons name="pricetag-outline" size={17} color="#C44200" />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Nombre del Evento</Text>
                <Text style={styles.infoValue}>{nombreevento || 'No especificado'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBadge}>
                <Ionicons name="location-outline" size={17} color="#C44200" />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Lugar del Evento</Text>
                <Text style={styles.infoValue}>{lugarevento || 'No especificado'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBadge}>
                <Ionicons name="calendar-clear-outline" size={17} color="#C44200" />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Fecha</Text>
                <Text style={styles.infoValue}>{formatToISODate(fechaHoraSeleccionada).split('-').reverse().join('/')}</Text>
              </View>
            </View>
            {responsable ? (
              <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
                <View style={styles.infoIconBadge}>
                  <Ionicons name="person-outline" size={17} color="#C44200" />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Responsable</Text>
                  <Text style={styles.infoValue}>{responsable}</Text>
                </View>
              </View>
            ) : null}
          </View>

        <View style={styles.calendarCard}>
          <SectionHeader icon="calendar-outline" title="Fecha y Hora del Evento" color="#C44200" />
          <Calendar
            current={formatToISODate(fechaHoraSeleccionada)}
            markedDates={calendarMarkedDates}
            firstDay={1}
            disableMonthChange
            theme={{
              todayTextColor: '#C44200',
              arrowColor: '#C44200',
              selectedDayBackgroundColor: '#C44200',
              selectedDayTextColor: '#ffffff',
              textDayFontSize: 15,
              textMonthFontSize: 17,
              textDayHeaderFontSize: 13,
              monthTextColor: '#1e293b',
              textSectionTitleColor: '#64748b',
              calendarBackground: 'transparent',
            }}
            style={{ marginBottom: 16, borderRadius: 12 }}
          />
          <View style={styles.timeDisplayRow}>
            <Ionicons name="time-outline" size={20} color="#C44200" />
            <Text style={styles.timeLabel}>Hora del evento:</Text>
            <Text style={styles.timeValue}>{formatToISOTime(fechaHoraSeleccionada)}</Text>
          </View>
        </View>

        <SeccionActividades
          titulo="Programación de Actividades Previas"
          actividades={actividadesPrevias}
          setActividades={setActividadesPrevias}
          handleActividadDateChange={handleActividadDateChange}
          errors={errors}
          fechaBase={fechaHoraSeleccionada}
        />
        <SeccionActividades
          titulo="Programación de Actividades Durante el Evento"
          actividades={actividadesDurante}
          setActividades={setActividadesDurante}
          handleActividadDateChange={handleActividadDateChange}
          errors={errors}
          fechaBase={fechaHoraSeleccionada}
        />
        <SeccionActividades
          titulo="Programación de Actividades Después del Evento"
          actividades={actividadesPost}
          setActividades={setActividadesPost}
          handleActividadDateChange={handleActividadDateChange}
          errors={errors}
          fechaBase={fechaHoraSeleccionada}
        />

        {/* Servicios */}
        <View style={styles.formSection}>
          <SectionHeader icon="build-outline" title="Servicios Contratados" color="#0F172A" />
          {serviciosContratados.map((servicio, index) => (
            <View key={servicio.key} style={styles.servicioItemContainer}>
              <View style={styles.servicioItemHeader}>
                <Text style={styles.actividadPreviaTitle}>Servicio #{index + 1}</Text>
                <TouchableOpacity onPress={() => eliminarServicio(index)} style={styles.deleteButton}>
                  <Ionicons name="trash-bin-outline" size={22} color="#c0392b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Servicio</Text>
              <View style={styles.inputGroup}>
                <Ionicons name="build-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={servicio.nombreServicio}
                  onChangeText={(text) => actualizarServicio(index, 'nombreServicio', text)}
                  placeholder="Nombre Servicio"
                  placeholderTextColor="#aaa"
                  accessibilityLabel="Nombre del Servicio"
                />
              </View>

              <Text style={styles.label}>Características</Text>
              <View style={styles.inputGroup}>
                <Ionicons name="list-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={servicio.caracteristica}
                  onChangeText={(text) => actualizarServicio(index, 'caracteristica', text)}
                  placeholder="Característica"
                  placeholderTextColor="#aaa"
                  accessibilityLabel="Característica"
                />
              </View>

              <Text style={styles.label}>Fecha Entrega</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formatToISODate(servicio.fechaInicio)}
                  onChange={(e) => {
                    const date = parseDateLocal(e.target.value);
                    actualizarServicio(index, 'fechaInicio', date);
                  }}
                  style={styles.webDateInput}
                />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => actualizarServicio(index, 'showDatePickerInicio', true)}
                    style={styles.datePickerButton}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#C44200" style={styles.inputIcon} />
                    <Text style={styles.datePickerText}>
                      {formatToISODate(servicio.fechaInicio).split('-').reverse().join('/')}
                    </Text>
                  </TouchableOpacity>
                  {servicio.showDatePickerInicio && (
                    <DateTimePicker
                      value={servicio.fechaInicio}
                      mode="date"
                      display="default"
                      onChange={(event, date) => handleServicioDateChange(index, 'fechaInicio', event, date)}
                    />
                  )}
                </>
              )}

              <Text style={styles.label}>Observaciones</Text>
              <View style={styles.inputGroup}>
                <Ionicons name="document-text-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={servicio.observaciones}
                  onChangeText={(text) => actualizarServicio(index, 'observaciones', text)}
                  placeholder="Observaciones"
                  placeholderTextColor="#aaa"
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Observaciones"
                />
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={agregarServicio} style={styles.addButton}>
            <Ionicons name="add-circle" size={26} color="#C44200" />
            <Text style={styles.addButtonText}>Añadir Servicio</Text>
          </TouchableOpacity>
        </View>

        {/* Ambientes */}
        <View style={styles.formSection}>
          <SectionHeader icon="business-outline" title="Ambientes" color="#047857" />
          {ambientes.map((ambiente, index) => (
            <View key={ambiente.key} style={styles.ambienteItemContainer}>
              <View style={styles.ambienteItemHeader}>
                <Text style={styles.actividadPreviaTitle}>Ambiente #{index + 1}</Text>
                <TouchableOpacity onPress={() => eliminarAmbiente(index)} style={styles.deleteButton}>
                  <Ionicons name="trash-bin-outline" size={22} color="#c0392b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Nombre del Ambiente</Text>
              <View style={styles.inputGroup}>
                <Ionicons name="business-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={ambiente.nombre}
                  onChangeText={(text) => actualizarAmbiente(index, 'nombre', text)}
                  placeholder="Nombre Ambiente"
                  placeholderTextColor="#aaa"
                  accessibilityLabel="Nombre del Ambiente"
                />
              </View>
              <Text style={styles.label}>Requisito</Text>
              <View style={styles.inputGroup}>
                <Ionicons name="checkmark-circle-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={ambiente.requisito}
                  onChangeText={(text) => actualizarAmbiente(index, 'requisito', text)}
                  placeholder="Requisito"
                  placeholderTextColor="#aaa"
                  accessibilityLabel="Requisito"
                />
              </View>
              <Text style={styles.label}>Observaciones</Text>
              <View style={styles.inputGroup}>
                <Ionicons name="document-text-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={ambiente.observaciones}
                  onChangeText={(text) => actualizarAmbiente(index, 'observaciones', text)}
                  placeholder="Observaciones"
                  placeholderTextColor="#aaa"
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Observaciones"
                />
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={agregarAmbiente} style={styles.addButton}>
            <Ionicons name="add-circle" size={26} color="#C44200" />
            <Text style={styles.addButtonText}>Añadir Ambiente</Text>
          </TouchableOpacity>
        </View>

        {/* Layouts */}
        <View style={styles.formSection}>
          <SectionHeader icon="grid-outline" title="Layouts Disponibles" color="#9b59b6" />
          {cargandoLayouts ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color="#C44200" />
              <Text style={{ marginTop: 8, color: '#666' }}>Cargando layouts...</Text>
            </View>
          ) : layoutsDisponibles.length === 0 ? (
            <View>
              <Text style={{ color: '#777', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
                No hay layouts subidos aún.
              </Text>
              <TouchableOpacity
                onPress={() => cargarLayouts(authToken)}
                style={styles.retryButton}
              >
                <Ionicons name="reload" size={20} color="#C44200" />
                <Text style={styles.retryButtonText}>Reintentar carga</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.layoutsGrid}>
                {layoutsDisponibles.map((layout) => {
                  const imageUrl = layout.imagenUrl || `https://unibackend-production-a0f8.up.railway.app/uploads/${layout.url_imagen}`;
                  const isSelected = layoutSeleccionado?.idlayout === layout.idlayout;

                  return (
                    <TouchableOpacity
                      key={layout.idlayout}
                      onPress={() => setLayoutSeleccionado(isSelected ? null : layout)}
                      activeOpacity={0.8}
                      style={[styles.layoutItem, isSelected && styles.layoutItemSelected]}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.layoutImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.layoutName} numberOfLines={2}>
                        {layout.nombre}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={18} color="#C44200" />
                          <Text style={styles.selectedBadgeText}>Seleccionado</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
</View>

        {/* Layouts con IA */}
        {layoutsDisponibles.length > 0 && (
          <View style={styles.kv}>
            <Text style={styles.kvL}>IA</Text>
            <Text style={styles.kvV} numberOfLines={1}>Generar layout con IA</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCrearEvento}
          disabled={isLoading || !authToken}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isEditing ? 'save-outline' : 'checkmark-circle-outline'} size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.listText}>Guardar evento</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  retryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#C44200', borderRadius: 8, alignSelf: 'center', marginTop: 10, backgroundColor: '#fff3ec' },
  retryButtonText: { marginLeft: 8, color: '#C44200', fontSize: 16, fontWeight: '500' },
  screen: { flex: 1, backgroundColor: '#F4F7F9' },
  keyboardAvoidingContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContentContainer: { padding: 20, paddingBottom: 60 },
  calendarCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  timeDisplayRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  timeLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginLeft: 10 },
  timeValue: { fontSize: 16, fontWeight: '700', color: '#C44200', marginLeft: 8 },
  pageHeader: { backgroundColor: '#C44200', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18, paddingTop: Platform.OS === 'ios' ? 50 : 18, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }, android: { elevation: 6 } }) },
  backBtn: { padding: 6, marginRight: 4 },
  pageHeaderText: { flex: 1, marginHorizontal: 8 },
  pageHeaderTitle: { color: '#fff', fontSize: 19, fontWeight: '700' },
  pageHeaderSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  pageHeaderBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  eventSummaryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  eventSummaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  eventSummaryHeaderText: { fontSize: 17, fontWeight: '700', color: '#333', marginLeft: 8 },
  formSection: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginLeft: 10, flex: 1 },
  label: { fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: '600', letterSpacing: 0.2, textTransform: 'uppercase' },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F7F9', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, marginBottom: 16 },
  inputIcon: { paddingHorizontal: 12, color: '#94A3B8' },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, paddingRight: 15, fontSize: 15, color: '#1e293b' },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
  inputError: { borderColor: '#D32F2F', backgroundColor: '#FEF2F2' },
  errorText: { color: '#D32F2F', fontSize: 12, marginBottom: 10, marginLeft: 5, marginTop: -10 },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F7F9', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingVertical: Platform.OS === 'ios' ? 14 : 12, marginBottom: 16 },
  datePickerText: { fontSize: 15, color: '#1e293b', flex: 1, marginLeft: 5, fontWeight: '500' },
  webDateInput: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F6F7F9',
    color: '#1e293b',
    fontSize: 15,
    marginBottom: 16,
    outlineStyle: 'none',
  },
  button: { backgroundColor: '#C44200', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexDirection: 'row', shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  buttonDisabled: { backgroundColor: '#f9bda3' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  actividadPreviaItemContainer: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 16, marginBottom: 15, backgroundColor: '#FDFDFD' },
  actividadItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  actividadPreviaTitle: { fontSize: 15, fontWeight: '700', color: '#C44200' },
  deleteButton: { padding: 6, backgroundColor: '#FEF2F2', borderRadius: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, backgroundColor: '#fff3ec', borderRadius: 10, borderWidth: 1.5, borderColor: '#C44200', borderStyle: 'dashed', marginTop: 6 },
  addButtonText: { marginLeft: 8, color: '#C44200', fontSize: 15, fontWeight: '600' },
  ambienteItemContainer: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 16, marginBottom: 15, backgroundColor: '#FDFDFD' },
  ambienteItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  servicioItemContainer: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 16, marginBottom: 15, backgroundColor: '#FDFDFD' },
  servicioItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIconBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF3EC', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 15, color: '#1e293b', fontWeight: '600', marginTop: 3, flexWrap: 'wrap' },
  layoutsGrid: { flexDirection: 'row', paddingVertical: 10 },
  layoutItem: {
    width: 150,
    marginRight: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  layoutItemSelected: {
    borderColor: '#C44200',
    backgroundColor: '#fffaf5',
  },
  layoutImage: {
    width: 130,
    height: 130,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  layoutName: {
    marginTop: 8,
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    width: '100%',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  selectedBadgeText: {
    fontSize: 11,
    color: '#C44200',
    fontWeight: '600',
  },
});

export default programacionEvento;