import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

//const API_BASE_URL = 'https://evento.cidtec-uc.com';
const API_BASE_URL ='https://unibackend-production-a0f8.up.railway.app';
//const API_BASE_URL =  'https://unifrontend.onrender.com';
const TOKEN_KEY = 'adminAuthToken';

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
  danger: '#DC2626',
  purple: '#8B5CF6',
};

const getTokenAsync = async () => {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(TOKEN_KEY); }
    catch (e) { console.error("Error localStorage:", e); return null; }
  } else {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); }
    catch (e) { console.error("Error SecureStore:", e); return null; }
  }
};

const parseJSONSafe = (str, fallback = []) => {
  if (!str) return fallback;
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); }
  catch { return fallback; }
};

const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch { return ''; }
};

const EditEventScreen = () => {
  const { eventId, eventData, mode } = useLocalSearchParams();
  const router = useRouter();
  
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [errors, setErrors] = useState({});

    useEffect(() => {
    const loadEventData = async () => {
      try {
        if (eventData) {
          const parsed = JSON.parse(eventData);
          // Normalizar fechas para inputs
          if (parsed.fechaevento) {
            parsed.fechaevento = formatDateForInput(parsed.fechaevento);
          }
          setForm(parsed);
        } else if (eventId) {
          const token = await getTokenAsync();
          if (!token) throw new Error('Token no encontrado');
          
          // ✅ PETICIÓN RESTAURADA: Obtenemos los datos del evento desde el backend
          const response = await axios.get(`${API_BASE_URL}/eventos/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          });
          
          const apiData = response.data;
          const transformed = transformApiToForm(apiData);
          setForm(transformed);
        } else {
          throw new Error('No se proporcionó eventId ni eventData');
        }
      } catch (error) {
        console.error('❌ Error cargando datos:', error);
        Alert.alert(
          'Error',
          error.response?.status === 401 
            ? 'Sesión expirada. Inicia sesión nuevamente.'
            : error.response?.status === 404
              ? 'Evento no encontrado.'
              : `No se pudieron cargar los datos: ${error.message}`
        );
        if (error.response?.status === 401) {
          router.replace('/LoginAdmin');
        }
      } finally {
        setLoading(false);
      }
    };
    loadEventData();
  }, [eventId, eventData, router]);

  const transformApiToForm = (apiData) => ({
    idevento: apiData.idevento || null,
    nombreevento: apiData.nombreevento || '',
    fechaevento: formatDateForInput(apiData.fechaevento),
    horaevento: apiData.horaevento?.substring(0, 5) || '', // HH:MM
    lugarevento: apiData.lugarevento || '',
    responsable_evento: apiData.responsable_evento || '',
    participantes_esperados: apiData.participantes_esperados?.toString() || '',
    argumentacion: apiData.argumentacion || '',
    
    idclasificacion: apiData.Clasificacion?.idclasificacion || '',
    clasificacionNombre: apiData.Clasificacion?.nombreClasificacion || '',
    idsubcategoria: apiData.Clasificacion?.idsubcategoria || '',
    subcategoriaNombre: apiData.Clasificacion?.nombresubcategoria || '',
    
    tiposEvento: JSON.stringify(apiData.TiposDeEvento || []),
    objetivos: JSON.stringify(apiData.Objetivos || []),
    objetivosPDI: JSON.stringify(
      Array.isArray(apiData.ObjetivosPDI) 
        ? apiData.ObjetivosPDI 
        : parseJSONSafe(apiData.objetivos_pdi, [])
    ),
    segmentos: JSON.stringify(
      apiData.Objetivos?.flatMap(obj => obj.segmentos || []) || []
    ),
    
    participacion_esperada: apiData.Resultados?.[0]?.participacion_esperada || '',
    satisfaccion_esperada: apiData.Resultados?.[0]?.satisfaccion_esperada || '',
    otros_resultados: apiData.Resultados?.[0]?.otros_resultados || '',
    
    recursos: JSON.stringify(apiData.Recursos || []),
    
    comite: JSON.stringify(apiData.Comite || []),
    
    egresos: JSON.stringify(apiData.Egresos || []),
    ingresos: JSON.stringify(apiData.Ingresos || []),
    presupuesto: JSON.stringify(apiData.Presupuesto || {}),
    
    estado: apiData.estado || 'pendiente',
    idfase: apiData.idfase || 1,
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al editar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.nombreevento?.trim()) {
      newErrors.nombreevento = 'El nombre del evento es obligatorio';
    }
    if (!form.fechaevento) {
      newErrors.fechaevento = 'La fecha es obligatoria';
    } else if (new Date(form.fechaevento) < new Date().setHours(0,0,0,0)) {
      newErrors.fechaevento = 'La fecha debe ser futura';
    }
    if (!form.horaevento) {
      newErrors.horaevento = 'La hora es obligatoria';
    }
    if (!form.lugarevento?.trim()) {
      newErrors.lugarevento = 'La ubicación es obligatoria';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

   const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Campos requeridos', 'Por favor completa los campos obligatorios marcados.');
      const firstError = Object.keys(errors)[0];
      if (firstError) setActiveSection('general');
      return;
    }

    setSaving(true);
    try {
      const token = await getTokenAsync();
      if (!token) throw new Error('Token no encontrado');

      const payload = {
        nombreevento: form.nombreevento.trim(),
        fechaevento: form.fechaevento,
        horaevento: form.horaevento,
        lugarevento: form.lugarevento.trim(),
        
        // ✅ Si es reprogramación, forzamos el estado a pendiente
        ...(mode === 'reprogramar' && { estado: 'pendiente' }),

        idclasificacion: form.idclasificacion || null,
        idsubcategoria: form.idsubcategoria || null,
        
        tiposEvento: parseJSONSafe(form.tiposEvento),
        objetivos: parseJSONSafe(form.objetivos),
        objetivosPDI: parseJSONSafe(form.objetivosPDI),
        segmentos: parseJSONSafe(form.segmentos),
        
        Resultados: [{
          participacion_esperada: form.participacion_esperada || null,
          satisfaccion_esperada: form.satisfaccion_esperada || null,
          otros_resultados: form.otros_resultados || null,
        }],
        
        Recursos: parseJSONSafe(form.recursos),
        Comite: parseJSONSafe(form.comite),
        Egresos: parseJSONSafe(form.egresos),
        Ingresos: parseJSONSafe(form.ingresos),
        Presupuesto: parseJSONSafe(form.presupuesto),
      };

      console.log('📤 Enviando payload al backend:', payload);

      const response = await axios.put(
        `${API_BASE_URL}/eventos/${form.idevento}`,
        payload,
        { 
          headers: { 
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          timeout: 20000,
        }
      );

      console.log('✅ Respuesta del backend:', response.data);

    if (mode === 'reprogramar') {
  // Reprogramación: confirmación simple y redirección directa a pendientes
  if (Platform.OS === 'web') {
    window.alert('✓ El evento ha sido reprogramado exitosamente.');
    router.replace('/admin/EventosPendientes');
  } else {
    Alert.alert(
      '✓ Reprogramado',
      'El evento ha sido reprogramado exitosamente.',
      [{ text: 'OK', onPress: () => router.replace('/admin/EventosPendientes') }]
    );
  }
} else {
  // Edición normal: mantenemos la opción de elegir a dónde ir
  if (Platform.OS === 'web') {
    const irADetalles = window.confirm(
      '✓ Los cambios han sido guardados correctamente.\n\nPresiona Aceptar para ver los detalles del evento, o Cancelar para volver a pendientes.'
    );
    if (irADetalles) {
      router.replace(`/admin/EventDetailScreen?eventId=${form.idevento}`);
    } else {
      router.replace('/admin/EventosPendientes');
    }
  } else {
    Alert.alert(
      '✓ Actualizado',
      'Los cambios han sido guardados correctamente.',
      [
        {
          text: 'Ver detalles',
          onPress: () => {
            router.replace(`/admin/EventDetailScreen?eventId=${form.idevento}`);
          }
        },
        {
          text: 'Volver a pendientes',
          onPress: () => router.replace('/admin/EventosPendientes'),
          style: 'cancel'
        }
      ]
    );
  }
}

    } catch (error) {
      console.error('❌ Error detallado al guardar:', error);
      
      // ✅ Extraer el mensaje de error de forma segura
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.error || 
                       error.message || 
                       'No se pudieron guardar los cambios. Verifica tu conexión.';
      
      Alert.alert(
        'Error al guardar',
        errorMsg,
        [{ text: 'Entendido' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      '¿Descartar cambios?',
      'Los cambios no guardados se perderán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Descartar', 
          style: 'destructive',
          onPress: () => router.back() 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando datos para edición...</Text>
      </View>
    );
  }

  if (!form) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={60} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorText}>No se pudieron obtener los datos del evento</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderSectionHeader = (id, title, icon) => (
    <TouchableOpacity 
      style={[
        styles.sectionHeader,
        activeSection === id && styles.sectionHeaderActive
      ]}
      onPress={() => setActiveSection(id)}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={activeSection === id ? COLORS.primary : COLORS.textSecondary} 
      />
      <Text style={[
        styles.sectionHeaderText,
        activeSection === id && styles.sectionHeaderTextActive
      ]}>
        {title}
      </Text>
      {activeSection === id && (
        <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  const renderInput = (label, field, placeholder, multiline = false, required = false) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          errors[field] && styles.inputError
        ]}
        value={form[field] || ''}
        onChangeText={(text) => handleChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'auto'}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderDatePicker = (label, field, required = false) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.dateInput}>
        <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 10 }]}
          value={form[field] || ''}
          onChangeText={(text) => handleChange(field, text)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="default"
        />
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      <Text style={styles.hintText}>Formato: AAAA-MM-DD (ej: 2024-12-25)</Text>
    </View>
  );

  const renderTimePicker = (label, field, required = false) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.dateInput}>
        <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 10 }]}
          value={form[field] || ''}
          onChangeText={(text) => handleChange(field, text)}
          placeholder="HH:MM"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="default"
        />
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      <Text style={styles.hintText}>Formato: 24h (ej: 14:30)</Text>
    </View>
  );

  const renderReadOnlyField = (label, value) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.readOnlyInput}>
        <Text style={styles.readOnlyText}>{value || '—'}</Text>
      </View>
    </View>
  );

  const renderArrayInfo = (label, jsonArray, renderItem) => {
    const array = parseJSONSafe(jsonArray);
    if (!array || array.length === 0) return null;
    
    return (
      <View style={styles.arraySection}>
        <Text style={styles.arrayTitle}>{label} ({array.length})</Text>
        {array.map((item, index) => (
          <View key={index} style={styles.arrayItem}>
            {renderItem(item, index)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Editar Evento</Text>
          {mode === 'reprogramar' && (
            <View style={styles.modeBadge}>
              <Ionicons name="refresh-outline" size={12} color={COLORS.white} />
              <Text style={styles.modeBadgeText}>Reprogramación</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Ionicons name="close-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {mode === 'reprogramar' && (
            <View style={styles.reprogramBanner}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
              <Text style={styles.reprogramBannerText}>
                Ajusta la fecha, hora u otros detalles para reprogramar este evento.
              </Text>
            </View>
          )}

          {/* Sección: Datos Generales */}
          {renderSectionHeader('general', 'Datos Generales', 'document-text-outline')}
          {activeSection === 'general' && (
            <View style={styles.sectionContent}>
              {renderInput('Nombre del evento *', 'nombreevento', 'Ej: Conferencia de Innovación', false, true)}
              {renderDatePicker('Fecha *', 'fechaevento', true)}
              {renderTimePicker('Hora *', 'horaevento', true)}
              {renderInput('Ubicación *', 'lugarevento', 'Ej: Auditorio Principal', false, true)}
            </View>
          )}

          {renderSectionHeader('clasificacion', 'Clasificación', 'pricetag-outline')}
          {activeSection === 'clasificacion' && (
            <View style={styles.sectionContent}>
              {renderReadOnlyField('Clasificación', form.clasificacionNombre)}
              {renderReadOnlyField('Subcategoría', form.subcategoriaNombre)}
              <Text style={styles.infoNote}>
                <Ionicons name="information-circle" size={14} color={COLORS.info} />
                {' '}La clasificación estratégica no puede modificarse en esta etapa.
              </Text>
            </View>
          )}

          {renderSectionHeader('tipos', 'Tipos de Evento', 'layers-outline')}
          {activeSection === 'tipos' && (
            <View style={styles.sectionContent}>
              {renderArrayInfo(
                'Tipos asignados',
                form.tiposEvento,
                (item) => (
                  <Text style={styles.arrayItemText}>
                    • {item.nombretipo || `Tipo #${item.idtipoevento}`}
                  </Text>
                )
              )}
              {!parseJSONSafe(form.tiposEvento).length && (
                <Text style={styles.emptyText}>Sin tipos de evento asignados</Text>
              )}
            </View>
          )}

          {/* Sección: Objetivos */}
          {renderSectionHeader('objetivos', 'Objetivos', 'bulb-outline')}
          {activeSection === 'objetivos' && (
            <View style={styles.sectionContent}>
              {renderArrayInfo(
                'Objetivos principales',
                form.objetivos,
                (item, idx) => (
                  <View>
                    <Text style={styles.arrayItemText}>
                      <Text style={styles.arrayItemBold}>{idx + 1}. </Text>
                      {item.texto_personalizado || item.nombre_objetivo || 'Sin descripción'}
                    </Text>
                  </View>
                )
              )}
              {!parseJSONSafe(form.objetivos).length && (
                <Text style={styles.emptyText}>Sin objetivos definidos</Text>
              )}
            </View>
          )}

          {/* Sección: Objetivos PDI */}
          {renderSectionHeader('pdi', 'Objetivos PDI', 'school-outline')}
          {activeSection === 'pdi' && (
            <View style={styles.sectionContent}>
              {renderArrayInfo(
                'Vinculación con PDI Institucional',
                form.objetivosPDI,
                (item, idx) => (
                  <Text style={styles.arrayItemText}>
                    <Text style={styles.arrayItemBold}>{idx + 1}. </Text>
                    {item}
                  </Text>
                )
              )}
              {!parseJSONSafe(form.objetivosPDI).length && (
                <Text style={styles.emptyText}>Sin vinculación con PDI</Text>
              )}
            </View>
          )}

          {renderSectionHeader('resultados', 'Resultados Esperados', 'bar-chart-outline')}
          {activeSection === 'resultados' && (
            <View style={styles.sectionContent}>
              {renderInput('Participación esperada', 'participacion_esperada', 'Ej: 85% de asistencia')}
              {renderInput('Satisfacción esperada', 'satisfaccion_esperada', 'Ej: 90% de satisfacción')}
              {renderInput('Otros resultados', 'otros_resultados', 'Describe otros indicadores...', true)}
            </View>
          )}

          {/* Sección: Recursos */}
          {renderSectionHeader('recursos', 'Recursos Solicitados', 'cube-outline')}
          {activeSection === 'recursos' && (
            <View style={styles.sectionContent}>
              {renderArrayInfo(
                'Listado de recursos',
                form.recursos,
                (item) => (
                  <Text style={styles.arrayItemText}>
                    • {item.cantidad || 1} x {item.nombre_recurso} ({item.recurso_tipo})
                  </Text>
                )
              )}
              {!parseJSONSafe(form.recursos).length && (
                <Text style={styles.emptyText}>Sin recursos solicitados</Text>
              )}
            </View>
          )}

          {/* Sección: Comité */}
          {renderSectionHeader('comite', 'Comité del Evento', 'people-outline')}
          {activeSection === 'comite' && (
            <View style={styles.sectionContent}>
              {renderArrayInfo(
                'Miembros del comité',
                form.comite,
                (item) => (
                  <View>
                    <Text style={styles.arrayItemText}>
                      <Text style={styles.arrayItemBold}>
                        {[item.nombre, item.apellidopat, item.apellidomat].filter(Boolean).join(' ')}
                      </Text>
                    </Text>
                    <Text style={styles.arrayItemSubtext}>
                      {item.role === 'academico' ? 'Académico' : item.role} • {item.email}
                    </Text>
                  </View>
                )
              )}
              {!parseJSONSafe(form.comite).length && (
                <Text style={styles.emptyText}>Sin comité asignado</Text>
              )}
            </View>
          )}

          {/* Sección: Presupuesto */}
          {renderSectionHeader('presupuesto', 'Presupuesto', 'cash-outline')}
          {activeSection === 'presupuesto' && (
            <View style={styles.sectionContent}>
              {(() => {
                const presupuesto = parseJSONSafe(form.presupuesto, {});
                const egresos = parseJSONSafe(form.egresos, []);
                const ingresos = parseJSONSafe(form.ingresos, []);
                
                return (
                  <View>
                    <View style={styles.budgetSummary}>
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetLabel}>Total Egresos:</Text>
                        <Text style={styles.budgetValue}>Bs {parseFloat(presupuesto.total_egresos || 0).toFixed(2)}</Text>
                      </View>
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetLabel}>Total Ingresos:</Text>
                        <Text style={[styles.budgetValue, { color: COLORS.success }]}>
                          Bs {parseFloat(presupuesto.total_ingresos || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.budgetRow, styles.budgetBalance]}>
                        <Text style={styles.budgetLabel}>Balance:</Text>
                        <Text style={[
                          styles.budgetValue,
                          { color: (presupuesto.balance || 0) >= 0 ? COLORS.success : COLORS.danger }
                        ]}>
                          Bs {parseFloat(presupuesto.balance || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    
                    {egresos.length > 0 && (
                      <View style={styles.budgetSubsection}>
                        <Text style={styles.budgetSubsectionTitle}>Egresos ({egresos.length})</Text>
                        {egresos.map((e, i) => (
                          <View key={i} style={styles.budgetItem}>
                            <Text style={styles.budgetItemDesc}>{e.descripcion}</Text>
                            <Text style={styles.budgetItemAmount}>
                              {e.cantidad} x Bs {parseFloat(e.precio_unitario).toFixed(2)} = {' '}
                              <Text style={styles.budgetItemTotal}>Bs {parseFloat(e.total).toFixed(2)}</Text>
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {ingresos.length > 0 && (
                      <View style={styles.budgetSubsection}>
                        <Text style={styles.budgetSubsectionTitle}>Ingresos ({ingresos.length})</Text>
                        {ingresos.map((i, idx) => (
                          <View key={idx} style={styles.budgetItem}>
                            <Text style={styles.budgetItemDesc}>{i.descripcion}</Text>
                            <Text style={styles.budgetItemAmount}>
                              {i.cantidad} x Bs {parseFloat(i.precio_unitario).toFixed(2)} = {' '}
                              <Text style={[styles.budgetItemTotal, { color: COLORS.success }]}>
                                Bs {parseFloat(i.total).toFixed(2)}
                              </Text>
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    <Text style={styles.infoNote}>
                      <Ionicons name="information-circle" size={14} color={COLORS.info} />
                      {' '}Para modificar el presupuesto, contacta al área financiera.
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Espacio final para scroll */}
          <View style={styles.scrollSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer con botones */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.footerButton, styles.cancelButton]}
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.footerButton, styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color={COLORS.white} />
              <Text style={styles.saveButtonText}>
                {mode === 'reprogramar' ? 'Actualizar y Reprogramar' : 'Guardar Cambios'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  scrollViewContent: { paddingBottom: 100 },
  scrollSpacer: { height: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: { padding: 8 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  modeBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.white },

  // Banner de reprogramación
  reprogramBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 16,
    marginTop: 12,
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

  // Secciones
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  sectionHeaderText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sectionHeaderTextActive: {
    color: COLORS.primary,
  },
  sectionContent: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  // Inputs
  inputContainer: { gap: 6 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  required: { color: COLORS.danger },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FEF2F2',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  readOnlyInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  arraySection: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  arrayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  arrayItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  arrayItemText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  arrayItemBold: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  arrayItemSubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Presupuesto
  budgetSummary: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetBalance: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  budgetLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  budgetSubsection: {
    marginTop: 8,
    gap: 8,
  },
  budgetSubsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  budgetItem: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  budgetItemDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  budgetItemAmount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  budgetItemTotal: {
    fontWeight: '700',
    color: COLORS.primary,
  },

  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  footerButton: {
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
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

EditEventScreen.options = { headerShown: false };

export default EditEventScreen;