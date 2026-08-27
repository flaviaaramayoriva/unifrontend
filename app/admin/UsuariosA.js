import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
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
    } catch (e) {
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

const UsuarioA = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  
  // Referencia para evitar doble carga en el montaje inicial
  const isFirstRender = useRef(true);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    console.log("UsuariosA: Ejecutando fetchUsers (isRefresh:", isRefresh, ")...");
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    let localToken = null;

    try {
      localToken = await getTokenAsync();

      if (!localToken) {
        Alert.alert(
          'Autenticación Requerida',
          'No se encontró el token de administrador. Por favor, inicia sesión de nuevo.',
          [{ text: 'OK', onPress: () => router.replace('/LoginAdmin') }]
        );
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
        id: user.idusuario
      }));

      setUsers(processedUsers);
      setFilteredUsers(processedUsers);

    } catch (error) {
      console.error("UsuariosA: Error fetching users from API:", error);
      let errorMessage = 'No se pudieron cargar los usuarios.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'No autorizado. Tu sesión podría haber expirado.';
          await deleteTokenAsync();
          router.replace('/LoginAdmin');
          return; // Salir temprano, no necesitamos mostrar alerta ni limpiar datos
        } else {
          errorMessage = `Error del servidor: ${error.response.status}.`;
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión.';
      } else {
        errorMessage = error.message;
      }
      
      // Solo mostramos alerta si es la carga inicial. En segundo plano fallamos silenciosamente.
      if (!isRefresh) {
        Alert.alert('Error de Carga', errorMessage);
        setUsers([]);
        setFilteredUsers([]);
      } else {
        console.warn("UsuariosA: Error en refresco de fondo, se mantienen los datos actuales.", errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  // Maneja tanto la carga inicial como las actualizaciones al volver a la pantalla
  useFocusEffect(
    useCallback(() => {
      if (isFirstRender.current) {
        console.log("UsuariosA: Montaje inicial, llamando a fetchUsers.");
        fetchUsers(false);
        isFirstRender.current = false;
      } else {
        console.log("UsuariosA: Pantalla en foco, actualizando datos en segundo plano...");
        fetchUsers(true); // isRefresh=true evita el loader de pantalla completa
      }
    }, [fetchUsers])
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

  const handleAddUser = () => {
    router.push('/admin/CrearUsuarioA');
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDisableUser = async (Id) => {
    const isConfirmed = await new Promise((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm("¿Estás seguro de que quieres deshabilitar este usuario?"));
      } else {
        Alert.alert(
          "Deshabilitar Usuario",
          "¿Estás seguro de que quieres deshabilitar este usuario?",
          [
            { text: "Cancelar", onPress: () => resolve(false), style: "cancel" },
            { text: "Sí, Deshabilitar", onPress: () => resolve(true), style: "destructive" }
          ]
        );
      }
    });

    if (!isConfirmed) return;

    const localToken = await getTokenAsync();
    if (!localToken) {
      const msg = 'Token no disponible. Inicia sesión de nuevo.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/users/${Id}`, 
        { habilitado: false }, 
        { headers: { 'Authorization': `Bearer ${localToken}` } }
      );
      
      const successMsg = "Usuario deshabilitado correctamente.";
      Platform.OS === 'web' ? window.alert(successMsg) : Alert.alert("Éxito", successMsg);
      
      fetchUsers(true); // Refrescar después de deshabilitar
    } catch (error) {
      console.error(`UsuariosA: Error deshabilitando usuario ${Id}:`, error);
      const errorMsg = "No se pudo deshabilitar el usuario. Verifica el backend.";
      Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert('Error', errorMsg);
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

  const renderUserItem = ({ item }) => {
    const areaAcademica = item.academico?.carrera?.nombrecarrera || 'Área no asignada';
    
    return (
      <View style={[styles.userItemContainer, { opacity: loading ? 0.6 : 1 }]}>
        <View style={styles.userAvatarContainer}>
          <View style={[styles.userAvatar, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.avatarText}>
              {(item.username || item.email || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(item.role) }]}>
            <Ionicons name={getRoleIcon(item.role)} size={12} color="#fff" />
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.username} numberOfLines={1}>
            {item.username || 'Sin nombre'}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {item.email || 'Sin email'}
          </Text>
          <View style={styles.roleContainer}>
            <Text style={[styles.userRole, { color: getRoleColor(item.role) }]}>
              {item.role || 'Sin rol'}
            </Text>
          </View>
          {item.role?.toLowerCase() === 'academico' && (
            <View style={styles.areaContainer}>
              <Ionicons name="school-outline" size={14} color={COLORS.primary} />
              <Text style={styles.userArea} numberOfLines={1}>
                {areaAcademica}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            onPress={() => handleViewUser(item)}
            style={[styles.actionButton, styles.viewButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={20} color={COLORS.info} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/admin/editUser/${item.id}`)}
            style={[styles.actionButton, styles.editButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color={COLORS.warning} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDisableUser(item.id)}
            style={[styles.actionButton, styles.deleteButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="ban-outline" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFilterChips = () => {
    const roles = ['all', 'admin', 'user', 'daf', 'student', 'academico'];
    return (
      <View style={styles.filterContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role}
            style={[
              styles.filterChip,
              filterRole === role && styles.filterChipActive
            ]}
            onPress={() => setFilterRole(role)}
          >
            <Text style={[
              styles.filterChipText,
              filterRole === role && styles.filterChipTextActive
            ]}>
              {role === 'all' ? 'Todos' : role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderUserModal = () => (
    <Modal
      visible={showUserModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowUserModal(false)}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setShowUserModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalles del Usuario</Text>
            <TouchableOpacity
              onPress={() => setShowUserModal(false)}
              style={styles.modalCloseButton}
            >
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
                <Text style={styles.modalUserName}>
                  {selectedUser.username || 'Sin nombre'}
                </Text>
                <Text style={styles.modalUserEmail}>
                  {selectedUser.email || 'Sin email'}
                </Text>
                <View style={styles.modalRoleContainer}>
                  <Ionicons
                    name={getRoleIcon(selectedUser.role)}
                    size={16}
                    color={getRoleColor(selectedUser.role)}
                  />
                  <Text style={[styles.modalUserRole, { color: getRoleColor(selectedUser.role) }]}>
                    {selectedUser.role || 'Sin rol'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalEditButton]}
                  onPress={() => {
                    setShowUserModal(false);
                    router.push(`/admin/editUser/${selectedUser.id}`);
                  }}
                >
                  <Ionicons name="pencil" size={16} color="#fff" />
                  <Text style={styles.modalActionButtonText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalDeleteButton]}
                  onPress={() => {
                    setShowUserModal(false);
                    handleDisableUser(selectedUser.id); 
                  }}
                >
                  <Ionicons name="ban" size={16} color="#fff" />
                  <Text style={styles.modalActionButtonText}>Deshabilitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={{ marginLeft: 15, padding: 5 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleAddUser} style={styles.headerButton}>
              <Ionicons name="add-circle" size={28} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchUsers(true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#888"
            />
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
              {searchTerm || filterRole !== 'all'
                ? 'No se encontraron usuarios con los filtros aplicados.'
                : 'No hay usuarios para mostrar.'}
            </Text>
            {(searchTerm || filterRole !== 'all') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchTerm('');
                  setFilterRole('all');
                }}
              >
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
                    {role === 'sin_rol'
                      ? 'Sin Rol'
                      : role.charAt(0).toUpperCase() + role.slice(1)} ({usersList.length})
                  </Text>
                </View>
                {usersList.map((user) => (
                  <View key={user.id}>
                    {renderUserItem({ item: user })}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleAddUser} 
        accessibilityLabel="Añadir nuevo usuario"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {renderUserModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  areaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  userArea: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 6, fontStyle: 'italic' },
  loadingText: { marginTop: 10, fontSize: 16, color: COLORS.textSecondary },
  roleSection: { marginBottom: 24 },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 8 },
  headerButton: { marginRight: 15, padding: 5 },
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 8 },
    }),
  },
  searchContainer: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 10 },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, paddingHorizontal: 15, height: 50,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  clearButton: { padding: 5 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10 },
  filterChip: {
    backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 15,
    paddingVertical: 8, marginRight: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: COLORS.white },
  statsContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  statsText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  listContentContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  userItemContainer: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 15, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3,
  },
  userAvatarContainer: { position: 'relative', marginRight: 15 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  roleIndicator: {
    position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  roleContainer: { flexDirection: 'row', alignItems: 'center' },
  userRole: {
    fontSize: 12, fontWeight: '500', textTransform: 'capitalize',
    backgroundColor: 'rgba(233, 90, 12, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  userActions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: 10, borderRadius: 8, marginLeft: 5 },
  viewButton: { backgroundColor: 'rgba(52, 152, 219, 0.1)' },
  editButton: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  deleteButton: { backgroundColor: 'rgba(231, 76, 60, 0.1)' },
  noUsersText: { fontSize: 16, color: COLORS.textTertiary, textAlign: 'center', marginTop: 20 },
  clearFiltersButton: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 8 },
  clearFiltersText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, width: width * 0.9, maxWidth: 400, overflow: 'hidden' },
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
  modalUserRole: {
    fontSize: 14, fontWeight: '500', textTransform: 'capitalize', marginLeft: 5,
    backgroundColor: 'rgba(233, 90, 12, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around' },
  modalActionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 100, justifyContent: 'center' },
  modalEditButton: { backgroundColor: COLORS.warning },
  modalDeleteButton: { backgroundColor: COLORS.accent },
  modalActionButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginLeft: 5 },
});

export default UsuarioA;