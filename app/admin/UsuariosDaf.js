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
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

const COLORS = {
  primary: '#C44200',
  primaryDark: '#9A3300',
  primaryLight: '#FFF0E6',
  secondary: '#0F172A',
  accent: '#EF4444',
  success: '#047857',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E6E9EF',
  divider: '#D1D5DB',
  shadow: 'rgba(0, 0, 0, 0.05)',
  white: '#FFFFFF',
  black: '#000000',
};

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
    } catch (e) {
      console.error("Error al eliminar token de SecureStore en nativo:", e);
    }
  }
};

const isUserActive = (user) =>
  !(user.habilitado === 0 ||
    user.habilitado === false ||
    user.habilitado === '0' ||
    user.habilitado === 'false');

const getIniciales = (user) => {
  const n = (user.nombre || '').trim();
  const a = (user.apellidopat || '').trim();
  const u = (user.username || '').trim();
  if (n && a) return (n[0] + a[0]).toUpperCase();
  if (n) return n[0].toUpperCase();
  return (u[0] || 'D').toUpperCase();
};

const ESTADO_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'activo', label: 'Activos' },
  { key: 'inactivo', label: 'Inactivos' },
];

const StatTile = ({ icon, label, value, color, tint }) => (
  <View style={[styles.statTile, { backgroundColor: tint }]}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={styles.statInfo}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  </View>
);

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.filterChipActive]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={`Filtrar ${label}`}
  >
    {active && <Ionicons name="checkmark" size={14} color={COLORS.white} style={{ marginRight: 5 }} />}
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const UsuariosDaf = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const params = useLocalSearchParams();
  const totalUsers = users.length;
  const activeUsers = users.filter(isUserActive).length;
  const isAdmin = currentUserRole === 'admin';

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

      const response = await axios.get(`${API_BASE_URL}/users/daf`, {
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

    if (estadoFiltro === 'activo') {
      filtered = filtered.filter(isUserActive);
    } else if (estadoFiltro === 'inactivo') {
      filtered = filtered.filter(u => !isUserActive(u));
    }

    if (searchTerm !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        (user.nombre && user.nombre.toLowerCase().includes(term)) ||
        (user.apellidopat && user.apellidopat.toLowerCase().includes(term)) ||
        (user.username && user.username.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term))
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, estadoFiltro, users]);

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

  const getNivelAcceso = (user) => {
    const nivel = user?.daf?.nivelAcceso ?? user?.nivelAcceso;
    return nivel !== null && nivel !== undefined ? `Nivel ${nivel}` : null;
  };

  const renderUserItem = (item) => {
    const canEdit = currentUserRole === 'admin' || currentUserId === item.id;
    const active = isUserActive(item);
    const iniciales = getIniciales(item);
    const nivel = getNivelAcceso(item);

    return (
      <Pressable
        style={({ pressed }) => [styles.userCard, pressed && styles.userCardPressed]}
        onPress={() => handleViewUser(item)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalles de ${item.username || item.email}`}
      >
        <View style={styles.userCardLeft}>
          <View style={[styles.userAvatar, { borderColor: active ? COLORS.success : COLORS.border }]}>
            <Text style={styles.avatarText}>{iniciales}</Text>
            <View style={[styles.statusDot, { backgroundColor: active ? COLORS.success : COLORS.textTertiary }]} />
            <View style={styles.avatarIconBadge}>
              <Ionicons name="people" size={11} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.nombre
                ? `${item.nombre} ${item.apellidopat || ''}`.trim()
                : item.username || 'Sin nombre'}
            </Text>
            <Text style={styles.userHandle} numberOfLines={1}>
              @{item.username || 'usuario'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email || 'Sin email'}
            </Text>
            <View style={styles.userMetaRow}>
              <View style={styles.roleChip}>
                <Ionicons name="calculator-outline" size={12} color={COLORS.warning} />
                <Text style={styles.roleChipText}>DAF</Text>
              </View>
              {nivel && (
                <View style={styles.levelChip}>
                  <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.info} />
                  <Text style={styles.levelChipText}>{nivel}</Text>
                </View>
              )}
              <View style={[styles.statusChip, active ? styles.statusChipActive : styles.statusChipInactive]}>
                <View style={[styles.statusChipDot, { backgroundColor: active ? COLORS.success : COLORS.textTertiary }]} />
                <Text style={[styles.statusChipText, { color: active ? COLORS.success : COLORS.textSecondary }]}>
                  {active ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            onPress={() => handleViewUser(item)}
            style={[styles.actionButton, styles.viewButton]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${item.username}`}
          >
            <Ionicons name="eye-outline" size={20} color={COLORS.info} />
          </TouchableOpacity>

          {canEdit && (
            <TouchableOpacity
              onPress={() => router.push(`/admin/editUser/${item.id}`)}
              style={[styles.actionButton, styles.editButton]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${item.username}`}
            >
              <Ionicons name="pencil-outline" size={20} color={COLORS.warning} />
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              onPress={() => handleDeleteUser(item.id)}
              style={[styles.actionButton, styles.deleteButton]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${item.username}`}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.accent} />
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    );
  };

  const renderUserModal = () => {
    const canEdit = currentUserRole === 'admin' || currentUserId === selectedUser?.id;
    const modalIsAdmin = currentUserRole === 'admin';
    const active = selectedUser ? isUserActive(selectedUser) : true;
    const iniciales = selectedUser ? getIniciales(selectedUser) : 'D';
    const nivel = selectedUser ? getNivelAcceso(selectedUser) : null;

    return (
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
          <View style={styles.modalContent}>
            <View style={styles.modalGradient}>
              <View style={styles.modalHeaderRow}>
                <TouchableOpacity
                  onPress={() => setShowUserModal(false)}
                  style={styles.modalCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <View style={styles.modalRoleBadge}>
                  <Ionicons name="calculator-outline" size={14} color={COLORS.warning} />
                  <Text style={styles.modalRoleBadgeText}>DAF</Text>
                </View>
              </View>

              <View style={styles.modalIdentity}>
                <View style={[styles.modalAvatar, { borderColor: active ? COLORS.success : COLORS.border }]}>
                  <Text style={styles.modalAvatarText}>{iniciales}</Text>
                  <View style={[styles.modalStatusDot, { backgroundColor: active ? COLORS.success : COLORS.textTertiary }]} />
                </View>
                <Text style={styles.modalUserName} numberOfLines={1}>
                  {selectedUser
                    ? `${selectedUser.nombre || ''} ${selectedUser.apellidopat || ''}`.trim() || selectedUser.username
                    : ''}
                </Text>
                <Text style={styles.modalUserHandle} numberOfLines={1}>
                  @{selectedUser?.username || 'usuario'}
                </Text>
                {nivel && (
                  <View style={styles.modalLevelChip}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.info} />
                    <Text style={styles.modalLevelChipText}>{nivel}</Text>
                  </View>
                )}
                <View style={[styles.modalStatusBadge, active ? styles.modalStatusActive : styles.modalStatusInactive]}>
                  <View style={[styles.statusChipDot, { backgroundColor: active ? COLORS.success : COLORS.textTertiary }]} />
                  <Text style={{ color: active ? COLORS.success : COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                    {active ? 'Cuenta activa' : 'Cuenta inactiva'}
                  </Text>
                </View>
              </View>
            </View>

            {selectedUser && (
              <View style={styles.modalBody}>
                <View style={styles.modalInfoRow}>
                  <View style={styles.modalInfoIcon}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.modalInfoTextWrap}>
                    <Text style={styles.modalInfoLabel}>Correo electrónico</Text>
                    <Text style={styles.modalInfoValue} numberOfLines={1}>{selectedUser.email || 'Sin email'}</Text>
                  </View>
                </View>

                <View style={styles.modalInfoRow}>
                  <View style={styles.modalInfoIcon}>
                    <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.modalInfoTextWrap}>
                    <Text style={styles.modalInfoLabel}>Usuario del sistema</Text>
                    <Text style={styles.modalInfoValue} numberOfLines={1}>{selectedUser.username || 'Sin usuario'}</Text>
                  </View>
                </View>

                {selectedUser.facultad?.nombre && (
                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoIcon}>
                      <Ionicons name="business-outline" size={18} color={COLORS.textSecondary} />
                    </View>
                    <View style={styles.modalInfoTextWrap}>
                      <Text style={styles.modalInfoLabel}>Facultad</Text>
                      <Text style={styles.modalInfoValue} numberOfLines={2}>{selectedUser.facultad.nombre}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  {canEdit && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalEditButton]}
                      onPress={() => {
                        setShowUserModal(false);
                        router.push(`/admin/editUser/${selectedUser.id}`);
                      }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Editar usuario"
                    >
                      <Ionicons name="pencil" size={16} color="#fff" />
                      <Text style={styles.modalActionButtonText}>Editar</Text>
                    </TouchableOpacity>
                  )}

                  {modalIsAdmin && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalDeleteButton]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleDeleteUser(selectedUser.id);
                      }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar usuario"
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                      <Text style={styles.modalActionButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                  )}
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
        <Stack.Screen
          options={{
            title: 'Usuarios DAF',
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
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
            isAdmin && (
              <TouchableOpacity onPress={handleAddUser} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Añadir usuario DAF">
                <Ionicons name="add-circle" size={28} color="#fff" />
              </TouchableOpacity>
            )
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
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calculator" size={26} color="#fff" />
            </View>
            <View style={styles.heroHeaderText}>
              <Text style={styles.heroTitle}>Dirección Administrativa y Financiera</Text>
              <Text style={styles.heroSubtitle}>Usuarios con acceso al módulo DAF del sistema de eventos</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{totalUsers}</Text>
              <Text style={styles.heroStatLabel}>Cuentas DAF</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#B9F6CA' }]}>{activeUsers}</Text>
              <Text style={styles.heroStatLabel}>Activas</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#FDE68A' }]}>{totalUsers - activeUsers}</Text>
              <Text style={styles.heroStatLabel}>Inactivas</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, usuario o email..."
              accessibilityLabel="Buscar usuarios DAF"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={COLORS.textTertiary}
              returnKeyType="search"
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterRow}>
          {ESTADO_FILTERS.map(f => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={estadoFiltro === f.key}
              onPress={() => setEstadoFiltro(f.key)}
            />
          ))}
        </View>

        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
            {searchTerm || estadoFiltro !== 'all' ? ' encontrados' : ' en total'}
          </Text>
          {(searchTerm !== '' || estadoFiltro !== 'all') && (
            <TouchableOpacity
              onPress={() => { setSearchTerm(''); setEstadoFiltro('all'); }}
              style={styles.clearFiltersButton}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
            >
              <Ionicons name="refresh-outline" size={14} color={COLORS.primary} />
              <Text style={styles.clearFiltersText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {!loading && filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name={searchTerm || estadoFiltro !== 'all' ? 'search-outline' : 'people-outline'} size={48} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchTerm || estadoFiltro !== 'all' ? 'Sin resultados' : 'Aún no hay usuarios DAF'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm || estadoFiltro !== 'all'
                ? 'No se encontraron usuarios con los filtros aplicados.'
                : 'Crea el primer usuario DAF para comenzar a gestionar solicitudes y recursos.'}
            </Text>
            {(searchTerm || estadoFiltro !== 'all') && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => { setSearchTerm(''); setEstadoFiltro('all'); }}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons name="refresh-outline" size={16} color={COLORS.white} />
                <Text style={styles.emptyButtonText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
            {!searchTerm && estadoFiltro === 'all' && isAdmin && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleAddUser}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={16} color={COLORS.white} />
                <Text style={styles.emptyButtonText}>Crear usuario DAF</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredUsers.map((user) => (
              <View key={user.id}>
                {renderUserItem(user)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddUser}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Añadir nuevo usuario DAF"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {renderUserModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  headerButton: { marginRight: 15, padding: 5 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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

  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center' },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroHeaderText: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3 },
  heroSubtitle: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 17 },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    marginTop: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroStatLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '600' },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

  searchContainer: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  clearButton: { padding: 6 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.white },

  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  resultsText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  clearFiltersText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingTop: 4 },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  userCardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warningLight,
    borderWidth: 2,
    marginRight: 14,
    position: 'relative',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.warning },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarIconBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15.5, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  userHandle: { fontSize: 12, color: COLORS.textTertiary, marginBottom: 2 },
  userEmail: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  userMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleChipText: { fontSize: 11, fontWeight: '700', color: COLORS.warning, textTransform: 'uppercase' },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelChipText: { fontSize: 11, fontWeight: '600', color: COLORS.info },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  statusChipActive: { backgroundColor: 'rgba(4, 120, 87, 0.1)' },
  statusChipInactive: { backgroundColor: 'rgba(100, 116, 139, 0.1)' },
  statusChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusChipText: { fontSize: 11, fontWeight: '700' },

  userActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  viewButton: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  editButton: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  deleteButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  emptyButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: width * 0.92,
    maxWidth: 420,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  modalGradient: {
    backgroundColor: COLORS.primary,
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  modalRoleBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.warning, textTransform: 'uppercase' },
  modalIdentity: { alignItems: 'center', marginTop: 18 },
  modalAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 3,
    marginBottom: 12,
    position: 'relative',
  },
  modalAvatarText: { fontSize: 30, fontWeight: '800', color: COLORS.white },
  modalStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  modalUserName: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
  modalUserHandle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  modalLevelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 10,
  },
  modalLevelChipText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusActive: { backgroundColor: 'rgba(185, 246, 202, 0.2)' },
  modalStatusInactive: { backgroundColor: 'rgba(226, 232, 240, 0.2)' },

  modalBody: { padding: 20 },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  modalInfoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalInfoTextWrap: { flex: 1 },
  modalInfoLabel: { fontSize: 11.5, color: COLORS.textTertiary, fontWeight: '600' },
  modalInfoValue: { fontSize: 14.5, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 18 },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 110,
    gap: 6,
  },
  modalEditButton: { backgroundColor: COLORS.warning },
  modalDeleteButton: { backgroundColor: COLORS.accent },
  modalActionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default UsuariosDaf;