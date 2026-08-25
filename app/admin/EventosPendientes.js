import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity, StatusBar,
  Alert, ActivityIndicator, RefreshControl, Platform, Dimensions,TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
//const API_BASE_URL = 'https://evento.cidtec-uc.com';
const API_BASE_URL = 'https://unibackend-production.up.railway.app';//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

const COLORS = {
  primary: '#E95A0C', primaryLight: '#FF7A3D', accent: '#4CAF50',
  background: '#F8F9FA', surface: '#FFFFFF', success: '#2E7D32',
  warning: '#FFA726', danger: '#E53935', info: '#3498db', purple: '#9b59b6',
  blue: '#2196F3', white: '#FFFFFF', grayLight: '#E0E0E0',
  grayMedium: '#BDBDBD', grayText: '#757575', darkText: '#212121',
  cardShadow: '#000000', border: '#E8E8E8', pendingOrange: '#FF9800',
  pendingLight: '#FFF3E0',
};

  const DIAS_MINIMOS_APROBACION = 7;

const canApproveEvent = (eventDate) => {
  const days = getDaysRemaining(eventDate);
  return days !== null && days >= DIAS_MINIMOS_APROBACION;
};
const getDaysRemaining = (eventDate) => {
  if (!eventDate) return null;
  const today = new Date(); 
  today.setHours(0, 0, 0, 0);
  let eventDateObj;
  
  if (typeof eventDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(eventDate)) {
      // ✅ FIX: parseo local en lugar de UTC para evitar desfase de zona horaria
      const datePart = eventDate.substring(0, 10);
      const [year, month, day] = datePart.split('-').map(Number);
      eventDateObj = new Date(year, month - 1, day);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(eventDate)) {
      const [day, month, year] = eventDate.split('/').map(Number);
      eventDateObj = new Date(year, month - 1, day);
    } else { 
      eventDateObj = new Date(eventDate); 
    }
  } else { 
    eventDateObj = new Date(eventDate); 
  }
  
  if (isNaN(eventDateObj.getTime())) {
    console.warn('⚠️ Fecha inválida:', eventDate);
    return null;
  }
  
  eventDateObj.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((eventDateObj - today) / (1000 * 60 * 60 * 24));
  return diffDays;
};

const isEventExpired = (eventDate) => {
  if (!eventDate) return false;
  const daysRemaining = getDaysRemaining(eventDate);
  return daysRemaining !== null && daysRemaining < 0;
};

const formatSubmittedDate = (date) => {
  if (!date) return 'Sin fecha';
  const now = new Date();
  let submittedDate = new Date(date);

  // Si el parseo falla o da fecha futura (ej. formato dd/mm/yyyy mal interpretado)
  if (isNaN(submittedDate.getTime()) || submittedDate > now) {
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(date)) {
      const parts = date.substring(0, 10).split('/');
      const [day, month, year] = parts.map(Number);
      submittedDate = new Date(year, month - 1, day);
    }
  }

  if (isNaN(submittedDate.getTime())) return 'Sin fecha';

  const diff = Math.floor((now - submittedDate) / 1000);
  if (diff < 0) return 'Recién creado';
  if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff/3600)} h`;
  const days = Math.floor(diff / 86400);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const deleteTokenAsync = async () => {
  try {
    if (Platform.OS === 'web') localStorage.removeItem(TOKEN_KEY);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) { console.error("Error al eliminar token:", e); }
};

const PendingEventCard = ({ event,userRole, onView, onApprove, onReject, onMarkExpired, onMarkCancelled }) => {
  
  const fechaEvento = event.fechaevento || event.date;
  const daysRemaining = getDaysRemaining(fechaEvento);
  const isAlreadyExpired = daysRemaining !== null && daysRemaining < 0;
  const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;
  const isApprovalAllowed = canApproveEvent(fechaEvento);
  console.log(`🔍 Evento ${event.idevento}:`, {
    fecha: fechaEvento,
    daysRemaining,
    isExpired: isAlreadyExpired,
    isUrgent,
    isApprovalAllowed
  });

  const getStatusBadge = () => {
    if (isAlreadyExpired) return { text:'VENCIDO', icon:'close-circle', bg:COLORS.danger, color:COLORS.white };
    if (isUrgent) return { text:`⚠️ ${daysRemaining}d`, icon:'warning', bg:COLORS.warning, color:COLORS.white };
    return { text:'Pendiente', icon:'time', bg:COLORS.pendingOrange, color:COLORS.white };
  };
  const badge = getStatusBadge();
  const isAdmin = userRole === 'admin' || userRole === 'administrador';

  return (
    <View style={[styles.eventCard, isAlreadyExpired && styles.eventCardExpired]}>
      <View style={styles.eventHeader}>
        <View style={styles.titleContainer}>
          <Text style={[styles.eventTitle, isAlreadyExpired && styles.eventTitleExpired]} numberOfLines={2}>
            {event.nombreevento || event.title || 'Sin título'}
          </Text>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>#{event.idevento || event.id}</Text>
          </View>
        </View>
        <View style={[styles.pendingBadge, { backgroundColor: badge.bg }]}>
          <Ionicons name={badge.icon} size={14} color={badge.color} />
          <Text style={[styles.pendingText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      </View>

      {(isUrgent || isAlreadyExpired) && (
        <View style={[styles.expiredAlert, { 
          backgroundColor: isAlreadyExpired ? '#FFEBEE' : '#FFF8E1',
          borderLeftColor: isAlreadyExpired ? COLORS.danger : COLORS.warning 
        }]}>
          <Ionicons name="alert-circle" size={16} color={isAlreadyExpired ? COLORS.danger : COLORS.warning} />
          <Text style={[styles.expiredAlertText, { color: isAlreadyExpired ? COLORS.danger : COLORS.warning }]}>
            {isAlreadyExpired 
              ? `Vencido hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining)!==1?'s':''}`
              : daysRemaining === 0 ? '¡Se ejecuta hoy! Revisar urgentemente'
              : `Se ejecuta en ${daysRemaining} día${daysRemaining!==1?'s':''}`}
          </Text>
        </View>
      )}
      {!isAlreadyExpired && !isApprovalAllowed && daysRemaining !== null && daysRemaining >= 0 && (
        <View style={[styles.expiredAlert, { backgroundColor: '#E3F2FD', borderLeftColor: COLORS.info }]}>
          <Ionicons name="lock-closed" size={16} color={COLORS.info} />
          <Text style={[styles.expiredAlertText, { color: COLORS.info }]}>
            Aprobación cerrada: faltan menos de {DIAS_MINIMOS_APROBACION} días.
          </Text>
        </View>
      )}
      {(event.descripcion || event.description) && (event.descripcion || event.description) !== 'Sin descripción' && (
        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.descripcion || event.description}
        </Text>
      )}

      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.grayText} />
          <Text style={[styles.infoText, isAlreadyExpired && { color: COLORS.danger, fontWeight:'600' }]}>
            {fechaEvento?.split('T')[0] || 'Sin fecha'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.grayText} />
          <Text style={styles.infoText} numberOfLines={1}>
            {event.lugarevento || event.location || 'Sin ubicación'}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <View style={styles.academicoInfo}>
          <Ionicons name="person-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.academicoName}>
            {event.academico?.nombre || event.organizer || 'Académico'}
          </Text>
        </View>
        <Text style={styles.submittedDate}>
          {formatSubmittedDate(event.submittedDate || event.createdAt)}
        </Text>
      </View>
      {isAdmin && (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={[styles.actionButton, styles.viewButton]} onPress={() => onView(event)}>
          <Ionicons name="eye-outline" size={18} color={COLORS.blue} />
          <Text style={[styles.actionButtonText, { color: COLORS.blue }]}>Ver</Text>
        </TouchableOpacity>
        
               {/* Si NO está vencido, mostrar Aprobar, Rechazar */}
        {!isAlreadyExpired && (
          <>
            {/* ✅ MODIFICADO: Botón Aprobar condicional */}
            {isApprovalAllowed ? (
              <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => onApprove(event)}>
                <Ionicons name="checkmark" size={18} color={COLORS.white} />
                <Text style={[styles.actionButtonText, { color: COLORS.white }]}>Aprobar</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionButton, styles.disabledButton]}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.grayMedium} />
                <Text style={[styles.actionButtonText, { color: COLORS.grayMedium }]}>Cerrado</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => onReject(event)}>
              <Ionicons name="close" size={18} color={COLORS.danger} />
              <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Rechazar</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* Si está vencido, mostrar Archivar */}
        {isAlreadyExpired && (
          <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => onMarkExpired(event)}>
            <Ionicons name="archive-outline" size={18} color={COLORS.white} />
            <Text style={[styles.actionButtonText, { color: COLORS.white }]}>Archivar</Text>
          </TouchableOpacity>
        )}
      </View>
      )}
       {!isAdmin && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.viewButton, { flex: 1 }]} onPress={() => onView(event)}>
            <Ionicons name="eye-outline" size={18} color={COLORS.blue} />
            <Text style={[styles.actionButtonText, { color: COLORS.blue }]}>Ver Detalles</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const EventosPendientes = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userprofile, setUserprofile] = useState({ facultad: null, nombre: '', email: '', role: null });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [eventToReject, setEventToReject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPendingEvents = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) { Alert.alert('Sesión Expirada', 'Inicia sesión de nuevo.'); router.replace('/LoginAdmin'); return; }

      const responseP = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }, timeout: 15000 });
         const profileData = responseP.data;
          console.log('📋 Profile data:', profileData); 
          
          const userRole = profileData.role || 'user'; 
          console.log('🔑 Role del usuario:', userRole);

      setUserprofile({ facultad: responseP.data.facultad,
         nombre: responseP.data.nombre,
         email: responseP.data.email,
        role: userRole });

            const response = await axios.get(`${API_BASE_URL}/eventos/pendientes`, {
        headers: { 'Authorization': `Bearer ${token}` }, timeout: 15000 });
      
      const allPending = Array.isArray(response.data) ? response.data : [];
      
      const pendingNoVencidos = allPending.filter(event => {
        const days = getDaysRemaining(event.fechaevento || event.date);
        return days === null || days >= 0; 
      });

      const sorted = pendingNoVencidos.sort((a,b) => {
        const da = getDaysRemaining(a.fechaevento || a.date) ?? 999;
        const db = getDaysRemaining(b.fechaevento || b.date) ?? 999;
        return da - db;
      });
      
      setEvents(sorted);
    } catch (error) {
      console.error('Error al cargar eventos pendientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los eventos pendientes.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        await deleteTokenAsync(); router.replace('/LoginAdmin');
      }
    } finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useFocusEffect(useCallback(() => { fetchPendingEvents(); }, [fetchPendingEvents]));

  const onRefresh = useCallback(() => { setRefreshing(true); fetchPendingEvents(); }, [fetchPendingEvents]);

  const handleView = (event) => router.push({ pathname:'/admin/EventDetailUpdateScreen', params:{ eventId: event.idevento || event.id }});

const openRejectModal = (event) => {
    setEventToReject(event);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setEventToReject(null);
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el motivo del rechazo');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getTokenAsync();
      if (!token) {
        router.replace('/LoginAdmin');
        return;
      }
      
      const eventId = eventToReject.idevento || eventToReject.id;
      const today = new Date();
      const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      await axios.put(
        `${API_BASE_URL}/eventos/${eventId}/reject`,
        { razon_rechazo: rejectReason.trim(),
          fecha_rechazo: localDate
         },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      
      setEvents(prev => {
        const newEvents = prev.filter(e => (e.idevento || e.id) !== eventId);
        return newEvents;
      });
      
      closeRejectModal();
      
      if (Platform.OS === 'web') {
        window.alert('✓ Evento Rechazado');
      } else {
        Alert.alert('✓ Evento Rechazado');
      }
    } catch (err) {
      console.error('Error al rechazar evento:', err);
      const msg = Platform.OS === 'web' 
        ? `Error ${err.response?.status}: ${err.response?.data?.message || err.message}`
        : 'No se pudo rechazar el evento';
      
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (event, action) => {
    const config = {
      aprobar: { title:'Aprobar', text:'aprobar', success:'✓ Evento Aprobado', endpoint:'approve' },
      rechazar: { title:'Rechazar', text:'rechazar', success:'✓ Evento Rechazado', endpoint:'reject' },
      vencer: { title:'Archivar', text:'archivar', success:'✓ Evento Archivado', endpoint:'expire' },
      cancelar: { title:'Cancelar', text:'cancelar', success:'✓ Evento Cancelado', endpoint:'cancel' }
    }[action];
    
    if (!config) return;
    if (action === 'rechazar') {
      openRejectModal(event);
      return;
    }
    
    try {
      const token = await getTokenAsync();
      if (!token) {
        router.replace('/LoginAdmin');
        return;
      }
      
      const eventId = event.idevento || event.id;
      const endpoint = config.endpoint === 'vencer' ? 'estado' : config.endpoint;
      const payload = config.endpoint === 'vencer' 
        ? { estado: 'vencido' } 
        : config.endpoint === 'cancelar' 
        ? { estado: 'cancelado' } 
        : {};
      
      await axios.put(
        `${API_BASE_URL}/eventos/${eventId}/${endpoint}`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      
      setEvents(prev => {
        const eventId = event.idevento || event.id;
        const newEvents = prev.filter(e => (e.idevento || e.id) !== eventId);
        return newEvents;
      });
      
      if (action === 'aprobar') {
        if (Platform.OS === 'web') {
          if (window.confirm(`${config.success}\n\n¿Ir a eventos aprobados?`)) {
            router.replace('../admin/EventosAprobados');
          }
        } else {
          Alert.alert(config.success, '', [
            { text: 'Ver aprobados', onPress: () => router.replace('../admin/EventosAprobados') }
          ]);
        }
      } else if (Platform.OS === 'web') {
        window.alert(config.success);
      }
    } catch (err) {
      console.error('Error:', err);
      const msg = Platform.OS === 'web' 
        ? `Error ${err.response?.status}: ${err.response?.data?.message || err.message}`
        : `No se pudo ${config.text} el evento`;
      
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };


  // Stats para banner
  const stats = useMemo(() => {
    const urgent = events.filter(e => { const d=getDaysRemaining(e.fechaevento||e.date); return d!==null && d>=0 && d<=3; }).length;
    const expired = events.filter(e => { const d=getDaysRemaining(e.fechaevento||e.date); return d!==null && d<0; }).length;
    return { total: events.length, urgent, expired };
  }, [events]);

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Cargando eventos pendientes...</Text>
    </View>
  );

return (
  <View style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
    
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={()=>router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>Eventos Pendientes</Text>
        <Text style={styles.headerSubtitle}>
          {stats.total} evento{stats.total!==1?'s':''}
          {stats.urgent > 0 && (
            <Text style={{color: COLORS.warning}}> • {stats.urgent} por vencer</Text>
          )}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={onRefresh} 
        disabled={refreshing}
      >
        <Ionicons 
          name="refresh" 
          size={24} 
          color={COLORS.white} 
          style={refreshing && {transform: [{rotate: '360deg'}]}} 
        />
      </TouchableOpacity>
    </View>

    {stats.total > 0 && (
      <View style={styles.summaryBanner}>
        <View style={styles.summaryIconContainer}>
          <Ionicons 
            name={stats.expired>0 ? "alert-circle" : "hourglass-outline"} 
            size={24} 
            color={stats.expired>0 ? COLORS.danger : COLORS.pendingOrange} 
          />
        </View>
        <View style={styles.summaryTextContainer}>
          <Text style={styles.summaryTitle}>
            {stats.expired>0 ? '⚠️ Atención Requerida' : 'Revisión Pendiente'}
          </Text>
          <Text style={styles.summarySubtitle}>
            {stats.expired>0 
              ? `${stats.expired} evento${stats.expired!==1?'s':''} ya vencido${stats.expired!==1?'s':''}` 
              : `${stats.total} evento${stats.total!==1?'s':''} esperando aprobación`}
          </Text>
        </View>
      </View>
    )}

    <FlatList
      data={events}
      renderItem={({item, index}) => {
        console.log(`Renderizando evento ${index}:`, item.idevento || item.id);
        return (
          <PendingEventCard 
            event={item}
            userRole={userprofile.role}
            onView={handleView}
            onApprove={(e)=>handleAction(e,'aprobar')}
            onReject={openRejectModal}
            onMarkExpired={(e)=>handleAction(e,'vencer')}
            onMarkCancelled={(e)=>handleAction(e,'cancelar')}
          />
        );
      }}
      keyExtractor={(item) => {
        const id = item.idevento || item.id;
        return `pending-${id}`;
      }}
      style={styles.eventsList}
      contentContainerStyle={styles.eventsListContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[COLORS.primary]} 
          tintColor={COLORS.primary} 
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={80} color={COLORS.grayMedium} />
          </View>
          <Text style={styles.emptyTitle}>¡Todo al día!</Text>
          <Text style={styles.emptyText}>No hay eventos pendientes de aprobación</Text>
        </View>
      }
      removeClippedSubviews={Platform.OS === 'android'}
    />
{showRejectModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Ionicons name="close-circle" size={48} color={COLORS.danger} />
        <Text style={styles.modalTitle}>Rechazar Evento</Text>
        <Text style={styles.modalEventName} numberOfLines={2}>
          {eventToReject?.nombreevento || eventToReject?.title || 'Sin título'}
        </Text>
      </View>
      
      <View style={styles.modalBody}>
        <Text style={styles.modalLabel}>
          Motivo del rechazo <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.reasonInput}
          placeholder="Ingresa el motivo del rechazo..."
          placeholderTextColor={COLORS.grayMedium}
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoFocus
        />
        <Text style={styles.modalHint}>
          {rejectReason.length} caracteres
        </Text>
      </View>
      
      <View style={styles.modalFooter}>
        <TouchableOpacity 
          style={[styles.modalButton, styles.cancelButton]} 
          onPress={closeRejectModal}
          disabled={isSubmitting}
        >
          <Text style={[styles.modalButtonText, {color: COLORS.grayText}]}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modalButton, styles.confirmButton, isSubmitting && styles.buttonDisabled]} 
          onPress={handleRejectSubmit}
          disabled={isSubmitting || !rejectReason.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="close" size={18} color={COLORS.white} />
              <Text style={[styles.modalButtonText, {color: COLORS.white}]}>Rechazar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
  </View>
);
};

const styles = StyleSheet.create({
  archiveButton:{backgroundColor:COLORS.background,borderWidth:1,borderColor:COLORS.danger},
  container:{flex:1,backgroundColor:COLORS.background},
  loadingContainer:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.background},
  loadingText:{marginTop:16,fontSize:16,color:COLORS.grayText,fontWeight:'500'},
  
  // Header
  header:{backgroundColor:COLORS.primary,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:Platform.OS==='ios'?50:16,paddingBottom:16,paddingHorizontal:16,...Platform.select({ios:{shadowColor:COLORS.cardShadow,shadowOffset:{width:0,height:2},shadowOpacity:0.15,shadowRadius:8},android:{elevation:4}})},
  backButton:{padding:8,marginRight:8},
  headerTextContainer:{flex:1},
  headerTitle:{fontSize:20,fontWeight:'bold',color:COLORS.white},
  headerSubtitle:{fontSize:13,color:'rgba(255,255,255,0.8)',marginTop:2},
  refreshButton:{padding:8,marginLeft:8},
  
  summaryBanner:{backgroundColor:COLORS.white,flexDirection:'row',alignItems:'center',marginHorizontal:16,marginTop:16,padding:16,borderRadius:16,borderLeftWidth:4,borderLeftColor:COLORS.pendingOrange,...Platform.select({ios:{shadowColor:COLORS.cardShadow,shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8},android:{elevation:2}})},
  summaryIconContainer:{width:48,height:48,borderRadius:24,backgroundColor:COLORS.pendingLight,justifyContent:'center',alignItems:'center',marginRight:12},
  summaryTextContainer:{flex:1},
  summaryTitle:{fontSize:16,fontWeight:'700',color:COLORS.darkText,marginBottom:2},
  summarySubtitle:{fontSize:13,color:COLORS.grayText},
  
  eventsList:{flex:1},
  eventsListContent:{padding:16},
  
  eventCard:{backgroundColor:COLORS.surface,borderRadius:16,padding:16,marginBottom:16,...Platform.select({ios:{shadowColor:COLORS.cardShadow,shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8},android:{elevation:2}})},
  eventCardExpired:{borderLeftWidth:4,borderLeftColor:COLORS.danger,backgroundColor:COLORS.danger+'08'},
  eventHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12},
  titleContainer:{flex:1,flexDirection:'row',alignItems:'flex-start',marginRight:12},
  eventTitle:{fontSize:17,fontWeight:'700',color:COLORS.darkText,flex:1,marginRight:8},
  eventTitleExpired:{color:COLORS.danger,textDecorationLine:'line-through'},
  idBadge:{backgroundColor:COLORS.background,paddingHorizontal:8,paddingVertical:3,borderRadius:6},
  idText:{fontSize:12,fontWeight:'700',color:COLORS.primary},
  pendingBadge:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:4,borderRadius:12,gap:4},
  pendingText:{fontSize:11,fontWeight:'600',color:COLORS.white},
  
  expiredAlert:{flexDirection:'row',alignItems:'center',padding:10,borderRadius:8,marginBottom:12,borderLeftWidth:3,gap:6},
  expiredAlertText:{fontSize:12,fontWeight:'600',flex:1},
  
  eventDescription:{fontSize:14,color:COLORS.grayText,lineHeight:20,marginBottom:12},
  infoGrid:{flexDirection:'row',justifyContent:'space-between',marginBottom:10,gap:12},
  infoRow:{flexDirection:'row',alignItems:'center',flex:1,gap:6},
  infoText:{fontSize:13,color:COLORS.grayText,fontWeight:'500',flex:1},
  
  footerContainer:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:12,marginBottom:12,borderTopWidth:1,borderTopColor:COLORS.border},
  academicoInfo:{flexDirection:'row',alignItems:'center',gap:6},
  academicoName:{fontSize:12,color:COLORS.grayText,fontWeight:'500'},
  submittedDate:{fontSize:11,color:COLORS.grayMedium},
  
  actionButtonsContainer:{flexDirection:'row',gap:8,paddingTop:12,borderTopWidth:1,borderTopColor:COLORS.border},
  actionButton:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:10,borderRadius:10,gap:6},
  viewButton:{backgroundColor:COLORS.background,borderWidth:1,borderColor:COLORS.blue},
  approveButton:{backgroundColor:COLORS.success},
  rejectButton:{backgroundColor:COLORS.background,borderWidth:1,borderColor:COLORS.danger},
  actionButtonText:{fontSize:13,fontWeight:'600'},
   disabledButton: { 
    backgroundColor: COLORS.grayLight, 
    borderWidth: 1, 
    borderColor: COLORS.grayMedium, 
    opacity: 0.7 
  },
  // Empty
  emptyContainer:{flex:1,justifyContent:'center',alignItems:'center',paddingVertical:80,paddingHorizontal:32},
  emptyIconContainer:{width:120,height:120,borderRadius:60,backgroundColor:COLORS.background,justifyContent:'center',alignItems:'center',marginBottom:20},
  emptyTitle:{fontSize:22,fontWeight:'bold',color:COLORS.darkText,marginBottom:8},
  emptyText:{fontSize:15,color:COLORS.grayText,textAlign:'center',lineHeight:22},
   modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginTop: 8,
  },
  modalEventName: {
    fontSize: 14,
    color: COLORS.grayText,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 8,
  },
  required: {
    color: COLORS.danger,
  },
  reasonInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.darkText,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
  },
  modalHint: {
    fontSize: 12,
    color: COLORS.grayMedium,
    marginTop: 6,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.danger,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

EventosPendientes.options = { headerShown: false };
export default EventosPendientes;