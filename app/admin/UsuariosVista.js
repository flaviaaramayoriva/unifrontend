import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Configuración de API (igual que en el archivo principal)
let determinedApiBaseUrl;
/*if (Platform.OS === 'android') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else if (Platform.OS === 'ios') {
  determinedApiBaseUrl = 'http://192.168.0.167:3001/api';
} else {
  determinedApiBaseUrl = 'http://localhost:3001/api';
}*/
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unibackend1-production.up.railway.app';
const TOKEN_KEY = 'adminAuthToken';

// Colores consistentes
const COLORS = {
  primary: '#0052A0',
  secondary: '#2980b9',
  accent: '#e74c3c',
  background: '#f8fafc',
  surface: '#ffffff',
  success: '#27ae60',
  warning: '#f39c12',
  info: '#3498db',
  purple: '#9b59b6',
  white: '#fff',
  grayLight: '#ecf0f1',
  grayText: '#64748b',
  darkText: '#1e293b',
  cardShadow: '#000000',
  online: '#10b981',
  offline: '#ef4444',
  inactive: '#f59e0b',
  away: '#8b5cf6',
};

const getTokenAsync = async () => {
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
      console.error("Error al obtener token de SecureStore:", e);
      return null;
    }
  }
};

const UsuariosVistaScreen = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, online, offline, inactive, away



  const fetchUsers = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sesión Expirada', 'Por favor, inicia sesión de nuevo.');
        router.replace('/LoginAdmin');
        return;
      }

      // Simular llamada API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En producción, aquí harías la llamada real a tu API
      // const response = await axios.get(`${API_BASE_URL}/users`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setUsers(response.data);

      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let filtered = users;

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.rol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por estado
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(user => user.status === selectedFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'offline': return COLORS.offline;
      case 'inactive': return COLORS.inactive;
      case 'away': return COLORS.away;
      default: return COLORS.grayText;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'En línea';
      case 'offline': return 'Desconectado';
      case 'inactive': return 'Inactivo';
      case 'away': return 'Ausente';
      default: return 'Desconocido';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return 'radio-button-on';
      case 'offline': return 'radio-button-off';
      case 'inactive': return 'pause-circle';
      case 'away': return 'time';
      default: return 'help-circle';
    }
  };

  const formatLastActivity = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Hace unos segundos';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    const days = Math.floor(diff / 86400);
    if (days < 30) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
  };

  const handleUserAction = (user, action) => {
    Alert.alert(
      `${action} Usuario`,
      `¿Estás seguro de que deseas ${action.toLowerCase()} a ${user.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            // Aquí implementarías la acción real
            Alert.alert('Acción realizada', `${action} aplicada a ${user.nombre}`);
          }
        }
      ]
    );
  };

  const getFilterCount = (status) => {
    if (status === 'all') return users.length;
    return users.filter(user => user.status === status).length;
  };

  const renderFilterButton = (status, label, icon) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === status && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(status)}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selectedFilter === status ? COLORS.white : getStatusColor(status)}
      />
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === status && styles.filterButtonTextActive
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.filterBadge,
          { backgroundColor: selectedFilter === status ? COLORS.white : getStatusColor(status) }
        ]}
      >
        <Text
          style={[
            styles.filterBadgeText,
            { color: selectedFilter === status ? getStatusColor(status) : COLORS.white }
          ]}
        >
          {getFilterCount(status)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatarContainer}>
          <View style={[styles.userAvatar, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.userAvatarText, { color: getStatusColor(item.status) }]}>
              {item.avatar}
            </Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.nombre}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View style={styles.userRole}>
              <Text style={styles.userRoleText}>{item.rol}</Text>
            </View>
            <View style={[styles.userStatus, { backgroundColor: getStatusColor(item.status) + '15' }]}>
              <Ionicons name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} />
              <Text style={[styles.userStatusText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUserAction(item, 'Contactar')}
          >
            <Ionicons name="mail" size={16} color={COLORS.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUserAction(item, 'Suspender')}
          >
            <Ionicons name="ban" size={16} color={COLORS.warning} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.userDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time" size={14} color={COLORS.grayText} />
          <Text style={styles.detailText}>
            Última actividad: {formatLastActivity(item.lastActivity)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="analytics" size={14} color={COLORS.grayText} />
          <Text style={styles.detailText}>
            {item.totalSessions} sesiones totales
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar" size={14} color={COLORS.grayText} />
          <Text style={styles.detailText}>
            Registrado: {item.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.grayText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, email o rol..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.grayText}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.grayText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {renderFilterButton('all', 'Todos', 'people')}
        {renderFilterButton('online', 'En línea', 'radio-button-on')}
        {renderFilterButton('offline', 'Desconectados', 'radio-button-off')}
        {renderFilterButton('inactive', 'Inactivos', 'pause-circle')}
        {renderFilterButton('away', 'Ausentes', 'time')}
      </ScrollView>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.usersList}
        contentContainerStyle={styles.usersListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={COLORS.grayText} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
            </Text>
            {searchQuery && (
              <Text style={styles.emptySubtext}>
                Intenta con otros términos de búsqueda
              </Text>
            )}
          </View>
        }
      />

      {/* Summary Footer */}
      <View style={styles.summaryFooter}>
        <Text style={styles.summaryText}>
          Mostrando {filteredUsers.length} de {users.length} usuarios
        </Text>
        <Text style={styles.summarySubtext}>
          {users.filter(u => u.status === 'inactive').length} usuarios inactivos detectados
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.grayText,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  refreshButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.darkText,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    marginLeft: 6,
    marginRight: 8,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.darkText,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  filterBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    padding: 20,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.grayText,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userRole: {
    backgroundColor: COLORS.purple + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purple,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  userStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingTop: 16,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.grayText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.grayText,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.grayText,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryFooter: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    textAlign: 'center',
  },
  summarySubtext: {
    fontSize: 12,
    color: COLORS.warning,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default UsuariosVistaScreen;