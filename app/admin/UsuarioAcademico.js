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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AdminHeader from '../../components/admin/AdminHeader';

const { width } = Dimensions.get('window');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

const getTokenAsync = async () => {
  const TOKEN_KEY = 'adminAuthToken';
  if (Platform.OS === 'web') {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al acceder a sessionStorage en web:", e);
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
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("Error al eliminar token de sessionStorage en web:", e);
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

const isUserActive = (user) =>
  !(user.habilitado === 0 || user.habilitado === false || user.habilitado === '0' || user.habilitado === 'false');

const getIniciales = (user) => {
  const n = (user.nombre || '').trim();
  const a = (user.apellidopat || '').trim();
  const u = (user.username || '').trim();
  if (n && a) return (n[0] + a[0]).toUpperCase();
  if (n) return n[0].toUpperCase();
  return (u[0] || 'U').toUpperCase();
};

const COLORS = {
  primary: '#C44B0A',
  primaryLight: '#FFEDD5',
  accent: '#EF4444',
  success: '#16A34A',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E6E9EF',
  divider: '#D1D5DB',
  shadow: 'rgba(0, 0, 0, 0.05)',
  white: '#FFFFFF',
};

const ROLE_META = {
  admin:    { icon: 'shield-checkmark-outline', color: '#EF4444' },
  user:     { icon: 'person-outline',            color: '#3B82F6' },
  daf:      { icon: 'people-outline',            color: '#F59E0B' },
  student:  { icon: 'school-outline',            color: '#8B5CF6' },
  academico:{ icon: 'book-outline',              color: '#C44B0A' },
  sin_rol:  { icon: 'help-circle-outline',       color: '#94A3B8' },
};

const getRoleMeta = (role) => ROLE_META[role?.toLowerCase()] || ROLE_META.sin_rol;
const getRoleColor = (role) => getRoleMeta(role).color;
const getRoleIcon = (role) => getRoleMeta(role).icon;

const ROLE_LABELS = { admin: 'Admin', daf: 'DAF', student: 'Estudiante', academico: 'Académico', user: 'Usuario' };
const getRoleLabel = (role) => {
  const r = role?.toLowerCase();
  return ROLE_LABELS[r] || (r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Sin rol');
};

const UsuarioAcademico = () => {
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
        Alert.alert(
          'Autenticación Requerida',
          'No se encontró el token. Por favor, inicia sesión de nuevo.',
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
        id: user.idusuario || user.id
      }));

      setUsers(processedUsers);
      setFilteredUsers(processedUsers);

    } catch (error) {
      console.error("Error al cargar usuarios:", error);
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
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        (user.nombre && user.nombre.toLowerCase().includes(term)) ||
        (user.apellidopat && user.apellidopat.toLowerCase().includes(term)) ||
        (user.apellidomat && user.apellidomat.toLowerCase().includes(term)) ||
        (user.username && user.username.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term))
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role?.toLowerCase() === filterRole);
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
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
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
        console.error("Error al obtener usuario actual:", error);
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

  const openEditModal = () => {
    if (currentUser) {
      setEditFormData({
        nombre: currentUser.nombre || '',
        apellidopat: currentUser.apellidopat || '',
        apellidomat: currentUser.apellidomat || '',
        username: currentUser.username || '',
        email: currentUser.email || '',
      });
      setShowEditModal(true);
    }
  };

  const handleUpdateCurrentUser = async () => {
    if (!currentUser) return;

    if (!editFormData.nombre || !editFormData.email || !editFormData.username) {
      Alert.alert('Campos obligatorios', 'Nombre, usuario y correo electrónico son requeridos.');
      return;
    }

    setIsUpdating(true);
    try {
      const token = await getTokenAsync();
      const response = await axios.put(
        `${API_BASE_URL}/users/${currentUser.id}`,
        editFormData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      Alert.alert('Éxito', 'Tu perfil ha sido actualizado correctamente.');
      setShowEditModal(false);

      const updatedUser = { ...currentUser, ...editFormData };
      setCurrentUser(updatedUser);

      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === currentUser.id ? { ...u, ...editFormData } : u))
      );

    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      Alert.alert('Error', 'No se pudo actualizar el perfil. Verifica tu conexión o intenta más tarde.');
    } finally {
      setIsUpdating(false);
    }
  };

  const stats = React.useMemo(() => {
    const habilitados = users.filter(isUserActive).length;
    const deshabilitados = users.length - habilitados;
    const academico = users.filter(u => u.role?.toLowerCase() === 'academico').length;
    return { total: users.length, habilitados, deshabilitados, academico };
  }, [users]);

  const renderFilterChips = () => {
    const roles = ['all', 'admin', 'user', 'daf', 'student', 'academico'];
    return (
      <View style={styles.chipRow}>
        {roles.map((role) => {
          const active = filterRole === role;
          return (
            <TouchableOpacity
              key={role}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilterRole(role)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {role === 'all' ? 'Todos' : getRoleLabel(role)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderUserModal = () => (
    <Modal
      visible={showUserModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowUserModal(false)}
      accessibilityViewIsModal={true}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setShowUserModal(false)}
      >
        <View style={styles.modalContentContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalles del Usuario</Text>
            <TouchableOpacity
              onPress={() => setShowUserModal(false)}
              style={styles.modalCloseButton}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {selectedUser && (
            <View style={styles.modalBody}>
              <View style={styles.modalUserAvatar}>
                <View style={[styles.modalAvatar, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                  <Text style={styles.modalAvatarText}>{getIniciales(selectedUser)}</Text>
                </View>
              </View>

              <View style={styles.modalUserInfo}>
                <Text style={styles.modalUserName}>
                  {selectedUser.nombre
                    ? `${selectedUser.nombre} ${selectedUser.apellidopat || ''}`.trim()
                    : (selectedUser.username || 'Sin nombre')}
                </Text>
                <Text style={styles.modalUserEmail}>
                  {selectedUser.email || 'Sin email'}
                </Text>
                <View style={styles.modalInfoRow}>
                  <View style={[styles.modalRoleBadge, { backgroundColor: getRoleColor(selectedUser.role) + '1A' }]}>
                    <Ionicons name={getRoleIcon(selectedUser.role)} size={14} color={getRoleColor(selectedUser.role)} />
                    <Text style={[styles.modalRoleText, { color: getRoleColor(selectedUser.role) }]}>
                      {getRoleLabel(selectedUser.role)}
                    </Text>
                  </View>
                  <View style={[styles.modalRoleBadge, { backgroundColor: isUserActive(selectedUser) ? COLORS.success + '1A' : COLORS.accent + '1A' }]}>
                    <Ionicons
                      name={isUserActive(selectedUser) ? 'checkmark-circle-outline' : 'close-circle-outline'}
                      size={14}
                      color={isUserActive(selectedUser) ? COLORS.success : COLORS.accent}
                    />
                    <Text style={[styles.modalRoleText, { color: isUserActive(selectedUser) ? COLORS.success : COLORS.accent }]}>
                      {isUserActive(selectedUser) ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalUserEmail}>@{selectedUser.username || 'sin usuario'}</Text>
              </View>
            </View>
          )}
        </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );

  const renderEditUserModal = () => (
    <Modal
      visible={showEditModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
      accessibilityViewIsModal={true}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
        <View style={styles.modalContentContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Editar Mi Perfil</Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCloseButton} accessibilityLabel="Cerrar" accessibilityRole="button">
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Nombre</Text>
                  <TextInput
                    style={styles.input}
                    value={editFormData.nombre}
                    onChangeText={(text) => setEditFormData({ ...editFormData, nombre: text })}
                    placeholder="Tu nombre"
                    placeholderTextColor={COLORS.textTertiary}
                    accessibilityLabel="Nombre"
                  />

                  <Text style={styles.inputLabel}>Apellido Paterno</Text>
                  <TextInput
                    style={styles.input}
                    value={editFormData.apellidopat}
                    onChangeText={(text) => setEditFormData({ ...editFormData, apellidopat: text })}
                    placeholder="Apellido paterno"
                    placeholderTextColor={COLORS.textTertiary}
                    accessibilityLabel="Apellido Paterno"
                  />

                  <Text style={styles.inputLabel}>Apellido Materno</Text>
                  <TextInput
                    style={styles.input}
                    value={editFormData.apellidomat}
                    onChangeText={(text) => setEditFormData({ ...editFormData, apellidomat: text })}
                    placeholder="Apellido materno"
                    placeholderTextColor={COLORS.textTertiary}
                    accessibilityLabel="Apellido Materno"
                  />

                  <Text style={styles.inputLabel}>Nombre de Usuario</Text>
                  <TextInput
                    style={styles.input}
                    value={editFormData.username}
                    onChangeText={(text) => setEditFormData({ ...editFormData, username: text })}
                    placeholder="Nombre de usuario"
                    autoCapitalize="none"
                    placeholderTextColor={COLORS.textTertiary}
                    accessibilityLabel="Nombre de Usuario"
                  />

                  <Text style={styles.inputLabel}>Correo Electrónico</Text>
                  <TextInput
                    style={styles.input}
                    value={editFormData.email}
                    onChangeText={(text) => setEditFormData({ ...editFormData, email: text })}
                    placeholder="correo@ejemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={COLORS.textTertiary}
                    accessibilityLabel="Correo Electrónico"
                  />

                  <TouchableOpacity
                    style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                    onPress={handleUpdateCurrentUser}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </Pressable>
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
      <AdminHeader
        title="Gestionar Usuarios"
        subtitle="UFT Eventos · Universidad Privada Franz Tamayo"
        eyebrow="Administración"
        rightActions={(
          <TouchableOpacity onPress={handleAddUser} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Agregar usuario">
            <Ionicons name="add" size={26} color={COLORS.white} />
          </TouchableOpacity>
        )}
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
        {currentUser && (
          <View style={styles.currentUserCard}>
            <View style={styles.currentUserHeader}>
              <View style={styles.currentUserHeaderLeft}>
                <Ionicons name="person-circle" size={24} color={COLORS.primary} />
                <Text style={styles.currentUserTitle}>Mi Perfil</Text>
              </View>
              <TouchableOpacity style={styles.editProfileButton} onPress={openEditModal}>
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                <Text style={styles.editProfileText}>Editar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.currentUserContent}>
              <View style={styles.currentUserAvatar}>
                <Text style={styles.currentUserAvatarText}>{getIniciales(currentUser)}</Text>
              </View>
              <View style={styles.currentUserDetails}>
                <Text style={styles.currentUserUsername}>
                  {currentUser.nombre} {currentUser.apellidopat}
                </Text>
                <Text style={styles.currentUserEmail}>{currentUser.email || 'Sin email'}</Text>
                <View style={[styles.currentUserRoleBadge, { backgroundColor: COLORS.primaryLight }]}>
                  <Text style={styles.currentUserRoleText}>{getRoleLabel(currentUser.role)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="people-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Usuarios</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.success + '18' }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{stats.habilitados}</Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.accent }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.accent + '18' }]}>
              <Ionicons name="close-circle-outline" size={22} color={COLORS.accent} />
            </View>
            <Text style={styles.statValue}>{stats.deshabilitados}</Text>
            <Text style={styles.statLabel}>Inactivos</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.info }]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.info + '18' }]}>
              <Ionicons name="book-outline" size={22} color={COLORS.info} />
            </View>
            <Text style={styles.statValue}>{stats.academico}</Text>
            <Text style={styles.statLabel}>Acad.</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, usuario o email..."
              accessibilityLabel="Buscar"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={COLORS.textTertiary}
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
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
            <Ionicons name="people-outline" size={80} color={COLORS.border} />
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
            {Object.entries(groupUsersByRole(filteredUsers)).map(([role, usersList]) => {
              const roleColor = getRoleColor(role);
              return (
                <View key={role} style={styles.roleSection}>
                  <View style={styles.roleHeader}>
                    <View style={[styles.roleIconWrap, { backgroundColor: roleColor + '1A' }]}>
                      <Ionicons name={getRoleIcon(role)} size={18} color={roleColor} />
                    </View>
                    <Text style={styles.roleTitle}>
                      {role === 'sin_rol' ? 'Sin Rol' : getRoleLabel(role)}
                      <Text style={styles.roleCount}>  · {usersList.length}</Text>
                    </Text>
                  </View>
                  {usersList.map((user) => {
                    const active = isUserActive(user);
                    const userRoleColor = getRoleColor(user.role);
                    return (
                      <View key={user.id} style={styles.userItemContainer}>
                        <View style={styles.userAvatarContainer}>
                          <View style={[styles.userAvatar, { backgroundColor: userRoleColor }]}>
                            <Text style={styles.avatarText}>{getIniciales(user)}</Text>
                          </View>
                          <View style={[styles.onlineDot, { backgroundColor: active ? COLORS.success : COLORS.textTertiary }]} />
                        </View>

                        <View style={styles.userInfo}>
                          <Text style={styles.username} numberOfLines={1}>
                            {user.nombre
                              ? `${user.nombre} ${user.apellidopat || ''}`.trim()
                              : (user.username || 'Sin nombre')}
                          </Text>
                          <Text style={styles.userEmail} numberOfLines={1}>
                            {user.email || 'Sin email'}
                          </Text>
                          <View style={styles.userBadges}>
                            <View style={[styles.roleBadge, { backgroundColor: userRoleColor + '1A' }]}>
                              <Ionicons name={getRoleIcon(user.role)} size={12} color={userRoleColor} />
                              <Text style={[styles.roleBadgeText, { color: userRoleColor }]}>
                                {getRoleLabel(user.role)}
                              </Text>
                            </View>
                            <View style={[styles.stateBadge, { backgroundColor: active ? COLORS.success + '1A' : COLORS.accent + '1A' }]}>
                              <View style={[styles.stateDot, { backgroundColor: active ? COLORS.success : COLORS.accent }]} />
                              <Text style={[styles.stateBadgeText, { color: active ? COLORS.success : COLORS.accent }]}>
                                {active ? 'Activo' : 'Inactivo'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.userActions}>
                          <TouchableOpacity
                            onPress={() => handleViewUser(user)}
                            style={[styles.actionButton, { backgroundColor: COLORS.info + '1A' }]}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="eye-outline" size={19} color={COLORS.info} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {renderUserModal()}
      {renderEditUserModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
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
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 15, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10,
    borderLeftWidth: 3, alignItems: 'center',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 2,
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  currentUserCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 15,
    marginTop: 14,
    borderRadius: 16,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  currentUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentUserHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editProfileText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  currentUserContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  currentUserAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  currentUserDetails: {
    flex: 1,
  },
  currentUserUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  currentUserEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  currentUserRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  currentUserRoleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'capitalize',
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
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: 5,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, paddingVertical: 4, gap: 8 },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  statsContainer: {
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 10,
  },
  statsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  roleSection: {
    marginBottom: 24,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  roleCount: { color: COLORS.textTertiary, fontWeight: '600' },
  userItemContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 13,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 7,
  },
  userBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  stateBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  stateBadgeText: { fontSize: 12, fontWeight: '700' },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  modalContentContainer: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
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
  modalCloseButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  modalUserAvatar: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalUserInfo: {
    alignItems: 'center',
    marginBottom: 25,
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 5,
    textAlign: 'center',
  },
  modalUserEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalInfoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modalRoleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  modalRoleText: { fontSize: 13, fontWeight: '700' },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UsuarioAcademico;