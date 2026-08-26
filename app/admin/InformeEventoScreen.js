import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  TextInput,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  }
};

const COLORS = {
  accent: '#0052A0',
  secondary: '#2980b9',
  primary: '#E95A0C',
  background: '#f8fafc',
  surface: '#ffffff',
  success: '#27ae60',
  warning: '#f39c12',
  info: '#3498db',
  purple: '#9b59b6',
  logout: '#e74c3c',
  white: '#fff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  border: '#e2e8f0',
};

const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateString; }
};

const formatTime = (timeString) => {
  if (!timeString) return 'No especificada';
  return timeString;
};

const emptyEgresoRow = () => ({ descripcion: '', cantidad: '', precio_unitario: '', total: 0 });

const InformeEventoScreen = () => {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  const [event, setEvent] = useState(null);
  const [esperado, setEsperado] = useState(null);

  const [segAlcanzado, setSegAlcanzado] = useState({
    estudiantes: '', docentes: '', publico_externo: '', influencers: '', otro_cual: '', otro_cantidad: '',
  });
  const [objAlcanzado, setObjAlcanzado] = useState({
    modelo_pedagogico: false, posicionamiento: false, internacionalizacion: false,
    rsu: false, fidelizacion: false, otro_cual: '',
  });
  const [participacionReal, setParticipacionReal] = useState('');
  const [satisfaccionReal, setSatisfaccionReal] = useState('');
  const [otrosResultadosReal, setOtrosResultadosReal] = useState('');
  const [egresosReales, setEgresosReales] = useState([emptyEgresoRow()]);
  const [ingresosReales, setIngresosReales] = useState([emptyEgresoRow()]);
  const [infoPrensa, setInfoPrensa] = useState('');
  const [analisisDesviaciones, setAnalisisDesviaciones] = useState('');
  const [leccionesAprendidas, setLeccionesAprendidas] = useState('');
  const [informeFinalizado, setInformeFinalizado] = useState(false);
  const [showInscritos, setShowInscritos] = useState(false);
  const [inscritos, setInscritos] = useState([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        router.replace('/LoginAdmin');
        return;
      }

      const [eventRes, informeRes, userRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/eventos/${eventId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/eventos/${eventId}/informe`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const eventData = eventRes.data;
      const transformedEvent = {
        id: eventData.idevento || null,
        title: eventData.nombreevento || 'Sin título',
        date: formatDate(eventData.fechaevento),
        time: formatTime(eventData.horaevento),
        location: eventData.lugarevento || 'Ubicación no especificada',
        status: (eventData.estado || 'pendiente').toLowerCase(),
        imageUrl: eventData.imagenUrl || null,
        idfase: eventData.idfase || 1,
        responsable: eventData.responsable_evento || eventData.responsable || null,
        actividadesPrevias: eventData.actividadesPrevias || [],
        actividadesDurante: eventData.actividadesDurante || [],
        actividadesPost: eventData.actividadesPost || [],
        serviciosContratados: eventData.serviciosContratados || [],
        layout: eventData.layout || null,
        creador: eventData.creador ? {
          nombre: `${eventData.creador.nombre} ${eventData.creador.apellidopat} ${eventData.creador.apellidomat}`,
          email: eventData.creador.email,
          role: eventData.creador.role
        } : null,
        Clasificacion: eventData.Clasificacion || null,
        tiposEvento: eventData.TiposDeEvento || [],
        objetivosPDI: Array.isArray(eventData.ObjetivosPDI) ? eventData.ObjetivosPDI : [],
        resultados: (eventData.Resultados && eventData.Resultados.length > 0)
          ? eventData.Resultados[0]
          : { participacion_esperada: null, satisfaccion_esperada: null, otros_resultados: null },
        recursos: eventData.Recursos || [],
        comite: eventData.Comite || [],
        presupuesto: eventData.Presupuesto || null,
        egresos: eventData.Egresos || [],
        ingresos: eventData.Ingresos || [],
      };

      setEvent(transformedEvent);
      setEsperado(informeRes.data.esperado);
      const estadoInforme = informeRes.data.informe?.estado;
      const yaFinalizado = estadoInforme === 'finalizado';
      const sinPermisoRol = userRes.data.role !== 'admin' && userRes.data.role !== 'academico';
      setReadOnly(sinPermisoRol || yaFinalizado);

      // Guardá esto también para poder mostrar el mensaje correcto abajo:
      setInformeFinalizado(yaFinalizado);

      const informe = informeRes.data.informe;
      if (informe) {
        setSegAlcanzado({
          estudiantes: String(informe.segmento_alcanzado_estudiantes ?? ''),
          docentes: String(informe.segmento_alcanzado_docentes ?? ''),
          publico_externo: String(informe.segmento_alcanzado_publico_externo ?? ''),
          influencers: String(informe.segmento_alcanzado_influencers ?? ''),
          otro_cual: informe.segmento_alcanzado_otro_cual || '',
          otro_cantidad: String(informe.segmento_alcanzado_otro_cantidad ?? ''),
        });
        setObjAlcanzado({
          modelo_pedagogico: !!informe.objetivo_alcanzado_modelo_pedagogico,
          posicionamiento: !!informe.objetivo_alcanzado_posicionamiento,
          internacionalizacion: !!informe.objetivo_alcanzado_internacionalizacion,
          rsu: !!informe.objetivo_alcanzado_rsu,
          fidelizacion: !!informe.objetivo_alcanzado_fidelizacion,
          otro_cual: informe.objetivo_alcanzado_otro_cual || '',
        });
        setParticipacionReal(informe.participacion_real || '');
        setSatisfaccionReal(informe.indice_satisfaccion_real || '');
        setOtrosResultadosReal(informe.otros_resultados_real || '');
        setEgresosReales(informe.egresos_reales?.length ? informe.egresos_reales : [emptyEgresoRow()]);
        setIngresosReales(informe.ingresos_reales?.length ? informe.ingresos_reales : [emptyEgresoRow()]);
        setInfoPrensa(informe.info_prensa || '');
        setAnalisisDesviaciones(informe.analisis_desviaciones || '');
        setLeccionesAprendidas(informe.lecciones_aprendidas || '');
      }
    } catch (err) {
      setError('Error al cargar los datos: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    if (eventId) fetchAllData();
    else { setError('No se proporcionó un ID de evento.'); setLoading(false); }
  }, [fetchAllData, eventId]);

  const updateRow = (setter, rows, index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'cantidad' || field === 'precio_unitario') {
      const cantidad = parseFloat(updated[index].cantidad) || 0;
      const precio = parseFloat(updated[index].precio_unitario) || 0;
      updated[index].total = cantidad * precio;
    }
    setter(updated);
  };
  const handleFinalizarInforme = async () => {
  Alert.alert(
    'Finalizar Informe',
    '¿Estás seguro de finalizar este informe? El evento pasará a Fase 3 y no podrá ser modificado.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, finalizar',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getTokenAsync();
            if (!token) {
              Alert.alert('Error', 'No hay sesión activa');
              return;
            }

            // Obtener el eventId de los params
            const eventId = route.params?.eventId || eventId;
            
            const response = await axios.put(
              `${API_BASE_URL}/eventos/${eventId}/finalizar-informe`,
              {},
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            Alert.alert(
              '✓ Informe Finalizado',
              response.data.message || 'El evento ha pasado a Fase 3 correctamente.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Opcional: Redirigir o actualizar la vista
                    router.back(); // o router.push('/admin/EventosCompletados')
                  }
                }
              ]
            );
          } catch (error) {
            console.error('❌ Error al finalizar informe:', error);
            Alert.alert(
              'Error',
              error.response?.data?.message || 'No se pudo finalizar el informe. Intenta de nuevo.'
            );
          }
        }
      }
    ]
  );
};
  const addRow = (setter, rows) => setter([...rows, emptyEgresoRow()]);
  const removeRow = (setter, rows, index) => setter(rows.filter((_, i) => i !== index));

  const totalEgresosReal = egresosReales.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
  const totalIngresosReal = ingresosReales.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const balanceReal = totalIngresosReal - totalEgresosReal;

  const totalEgresosEsperado = event?.presupuesto?.total_egresos || 0;
  const totalIngresosEsperado = event?.presupuesto?.total_ingresos || 0;
  const balanceEsperado = event?.presupuesto?.balance || 0;

    const handleGuardar = async (estadoFinal) => {
    console.log('🔵 [handleGuardar] Iniciando guardado. Estado:', estadoFinal);
    setSaving(true);
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token inválido');
       console.log(' Egresos reales antes de filtrar:', egresosReales);
    console.log('📊 Ingresos reales antes de filtrar:', ingresosReales);


      const payload = {
        segmento_alcanzado_estudiantes: Number(segAlcanzado.estudiantes) || 0,
        segmento_alcanzado_docentes: Number(segAlcanzado.docentes) || 0,
        segmento_alcanzado_publico_externo: Number(segAlcanzado.publico_externo) || 0,
        segmento_alcanzado_influencers: Number(segAlcanzado.influencers) || 0,
        segmento_alcanzado_otro_cual: segAlcanzado.otro_cual,
        segmento_alcanzado_otro_cantidad: Number(segAlcanzado.otro_cantidad) || 0,
        objetivo_alcanzado_modelo_pedagogico: objAlcanzado.modelo_pedagogico,
        objetivo_alcanzado_posicionamiento: objAlcanzado.posicionamiento,
        objetivo_alcanzado_internacionalizacion: objAlcanzado.internacionalizacion,
        objetivo_alcanzado_rsu: objAlcanzado.rsu,
        objetivo_alcanzado_fidelizacion: objAlcanzado.fidelizacion,
        objetivo_alcanzado_otro_cual: objAlcanzado.otro_cual,
        participacion_real: participacionReal,
        indice_satisfaccion_real: satisfaccionReal,
        otros_resultados_real: otrosResultadosReal,
        egresos_reales: egresosReales.filter(e => e.descripcion || e.cantidad || e.precio_unitario),
        ingresos_reales: ingresosReales.filter(i => i.descripcion || i.cantidad || i.precio_unitario),
        info_prensa: infoPrensa,
        analisis_desviaciones: analisisDesviaciones,
        lecciones_aprendidas: leccionesAprendidas,
        estado: estadoFinal,
      };
          console.log('📤 Payload final a enviar:', JSON.stringify(payload, null, 2));

      const url = `${API_BASE_URL}/eventos/${eventId}/informe`;
      console.log('🔵 [handleGuardar] Enviando petición a:', url);

      const response = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('🟢 [handleGuardar] ÉXITO DEL SERVIDOR:', response.data);
      
      await fetchAllData();
       if (estadoFinal === 'finalizado') {
      setReadOnly(true);
      console.log('🔒 [handleGuardar] Modo solo lectura activado');
    }
      
      Alert.alert(
        '✅ Éxito', 
        estadoFinal === 'finalizado' 
        ? 'El informe ha sido finalizado y guardado correctamente.' 
        : 'El borrador se ha guardado correctamente.',
        [
          {
             text: 'Aceptar',
             style: 'default',
          onPress: () => { 
            console.log('regresando');
            router.replace('/admin/EventosCompletos');
         }
    }
  ],
  { cancelable: false }
);
      
    } catch (err) {
      console.error('🔴 [handleGuardar] ERROR:', err.response?.data || err.message);
      Alert.alert('Error', 'No se pudo guardar el informe: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const buildInformeHtml = () => {
    const rowsHtml = (rows) => rows.map(r => `<tr><td>${r.descripcion || ''}</td><td style="text-align:right">${r.cantidad || ''}</td><td style="text-align:right">Bs ${parseFloat(r.precio_unitario || 0).toFixed(2)}</td><td style="text-align:right">Bs ${parseFloat(r.total || 0).toFixed(2)}</td></tr>`).join('');
    return `<html><head><meta charset="UTF-8"><style>
      @page { margin: 1cm; }
      body { font-family: Arial, sans-serif; padding: 1cm; color: #333; }
      h1 { color: #E95A0C; border-bottom: 2px solid #E95A0C; padding-bottom: 0.3cm; }
      .section-title { background: #f6a06b; color: #fff; font-weight: bold; padding: 6px 10px; margin-top: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      td, th { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
      .balance { font-weight: bold; background: #ecf0f1; padding: 8px; margin-top: 8px; }
    </style></head><body>
      <h1>Informe del Evento: ${event?.title || ''}</h1>
      <div class="section-title">Datos Generales</div>
      <table>
        <tr><td><strong>Fecha</strong></td><td>${event?.date || ''}</td></tr>
        <tr><td><strong>Hora</strong></td><td>${event?.time || ''}</td></tr>
        <tr><td><strong>Ubicación</strong></td><td>${event?.location || ''}</td></tr>
        <tr><td><strong>Responsable</strong></td><td>${event?.responsable || ''}</td></tr>
      </table>
      <div class="section-title">Segmento Alcanzado</div>
      <table>
        <tr><td>Estudiantes</td><td>${segAlcanzado.estudiantes || 0}</td></tr>
        <tr><td>Docentes</td><td>${segAlcanzado.docentes || 0}</td></tr>
        <tr><td>Público Externo</td><td>${segAlcanzado.publico_externo || 0}</td></tr>
        <tr><td>Influencers</td><td>${segAlcanzado.influencers || 0}</td></tr>
      </table>
      <div class="section-title">Balance Económico</div>
      <table><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>${rowsHtml(egresosReales)}</table>
      <table><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>${rowsHtml(ingresosReales)}</table>
      <div class="balance">Balance: Bs ${balanceReal.toFixed(2)}</div>
      <div class="section-title">Nota de Prensa</div><p>${infoPrensa || '-'}</p>
      <div class="section-title">Análisis de Desviaciones</div><p>${analisisDesviaciones || '-'}</p>
      <div class="section-title">Lecciones Aprendidas</div><p>${leccionesAprendidas || '-'}</p>
    </body></html>`;
  };

  const generarPDF = async () => {
    const html = buildInformeHtml();
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`${html}<script>setTimeout(() => { window.print(); window.close(); }, 500);</script>`);
      printWindow.document.close();
      return;
    }
    try {
      const result = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartir Informe del Evento' });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el PDF: ' + err.message);
    }
  };
  const buildRegistroParticipantesHtml = () => {
    const filasEstudiantes = inscritos.map((est, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="nombre">${est.nombre || ''}</td>
        <td></td>
        <td></td>
        <td>${est.codigoestudiante || ''}</td>
        <td>${est.carrera || ''}</td>
        <td>${est.semestre || ''}</td>
        <td class="correo">${est.email || ''}</td>
        <td>${est.telefono || ''}</td>
      </tr>`).join('');

    const filasVacias = Array.from({ length: 15 }).map((_, i) => `
      <tr>
        <td class="num">${inscritos.length + i + 1}</td>
        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      </tr>`).join('');

    return `<html><head><meta charset="UTF-8"><style>
      @page { margin: 1cm; }
      body { font-family: Arial, sans-serif; color: #1e293b; }
      .header { display: flex; align-items: center; justify-content: space-between; border: 1px solid #333; }
      .header .logo { padding: 10px 16px; font-weight: bold; font-size: 15px; border-right: 1px solid #333; }
      .header .logo small { display: block; font-weight: normal; font-size: 10px; font-style: italic; }
      .header .title { flex: 1; text-align: center; font-weight: bold; font-size: 16px; }
      .header .code { padding: 10px; font-size: 10px; border-left: 1px solid #333; text-align: right; }
      .infoTable { width: 100%; border-collapse: collapse; margin-top: 4px; }
      .infoTable td { border: 1px solid #333; padding: 5px 8px; font-size: 12px; }
      .infoTable td.label { width: 25%; font-weight: bold; background: #f1f1f1; }
      .mainTable { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .mainTable th, .mainTable td { border: 1px solid #333; padding: 4px 6px; font-size: 10px; text-align: center; }
      .mainTable thead .groupRow th { background: #94a3b8; color: #fff; font-size: 11px; }
      .mainTable thead .colRow th { background: #e2e8f0; font-size: 10px; }
      .mainTable td.num { width: 3%; }
      .mainTable td.nombre, .mainTable td.correo { text-align: left; }
      .mainTable tr { height: 22px; }
    </style></head><body>
      <div class="header">
        <div class="logo">UNIFRANZ<small>Internacionalízate</small></div>
        <div class="title">REGISTRO DE PARTICIPANTES</div>
        <div class="code">RG-CI-M<br/>V1.0</div>
      </div>
      <table class="infoTable">
        <tr><td class="label">Nombre del Evento</td><td>${event?.title || ''}</td></tr>
        <tr><td class="label">Lugar del Evento</td><td>${event?.location || ''}</td></tr>
        <tr><td class="label">Fecha de Realización</td><td>${event?.date || ''}</td></tr>
        <tr><td class="label">Hora del Evento</td><td>${event?.time || ''}</td></tr>
        <tr><td class="label">Responsable del Evento</td><td>${event?.responsable || ''}</td></tr>
      </table>
      <table class="mainTable">
        <thead>
          <tr class="groupRow">
            <th rowspan="2">N°</th>
            <th rowspan="2">Nombre</th>
            <th colspan="2">Público externo / colaboradores</th>
            <th colspan="5">Estudiantes</th>
          </tr>
          <tr class="colRow">
            <th>CI</th>
            <th>Institución</th>
            <th>Código estudiante</th>
            <th>Carrera</th>
            <th>Semestre</th>
            <th>Correo electrónico</th>
            <th>Teléfono</th>
          </tr>
        </thead>
        <tbody>
          ${filasEstudiantes}
          ${filasVacias}
        </tbody>
      </table>
    </body></html>`;
  };

  const generarPDFRegistro = async () => {
    const html = buildRegistroParticipantesHtml();
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`${html}<script>setTimeout(() => { window.print(); window.close(); }, 500);</script>`);
      printWindow.document.close();
      return;
    }
    try {
      const result = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartir Registro de Participantes' });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el PDF: ' + err.message);
    }
  };

  const verInscritos = async () => {
  setShowInscritos(true);
  setLoadingInscritos(true);
  try {
    const token = await getTokenAsync();
    const res = await axios.get(`${API_BASE_URL}/estudiantes/estudiantes-inscritos-evento/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setInscritos(res.data.estudiantes || []);
  } catch (err) {
    Alert.alert('Error', 'No se pudo cargar la lista de inscritos: ' + (err.response?.data?.message || err.message));
  } finally {
    setLoadingInscritos(false);
  }
};

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Cargando...</Text></View>;
  }
  if (error) {
    return <View style={styles.centered}><Ionicons name="alert-circle-outline" size={50} color={COLORS.accent} /><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.white} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Informe del Evento</Text>
        <TouchableOpacity onPress={generarPDF}><Ionicons name="print-outline" size={24} color={COLORS.white} /></TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        <View style={styles.blockHeader}>
          <Ionicons name="information-circle" size={22} color={COLORS.white} />
          <Text style={styles.blockHeaderText}>A. DATOS DEL EVENTO</Text>
        </View>

        {event?.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />}

        <View style={styles.sectionCard}>
          <Text style={styles.eventTitle}>{event?.title}</Text>
          <View style={styles.badgesRow}>
            <View style={[styles.phaseBadge, { backgroundColor: COLORS.info }]}>
              <Ionicons name="flag-outline" size={14} color={COLORS.white} />
              <Text style={styles.phaseBadgeText}>Fase {event?.idfase || 1}</Text>
            </View>
            <View style={[styles.phaseBadge, { backgroundColor: event?.status === 'aprobado' ? COLORS.success : COLORS.warning }]}>
              <Ionicons name={event?.status === 'aprobado' ? 'checkmark-circle' : 'time-outline'} size={14} color={COLORS.white} />
              <Text style={styles.phaseBadgeText}>{event?.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Información General</Text>
          <View style={styles.detailRow}><Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>Fecha: {event?.date}</Text></View>
          <View style={styles.detailRow}><Ionicons name="time-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>Hora: {event?.time}</Text></View>
          <View style={styles.detailRow}><Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>Ubicación: {event?.location}</Text></View>
          {event?.responsable && <View style={styles.detailRow}><Ionicons name="person-outline" size={20} color={COLORS.primary} style={styles.detailIcon} /><Text style={styles.detailText}>Responsable: {event.responsable}</Text></View>}
        </View>

        {event?.creador && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Propuesto por</Text>
            <Text style={styles.creatorName}>{event.creador.nombre}</Text>
            <Text style={styles.creatorRole}>Rol: {event.creador.role}</Text>
            <Text style={styles.creatorEmail}>Email: {event.creador.email}</Text>
          </View>
        )}

        {event?.Clasificacion && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Clasificación Estratégica</Text>
            <Text style={styles.detailText}>• {event.Clasificacion.nombreClasificacion} - {event.Clasificacion.nombresubcategoria}</Text>
          </View>
        )}

        {event?.tiposEvento && event.tiposEvento.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tipos de Evento</Text>
            {event.tiposEvento.map((tipo, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.grayText} style={styles.listIcon} />
                <Text style={styles.listText}>{tipo.nombretipo || `Tipo ID ${tipo.idtipoevento}`}</Text>
              </View>
            ))}
          </View>
        )}

        {event?.objetivosPDI && event.objetivosPDI.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Objetivos del PDI Institucional</Text>
            {event.objetivosPDI.map((pdi, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listText, { fontWeight: 'bold', color: COLORS.primary, marginRight: 8 }]}>{index + 1}.</Text>
                <Text style={styles.listText}>{pdi}</Text>
              </View>
            ))}
          </View>
        )}

        {event?.actividadesPrevias && event.actividadesPrevias.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Actividades Previas</Text>
            {event.actividadesPrevias.map((act, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityHeader}>
                  <Ionicons name="list-circle-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.activityTitle}>{act.nombre || `Actividad ${index + 1}`}</Text>
                </View>
                <View style={styles.activityDetails}>
                  <View style={styles.activityDetailRow}><Ionicons name="person-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Responsable: {act.responsable || 'No especificado'}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Inicio: {formatDate(act.fecha_inicio)}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Fin: {formatDate(act.fecha_fin)}</Text></View>
                </View>
              </View>
            ))}
          </View>
        )}

        {event?.actividadesDurante && event.actividadesDurante.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Actividades Durante el Evento</Text>
            {event.actividadesDurante.map((act, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityHeader}>
                  <Ionicons name="play-circle-outline" size={20} color={COLORS.success} />
                  <Text style={styles.activityTitle}>{act.nombre || `Actividad ${index + 1}`}</Text>
                </View>
                <View style={styles.activityDetails}>
                  <View style={styles.activityDetailRow}><Ionicons name="person-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Responsable: {act.responsable || 'No especificado'}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Inicio: {formatDate(act.fecha_inicio)}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Fin: {formatDate(act.fecha_fin)}</Text></View>
                </View>
              </View>
            ))}
          </View>
        )}

        {event?.actividadesPost && event.actividadesPost.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Actividades Después del Evento</Text>
            {event.actividadesPost.map((act, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityHeader}>
                  <Ionicons name="checkmark-done-outline" size={20} color={COLORS.info} />
                  <Text style={styles.activityTitle}>{act.nombre || `Actividad ${index + 1}`}</Text>
                </View>
                <View style={styles.activityDetails}>
                  <View style={styles.activityDetailRow}><Ionicons name="person-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Responsable: {act.responsable || 'No especificado'}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Inicio: {formatDate(act.fecha_inicio)}</Text></View>
                  <View style={styles.activityDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.activityDetailText}>Fin: {formatDate(act.fecha_fin)}</Text></View>
                </View>
              </View>
            ))}
          </View>
        )}

        {event?.serviciosContratados && event.serviciosContratados.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Servicios Contratados</Text>
            {event.serviciosContratados.map((serv, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <Ionicons name="build-outline" size={20} color={COLORS.purple} />
                  <Text style={styles.serviceTitle}>{serv.nombreservicio || `Servicio ${index + 1}`}</Text>
                </View>
                <View style={styles.serviceDetails}>
                  {serv.caracteristicas && <View style={styles.serviceDetailRow}><Ionicons name="list-outline" size={16} color={COLORS.grayText} /><Text style={styles.serviceDetailText}>Características: {serv.caracteristicas}</Text></View>}
                  <View style={styles.serviceDetailRow}><Ionicons name="calendar-outline" size={16} color={COLORS.grayText} /><Text style={styles.serviceDetailText}>Fecha Entrega: {formatDate(serv.fechadeentrega)}</Text></View>
                  {serv.observaciones && <View style={styles.serviceDetailRow}><Ionicons name="document-text-outline" size={16} color={COLORS.grayText} /><Text style={styles.serviceDetailText}>Obs: {serv.observaciones}</Text></View>}
                </View>
              </View>
            ))}
          </View>
        )}

        {event?.layout && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Layout del Evento</Text>
            {event.layout.url_imagen ? (
              <Image source={{ uri: `${API_BASE_URL}/uploads/${event.layout.url_imagen}` }} style={styles.layoutImage} resizeMode="contain" />
            ) : (
              <View style={styles.layoutPlaceholder}>
                <Ionicons name="image-outline" size={50} color={COLORS.grayText} />
                <Text style={styles.layoutPlaceholderText}>{event.layout.nombre || `Layout ID: ${event.layout.idlayout}`}</Text>
              </View>
            )}
          </View>
        )}

        {event?.comite && event.comite.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Comité del Evento</Text>
            {event.comite.map((miembro, index) => (
              <View key={index} style={styles.committeeMember}>
                <Text style={styles.committeeName}>{[miembro.nombre, miembro.apellidopat, miembro.apellidomat].filter(Boolean).join(' ') || 'Miembro sin nombre'}</Text>
                <Text style={styles.committeeRole}>Rol: {miembro.role === 'academico' ? 'Académico' : miembro.role}</Text>
                <Text style={styles.committeeEmail}>Email: {miembro.email}</Text>
              </View>
            ))}
          </View>
        )}

        {event?.recursos && event.recursos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recursos Solicitados</Text>
            {['tecnologico', 'mobiliario', 'vajilla'].map(tipo => {
              const items = event.recursos.filter(r => r.recurso_tipo === tipo);
              if (items.length === 0) return null;
              const iconMap = { tecnologico: 'hardware-chip-outline', mobiliario: 'home-outline', vajilla: 'restaurant-outline' };
              const labelMap = { tecnologico: 'Tecnológicos', mobiliario: 'Mobiliario', vajilla: 'Vajilla' };
              return (
                <View key={tipo} style={styles.resourceCategory}>
                  <Text style={styles.resourceCategoryTitle}>{labelMap[tipo]}</Text>
                  {items.map((r, i) => (
                    <View key={i} style={styles.listItem}>
                      <Ionicons name={iconMap[tipo]} size={16} color={COLORS.grayText} style={styles.listIcon} />
                      <Text style={styles.listText}>{r.cantidad || 1} x {r.nombre_recurso}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* Presupuesto Esperado */}
        {event?.presupuesto && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>💰 Presupuesto Esperado (Planificado)</Text>

            {event.egresos && event.egresos.length > 0 && (
              <View style={styles.budgetSubsection}>
                <View style={styles.budgetHeader}><Ionicons name="arrow-down-circle" size={20} color={COLORS.logout} /><Text style={styles.budgetSubtitle}>Egresos Esperados</Text></View>
                <View style={styles.budgetTableHeader}>
                  <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
                </View>
                {event.egresos.map((egreso, index) => (
                  <View key={egreso.idegreso || index} style={styles.budgetTableRow}>
                    <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{egreso.descripcion}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>{egreso.cantidad}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(egreso.precio_unitario).toFixed(2)}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>Bs {parseFloat(egreso.total).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.budgetTotalRow}>
                  <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL EGRESOS ESPERADOS:</Text>
                  <Text style={styles.budgetTotalValue}>Bs {(totalEgresosEsperado || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}

            {event.ingresos && event.ingresos.length > 0 && (
              <View style={styles.budgetSubsection}>
                <View style={styles.budgetHeader}><Ionicons name="arrow-up-circle" size={20} color={COLORS.success} /><Text style={styles.budgetSubtitle}>Ingresos Esperados</Text></View>
                <View style={styles.budgetTableHeader}>
                  <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
                </View>
                {event.ingresos.map((ingreso, index) => (
                  <View key={ingreso.idingreso || index} style={styles.budgetTableRow}>
                    <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{ingreso.descripcion}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>{ingreso.cantidad}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(ingreso.precio_unitario).toFixed(2)}</Text>
                    <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>Bs {parseFloat(ingreso.total).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.budgetTotalRow}>
                  <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL INGRESOS ESPERADOS:</Text>
                  <Text style={[styles.budgetTotalValue, { color: COLORS.success }]}>Bs {(totalIngresosEsperado || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}

            <View style={styles.balanceFinal}>
              <Text style={styles.balanceFinalLabel}>BALANCE ESPERADO:</Text>
              <Text style={[styles.balanceFinalValue, { color: balanceEsperado >= 0 ? COLORS.success : COLORS.logout }]}>Bs {(balanceEsperado || 0).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {event?.resultados && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🎯 Resultados Esperados</Text>
            {event.resultados.participacion_esperada && (
              <View style={styles.listItem}><Ionicons name="people-circle-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>Participación: {event.resultados.participacion_esperada}</Text></View>
            )}
            {event.resultados.satisfaccion_esperada && (
              <View style={styles.listItem}><Ionicons name="happy-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>Satisfacción: {event.resultados.satisfaccion_esperada}</Text></View>
            )}
            {event.resultados.otros_resultados && (
              <View style={styles.listItem}><Ionicons name="document-text-outline" size={16} color={COLORS.grayText} style={styles.listIcon} /><Text style={styles.listText}>Otros: {event.resultados.otros_resultados}</Text></View>
            )}
          </View>
        )}

        <View style={[styles.blockHeader, { backgroundColor: COLORS.accent }]}>
          <Ionicons name="create" size={22} color={COLORS.white} />
          <Text style={styles.blockHeaderText}>B. INFORME DE CIERRE (A completar)</Text>
        </View>

        {readOnly && (
          <View style={[styles.sectionCard, { backgroundColor: informeFinalizado ? '#E8F5E9' : '#FFF3E0', flexDirection: 'row', alignItems: 'center' }]}>
            <Ionicons
              name={informeFinalizado ? 'checkmark-done-circle-outline' : 'lock-closed-outline'}
              size={20}
              color={informeFinalizado ? COLORS.success : COLORS.warning}
            />
            <Text style={{ marginLeft: 10, color: COLORS.darkText, flex: 1, fontSize: 14 }}>
              {informeFinalizado
                ? 'Este informe ya fue finalizado y no puede modificarse.'
                : 'Solo el responsable del evento puede completar este informe.'}
            </Text>
          </View>
        )}

       
        {/* Participación / Satisfacción - COMPARACIÓN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Participación e Índice de Satisfacción</Text>

          <View style={styles.compareBlock}>
            <View style={styles.compareRow}>
              <Ionicons name="people-outline" size={20} color={COLORS.info} />
              <Text style={styles.compareLabel}>Participación</Text>
            </View>
            <View style={styles.compareValues}>
              <View style={styles.compareBox}>
                <Text style={styles.compareBoxLabel}>ESPERADO</Text>
                <Text style={styles.compareBoxValue}>{event?.resultados?.participacion_esperada || '-'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={COLORS.grayText} />
              <View style={[styles.compareBox, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.compareBoxLabel}>REAL</Text>
                <TextInput style={[styles.compareBoxInput, !readOnly && styles.editableInput]} editable={!readOnly} value={participacionReal} onChangeText={setParticipacionReal} placeholder="Ingrese el valor real" />
              </View>
            </View>
          </View>

          <View style={styles.compareBlock}>
            <View style={styles.compareRow}>
              <Ionicons name="happy-outline" size={20} color={COLORS.info} />
              <Text style={styles.compareLabel}>Índice de Satisfacción</Text>
            </View>
            <View style={styles.compareValues}>
              <View style={styles.compareBox}>
                <Text style={styles.compareBoxLabel}>ESPERADO</Text>
                <Text style={styles.compareBoxValue}>{event?.resultados?.satisfaccion_esperada || '-'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={COLORS.grayText} />
              <View style={[styles.compareBox, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.compareBoxLabel}>REAL</Text>
                <TextInput style={[styles.compareBoxInput, !readOnly && styles.editableInput]} editable={!readOnly} value={satisfaccionReal} onChangeText={setSatisfaccionReal} placeholder="Ingrese el valor real" />
              </View>
            </View>
          </View>

          <View style={styles.compareBlock}>
            <View style={styles.compareRow}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.info} />
              <Text style={styles.compareLabel}>Otros Resultados</Text>
            </View>
            <View style={styles.compareValues}>
              <View style={styles.compareBox}>
                <Text style={styles.compareBoxLabel}>ESPERADO</Text>
                <Text style={styles.compareBoxValue}>{event?.resultados?.otros_resultados || '-'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={COLORS.grayText} />
              <View style={[styles.compareBox, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.compareBoxLabel}>REAL</Text>
                <TextInput style={[styles.compareBoxInput, styles.multilineCompare, !readOnly && styles.editableInput]} editable={!readOnly} multiline value={otrosResultadosReal} onChangeText={setOtrosResultadosReal} placeholder="Ingrese los resultados reales" />
              </View>
            </View>
          </View>
        </View>

        {/* Balance Económico Real - COMPARACIÓN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Balance Económico Real</Text>

          <View style={styles.balanceComparison}>
            <View style={styles.balanceCompareBox}>
              <Text style={styles.balanceCompareLabel}>ESPERADO</Text>
              <Text style={[styles.balanceCompareValue, { color: balanceEsperado >= 0 ? COLORS.success : COLORS.logout }]}>Bs {(balanceEsperado || 0).toFixed(2)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={COLORS.primary} />
            <View style={[styles.balanceCompareBox, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.balanceCompareLabel}>REAL</Text>
              <Text style={[styles.balanceCompareValue, { color: balanceReal >= 0 ? COLORS.success : COLORS.logout }]}>Bs {balanceReal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Egresos Reales */}
          <View style={styles.budgetSubsection}>
            <View style={styles.budgetHeader}><Ionicons name="arrow-down-circle" size={20} color={COLORS.logout} /><Text style={styles.budgetSubtitle}>Egresos Reales</Text></View>
            <View style={styles.budgetTableHeader}>
              <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
              <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
              <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
              <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
              {!readOnly && <View style={{ width: 24 }} />}
            </View>
                        {egresosReales.map((row, index) => (
              <View key={index} style={styles.budgetTableRow}>
                {readOnly ? (
                  <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{row.descripcion || '-'}</Text>
                ) : (
                  <TextInput style={[styles.budgetCell, styles.budgetCellDesc, styles.inputCell, styles.inputCellDesc]} editable={!readOnly} placeholder="Descripción" value={row.descripcion} onChangeText={(v) => updateRow(setEgresosReales, egresosReales, index, 'descripcion', v)} />
                )}
                {readOnly ? (
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>{row.cantidad || '0'}</Text>
                ) : (
                  <TextInput style={[styles.budgetCell, styles.budgetCellNum, styles.inputCell]} keyboardType="numeric" editable={!readOnly} placeholder="0" value={String(row.cantidad)} onChangeText={(v) => updateRow(setEgresosReales, egresosReales, index, 'cantidad', v)} />
                )}
                {readOnly ? (
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(row.precio_unitario || 0).toFixed(2)}</Text>
                ) : (
                  <TextInput style={[styles.budgetCell, styles.budgetCellNum, styles.inputCell]} keyboardType="numeric" editable={!readOnly} placeholder="0.00" value={String(row.precio_unitario)} onChangeText={(v) => updateRow(setEgresosReales, egresosReales, index, 'precio_unitario', v)} />
                )}
                <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>Bs {(row.total || 0).toFixed(2)}</Text>
                {!readOnly && <TouchableOpacity onPress={() => removeRow(setEgresosReales, egresosReales, index)} style={{ width: 24, alignItems: 'center' }}><Ionicons name="trash-outline" size={18} color={COLORS.logout} /></TouchableOpacity>}
              </View>
            ))}
            {!readOnly && <TouchableOpacity style={styles.addRowButton} onPress={() => addRow(setEgresosReales, egresosReales)}><Ionicons name="add-circle-outline" size={18} color={COLORS.primary} /><Text style={styles.addRowText}>Agregar egreso</Text></TouchableOpacity>}
            <View style={styles.budgetTotalRow}>
              <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL EGRESOS REALES:</Text>
              <Text style={styles.budgetTotalValue}>Bs {(totalEgresosReal || 0).toFixed(2)}</Text>
              {!readOnly && <View style={{ width: 24 }} />}
            </View>
          </View>

          {/* Ingresos Reales */}
          <View style={styles.budgetSubsection}>
            <View style={styles.budgetHeader}><Ionicons name="arrow-up-circle" size={20} color={COLORS.success} /><Text style={styles.budgetSubtitle}>Ingresos Reales</Text></View>
            <View style={styles.budgetTableHeader}>
              <Text style={[styles.budgetCell, styles.budgetCellDesc]}>Descripción</Text>
              <Text style={[styles.budgetCell, styles.budgetCellNum]}>Cant.</Text>
              <Text style={[styles.budgetCell, styles.budgetCellNum]}>Precio</Text>
              <Text style={[styles.budgetCell, styles.budgetCellNum]}>Total</Text>
              {!readOnly && <View style={{ width: 24 }} />}
            </View>
                        {ingresosReales.map((row, index) => (
              <View key={index} style={styles.budgetTableRow}>
                {readOnly ? (
                  <Text style={[styles.budgetCell, styles.budgetCellDesc]}>{row.descripcion || '-'}</Text>
                ) : (
                  <TextInput style={[styles.budgetCell, styles.budgetCellDesc, styles.inputCell, styles.inputCellDesc]} editable={!readOnly} placeholder="Descripción" value={row.descripcion} onChangeText={(v) => updateRow(setIngresosReales, ingresosReales, index, 'descripcion', v)} />
                )}
                {readOnly ? (
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>{row.cantidad || '0'}</Text>
                ) : (
                  <TextInput style={[styles.budgetCell, styles.budgetCellNum, styles.inputCell]} keyboardType="numeric" editable={!readOnly} placeholder="0" value={String(row.cantidad)} onChangeText={(v) => updateRow(setIngresosReales, ingresosReales, index, 'cantidad', v)} />
                )}
                {readOnly ? (
                  <Text style={[styles.budgetCell, styles.budgetCellNum]}>Bs {parseFloat(row.precio_unitario || 0).toFixed(2)}</Text>
                ) : (
                  <TextInput style={[styles.budgetCell, styles.budgetCellNum, styles.inputCell]} keyboardType="numeric" editable={!readOnly} placeholder="0.00" value={String(row.precio_unitario)} onChangeText={(v) => updateRow(setIngresosReales, ingresosReales, index, 'precio_unitario', v)} />
                )}
                <Text style={[styles.budgetCell, styles.budgetCellNum, styles.budgetCellTotal]}>Bs {(row.total || 0).toFixed(2)}</Text>
                {!readOnly && <TouchableOpacity onPress={() => removeRow(setIngresosReales, ingresosReales, index)} style={{ width: 24, alignItems: 'center' }}><Ionicons name="trash-outline" size={18} color={COLORS.logout} /></TouchableOpacity>}
              </View>
            ))}
            {!readOnly && <TouchableOpacity style={styles.addRowButton} onPress={() => addRow(setIngresosReales, ingresosReales)}><Ionicons name="add-circle-outline" size={18} color={COLORS.primary} /><Text style={styles.addRowText}>Agregar ingreso</Text></TouchableOpacity>}
            <View style={styles.budgetTotalRow}>
              <Text style={[styles.budgetTotalLabel, { flex: 3 }]}>TOTAL INGRESOS REALES:</Text>
              <Text style={[styles.budgetTotalValue, { color: COLORS.success }]}>Bs {(totalIngresosReal || 0).toFixed(2)}</Text>
              {!readOnly && <View style={{ width: 24 }} />}
            </View>
          </View>

          <View style={styles.balanceFinal}>
            <Text style={styles.balanceFinalLabel}>BALANCE REAL FINAL:</Text>
            <Text style={[styles.balanceFinalValue, { color: balanceReal >= 0 ? COLORS.success : COLORS.logout }]}>Bs {balanceReal.toFixed(2)}</Text>
          </View>
        </View>

              {/* Nota de Prensa */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. Información para la Nota de Prensa</Text>
          <View style={styles.detailRow}>
            <Ionicons name="newspaper-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
            {readOnly ? (
              <Text style={[styles.textInput, { flex: 1, minHeight: 90, textAlignVertical: 'top', marginBottom: 0, backgroundColor: 'transparent', borderWidth: 0, color: COLORS.darkText }]}>
                {infoPrensa || 'Sin información'}
              </Text>
            ) : (
              <TextInput 
                style={[styles.textInput, { flex: 1, minHeight: 90, textAlignVertical: 'top', marginBottom: 0 }]} 
                editable={!readOnly} 
                multiline 
                numberOfLines={4} 
                value={infoPrensa} 
                onChangeText={setInfoPrensa} 
                placeholder="¿Qué se hizo, quiénes, por qué/para qué, cuándo, dónde?" 
              />
            )}
          </View>
        </View>

                {/* Análisis de Desviaciones */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. Análisis de Desviaciones Críticas/Significativas</Text>
          <View style={styles.detailRow}>
            <Ionicons name="git-compare-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
            {readOnly ? (
              <Text style={[styles.textInput, { flex: 1, minHeight: 90, textAlignVertical: 'top', marginBottom: 0, backgroundColor: 'transparent', borderWidth: 0, color: COLORS.darkText }]}>
                {analisisDesviaciones || 'Sin análisis'}
              </Text>
            ) : (
              <TextInput 
                style={[styles.textInput, { flex: 1, minHeight: 90, textAlignVertical: 'top', marginBottom: 0 }]} 
                editable={!readOnly} 
                multiline 
                numberOfLines={4} 
                value={analisisDesviaciones} 
                onChangeText={setAnalisisDesviaciones} 
                placeholder="Análisis de causas de las desviaciones detectadas" 
              />
            )}
          </View>
        </View>

                {/* Lecciones Aprendidas */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7. Lecciones Aprendidas</Text>
          <View style={styles.detailRow}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.primary} style={styles.detailIcon} />
            {readOnly ? (
              <Text style={[styles.textInput, { flex: 1, minHeight: 90, textAlignVertical: 'top', marginBottom: 0, backgroundColor: 'transparent', borderWidth: 0, color: COLORS.darkText }]}>
                {leccionesAprendidas || 'Sin lecciones registradas'}
              </Text>
            ) : (
              <TextInput 
                style={[styles.textInput, { flex: 1, minHeight: 90, textAlignVertical: 'top', marginBottom: 0 }]} 
                editable={!readOnly} 
                multiline 
                numberOfLines={4} 
                value={leccionesAprendidas} 
                onChangeText={setLeccionesAprendidas} 
                placeholder="Lecciones aprendidas del evento" 
              />
            )}
          </View>
        </View>

        {/* Botones de acción */}
        {!readOnly && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.draftButton} disabled={saving} onPress={() => handleGuardar('borrador')}>
              {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.draftButtonText}>Guardar borrador</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.finalButton} disabled={saving} onPress={handleFinalizarInforme}>
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.finalButtonText}>Finalizar informe</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.pdfButton} onPress={generarPDF}>
          <Ionicons name="print-outline" size={20} color={COLORS.white} />
          <Text style={styles.pdfButtonText}>Generar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.inscritosButton} onPress={verInscritos}>
          <Ionicons name="people-outline" size={20} color={COLORS.white} />
          <Text style={styles.inscritosButtonText}>Ver estudiantes inscritos</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={showInscritos} animationType="slide" onRequestClose={() => setShowInscritos(false)}>
  <View style={{ flex: 1, backgroundColor: COLORS.background }}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => setShowInscritos(false)}>
        <Ionicons name="close" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Estudiantes Inscritos</Text>
      <TouchableOpacity onPress={generarPDFRegistro}>
        <Ionicons name="print-outline" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
    {loadingInscritos ? (
      <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
    ) : (
      <FlatList
        data={inscritos}
        keyExtractor={(item) => String(item.idestudiante)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: COLORS.grayText, marginTop: 30 }}>Aún no hay estudiantes inscritos.</Text>}
        ListHeaderComponent={
          <View style={styles.eventInfoCard}>
            <Text style={styles.eventInfoTitle}>{event?.title}</Text>
            <View style={styles.badgesRow}>
              <View style={[styles.phaseBadge, { backgroundColor: COLORS.info }]}>
                <Ionicons name="flag-outline" size={14} color={COLORS.white} />
                <Text style={styles.phaseBadgeText}>Fase {event?.idfase || 1}</Text>
              </View>
              <View style={[styles.phaseBadge, { backgroundColor: event?.status === 'aprobado' ? COLORS.success : COLORS.warning }]}>
                <Ionicons name={event?.status === 'aprobado' ? 'checkmark-circle' : 'time-outline'} size={14} color={COLORS.white} />
                <Text style={styles.phaseBadgeText}>{event?.status}</Text>
              </View>
            </View>

            <View style={styles.eventInfoDivider} />

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} style={styles.detailIcon} />
              <Text style={styles.eventInfoText}>{event?.date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} style={styles.detailIcon} />
              <Text style={styles.eventInfoText}>{event?.time}</Text>
            </View>
            <View style={[styles.detailRow, { marginBottom: 0 }]}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} style={styles.detailIcon} />
              <Text style={styles.eventInfoText}>{event?.location}</Text>
            </View>

            <View style={styles.inscritosCardFooter}>
              <View style={styles.inscritosCountPill}>
                <Ionicons name="people" size={14} color={COLORS.primary} />
                <Text style={styles.inscritosCountText}>{inscritos.length} estudiante{inscritos.length !== 1 ? 's' : ''} inscrito{inscritos.length !== 1 ? 's' : ''}</Text>
              </View>
              <TouchableOpacity style={styles.pdfRegistroButton} onPress={generarPDFRegistro}>
                <Ionicons name="print-outline" size={14} color={COLORS.white} />
                <Text style={styles.pdfRegistroButtonText}>Generar registro PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
  <View style={styles.committeeMember}>
    <Text style={styles.committeeName}>{item.nombre}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
      <Text style={styles.committeeRole}>Código: {item.codigoestudiante || '-'}</Text>
      <Text style={styles.committeeRole}>Carrera: {item.carrera || '-'}</Text>
      <Text style={styles.committeeRole}>Semestre: {item.semestre || '-'}</Text>
    </View>
    <Text style={styles.committeeEmail}>{item.email}</Text>
    <Text style={styles.committeeRole}>Teléfono: {item.telefono || '-'}</Text>
    <Text style={styles.creatorRole}>Inscrito: {formatDate(item.fecha_inscripcion)}</Text>
  </View>
)}
      />
    )}
  </View>
</Modal>
    </View>
  );
};

InformeEventoScreen.options = { headerShown: false };

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  header: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.grayText },
  errorText: { marginTop: 15, fontSize: 16, color: COLORS.accent, textAlign: 'center', marginHorizontal: 20 },

  blockHeader: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 16, gap: 10 },
  blockHeaderText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 8 } }) },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 12 },
  eventTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 10 },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  phaseBadgeText: { color: COLORS.white, fontSize: 13, fontWeight: '600', marginLeft: 5 },

  // Detalles
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailIcon: { marginRight: 10 },
  detailText: { fontSize: 16, color: COLORS.darkText, flex: 1 },

  // Listas
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  listIcon: { marginRight: 12, marginTop: 4 },
  listText: { fontSize: 15, color: COLORS.darkText, flex: 1, lineHeight: 20 },

  // Creador
  creatorName: { fontSize: 16, color: COLORS.darkText, fontWeight: '500', marginBottom: 3 },
  creatorRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 3 },
  creatorEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },

  // Actividades
  activityItem: { backgroundColor: COLORS.grayLight, borderRadius: 12, padding: 15, marginBottom: 12 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  activityTitle: { fontSize: 16, fontWeight: '600', color: COLORS.darkText, marginLeft: 10, flex: 1 },
  activityDetails: { paddingLeft: 5 },
  activityDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  activityDetailText: { fontSize: 14, color: COLORS.grayText, marginLeft: 8, flex: 1 },

  // Servicios
  serviceItem: { backgroundColor: COLORS.grayLight, borderRadius: 12, padding: 15, marginBottom: 12 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  serviceTitle: { fontSize: 16, fontWeight: '600', color: COLORS.darkText, marginLeft: 10, flex: 1 },
  serviceDetails: { paddingLeft: 5 },
  serviceDetailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  serviceDetailText: { fontSize: 14, color: COLORS.grayText, marginLeft: 8, flex: 1 },

  // Layout
  layoutImage: { width: '100%', height: 250, borderRadius: 12, backgroundColor: COLORS.grayLight, marginBottom: 10 },
  layoutPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, backgroundColor: COLORS.grayLight, borderRadius: 12, marginBottom: 10 },
  layoutPlaceholderText: { fontSize: 14, color: COLORS.grayText, marginTop: 10, textAlign: 'center' },

  // Comité
  committeeMember: { padding: 12, backgroundColor: COLORS.grayLight, borderRadius: 12, marginBottom: 12 },
  committeeName: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 4 },
  committeeRole: { fontSize: 14, color: COLORS.grayText, marginBottom: 4 },
  committeeEmail: { fontSize: 14, color: COLORS.grayText, fontStyle: 'italic' },

  // Recursos
  resourceCategory: { marginBottom: 12 },
  resourceCategoryTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8, marginLeft: 28 },

  // Imagen del evento
  eventImage: { width: '100%', height: 200, resizeMode: 'cover', marginBottom: 16, borderRadius: 12 },

  // Inputs
  numberInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 8, textAlign: 'right', backgroundColor: COLORS.background },
  textInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.background, marginBottom: 8 },

  // Comparación Esperado vs Real
  compareBlock: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  compareRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  compareLabel: { fontSize: 15, fontWeight: '600', color: COLORS.darkText },
  compareValues: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compareBox: { flex: 1, backgroundColor: COLORS.grayLight, borderRadius: 10, padding: 10 },
  compareBoxLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.grayText, marginBottom: 4 },
  compareBoxValue: { fontSize: 14, color: COLORS.darkText, fontWeight: '500' },
  compareBoxInput: { fontSize: 14, color: COLORS.darkText, fontWeight: '500', minHeight: 20 },
  multilineCompare: { minHeight: 60, textAlignVertical: 'top' },
  editableInput: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 6, padding: 6, backgroundColor: COLORS.white },

  // Balance comparativo
  balanceComparison: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.grayLight, padding: 15, borderRadius: 12, marginBottom: 20 },
  balanceCompareBox: { flex: 1, alignItems: 'center' },
  balanceCompareLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.grayText, marginBottom: 4 },
  balanceCompareValue: { fontSize: 18, fontWeight: 'bold' },

  // Presupuesto
  budgetSubsection: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  budgetSubtitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText, marginLeft: 8 },
  budgetTableHeader: { flexDirection: 'row', backgroundColor: COLORS.grayLight, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 8, gap: 8 },
  budgetTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight, gap: 8 },
  budgetCell: { fontSize: 14, color: COLORS.darkText },
  budgetCellDesc: { flex: 3, fontWeight: '500' },
  budgetCellNum: { flex: 1, textAlign: 'right' },
  budgetCellTotal: { fontWeight: '600', color: COLORS.primary },
  budgetTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: COLORS.primary },
  budgetTotalLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.darkText },
  budgetTotalValue: { fontSize: 16, fontWeight: 'bold' },
  balanceFinal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.grayLight, padding: 15, borderRadius: 12, marginTop: 10 },
  balanceFinalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  balanceFinalValue: { fontSize: 18, fontWeight: 'bold' },

  // Inputs de celda
  inputCell: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 6, backgroundColor: COLORS.background, fontSize: 14, color: COLORS.darkText },
  inputCellDesc: { textAlign: 'left' },

  // Botones de fila
  addRowButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 8 },
  addRowText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  // Botones de acción
  actionButtonsContainer: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 12 },
  draftButton: { flex: 1, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  draftButtonText: { color: COLORS.primary, fontWeight: 'bold' },
  finalButton: { flex: 1, backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  finalButtonText: { color: COLORS.white, fontWeight: 'bold' },
  pdfButton: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20 },
  pdfButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  inscritosButton: { flexDirection: 'row', backgroundColor: COLORS.secondary, paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 },
  inscritosButtonText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },

  // Tarjeta de datos del evento dentro del modal de inscritos
  eventInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  eventInfoTitle: { fontSize: 19, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 8 },
  eventInfoDivider: { height: 1, backgroundColor: COLORS.grayLight, marginVertical: 14 },
  eventInfoText: { fontSize: 14, color: COLORS.darkText, flex: 1 },
  inscritosCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  inscritosCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  inscritosCountText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  pdfRegistroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pdfRegistroButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.white },
});

export default InformeEventoScreen;