// components/MinimalHeader.js
import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

const MinimalHeader = ({ nombreUsuario, unreadCount, onNotificationPress }) => {
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <View style={{
      width: '100%',
      paddingHorizontal: 20,
      paddingTop: StatusBar.currentHeight + 20,
      paddingBottom: 20,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderColor: COLORS.border,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: COLORS.textSecondary,
        }}>admin</Text>
        <TouchableOpacity
          style={{ position: 'relative', padding: 4 }}
          onPress={onNotificationPress}
        >
          <Ionicons name="notifications-outline" size={24} color={COLORS.textSecondary} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -2,
              right: -2,
              backgroundColor: COLORS.accent,
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.white,
            }}>
              <Text style={{
                color: COLORS.white,
                fontSize: 10,
                fontWeight: 'bold',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <Text style={{
          fontSize: 22,
          fontWeight: '500',
          color: COLORS.textSecondary,
        }}>{getCurrentGreeting()},</Text>
        <Text style={{
          fontSize: 22,
          fontWeight: '700',
          color: COLORS.textPrimary,
        }}>{nombreUsuario}</Text>
      </View>
      <Text style={{
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
      }}>Panel de Administración</Text>
    </View>
  );
};

export default MinimalHeader;