import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, Modal, PanResponder, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

//const API_BASE_URL =  'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const TIPOS_DE_EVENTO = [
  { id: '1', label: 'Curricular' },
  { id: '2', label: 'Extracurricular' },
  { id: '3', label: 'Marketing' },
  { id: '4', label: 'Internacionalización/Marketing' },
  { id: '5', label: 'Marketing/Extracurricular ' }
];

const SEGMENTO_OBJETIVO = [
  { id: '1', label: 'Estudiantes' },
  { id: '2', label: 'Docentes' },
  { id: '3', label: 'Público Externo' },
  { id: '4', label: 'Influencers' },
  { id: '5', label: 'Otro' }
];

const CLASIFICACION_ESTRATEGICA = {
  '1': { label: 'Academica y Cientifica', subcategorias: [
    { id: '1a', label: 'Congresos' },
    { id: '1b', label: 'Seminarios' },
    { id: '1c', label: 'Simposios' },
    { id: '1d', label: 'Conferencias' },
    { id: '1e', label: 'Charlas Especializadas' },
    { id: '1f', label: 'Master Class' },
    { id: '1g', label: 'Conversatorio' },
    { id: '1h', label: 'Coloquios' },
    { id: '1i', label: 'Mesas Redondas' },
    { id: '1j', label: 'Paneles' },
    { id: '1k', label: 'Ferias Academicas' },
    { id: '1l', label: 'Defenzas de Proyecto de grado' },
    { id: '1m', label: 'evaluaciones Integrales' },
    { id: '1n', label: 'Jornada de actualizacion estudiantil y docente' },
  ] },
  '2': { label: 'Institucionales y Ceremoniales', subcategorias: [
    { id: '2a', label: 'Actos de colacion ' },
    { id: '2b', label: 'Aniversarios institucionales' },
    { id: '2c', label: 'Inauguraciones de infraestructura o programas' },
    { id: '2d', label: 'Reconocimientos y premiaciones' },
    { id: '2e', label: 'Lanzamientos oficiales institucionales' },
    { id: '2f', label: 'Firma de convenios y alianzas' },
    { id: '2g', label: 'Tertulias' },
    { id: '2h', label: 'Ceremonias protocolares' },
  ] },
  '3': { label: 'Culturales, Deportivos y Sociales', subcategorias: [
    { id: '3a', label: 'Ferias culturales y artísticas' },
    { id: '3b', label: 'Campeonatos deportivos' },
    { id: '3c', label: 'Actividades recreativas o festivas (Día del Estudiante, Día de la Mujer, Día del Maestro)' },
    { id: '3d', label: 'Talleres de bienestar físico o mental' },
    { id: '3e', label: 'Jornadas de voluntariado interno' },
    { id: '3f', label: 'Eventos culturales' },
  ] },
  '4': { label: 'Extension Universitaria, Vinculacion Profesional y Atraccion Estudiantil', subcategorias: [
    { id: '4a', label: 'Visita de colegios ' },
    { id: '4b', label: 'Visita a ferias en colegios' },
    { id: '4c', label: 'Auspicios actividades intercolegiales (Ej: El y Ella, torneos deportivos) ' },
    { id: '4d', label: 'Torneo de Padel Intercolegial' },
    { id: '4e', label: 'Ferias de innovación y emprendimiento' },
    { id: '4f', label: 'Ferias de empleabilidad' },
    { id: '4g', label: 'Hackathons, bootcamps, pitch days ' },
    { id: '4h', label: 'Charlas y talleres con empresas' },
    { id: '4i', label: 'Proyectos de responsabilidad universitaria' },
    { id: '4j', label: 'Campañas solidarias' },
    { id: '4k', label: 'Voluntariados' },
    { id: '4l', label: 'Encuentros de egresados y networking' },
    { id: '4m', label: 'Lanzamientos de proyectos estratégicos o colaborativos' },
  ] },
  '5': { label: 'Internacionalizacion y Posicionamiento', subcategorias: [
    { id: '5a', label: 'Programas internacionales y de intercambio' },
    { id: '5b', label: 'Semana Nomads' },
    { id: '5c', label: 'Actividades con consulados y embajadas' },
    { id: '5d', label: 'TEDx UNIFRANZ' },
    { id: '5e', label: 'Foro Internacional de Economía Creativa' },
    { id: '5f', label: 'Cartel Bienal BICEBE' },
    { id: '5g', label: 'Eventos internacionales de visibilidad y alianzas' },
    { id: '5h', label: 'Lanzamientos estratégicos o de marca universitaria' },
  ] }
};

const SUBCATEGORIA_ID_MAP = {
  '1a': 1, '1b': 2, '1c': 3, '1d': 4, '1e': 5, '1f': 6, '1g': 7, '1h': 8,
  '1i': 9, '1j': 10, '1k': 11, '1l': 12, '1m': 13, '1n': 14,
  '2a': 15, '2b': 16, '2c': 17, '2d': 18, '2e': 19, '2f': 20, '2g': 21, '2h': 22,
  '3a': 23, '3b': 24, '3c': 25, '3d': 26, '3e': 27, '3f': 28,
  '4a': 29, '4b': 30, '4c': 31, '4d': 32, '4e': 33, '4f': 34, '4g': 35,
  '4h': 36, '4i': 37, '4j': 38, '4k': 39, '4l': 40, '4m': 41,
  '5a': 42, '5b': 43, '5c': 44, '5d': 45, '5e': 46, '5f': 47, '5g': 48, '5h': 49,
};

const getSubcategoriaId = (subcategoriaId) => SUBCATEGORIA_ID_MAP[subcategoriaId] || null;

const LUGARES_CON_AREAS = {
  'Cala-Cala': {
    label: 'Campus CalaCala',
    areas: [
      { id: 'cn-1', nombre: 'Biblioteca' },
      { id: 'cn-2', nombre: 'Hall' },
      { id: 'cn-3', nombre: 'Boulevard' }
    ]
  },
  'Central': {
    label: 'Campus Central',
    areas: [
      { id: 'cs-1', nombre: 'Auditorio' },
      { id: 'cs-2', nombre: 'Jardin 1' },
      { id: 'cs-3', nombre: 'Jardín 2' },
      { id: 'cs-4', nombre: 'Biblioteca' },
      { id: 'cs-5', nombre: 'Aula 310' },
      { id: 'cs-6', nombre: 'GAme Room' },
    ]
  }
};

const OBJETIVOS_EVENTO_MAP = {
  modeloPedagogico: 1,
  posicionamiento: 2,
  internacionalizacion: 3,
  rsu: 4,
  fidelizacion: 5,
  otro: 6
};

const QUICK_TIMES = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const getNotificationIcon = (type) => {
  switch (type) {
    case 'nuevo_evento': return 'calendar';
    case 'evento_aprobado': return 'checkmark-circle';
    case 'evento_rechazado': return 'close-circle';
    case 'recordatorio': return 'alarm';
    default: return 'notifications';
  }
};

const TimePicker = ({ value, onChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [tempHour, setTempHour] = useState(dayjs(value).hour());
  const [tempMinute, setTempMinute] = useState(dayjs(value).minute());
  const [confirmedH, setConfirmedH] = useState(dayjs(value).hour());
  const [confirmedM, setConfirmedM] = useState(dayjs(value).minute());
  const [displayHour, setDisplayHour] = useState(() => dayjs(value).hour());
  const [displayMinute, setDisplayMinute] = useState(() => dayjs(value).minute());
  
   const prevValueRef = useRef(`${dayjs(value).hour()}:${dayjs(value).minute()}`);
  
  const valueKey = `${dayjs(value).hour()}:${dayjs(value).minute()}`;
  if (prevValueRef.current !== valueKey) {
    prevValueRef.current = valueKey;
    if (!showModal) {
      setDisplayHour(dayjs(value).hour());
      setDisplayMinute(dayjs(value).minute());
      setTempHour(dayjs(value).hour());
      setTempMinute(dayjs(value).minute());
    }
  }
  useEffect(() => {
    setConfirmedH(dayjs(value).hour());
    setConfirmedM(dayjs(value).minute());
    setTempHour(dayjs(value).hour());
    setTempMinute(dayjs(value).minute());
  }, [value]);

  const pad = (n) => String(n).padStart(2, '0');

  const openModal = () => {
    setTempHour(confirmedH);
    setTempMinute(confirmedM);
    setShowModal(true);
  };

  const handleConfirm = () => {
    setConfirmedH(tempHour);
    setConfirmedM(tempMinute);
    const newDate = new Date(value);
    newDate.setHours(tempHour, tempMinute, 0, 0);
    onChange(newDate);
    setShowModal(false);
  };

  const handleQuickSelect = (hour) => {
    setTempHour(hour);
    setTempMinute(0);
    setConfirmedH(hour);      
    setConfirmedM(0);
    const newDate = new Date(value);
    newDate.setHours(hour, 0, 0, 0);
    onChange(newDate);
    setShowModal(false);
  };

   const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  
  const changeTempHour = (hour) => {
    setTempHour(hour);
  };

  const changeTempMinute = (minute) => {
    setTempMinute(minute);
  };
  

  if (Platform.OS === 'web') {
    return (
      <>
        <TouchableOpacity
          onPress={openModal}
          style={styles.timePickerTrigger}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={20} color="#e95a0c" />
          <Text style={styles.timePickerTriggerText}>
            {pad(confirmedH)}:{pad(confirmedM)}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#888" />
        </TouchableOpacity>

        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlayCentered}>
            <View style={styles.customTimePickerModal}>
              <View style={styles.customTimePickerHeader}>
                <View style={styles.headerIcon}>
                  <Ionicons name="alarm" size={24} color="#e95a0c" />
                </View>
                <Text style={styles.customTimePickerTitle}>Hora de Inicio</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.timeDisplay}>
                <Text style={styles.timeDisplayText} key={`display-${tempHour}-${tempMinute}`}>
                  {pad(tempHour)}:{pad(tempMinute)}
                </Text>
              </View>

              <View style={styles.pickersRow}>
                <View style={styles.selectorColumn}>
                  <Text style={styles.selectorLabel}>Hora</Text>
                  <ScrollView 
                    style={styles.scrollSelector}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {hours.map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timeOption,
                          tempHour === hour && styles.timeOptionSelected
                        ]}
                        onPress={() => changeTempHour(hour)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          tempHour === hour && styles.timeOptionTextSelected
                        ]}>
                          {pad(hour)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.colonSeparator}>:</Text>

                <View style={styles.selectorColumn}>
                  <Text style={styles.selectorLabel}>Minutos</Text>
                  <ScrollView 
                    style={styles.scrollSelector}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {minutes.map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timeOption,
                          tempMinute === minute && styles.timeOptionSelected
                        ]}
                        onPress={() => changeTempMinute(minute)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          tempMinute === minute && styles.timeOptionTextSelected
                        ]}>
                          {pad(minute)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.quickHoursContainer}>
                <Text style={styles.quickHoursLabel}>Horas disponibles:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickHoursScroll}
                >
                  {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.quickHourBtn,
                        tempHour === hour && tempMinute === 0 && styles.quickHourBtnActive
                      ]}
                      onPress={() => handleQuickSelect(hour)}
                    >
                      <Text style={[
                        styles.quickHourText,
                        tempHour === hour && tempMinute === 0 && styles.quickHourTextActive
                      ]}>
                        {pad(hour)}:00
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.confirmButtonText} key={`confirm-${tempHour}-${tempMinute}`}>
                  Confirmar {pad(tempHour)}:{pad(tempMinute)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  const [showNativePicker, setShowNativePicker] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowNativePicker(true)}
        style={styles.timePickerTrigger}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={20} color="#e95a0c" />
        <Text style={styles.timePickerTriggerText}>
          {pad(confirmedH)}:{pad(confirmedM)}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#888" />
      </TouchableOpacity>

      <Modal
        visible={showNativePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNativePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar Hora de Inicio</Text>
              <TouchableOpacity onPress={() => setShowNativePicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <DateTimePicker
              value={value}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour={true}
              onChange={(e, selected) => {
                if (selected) {
                  onChange(selected);
                  if (Platform.OS !== 'ios') setShowNativePicker(false);
                }
              }}
              style={styles.dateTimePicker}
            />
            
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowNativePicker(false)}
              >
                <Text style={styles.doneButtonText}>
                  Listo - {pad(confirmedH)}:{pad(confirmedM)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const NotificationBell = ({ notificationCount, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.notificationBell}>
    <Ionicons name="notifications-outline" size={24} color="#333" />
    {notificationCount > 0 && (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationBadgeText}>
          {notificationCount > 99 ? '99+' : notificationCount}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

const NotificationsModal = ({ visible, onClose, notifications, markAsRead }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.notificationsModalOverlay}>
      <View style={styles.notificationsModalContent}>
        <View style={styles.notificationsModalHeader}>
          <Text style={styles.notificationsModalTitle}>Notificaciones</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.notificationsList}>
          {notifications.length === 0 ? (
            <Text style={styles.noNotificationsText}>No hay notificaciones</Text>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id || notification.idnotification}
                style={[
                  styles.notificationItem,
                  (!notification.read && notification.estado !== 'leido') && styles.notificationItemUnread
                ]}
                onPress={() => markAsRead(notification.id || notification.idnotification)}
              >
                <View style={styles.notificationIconContainer}>
                  <Ionicons
                    name={getNotificationIcon(notification.type || notification.tipo)}
                    size={20}
                    color="#e95a0c"
                    style={styles.notificationIcon}
                  />
                  {(!notification.read && notification.estado !== 'leido') && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                <View style={styles.notificationContentContainer}>
                  <Text style={[
                    styles.notificationText,
                    (!notification.read && notification.estado !== 'leido') && styles.notificationTextUnread
                  ]}>
                    {notification.title || notification.titulo}
                  </Text>
                  <Text style={styles.notificationMessage}>
                    {notification.message || notification.mensaje}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {dayjs(notification.timestamp || notification.created_at).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const getTokenAsync = async () => {
  const TOKEN_KEY = 'adminAuthToken';
  try {
    let token;
    if (Platform.OS === 'web') {
      token = localStorage.getItem(TOKEN_KEY);
    } else {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    }
    return (token && token !== 'null' && token !== '') ? token : null;
  } catch (e) {
    console.error("Error al obtener el token:", e);
    return null;
  }
};

const formatCurrency = (value) => `Bs ${Number(value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

const TablaPresupuesto = ({
  titulo, items, setItems, totalGeneral,
  handlePresupuestoChange, eliminarFilaPresupuesto, agregarFilaPresupuesto
}) => (
  <View style={styles.tablaContainer}>
    <Text style={styles.tablaTitulo}>{titulo}</Text>
    <View style={styles.tablaHeader}>
      <Text style={[styles.headerText, { flex: 0.5 }]}>N°</Text>
      <Text style={[styles.headerText, { flex: 2 }]}>Descripción</Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Cant.</Text>
      <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Precio</Text>
      <Text style={[styles.headerText, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
      <Text style={[styles.headerText, { flex: 0.5 }]}></Text>
    </View>
    {items.map((item, index) => {
      const totalItem = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0);
      return (
        <View key={item.key} style={styles.tablaRow}>
          <Text style={[styles.rowText, { flex: 0.5, textAlign: 'center' }]}>{index + 1}</Text>
          <TextInput
            style={[styles.rowInput, { flex: 2 }]}
            value={item.descripcion}
            onChangeText={(text) => handlePresupuestoChange(items, setItems, index, 'descripcion', text)}
            placeholder="Descripción"
          />
          <TextInput
            style={[styles.rowInput, { flex: 1, textAlign: 'center' }]}
            value={item.cantidad}
            onChangeText={(text) => handlePresupuestoChange(items, setItems, index, 'cantidad', text.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            placeholder="0"
          />
          <TextInput
            style={[styles.rowInput, { flex: 1, textAlign: 'center' }]}
            value={item.precio}
            onChangeText={(text) => handlePresupuestoChange(items, setItems, index, 'precio', text.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <Text style={[styles.rowText, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(totalItem)}</Text>
          <TouchableOpacity onPress={() => eliminarFilaPresupuesto(items, setItems, index)} style={[styles.deleteButtonSmall, { flex: 0.5 }]}>
            <Ionicons name="close-circle" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      );
    })}
    <TouchableOpacity onPress={() => agregarFilaPresupuesto(setItems)} style={styles.addButtonSmall}>
      <Text style={styles.addButtonTextSmall}>+ Añadir Fila</Text>
    </TouchableOpacity>
    <View style={styles.totalRow}>
      <Text style={styles.totalText}>TOTAL</Text>
      <Text style={styles.totalAmount}>{formatCurrency(totalGeneral)}</Text>
    </View>
  </View>
);

const GoogleStyleCalendarView = ({ fechaHoraSeleccionada, 
  setFechaHoraSeleccionada, eventos, title,onDateWarning }) => {
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    return days;
  };

  const getEventsForDay = (date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return eventos.filter(evento => {
      const fechaEventoStr = evento.fechaevento.split('T')[0];
      return fechaEventoStr === dateStr;
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(fechaHoraSeleccionada);
    newDate.setMonth(newDate.getMonth() + direction);
    setFechaHoraSeleccionada(newDate);
  };

  const handleDayPress = (day) => {
    const newDate = new Date(day.date);
    newDate.setHours(fechaHoraSeleccionada.getHours());
    newDate.setMinutes(fechaHoraSeleccionada.getMinutes());
    setFechaHoraSeleccionada(newDate);
      
    const hoy = dayjs().startOf('day');
    const fechaSel = dayjs(day.date).startOf('day');
    const dias = fechaSel.diff(hoy, 'day');

    if (onDateWarning && dias < 14) {
      onDateWarning(dias);
    }
  };
  const days = getDaysInMonth(fechaHoraSeleccionada);
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <View style={styles.googleCalendarContainer}>
      {title && (
        <View style={styles.calendarTitleContainer}>
          <Text style={styles.calendarTitle}>{title}</Text>
        </View>
      )}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#e95a0c" />
        </TouchableOpacity>
        <Text style={styles.monthYearText}>
          {dayjs(fechaHoraSeleccionada).format('MMMM YYYY').toUpperCase()}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#e95a0c" />
        </TouchableOpacity>
      </View>
      <View style={styles.weekDaysHeader}>
        {weekDays.map(day => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>
      <View style={styles.daysGrid}>
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day.date);
          const isSelected = dayjs(fechaHoraSeleccionada).format('YYYY-MM-DD') === dayjs(day.date).format('YYYY-MM-DD');
          const isToday = dayjs().format('YYYY-MM-DD') === dayjs(day.date).format('YYYY-MM-DD');
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                !day.isCurrentMonth && styles.dayCellInactive,
                isSelected && styles.dayCellSelected,
                isToday && styles.dayCellToday
              ]}
              onPress={() => {
                const newDate = new Date(day.date);
                newDate.setHours(fechaHoraSeleccionada.getHours());
                newDate.setMinutes(fechaHoraSeleccionada.getMinutes());
                setFechaHoraSeleccionada(newDate);

                const hoy = dayjs().startOf('day');
                const fechaSeleccionada = dayjs(day.date).startOf('day');
                const diasDiferencia = fechaSeleccionada.diff(hoy, 'day');

                if (diasDiferencia < 14 && diasDiferencia >= 0) {
                  const mensaje = `Recuerda que los eventos deben crearse con al menos 2 semanas (14 días) de anticipación.\n\nDías restantes: ${diasDiferencia}\n\nPodrás seleccionar esta fecha, pero el sistema validará la anticipación al momento de crear el evento.`;
                  if (Platform.OS === 'web') {
                    window.alert(`⚠️ Atención\n\n${mensaje}`);
                  } else {
                    Alert.alert('⚠️ Atención', mensaje, [{ text: 'Entendido' }]);
                  }
                } else if (diasDiferencia < 0) {
                  const mensaje = 'No puedes seleccionar una fecha pasada. Por favor, elige una fecha futura.';
                  if (Platform.OS === 'web') {
                    window.alert(`❌ Fecha inválida\n\n${mensaje}`);
                  } else {
                    Alert.alert('❌ Fecha inválida', mensaje, [{ text: 'OK' }]);
                  }
                }
              }}
            >
              <View style={styles.dayCellContent}>
                <Text style={[
                  styles.dayNumber,
                  !day.isCurrentMonth && styles.dayNumberInactive,
                  isSelected && styles.dayNumberSelected,
                  isToday && styles.dayNumberToday
                ]}>
                  {day.date.getDate()}
                </Text>
                {dayEvents.length > 0 && (
                  <View style={styles.eventIndicators}>
                    <View style={[styles.eventDot, { backgroundColor: dayEvents.length > 1 ? '#ff6b6b' : '#e95a0c' }]} />
                    {dayEvents.length > 1 && <Text style={styles.eventCount}>+{dayEvents.length - 1}</Text>}
                  </View>
                )}
                {dayEvents.length > 0 && isSelected && (
                  <View style={styles.eventPreview}>
                    {dayEvents.slice(0, 2).map((evento, idx) => (
                      <Text key={idx} style={styles.eventPreviewText}>
                        {dayjs(evento.horaevento.split('+')[0], 'HH:mm:ss').format('HH:mm')} {evento.nombreevento}
                      </Text>
                    ))}
                    {dayEvents.length > 2 && <Text style={styles.eventPreviewMore}>+{dayEvents.length - 2} más</Text>}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const ConflictModal = ({ showConflictModal, setShowConflictModal, conflictoDetectado, setConflictoDetectado }) => (
  <Modal
    visible={showConflictModal}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setShowConflictModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Ionicons name="warning" size={32} color="#ff6b6b" />
          <Text style={styles.modalTitle}>Conflicto de Horario</Text>
        </View>
        {conflictoDetectado && (
          <View>
            <Text style={styles.modalMessage}>Se detectó un conflicto con el siguiente evento:</Text>
            <View style={styles.conflictEventCard}>
              <Text style={styles.conflictEventTitle}>{conflictoDetectado.nombreevento}</Text>
              <Text style={styles.conflictEventDetails}>
                {dayjs(conflictoDetectado.horaevento.split('+')[0], 'HH:mm:ss').format('HH:mm')} - {conflictoDetectado.lugarevento}
              </Text>
              <Text style={styles.conflictEventResponsible}>Responsable: {conflictoDetectado.responsable_evento}</Text>
            </View>
            <Text style={styles.modalWarning}>Se recomienda mantener al menos 2 horas de separación entre eventos.</Text>
          </View>
        )}
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowConflictModal(false)}>
            <Text style={styles.modalButtonSecondaryText}>Elegir otra hora</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalButtonPrimary} onPress={() => {
            setShowConflictModal(false);
            setConflictoDetectado(null);
          }}>
            <Text style={styles.modalButtonPrimaryText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const EventosDelDiaMejorado = ({ eventosDelDia, fechaHoraSeleccionada, verificarConflictoHorario }) => {
  if (eventosDelDia.length === 0) return null;
  return (
    <View style={styles.eventosDelDiaContainer}>
      <View style={styles.eventosDelDiaHeader}>
        <Ionicons name="calendar-outline" size={20} color="#e95a0c" />
        <Text style={styles.eventosDelDiaTitle}>Eventos en {dayjs(fechaHoraSeleccionada).format('DD/MM/YYYY')}</Text>
        <View style={styles.eventCountBadge}>
          <Text style={styles.eventCountText}>{eventosDelDia.length}</Text>
        </View>
      </View>
      <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
        {eventosDelDia.map((evento, index) => {
          const horaEventoString = (evento.horaevento || '').split('+')[0].trim();
          const horaEvento = dayjs(`2000-01-01 ${horaEventoString}`, 'YYYY-MM-DD HH:mm:ss');
          const isHoraValida = horaEvento.isValid();
          const isConflict = verificarConflictoHorario(
            dayjs(fechaHoraSeleccionada).format('YYYY-MM-DD') + 'T' + dayjs(fechaHoraSeleccionada).format('HH:mm:ss')
          ).some(e => e.id === evento.id || e.idevento === evento.idevento);
          return (
            <View key={index} style={[styles.eventoCard, isConflict && styles.eventoCardConflict]}>
              <View style={styles.eventoCardHeader}>
                <View style={styles.eventoTimeContainer}>
                  <Ionicons name="time-outline" size={16} color={isConflict ? "#ff6b6b" : "#e95a0c"} />
                  <Text style={[styles.eventoTime, isConflict && styles.eventoTimeConflict]}>
                    {isHoraValida ? horaEvento.format('HH:mm') : 'Hora no disponible'}
                  </Text>
                </View>
                {isConflict && (
                  <View style={styles.conflictBadge}>
                    <Ionicons name="warning" size={12} color="white" />
                    <Text style={styles.conflictBadgeText}>Conflicto</Text>
                  </View>
                )}
              </View>
              <Text style={styles.eventoNombre}>{evento.nombreevento}</Text>
              <View style={styles.eventoDetails}>
                <View style={styles.eventoDetailRow}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.eventoDetailText}>{evento.lugarevento}</Text>
                </View>
                <View style={styles.eventoDetailRow}>
                  <Ionicons name="person-outline" size={14} color="#666" />
                  <Text style={styles.eventoDetailText}>{evento.responsable_evento}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.eventosDelDiaFooter}>
        <Text style={styles.eventosDelDiaNote}>Verifica que tu nuevo evento no genere conflictos de horario</Text>
      </View>
    </View>
  );
};

const ConfirmModal = ({ showConfirmModal, setShowConfirmModal, handleSubmitConfirmed, isLoading, formData }) => (
  <Modal
    visible={showConfirmModal}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setShowConfirmModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.confirmModalContent}>
        <View style={styles.confirmModalHeader}>
          <Ionicons name="information-circle" size={32} color="#3498db" />
          <Text style={styles.confirmModalTitle}>Confirmar Envío</Text>
        </View>
        <Text style={styles.confirmModalMessage}>
          ¿Estás seguro de que deseas crear este evento? Una vez enviado, no podrás modificarlo.
        </Text>
        <View style={styles.confirmModalDetails}>
          <Text style={styles.confirmModalDetailTitle}>Resumen del Evento:</Text>
          <Text style={styles.confirmModalDetail}><Text style={styles.detailLabel}>Nombre: </Text>{formData.nombreevento}</Text>
          <Text style={styles.confirmModalDetail}>
            <Text style={styles.detailLabel}>Fecha: </Text>{dayjs(formData.fechaHoraSeleccionada).format('DD/MM/YYYY')}
          </Text>
        </View>
        <View style={styles.confirmModalButtons}>
          <TouchableOpacity style={[styles.confirmModalButton, styles.confirmModalButtonCancel]} onPress={() => setShowConfirmModal(false)}>
            <Text style={styles.confirmModalButtonTextCancel}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.confirmModalButton, styles.confirmModalButtonConfirm]} onPress={handleSubmitConfirmed} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmModalButtonTextConfirm}>Sí, Crear Evento</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const ProyectoEvento = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [errors, setErrors] = useState({});
  const [eventos, setEventos] = useState([]);
  const [eventosDelDia, setEventosDelDia] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictoDetectado, setConflictoDetectado] = useState(null);
  const scrollViewRef = useRef(null);
  const objetivosSectionRef = useRef(null);
  const [objetivosSectionY, setObjetivosSectionY] = useState(0);
  const [isScrollingToObjetivos, setIsScrollingToObjetivos] = useState(false);
  const [nombreevento, setNombreevento] = useState('');
  const [lugarevento, setLugarevento] = useState('');
  const [nombreResponsable, setNombreResponsable] = useState('');
  const [tiposSeleccionados, setTiposSeleccionados] = useState({});
  const [textoOtroTipo, setTextoOtroTipo] = useState('');
  const [textoTiposSeleccionados, setTextoTiposSeleccionados] = useState('');
  const [recursosDisponibles, setRecursosDisponibles] = useState([]);
  const [recursosSeleccionados, setRecursosSeleccionados] = useState([]);
  const [recursosTecnologicos, setRecursosTecnologicos] = useState([{ nombre: '', cantidad: '' }]);
  const [mobiliario, setMobiliario] = useState([{ nombre: '', cantidad: '' }]);
  const [vajilla, setVajilla] = useState([{ nombre: '', cantidad: '' }]);
  const [segmentosTextoPersonalizado, setSegmentosTextoPersonalizado] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clasificacionSeleccionada, setClasificacionSeleccionada] = useState('');
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState('');
  const [showClasificacionModal, setShowClasificacionModal] = useState(false);
  const [showSubcategoriaModal, setShowSubcategoriaModal] = useState(false);
  const [showLugarModal, setShowLugarModal] = useState(false);
  const [campusSeleccionado, setCampusSeleccionado] = useState(null);
  const [areaSeleccionada, setAreaSeleccionada] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [seccionObjetivosVisible, setSeccionObjetivosVisible] = useState(false);
  const [seccionResultadosVisible, setSeccionResultadosVisible] = useState(false);
  const [seccionComiteVisible, setSeccionComiteVisible] = useState(false);
  const [seccionRecursosVisible, setSeccionRecursosVisible] = useState(false);
  const [seccionPresupuestoVisible, setSeccionPresupuestoVisible] = useState(false);
  const resultadosSectionRef = useRef(null);
  const [isScrollingToResultados, setIsScrollingToResultados] = useState(false);
  const comiteSectionRef = useRef(null);
  const [isScrollingToComite, setisScrollingToComite] = useState(false);
  const recursosSectionRef = useRef(null);
  const [isScrollingToRecursos, setIsScrollingToRecursos] = useState(false);
  const [recursos, setRecursos] = useState([{ nombre_recurso: '', cantidad: '' }]);
  const presupuestoSectionRef = useRef(null);
  const [isScrollingToPresupuesto, setIsScrollingToPresupuesto] = useState(false);
  const [usuariosComite, setUsuariosComite] = useState([]);
  const [comiteLoading, setComiteLoading] = useState(true);
  const [comiteError, setComiteError] = useState(false);
  const [comiteErrorMessage, setComiteErrorMessage] = useState('');
  const [comiteSeleccionado, setComiteSeleccionado] = useState([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState(new Date());
  const [facultades, setFacultades] = useState([]);
  const [facultadSeleccionada, setFacultadSeleccionada] = useState(null);
  const [showFacultadModal, setShowFacultadModal] = useState(false);
  const [userIdActual, setUserIdActual] = useState(null);
  
  const [recursosSeleccionadosCount, setRecursosSeleccionadosCount] = useState([]);
  const addRecursoTecnologico = () => setRecursosTecnologicos(prev => [...prev, { nombre: '', cantidad: '' }]);
  const removeRecursoTecnologico = (index) => setRecursosTecnologicos(prev => prev.filter((_, i) => i !== index));
  const updateRecursoTecnologico = (value, index, field) => {
    const nuevos = [...recursosTecnologicos];
    nuevos[index][field] = value;
    setRecursosTecnologicos(nuevos);
  };

  const validarAnticipacionDosSemanas = () => {
  const hoy = dayjs().startOf('day');
  const fechaEvento = dayjs(fechaHoraSeleccionada).startOf('day');
  const diasDiferencia = fechaEvento.diff(hoy, 'day');
  
  if (diasDiferencia < 14) {
    return {
      valido: false,
      diasDiferencia,
      mensaje: diasDiferencia <= 0 
        ? 'No puedes crear eventos en fechas pasadas o el mismo día. El evento debe crearse con al menos 2 semanas (14 días) de anticipación.'
        : `El evento debe crearse con al menos 2 semanas (14 días) de anticipación. Solo faltan ${diasDiferencia} día(s) para la fecha seleccionada.`
    };
  }
  return { valido: true, diasDiferencia, mensaje: '' };
};
  const addMobiliario = () => setMobiliario(prev => [...prev, { nombre: '', cantidad: '' }]);
  const removeMobiliario = (index) => setMobiliario(prev => prev.filter((_, i) => i !== index));
  const updateMobiliario = (value, index, field) => {
    const nuevos = [...mobiliario];
    nuevos[index][field] = value;
    setMobiliario(nuevos);
  };

  const addVajilla = () => setVajilla(prev => [...prev, { nombre: '', cantidad: '' }]);
  const removeVajilla = (index) => setVajilla(prev => prev.filter((_, i) => i !== index));
  const updateVajilla = (value, index, field) => {
    const nuevos = [...vajilla];
    nuevos[index][field] = value;
    setVajilla(nuevos);
  };

  const [fechaHoraSeleccionada, setFechaHoraSeleccionada] = useState(() => {
    let initialDate = dayjs();
    if (params.selectedDate) {
      initialDate = dayjs(params.selectedDate);
      if (params.selectedHour) {
        initialDate = initialDate.hour(parseInt(params.selectedHour, 10)).minute(0).second(0);
      }
      return initialDate.toDate();
    }
    return new Date();
  });

  const [objetivos, setObjetivos] = useState({
    modeloPedagogico: false,
    posicionamiento: false,
    internacionalizacion: false,
    rsu: false,
    fidelizacion: false,
    otro: false,
    otroTexto: ''
  });

  const [argumentacion, setArgumentacion] = useState('');
  const [objetivosPDI, setObjetivosPDI] = useState(['', '', '']);

  const [segmentoObjetivo, setSegmentoObjetivo] = useState({
    estudiantes: false,
    docentes: false,
    publicoExterno: false,
    influencers: false,
    otro: false,
    otroTexto: ''
  });

  const [resultadosEsperados, setResultadosEsperados] = useState({
    participacion: '',
    satisfaccion: '',
    otro: ''
  });

  const [egresos, setEgresos] = useState([{ key: 'egreso-1', descripcion: '', cantidad: '', precio: '' }]);
  const [ingresos, setIngresos] = useState([{ key: 'ingreso-1', descripcion: '', cantidad: '', precio: '' }]);

  const totalEgresos = useMemo(() => egresos.reduce((acc, item) => acc + (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0), 0), [egresos]);
  const totalIngresos = useMemo(() => ingresos.reduce((acc, item) => acc + (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0), 0), [ingresos]);
  const balance = useMemo(() => totalIngresos - totalEgresos, [totalIngresos, totalEgresos]);

  const fetchNotifications = async () => {
    try {
      const token = await getTokenAsync();
      if (!token || token === 'null' || token === '') {
        router.replace('/login');
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/notificaciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const mappedNotifications = (response.data || []).map(notif => ({
        id: notif.id || notif.idnotification,
        idusuario: notif.idusuario,
        title: notif.titulo || notif.title,
        message: notif.mensaje || notif.message,
        type: notif.tipo || notif.type,
        estado: notif.estado,
        read: notif.estado === 'leido',
        created_at: notif.created_at || notif.timestamp
      }));
      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
    }
  };
  

  const markNotificationAsRead = async (notificationId) => {
    if (!authToken || authToken === 'null' || authToken === '') return;
    try {
      await axios.patch(`${API_BASE_URL}/notificaciones/${notificationId}/read`, {}, { headers: { Authorization: `Bearer ${authToken}` } });
      setNotifications(prev => prev.map(n => n.idusuario === notificationId ? { ...n, read: true, estado: 'leido' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  };

  const fetchUserInfo = async () => {
      if (!authToken) return null;
      try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } });
      setUserRole(response.data.role || response.data.rol);
      setUserIdActual(response.data.id || response.data.idusuario || response.data.user_id); // ✅ Guardar ID
      return response.data;
      } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      return null;
      }
};

  const fetchEventos = async () => {
  try {
    const token = await getTokenAsync();
    if (!token) return;
    const response = await axios.get(`${API_BASE_URL}/eventos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setEventos(response.data || []);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
  }
};
  const fetchUsuariosComite = async (retries = 3) => {
    console.log('🔄 Iniciando fetchUsuariosComite...');
    
    for (let i = 0; i < retries; i++) {
      try {
        setComiteLoading(true);
        setComiteError(false);
        setComiteErrorMessage('');
        
        const token = await getTokenAsync();
        
        if (!token) { 
          console.log('❌ No hay token');
          setComiteError(true);
          setComiteErrorMessage('No hay token de autenticación');
          setComiteLoading(false);
          return; 
        }
        
        console.log('📡 Haciendo petición a /users/comite...');
        const response = await axios.get(`${API_BASE_URL}/users/comite`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000,
        });
        
        console.log('✅ Respuesta recibida:', response.data);
        
        const uniqueUsuarios = [];
        const seenIds = new Set();
        for (const usuario of response.data) {
          if (!seenIds.has(usuario.id)) {
            seenIds.add(usuario.id);
            uniqueUsuarios.push(usuario);
          }
        }
        
        console.log(`✅ ${uniqueUsuarios.length} usuarios únicos cargados`);
        setUsuariosComite(uniqueUsuarios);
        setComiteLoading(false);
        return;
        
      } catch (error) {
        console.error("❌ Error fetching comite:", error.response?.status, error.response?.data);
        
        let errorMsg = 'Error desconocido';
        
        if (error.response?.status === 401) {
          errorMsg = 'Token inválido o sesión expirada. Por favor, inicia sesión nuevamente.';
          console.log('⚠️ Token inválido - 401');
          
          if (Platform.OS === 'web') {
            localStorage.removeItem('adminAuthToken');
          } else {
            try {
              await SecureStore.deleteItemAsync('adminAuthToken');
            } catch (e) {
              console.error('Error al eliminar token:', e);
            }
          }
          
          setComiteLoading(false);
          setComiteError(true);
          setComiteErrorMessage(errorMsg);
          
          Alert.alert(
            "Sesión expirada", 
            "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
            [{ 
              text: "Ir a Login", 
              onPress: () => router.replace('/login') 
            }]
          );
          return;
        } else if (error.response?.status === 403) {
          errorMsg = 'No tienes permisos para acceder a esta sección. Contacta al administrador.';
          console.log('⚠️ Sin permisos - 403');
        } else if (error.response?.status === 404) {
          errorMsg = 'El endpoint /users/comite no existe en el servidor.';
          console.log('⚠️ Endpoint no encontrado - 404');
        } else if (error.code === 'ECONNABORTED') {
          errorMsg = 'Tiempo de espera agotado. El servidor está tardando en responder.';
        } else if (error.message?.includes('Network Error')) {
          errorMsg = 'Error de conexión. Verifica tu conexión a internet.';
        } else {
          errorMsg = error.response?.data?.message || error.response?.data?.error || 'No se pudieron cargar los usuarios del comité.';
        }
        
        if (i === retries - 1) {
          console.log('❌ Último intento fallido');
          setComiteLoading(false);
          setComiteError(true);
          setComiteErrorMessage(errorMsg);
          setUsuariosComite([]);
        } else {
          console.log(`🔄 Reintentando... intento ${i + 1} de ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    }
  };

  const verificarConflictoHorario = (fechaHora) => {
    const fechaFormateada = dayjs(fechaHora).format('YYYY-MM-DD');
    const horaFormateada = dayjs(fechaHora).format('HH:mm');
    const eventosEnMismaFecha = eventos.filter(evento => dayjs(evento.fechaevento).format('YYYY-MM-DD') === fechaFormateada);

    return eventosEnMismaFecha.filter(evento => {
      const horaEventoString = (evento.horaevento || '').split('+')[0].trim();
      const horaEvento = dayjs(horaEventoString, 'HH:mm:ss');
      if (!horaEvento.isValid()) return false;

      const horaSeleccionada = dayjs(horaFormateada, 'HH:mm');
      return Math.abs(horaEvento.diff(horaSeleccionada, 'minutes')) < 240;
    });
  };

  const handleClockTimeChange = useCallback((newDate) => {
    setFechaHoraSeleccionada(newDate);

    const conflictos = verificarConflictoHorario(newDate);
    if (conflictos.length > 0) {
      setConflictoDetectado(conflictos[0]);
      setShowConflictModal(true);
    }
  }, [eventos]);

  const cargarRecursos = useCallback(async () => {
    const token = await getTokenAsync();
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/recursos`, { headers: { Authorization: `Bearer ${token}` } });
      let recursosRaw = response.data;
      if (!Array.isArray(recursosRaw)) {
        recursosRaw = response.data.data || response.data.recursos || [];
      }
      const validResources = recursosRaw
        .map(recurso => ({
          ...recurso,
          idrecurso: recurso.idrecurso ?? recurso.id ?? null,
          nombre_recurso: recurso.nombre_recurso || recurso.nombre || 'Recurso sin nombre',
          recurso_tipo: recurso.recurso_tipo || 'otro'
        }))
        .filter(r => r.idrecurso != null && r.nombre_recurso?.trim() !== '');
      setRecursosDisponibles(validResources);
    } catch (error) {
      console.error("❌ Error recursos:", error.response?.status, error.response?.data);
    }
  }, []);

  const fetchFacultades = useCallback(async () => {
  try {
    const token = await getTokenAsync();
    if (!token) return;
    const response = await axios.get(`${API_BASE_URL}/facultades`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setFacultades(response.data || []);
  } catch (error) {
    console.error('❌ Error al obtener facultades:', error);
  }
}, []);
  useFocusEffect(cargarRecursos);

  useEffect(() => {
    if (authToken) {
      fetchUserInfo();
      fetchNotifications();
      fetchUsuariosComite();
      fetchFacultades();
      fetchEventos();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [authToken]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const token = await getTokenAsync();
      
      if (!token || token === 'null' || token === '') {
        Alert.alert("Error", "No se encontró un token de autenticación. Por favor, inicia sesión.");
        router.replace("/login");
        setIsLoading(false);
        return;
      }
      
      try {
        await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAuthToken(token);
      } catch (error) {
        console.error("Token inválido:", error.response?.data);
        
        if (Platform.OS === 'web') {
          localStorage.removeItem('adminAuthToken');
        } else {
          await SecureStore.deleteItemAsync('adminAuthToken');
        }
        
        Alert.alert(
          "Sesión expirada", 
          "Tu sesión ha expirado o el token es inválido. Por favor, inicia sesión nuevamente.",
          [{ text: "OK", onPress: () => router.replace('/login') }]
        );
        setIsLoading(false);
        return;
      }
      
      setIsLoading(false);
    };
    initialize();
  }, []);

  useEffect(() => {
    const selectedIds = Object.keys(tiposSeleccionados);
    const selectedLabels = selectedIds.map(id => {
      const tipoEncontrado = TIPOS_DE_EVENTO.find(tipo => tipo.id === id);
      return tipoEncontrado ? tipoEncontrado.label : '';
    });
    setTextoTiposSeleccionados(selectedLabels.join(', '));
  }, [tiposSeleccionados]);

  useEffect(() => {
    const selectedDateStr = dayjs(fechaHoraSeleccionada).format('YYYY-MM-DD');
    const eventsDelDia = eventos.filter(e => e.fechaevento === selectedDateStr);
    setEventosDelDia(eventsDelDia);
  }, [eventos, fechaHoraSeleccionada]);

  const addResource = () => setRecursos(prev => [...prev, { nombre_recurso: '', cantidad: '' }]);
  const removeResource = (indexToRemove) => setRecursos(prev => prev.filter((_, index) => index !== indexToRemove));
  const updateResource = (text, indexToUpdate, field) => {
    const nuevosRecursos = [...recursos];
    nuevosRecursos[indexToUpdate][field] = text;
    setRecursos(nuevosRecursos);
  };

  const handleInputChange = (field, value) => {
    if (field === 'nombreevento') setNombreevento(value);
    if (field === 'lugarevento') setLugarevento(value);
    if (field === 'nombreResponsable') setNombreResponsable(value);
    if (errors[field]) setErrors(prevErrors => ({ ...prevErrors, [field]: null }));
  };

  const handleCheckboxChange = (setter, key) => setter(prev => ({ ...prev, [key]: !prev[key] }));
  const handleOtroTextChange = (setter, text) => setter(prev => ({ ...prev, otroTexto: text }));
  const handleResultadoChange = (key, value) => setResultadosEsperados(prev => ({ ...prev, [key]: value }));
  
  const handlePresupuestoChange = (items, setItems, index, field, value) => {
    const nuevosItems = [...items];
    nuevosItems[index][field] = value;
    setItems(nuevosItems);
  };
  
  const agregarFilaPresupuesto = (setItems) => setItems(prev => [...prev, { key: `item-${Date.now()}`, descripcion: '', cantidad: '', precio: '' }]);
  const eliminarFilaPresupuesto = (items, setItems, index) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index));
  };

 const handleRecursoChange = useCallback((idrecurso, recurso) => {
  if (idrecurso == null) return;
  const idString = String(idrecurso);
  
  setRecursosSeleccionadosCount(prev => {
    const currentCount = prev[idString] || 0;
    
    // Si ya está seleccionado, lo deseleccionamos
    if (currentCount > 0) {
      const nuevoEstado = { ...prev };
      delete nuevoEstado[idString];
      return nuevoEstado;
    }
    
    // Si no está seleccionado, lo añadimos con cantidad 1
    return { 
      ...prev, 
      [idString]: 1 
    };
  });
}, []);

  
 const getCantidadDisponible = useCallback((recurso) => {
  if (!recurso || !recurso.idrecurso) return 0;
  const idString = String(recurso.idrecurso);
  const seleccionados = recursosSeleccionadosCount[idString] || 0;
  const disponibleOriginal = recurso.cantidad || recurso.disponibles || 0;
  return Math.max(0, disponibleOriginal - seleccionados);
}, [recursosSeleccionadosCount]);

// Y puedeSeleccionarRecurso:
const puedeSeleccionarRecurso = useCallback((recurso) => {
  if (!recurso || !recurso.idrecurso) return false;
  const disponible = getCantidadDisponible(recurso);
  return disponible > 0;
}, [getCantidadDisponible]);

// 5. En el renderizado de recursos disponibles, modificar esto:
{recursosDisponibles.map((recurso) => {
  const idString = String(recurso.idrecurso);
  const cantidadSeleccionada = recursosSeleccionadosCount[idString] || 0;
  const cantidadDisponible = getCantidadDisponible(recurso);
  const isSelected = cantidadSeleccionada > 0;
  const canSelect = puedeSeleccionarRecurso(recurso);

  return (
    <TouchableOpacity
      key={idString}
      style={[
        styles.recursoDisponibleCard, 
        isSelected && styles.recursoDisponibleCardSelected,
        !canSelect && styles.recursoDisponibleCardDisabled
      ]}
      onPress={() => canSelect && handleRecursoChange(recurso.idrecurso, recurso)}
      disabled={!canSelect}
    >
      <View style={styles.recursoCheckboxContainer}>
        <Ionicons 
          name={isSelected ? "checkbox" : "square-outline"} 
          size={24} 
          color={isSelected ? "#e95a0c" : !canSelect ? "#ccc" : "#888"} 
        />
      </View>
      <View style={styles.recursoInfo}>
        <Text style={styles.recursoNombre}>{recurso.nombre_recurso}</Text>
        <Text style={styles.recursoTipo}>
          {recurso.recurso_tipo === 'tecnologico' ? 'Tecnológico' : 
           recurso.recurso_tipo === 'mobiliario' ? 'Mobiliario' : 'Vajilla'}
        </Text>
        <Text style={[
          styles.recursoCantidad, 
          { color: cantidadDisponible <= 2 ? '#e74c3c' : '#27ae60' }
        ]}>
          Disponibles: {cantidadDisponible}
          {cantidadSeleccionada > 0 && ` (Seleccionadas: ${cantidadSeleccionada})`}
        </Text>
      </View>
    </TouchableOpacity>
  );
})}
  const handleTipoEventoChange = (id) => {
    setTiposSeleccionados(prev => {
      const newState = { ...prev };
      if (newState[id]) delete newState[id];
      else newState[id] = true;
      return newState;
    });
  };

  const handleObjetivoPDIChange = (index, value) => {
    const newObjetivos = [...objetivosPDI];
    newObjetivos[index] = value;
    setObjetivosPDI(newObjetivos);
  };

  const scrollToObjetivos = () => {
    setSeccionObjetivosVisible(true);
    setTimeout(() => {
      if (objetivosSectionRef.current && scrollViewRef.current) {
        setIsScrollingToObjetivos(true);
        objetivosSectionRef.current.measureLayout(
          scrollViewRef.current.getInnerViewNode(),
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 60, animated: true });
            setTimeout(() => setIsScrollingToObjetivos(false), 1000);
          },
          (error) => { console.warn("Error:", error); setIsScrollingToObjetivos(false); }
        );
      }
    }, 0);
  };

  const scrollToResultados = () => {
    setSeccionResultadosVisible(true);
    setTimeout(() => {
      if (resultadosSectionRef.current && scrollViewRef.current) {
        setIsScrollingToResultados(true);
        resultadosSectionRef.current.measureLayout(
          scrollViewRef.current.getInnerViewNode(),
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 60, animated: true });
            setTimeout(() => setIsScrollingToResultados(false), 1000);
          },
          (error) => { console.warn("Error:", error); setIsScrollingToResultados(false); }
        );
      }
    }, 0);
  };

  const scrollToComite = () => {
    setSeccionComiteVisible(true);
    setTimeout(() => {
      if (comiteSectionRef.current && scrollViewRef.current) {
        setisScrollingToComite(true);
        comiteSectionRef.current.measureLayout(
          scrollViewRef.current.getInnerViewNode(),
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 60, animated: true });
            setTimeout(() => setisScrollingToComite(false), 1000);
          },
          (error) => { console.warn("Error:", error); setisScrollingToComite(false); }
        );
      }
    }, 0);
  };

  const scrollToRecursos = () => {
    setSeccionRecursosVisible(true);
    setTimeout(() => {
      if (recursosSectionRef.current && scrollViewRef.current) {
        setIsScrollingToRecursos(true);
        recursosSectionRef.current.measureLayout(
          scrollViewRef.current.getInnerViewNode(),
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 60, animated: true });
            setTimeout(() => setIsScrollingToRecursos(false), 1000);
          },
          (error) => { console.warn("Error:", error); setIsScrollingToRecursos(false); }
        );
      }
    }, 0);
  };

  const scrollToPresupuesto = () => {
    setSeccionPresupuestoVisible(true);
    setTimeout(() => {
      if (presupuestoSectionRef.current && scrollViewRef.current) {
        setIsScrollingToPresupuesto(true);
        presupuestoSectionRef.current.measureLayout(
          scrollViewRef.current.getInnerViewNode(),
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 60, animated: true });
            setTimeout(() => setIsScrollingToPresupuesto(false), 1000);
          },
          (error) => { console.warn("Error:", error); setIsScrollingToPresupuesto(false); }
        );
      }
    }, 0);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!nombreevento.trim()) newErrors.nombreevento = 'El nombre del evento es obligatorio.';
    if (Object.values(tiposSeleccionados).every(v => !v)) newErrors.tipos = 'Selecciona al menos un tipo de evento.';
    if (tiposSeleccionados['5'] && !textoOtroTipo.trim()) newErrors.textoOtroTipo = 'Describe el otro tipo de evento.';
    if (Object.values(objetivos).every(v => !v)) newErrors.objetivos = 'Selecciona al menos un objetivo.';
    if (objetivos.otro && !objetivos.otroTexto.trim()) newErrors.objetivosOtroTexto = 'Describe el otro objetivo.';
    if (!argumentacion.trim()) newErrors.argumentacion = 'La argumentación es obligatoria.';
    if (!clasificacionSeleccionada) newErrors.clasificacionSeleccionada = 'La clasificación estratégica es obligatoria.';
    if (clasificacionSeleccionada && CLASIFICACION_ESTRATEGICA[clasificacionSeleccionada]?.subcategorias && !subcategoriaSeleccionada) {
      newErrors.subcategoriaSeleccionada = 'Selecciona una subcategoría.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Formulario Incompleto', 'Por favor, corrige los campos marcados en rojo antes de continuar.');
      return;
    }
     const validacionAnticipacion = validarAnticipacionDosSemanas();
  if (!validacionAnticipacion.valido) {
    if (Platform.OS === 'web') {
      window.alert(`⚠️ Anticipación insuficiente\n\n${validacionAnticipacion.mensaje}\n\nPor favor, selecciona una fecha que sea al menos 14 días desde hoy.`);
    } else {
      Alert.alert(
        '⚠️ Anticipación insuficiente',
        `${validacionAnticipacion.mensaje}\n\nPor favor, selecciona una fecha que sea al menos 14 días desde hoy.`,
        [{ text: 'Entendido' }]
      );
    }
    return;
  }
    setShowConfirmModal(true);
  };
  

    const handleSubmitConfirmed = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    
    if (!authToken) {
      console.warn("⚠️ No hay authToken");
      const msg = "Error de Autenticación: No se puede enviar el formulario. Intenta iniciar sesión de nuevo.";
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert("Error de Autenticación", msg);
      }
      setIsLoading(false);
      return;
    }
    
    try {
      console.log("🔍 1. Verificando conflictos de horario...");
      const conflictos = verificarConflictoHorario(fechaHoraSeleccionada);
      if (conflictos.length > 0) {
        setIsLoading(false);
        const msg = `Ya existe un evento programado a las ${dayjs(fechaHoraSeleccionada).format('HH:mm')} del ${dayjs(fechaHoraSeleccionada).format('DD/MM/YYYY')}.\n\nEvento existente: ${conflictos[0].nombreevento}\nLugar: ${conflictos[0].lugarevento}\nResponsable: ${conflictos[0].responsable_evento}\n\nPor favor, selecciona otra hora o fecha.`;
        if (Platform.OS === 'web') {
          window.alert(`⚠️ Conflicto de Horario\n\n${msg}`);
        } else {
          Alert.alert('⚠️ Conflicto de Horario', msg, [{ text: 'Entendido' }]);
        }
        return;
      }

      if (!nombreevento.trim()) throw new Error('El nombre del evento es obligatorio');
      
      console.log("🔍 2. Procesando tipos de evento...");
      const tiposParaEnviar = Object.keys(tiposSeleccionados)
        .filter(id => tiposSeleccionados[id])
        .map(id => {
          const tipoObjeto = TIPOS_DE_EVENTO.find(tipo => tipo.id === id);
          return tipoObjeto ? {
            id: parseInt(id, 10),
            texto_personalizado: id === '5' && textoOtroTipo.trim() !== '' ? textoOtroTipo.trim() : undefined
          } : null;
        })
        .filter(item => item !== null);
        
      if (tiposParaEnviar.length === 0) throw new Error('Debes seleccionar al menos un tipo de evento');
      
      console.log("🔍 3. Procesando objetivos...");
      const objetivoParaEnviar = [];
      Object.keys(objetivos)
        .filter(key => objetivos[key] === true && key !== 'otroTexto')
        .forEach(key => {
          objetivoParaEnviar.push(OBJETIVOS_EVENTO_MAP[key]);
        });
        
      if (objetivos.otro && objetivos.otroTexto.trim()) {
        objetivoParaEnviar.push({ id: OBJETIVOS_EVENTO_MAP.otro, texto_personalizado: objetivos.otroTexto.trim() });
      }
      
      const pdiObjetivos = objetivosPDI
        .filter(o => o.trim() !== '')
        .map(texto => ({ id: OBJETIVOS_EVENTO_MAP.otro, texto_personalizado: texto.trim() }));
        
      const todosLosObjetivos = [...objetivoParaEnviar, ...pdiObjetivos];
      if (todosLosObjetivos.length === 0) throw new Error('Debes seleccionar al menos un objetivo');
      
      console.log("🔍 4. Procesando segmentos...");
      const segmentosParaEnviar = [];
      const validKeys = ['estudiantes', 'docentes', 'publicoExterno', 'influencers'];
      Object.keys(segmentoObjetivo)
        .filter(key => segmentoObjetivo[key] === true && validKeys.includes(key))
        .forEach(key => {
          const label = { estudiantes: 'Estudiantes', docentes: 'Docentes', publicoExterno: 'Público Externo', influencers: 'Influencers' }[key];
          const segmentoData = SEGMENTO_OBJETIVO.find(s => s.label === label);
          if (segmentoData) {
            segmentosParaEnviar.push({
              id: parseInt(segmentoData.id, 10),
              texto_personalizado: segmentosTextoPersonalizado[key] || null
            });
          }
        });
        
      console.log("🔍 5. Procesando recursos...");
      const nuevosRecursos = [
        ...recursosTecnologicos.filter(r => r.nombre?.trim()).map(r => ({ 
          nombre_recurso: r.nombre.trim(), 
          cantidad: parseInt(r.cantidad) || 1, 
          recurso_tipo: 'tecnologico' 
        })),
        ...mobiliario.filter(r => r.nombre?.trim()).map(r => ({ 
          nombre_recurso: r.nombre.trim(), 
          cantidad: parseInt(r.cantidad) || 1, 
          recurso_tipo: 'mobiliario' 
        })),
        ...vajilla.filter(r => r.nombre?.trim()).map(r => ({ 
          nombre_recurso: r.nombre.trim(), 
          cantidad: parseInt(r.cantidad) || 1, 
          recurso_tipo: 'vajilla' 
        }))
      ];

      
      const recursosExistentes = Object.entries(recursosSeleccionadosCount)
        .filter(([id, cantidad]) => cantidad > 0)
        .map(([id, cantidad]) => ({
          idrecurso: parseInt(id, 10),
          cantidad: cantidad
        }));

console.log("Recursos existentes seleccionados:", recursosExistentes);
        
      console.log("🔍 6. Procesando presupuesto...");
      const presupuestoData = {
        egresos: egresos.filter(item => item.descripcion.trim()).map(item => ({
          descripcion: item.descripcion,
          cantidad: parseFloat(item.cantidad) || 0,
          precio_unitario: parseFloat(item.precio) || 0,
          total: (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0)
        })),
        ingresos: ingresos.filter(item => item.descripcion.trim()).map(item => ({
          descripcion: item.descripcion,
          cantidad: parseFloat(item.cantidad) || 0,
          precio_unitario: parseFloat(item.precio) || 0,
          total: (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0)
        })),
        total_egresos: totalEgresos,
        total_ingresos: totalIngresos,
        balance: balance
      };
      
      console.log("🔍 7. Construyendo payload final...");
      const eventoPayload = {
        nombreevento: nombreevento.trim(),
        lugarevento: lugarevento.trim() || 'Por definir',
        fechaevento: dayjs(fechaHoraSeleccionada).format('YYYY-MM-DD'),
        horaevento: dayjs(fechaHoraSeleccionada).format('HH:mm:ss'),
        argumentacion: argumentacion.trim() || null,
        resultados_esperados: JSON.stringify(resultadosEsperados),
        tipos_de_evento: tiposParaEnviar,
        objetivos: todosLosObjetivos,
        segmentos_objetivo: segmentosParaEnviar.length > 0 ? segmentosParaEnviar : null,
        recursos_existentes: recursosExistentes.length > 0 ? recursosExistentes : null,
        recursos_nuevos: nuevosRecursos.length > 0 ? nuevosRecursos : null,
        presupuesto: presupuestoData,
        idclasificacion: clasificacionSeleccionada ? parseInt(clasificacionSeleccionada, 10) : null,
        idsubcategoria: subcategoriaSeleccionada ? parseInt(subcategoriaSeleccionada, 10) : null,
        comite: comiteSeleccionado.length > 0 ? comiteSeleccionado : null,
        evento_externo: segmentoObjetivo.publicoExterno === true,
        facultad_dirigida: segmentoObjetivo.estudiantes && facultadSeleccionada ? facultadSeleccionada : null,
      };

      console.log("🚀 8. Enviando payload al servidor:", eventoPayload);
      
      const response = await axios.post(`${API_BASE_URL}/eventos`, eventoPayload, {
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      });
      
      console.log("✅ 9. Respuesta exitosa del servidor:", response.data);
      
      const successMessage = 'El evento ha sido creado correctamente.';
      console.log("🎉 10. Mostrando alerta de éxito...");
      
      // CORRECCIÓN CLAVE: Fallback para Web + Navegación segura
      if (Platform.OS === 'web') {
        window.alert(`✅ Éxito\n\n${successMessage}`);
        router.replace('/admin/HomeAcademico');
      } else {
        Alert.alert(
          '✅ Éxito',
          successMessage,
          [
            {
              text: 'OK',
              onPress: () => {
                console.log("🔄 Navegando a /admin/HomeAcademico");
                router.replace('/admin/HomeAcademico');
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error("❌ ERROR DETALLADO al crear el evento:", error);
      let errorMessage = "Ocurrió un error desconocido.";
      
      if (error.response) {
        // Manejo seguro de posibles estructuras de error del backend
        errorMessage = error.response.data?.message || error.response.data?.error || JSON.stringify(error.response.data) || `Error del servidor: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "No se pudo conectar con el servidor. Revisa tu conexión a internet.";
      } else {
        errorMessage = error.message || "Error desconocido";
      }
      
      console.warn("⚠️ Mostrando alerta de error:", errorMessage);
      if (Platform.OS === 'web') {
        window.alert(`❌ Error al crear el evento\n\n${errorMessage}`);
      } else {
        Alert.alert('❌ Error al crear el evento', errorMessage);
      }
    } finally {
      console.log("🔄 11. Estableciendo isLoading en false");
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crear Evento</Text>
        <NotificationBell notificationCount={unreadCount} onPress={() => setShowNotificationsModal(true)} />
      </View>

      <View style={styles.timePickerSection}>
        <View style={styles.timePickerHeader}>
          <Ionicons name="alarm" size={24} color="#e95a0c" />
          <Text style={styles.timePickerSectionTitle}>Hora de Inicio del Evento <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
        </View>
        <TimePicker
          value={fechaHoraSeleccionada}
          onChange={handleClockTimeChange}
        />
      </View>

      <View style={styles.mainContainer}>
        {width > 768 && (
          <View style={styles.calendarColumn}>
            <View style={styles.calendarSection}>
              <GoogleStyleCalendarView
                fechaHoraSeleccionada={fechaHoraSeleccionada}
                setFechaHoraSeleccionada={setFechaHoraSeleccionada}
                eventos={eventos}
                title="Fecha de Realización"
                onDateWarning={(dias) => {
                  const mensaje = dias <= 0
                    ? 'No puedes crear eventos en fechas pasadas.'
                    : `⚠️ Recuerda: el evento debe crearse con mínimo 2 semanas (14 días) de anticipación.\nFaltan solo ${dias} día(s).`;
                  if (Platform.OS === 'web') {
                    window.alert(mensaje);
                  } else {
                    Alert.alert('Anticipación requerida', mensaje, [{ text: 'Entendido' }]);
                  }
                }}
              />
              <EventosDelDiaMejorado
                eventosDelDia={eventosDelDia}
                fechaHoraSeleccionada={fechaHoraSeleccionada}
                verificarConflictoHorario={verificarConflictoHorario}
              />
            </View>
          </View>
        )}
        <ScrollView
          ref={scrollViewRef}
          style={styles.formColumn}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>I. DATOS GENERALES</Text>
              <Text style={styles.requiredNote}>
              Los campos marcados con <Text style={styles.requiredAsterisk}>*</Text> son obligatorios
            </Text>
             
            <View style={[styles.inputGroup, errors.nombreevento && styles.inputError]}>
              <Ionicons name="text-outline" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={nombreevento}
                onChangeText={(text) => handleInputChange('nombreevento', text)}
                placeholder="Nombre del evento"
              />
            </View>
            {errors.nombreevento && <Text style={styles.errorText}>{errors.nombreevento}</Text>}
           <Text style={styles.label}>
              Clasificación Estratégica<Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.inputGroup, errors.clasificacionSeleccionada && styles.inputError]}
              onPress={() => setShowClasificacionModal(true)}
            >
              <Ionicons name="options-outline" size={20} style={styles.inputIcon} />
              <Text style={styles.input}>
                {clasificacionSeleccionada
                  ? CLASIFICACION_ESTRATEGICA[clasificacionSeleccionada]?.label || 'Selecciona una categoría'
                  : 'Selecciona una categoría'}
              </Text>
            </TouchableOpacity>
            {errors.clasificacionSeleccionada && <Text style={styles.errorText}>{errors.clasificacionSeleccionada}</Text>}
            {clasificacionSeleccionada && CLASIFICACION_ESTRATEGICA[clasificacionSeleccionada]?.subcategorias && (
              <>
               <Text style={styles.label}>
                Subcategoría<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
                <TouchableOpacity
                  style={[styles.inputGroup, errors.subcategoriaSeleccionada && styles.inputError]}
                  onPress={() => setShowSubcategoriaModal(true)}
                >
                  <Ionicons name="list-outline" size={20} style={styles.inputIcon} />
                  <Text style={styles.input}>
                    {subcategoriaSeleccionada
                      ? CLASIFICACION_ESTRATEGICA[clasificacionSeleccionada].subcategorias.find(s => s.id === subcategoriaSeleccionada)?.label || 'Selecciona una subcategoría'
                      : 'Selecciona una subcategoría'}
                  </Text>
                </TouchableOpacity>
                {errors.subcategoriaSeleccionada && <Text style={styles.errorText}>{errors.subcategoriaSeleccionada}</Text>}
              </>
            )}
            <Text style={styles.label}>
              Lugar del Evento<Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.inputGroup, errors.lugarevento && styles.inputError]}
              onPress={() => { setCampusSeleccionado(null); setShowLugarModal(true); }}
            >
              <Ionicons name="location-outline" size={20} style={styles.inputIcon} />
              <Text style={styles.input}>
                {lugarevento ? lugarevento : 'Selecciona un lugar para el evento'}
              </Text>
            </TouchableOpacity>
            {errors.lugarevento && <Text style={styles.errorText}>{errors.lugarevento}</Text>}
            {width <= 768 && (
              <>
                <Text style={styles.label}>Fecha de Realización<Text style={styles.requiredAsterisk}>*</Text></Text>
                <GoogleStyleCalendarView
                  fechaHoraSeleccionada={fechaHoraSeleccionada}
                  setFechaHoraSeleccionada={setFechaHoraSeleccionada}
                  eventos={eventos}
                  title="Fecha de Realización"
                  onDateWarning={(dias) => {
                    const mensaje = dias <= 0 
                      ? 'No puedes crear eventos en fechas pasadas.'
                      : `⚠️ Recuerda: el evento debe crearse con mínimo 2 semanas (14 días) de anticipación.\n\nFaltan solo ${dias} día(s) para la fecha seleccionada.`;
                    
                    if (Platform.OS === 'web') {
                      window.alert(mensaje);
                    } else {
                      Alert.alert('Anticipación requerida', mensaje, [{ text: 'Entendido' }]);
                    }
                  }}
                />
                <EventosDelDiaMejorado
                  eventosDelDia={eventosDelDia}
                  fechaHoraSeleccionada={fechaHoraSeleccionada}
                  verificarConflictoHorario={verificarConflictoHorario}
                />
              </>
            )}
            <Text style={styles.label}>
              Tipo de Evento (puede seleccionar más de un tipo)<Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            {TIPOS_DE_EVENTO.map((item) => (
              <TouchableOpacity key={item.id} style={styles.checkboxRow} onPress={() => handleTipoEventoChange(item.id)}>
                <Ionicons name={tiposSeleccionados[item.id] ? "checkbox" : "square-outline"} size={24} color={tiposSeleccionados[item.id] ? "#e95a0c" : "#888"} />
                <Text style={styles.checkboxLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {errors.tipos && <Text style={styles.errorText}>{errors.tipos}</Text>}
            {tiposSeleccionados['5'] && (
              <View style={styles.otroInputContainer}>
                <TextInput style={styles.input} value={textoOtroTipo} onChangeText={setTextoOtroTipo} placeholder="¿Cuál?" />
              </View>
            )}
            <TouchableOpacity style={styles.gotoButton} onPress={scrollToObjetivos}>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              <Text style={styles.gotoButtonText}>Ir a Objetivos</Text>
            </TouchableOpacity>
          </View>

          {seccionObjetivosVisible && (
            <View
              style={[styles.formSection, isScrollingToObjetivos && styles.formSectionHighlighted]}
              ref={objetivosSectionRef}
              onLayout={(event) => { const { y } = event.nativeEvent.layout; setObjetivosSectionY(y); }}
            >
              <Text style={styles.sectionTitle}>II. OBJETIVOS</Text>
              <Text style={styles.label}>
                Objetivos de Evento (puede seleccionar más de un objetivo):<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.checkboxContainer}>
                <View style={styles.checkboxColumn}>
                  {[
                    { key: 'modeloPedagogico', label: 'Modelo Pedagógico' },
                    { key: 'posicionamiento', label: 'Posicionamiento' },
                    { key: 'internacionalizacion', label: 'Internacionalización' }
                  ].map((item) => (
                    <TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setObjetivos, item.key)}>
                      <Ionicons name={objetivos[item.key] ? "checkbox" : "square-outline"} size={24} color={objetivos[item.key] ? "#e95a0c" : "#888"} />
                      <Text style={styles.checkboxLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.checkboxColumn}>
                  {[
                    { key: 'rsu', label: 'RSU' },
                    { key: 'fidelizacion', label: 'Fidelización' },
                    { key: 'otro', label: 'Otro' }
                  ].map((item) => (
                    <TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setObjetivos, item.key)}>
                      <Ionicons name={objetivos[item.key] ? "checkbox" : "square-outline"} size={24} color={objetivos[item.key] ? "#e95a0c" : "#888"} />
                      <Text style={styles.checkboxLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {errors.objetivos && <Text style={styles.errorText}>{errors.objetivos}</Text>}
              {objetivos.otro && (
                <View style={styles.otroInputContainer}>
                  <TextInput style={styles.input} value={objetivos.otroTexto} onChangeText={(text) => handleOtroTextChange(setObjetivos, text)} placeholder="¿Cuál?" />
                  {objetivos.otroTexto.trim() && <Text style={styles.selectedText}>Selección: {objetivos.otroTexto}</Text>}
                </View>
              )}
              <Text style={styles.label}>
                Objetivo(s) del PDI Asociado(s):<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.objetivosPDIGrid}>
                {objetivosPDI.map((objetivo, index) => (
                  <View key={index} style={[styles.objetivoPDIRow, styles.objetivoPDIColumn]}>
                    <Text style={styles.objetivoPDINumber}>{index + 1}.</Text>
                    <TextInput
                      style={styles.objetivoPDIInput}
                      value={objetivo}
                      onChangeText={(text) => handleObjetivoPDIChange(index, text)}
                      placeholder={`Objetivo ${index + 1}`}
                      multiline
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.label}>
                Definición del Segmento Objetivo (puede seleccionar más de un público):<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.checkboxContainer}>
                <View style={styles.checkboxColumn}>
                  {[
                    { key: 'estudiantes', label: 'Estudiantes' },
                    { key: 'docentes', label: 'Docentes' }
                  ].map((item) => (
                    <TouchableOpacity key={item.key} style={styles.checkboxRow} 
                    onPress={() => {
                      handleCheckboxChange(setSegmentoObjetivo, item.key);
                      if (item.key === 'estudiantes' && segmentoObjetivo.estudiantes) {
                        setFacultadSeleccionada(null);
                      }
                    }
                    }>
                      <Ionicons name={segmentoObjetivo[item.key] ? "checkbox" : "square-outline"} size={24} color={segmentoObjetivo[item.key] ? "#e95a0c" : "#888"} />
                      <Text style={styles.checkboxLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
        

        {segmentoObjetivo.publicoExterno && (
          <View style={styles.facultadSelectorContainer}>
            <Text style={styles.facultadSelectedHint}>
              🌐 Al ser público externo, el evento será visible para todos 
            </Text>
          </View>
        )}
                <View style={styles.checkboxColumn}>
                  {[
                    { key: 'publicoExterno', label: 'Público Externo' },
                    { key: 'influencers', label: 'Influencers' },
                    { key: 'otro', label: 'Otro' }
                  ].map((item) => (
                    <TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setSegmentoObjetivo, item.key)}>
                      <Ionicons name={segmentoObjetivo[item.key] ? "checkbox" : "square-outline"} size={24} color={segmentoObjetivo[item.key] ? "#e95a0c" : "#888"} />
                      <Text style={styles.checkboxLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {segmentoObjetivo.otro && (
                <View style={styles.otroInputContainer}>
                  <TextInput style={styles.input} value={segmentoObjetivo.otroTexto} onChangeText={(text) => handleOtroTextChange(setSegmentoObjetivo, text)} placeholder="¿Cuál?" />
                  {segmentoObjetivo.otroTexto.trim() && <Text style={styles.selectedText}>Selección: {segmentoObjetivo.otroTexto}</Text>}
                </View>
              )}
              <Text style={styles.label}>
                Argumentación:<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[styles.inputGroup, { alignItems: 'flex-start' }, errors.argumentacion && styles.inputError]}>
                <Ionicons name="text-outline" size={20} style={[styles.inputIcon, { paddingTop: 14 }]} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  placeholder="Breve descripción sustentada de la congruencia del evento con los objetivos especificados"
                  value={argumentacion}
                  onChangeText={setArgumentacion}
                />
              </View>
              {errors.argumentacion && <Text style={styles.errorText}>{errors.argumentacion}</Text>}
              <TouchableOpacity style={styles.gotoButton} onPress={scrollToResultados}>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                <Text style={styles.gotoButtonText}>Ir a Resultados Esperados y Comite</Text>
              </TouchableOpacity>
            </View>
          )}

          {seccionResultadosVisible && (
            <>
              <View style={[styles.formSection, isScrollingToResultados && styles.formSectionHighlighted]} ref={resultadosSectionRef}>
                <Text style={styles.sectionTitle}>III. RESULTADOS ESPERADOS</Text>
                <View style={styles.resultadoRow}>
                  <Text style={styles.resultadoLabel}>Participación Efectiva<Text style={styles.requiredAsterisk}>*</Text></Text>
                  <TextInput style={styles.resultadoInput} placeholder="Ej: 150" value={resultadosEsperados.participacion} onChangeText={(text) => handleResultadoChange('participacion', text)} keyboardType="numeric" />
                </View>
                <View style={styles.resultadoRow}>
                  <Text style={styles.resultadoLabel}>Índice de Satisfacción<Text style={styles.requiredAsterisk}>*</Text></Text>
                  <TextInput style={styles.resultadoInput} placeholder="Ej: 90% de satisfacción" value={resultadosEsperados.satisfaccion} onChangeText={(text) => handleResultadoChange('satisfaccion', text)} />
                </View>
                <View style={styles.resultadoRow}>
                  <Text style={styles.resultadoLabel}>Otro<Text style={styles.requiredAsterisk}>*</Text></Text>
                  <TextInput style={styles.resultadoInput} placeholder="Otro resultado medible" value={resultadosEsperados.otro} onChangeText={(text) => handleResultadoChange('otro', text)} />
                </View>
              </View>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>IV. COMITÉ DEL EVENTO</Text>
                <Text style={styles.comiteDescription}>Selecciona a los miembros del comité del evento:<Text style={styles.requiredAsterisk}>*</Text></Text>
                
                {comiteLoading ? (
                  <View style={styles.comiteLoadingContainer}>
                    <ActivityIndicator size="large" color="#e95a0c" />
                    <Text style={styles.comiteLoadingText}>Cargando miembros del comité...</Text>
                  </View>
                ) : comiteError ? (
                  <View style={styles.comiteErrorContainer}>
                    <Ionicons name="alert-circle" size={50} color="#ff4444" />
                    <Text style={styles.comiteErrorTitle}>Error al cargar usuarios</Text>
                    <Text style={styles.comiteErrorMessage}>{comiteErrorMessage}</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setComiteError(false);
                        setComiteErrorMessage('');
                        fetchUsuariosComite();
                      }} 
                      style={styles.comiteRetryButton}
                    >
                      <Ionicons name="refresh" size={18} color="#fff" />
                      <Text style={styles.comiteRetryButtonText}>Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                ) : usuariosComite.length > 0 ? (
                  <View style={styles.comiteList}>
                    {usuariosComite
                    .filter(usuario => usuario.id !== userIdActual)
                    .map(usuario => (
                      <TouchableOpacity
                        key={usuario.id}
                        style={styles.checkboxRow}
                        onPress={() => {
                          if (comiteSeleccionado.includes(usuario.id)) {
                            setComiteSeleccionado(prev => prev.filter(id => id !== usuario.id));
                          } else {
                            setComiteSeleccionado(prev => [...prev, usuario.id]);
                          }
                        }}
                      >
                        <Ionicons name={comiteSeleccionado.includes(usuario.id) ? "checkbox" : "square-outline"} size={24} color={comiteSeleccionado.includes(usuario.id) ? "#e95a0c" : "#888"} />
                        <View style={styles.comiteUserText}>
                          <Text style={styles.checkboxLabel}>{usuario.nombreCompleto}</Text>
                         <Text style={[styles.comiteUserRole, { fontSize: 12, color: '#666', fontStyle: 'italic' }]}>
                          {usuario.role === 'academico'
                          ? `Académico - ${usuario.facultad || 'Sin facultad'}`
                          : usuario.role.charAt(0).toUpperCase() + usuario.role.slice(1)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.comiteEmptyContainer}>
                    <Ionicons name="people" size={40} color="#ccc" />
                    <Text style={styles.comitePlaceholder}>No hay usuarios disponibles para el comité.</Text>
                  </View>
                )}
                
                <TouchableOpacity style={styles.gotoButton} onPress={scrollToRecursos}>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  <Text style={styles.gotoButtonText}>Ir a Recursos Necesarios</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {seccionRecursosVisible && (
          <View style={[styles.formSection, isScrollingToRecursos && styles.formSectionHighlighted]} ref={recursosSectionRef}>
            <Text style={styles.sectionTitle}>V. RECURSOS NECESARIOS</Text>
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Recursos Disponibles<Text style={styles.requiredAsterisk}>*</Text></Text>
              <Text style={styles.subsectionDescription}>Selecciona los recursos existentes que necesitarás para tu evento:</Text>
              {recursosDisponibles.length > 0 ? (
                <View style={styles.recursosDisponiblesGrid}>
                  {recursosDisponibles.map((recurso) => {
                    const idString = String(recurso.idrecurso);
                    const cantidadSeleccionada = recursosSeleccionadosCount[idString] || 0;
                    const cantidadDisponible = getCantidadDisponible(recurso);
                    const isSelected = cantidadSeleccionada > 0;
                    const canSelect = puedeSeleccionarRecurso(recurso);
                    
                    return (
                      <TouchableOpacity
                        key={idString}
                        style={[
                          styles.recursoDisponibleCard,
                          isSelected && styles.recursoDisponibleCardSelected,
                          !canSelect && styles.recursoDisponibleCardDisabled
                        ]}
                        onPress={() => canSelect && handleRecursoChange(recurso.idrecurso, recurso)}
                        disabled={!canSelect}
                      >
                        <View style={styles.recursoCheckboxContainer}>
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={24}
                            color={isSelected ? "#e95a0c" : !canSelect ? "#ccc" : "#888"}
                          />
                        </View>
                        <View style={styles.recursoInfo}>
                          <Text style={styles.recursoNombre}>{recurso.nombre_recurso}</Text>
                          <Text style={styles.recursoTipo}>
                            {recurso.recurso_tipo === 'tecnologico' ? 'Tecnológico' :
                            recurso.recurso_tipo === 'mobiliario' ? 'Mobiliario' : 'Vajilla'}
                          </Text>
                          <Text style={[
                            styles.recursoCantidad,
                            { color: cantidadDisponible <= 2 ? '#e74c3c' : '#27ae60' }
                          ]}>
                            Disponibles: {cantidadDisponible}
                            {cantidadSeleccionada > 0 && ` (Seleccionadas: ${cantidadSeleccionada})`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noRecursosText}> No hay recursos disponibles en este momento.</Text>
              )}
            </View>
            <TouchableOpacity style={styles.gotoButton} onPress={scrollToPresupuesto}>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              <Text style={styles.gotoButtonText}>Ir a Presupuesto</Text>
            </TouchableOpacity>
          </View>
          )}

          {seccionPresupuestoVisible && (
            <View style={[styles.formSection, isScrollingToPresupuesto && styles.formSectionHighlighted]} ref={presupuestoSectionRef}>
              <Text style={styles.sectionTitle}>VI. PRESUPUESTO<Text style={styles.requiredAsterisk}>*</Text></Text>
              <TablaPresupuesto titulo="EGRESOS" items={egresos} setItems={setEgresos} totalGeneral={totalEgresos} handlePresupuestoChange={handlePresupuestoChange} eliminarFilaPresupuesto={eliminarFilaPresupuesto} agregarFilaPresupuesto={agregarFilaPresupuesto} />
              <TablaPresupuesto titulo="INGRESOS" items={ingresos} setItems={setIngresos} totalGeneral={totalIngresos} handlePresupuestoChange={handlePresupuestoChange} eliminarFilaPresupuesto={eliminarFilaPresupuesto} agregarFilaPresupuesto={agregarFilaPresupuesto} />
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceText}>BALANCE ECONÓMICO</Text>
                <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#27ae60' : '#c0392b' }]}>{formatCurrency(balance)}</Text>
              </View>
            </View>
          )}

          <Modal visible={showClasificacionModal} transparent animationType="fade" onRequestClose={() => setShowClasificacionModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecciona Clasificación</Text>
                <ScrollView>
                  {Object.entries(CLASIFICACION_ESTRATEGICA).map(([id, data]) => (
                    <TouchableOpacity key={id} style={styles.modalOption} onPress={() => { setClasificacionSeleccionada(id); setSubcategoriaSeleccionada(''); setShowClasificacionModal(false); }}>
                      <Text style={styles.modalOptionText}>{data.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowClasificacionModal(false)}>
                  <Text style={styles.modalButtonSecondaryText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={showSubcategoriaModal} transparent animationType="fade" onRequestClose={() => setShowSubcategoriaModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecciona Subcategoría</Text>
                <ScrollView>
                  {CLASIFICACION_ESTRATEGICA[clasificacionSeleccionada]?.subcategorias.map((sub) => (
                    <TouchableOpacity key={sub.id} style={styles.modalOption} onPress={() => { setSubcategoriaSeleccionada(sub.id); setShowSubcategoriaModal(false); }}>
                      <Text style={styles.modalOptionText}>{sub.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowSubcategoriaModal(false)}>
                  <Text style={styles.modalButtonSecondaryText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={showLugarModal} transparent animationType="fade" onRequestClose={() => setShowLugarModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {campusSeleccionado ? `Selecciona un área en ${LUGARES_CON_AREAS[campusSeleccionado].label}` : 'Selecciona un campus'}
                </Text>
                <ScrollView>
                  {campusSeleccionado ? (
                    LUGARES_CON_AREAS[campusSeleccionado].areas.map((area) => (
                      <TouchableOpacity key={area.id} style={styles.modalOption} onPress={() => { setLugarevento(area.nombre); setShowLugarModal(false); setCampusSeleccionado(null); }}>
                        <Text style={styles.modalOptionText}>{area.nombre}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    Object.entries(LUGARES_CON_AREAS).map(([key, data]) => (
                      <TouchableOpacity key={key} style={styles.modalOption} onPress={() => setCampusSeleccionado(key)}>
                        <Text style={styles.modalOptionText}>{data.label}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                {campusSeleccionado && (
                  <TouchableOpacity style={[styles.modalButtonSecondary, { marginTop: 10 }]} onPress={() => setCampusSeleccionado(null)}>
                    <Text style={styles.modalButtonSecondaryText}>← Volver a campus</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowLugarModal(false)}>
                  <Text style={styles.modalButtonSecondaryText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Modal visible={showFacultadModal} transparent animationType="fade" onRequestClose={() => setShowFacultadModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Ionicons name="school" size={28} color="#e95a0c" />
                  <Text style={styles.modalTitle}>Selecciona la Facultad</Text>
                </View>
                <Text style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>
                  ¿A qué facultad está dirigido este evento?
                </Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {facultades.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                      Cargando facultades...
                    </Text>
                  ) : (
                    facultades.map((fac) => (
                      <TouchableOpacity
                        key={fac.facultad_id}
                        style={[
                          styles.modalOption,
                          facultadSeleccionada === fac.facultad_id && { 
                            backgroundColor: '#fff5f0', 
                            borderLeftWidth: 4, 
                            borderLeftColor: '#e95a0c' 
                          }
                        ]}
                        onPress={() => {
                          setFacultadSeleccionada(fac.facultad_id);
                          setShowFacultadModal(false);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons 
                            name={facultadSeleccionada === fac.facultad_id ? "radio-button-on" : "radio-button-off"} 
                            size={20} 
                            color={facultadSeleccionada === fac.facultad_id ? "#e95a0c" : "#888"} 
                          />
                          <Text style={[
                            styles.modalOptionText,
                            facultadSeleccionada === fac.facultad_id && { color: '#e95a0c', fontWeight: '600' }
                          ]}>
                            {fac.nombre_facultad}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                  {facultadSeleccionada && (
                    <TouchableOpacity 
                      style={[styles.modalButtonSecondary, { flex: 1 }]} 
                      onPress={() => {
                        setFacultadSeleccionada(null);
                        setShowFacultadModal(false);
                      }}
                    >
                      <Text style={styles.modalButtonSecondaryText}>Quitar selección</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.modalButtonSecondary, { flex: 1 }]} 
                    onPress={() => setShowFacultadModal(false)}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </View>

      <View style={styles.fixedBottomContainer}>
        <TouchableOpacity onPress={confirmSubmit} disabled={isLoading} style={[styles.floatingActionButton, isLoading && styles.buttonDisabled]}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Crear</Text>}
        </TouchableOpacity>
      </View>

      <ConfirmModal showConfirmModal={showConfirmModal} setShowConfirmModal={setShowConfirmModal} handleSubmitConfirmed={handleSubmitConfirmed} isLoading={isLoading} formData={{ nombreevento, lugarevento, nombreResponsable, fechaHoraSeleccionada }} />
      <NotificationsModal visible={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} notifications={notifications} markAsRead={markNotificationAsRead} />
      <ConflictModal showConflictModal={showConflictModal} setShowConflictModal={setShowConflictModal} conflictoDetectado={conflictoDetectado} setConflictoDetectado={setConflictoDetectado} />
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  horaInicioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 100,
    elevation: 10,
  },
  horaInicioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  timePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f0',
    borderWidth: 2,
    borderColor: '#e95a0c',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#e95a0c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 130,
  },
  timePickerTriggerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e95a0c',
    letterSpacing: 1,
    marginHorizontal: 4,
  },
  timePickerSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  timePickerSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  timePickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  timePickerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  closeButton: {
    padding: 4,
  },
  drumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  drumContainer: {
    alignItems: 'center',
  },
  drumLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  drum: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e95a0c',
    overflow: 'hidden',
    width: 90,
  },
  drumBtn: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  drumInput: {
    fontSize: 42,
    fontWeight: '700',
    color: '#e95a0c',
    paddingVertical: 8,
    textAlign: 'center',
    width: '100%',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    outlineStyle: 'none',
  },
  drumColon: {
    fontSize: 42,
    fontWeight: '700',
    color: '#e95a0c',
    marginTop: 28,
  },
  quickTimesContainer: {
    marginBottom: 20,
  },
  quickTimesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '600',
  },
  quickTimesScroll: {
    maxHeight: 50,
  },
  quickTimesContent: {
    gap: 10,
    paddingHorizontal: 4,
  },
  quickTimeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  quickTimeBtnActive: {
    backgroundColor: '#e95a0c',
    borderColor: '#e95a0c',
  },
  quickTimeBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  quickTimeBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  timePickerApply: {
    backgroundColor: '#e95a0c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#e95a0c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  timePickerApplyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  comiteLoadingContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginTop: 10,
  },
  comiteLoadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  comiteErrorContainer: {
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  comiteErrorTitle: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
  },
  comiteErrorMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 15,
  },
  comiteRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e95a0c',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  comiteRetryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  comiteEmptyContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginTop: 10,
  },
  timePickerModalCentered: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  mobilePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dateTimePicker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 180 : 'auto',
  },
  doneButton: {
    backgroundColor: '#e95a0c',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gotoButton: {
    backgroundColor: '#e95a0c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  gotoButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
 visibilidadContainer: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 10,
},
visibilidadOption: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: '#e0e0e0',
  backgroundColor: '#f8f9fa',
  gap: 8,
},
visibilidadOptionActive: {
  backgroundColor: '#e95a0c',
  borderColor: '#e95a0c',
  shadowColor: '#e95a0c',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 3,
},
visibilidadText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#666',
},
visibilidadTextActive: {
  color: '#ffffff',
},
recursoDisponibleCardDisabled: {
  backgroundColor: '#f0f0f0',
  borderColor: '#ddd',
  opacity: 0.6,
},
visibilidadHint: {
  fontSize: 12,
  color: '#666',
  fontStyle: 'italic',
  marginBottom: 15,
  paddingHorizontal: 4,
},
facultadSelectorContainer: {
  marginTop: 12,
  marginBottom: 12,
  padding: 16,
  backgroundColor: '#fff5f0',
  borderRadius: 12,
  borderLeftWidth: 4,
  borderLeftColor: '#e95a0c',
  shadowColor: '#e95a0c',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
},
facultadSelectorHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
  gap: 6,
},
facultadSelectorLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#555',
  flex: 1,
},
facultadSelectorButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#e95a0c',
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 14,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
},
facultadSelectorButtonContent: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  marginRight: 10,
  gap: 10,
},
facultadSelectorText: {
  flex: 1,
  fontSize: 14,
  color: '#333',
  fontWeight: '500',
},
facultadSelectedHintContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 10,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: 'rgba(233, 90, 12, 0.2)',
  gap: 6,
},
facultadSelectedHint: {
  fontSize: 13,
  color: '#27ae60',
  fontStyle: 'italic',
  flex: 1,
  lineHeight: 18,
},
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  mainContainer: {
    flex: 1,
    flexDirection: width > 768 ? 'row' : 'column',
    paddingHorizontal: 20,
  },
  calendarColumn: {
    marginTop: 10,
    width: width > 768 ? '30%' : '100%',
    marginRight: width > 768 ? 20 : 0,
    marginBottom: width <= 768 ? 20 : 0,
  },
  formColumn: {
    marginTop: 10,
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContentContainer: { paddingBottom: 60 },
  calendarSection: { marginBottom: 20 },
  notificationMessage: { fontSize: 13, color: '#666', marginBottom: 5, lineHeight: 18 },
  checkboxContainer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  formSectionHighlighted: {
    backgroundColor: '#fff5f0',
    borderColor: '#e95a0c',
    borderWidth: 2,
    shadowColor: '#e95a0c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  checkboxColumn: { flex: 1, marginRight: 10 },
  recursosDisponiblesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  recursoDisponibleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '48%',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recursoDisponibleCardSelected: { backgroundColor: '#fff5f0', borderColor: '#e95a0c', borderWidth: 2 },
  recursoCheckboxContainer: { marginRight: 10 },
  recursoInfo: { flex: 1 },
  recursoNombre: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  recursoTipo: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 2 },
  recursoCantidad: { fontSize: 12, color: '#27ae60', fontWeight: '500' },
  noRecursosText: { fontStyle: 'italic', color: '#999', textAlign: 'center', marginTop: 10, fontSize: 14, paddingVertical: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkboxLabel: { marginLeft: 8, fontSize: 15, color: '#333' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  notificationBell: { position: 'relative', padding: 8, borderRadius: 20, backgroundColor: '#f8f9fa' },
  notificationBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#ff4444', borderRadius: 10,
    minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#ffffff',
  },
  notificationBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  calendarTitleContainer: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  calendarTitle: { fontSize: 16, fontWeight: 'bold', color: '#e95a0c', textAlign: 'left' },
  notificationsModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  notificationsModalContent: {
    backgroundColor: 'white', borderRadius: 16, padding: 20,
    width: '90%', maxWidth: 500, maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 10,
  },
  comiteList: { marginTop: 10 },
  comiteUserText: { marginLeft: 10 },
  comiteUserRole: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 2, fontStyle: 'italic' },
  comitePlaceholder: { fontStyle: 'italic', color: '#999', textAlign: 'center', marginTop: 10 },
  notificationsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  notificationsModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  notificationsList: { flex: 1 },
  noNotificationsText: { textAlign: 'center', color: '#666', marginTop: 50, fontSize: 16, fontStyle: 'italic' },
  notificationItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 15, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    borderRadius: 8, marginBottom: 5, backgroundColor: '#ffffff',
  },
  notificationItemUnread: {
    backgroundColor: '#f8f9ff', borderLeftWidth: 4, borderLeftColor: '#e95a0c',
    shadowColor: '#e95a0c', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  objetivoPDIRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  objetivoPDINumber: { fontSize: 16, color: '#333', marginRight: 10, marginTop: 12, fontWeight: '500' },
  objetivoPDIInput: {
    flex: 1, backgroundColor: '#F4F7F9',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    fontSize: 16, color: '#333', textAlignVertical: 'top',
    minHeight: 50, maxHeight: 100,
  },
  notificationIconContainer: { position: 'relative', marginRight: 15, paddingTop: 2 },
  notificationIcon: { marginRight: 0 },
  unreadDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4444' },
  notificationContentContainer: { flex: 1 },
  notificationText: { fontSize: 14, color: '#333', marginBottom: 5, lineHeight: 20 },
  notificationTextUnread: { fontWeight: '600' },
  notificationTime: { fontSize: 12, color: '#666', marginBottom: 8 },
  confirmModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  objetivosPDIGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  objetivoPDIColumn: { width: '48%', marginBottom: 10 },
  confirmModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2d3748', marginLeft: 12 },
  confirmModalMessage: { fontSize: 16, color: '#4a5568', marginBottom: 20, lineHeight: 22, textAlign: 'center' },
  confirmModalDetails: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 24 },
  confirmModalDetailTitle: { fontSize: 16, fontWeight: '600', color: '#2d3748', marginBottom: 12 },
  confirmModalDetail: { fontSize: 14, color: '#4a5568', marginBottom: 8, lineHeight: 20 },
  detailLabel: { fontWeight: '600', color: '#2d3748' },
  confirmModalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  confirmModalButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmModalButtonCancel: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e0e0e0' },
  confirmModalButtonConfirm: { backgroundColor: '#e95a0c' },
  confirmModalButtonTextCancel: { fontSize: 16, fontWeight: '600', color: '#4a5568' },
  confirmModalButtonTextConfirm: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  keyboardAvoidingContainer: { flex: 1, backgroundColor: '#F4F7F9' },
  formSection: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5,
    paddingHorizontal: isMobile ? 15 : 20,
    paddingTop: isMobile ? 15 : 20,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#e95a0c',
    marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
    paddingBottom: 8, textAlign: 'left', backgroundColor: '#f8f9fa',
    marginHorizontal: -20, marginTop: -12, paddingTop: 12, paddingHorizontal: 20,
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
  },
  label: { fontSize: 14, color: '#555', marginBottom: 8, fontWeight: '500' },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, marginBottom: 18,
  },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', marginLeft: 10, marginBottom: 10, fontSize: 12 },
  inputIcon: { paddingHorizontal: 12, color: '#888' },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 10, paddingRight: 15, fontSize: 16, color: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 15 },
  datePickerText: { fontSize: 16, color: '#333' },
  otroInputContainer: { marginLeft: 36, marginTop: 5, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#F8F9FA' },
  resultadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  resultadoLabel: { fontSize: 16, color: '#333', flex: 1 },
  resultadoInput: { flex: 2, backgroundColor: '#F4F7F9', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, color: '#333' },
  comiteDescription: { fontSize: 14, color: '#666', lineHeight: 20, textAlign: 'justify' },
  tablaContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 25, padding: 5 },
  tablaTitulo: { textAlign: 'center', fontWeight: 'bold', padding: 8, backgroundColor: '#f0f0f0', borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  tablaHeader: { flexDirection: 'row', backgroundColor: '#e0e0e0', paddingHorizontal: 5, paddingVertical: 8 },
  headerText: { fontWeight: 'bold', fontSize: 12 },
  tablaRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 2 },
  rowText: { paddingHorizontal: 5, fontSize: 12 },
  rowInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 4, margin: 2, fontSize: 12, backgroundColor: '#fff' },
  deleteButtonSmall: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  addButtonSmall: { padding: 8 },
  addButtonTextSmall: { color: '#007BFF', textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, backgroundColor: '#f0f0f0', borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
  totalText: { fontWeight: 'bold', marginRight: 20 },
  totalAmount: { fontWeight: 'bold' },
  balanceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0e0e0', padding: 12, borderRadius: 8, marginTop: 10 },
  balanceText: { fontWeight: 'bold', fontSize: 16 },
  balanceAmount: { fontWeight: 'bold', fontSize: 16 },
  floatingActionButton: {
    position: 'absolute', right: 20, bottom: 20,
    backgroundColor: '#e95a0c', width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  fixedBottomContainer: { position: 'relative', height: 80 },
  buttonDisabled: { backgroundColor: '#f9bda3' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  subsection: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5,
  },
  subsectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subsectionDescription: { fontSize: 13, color: '#666', marginBottom: 15, lineHeight: 18 },
  googleCalendarContainer: {
    backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, overflow: 'hidden',
  },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  navButton: { padding: 8, borderRadius: 20, backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  monthYearText: { fontSize: 18, fontWeight: 'bold', color: '#333', letterSpacing: 1 },
  weekDaysHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  weekDayCell: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  weekDayText: { fontSize: 13, fontWeight: '600', color: '#666' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#ffffff' },
  dayCell: { width: '14.28%', minHeight: 80, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#e8e8e8', paddingTop: 8, paddingHorizontal: 4 },
  dayCellInactive: { backgroundColor: '#f8f9fa' },
  dayCellSelected: { backgroundColor: '#fff5f0', borderColor: '#e95a0c', borderWidth: 2, borderRadius: 6, margin: -1 },
  dayCellToday: { backgroundColor: '#e8f4fd' },
  dayCellContent: { flex: 1, alignItems: 'center' },
  dayNumber: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 4 },
  dayNumberInactive: { color: '#999' },
  dayNumberSelected: { color: '#e95a0c', fontWeight: 'bold', fontSize: 18 },
  dayNumberToday: { backgroundColor: '#2196f3', color: 'white', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  eventIndicators: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  eventDot: { width: 6, height: 6, borderRadius: 3, marginRight: 2 },
  eventCount: { fontSize: 10, color: '#666', fontWeight: '500' },
  eventPreview: { marginTop: 4, width: '100%' },
  eventPreviewText: { fontSize: 8, color: '#333', marginBottom: 1, textAlign: 'center' },
  eventPreviewMore: { fontSize: 8, color: '#e95a0c', fontWeight: 'bold', textAlign: 'center' },
  eventosDelDiaContainer: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, overflow: 'hidden' },
  eventosDelDiaHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  eventosDelDiaTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8, flex: 1 },
  eventCountBadge: { backgroundColor: '#e95a0c', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  eventCountText: { fontSize: 12, color: '#ffffff', fontWeight: 'bold' },
  eventsList: { maxHeight: 200, paddingHorizontal: 16 },
  eventoCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  eventoCardConflict: { borderColor: '#ff6b6b', backgroundColor: '#fff5f5' },
  eventoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventoTimeContainer: { flexDirection: 'row', alignItems: 'center' },
  eventoTime: { fontSize: 14, fontWeight: '600', color: '#e95a0c', marginLeft: 4 },
  eventoTimeConflict: { color: '#ff6b6b' },
  conflictBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ff6b6b', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  conflictBadgeText: { fontSize: 10, color: '#ffffff', marginLeft: 4, fontWeight: '600' },
  eventoNombre: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  eventoDetails: { marginLeft: 4 },
  eventoDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  eventoDetailText: { fontSize: 12, color: '#666', marginLeft: 4 },
  eventosDelDiaFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#f8f9fa' },
  eventosDelDiaNote: { fontSize: 12, color: '#666', textAlign: 'center', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  modalOption: { paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalOptionText: { fontSize: 15, color: '#333' },
  modalMessage: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
  conflictEventCard: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  conflictEventTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  conflictEventDetails: { fontSize: 14, color: '#666', marginBottom: 4 },
  conflictEventResponsible: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  modalWarning: { fontSize: 12, color: '#ff6b6b', marginBottom: 16, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButtonSecondary: { backgroundColor: '#f0f0f0', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' },
  modalButtonSecondaryText: { fontSize: 14, color: '#333', fontWeight: '600' },
  modalButtonPrimary: { backgroundColor: '#e95a0c', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, flex: 1, alignItems: 'center' },
  modalButtonPrimaryText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  selectedText: { fontSize: 14, color: '#e95a0c', marginTop: 5, marginLeft: 10 },
   customTimePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  customTimePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f5f5f5',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTimePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  timeDisplay: {
    backgroundColor: '#fff5f0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e95a0c',
  },
  timeDisplayText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#e95a0c',
    letterSpacing: 2,
  },
  pickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
    height: 200,
  },
  selectorColumn: {
    flex: 1,
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  scrollSelector: {
    maxHeight: 200,
    borderWidth: 2,
    borderColor: '#e95a0c',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOptionSelected: {
    backgroundColor: '#e95a0c',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  colonSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#e95a0c',
    marginTop: 30,
  },
  quickHoursContainer: {
    marginBottom: 20,
  },
  quickHoursLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  quickHoursScroll: {
    maxHeight: 50,
  },
  quickHourBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    marginRight: 10,
  },
  quickHourBtnActive: {
    backgroundColor: '#e95a0c',
    borderColor: '#e95a0c',
  },
  quickHourText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  quickHourTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#e95a0c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#e95a0c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  requiredAsterisk: {
  color: '#e74c3c',
  fontSize: 16,
  fontWeight: 'bold',
  marginLeft: 2,
},
requiredNote: {
  fontSize: 12,
  color: '#666',
  fontStyle: 'italic',
  marginBottom: 15,
  paddingHorizontal: 4,
},
});

export default ProyectoEvento;