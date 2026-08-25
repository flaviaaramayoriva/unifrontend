import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, Modal, 
  PanResponder, Dimensions, findNodeHandle
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
const API_BASE_URL =  'https://unibackend-production.up.railway.app';
const { width } = Dimensions.get('window');
const isMobile = width < 768;

const TIPOS_DE_EVENTO = [
  { id: '1', label: 'Curricular' },
  { id: '2', label: 'Extracurricular' },
  { id: '3', label: 'Marketing' },
  { id: '4', label: 'Internacionalización/Marketing' },
  { id: '5', label: 'Marketing/Extracurricular' }
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
    { id: '1l', label: 'Defensas de Proyecto de grado' },
    { id: '1m', label: 'Evaluaciones Integrales' },
    { id: '1n', label: 'Jornada de actualizacion estudiantil y docente' },
  ]},
  '2': { label: 'Institucionales y Ceremoniales', subcategorias: [
    { id: '2a', label: 'Actos de colacion' },
    { id: '2b', label: 'Aniversarios institucionales' },
    { id: '2c', label: 'Inauguraciones de infraestructura o programas' },
    { id: '2d', label: 'Reconocimientos y premiaciones' },
    { id: '2e', label: 'Lanzamientos oficiales institucionales' },
    { id: '2f', label: 'Firma de convenios y alianzas' },
    { id: '2g', label: 'Tertulias' },
    { id: '2h', label: 'Ceremonias protocolares' },
  ]},
  '3': { label: 'Culturales, Deportivos y Sociales', subcategorias: [
    { id: '3a', label: 'Ferias culturales y artísticas' },
    { id: '3b', label: 'Campeonatos deportivos' },
    { id: '3c', label: 'Actividades recreativas o festivas' },
    { id: '3d', label: 'Talleres de bienestar físico o mental' },
    { id: '3e', label: 'Jornadas de voluntariado interno' },
    { id: '3f', label: 'Eventos culturales' },
  ]},
  '4': { label: 'Extension Universitaria, Vinculacion Profesional y Atraccion Estudiantil', subcategorias: [
    { id: '4a', label: 'Visita de colegios' },
    { id: '4b', label: 'Visita a ferias en colegios' },
    { id: '4c', label: 'Auspicios actividades intercolegiales' },
    { id: '4d', label: 'Torneo de Padel Intercolegial' },
    { id: '4e', label: 'Ferias de innovación y emprendimiento' },
    { id: '4f', label: 'Ferias de empleabilidad' },
    { id: '4g', label: 'Hackathons, bootcamps, pitch days' },
    { id: '4h', label: 'Charlas y talleres con empresas' },
    { id: '4i', label: 'Proyectos de responsabilidad universitaria' },
    { id: '4j', label: 'Campañas solidarias' },
    { id: '4k', label: 'Voluntariados' },
    { id: '4l', label: 'Encuentros de egresados y networking' },
    { id: '4m', label: 'Lanzamientos de proyectos estratégicos o colaborativos' },
  ]},
  '5': { label: 'Internacionalizacion y Posicionamiento', subcategorias: [
    { id: '5a', label: 'Programas internacionales y de intercambio' },
    { id: '5b', label: 'Semana Nomads' },
    { id: '5c', label: 'Actividades con consulados y embajadas' },
    { id: '5d', label: 'TEDx UNIFRANZ' },
    { id: '5e', label: 'Foro Internacional de Economía Creativa' },
    { id: '5f', label: 'Cartel Bienal BICEBE' },
    { id: '5g', label: 'Eventos internacionales de visibilidad y alianzas' },
    { id: '5h', label: 'Lanzamientos estratégicos o de marca universitaria' },
  ]}
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
      { id: 'cs-6', nombre: 'Game Room' },
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

const COLORS = {
  primary: '#E95A0C',
  primaryLight: '#FFEDD5',
  secondary: '#4B5563',
  accent: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#D1D5DB',
  shadow: 'rgba(0, 0, 0, 0.05)',
  white: '#FFFFFF',
  black: '#000000',
};

const TimePicker = ({ value, onChange, editable = true }) => {
  const [open, setOpen] = useState(false);
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [inputH, setInputH] = useState('');
  const [inputM, setInputM] = useState('');
  const h = dayjs(value).hour();
  const m = dayjs(value).minute();
  const pad = (n) => String(n).padStart(2, '0');
  const apply = (newH, newM) => {
    const d = new Date(value);
    d.setHours(newH, newM, 0, 0);
    onChange(d);
  };
  const handleOpenModal = () => {
    setInputH(pad(h));
    setInputM(pad(m));
    setOpen(true);
  };
  const handleHourInput = (text) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 2);
    setInputH(clean);
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 0 && num <= 23) apply(num, m);
  };
  const handleMinuteInput = (text) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 2);
    setInputM(clean);
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 0 && num <= 59) apply(h, num);
  };

  if (!editable) {
    return (
      <View style={styles.timePickerTriggerDisabled}>
        <Ionicons name="time-outline" size={20} color="#9CA3AF" />
        <Text style={styles.timePickerTriggerTextDisabled}>{pad(h)}:{pad(m)}</Text>
        <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
      </View>
    );
  }

  if (Platform.OS !== 'web') {
    return (
      <>
        <TouchableOpacity
          onPress={() => setShowNativePicker(true)}
          style={styles.timePickerTrigger}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={20} color="#e95a0c" />
          <Text style={styles.timePickerTriggerText}>{pad(h)}:{pad(m)}</Text>
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
                  if (Platform.OS === 'ios') {
                    if (selected) onChange(selected);
                  } else {
                    setShowNativePicker(false);
                    if (selected) onChange(selected);
                  }
                }}
                style={styles.dateTimePicker}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowNativePicker(false)}
                >
                  <Text style={styles.doneButtonText}>Listo - {pad(h)}:{pad(m)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={handleOpenModal}
        style={styles.timePickerTrigger}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={20} color="#e95a0c" />
        <Text style={styles.timePickerTriggerText}>{pad(h)}:{pad(m)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlayCentered}>
          <View style={styles.timePickerModalCentered}>
            <View style={styles.timePickerModalHeader}>
              <Ionicons name="alarm" size={24} color="#e95a0c" />
              <Text style={styles.timePickerModalTitle}>Hora de Inicio</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.drumRow}>
              <View style={styles.drumContainer}>
                <Text style={styles.drumLabel}>Hora</Text>
                <View style={styles.drum}>
                  <TouchableOpacity
                    style={styles.drumBtn}
                    onPress={() => {
                      const newH = (h + 1) % 24;
                      setInputH(pad(newH));
                      apply(newH, m);
                    }}
                  >
                    <Ionicons name="chevron-up" size={24} color="#e95a0c" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.drumInput}
                    value={inputH}
                    onChangeText={handleHourInput}
                    keyboardType="numeric"
                    maxLength={2}
                    textAlign="center"
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.drumBtn}
                    onPress={() => {
                      const newH = (h + 23) % 24;
                      setInputH(pad(newH));
                      apply(newH, m);
                    }}
                  >
                    <Ionicons name="chevron-down" size={24} color="#e95a0c" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.drumColon}>:</Text>
              <View style={styles.drumContainer}>
                <Text style={styles.drumLabel}>Minutos</Text>
                <View style={styles.drum}>
                  <TouchableOpacity
                    style={styles.drumBtn}
                    onPress={() => {
                      const newM = (m + 1) % 60;
                      setInputM(pad(newM));
                      apply(h, newM);
                    }}
                  >
                    <Ionicons name="chevron-up" size={24} color="#e95a0c" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.drumInput}
                    value={inputM}
                    onChangeText={handleMinuteInput}
                    keyboardType="numeric"
                    maxLength={2}
                    textAlign="center"
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.drumBtn}
                    onPress={() => {
                      const newM = (m + 59) % 60;
                      setInputM(pad(newM));
                      apply(h, newM);
                    }}
                  >
                    <Ionicons name="chevron-down" size={24} color="#e95a0c" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.quickTimesContainer}>
              <Text style={styles.quickTimesLabel}>Horas disponibles:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickTimesScroll}
                contentContainerStyle={styles.quickTimesContent}
              >
                {QUICK_TIMES.map((qt) => (
                  <TouchableOpacity
                    key={qt}
                    style={[
                      styles.quickTimeBtn,
                      h === qt && m === 0 && styles.quickTimeBtnActive
                    ]}
                    onPress={() => {
                      setInputH(pad(qt));
                      setInputM('00');
                      apply(qt, 0);
                      setOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.quickTimeBtnText,
                      h === qt && m === 0 && styles.quickTimeBtnTextActive
                    ]}>
                      {pad(qt)}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={styles.timePickerApply}
              onPress={() => setOpen(false)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.timePickerApplyText}>
                Confirmar {pad(h)}:{pad(m)}
              </Text>
            </TouchableOpacity>
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

const parseJSONSafe = (str, fallback = []) => {
  if (!str) return fallback;
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); }
  catch { return fallback; }
};

const TablaPresupuesto = ({
  titulo, items, setItems, totalGeneral,
  handlePresupuestoChange, eliminarFilaPresupuesto, agregarFilaPresupuesto,
  editable = true
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
            style={[styles.rowInput, { flex: 2 }, !editable && styles.inputReadOnly]}
            value={item.descripcion}
            onChangeText={editable ? (text) => handlePresupuestoChange(items, setItems, index, 'descripcion', text) : undefined}
            placeholder="Descripción"
            editable={editable}
          />
          <TextInput
            style={[styles.rowInput, { flex: 1, textAlign: 'center' }, !editable && styles.inputReadOnly]}
            value={item.cantidad}
            onChangeText={editable ? (text) => handlePresupuestoChange(items, setItems, index, 'cantidad', text.replace(/[^0-9.]/g, '')) : undefined}
            keyboardType="numeric"
            placeholder="0"
            editable={editable}
          />
          <TextInput
            style={[styles.rowInput, { flex: 1, textAlign: 'center' }, !editable && styles.inputReadOnly]}
            value={item.precio}
            onChangeText={editable ? (text) => handlePresupuestoChange(items, setItems, index, 'precio', text.replace(/[^0-9.]/g, '')) : undefined}
            keyboardType="numeric"
            placeholder="0.00"
            editable={editable}
          />
          <Text style={[styles.rowText, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(totalItem)}</Text>
          {editable && (
            <TouchableOpacity onPress={() => eliminarFilaPresupuesto(items, setItems, index)} style={[styles.deleteButtonSmall, { flex: 0.5 }]}>
              <Ionicons name="close-circle" size={20} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>
      );
    })}
    {editable && (
      <TouchableOpacity onPress={() => agregarFilaPresupuesto(setItems)} style={styles.addButtonSmall}>
        <Text style={styles.addButtonTextSmall}>+ Añadir Fila</Text>
      </TouchableOpacity>
    )}
    <View style={styles.totalRow}>
      <Text style={styles.totalText}>TOTAL</Text>
      <Text style={styles.totalAmount}>{formatCurrency(totalGeneral)}</Text>
    </View>
  </View>
);

const GoogleStyleCalendarView = ({ fechaHoraSeleccionada, setFechaHoraSeleccionada, eventos, title, editable = true }) => {
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
      const fechaEventoStr = dayjs(evento.fechaevento).format('YYYY-MM-DD');
      return fechaEventoStr === dateStr;
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(fechaHoraSeleccionada);
    newDate.setMonth(newDate.getMonth() + direction);
    setFechaHoraSeleccionada(newDate);
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
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton} disabled={!editable}>
          <Ionicons name="chevron-back" size={24} color={editable ? "#e95a0c" : "#ccc"} />
        </TouchableOpacity>
        <Text style={styles.monthYearText}>
          {dayjs(fechaHoraSeleccionada).format('MMMM YYYY').toUpperCase()}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton} disabled={!editable}>
          <Ionicons name="chevron-forward" size={24} color={editable ? "#e95a0c" : "#ccc"} />
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
                isToday && styles.dayCellToday,
                !editable && styles.dayCellDisabled
              ]}
              onPress={editable ? () => {
                const selectedDay = dayjs(day.date);
                const currentTime = dayjs(fechaHoraSeleccionada);
                
                const newDate = selectedDay
                  .hour(currentTime.hour())
                  .minute(currentTime.minute())
                  .second(0)
                  .toDate();
                  
                setFechaHoraSeleccionada(newDate);
              } : undefined}
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
                        {evento.nombreevento}
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

const ConflictModal = ({ 
  showConflictModal,
  setShowConflictModal, 
  conflictoDetectado, 
  setConflictoDetectado,
  onConfirm
 }) => (
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
            onConfirm?.();
          }}>
            <Text style={styles.modalButtonPrimaryText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const EventosDelDiaMejorado = ({ eventosDelDia, fechaHoraSeleccionada }) => {
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
          return (
            <View key={index} style={styles.eventoCard}>
              <Text style={styles.eventoNombre}>{evento.nombreevento}</Text>
              {evento.lugarevento && (
                <View style={styles.eventoDetailRow}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.eventoDetailText}>{evento.lugarevento}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.eventosDelDiaFooter}>
        <Text style={styles.eventosDelDiaNote}>Eventos programados para este día</Text>
      </View>
    </View>
  );
};

const ConfirmModal = ({ showConfirmModal, setShowConfirmModal, handleSubmitConfirmed, isLoading, formData, mode }) => (
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
          <Text style={styles.confirmModalTitle}>Confirmar {mode === 'reprogramar' ? 'Reprogramación' : 'Actualización'}</Text>
        </View>
        <Text style={styles.confirmModalMessage}>
          {mode === 'reprogramar'
            ? '¿Estás seguro de reprogramar este evento? Volverá a estado pendiente para revisión.'
            : '¿Estás seguro de guardar los cambios en este evento?'}
        </Text>
        <View style={styles.confirmModalDetails}>
          <Text style={styles.confirmModalDetailTitle}>Resumen del Evento:</Text>
          <Text style={styles.confirmModalDetail}><Text style={styles.detailLabel}>Nombre:</Text>{formData.nombreevento}</Text>
          <Text style={styles.confirmModalDetail}>
            <Text style={styles.detailLabel}>Fecha:</Text>{dayjs(formData.fechaHoraSeleccionada).format('DD/MM/YYYY')}
          </Text>
        </View>
        <View style={styles.confirmModalButtons}>
          <TouchableOpacity style={[styles.confirmModalButton, styles.confirmModalButtonCancel]} onPress={() => setShowConfirmModal(false)}>
            <Text style={styles.confirmModalButtonTextCancel}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.confirmModalButton, styles.confirmModalButtonConfirm]} onPress={handleSubmitConfirmed} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmModalButtonTextConfirm}>{mode === 'reprogramar' ? 'Sí, Reprogramar' : 'Sí, Guardar'}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const EditEventScreen = () => {
  const router = useRouter();
  const { eventId, eventData, mode } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [errors, setErrors] = useState({});
  const [eventos, setEventos] = useState([]);
  const [eventosDelDia, setEventosDelDia] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictoDetectado, setConflictoDetectado] = useState(null);
  const [participantesEsperados, setParticipantesEsperados] = useState('');
  const scrollViewRef = useRef(null);
  const objetivosSectionRef = useRef(null);
  const [objetivosSectionY, setObjetivosSectionY] = useState(0);
  const [isScrollingToObjetivos, setIsScrollingToObjetivos] = useState(false);
  const [nombreevento, setNombreevento] = useState('');
  const [lugarevento, setLugarevento] = useState('');
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
  const [isScrollingToComite, setIsScrollingToComite] = useState(false);
  const recursosSectionRef = useRef(null);
  const [isScrollingToRecursos, setIsScrollingToRecursos] = useState(false);
  const [recursos, setRecursos] = useState([{ nombre_recurso: '', cantidad: '' }]);
  const presupuestoSectionRef = useRef(null);
  const [isScrollingToPresupuesto, setIsScrollingToPresupuesto] = useState(false);
  const [usuariosComite, setUsuariosComite] = useState([]);
  const [comiteLoading, setComiteLoading] = useState(true);
  const [comiteError, setComiteError] = useState(false);
  const [comiteSeleccionado, setComiteSeleccionado] = useState([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState(new Date());
  const [idevento, setIdevento] = useState(null);
  const [estadoEvento, setEstadoEvento] = useState('pendiente');

  const isReadOnly = mode === 'view' || estadoEvento === 'aprobado';

  const addRecursoTecnologico = () => setRecursosTecnologicos(prev => [...prev, { nombre: '', cantidad: '' }]);
  const removeRecursoTecnologico = (index) => setRecursosTecnologicos(prev => prev.filter((_, i) => i !== index));
  const updateRecursoTecnologico = (value, index, field) => {
    const nuevos = [...recursosTecnologicos];
    nuevos[index][field] = value;
    setRecursosTecnologicos(nuevos);
  };

  const addMobiliario = () => setMobiliario(prev => [...prev, { nombre: '', cantidad: '' }]);
  const removeMobiliario = (index) => setMobiliario(prev => prev.filter((_, i) => i !== index));
  const updateMobiliario = (value, index, field) => {
    const nuevos = [...mobiliario];
    nuevos[index][field] = value;
    setMobiliario(nuevos);
  };

  const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message || ''}`);
  } else {
    Alert.alert(title, message);
  }
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
    if (mode === 'reprogramar') {
      initialDate = initialDate.add(1, 'day');
    }
    return initialDate.toDate();
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
      return response.data;
    } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      return null;
    }
  };

  const fetchUsuariosComite = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        setComiteLoading(true);
        setComiteError(false);
        const token = await getTokenAsync();
        if (!token) { router.replace('/login'); return; }
        const response = await axios.get(`${API_BASE_URL}/users/comite`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 15000,
        });
        const uniqueUsuarios = [];
        const seenIds = new Set();
        for (const usuario of response.data) {
          if (!seenIds.has(usuario.id)) {
            seenIds.add(usuario.id);
            uniqueUsuarios.push(usuario);
          }
        }
        setUsuariosComite(uniqueUsuarios);
        setComiteLoading(false);
        return;
      } catch (error) {
        if (i === retries - 1) {
          setComiteLoading(false);
          setComiteError(true);
          setUsuariosComite([]);
          if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
            Alert.alert("Error de conexión", "El servidor está tardando en responder.", [{ text: "Reintentar", onPress: () => fetchUsuariosComite() }]);
          }
        } else {
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
    const [pendingClockTime, setPendingClockTime] = useState(null);
  const handleClockTimeChange = (newDate) => {
    if (isReadOnly) return;
    const conflictos = verificarConflictoHorario(newDate);
    if (conflictos.length > 0) {
      setPendingClockTime(newDate);
      setConflictoDetectado(conflictos[0]);
      setShowConflictModal(true);
    } else {
      setFechaHoraSeleccionada(newDate);
    }
  };

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

  useFocusEffect(cargarRecursos);

  useEffect(() => {
    if (authToken) {
      fetchUserInfo();
      fetchNotifications();
      fetchUsuariosComite();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [authToken]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const token = await getTokenAsync();
      setAuthToken(token);
      if (!token) {
        Alert.alert("Error", "No se encontró un token de autenticación. Por favor, inicia sesión.");
        router.push("/login");
        return;
      }
      setIsLoading(false);
    };
    initialize();
  }, []);


const OBJETIVOS_ID_TO_KEY = {
  1: 'modeloPedagogico',
  2: 'posicionamiento',
  3: 'internacionalizacion',
  4: 'rsu',
  5: 'fidelizacion',
  6: 'otro',
};

const SUBCATEGORIA_NUM_TO_ID = Object.fromEntries(
  Object.entries(SUBCATEGORIA_ID_MAP).map(([k, v]) => [v, k])
);

const populateFormFromApi = (apiData) => {
  console.log('📥 Keys del apiData:', Object.keys(apiData));

  // 1. Captura de ID infalible
  setIdevento(apiData.idevento || apiData.id || eventId);
  setEstadoEvento(apiData.estado || 'pendiente');
  setNombreevento(apiData.nombreevento || '');
  setLugarevento(apiData.lugarevento || '');

  // Fecha y hora
  if (apiData.fechaevento) {
    const fecha = dayjs(apiData.fechaevento);
    const horaParts = (apiData.horaevento || '00:00:00').split(':');
    const hora = parseInt(horaParts[0]) || 0;
    const min = parseInt(horaParts[1]) || 0;
    const fechaHora = fecha.hour(hora).minute(min).second(0).toDate();
    setFechaHoraSeleccionada(fechaHora);
    setHoraSeleccionada(fechaHora);
  }

  // Clasificación (Soporte para objeto anidado o llave plana)
  const idClasificacion = apiData.Clasificacion?.idclasificacion || apiData.idclasificacion;
  if (idClasificacion) {
    setClasificacionSeleccionada(idClasificacion.toString());
    const idSubNum = apiData.Clasificacion?.idsubcategoria || apiData.idsubcategoria;
    if (idSubNum) {
      setSubcategoriaSeleccionada(SUBCATEGORIA_NUM_TO_ID[idSubNum] || '');
    }
  }

  // Tipos de evento
  const tiposApi = apiData.TiposDeEvento || apiData.tipos_de_evento || [];
  if (tiposApi.length) {
    const tiposMap = {};
    const NOMBRE_TO_ID = {
      'Curricular': '1', 'Extracurricular': '2', 'Marketing': '3',
      'Internacionalización/Marketing': '4', 'Marketing/Extracurricular': '5'
    };
    tiposApi.forEach(tipo => {
      const nombre = (tipo.nombretipo || tipo.nombre)?.trim();
      const id = NOMBRE_TO_ID[nombre];
      if (id) {
        tiposMap[id] = true;
        if (id === '5' && tipo.texto_personalizado) setTextoOtroTipo(tipo.texto_personalizado);
      }
    });
    setTiposSeleccionados(tiposMap);
  }

  // Objetivos, segmentos y argumentación
  const objetivosApi = apiData.Objetivos || apiData.objetivos || [];
  if (objetivosApi.length) {
    const nuevosObjetivos = { modeloPedagogico: false, posicionamiento: false, internacionalizacion: false, rsu: false, fidelizacion: false, otro: false, otroTexto: '' };
    const nuevosSegmentos = { estudiantes: false, docentes: false, publicoExterno: false, influencers: false, otro: false, otroTexto: '' };
    const nuevosTextosSegmentos = {};
    const pdiTextos = [];
    let argumentacionEncontrada = '';

    objetivosApi.forEach(obj => {
      const idTipo = obj.idtipoobjetivo;
      const key = OBJETIVOS_ID_TO_KEY[idTipo];
      if (!key) return;

      if (obj.argumentacion && !argumentacionEncontrada) argumentacionEncontrada = obj.argumentacion;

      if (key !== 'otro') {
        nuevosObjetivos[key] = true;
      } else {
        nuevosObjetivos.otro = true;
        if (obj.texto_personalizado?.trim()) {
          if (!nuevosObjetivos.otroTexto) nuevosObjetivos.otroTexto = obj.texto_personalizado.trim();
          else pdiTextos.push(obj.texto_personalizado.trim());
        }
      }

      const segmentosApi = obj.segmentos || obj.segmentos_objetivo || [];
      if (segmentosApi.length) {
        segmentosApi.forEach(seg => {
          const segId = seg.idsegmento || seg.id;
          const SEG_ID_TO_KEY = { 1: 'estudiantes', 2: 'docentes', 3: 'publicoExterno', 4: 'influencers', 5: 'otro' };
          const segKey = SEG_ID_TO_KEY[segId];
          if (segKey) {
            nuevosSegmentos[segKey] = true;
            if (seg.texto_personalizado) nuevosTextosSegmentos[segKey] = seg.texto_personalizado;
          }
        });
      }
    });

    while (pdiTextos.length < 3) pdiTextos.push('');
    setArgumentacion(argumentacionEncontrada);
    setObjetivosPDI(pdiTextos);
    setObjetivos(nuevosObjetivos);
    setSegmentoObjetivo(nuevosSegmentos);
    setSegmentosTextoPersonalizado(nuevosTextosSegmentos);
  }

  const resultadosApi = apiData.Resultados || apiData.resultados || [];
  if (resultadosApi[0]) {
    const r = resultadosApi[0];
    setResultadosEsperados({
      participacion: r.participacion_esperada?.toString() || '',
      satisfaccion: r.satisfaccion_esperada?.toString() || '',
      otro: r.otros_resultados || ''
    });
  }

  const recursosApi = apiData.Recursos || apiData.recursos_existentes || [];
  if (recursosApi.length) setRecursosSeleccionados(recursosApi.map(r => (r.idrecurso || r.id)?.toString()).filter(Boolean));

  const comiteApi = apiData.Comite || apiData.comite || [];
  if (comiteApi.length) setComiteSeleccionado(comiteApi.map(m => m.idusuario || m.id).filter(Boolean));

  const egresosData = apiData.Egresos || apiData.egresos || [];
  const ingresosData = apiData.Ingresos || apiData.ingresos || [];

  if (egresosData.length) setEgresos(egresosData.map((e, i) => ({ key: `egreso-${e.idegreso ?? i}-${Date.now()}`, descripcion: e.descripcion ?? '', cantidad: String(e.cantidad ?? ''), precio: String(e.precio_unitario ?? e.precio ?? '') })));
  if (ingresosData.length) setIngresos(ingresosData.map((e, i) => ({ key: `ingreso-${e.idingreso ?? i}-${Date.now()}`, descripcion: e.descripcion ?? '', cantidad: String(e.cantidad ?? ''), precio: String(e.precio_unitario ?? e.precio ?? '') })));
};

useEffect(() => {
  const loadEventData = async () => {
    try {
      setIsLoading(true);
      let apiData;
      if (eventData) {
        apiData = JSON.parse(eventData);
      } else if (eventId) {
        const token = await getTokenAsync();
        if (!token) throw new Error('Token no encontrado');
        const response = await axios.get(`${API_BASE_URL}/eventos/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        });
        apiData = response.data;
      } else {
        throw new Error('No se proporcionó eventId ni eventData');
      }

      // ✅ LLAMADA CORRECTA — no redefinición
      populateFormFromApi(apiData);

      await cargarRecursos();

      const token = await getTokenAsync();
      if (token) {
        const eventosResponse = await axios.get(`${API_BASE_URL}/eventos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEventos(eventosResponse.data || []);
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      Alert.alert(
        'Error',
        error.response?.status === 401
          ? 'Sesión expirada. Inicia sesión nuevamente.'
          : `No se pudieron cargar los datos: ${error.message}`
      );
      if (error.response?.status === 401) router.replace('/LoginAdmin');
    } finally {
      setIsLoading(false);
    }
  };
  loadEventData();
}, [eventId, eventData, router]);
  useEffect(() => {
    console.log('idevento actual:', idevento);
    console.log('estadoEvento:', estadoEvento);
    console.log('isReadOnly:', isReadOnly);
  }, [idevento, estadoEvento]);
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

  const handleRecursoChange = (idrecurso) => {
    if (idrecurso == null) return;
    const idString = String(idrecurso);
    setRecursosSeleccionados(prev =>
      prev.includes(idString) ? prev.filter(r => r !== idString) : [...prev, idString]
    );
  };

  const handleTipoEventoChange = (id) => {
    if (isReadOnly) return;
    setTiposSeleccionados(prev => {
      const newState = { ...prev };
      if (newState[id]) delete newState[id];
      else newState[id] = true;
      return newState;
    });
  };

  const handleObjetivoPDIChange = (index, value) => {
    if (isReadOnly) return;
    const newObjetivos = [...objetivosPDI];
    newObjetivos[index] = value;
    setObjetivosPDI(newObjetivos);
  };

const scrollToSection = (sectionRef, setVisible, setScrolling, offset = 60) => {
  setVisible(true);
  setTimeout(() => {
    if (!sectionRef.current) return;
    setScrolling(true);

    // ✅ WEB: el ref YA es el nodo DOM, usar scrollIntoView directo
    if (Platform.OS === 'web') {
      const node = sectionRef.current;
      if (typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (typeof node.getBoundingClientRect === 'function') {
        const top = node.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      setTimeout(() => setScrolling(false), 1000);
      return;
    }

    // ✅ NATIVE: aquí findNodeHandle sí está soportado
    const scrollNode = findNodeHandle(scrollViewRef.current);
    if (!scrollNode) { setScrolling(false); return; }
    sectionRef.current.measureLayout(
      scrollNode,
      (x, y) => {
        scrollViewRef.current?.scrollTo({ y: y - offset, animated: true });
        setTimeout(() => setScrolling(false), 1000);
      },
      () => setScrolling(false)
    );
  }, 150);
};
const scrollToObjetivos = () => scrollToSection(objetivosSectionRef, setSeccionObjetivosVisible, setIsScrollingToObjetivos);
const scrollToResultados = () => scrollToSection(resultadosSectionRef, setSeccionResultadosVisible, setIsScrollingToResultados);
const scrollToComite = () => scrollToSection(comiteSectionRef, setSeccionComiteVisible, setIsScrollingToComite);
const scrollToRecursos = () => scrollToSection(recursosSectionRef, setSeccionRecursosVisible, setIsScrollingToRecursos);
const scrollToPresupuesto = () => scrollToSection(presupuestoSectionRef, setSeccionPresupuestoVisible, setIsScrollingToPresupuesto);

  const validateForm = () => {
    const newErrors = {};
    if (!nombreevento.trim()) newErrors.nombreevento = 'El nombre del evento es obligatorio.';
    if (Object.values(tiposSeleccionados).every(v => !v)) newErrors.tipos = 'Selecciona al menos un tipo de evento.';
    if (tiposSeleccionados['5'] && !textoOtroTipo.trim()) newErrors.textoOtroTipo = 'Describe el otro tipo de evento.';
    const tieneAlgunObjetivo = Object.entries(objetivos).some(
  ([key, val]) => key !== 'otroTexto' && val === true
);
if (!tieneAlgunObjetivo) newErrors.objetivos = 'Selecciona al menos un objetivo.';
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
    if (isReadOnly) return;
    if (!validateForm()) {
      showAlert('Formulario Incompleto', 'Por favor, corrige los campos marcados en rojo antes de continuar.');
    return;
    }
    setShowConfirmModal(true);
  };

  const handleSubmitConfirmed = async () => {
  setShowConfirmModal(false);
  setIsLoading(true);
  
  const token = await getTokenAsync();
  if (!idevento) {
    showAlert('Error', 'No se encontró el ID del evento.');
    setIsLoading(false);
    return;
  }
  if (!token) {
    showAlert('Sesión expirada', 'Inicia sesión nuevamente.');
    router.replace('/login');
    setIsLoading(false);
    return;
  }

  try {
    const fechaLocal = dayjs(fechaHoraSeleccionada);
    const eventoPayload = {
      nombreevento: nombreevento.trim(),
      lugarevento: lugarevento.trim() || 'Por definir',
      fechaevento: fechaLocal.format('YYYY-MM-DD'),
      horaevento: dayjs(fechaHoraSeleccionada).format('HH:mm:ss'),
      argumentacion: argumentacion.trim() || null,
      
      resultados_esperados: JSON.stringify(resultadosEsperados),
      
      tipos_de_evento: Object.keys(tiposSeleccionados)
        .filter(id => tiposSeleccionados[id])
        .map(id => ({
          id: parseInt(id, 10),
          texto_personalizado: id === '5' && textoOtroTipo.trim() ? textoOtroTipo.trim() : undefined
        })),
      objetivos: [
        ...Object.entries(objetivos)
          .filter(([k, v]) => v === true && k !== 'otroTexto' && k !== 'otro')
          .map(([k]) => ({ id: OBJETIVOS_EVENTO_MAP[k] })),
        ...(objetivos.otro && objetivos.otroTexto?.trim()
          ? [{ id: 6, texto_personalizado: objetivos.otroTexto.trim() }]
          : objetivos.otro ? [{ id: 6 }] : []),
        ...objetivosPDI
          .filter(t => t.trim())
          .map(t => ({ id: 6, texto_personalizado: t.trim() })),
      ],
      segmentos_objetivo: Object.entries(segmentoObjetivo)
        .filter(([k, v]) => v && k !== 'otroTexto')
        .map(([k]) => {
          if (k === 'otro') return { id: 5, texto_personalizado: segmentoObjetivo.otroTexto || null };
          const seg = SEGMENTO_OBJETIVO.find(s => ({estudiantes:'1',docentes:'2',publicoExterno:'3',influencers:'4'})[k] === s.id);
          return seg ? { id: parseInt(seg.id), texto_personalizado: segmentosTextoPersonalizado[k] || null } : null;
        }).filter(Boolean),
      recursos_existentes: recursosSeleccionados.map(id => parseInt(id)).filter(id => !isNaN(id)),
      recursos_nuevos: [
        ...recursosTecnologicos.filter(r => r.nombre?.trim()).map(r => ({ nombre_recurso: r.nombre.trim(), cantidad: parseInt(r.cantidad)||1, recurso_tipo: 'tecnologico' })),
        ...mobiliario.filter(r => r.nombre?.trim()).map(r => ({ nombre_recurso: r.nombre.trim(), cantidad: parseInt(r.cantidad)||1, recurso_tipo: 'mobiliario' })),
        ...vajilla.filter(r => r.nombre?.trim()).map(r => ({ nombre_recurso: r.nombre.trim(), cantidad: parseInt(r.cantidad)||1, recurso_tipo: 'vajilla' }))
      ],
      presupuesto: {
        egresos: egresos.filter(i => i.descripcion?.trim()).map(i => ({ descripcion: i.descripcion, cantidad: parseFloat(i.cantidad)||0, precio_unitario: parseFloat(i.precio)||0 })),
        ingresos: ingresos.filter(i => i.descripcion?.trim()).map(i => ({ descripcion: i.descripcion, cantidad: parseFloat(i.cantidad)||0, precio_unitario: parseFloat(i.precio)||0 })),
        total_egresos: totalEgresos,
        total_ingresos: totalIngresos,
        balance
      },
      idclasificacion: clasificacionSeleccionada ? parseInt(clasificacionSeleccionada) : null,
      idsubcategoria: subcategoriaSeleccionada ? SUBCATEGORIA_ID_MAP[subcategoriaSeleccionada] : null,
      comite: comiteSeleccionado.length > 0 ? comiteSeleccionado.map(id => parseInt(id)) : [],
    };

    console.log('🔗 URL:', `${API_BASE_URL}/eventos/${idevento}`);
    
    const response = await axios.put(
      `${API_BASE_URL}/eventos/${idevento}`, 
      eventoPayload,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    
    console.log('✅ RESPUESTA BACKEND:', response.status, response.data);

    if (mode === 'reprogramar' && response.data.estado !== 'pendiente') {
      await axios.put(
        `${API_BASE_URL}/eventos/${idevento}/status`,
        { estado: 'pendiente' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
    
    // ✅ CORREGIDO: usar showAlert que funciona en Web + Móvil
    showAlert('✅ Éxito', 'Evento actualizado correctamente.');
    
    // Esperar un poco para que el usuario vea el mensaje
    setTimeout(() => {
      router.back();
    }, 500);
    
  } catch (error) {
    console.error('❌ ERROR DETALLADO AL EDITAR:', error.response?.data || error.message);
    let errorMessage = 'Error desconocido al contactar al servidor.';
    if (error.response?.data?.message) errorMessage = error.response.data.message;
    else if (error.response?.status === 400) errorMessage = 'Datos inválidos. Revisa los campos requeridos.';
    else if (error.response?.status === 401) errorMessage = 'Sesión expirada.';
    
    // ✅ CORREGIDO: mostrar mensaje de ERROR, no de éxito
    showAlert('❌ Error al guardar', errorMessage);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            {mode === 'reprogramar' ? '🔄 Reprogramar Evento' : '✏️ Editar Evento'}
          </Text>
          {estadoEvento && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {estadoEvento === 'pendiente' ? '⏳ Pendiente' :
                  estadoEvento === 'aprobado' ? '✓ Aprobado' : '✗ Rechazado'}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      {mode === 'reprogramar' && (
        <View style={styles.reprogramBanner}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.info} />
          <Text style={styles.reprogramBannerText}>
            Ajusta fecha, hora o detalles. El evento volverá a revisión.
          </Text>
        </View>
      )}
      <View style={styles.timePickerSection}>
        <View style={styles.timePickerHeader}>
          <Ionicons name="alarm" size={24} color="#e95a0c" />
          <Text style={styles.timePickerSectionTitle}>Hora de Inicio del Evento</Text>
        </View>
        <TimePicker
          value={fechaHoraSeleccionada}
          onChange={handleClockTimeChange}
          editable={!isReadOnly}
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
                editable={!isReadOnly}
              />
              <EventosDelDiaMejorado
                eventosDelDia={eventosDelDia}
                fechaHoraSeleccionada={fechaHoraSeleccionada}
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
            <Text style={styles.label}>Nombre del Evento</Text>
            <View style={[styles.inputGroup, errors.nombreevento && styles.inputError]}>
              <Ionicons name="text-outline" size={20} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isReadOnly && styles.inputReadOnly]}
                value={nombreevento}
                onChangeText={isReadOnly ? undefined : (text) => handleInputChange('nombreevento', text)}
                placeholder="Nombre del evento"
                editable={!isReadOnly}
              />
            </View>
            {errors.nombreevento && <Text style={styles.errorText}>{errors.nombreevento}</Text>}
            <Text style={styles.label}>Clasificación Estratégica</Text>
            <TouchableOpacity
              style={[styles.inputGroup, isReadOnly && styles.inputReadOnly]}
              onPress={() => !isReadOnly && setShowClasificacionModal(true)}
              disabled={isReadOnly}
            >
              <Ionicons name="options-outline" size={20} style={styles.inputIcon} />
              <Text style={styles.input}>
                {clasificacionSeleccionada
                  ? CLASIFICACION_ESTRATEGICA[clasificacionSeleccionada]?.label || 'Selecciona una categoría'
                  : 'Selecciona una categoría'}
              </Text>
            </TouchableOpacity>
            {clasificacionSeleccionada && CLASIFICACION_ESTRATEGICA[clasificacionSeleccionada]?.subcategorias && (
              <>
                <Text style={styles.label}>Subcategoría</Text>
                <TouchableOpacity
                  style={[styles.inputGroup, isReadOnly && styles.inputReadOnly]}
                  onPress={() => !isReadOnly && setShowSubcategoriaModal(true)}
                  disabled={isReadOnly}
                >
                  <Ionicons name="list-outline" size={20} style={styles.inputIcon} />
                  <Text style={styles.input}>
                    {subcategoriaSeleccionada
                      ? CLASIFICACION_ESTRATEGICA[clasificacionSeleccionada].subcategorias.find(s => s.id === subcategoriaSeleccionada)?.label || 'Selecciona una subcategoría'
                      : 'Selecciona una subcategoría'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.label}>Lugar del Evento</Text>
            <TouchableOpacity
              style={[styles.inputGroup, isReadOnly && styles.inputReadOnly]}
              onPress={() => {
                if (!isReadOnly) {
                  setCampusSeleccionado(null);
                  setShowLugarModal(true);
                }
              }}
              disabled={isReadOnly}
            >
              <Ionicons name="location-outline" size={20} style={styles.inputIcon} />
              <Text style={styles.input}>
                {lugarevento ? lugarevento : 'Selecciona un lugar para el evento'}
              </Text>
            </TouchableOpacity>
            {width <= 768 && (
              <>
                <Text style={styles.label}>Fecha de Realización</Text>
                <GoogleStyleCalendarView
                  fechaHoraSeleccionada={fechaHoraSeleccionada}
                  setFechaHoraSeleccionada={setFechaHoraSeleccionada}
                  eventos={eventos}
                  title="Fecha de Realización"
                  editable={!isReadOnly}
                />
                <EventosDelDiaMejorado
                  eventosDelDia={eventosDelDia}
                  fechaHoraSeleccionada={fechaHoraSeleccionada}
                  verificarConflictoHorario={verificarConflictoHorario}
                />
              </>
            )}
            <Text style={styles.label}>Tipo de Evento (puede seleccionar más de un tipo)</Text>
            {TIPOS_DE_EVENTO.map((item) => (
              <TouchableOpacity key={item.id} style={styles.checkboxRow} onPress={() => handleTipoEventoChange(item.id)} disabled={isReadOnly}>
                <Ionicons name={tiposSeleccionados[item.id] ? "checkbox" : "square-outline"} size={24} color={tiposSeleccionados[item.id] ? "#e95a0c" : "#888"} />
                <Text style={styles.checkboxLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {tiposSeleccionados['5'] && (
              <View style={styles.otroInputContainer}>
                <TextInput style={[styles.input, isReadOnly && styles.inputReadOnly]} value={textoOtroTipo} onChangeText={isReadOnly ? undefined : setTextoOtroTipo} placeholder="¿Cuál?" editable={!isReadOnly} />
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
              <Text style={styles.label}>Objetivos de Evento (puede seleccionar más de un objetivo):</Text>
              <View style={styles.checkboxContainer}>
                <View style={styles.checkboxColumn}>
                  {[
                    { key: 'modeloPedagogico', label: 'Modelo Pedagógico' },
                    { key: 'posicionamiento', label: 'Posicionamiento' },
                    { key: 'internacionalizacion', label: 'Internacionalización' }
                  ].map((item) => (
                    <TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setObjetivos, item.key)} disabled={isReadOnly}>
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
                    <TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setObjetivos, item.key)} disabled={isReadOnly}>
                      <Ionicons name={objetivos[item.key] ? "checkbox" : "square-outline"} size={24} color={objetivos[item.key] ? "#e95a0c" : "#888"} />
                      <Text style={styles.checkboxLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {objetivos.otro && (
                <View style={styles.otroInputContainer}>
                  <TextInput style={[styles.input, isReadOnly && styles.inputReadOnly]} value={objetivos.otroTexto} onChangeText={isReadOnly ? undefined : (text) => handleOtroTextChange(setObjetivos, text)} placeholder="¿Cuál?" editable={!isReadOnly} />
                  {objetivos.otroTexto.trim() && <Text style={styles.selectedText}>Selección: {objetivos.otroTexto}</Text>}
                </View>
              )}
              <Text style={styles.label}>Objetivo(s) del PDI Asociado(s):</Text>
              <View style={styles.objetivosPDIGrid}>
                {objetivosPDI.map((objetivo, index) => (
                  <View key={index} style={[styles.objetivoPDIRow, styles.objetivoPDIColumn]}>
                    <Text style={styles.objetivoPDINumber}>{index + 1}.</Text>
                    <TextInput
                      style={[styles.objetivoPDIInput, isReadOnly && styles.inputReadOnly]}
                      value={objetivo}
                      onChangeText={isReadOnly ? undefined : (text) => handleObjetivoPDIChange(index, text)}
                      placeholder={`Objetivo ${index + 1}`}
                      multiline
                      editable={!isReadOnly}
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.label}>Definición del Segmento Objetivo (puede seleccionar más de un público):</Text>
              <View style={styles.checkboxContainer}>
                <View style={styles.checkboxColumn}>
                  {[
                    { key: 'estudiantes', label: 'Estudiantes' },
                    { key: 'docentes', label: 'Docentes' }
                  ].map((item) => (
                    <TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setSegmentoObjetivo, item.key)} disabled={isReadOnly}>
                      <Ionicons name={segmentoObjetivo[item.key] ? "checkbox" : "square-outline"} size={24} color={segmentoObjetivo[item.key] ? "#e95a0c" : "#888"} />
                      <Text style={styles.checkboxLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.checkboxColumn}>
                  {[
                    { key: 'publicoExterno', label: 'Público Externo' },
                    { key: 'influencers', label: 'Influencers' },
                    { key: 'otro', label: 'Otro' }
                  ].map((item) => (
                    <TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setSegmentoObjetivo, item.key)} disabled={isReadOnly}>
                      <Ionicons name={segmentoObjetivo[item.key] ? "checkbox" : "square-outline"} size={24} color={segmentoObjetivo[item.key] ? "#e95a0c" : "#888"} />
                      <Text style={styles.checkboxLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {segmentoObjetivo.otro && (
                <View style={styles.otroInputContainer}>
                  <TextInput style={[styles.input, isReadOnly && styles.inputReadOnly]} value={segmentoObjetivo.otroTexto} onChangeText={isReadOnly ? undefined : (text) => handleOtroTextChange(setSegmentoObjetivo, text)} placeholder="¿Cuál?" editable={!isReadOnly} />
                  {segmentoObjetivo.otroTexto.trim() && <Text style={styles.selectedText}>Selección: {segmentoObjetivo.otroTexto}</Text>}
                </View>
              )}
              <Text style={styles.label}>Argumentación:</Text>
              <View style={[styles.inputGroup, { alignItems: 'flex-start' }, errors.argumentacion && styles.inputError]}>
                <Ionicons name="text-outline" size={20} style={[styles.inputIcon, { paddingTop: 14 }]} />
                <TextInput
                  style={[styles.input, styles.textArea, isReadOnly && styles.inputReadOnly]}
                  multiline
                  numberOfLines={4}
                  placeholder="Breve descripción sustentada de la congruencia del evento con los objetivos especificados"
                  value={argumentacion}
                  onChangeText={isReadOnly ? undefined : setArgumentacion}
                  editable={!isReadOnly}
                />
              </View>
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
                  <Text style={styles.resultadoLabel}>Participación Efectiva</Text>
                  <TextInput style={[styles.resultadoInput, isReadOnly && styles.inputReadOnly]} placeholder="Ej: 150" value={resultadosEsperados.participacion} onChangeText={isReadOnly ? undefined : (text) => handleResultadoChange('participacion', text)} keyboardType="numeric" editable={!isReadOnly} />
                </View>
                <View style={styles.resultadoRow}>
                  <Text style={styles.resultadoLabel}>Índice de Satisfacción</Text>
                  <TextInput style={[styles.resultadoInput, isReadOnly && styles.inputReadOnly]} placeholder="Ej: 90% de satisfacción" value={resultadosEsperados.satisfaccion} onChangeText={isReadOnly ? undefined : (text) => handleResultadoChange('satisfaccion', text)} editable={!isReadOnly} />
                </View>
                <View style={styles.resultadoRow}>
                  <Text style={styles.resultadoLabel}>Otro</Text>
                  <TextInput style={[styles.resultadoInput, isReadOnly && styles.inputReadOnly]} placeholder="Otro resultado medible" value={resultadosEsperados.otro} onChangeText={isReadOnly ? undefined : (text) => handleResultadoChange('otro', text)} editable={!isReadOnly} />
                </View>
              </View>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>IV. COMITÉ DEL EVENTO</Text>
                <Text style={styles.comiteDescription}>Selecciona a los miembros del comité del evento:</Text>
                {comiteLoading ? (
                  <ActivityIndicator size="small" color="#e95a0c" style={{ marginTop: 10 }} />
                ) : comiteError ? (
                  <View style={{ alignItems: 'center', marginTop: 10 }}>
                    <Text style={{ color: 'red', marginBottom: 10 }}>No se pudieron cargar los usuarios.</Text>
                    <TouchableOpacity onPress={fetchUsuariosComite} style={{ backgroundColor: '#e95a0c', padding: 10, borderRadius: 5 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                ) : usuariosComite.length > 0 ? (
                  <View style={styles.comiteList}>
                    {usuariosComite.map(usuario => (
                      <TouchableOpacity
                        key={usuario.id}
                        style={styles.checkboxRow}
                        onPress={() => {
                          if (isReadOnly) return;
                          if (comiteSeleccionado.includes(usuario.id)) {
                            setComiteSeleccionado(prev => prev.filter(id => id !== usuario.id));
                          } else {
                            setComiteSeleccionado(prev => [...prev, usuario.id]);
                          }
                        }}
                        disabled={isReadOnly}
                      >
                        <Ionicons name={comiteSeleccionado.includes(usuario.id) ? "checkbox" : "square-outline"} size={24} color={comiteSeleccionado.includes(usuario.id) ? "#e95a0c" : "#888"} />
                        <View style={styles.comiteUserText}>
                          <Text style={styles.checkboxLabel}>{usuario.nombreCompleto}</Text>
                          <Text style={[styles.comiteUserRole, { fontSize: 12, color: '#666', fontStyle: 'italic' }]}>
                            {usuario.role === 'academico'
                              ? `Académico - ${usuario.facultad || 'Sin facultad'}${usuario.carrera ? ` (${usuario.carrera})` : ''}`
                              : usuario.role.charAt(0).toUpperCase() + usuario.role.slice(1)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.comitePlaceholder}>No hay usuarios disponibles para el comité.</Text>
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
                <Text style={styles.subsectionTitle}>Recursos Disponibles</Text>
                <Text style={styles.subsectionDescription}>Selecciona los recursos existentes que necesitarás para tu evento:</Text>
                {recursosDisponibles.length > 0 ? (
                  <View style={styles.recursosDisponiblesGrid}>
                    {recursosDisponibles.map((recurso) => {
                      const isSelected = recursosSeleccionados.includes(String(recurso.idrecurso));
                      return (
                        <TouchableOpacity
                          key={String(recurso.idrecurso)}
                          style={[styles.recursoDisponibleCard, isSelected && styles.recursoDisponibleCardSelected]}
                          onPress={() => !isReadOnly && handleRecursoChange(recurso.idrecurso)}
                          disabled={isReadOnly}
                        >
                          <View style={styles.recursoCheckboxContainer}>
                            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#e95a0c" : "#888"} />
                          </View>
                          <View style={styles.recursoInfo}>
                            <Text style={styles.recursoNombre}>{recurso.nombre_recurso}</Text>
                            <Text style={styles.recursoTipo}>
                              {recurso.recurso_tipo === 'tecnologico' ? 'Tecnológico' : recurso.recurso_tipo === 'mobiliario' ? 'Mobiliario' : 'Vajilla'}
                            </Text>
                            <Text style={styles.recursoCantidad}>Disponibles: {recurso.cantidad || 'N/A'}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noRecursosText}>📦 No hay recursos disponibles en este momento.</Text>
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
              <Text style={styles.sectionTitle}>VI. PRESUPUESTO</Text>
              <TablaPresupuesto titulo="EGRESOS" items={egresos} setItems={setEgresos} totalGeneral={totalEgresos} handlePresupuestoChange={handlePresupuestoChange} eliminarFilaPresupuesto={eliminarFilaPresupuesto} agregarFilaPresupuesto={agregarFilaPresupuesto} editable={!isReadOnly} />
              <TablaPresupuesto titulo="INGRESOS" items={ingresos} setItems={setIngresos} totalGeneral={totalIngresos} handlePresupuestoChange={handlePresupuestoChange} eliminarFilaPresupuesto={eliminarFilaPresupuesto} agregarFilaPresupuesto={agregarFilaPresupuesto} editable={!isReadOnly} />
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
        </ScrollView>
      </View>
      <View style={styles.fixedBottomContainer}>
        {!isReadOnly && (
          <TouchableOpacity
            onPress={confirmSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitButtonText}>
                  {mode === 'reprogramar' ? '🔄 Actualizar' : '💾 Guardar Cambios'}
                </Text>
            }
          </TouchableOpacity>
        )}
</View>
      <ConfirmModal 
      showConfirmModal={showConfirmModal} 
      setShowConfirmModal={setShowConfirmModal} 
      handleSubmitConfirmed={handleSubmitConfirmed} 
      isLoading={isLoading} 
      formData={{ nombreevento, lugarevento, fechaHoraSeleccionada }} mode={mode} />
      <NotificationsModal visible={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} notifications={notifications} markAsRead={markNotificationAsRead} />
      <ConflictModal
      showConflictModal={showConflictModal}
      setShowConflictModal={setShowConflictModal}
      conflictoDetectado={conflictoDetectado}
      setConflictoDetectado={setConflictoDetectado}
      onConfirm={() => {           // <-- nuevo prop
        if (pendingClockTime) {
          setFechaHoraSeleccionada(pendingClockTime);
          setPendingClockTime(null);
        }
      }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputReadOnly: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reprogramBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  reprogramBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  timePickerTriggerDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  timePickerTriggerTextDisabled: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  dayCellDisabled: {
    opacity: 0.6,
  },
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#e95a0c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
  },
  timePickerContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f0',
    borderWidth: 2,
    borderColor: '#e95a0c',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    shadowColor: '#e95a0c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timePickerDisplay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e95a0c',
    letterSpacing: 1,
  },
  timePickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e95a0c',
    padding: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    marginTop: 8,
  },
  quickHoursContainer: {
    marginBottom: 20,
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
  quickHoursTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  quickHoursScroll: {
    maxHeight: 50,
  },
  quickHourButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    marginRight: 10,
  },
  quickHourButtonActive: {
    backgroundColor: '#e95a0c',
    borderColor: '#e95a0c',
  },
  quickHourText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  quickHourTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  detailedPicker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  detailedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailedColumn: {
    alignItems: 'center',
    flex: 1,
  },
  detailedLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  detailedSelector: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  detailedButton: {
    padding: 4,
  },
  detailedValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginVertical: 4,
  },
  detailedSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#e95a0c',
    marginHorizontal: 12,
  },
  confirmButton: {
    backgroundColor: '#e95a0c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  timePickerTriggerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e95a0c',
    letterSpacing: 1,
    marginHorizontal: 4,
  },
  timePickerPanel: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e95a0c',
    padding: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 15,
    minWidth: 280,
    maxWidth: 320,
  },
  drumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  drum: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    width: 72,
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
  drumContainer: {
    alignItems: 'center',
  },
  drumLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
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
  drumValueContainer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 4,
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
  drumVal: {
    fontSize: 42,
    fontWeight: '700',
    color: '#e95a0c',
    paddingVertical: 8,
    textAlign: 'center',
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
  quickTimeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
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
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
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
  timePickerApply: {
    backgroundColor: '#e95a0c',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  timePickerApplyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
    minHeight: 0,
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
    minHeight: 0,
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
  headerButton: { padding: 8 },
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
  keyboardAvoidingContainer: { flex: 1, backgroundColor: '#F4F7F9', minHeight: 0 },
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
  fixedBottomContainer: {
  backgroundColor: '#fff',
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderTopWidth: 1,
  borderTopColor: '#e0e0e0',
},
submitButton: {
  backgroundColor: '#e95a0c',
  paddingVertical: 16,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
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
  mobileTimePickerContainer: {
    position: 'relative',
    zIndex: 100,
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
});

export default EditEventScreen;