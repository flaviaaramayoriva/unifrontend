import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#C44B0A',
  white: '#FFFFFF',
};

const AdminHeader = ({ title, subtitle, onBack, backTo, rightActions, showBack = true, eyebrow, primaryColor }) => {
  const router = useRouter();
  const heroColor = primaryColor || COLORS.primary;
  const handleBack = () => {
    if (onBack) { onBack(); return; }
    if (backTo) { router.replace(backTo); return; }
    if (router.canGoBack()) router.back();
    else router.replace('/admin/HomeAdministradorScreen');
  };

  return (
    <View style={[styles.hero, { backgroundColor: heroColor }]}>
      <View style={styles.heroHeaderRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={styles.heroLeft}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightActions ? <View style={styles.rightActions}>{rightActions}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 40) + 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  heroHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroLeft: { flex: 1 },
  eyebrow: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: '500' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 10 },
});

export default AdminHeader;