import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, Image
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import dayjs from 'dayjs';

// --- CONFIGURACIÓN API ---
/*let determinedApiBaseUrl;
if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://10.0.2.2:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://localhost:3001/api';
} else { // web y otros
  determinedApiBaseUrl = 'http://localhost:3001/api';
}*/
const API_BASE_URL =  'https://cidtec-uc.com';

// --- CONFIGURACIÓN DE IDIOMA PARA CALENDARIO ---
LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene.','Feb.','Mar.','Abr.','May.','Jun.','Jul.','Ago.','Sep.','Oct.','Nov.','Dic.'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom.','Lun.','Mar.','Mié.','Jue.','Vie.','Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

const getTokenAsync = async () => {
  return "un-token-jwt-valido-que-te-da-el-backend";
};

const ProyectoEvento = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // --- ESTADOS ---
    const [isLoading, setIsLoading] = useState(false);
    const [authToken, setAuthToken] = useState(null);

    // Estados del formulario
    const [nombreevento, setNombreevento] = useState('');
    const [lugarevento, setLugarevento] = useState('');
    const [nombreResponsable, setNombreResponsable] = useState('');
    const [imagenEvento, setImagenEvento] = useState(null); // URI para mostrar en <Image>
    const [imagenEventoObjeto, setImagenEventoObjeto] = useState(null); // Objeto para enviar
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
    const [argumentacion, setArgumentacion] = useState('');
    const [tipoEvento, setTipoEvento] = useState({ curricular: false, extracurricular: false, marketing: false, internacionalizacion: false, otro: false, otroTexto: '' });
    const [objetivos, setObjetivos] = useState({ modeloPedagogico: false, posicionamiento: false, internacionalizacion: false, rsu: false, fidelizacion: false, otro: false, otroTexto: '' });
    const [resultadosEsperados, setResultadosEsperados] = useState({ participacion: '', satisfaccion: '', otro: '' });
    const [recursosNecesarios, setRecursosNecesarios] = useState('');
    const [egresos, setEgresos] = useState([{ key: 'egreso-1', descripcion: '', cantidad: '', precio: '' }]);
    const [ingresos, setIngresos] = useState([{ key: 'ingreso-1', descripcion: '', cantidad: '', precio: '' }]);
    const [totalEgresos, setTotalEgresos] = useState(0);
    const [totalIngresos, setTotalIngresos] = useState(0);
    const [balance, setBalance] = useState(0);
    const [markedDates, setMarkedDates] = useState({});

    // --- USE EFFECT ---
    useEffect(() => {
        // Obtener el token de autenticación al cargar la pantalla
        const initialize = async () => {
            const token = await getTokenAsync();
            setAuthToken(token);
        };
        initialize();
    }, []);

    useEffect(() => {
      // Calcular totales de presupuesto cada vez que cambian los ingresos/egresos
      const calcularTotal = (items) => items.reduce((acc, item) => acc + ((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0)), 0);
      const totalE = calcularTotal(egresos);
      const totalI = calcularTotal(ingresos);
      setTotalEgresos(totalE);
      setTotalIngresos(totalI);
      setBalance(totalI - totalE);
    }, [egresos, ingresos]);

    // --- HANDLERS (Manejadores de eventos) ---
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImagenEvento(result.assets[0].uri);
            setImagenEventoObjeto(result.assets[0]);
        }
    };

    const onDayPressEventoPrincipal = (day) => {
        const newDate = dayjs(day.dateString).hour(fechaHoraSeleccionada.getHours()).minute(fechaHoraSeleccionada.getMinutes()).toDate();
        setFechaHoraSeleccionada(newDate);
        setMarkedDates({ [day.dateString]: { selected: true, marked: true, selectedColor: '#e95a0c' } });
    };

    const onChangeTimeEventoPrincipal = (event, selectedDate) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setFechaHoraSeleccionada(selectedDate);
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

    const handleSubmit = async () => {
        // 1. Validaciones
        if (!nombreevento.trim() || !nombreResponsable.trim()) {
            Alert.alert('Campos requeridos', 'Por favor, complete el nombre del evento y el responsable.');
            return;
        }
        if (!authToken) {
            Alert.alert("Error de Autenticación", "No se puede enviar el formulario, no se encontró el token de usuario.");
            return;
        }

        setIsLoading(true);

        // 2. Construir FormData
        const formData = new FormData();
        formData.append('nombreevento', nombreevento);
        formData.append('lugarevento', lugarevento);
        formData.append('responsable_evento', nombreResponsable);
        formData.append('fechaHoraSeleccionada', fechaHoraSeleccionada.toISOString());
        formData.append('recursosNecesarios', recursosNecesarios);
        formData.append('tipo_evento', JSON.stringify(tipoEvento));
        formData.append('resultadosEsperados', JSON.stringify(resultadosEsperados));
        formData.append('objetivos', JSON.stringify(objetivos));
        formData.append('argumentacion', argumentacion);
        formData.append('ingresos', JSON.stringify(ingresos));
        formData.append('egresos', JSON.stringify(egresos));
        formData.append('totalIngresos', totalIngresos.toString());
        formData.append('totalEgresos', totalEgresos.toString());
        formData.append('balance', balance.toString());

        if (imagenEventoObjeto) {
            const fileObject = {
                uri: imagenEventoObjeto.uri,
                name: imagenEventoObjeto.fileName || imagenEventoObjeto.uri.split('/').pop(),
                type: imagenEventoObjeto.mimeType || 'image/jpeg',
            };
            formData.append('imagenEvento', fileObject);
        }

        // 3. Enviar a la API
        try {
            const response = await axios.post(`${API_BASE_URL}/eventos`, formData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            Alert.alert('Éxito', 'El evento ha sido creado correctamente.');
            router.back();
        } catch (error) {
            const errorMessage = error.response ? error.response.data.message : error.message;
            Alert.alert('Error', `No se pudo crear el evento: ${errorMessage}`);
            console.error('Error al enviar el formulario:', JSON.stringify(error, null, 2));
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDERIZADO DE COMPONENTES ---
    const formatCurrency = (value) => `Bs ${Number(value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

    const TablaPresupuesto = ({ titulo, items, setItems, totalGeneral }) => (
        <View style={styles.tablaContainer}>
          <Text style={styles.tablaTitulo}>{titulo}</Text>
          <View style={styles.tablaHeader}>
            <Text style={[styles.headerText, { flex: 2.5 }]}>Descripción</Text>
            <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Cant.</Text>
            <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Precio</Text>
            <Text style={[styles.headerText, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
          </View>
          {items.map((item, index) => {
            const totalItem = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0);
            return (
              <View key={item.key} style={styles.tablaRow}>
                <TextInput style={[styles.rowInput, { flex: 2.5 }]} value={item.descripcion} onChangeText={(text) => handlePresupuestoChange(items, setItems, index, 'descripcion', text)} />
                <TextInput style={[styles.rowInput, { flex: 1, textAlign: 'center' }]} value={item.cantidad} onChangeText={(text) => handlePresupuestoChange(items, setItems, index, 'cantidad', text.replace(/[^0-9.]/g, ''))} keyboardType="numeric" />
                <TextInput style={[styles.rowInput, { flex: 1, textAlign: 'center' }]} value={item.precio} onChangeText={(text) => handlePresupuestoChange(items, setItems, index, 'precio', text.replace(/[^0-9.]/g, ''))} keyboardType="numeric" />
                <Text style={[styles.rowText, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(totalItem)}</Text>
                <TouchableOpacity onPress={() => eliminarFilaPresupuesto(items, setItems, index)} style={styles.deleteButtonSmall}><Ionicons name="close-circle" size={20} color="#e74c3c" /></TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity onPress={() => agregarFilaPresupuesto(setItems)} style={styles.addButtonSmall}><Text style={styles.addButtonTextSmall}>+ Añadir Fila</Text></TouchableOpacity>
          <View style={styles.totalRow}><Text style={styles.totalText}>TOTAL</Text><Text style={styles.totalAmount}>{formatCurrency(totalGeneral)}</Text></View>
        </View>
    );

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="always">
                <Stack.Screen options={{ title: 'Proyecto de Evento' }} />

                {/* --- SECCIÓN I: DATOS GENERALES --- */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>I. Datos Generales</Text>
                    <Text style={styles.label}>Nombre del Evento</Text>
                    <View style={styles.inputGroup}><Ionicons name="text-outline" size={20} style={styles.inputIcon} /><TextInput style={styles.input} value={nombreevento} onChangeText={setNombreevento} placeholder="Nombre del evento" /></View>
                    <Text style={styles.label}>Lugar del Evento</Text>
                    <View style={styles.inputGroup}><Ionicons name="location-outline" size={20} style={styles.inputIcon} /><TextInput style={styles.input} value={lugarevento} onChangeText={setLugarevento} placeholder="Lugar (opcional)" /></View>
                    <Text style={styles.label}>Nombre del Responsable</Text>
                    <View style={styles.inputGroup}><Ionicons name="person-outline" size={20} style={styles.inputIcon} /><TextInput style={styles.input} value={nombreResponsable} onChangeText={setNombreResponsable} placeholder="Nombre del responsable" /></View>
                    <Text style={styles.label}>Fecha del Evento</Text>
                    <View style={styles.calendarContainer}><Calendar onDayPress={onDayPressEventoPrincipal} markedDates={markedDates} theme={{ todayTextColor: '#e95a0c', arrowColor: '#e95a0c', selectedDayTextColor: '#ffffff' }} /></View>
                    <Text style={styles.label}>Hora del Evento</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}><Ionicons name="time-outline" size={20} color="#e95a0c" style={{marginRight: 10}} /><Text style={styles.datePickerText}>{fechaHoraSeleccionada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text></TouchableOpacity>
                    {showTimePicker && <DateTimePicker value={fechaHoraSeleccionada} mode="time" is24Hour={true} display="default" onChange={onChangeTimeEventoPrincipal} />}
                    <Text style={styles.label}>Tipo de Evento</Text>
                    {[{ key: 'curricular', label: 'Curricular' }, { key: 'extracurricular', label: 'Extracurricular' }, { key: 'marketing', label: 'Marketing' }, { key: 'internacionalizacion', label: 'Internacionalización' }].map((item) => (<TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setTipoEvento, item.key)}><Ionicons name={tipoEvento[item.key] ? "checkbox" : "square-outline"} size={24} color={tipoEvento[item.key] ? "#e95a0c" : "#888"} /><Text style={styles.checkboxLabel}>{item.label}</Text></TouchableOpacity>))}
                    <TouchableOpacity style={styles.checkboxRow} onPress={() => handleCheckboxChange(setTipoEvento, 'otro')}><Ionicons name={tipoEvento.otro ? "checkbox" : "square-outline"} size={24} color={tipoEvento.otro ? "#e95a0c" : "#888"} /><Text style={styles.checkboxLabel}>Otro</Text></TouchableOpacity>
                    {tipoEvento.otro && (<View style={styles.otroInputContainer}><TextInput style={styles.input} value={tipoEvento.otroTexto} onChangeText={(text) => handleOtroTextChange(setTipoEvento, text)} placeholder="¿Cuál?" /></View>)}
                </View>

                {/* --- SECCIÓN II: OBJETIVOS --- */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>II. Objetivos del Evento</Text>
                    <Text style={styles.label}>Seleccione uno o más objetivos:</Text>
                    {[{ key: 'modeloPedagogico', label: 'Modelo Pedagógico' }, { key: 'posicionamiento', label: 'Posicionamiento' }, { key: 'internacionalizacion', label: 'Internacionalización' }, { key: 'rsu', label: 'RSU' }, { key: 'fidelizacion', label: 'Fidelización' }].map((item) => (<TouchableOpacity key={item.key} style={styles.checkboxRow} onPress={() => handleCheckboxChange(setObjetivos, item.key)}><Ionicons name={objetivos[item.key] ? "checkbox" : "square-outline"} size={24} color={objetivos[item.key] ? "#e95a0c" : "#888"} /><Text style={styles.checkboxLabel}>{item.label}</Text></TouchableOpacity>))}
                    <TouchableOpacity style={styles.checkboxRow} onPress={() => handleCheckboxChange(setObjetivos, 'otro')}><Ionicons name={objetivos.otro ? "checkbox" : "square-outline"} size={24} color={objetivos.otro ? "#e95a0c" : "#888"} /><Text style={styles.checkboxLabel}>Otro</Text></TouchableOpacity>
                    {objetivos.otro && (<View style={styles.otroInputContainer}><TextInput style={styles.input} value={objetivos.otroTexto} onChangeText={(text) => handleOtroTextChange(setObjetivos, text)} placeholder="¿Cuál?" /></View>)}
                    <Text style={styles.label}>Argumentación</Text>
                    <View style={[styles.inputGroup, {alignItems: 'flex-start'}]}><Ionicons name="text-outline" size={20} style={[styles.inputIcon,{paddingTop:14 }]} /><TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={4} placeholder="Breve descripción..." value={argumentacion} onChangeText={setArgumentacion} /></View>
                </View>

                {/* --- SECCIÓN III: RESULTADOS ESPERADOS --- */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>III. Resultados Esperados</Text>
                    <View style={styles.resultadoRow}><Text style={styles.resultadoLabel}>Participación Efectiva</Text><TextInput style={styles.resultadoInput} placeholder="Ej: 150 asistentes" value={resultadosEsperados.participacion} onChangeText={(text) => handleResultadoChange('participacion', text)} /></View>
                    <View style={styles.resultadoRow}><Text style={styles.resultadoLabel}>Índice de Satisfacción</Text><TextInput style={styles.resultadoInput} placeholder="Ej: 90% de satisfacción" value={resultadosEsperados.satisfaccion} onChangeText={(text) => handleResultadoChange('satisfaccion', text)} /></View>
                    <View style={styles.resultadoRow}><Text style={styles.resultadoLabel}>Otro</Text><TextInput style={styles.resultadoInput} placeholder="Otro resultado medible" value={resultadosEsperados.otro} onChangeText={(text) => handleResultadoChange('otro', text)} /></View>
                </View>

                {/* --- SECCIÓN V: RECURSOS --- */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>V. Recursos Necesarios</Text>
                    <View style={[styles.inputGroup, { alignItems: 'flex-start' }]}><Ionicons name="cube-outline" size={20} style={[styles.inputIcon, { paddingTop: 14 }]} /><TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={5} placeholder="Detalle aquí los recursos..." value={recursosNecesarios} onChangeText={setRecursosNecesarios} /></View>
                </View>

                {/* --- SECCIÓN VI: PRESUPUESTO --- */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>VI. Presupuesto</Text>
                    <TablaPresupuesto titulo="EGRESOS" items={egresos} setItems={setEgresos} totalGeneral={totalEgresos} />
                    <TablaPresupuesto titulo="INGRESOS" items={ingresos} setItems={setIngresos} totalGeneral={totalIngresos} />
                    <View style={styles.balanceContainer}><Text style={styles.balanceText}>BALANCE ECONÓMICO</Text><Text style={[styles.balanceAmount, { color: balance >= 0 ? '#27ae60' : '#c0392b' }]}>{formatCurrency(balance)}</Text></View>
                </View>

                {/* --- BOTÓN DE ENVÍO --- */}
                <TouchableOpacity
                  onPress={handleSubmit} 
                  disabled={isLoading} 
                  style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                >
                    {isLoading ? <ActivityIndicator color="#fff" /> : 
                    <Text style={styles.submitButtonText}>Crear Proyecto de Evento</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
    keyboardAvoidingContainer: { flex: 1, backgroundColor: '#F4F7F9' },
    scrollView: { flex: 1 },
    scrollContentContainer: { padding: 20, paddingBottom: 60 },
    formSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, textAlign:'center' },
    label: { fontSize: 14, color: '#555', marginBottom: 8, fontWeight: '500' },
    inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginBottom: 15 },
    inputIcon: { paddingHorizontal: 12, color: '#888' },
    input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 10, paddingRight: 15, fontSize: 16, color: '#333' },
    textArea: { height: 100, textAlignVertical: 'top' },
    calendarContainer: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, overflow: 'hidden', marginTop: 5, marginBottom: 15 },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 15 },
    datePickerText: { fontSize: 16, color: '#333' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    checkboxLabel: { marginLeft: 12, fontSize: 16, color: '#333' },
    otroInputContainer: { marginLeft: 36, marginTop: 5, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#F8F9FA' },
    resultadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    resultadoLabel: { fontSize: 16, color: '#333', flex: 1 },
    resultadoInput: { flex: 2, backgroundColor: '#F4F7F9', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, color: '#333' },
    tablaContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 25, padding: 5 },
    tablaTitulo: { textAlign: 'center', fontWeight: 'bold', padding: 8, backgroundColor: '#f0f0f0', borderTopLeftRadius: 7, borderTopRightRadius: 7 },
    tablaHeader: { flexDirection: 'row', backgroundColor: '#e0e0e0', paddingHorizontal: 5, paddingVertical: 8 },
    headerText: { fontWeight: 'bold', fontSize: 12 },
    tablaRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 2 },
    rowText: { paddingHorizontal: 5, fontSize: 12 },
    rowInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 4, margin: 2, fontSize: 12, backgroundColor: '#fff' },
    deleteButtonSmall: { padding: 4 },
    addButtonSmall: { padding: 8 },
    addButtonTextSmall: { color: '#007BFF', textAlign: 'center' },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, backgroundColor: '#f0f0f0', borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
    totalText: { fontWeight: 'bold', marginRight: 20 },
    totalAmount: { fontWeight: 'bold' },
    balanceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0e0e0', padding: 12, borderRadius: 8, marginTop: 10 },
    balanceText: { fontWeight: 'bold', fontSize: 16 },
    balanceAmount: { fontWeight: 'bold', fontSize: 16 },
    submitButton: { backgroundColor: '#e95a0c', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    buttonDisabled: { backgroundColor: '#f9bda3' },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default ProyectoEvento;