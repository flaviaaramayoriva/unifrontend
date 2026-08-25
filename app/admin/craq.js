import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, Modal, PanResponder,Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

const ESTADOS_PROYECTO = {
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
  EN_REVISION: 'en_revision'
};
const TIPOS_DE_EVENTO = [
  { id: '1', label: 'Curricular' },
  { id: '2', label: 'Extracurricular' },
  { id: '3', label: 'Marketing' },
  { id: '4', label: 'Internacionalización' },
  { id: '5', label: 'Otro' }
];

const SEGMENTO_OBJETIVO = [
  { id: '1', label: 'Estudiantes' },
  { id: '2', label: 'Docentes' },
  { id: '3', label: 'Público Externo' },
  { id: '4', label: 'Influencers' },
  { id: '5', label: 'Otro' }
];

const OBJETIVOS_EVENTO_MAP = {
  modeloPedagogico: 1,
  posicionamiento: 2,
  internacionalizacion: 3,
  rsu: 4,
  fidelizacion: 5,
  otro: 6
};
const ProyectoDetalleModal = ({ visible, proyecto, onClose, onAprobar, onRechazar, isLoading }) => {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showRechazoInput, setShowRechazoInput] = useState(false);

  if (!proyecto) return null;

  const handleRechazar = () => {
    if (!motivoRechazo.trim()) {
      Alert.alert('Error', 'Debes proporcionar un motivo para el rechazo.');
      return;
    }
    onRechazar(proyecto.id, motivoRechazo);
    setMotivoRechazo('');
    setShowRechazoInput(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.detalleModalContent}>
          <View style={styles.detalleModalHeader}>
            <Text style={styles.detalleModalTitle}>Detalle del Proyecto</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detalleScrollView}>
            {/* Información básica */}
            <View style={styles.detalleSection}>
              <Text style={styles.detalleSectionTitle}>Información General</Text>
              <View style={styles.detalleRow}>
                <Text style={styles.detalleLabel}>Nombre:</Text>
                <Text style={styles.detalleValue}>{proyecto.nombreevento}</Text>
              </View>
              <View style={styles.detalleRow}>
                <Text style={styles.detalleLabel}>Fecha:</Text>
                <Text style={styles.detalleValue}>
                  {dayjs(proyecto.fechaevento).format('DD/MM/YYYY')} a las {dayjs(proyecto.horaevento, 'HH:mm:ss').format('HH:mm')}
                </Text>
              </View>
              <View style={styles.detalleRow}>
                <Text style={styles.detalleLabel}>Lugar:</Text>
                <Text style={styles.detalleValue}>{proyecto.lugarevento}</Text>
              </View>
              <View style={styles.detalleRow}>
                <Text style={styles.detalleLabel}>Responsable:</Text>
                <Text style={styles.detalleValue}>{proyecto.responsable_evento}</Text>
              </View>
              <View style={styles.detalleRow}>
                <Text style={styles.detalleLabel}>Creado:</Text>
                <Text style={styles.detalleValue}>
                  {dayjs(proyecto.created_at).format('DD/MM/YYYY HH:mm')}
                </Text>
              </View>
            </View>

            {/* Argumentación */}
            <View style={styles.detalleSection}>
              <Text style={styles.detalleSectionTitle}>Argumentación</Text>
              <Text style={styles.detalleArgumentacion}>{proyecto.argumentacion}</Text>
            </View>

            {/* Presupuesto */}
            {proyecto.balance_economico && (
              <View style={styles.detalleSection}>
                <Text style={styles.detalleSectionTitle}>Balance Económico</Text>
                <Text style={[
                  styles.detalleBalance,
                  { color: proyecto.balance_economico >= 0 ? '#27ae60' : '#e74c3c' }
                ]}>
                  Bs {proyecto.balance_economico?.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Tipos de evento */}
            {proyecto.tipos_de_evento && proyecto.tipos_de_evento.length > 0 && (
              <View style={styles.detalleSection}>
                <Text style={styles.detalleSectionTitle}>Tipos de Evento</Text>
                {proyecto.tipos_de_evento.map((tipo, index) => (
                  <Text key={index} style={styles.detalleTipo}>• {tipo.label || tipo.nombre}</Text>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Acciones */}
          <View style={styles.detalleActions}>
            {!showRechazoInput ? (
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity 
                  style={styles.actionButtonReject} 
                  onPress={() => setShowRechazoInput(true)}
                  disabled={isLoading}
                >
                  <Ionicons name="close-circle" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Rechazar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButtonApprove} 
                  onPress={() => onAprobar(proyecto.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Aprobar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.rechazoInputContainer}>
                <Text style={styles.rechazoLabel}>Motivo del rechazo:</Text>
                <TextInput
                  style={styles.rechazoInput}
                  multiline
                  numberOfLines={3}
                  placeholder="Explica por qué se rechaza este proyecto..."
                  value={motivoRechazo}
                  onChangeText={setMotivoRechazo}
                />
                <View style={styles.rechazoActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => {
                      setShowRechazoInput(false);
                      setMotivoRechazo('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmRejectButton} 
                    onPress={handleRechazar}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.confirmRejectButtonText}>Confirmar Rechazo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
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
const NotificationsModal = ({ visible, onClose, notifications }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.notificationsModalTitle}>
      <View style={styles.notificationContent}>
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
            notifications.map((notification, index) => (
              <View key={index} style={styles.notificationItem}>
                <Ionicons name="calendar" size={20} color="#e95a0c" style={styles.notificationIcon} />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationText}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>
                    {dayjs(notification.timestamp).fromNow()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const InteractiveClockPicker = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null);
  const [hourText, setHourText] = useState('');
  const [minuteText, setMinuteText] = useState('');
  const [isEditingTime, setIsEditingTime] = useState(false);

  const svgWidth = 240;
  const svgHeight = 240;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const radius = 90;

  const currentHour24 = value.getHours();
  const currentMinute = value.getMinutes();
  const currentHour12 = currentHour24 % 12 || 12;
  const period = currentHour24 < 12 ? 'AM' : 'PM';

  useEffect(() => {
    if (!isEditingTime) {
      setHourText(String(currentHour12).padStart(2, '0'));
      setMinuteText(String(currentMinute).padStart(2, '0'));
    }
  }, [currentHour12, currentMinute, isEditingTime]);

  const hourAngle = ((currentHour12 % 12) * 30) + (currentMinute * 0.5) - 90;
  const minuteAngle = (currentMinute * 6) - 90;

  const updateTimeFromText = () => {
    const hour = parseInt(hourText, 10);
    const minute = parseInt(minuteText, 10);

    if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      setHourText(String(currentHour12).padStart(2, '0'));
      setMinuteText(String(currentMinute).padStart(2, '0'));
      return;
    }

    const newDate = new Date(value);
    let finalHour24 = hour;

    if (period === 'PM' && hour !== 12) {
      finalHour24 += 12;
    } else if (period === 'AM' && hour === 12) {
      finalHour24 = 0;
    }

    newDate.setHours(finalHour24);
    newDate.setMinutes(minute);
    onChange(newDate);
    setIsEditingTime(false);
  };

  const getAngleFromCoordinates = (x, y) => {
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
    return angle < 0 ? angle + 360 : angle;
  };

  const updateTimeFromAngle = (angle, type) => {
    const newDate = new Date(value);

    if (type === 'hour') {
      let newHour12 = Math.round(angle / 30);
      if (newHour12 === 0) newHour12 = 12;
      if (newHour12 > 12) newHour12 = newHour12 % 12;

      let finalHour24 = newHour12;
      if (period === 'PM' && newHour12 !== 12) {
        finalHour24 += 12;
      } else if (period === 'AM' && newHour12 === 12) {
        finalHour24 = 0;
      }
      newDate.setHours(finalHour24);
    } else if (type === 'minute') {
      const newMinute = Math.round(angle / 6) % 60;
      newDate.setMinutes(newMinute);
    }

    onChange(newDate);
  };

  const getHandType = (x, y) => {
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    return distance < 60 ? 'hour' : 'minute';
  };

  const panResponder = useRef(
    PanResponder.create({ // Cambiado de panResponder.create a PanResponder.create
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const handType = getHandType(locationX, locationY);
        setDragType(handType);
        setIsDragging(true);

        const angle = getAngleFromCoordinates(locationX, locationY);
        updateTimeFromAngle(angle, handType);
      },
      onPanResponderMove: (evt) => {
        if (!isDragging || !dragType) return;

        const { locationX, locationY } = evt.nativeEvent;
        const angle = getAngleFromCoordinates(locationX, locationY);
        updateTimeFromAngle(angle, dragType);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        setDragType(null);
      },
    })
  ).current;

  const handlePeriodChange = (newPeriod) => {
    if (period === newPeriod) return;

    const newDate = new Date(value);
    let newHour = newDate.getHours();

    if (newPeriod === 'PM' && newHour < 12) {
      newHour += 12;
    } else if (newPeriod === 'AM' && newHour >= 12) {
      newHour -= 12;
    }

    newDate.setHours(newHour);
    onChange(newDate);
  };

  const hourHandX = centerX + 50 * Math.cos(hourAngle * Math.PI / 180);
  const hourHandY = centerY + 50 * Math.sin(hourAngle * Math.PI / 180);
  const minuteHandX = centerX + 70 * Math.cos(minuteAngle * Math.PI / 180);
  const minuteHandY = centerY + 70 * Math.sin(minuteAngle * Math.PI / 180);

  return (
    <View style={styles.clockContainer}>
      <TouchableOpacity
        style={styles.digitalDisplay}
        onPress={() => setIsEditingTime(!isEditingTime)}
        activeOpacity={0.8}
      >
        {isEditingTime ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.digitalTime, styles.timeInput]}
              value={hourText}
              onChangeText={setHourText}
              keyboardType="numeric"
              maxLength={2}
              selectTextOnFocus
              autoFocus
            />
            <Text style={[styles.digitalTime, { color: '#ffffff' }]}>:</Text>
            <TextInput
              style={[styles.digitalTime, styles.timeInput]}
              value={minuteText}
              onChangeText={setMinuteText}
              keyboardType="numeric"
              maxLength={2}
              selectTextOnFocus
            />
            <TouchableOpacity
              onPress={updateTimeFromText}
              style={styles.confirmButton}
            >
              <Ionicons name="checkmark" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.digitalTime}>
            {String(currentHour12).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')}
          </Text>
        )}

        <View style={styles.periodContainer}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              period === 'AM' && styles.periodButtonActive
            ]}
            onPress={() => handlePeriodChange('AM')}
          >
            <Text style={[
              styles.periodText,
              period === 'AM' && styles.periodTextActive
            ]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              period === 'PM' && styles.periodButtonActive
            ]}
            onPress={() => handlePeriodChange('PM')}
          >
            <Text style={[
              styles.periodText,
              period === 'PM' && styles.periodTextActive
            ]}>PM</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <View {...panResponder.panHandlers} style={{ marginVertical: 20 }}>
        <Svg width={svgWidth} height={svgHeight}>
          <Circle
            cx={centerX}
            cy={centerY}
            r={95}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth={3}
          />
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="white"
            stroke="#e95a0c"
            strokeWidth={2}
          />
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30) - 90;
            const isMainHour = i % 3 === 0;
            const outerRadius = isMainHour ? 85 : 82;
            const innerRadius = isMainHour ? 70 : 75;
            const x1 = centerX + outerRadius * Math.cos((angle * Math.PI) / 180);
            const y1 = centerY + outerRadius * Math.sin((angle * Math.PI) / 180);
            const x2 = centerX + innerRadius * Math.cos((angle * Math.PI) / 180);
            const y2 = centerY + innerRadius * Math.sin((angle * Math.PI) / 180);

            return (
              <Line
                key={`hour-mark-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isMainHour ? "#e95a0c" : "#cbd5e0"}
                strokeWidth={isMainHour ? 3 : 2}
                strokeLinecap="round"
              />
            );
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const hour = i + 1;
            const angle = (hour * 30) - 90;
            const x = centerX + 60 * Math.cos((angle * Math.PI) / 180);
            const y = centerY + 60 * Math.sin((angle * Math.PI) / 180);
            const isCurrentHour = hour === currentHour12;

            return (
              <SvgText
                key={`number-${hour}`}
                x={x} y={y}
                textAnchor="middle"
                alignmentBaseline="central"
                fontSize={isCurrentHour ? 18 : 16}
                fontWeight={isCurrentHour ? "700" : "600"}
                fill={isCurrentHour ? "#e95a0c" : "#2d3748"}
              >
                {hour}
              </SvgText>
            );
          })}
          <Line
            x1={centerX} y1={centerY}
            x2={minuteHandX} y2={minuteHandY}
            stroke="#e95a0c"
            strokeWidth={dragType === 'minute' ? 4 : 3}
            strokeLinecap="round"
          />
          <Line
            x1={centerX} y1={centerY}
            x2={hourHandX} y2={hourHandY}
            stroke="#2d3748"
            strokeWidth={dragType === 'hour' ? 5 : 4}
            strokeLinecap="round"
          />
          <Circle
            cx={centerX}
            cy={centerY}
            r={8}
            fill="#e95a0c"
            stroke="#ffffff"
            strokeWidth={3}
          />
        </Svg>
      </View>

      <View style={styles.instructionsContainer}>
        <View style={styles.instructionRow}>
          <Ionicons name="time-outline" size={16} color="#e95a0c" />
          <Text style={styles.instructionText}>
            Toca la hora naranja para escribir directamente
          </Text>
        </View>
        <View style={styles.instructionRow}>
          <View style={[styles.colorIndicator, { backgroundColor: '#2d3748' }]} />
          <Text style={styles.instructionText}>
            O arrastra las manecillas del reloj
          </Text>
        </View>
      </View>
    </View>
  );
};
const getTokenAsync = async () => {
  const TOKEN_KEY = 'adminAuthToken';
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    console.error("Error al obtener el token:", e);
    return null;
  }
};

const formatCurrency = (value) => `Bs ${Number(value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

const TablaPresupuesto = ({
  titulo,
  items,
  setItems,
  totalGeneral,
  handlePresupuestoChange,
  eliminarFilaPresupuesto,
  agregarFilaPresupuesto
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

const GoogleStyleCalendarView = ({ fechaHoraSeleccionada, setFechaHoraSeleccionada, eventos }) => {
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
      days.push({
        date: prevDate,
        isCurrentMonth: false
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false
      });
    }
    return days;
  };

  const getEventsForDay = (date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return eventos.filter(evento => 
      dayjs(evento.fechaevento).format('YYYY-MM-DD') === dateStr
    );
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
      <View style={styles.calendarHeader}>
        <TouchableOpacity 
          onPress={() => navigateMonth(-1)}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={24} color="#e95a0c" />
        </TouchableOpacity>
        <Text style={styles.monthYearText}>
          {dayjs(fechaHoraSeleccionada).format('MMMM YYYY').toUpperCase()}
        </Text>
        <TouchableOpacity 
          onPress={() => navigateMonth(1)}
          style={styles.navButton}
        >
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
          const isSelected = dayjs(fechaHoraSeleccionada).format('YYYY-MM-DD') === 
                           dayjs(day.date).format('YYYY-MM-DD');
          const isToday = dayjs().format('YYYY-MM-DD') === 
                         dayjs(day.date).format('YYYY-MM-DD');

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
                    <View style={[
                      styles.eventDot,
                      { backgroundColor: dayEvents.length > 1 ? '#ff6b6b' : '#e95a0c' }
                    ]} />
                    {dayEvents.length > 1 && (
                      <Text style={styles.eventCount}>+{dayEvents.length - 1}</Text>
                    )}
                  </View>
                )}
                {dayEvents.length > 0 && isSelected && (
                  <View style={styles.eventPreview}>
                    {dayEvents.slice(0, 2).map((evento, idx) => (
                      <Text key={idx} style={styles.eventPreviewText}>
                        {dayjs(evento.horaevento, 'HH:mm:ss').format('HH:mm')} {evento.nombreevento}
                      </Text>
                    ))}
                    {dayEvents.length > 2 && (
                      <Text style={styles.eventPreviewMore}>
                        +{dayEvents.length - 2} más
                      </Text>
                    )}
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
            <Text style={styles.modalMessage}>
              Se detectó un conflicto con el siguiente evento:
            </Text>
            <View style={styles.conflictEventCard}>
              <Text style={styles.conflictEventTitle}>
                {conflictoDetectado.nombreevento}
              </Text>
              <Text style={styles.conflictEventDetails}>
                {dayjs(conflictoDetectado.horaevento, 'HH:mm:ss').format('HH:mm')} - {conflictoDetectado.lugarevento}
              </Text>
              <Text style={styles.conflictEventResponsible}>
                Responsable: {conflictoDetectado.responsable_evento}
              </Text>
            </View>
            <Text style={styles.modalWarning}>
              Se recomienda mantener al menos 2 horas de separación entre eventos.
            </Text>
          </View>
        )}
        <View style={styles.modalButtons}>
          <TouchableOpacity 
            style={styles.modalButtonSecondary} 
            onPress={() => setShowConflictModal(false)}
          >
            <Text style={styles.modalButtonSecondaryText}>
              Elegir otra hora
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.modalButtonPrimary} 
            onPress={() => {
              setShowConflictModal(false);
              setConflictoDetectado(null);
            }}
          >
            <Text style={styles.modalButtonPrimaryText}>
              Continuar
            </Text>
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
        <Text style={styles.eventosDelDiaTitle}>
          Eventos en {dayjs(fechaHoraSeleccionada).format('DD/MM/YYYY')}
        </Text>
        <View style={styles.eventCountBadge}>
          <Text style={styles.eventCountText}>{eventosDelDia.length}</Text>
        </View>
      </View>
      <ScrollView 
        style={styles.eventsList} 
        showsVerticalScrollIndicator={false}
      >
        {eventosDelDia.map((evento, index) => {
          const horaEvento = dayjs(evento.horaevento, 'HH:mm:ss');
          const isConflict = verificarConflictoHorario(
            dayjs(fechaHoraSeleccionada).format('YYYY-MM-DD') + 'T' + 
            dayjs(fechaHoraSeleccionada).format('HH:mm:ss')
          ).some(e => e.id === evento.id);

          return (
            <View key={index} style={[
              styles.eventoCard,
              isConflict && styles.eventoCardConflict
            ]}>
              <View style={styles.eventoCardHeader}>
                <View style={styles.eventoTimeContainer}>
                  <Ionicons 
                    name="time-outline" 
                    size={16} 
                    color={isConflict ? "#ff6b6b" : "#e95a0c"} 
                  />
                  <Text style={[
                    styles.eventoTime,
                    isConflict && styles.eventoTimeConflict
                  ]}>
                    {horaEvento.format('HH:mm')}
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
                  <Text style={styles.eventoDetailText}>
                    {evento.responsable_evento}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.eventosDelDiaFooter}>
        <Text style={styles.eventosDelDiaNote}>
          Verifica que tu nuevo evento no genere conflictos de horario
        </Text>
      </View>
    </View>
  );
};

const ProyectoEvento = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [errors, setErrors] = useState({});
  const [eventos, setEventos] = useState([]);
  const [eventosDelDia, setEventosDelDia] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictoDetectado, setConflictoDetectado] = useState(null);

  const [nombreevento, setNombreevento] = useState('');
  const [lugarevento, setLugarevento] = useState('');
  const [nombreResponsable, setNombreResponsable] = useState('');
  const [tiposSeleccionados, setTiposSeleccionados] = useState({});
  const [textoOtroTipo, setTextoOtroTipo] = useState('');
  const [textoTiposSeleccionados, setTextoTiposSeleccionados] = useState('');
  const [recursosDisponibles, setRecursosDisponibles] = useState([]);
  const [recursosSeleccionados, setRecursosSeleccionados] = useState([]);
  const [recursos, setRecursos] = useState(['']);
  const [segmentosTextoPersonalizado, setSegmentosTextoPersonalizado] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  

  const sendAdminNotification = async (eventData) => {
    try {
      const notificationPayload = {
        type: 'nuevo_evento',
        message: `El usuario ha creado un nuevo evento: ${eventData.nombreevento}`,
        eventData: {
          id: eventData.id,
          nombre: eventData.nombreevento,
          fecha: eventData.fechaevento,
          hora: eventData.horaevento,
          lugar: eventData.lugarevento
        },
        timestamp: new Date().toISOString(),
        read: false
      };
       await axios.post(`${API_BASE_URL}/notifications`, notificationPayload, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Notificación enviada al admin');
    } catch (error) {
      console.error('Error al enviar notificación:', error);
    }
  };
const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
    }
  };
  const [fechaHoraSeleccionada, setFechaHoraSeleccionada] = useState(() => {
    if (params.selectedDate) {
      let initialDate = dayjs(params.selectedDate);
      if (params.selectedHour) {
        initialDate = initialDate.hour(parseInt(params.selectedHour, 10)).minute(0).second(0);
      }
      return initialDate.toDate();
    }
    return new Date();
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

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

  const totalEgresos = useMemo(
    () => egresos.reduce((acc, item) => acc + (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0), 0),
    [egresos]
  );
  const totalIngresos = useMemo(
    () => ingresos.reduce((acc, item) => acc + (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0), 0),
    [ingresos]
  );
  const balance = useMemo(() => totalIngresos - totalEgresos, [totalIngresos, totalEgresos]);

  const verificarConflictoHorario = (fechaHora) => {
    const fechaFormateada = dayjs(fechaHora).format('YYYY-MM-DD');
    const horaFormateada = dayjs(fechaHora).format('HH:mm');
    
    const eventosEnMismaFecha = eventos.filter(evento => 
      dayjs(evento.fechaevento).format('YYYY-MM-DD') === fechaFormateada
    );
    
    const conflictos = eventosEnMismaFecha.filter(evento => {
      const horaEvento = dayjs(evento.horaevento, 'HH:mm:ss');
      const horaSeleccionada = dayjs(horaFormateada, 'HH:mm');
      const diferencia = Math.abs(horaEvento.diff(horaSeleccionada, 'minutes'));
      return diferencia < 120;
    });
    
    return conflictos;
  };

  const handleClockTimeChange = (newDate) => {
    const conflictos = verificarConflictoHorario(newDate);
    if (conflictos.length > 0) {
      setConflictoDetectado(conflictos[0]);
      setShowConflictModal(true);
    } else {
      setFechaHoraSeleccionada(newDate);
    }
  };
useEffect(() => {
    if (authToken) {
      fetchNotifications(); // Cargar notificaciones al inicio
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
      try {
        const responseRecursos = await axios.get(`${API_BASE_URL}/recursos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const validResources = responseRecursos.data.filter(recurso => recurso && recurso.id != null);
        setRecursosDisponibles(validResources);

        const responseEventos = await axios.get(`${API_BASE_URL}/eventos`, {
          headers: { Authorization: `Bearer ${token}`,
          'Content-Type':'application/json',
          }
        });
         await sendAdminNotification({
        id: response.data.id,
        ...eventoPayload
      });
        setEventos(responseEventos.data);
        Alert.alert('Éxito', 'El evento ha sido creado correctamente.');
        router.back();
      } catch (error) {
        console.error("Error al cargar datos:", error);
        Alert.alert("Error", "No se pudieron cargar los datos necesarios.");
      } finally {
        setIsLoading(false);
      }
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

  const addResource = () => {
    setRecursos(prev => [...prev, '']);
  };

  const removeResource = (indexToRemove) => {
    setRecursos(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const updateResource = (text, indexToUpdate) => {
    setRecursos(prev => prev.map((resource, index) =>
      index === indexToUpdate ? text : resource
    ));
  };

  const handleInputChange = (field, value) => {
    if (field === 'nombreevento') setNombreevento(value);
    if (field === 'lugarevento') setLugarevento(value);
    if (field === 'nombreResponsable') setNombreResponsable(value);
    if (errors[field]) {
      setErrors(prevErrors => ({ ...prevErrors, [field]: null }));
    }
  };

  const onChangeTimeEventoPrincipal = (event, selectedDate) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const conflictos = verificarConflictoHorario(selectedDate);
      if (conflictos.length > 0) {
        setConflictoDetectado(conflictos[0]);
        setShowConflictModal(true);
      } else {
        setFechaHoraSeleccionada(selectedDate);
      }
    }
  };

  const handleCheckboxChange = (setter, key) => {
    setter(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOtroTextChange = (setter, text) => {
    setter(prev => ({ ...prev, otroTexto: text }));
  };

  const handleResultadoChange = (key, value) => {
    setResultadosEsperados(prev => ({ ...prev, [key]: value }));
  };

  const handlePresupuestoChange = (items, setItems, index, field, value) => {
    const nuevosItems = [...items];
    nuevosItems[index][field] = value;
    setItems(nuevosItems);
  };

  const agregarFilaPresupuesto = (setItems) => {
    setItems(prev => [...prev, { key: `item-${Date.now()}`, descripcion: '', cantidad: '', precio: '' }]);
  };

  const eliminarFilaPresupuesto = (items, setItems, index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRecursoChange = (id) => {
    if (id == null) {
      console.warn("ID de recurso inválido:", id);
      return;
    }
    setRecursosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleTipoEventoChange = (id) => {
    setTiposSeleccionados(prev => {
      const newState = { ...prev };
      if (newState[id]) {
        delete newState[id];
      } else {
        newState[id] = true;
      }
      return newState;
    });
  };

  const handleObjetivoPDIChange = (index, value) => {
    const newObjetivos = [...objetivosPDI];
    newObjetivos[index] = value;
    setObjetivosPDI(newObjetivos);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!nombreevento.trim()) newErrors.nombreevento = 'El nombre del evento es obligatorio.';
    if (!lugarevento.trim()) newErrors.lugarevento = 'El lugar del evento es obligatorio.';
    if (!nombreResponsable.trim()) newErrors.nombreResponsable = 'El nombre del responsable es obligatorio.';
    if (Object.values(tiposSeleccionados).every(v => !v)) newErrors.tipos = 'Selecciona al menos un tipo de evento.';
    if (Object.values(objetivos).every(v => !v)) newErrors.objetivos = 'Selecciona al menos un objetivo.';
    if (!argumentacion.trim()) newErrors.argumentacion = 'La argumentación es obligatoria.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Formulario Incompleto', 'Por favor, corrige los campos marcados en rojo.');
      return;
    }
    setShowConfirmModal(true);
  };
   

    const handleSubmitConfirmed= async()=>{
      setShowConfirmModal(false);
      setIsLoading(true);
      
      if (!authToken) {
      Alert.alert("Error de Autenticación", "No se puede enviar el formulario. Intenta iniciar sesión de nuevo.");
      setIsLoading(false);
      return;
      }
    try {
      const tiposParaEnviar = Object.keys(tiposSeleccionados)
        .filter(id => tiposSeleccionados[id])
        .map(id => {
          const tipoObjeto = TIPOS_DE_EVENTO.find(tipo => tipo.id === id);
          return tipoObjeto ? { id: parseInt(id, 10), texto_personalizado: id === '5' && textoOtroTipo.trim() !== '' ? textoOtroTipo.trim() : undefined } : null;
        })
        .filter(item => item !== null);

      const objetivoParaEnviar = Object.keys(objetivos)
        .filter(key => objetivos[key] === true && key !== 'otroTexto')
        .map(key => {
          const obj = { id: OBJETIVOS_EVENTO_MAP[key] };
          if (key === 'otro' && objetivos.otroTexto.trim()) {
            obj.texto_personalizado = objetivos.otroTexto.trim();
          }
          return obj;
        });

      const segmentosParaEnviar = [];
      const validKeys = ['estudiantes', 'docentes', 'publicoExterno', 'influencers'];
      Object.keys(segmentoObjetivo)
        .filter(key => segmentoObjetivo[key] === true && validKeys.includes(key))
        .forEach(key => {
          const label = {
            estudiantes: 'Estudiantes',
            docentes: 'Docentes',
            publicoExterno: 'Público Externo',
            influencers: 'Influencers'
          }[key];
          const segmentoData = SEGMENTO_OBJETIVO.find(s => s.label === label);
          if (segmentoData) {
            segmentosParaEnviar.push({
              id: parseInt(segmentoData.id, 10),
              texto_personalizado: segmentosTextoPersonalizado[key] || null
            });
          }
        });

      const recursosParaEnviar = recursosSeleccionados
        .filter(id => id != null)
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id));

      const nuevosRecursos = recursos
        .map(texto => texto.trim())
        .filter(texto => texto.length > 0)
        .map(texto => ({
          nombre_recurso: texto,
          recurso_tipo: 'Material/Técnico/Tercero'
        }));

      const eventoPayload = {
        nombreevento,
        lugarevento,
        responsable_evento: nombreResponsable,
        fechaevento: dayjs(fechaHoraSeleccionada).format('YYYY-MM-DD'),
        horaevento: dayjs(fechaHoraSeleccionada).format('HH:mm:ss'),
        argumentacion: argumentacion || null,
        objetivos_pdi: objetivosPDI.filter(o => o.trim() !== '').length > 0 ? JSON.stringify(objetivosPDI.filter(o => o.trim() !== '')) : null,
        resultados_esperados: JSON.stringify(resultadosEsperados),
        tipos_de_evento: tiposParaEnviar,
        objetivos: objetivoParaEnviar,
        segmentos_objetivo: segmentosParaEnviar,
        recursos: recursosParaEnviar,
        recursos_nuevos: nuevosRecursos
      };

      const response = await axios.post(`${API_BASE_URL}/eventos`, eventoPayload, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('Éxito', 'El evento ha sido creado correctamente.');
      router.back();
    } catch (error) {
      let errorMessage = "Ocurrió un error desconocido.";
      if (error.response) {
        errorMessage = error.response.data.message || error.response.data.error || `Error del servidor: ${error.response.status}.`;
      } else if (error.request) {
        errorMessage = "No se pudo conectar con el servidor. Revisa tu conexión a internet y la URL de la API.";
      } else {
        errorMessage = `Error en la configuración de la petición: ${error.message}`;
      }
      Alert.alert('Error al crear el evento', errorMessage);
    } finally {
      setIsLoading(false);
    }
   
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
          <Text style={styles.confirmModalDetail}>
            <Text style={styles.detailLabel}>Nombre: </Text>{formData.nombreevento}
          </Text>
          <Text style={styles.confirmModalDetail}>
            <Text style={styles.detailLabel}>Fecha: </Text>
            {dayjs(formData.fechaHoraSeleccionada).format('DD/MM/YYYY')}
          </Text>
          <Text style={styles.confirmModalDetail}>
            <Text style={styles.detailLabel}>Hora: </Text>
            {dayjs(formData.fechaHoraSeleccionada).format('HH:mm')}
          </Text>
          <Text style={styles.confirmModalDetail}>
            <Text style={styles.detailLabel}>Lugar: </Text>{formData.lugarevento}
          </Text>
          <Text style={styles.confirmModalDetail}>
            <Text style={styles.detailLabel}>Responsable: </Text>{formData.nombreResponsable}
          </Text>
        </View>
        
        <View style={styles.confirmModalButtons}>
          <TouchableOpacity 
            style={[styles.confirmModalButton, styles.confirmModalButtonCancel]} 
            onPress={() => setShowConfirmModal(false)}
          >
            <Text style={styles.confirmModalButtonTextCancel}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.confirmModalButton, styles.confirmModalButtonConfirm]} 
            onPress={handleSubmitConfirmed}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmModalButtonTextConfirm}>Sí, Crear Evento</Text>
            )}
          </TouchableOpacity>
           <NotificationsModal
        visible={NotificationsModal}
        onClose={() => NotificationsModal(false)}
        notifications={notifications}
      />
      <ConfirmModal 
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        handleSubmitConfirmed={handleSubmitConfirmed}
        isLoading={isLoading}
        formData={{
          nombreevento,
          lugarevento,
          nombreResponsable,
          fechaHoraSeleccionada
        }}
      />
      <ConflictModal
        showConflictModal={showConflictModal}
        setShowConflictModal={setShowConflictModal}
        conflictoDetectado={conflictoDetectado}
        setConflictoDetectado={setConflictoDetectado}
      />
        </View>
      </View>
    </View>
  </Modal>
);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>I. DATOS GENERALES</Text>
          <Text style={styles.label}>Nombre del Evento</Text>
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

          <Text style={styles.label}>Lugar del Evento</Text>
          <View style={[styles.inputGroup, errors.lugarevento && styles.inputError]}>
            <Ionicons name="location-outline" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={lugarevento}
              onChangeText={(text) => handleInputChange('lugarevento', text)}
              placeholder="Lugar del evento"
            />
          </View>
          {errors.lugarevento && <Text style={styles.errorText}>{errors.lugarevento}</Text>}

          <Text style={styles.label}>Responsable del Evento</Text>
          <View style={[styles.inputGroup, errors.nombreResponsable && styles.inputError]}>
            <Ionicons name="person-outline" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={nombreResponsable}
              onChangeText={(text) => handleInputChange('nombreResponsable', text)}
              placeholder="Nombre del responsable"
            />
          </View>
          {errors.nombreResponsable && <Text style={styles.errorText}>{errors.nombreResponsable}</Text>}

          <Text style={styles.label}>Fecha de Realización</Text>
          <GoogleStyleCalendarView
            fechaHoraSeleccionada={fechaHoraSeleccionada}
            setFechaHoraSeleccionada={setFechaHoraSeleccionada}
            eventos={eventos}
          />

          <EventosDelDiaMejorado
            eventosDelDia={eventosDelDia}
            fechaHoraSeleccionada={fechaHoraSeleccionada}
            verificarConflictoHorario={verificarConflictoHorario}
          />

          <Text style={styles.label}>Hora de Realización</Text>
          {Platform.OS === 'web' ? (
            <InteractiveClockPicker
              value={fechaHoraSeleccionada}
              onChange={handleClockTimeChange}
            />
          ) : (
            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}>
              <Ionicons name="time-outline" size={20} color="#888" style={{ marginRight: 10 }} />
              <Text style={styles.datePickerText}>
                {dayjs(fechaHoraSeleccionada).format('HH:mm')}
              </Text>
            </TouchableOpacity>
          )}

          {Platform.OS !== 'web' && showTimePicker && (
            <DateTimePicker
              value={fechaHoraSeleccionada}
              mode="time"
              is24Hour={true}
              display="clock"
              onChange={onChangeTimeEventoPrincipal}
            />
          )}

          <Text style={styles.label}>Tipo de Evento (puede seleccionar más de un tipo)</Text>
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
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>II. OBJETIVOS</Text>
          <Text style={styles.label}>Objetivos de Evento (puede seleccionar más de un objetivo):</Text>
          {[
            { key: 'modeloPedagogico', label: 'Modelo Pedagógico' },
            { key: 'posicionamiento', label: 'Posicionamiento' },
            { key: 'internacionalizacion', label: 'Internacionalización' },
            { key: 'rsu', label: 'RSU' },
            { key: 'fidelizacion', label: 'Fidelización' }
          ].map((item) => (
            <TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setObjetivos, item.key)}>
              <Ionicons name={objetivos[item.key] ? "checkbox" : "square-outline"} size={24} color={objetivos[item.key] ? "#e95a0c" : "#888"} />
              <Text style={styles.checkboxLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.checkboxRow} onPress={() => handleCheckboxChange(setObjetivos, 'otro')}>
            <Ionicons name={objetivos.otro ? "checkbox" : "square-outline"} size={24} color={objetivos.otro ? "#e95a0c" : "#888"} />
            <Text style={styles.checkboxLabel}>Otro</Text>
          </TouchableOpacity>
          {errors.objetivos && <Text style={styles.errorText}>{errors.objetivos}</Text>}
          {objetivos.otro && (
            <View style={styles.otroInputContainer}>
              <TextInput
                style={styles.input}
                value={objetivos.otroTexto}
                onChangeText={(text) => handleOtroTextChange(setObjetivos, text)}
                placeholder="¿Cuál?"
              />
              {objetivos.otroTexto.trim() && (
                <Text style={styles.selectedText}>Selección: {objetivos.otroTexto}</Text>
              )}
            </View>
          )}

          <Text style={styles.label}>Objetivo(s) del PDI Asociado(s):</Text>
          {objetivosPDI.map((objetivo, index) => (
            <View key={index} style={styles.objetivoPDIRow}>
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

          <Text style={styles.label}>Definición del Segmento Objetivo (puede seleccionar más de un público):</Text>
          {SEGMENTO_OBJETIVO.map((item) => {
            const stateKey = item.label.charAt(0).toLowerCase() + item.label.slice(1).replace(' ', '');
            return (
              <TouchableOpacity key={item.id} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setSegmentoObjetivo, stateKey)}>
                <Ionicons name={segmentoObjetivo[stateKey] ? "checkbox" : "square-outline"} size={24} color={segmentoObjetivo[stateKey] ? "#e95a0c" : "#888"} />
                <Text style={styles.checkboxLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
          {segmentoObjetivo.otro && (
            <View style={styles.otroInputContainer}>
              <TextInput
                style={styles.input}
                value={segmentoObjetivo.otroTexto}
                onChangeText={(text) => handleOtroTextChange(setSegmentoObjetivo, text)}
                placeholder="¿Cuál?"
              />
              {segmentoObjetivo.otroTexto.trim() && (
                <Text style={styles.selectedText}>Selección: {segmentoObjetivo.otroTexto}</Text>
              )}
            </View>
          )}

          <Text style={styles.label}>Argumentación:</Text>
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
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>III. RESULTADOS ESPERADOS</Text>
          <View style={styles.resultadoRow}>
            <Text style={styles.resultadoLabel}>Participación Efectiva</Text>
            <TextInput
              style={styles.resultadoInput}
              placeholder="Ej: 150"
              value={resultadosEsperados.participacion}
              onChangeText={(text) => handleResultadoChange('participacion', text)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.resultadoRow}>
            <Text style={styles.resultadoLabel}>Índice de Satisfacción</Text>
            <TextInput
              style={styles.resultadoInput}
              placeholder="Ej: 90% de satisfacción"
              value={resultadosEsperados.satisfaccion}
              onChangeText={(text) => handleResultadoChange('satisfaccion', text)}
            />
          </View>
          <View style={styles.resultadoRow}>
            <Text style={styles.resultadoLabel}>Otro</Text>
            <TextInput
              style={styles.resultadoInput}
              placeholder="Otro resultado medible"
              value={resultadosEsperados.otro}
              onChangeText={(text) => handleResultadoChange('otro', text)}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>IV. COMITÉ DEL EVENTO</Text>
          <Text style={styles.comiteDescription}>
            Grupo de personas conformado por responsables de diferentes áreas de la Universidad cuya participación es fundamental para el éxito del evento, conformado básicamente por el Director Administrativo Financiero, el Director de Marketing y Admisiones y el Organizador.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>V. RECURSOS NECESARIOS</Text>
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Recursos Adicionales Requeridos</Text>
            <Text style={styles.subsectionDescription}>
              Describe recursos que no están disponibles en la universidad y necesitas solicitar, comprar o contratar:
            </Text>
            {recursos.map((resource, index) => (
              <View key={index} style={styles.resourceInputGroup}>
                <Ionicons name="cube-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.resourceInput}
                  placeholder={`Recurso ${index + 1}`}
                  placeholderTextColor="#999"
                  value={resource}
                  onChangeText={(text) => updateResource(text, index)}
                />
                {recursos.length > 1 && (
                  <TouchableOpacity onPress={() => removeResource(index)} style={styles.removeButton}>
                    <Ionicons name="remove-circle-outline" size={24} color="red" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={addResource} style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={24} color="#007bff" />
              <Text style={styles.addButtonText}>Agregar otro recurso</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>VI. PRESUPUESTO</Text>
          <TablaPresupuesto
            titulo="EGRESOS"
            items={egresos}
            setItems={setEgresos}
            totalGeneral={totalEgresos}
            handlePresupuestoChange={handlePresupuestoChange}
            eliminarFilaPresupuesto={eliminarFilaPresupuesto}
            agregarFilaPresupuesto={agregarFilaPresupuesto}
          />
          <TablaPresupuesto
            titulo="INGRESOS"
            items={ingresos}
            setItems={setIngresos}
            totalGeneral={totalIngresos}
            handlePresupuestoChange={handlePresupuestoChange}
            eliminarFilaPresupuesto={eliminarFilaPresupuesto}
            agregarFilaPresupuesto={agregarFilaPresupuesto}
          />
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceText}>BALANCE ECONÓMICO</Text>
            <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#27ae60' : '#c0392b' }]}>
              {formatCurrency(balance)}
            </Text>
          </View>
        </View>
      </ScrollView>
      <TouchableOpacity onPress={confirmSubmit} disabled={isLoading} style={[styles.submitButton, isLoading && styles.buttonDisabled]}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Crear Proyecto de Evento</Text>}
      </TouchableOpacity>
     <ConfirmModal 
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        handleSubmitConfirmed={handleSubmitConfirmed}
        isLoading={isLoading}
        formData={{
          nombreevento,
          lugarevento,
          nombreResponsable,
          fechaHoraSeleccionada
        }}
/>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
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
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginLeft: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  confirmModalDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confirmModalDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 12,
  },
   confirmModalDetail: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 8,
    lineHeight: 20,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#2d3748',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalButtonCancel: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmModalButtonConfirm: {
    backgroundColor: '#e95a0c',
  },
  confirmModalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  confirmModalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
   keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: '#F4F7F9'
  },
  scrollView: {
    flex: 1
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 60,
    flexGrow: 1
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
    marginHorizontal: -20,
    marginTop: -20,
    paddingTop: 15,
    paddingHorizontal: 20
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500'
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 15
  },
  inputError: {
    borderColor: 'red'
  },
  errorText: {
    color: 'red',
    marginLeft: 10,
    marginBottom: 10,
    fontSize: 12
  },
  inputIcon: {
    paddingHorizontal: 12,
    color: '#888'
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    paddingRight: 15,
    fontSize: 16,
    color: '#333'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 15
  },
  datePickerText: {
    fontSize: 16,
    color: '#333'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333'
  },
  otroInputContainer: {
    marginLeft: 36,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F9FA'
  },
  objetivoPDIRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  objetivoPDINumber: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
    marginTop: 12,
    fontWeight: '500'
  },
  objetivoPDIInput: {
    flex: 1,
    backgroundColor: '#F4F7F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 50
  },
  resultadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  resultadoLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  resultadoInput: {
    flex: 2,
    backgroundColor: '#F4F7F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333'
  },
  comiteDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'justify'
  },
  tablaContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 25,
    padding: 5
  },
  tablaTitulo: {
    textAlign: 'center',
    fontWeight: 'bold',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7
  },
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 5,
    paddingVertical: 8
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 12
  },
  tablaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 2
  },
  rowText: {
    paddingHorizontal: 5,
    fontSize: 12
  },
  rowInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 4,
    margin: 2,
    fontSize: 12,
    backgroundColor: '#fff'
  },
  deleteButtonSmall: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addButtonSmall: {
    padding: 8
  },
  addButtonTextSmall: {
    color: '#007BFF',
    textAlign: 'center'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7
  },
  totalText: {
    fontWeight: 'bold',
    marginRight: 20
  },
  totalAmount: {
    fontWeight: 'bold'
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10
  },
  balanceText: {
    fontWeight: 'bold',
    fontSize: 16
  },
  balanceAmount: {
    fontWeight: 'bold',
    fontSize: 16
  },
  submitButton: {
    backgroundColor: '#e95a0c',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  buttonDisabled: {
    backgroundColor: '#f9bda3'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  clockContainer: {
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
  },
  digitalDisplay: {
    backgroundColor: '#e95a0c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#d35400',
    shadowColor: '#d35400',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  digitalTime: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: '#efebe8ff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  timeInput: {
    width: 40,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff',
    marginHorizontal: 5,
  },
  confirmButton: {
    marginLeft: 10,
  },
  instructionsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  colorIndicator: {
    width: 12,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  instructionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginLeft: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  periodButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  periodButtonActive: {
    backgroundColor: '#e95a0c',
  },
  periodText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  subsection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subsectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    lineHeight: 18,
  },
  resourceInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 10,
    paddingRight: 10,
  },
  resourceInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    paddingRight: 15,
    fontSize: 16,
    color: '#333'
  },
  removeButton: {
    padding: 5
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  addButtonText: {
    color: '#007bff',
    fontSize: 16,
    marginLeft: 5
  },
  googleCalendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden'
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 1
  },
  weekDaysHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  weekDayCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff'
  },
  dayCell: {
    width: '14.28%',
    minHeight: 80,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#e8e8e8',
    paddingTop: 8,
    paddingHorizontal: 4
  },
  dayCellInactive: {
    backgroundColor: '#f8f9fa'
  },
  dayCellSelected: {
    backgroundColor: '#fff5f0'
  },
  dayCellToday: {
    backgroundColor: '#e8f4fd'
  },
  dayCellContent: {
    flex: 1,
    alignItems: 'center'
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4
  },
  dayNumberInactive: {
    color: '#999'
  },
  dayNumberSelected: {
    color: '#e95a0c',
    fontWeight: 'bold'
  },
  dayNumberToday: {
    backgroundColor: '#2196f3',
    color: 'white',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden'
  },
  eventIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2
  },
  eventCount: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500'
  },
  eventPreview: {
    marginTop: 4,
    width: '100%'
  },
  eventPreviewText: {
    fontSize: 8,
    color: '#333',
    marginBottom: 1,
    textAlign: 'center'
  },
  eventPreviewMore: {
    fontSize: 8,
    color: '#e95a0c',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  eventosDelDiaContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden'
  },
  eventosDelDiaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  eventosDelDiaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1
  },
  eventCountBadge: {
    backgroundColor: '#e95a0c',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
    eventCountText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  eventsList: {
    maxHeight: 200,
    paddingHorizontal: 16,
  },
  eventoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventoCardConflict: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  eventoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventoTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventoTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e95a0c',
    marginLeft: 4,
  },
  eventoTimeConflict: {
    color: '#ff6b6b',
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  conflictBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    marginLeft: 4,
    fontWeight: '600',
  },
  eventoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventoDetails: {
    marginLeft: 4,
  },
  eventoDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventoDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  eventosDelDiaFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  eventosDelDiaNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  conflictEventCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  conflictEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  conflictEventDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  conflictEventResponsible: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalWarning: {
    fontSize: 12,
    color: '#ff6b6b',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonSecondary: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  modalButtonPrimary: {
    backgroundColor: '#e95a0c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedText: {
    fontSize: 14,
    color: '#e95a0c',
    marginTop: 5,
    marginLeft: 10,
  },
    notificationsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationsList: {
    flex: 1,
  },
  noNotificationsText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationIcon: {
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
});

export default ProyectoEvento;