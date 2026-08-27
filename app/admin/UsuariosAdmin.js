import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Platform,
  RefreshControl,
  Dimensions,
  Modal,
  Pressable,
  ScrollView
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

const API_BASE_URL = 'https://unibackend-production-a0f8.up.railway.app';

const getTokenAsync = async () => {
  const TOKEN_KEY = 'adminAuthToken';
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al acceder a localStorage en web:", e);
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error al obtener token de SecureStore en nativo:", e);
      return null;
    }
  }
};

const deleteTokenAsync = async () => {
  const TOKEN_KEY = 'adminAuthToken';
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token de localStorage en web:", e);
    }
  } else {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e){
      console.error("Error al eliminar token de SecureStore en nativo:", e);
    }
  }
};

const groupUsersByRole = (users) => { 
  const groups = {};
  users.forEach(user => {
    const role = user.role?.toLowerCase() || 'sin_rol';
    if (!groups[role]) groups[role] = [];
    groups[role].push(user);
  });
  return groups;
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

const UsuariosAdmin = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  
  const [userToEdit, setUserToEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    apellidopat: '',
    apellidomat: '',
    username: '',
    email: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  
  const params = useLocalSearchParams();

  const fetchUsers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    let localToken = null;

    try {
      localToken = await getTokenAsync();

      if (!localToken) {
        Alert.alert('Autenticación Requerida', 'No se encontró el token. Por favor, inicia sesión de nuevo.', [
          { text: 'OK', onPress: () => router.replace('/LoginAdmin') }
        ]);
        setUsers([]);
        setFilteredUsers([]);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${localToken}` }
      });

      const usersData = Array.isArray(response.data) ? response.data : (response.data.data || []);
      const processedUsers = usersData.map(user => ({
        ...user,
        id: user.idusuario || user.id // Aseguramos que 'id' siempre exista
      }));

      setUsers(processedUsers);
      setFilteredUsers(processedUsers);

    } catch (error) {
      console.error("❌ Error fetching users:", error);
      let errorMessage = 'No se pudieron cargar los usuarios.';
      if (error.response?.status === 401) {
        errorMessage = 'No autorizado. Tu sesión podría haber expirado.';
        await deleteTokenAsync();
        router.replace('/LoginAdmin');
      } else if (error.response) {
        errorMessage = `Error del servidor: ${error.response.status}.`;
      } else if (error.request) {
        errorMessage = 'No se pudo conectar al servidor.';
      } else {
        errorMessage = error.message;
      }
      Alert.alert('Error de Carga', errorMessage);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchUsers(true);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (params.refresh) {
        fetchUsers();
      }
    }, [params.refresh])
  );

  useEffect(() => {
    if (!users) {
      setFilteredUsers([]);
      return;
    }

    let filtered = users;
    if (searchTerm !== '') {
      filtered = filtered.filter(user =>
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }
    setFilteredUsers(filtered);
  }, [searchTerm, users, filterRole]);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = await getTokenAsync();
        if (token) {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
          );
          const payload = JSON.parse(jsonPayload);
          const userId = payload.idusuario;

          if (users && users.length > 0) {
            const currentUserData = users.find(u => u.idusuario === userId || u.id === userId);
            if (currentUserData) {
              setCurrentUser({
                id: currentUserData.idusuario || currentUserData.id,
                username: currentUserData.username,
                email: currentUserData.email,
                role: currentUserData.role,
                nombre: currentUserData.nombre,
                apellidopat: currentUserData.apellidopat,
                apellidomat: currentUserData.apellidomat,
              });
            }
          }
        }
      } catch (error) {
        console.error("❌ Error al obtener usuario actual:", error);
      }
    };
    getCurrentUser();
  }, [users]);

  const handleAddUser = () => {
    router.push('/admin/CrearUsuarioA');
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const openEditModal = (user) => {
    setUserToEdit(user);
    setEditFormData({
      nombre: user.nombre || '',
      apellidopat: user.apellidopat || '',
      apellidomat: user.apellidomat || '',
      username: user.username || '',
      email: user.email || '',
    });
    setShowEditModal(true);
  };

  // ✅ FUNCIÓN CORREGIDA: Dar de baja / Deshabilitar usuario
  const handleDisableUser = async (userId) => {
    console.log("🔴 handleDisableUser llamado con userId:", userId);
    
    const isConfirmed = await new Promise((resolve) => {
      Alert.alert(
        "Dar de baja al usuario",
        "¿Estás seguro de que quieres deshabilitar a este usuario? No podrá iniciar sesión.",
        [
          { text: "Cancelar", onPress: () => resolve(false), style: "cancel" },
          { text: "Sí, dar de baja", onPress: () => resolve(true), style: "destructive" }
        ]
      );
    });

    console.log("✅ Confirmación del usuario:", isConfirmed);
    if (!isConfirmed) return;

    try {
      const token = await getTokenAsync();
      console.log("📡 Enviando petición a:", `${API_BASE_URL}/users/${userId}`);
      
      const response = await axios.put(
        `${API_BASE_URL}/users/${userId}`, 
        { habilitado: 0 }, // ⚠️ CAMBIO CLAVE: Usar 0 en lugar de false, ya que en el registro usamos 1/0
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log("✅ Respuesta exitosa del servidor:", response.data);
      Alert.alert("Éxito", "Usuario dado de baja correctamente.");
      fetchUsers(true); // Recargar la lista para reflejar el cambio
    } catch (error) {
      console.error("❌ Error completo al deshabilitar usuario:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error desconocido';
      Alert.alert('Error', `No se pudo dar de baja al usuario: ${errorMsg}`);
    }
  };

  const handleUpdateUser = async () => {
    if (!userToEdit) return;
    
    if (!editFormData.nombre || !editFormData.email || !editFormData.username) {
      Alert.alert('Campos obligatorios', 'Nombre, usuario y correo electrónico son requeridos.');
      return;
    }

    setIsUpdating(true);
    try {
      const token = await getTokenAsync();
      await axios.put(
        `${API_BASE_URL}/users/${userToEdit.id}`, 
        editFormData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      Alert.alert('Éxito', 'El perfil ha sido actualizado correctamente.');
      setShowEditModal(false);
      
      setUsers(prevUsers => 
        prevUsers.map(u => (u.id === userToEdit.id ? { ...u, ...editFormData } : u))
      );

      if (currentUser && currentUser.id === userToEdit.id) {
        setCurrentUser(prev => ({ ...prev, ...editFormData }));
      }

    } catch (error) {
      console.error("❌ Error al actualizar perfil:", error);
      Alert.alert('Error', 'No se pudo actualizar el perfil. Verifica tu conexión o intenta más tarde.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return COLORS.accent;
      case 'user': return COLORS.info;
      case 'daf': return COLORS.warning;
      case 'student': return COLORS.secondary;
      case 'academico': return COLORS.primary;
      default: return COLORS.textTertiary;
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'shield-checkmark-outline';
      case 'user': return 'person-outline';
      case 'daf': return 'people-outline';
      case 'student': return 'school-outline';
      case 'academico': return 'book-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderFilterChips = () => {
    const roles = ['all', 'admin', 'user', 'daf', 'student', 'academico'];
    return (
      <View style={styles.filterContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
            onPress={() => setFilterRole(role)}
          >
            <Text style={[styles.filterChipText, filterRole === role && styles.filterChipTextActive]}>
              {role === 'all' ? 'Todos' : role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderUserModal = () => (
    <Modal visible={showUserModal} transparent={true} animationType="fade" onRequestClose={() => setShowUserModal(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setShowUserModal(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalles del Usuario</Text>
            <TouchableOpacity onPress={() => setShowUserModal(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          {selectedUser && (
            <View style={styles.modalBody}>
              <View style={styles.modalUserAvatar}>
                <View style={[styles.modalAvatar, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                  <Text style={styles.modalAvatarText}>
                    {(selectedUser.username || selectedUser.email || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.modalUserInfo}>
                <Text style={styles.modalUserName}>{selectedUser.username || 'Sin nombre'}</Text>
                <Text style={styles.modalUserEmail}>{selectedUser.email || 'Sin email'}</Text>
                <View style={styles.modalRoleContainer}>
                  <Ionicons name={getRoleIcon(selectedUser.role)} size={16} color={getRoleColor(selectedUser.role)} />
                  <Text style={[styles.modalUserRole, { color: getRoleColor(selectedUser.role) }]}>
                    {selectedUser.role || 'Sin rol'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );

  const renderEditUserModal = () => (
    <Modal visible={showEditModal} transparent={true} animationType="slide" onRequestClose={() => setShowEditModal(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {userToEdit && currentUser && userToEdit.id === currentUser.id ? 'Editar Mi Perfil' : 'Editar Usuario'}
            </Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput style={styles.input} value={editFormData.nombre} onChangeText={(text) => setEditFormData({ ...editFormData, nombre: text })} placeholder="Tu nombre" />
            
            <Text style={styles.inputLabel}>Apellido Paterno</Text>
            <TextInput style={styles.input} value={editFormData.apellidopat} onChangeText={(text) => setEditFormData({ ...editFormData, apellidopat: text })} placeholder="Apellido paterno" />
            
            <Text style={styles.inputLabel}>Apellido Materno</Text>
            <TextInput style={styles.input} value={editFormData.apellidomat} onChangeText={(text) => setEditFormData({ ...editFormData, apellidomat: text })} placeholder="Apellido materno" />
            
            <Text style={styles.inputLabel}>Nombre de Usuario</Text>
            <TextInput style={styles.input} value={editFormData.username} onChangeText={(text) => setEditFormData({ ...editFormData, username: text })} placeholder="Nombre de usuario" autoCapitalize="none" />
            
            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <TextInput style={styles.input} value={editFormData.email} onChangeText={(text) => setEditFormData({ ...editFormData, email: text })} placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" />
            
            <TouchableOpacity style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]} onPress={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar Cambios</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );

  if (loading && (!users || users.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Gestionar Usuarios',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity onPress={handleAddUser} style={styles.headerButton}>
              <Ionicons name="add-circle" size={28} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {currentUser && (
          <View style={styles.currentUserCard}>
            <View style={styles.currentUserHeader}>
              <View style={styles.currentUserHeaderLeft}>
                <Ionicons name="person-circle" size={24} color={COLORS.primary} />
                <Text style={styles.currentUserTitle}>Mi Perfil</Text>
              </View>
              <TouchableOpacity style={styles.editProfileButton} onPress={() => openEditModal(currentUser)}>
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                <Text style={styles.editProfileText}>Editar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.currentUserContent}>
              <View style={styles.currentUserAvatar}>
                <Text style={styles.currentUserAvatarText}>
                  {(currentUser.nombre || currentUser.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.currentUserDetails}>
                <Text style={styles.currentUserUsername}>{currentUser.nombre} {currentUser.apellidopat}</Text>
                <Text style={styles.currentUserEmail}>{currentUser.email || 'Sin email'}</Text>
                <View style={styles.currentUserRoleBadge}>
                  <Text style={styles.currentUserRoleText}>{currentUser.role || 'Sin rol'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Buscar por nombre o email..." value={searchTerm} onChangeText={setSearchTerm} placeholderTextColor="#888" />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {renderFilterChips()}

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
            {searchTerm || filterRole !== 'all' ? ' encontrados' : ' total'}
          </Text>
        </View>

        {!loading && filteredUsers.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.noUsersText}>
              {searchTerm || filterRole !== 'all' ? 'No se encontraron usuarios con los filtros aplicados.' : 'No hay usuarios para mostrar.'}
            </Text>
            {(searchTerm || filterRole !== 'all') && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={() => { setSearchTerm(''); setFilterRole('all'); }}>
                <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContentContainer}>
            {Object.entries(groupUsersByRole(filteredUsers)).map(([role, usersList]) => (
              <View key={role} style={styles.roleSection}>
                <View style={styles.roleHeader}>
                  <Ionicons name={getRoleIcon(role)} size={20} color={getRoleColor(role)} />
                  <Text style={styles.roleTitle}>
                    {role === 'sin_rol' ? 'Sin Rol' : role.charAt(0).toUpperCase() + role.slice(1)} ({usersList.length})
                  </Text>
                </View>
                {usersList.map((user) => (
                  <View key={user.id} style={[styles.userItemContainer, { marginBottom: 8 }]}>
                    <View style={styles.userAvatarContainer}>
                      <View style={[styles.userAvatar, { backgroundColor: getRoleColor(user.role) }]}>
                        <Text style={styles.avatarText}>
                          {(user.username || user.email || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(user.role) }]}>
                        <Ionicons name={getRoleIcon(user.role)} size={12} color="#fff" />
                      </View>
                    </View>

                    <View style={styles.userInfo}>
                      <Text style={styles.username} numberOfLines={1}>{user.username || 'Sin nombre'}</Text>
                      <Text style={styles.userEmail} numberOfLines={1}>{user.email || 'Sin email'}</Text>
                      <View style={styles.roleContainer}>
                        <Text style={[styles.userRole, { color: getRoleColor(user.role) }]}>{user.role || 'Sin rol'}</Text>
                      </View>
                    </View>

                    <View style={styles.userActions}>
                      <TouchableOpacity onPress={() => openEditModal(user)} style={[styles.actionButton, styles.editButton]} activeOpacity={0.7}>
                        <Ionicons name="pencil-outline" size={20} color={COLORS.warning} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity onPress={() => handleViewUser(user)} style={[styles.actionButton, styles.viewButton]} activeOpacity={0.7}>
                        <Ionicons name="eye-outline" size={20} color={COLORS.info} />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleDisableUser(user.id)} 
                        style={[styles.actionButton, styles.disableButton]} 
                        activeOpacity={0.7}
                      >
                        <Ionicons name="ban-outline" size={20} color={COLORS.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {renderUserModal()}
      {renderEditUserModal()} 
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: COLORS.textSecondary },
  roleSection: { marginBottom: 24 },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 8 },
  headerButton: { marginRight: 15, padding: 5 },
  currentUserCard: { backgroundColor: COLORS.surface, margin: 15, marginTop: 10, borderRadius: 12, padding: 15, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3 },
  currentUserHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  currentUserHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  currentUserTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 8 },
  editProfileButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editProfileText: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginLeft: 4 },
  currentUserContent: { flexDirection: 'row', alignItems: 'center' },
  currentUserAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  currentUserAvatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  currentUserDetails: { flex: 1 },
  currentUserUsername: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  currentUserEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  currentUserRoleBadge: { backgroundColor: 'rgba(233, 90, 12, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  currentUserRoleText: { fontSize: 12, fontWeight: '500', color: COLORS.primary, textTransform: 'capitalize' },
  searchContainer: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 10 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 15, height: 50, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  clearButton: { padding: 5 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10 },
  filterChip: { backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: COLORS.white },
  statsContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  statsText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  listContentContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  userItemContainer: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3 },
  userAvatarContainer: { position: 'relative', marginRight: 15 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  roleIndicator: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  roleContainer: { flexDirection: 'row', alignItems: 'center' },
  userRole: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize', backgroundColor: 'rgba(233, 90, 12, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  userActions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: 10, borderRadius: 8, marginLeft: 5 },
  viewButton: { backgroundColor: 'rgba(52, 152, 219, 0.1)' },
  editButton: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  disableButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  noUsersText: { fontSize: 16, color: COLORS.textTertiary, textAlign: 'center', marginTop: 20 },
  clearFiltersButton: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 8 },
  clearFiltersText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, width: width * 0.9, maxWidth: 400, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  modalCloseButton: { padding: 5 },
  modalBody: { padding: 20 },
  modalUserAvatar: { alignItems: 'center', marginBottom: 20 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  modalAvatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  modalUserInfo: { alignItems: 'center', marginBottom: 25 },
  modalUserName: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 5 },
  modalUserEmail: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 10 },
  modalRoleContainer: { flexDirection: 'row', alignItems: 'center' },
  modalUserRole: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize', marginLeft: 5, backgroundColor: 'rgba(233, 90, 12, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.textPrimary },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 10 },
  saveButtonDisabled: { backgroundColor: COLORS.textTertiary },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});

export default UsuariosAdmin;