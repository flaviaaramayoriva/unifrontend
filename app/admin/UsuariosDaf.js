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
    } catch (e) {
      console.error("Error al eliminar token de SecureStore en nativo:", e);
    }
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

const UsuariosDaf = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // 👇 NUEVO: Estado para guardar la información del usuario que inició sesión
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const params = useLocalSearchParams();

  // 👇 NUEVO: Decodificar el token al cargar para saber quién está logueado
  useEffect(() => {
    const loadUserInfo = async () => {
      const token = await getTokenAsync();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUserId(payload.idusuario || payload.id);
          setCurrentUserRole(payload.role);
          console.log('👤 Usuario logueado ID:', payload.idusuario || payload.id, 'Rol:', payload.role);
        } catch (e) {
          console.error('Error al decodificar token', e);
        }
      }
    };
    loadUserInfo();
  }, []);

  const fetchUsers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

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

      console.log('=== DATOS CRUDOS DE LA API ===');
      console.log('Total de usuarios recibidos:', response.data.length);

      const usersData = Array.isArray(response.data) ? response.data : (response.data.data || []);
      
      const dafUsers = usersData.filter(user => 
        user.role?.toLowerCase() === 'daf'
      );
      
      console.log('Usuarios DAF filtrados:', dafUsers.length);

      const processedUsers = dafUsers.map(user => ({
        ...user,
        id: user.idusuario
      }));

      setUsers(processedUsers);
      setFilteredUsers(processedUsers);

    } catch (error) {
      console.error("Error fetching users from API:", error);
      let errorMessage = 'No se pudieron cargar los usuarios.';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'No autorizado. Tu sesión podría haber expirado.';
          await deleteTokenAsync();
          router.replace('/LoginAdmin');
        } else if (error.response.status === 403) {
          errorMessage = 'No tienes permisos para acceder a esta sección.';
        } else {
          errorMessage = `Error del servidor: ${error.response.status}. ${error.response.data?.message || ''}`;
        }
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
        console.log('🔄 Recargando lista de usuarios DAF...');
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

    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleAddUser = () => {
    router.push('/admin/CrearUsuarioDaf');
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert(
      "Eliminar Usuario",
      "¿Estás seguro de que quieres eliminar este usuario?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Eliminar",
          onPress: async () => {
            let localTokenForDelete = await getTokenAsync();
            if (!localTokenForDelete) {
              Alert.alert('Error de Autenticación', 'Token no disponible para eliminar.');
              return;
            }
            try {
              await axios.delete(`${API_BASE_URL}/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${localTokenForDelete}` }
              });
              Alert.alert("Usuario Eliminado", `El usuario ha sido eliminado del servidor.`);
              fetchUsers();
            } catch (error) {
              console.error(`Error deleting user ${userId}:`, error);
              Alert.alert('Error', 'No se pudo eliminar el usuario.');
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const getRoleColor = () => COLORS.warning;
  const getRoleIcon = () => 'people-outline';

  const renderUserItem = ({ item }) => {
    // 👇 LÓGICA CLAVE: Solo mostrar botón de editar si es Admin O es su propio perfil
    const canEdit = currentUserRole === 'admin' || currentUserId === item.id;

    return (
      <View style={[styles.userItemContainer, { opacity: loading ? 0.6 : 1 }]}>
        <View style={styles.userAvatarContainer}>
          <View style={[styles.userAvatar, { backgroundColor: getRoleColor() }]}>
            <Text style={styles.avatarText}>
              {(item.username || item.email || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.roleIndicator, { backgroundColor: getRoleColor() }]}>
            <Ionicons name={getRoleIcon()} size={12} color="#fff" />
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
            <Ionicons name="people-outline" size={14} color={COLORS.warning} />
            <Text style={[styles.userRole, { color: COLORS.warning }]}>
              DAF
            </Text>
          </View>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            onPress={() => handleViewUser(item)}
            style={[styles.actionButton, styles.viewButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={20} color={COLORS.info} />
          </TouchableOpacity>

          {/* 👇 BOTÓN DE EDITAR CONDICIONAL */}
          {canEdit && (
            <TouchableOpacity
              onPress={() => router.push(`/admin/editUser/${item.id}`)}
              style={[styles.actionButton, styles.editButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={20} color={COLORS.warning} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => handleDeleteUser(item.id)}
            style={[styles.actionButton, styles.deleteButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUserModal = () => {
    // 👇 LÓGICA CLAVE TAMBIÉN PARA EL MODAL
    const canEdit = currentUserRole === 'admin' || currentUserId === selectedUser?.id;

    return (
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
              <Text style={styles.modalTitle}>Detalles del Usuario DAF</Text>
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
                  <View style={[styles.modalAvatar, { backgroundColor: COLORS.warning }]}>
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
                    <Ionicons name="people-outline" size={16} color={COLORS.warning} />
                    <Text style={[styles.modalUserRole, { color: COLORS.warning }]}>
                      DAF
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  {/* 👇 BOTÓN DE EDITAR CONDICIONAL EN EL MODAL */}
                  {canEdit && (
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
                  )}

                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalDeleteButton]}
                    onPress={() => {
                      setShowUserModal(false);
                      handleDeleteUser(selectedUser.id);
                    }}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                    <Text style={styles.modalActionButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    );
  };

  if (loading && (!users || users.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando usuarios DAF...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Usuarios DAF',
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBanner}>
          <Ionicons name="people" size={22} color={COLORS.warning} />
          <Text style={styles.infoBannerText}>
            Listado de usuarios con rol DAF
          </Text>
        </View>

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

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario DAF' : 'usuarios DAF'}
            {searchTerm ? ' encontrados' : ' en total'}
          </Text>
        </View>

        {!loading && filteredUsers.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.noUsersText}>
              {searchTerm
                ? 'No se encontraron usuarios DAF con ese criterio.'
                : 'No hay usuarios DAF registrados.'}
            </Text>
            {searchTerm && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => setSearchTerm('')}
              >
                <Text style={styles.clearFiltersText}>Limpiar búsqueda</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContentContainer}>
            {filteredUsers.map((user) => (
              <View key={user.id}>
                {renderUserItem({ item: user })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddUser}
        accessibilityLabel="Añadir nuevo usuario DAF"
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  headerButton: { marginRight: 15, padding: 5 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
    }),
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 15,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  infoBannerText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  clearButton: { padding: 5 },
  statsContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  statsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  listContentContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  userItemContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  userAvatarContainer: { position: 'relative', marginRight: 15 },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  roleIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: { flex: 1 },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  roleContainer: { flexDirection: 'row', alignItems: 'center' },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  userActions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: 10, borderRadius: 8, marginLeft: 5 },
  viewButton: { backgroundColor: 'rgba(52, 152, 219, 0.1)' },
  editButton: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  deleteButton: { backgroundColor: 'rgba(231, 76, 60, 0.1)' },
  noUsersText: {
    fontSize: 16,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 20,
  },
  clearFiltersButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalCloseButton: { padding: 5 },
  modalBody: { padding: 20 },
  modalUserAvatar: { alignItems: 'center', marginBottom: 20 },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  modalUserInfo: { alignItems: 'center', marginBottom: 25 },
  modalUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  modalUserEmail: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  modalRoleContainer: { flexDirection: 'row', alignItems: 'center' },
  modalUserRole: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around' },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  modalEditButton: { backgroundColor: COLORS.warning },
  modalDeleteButton: { backgroundColor: COLORS.accent },
  modalActionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
});

export default UsuariosDaf;