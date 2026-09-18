import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeVistaAgenda from '../components/HomeViews/HomeVistaAgenda';
import HomeVistaBento from '../components/HomeViews/HomeVistaBento';
import HomeVistaOscura from '../components/HomeViews/HomeVistaOscura';

// Ruta temporal de vista previa: /HomeVariantes
// Compara las 3 propuestas de pantalla Home sin tocar la actual.
const VARIANTS = [
  { key: 'agenda', label: '1 · Agenda', color: '#C44200', comp: HomeVistaAgenda },
  { key: 'bento', label: '2 · Bento', color: '#7C3AED', comp: HomeVistaBento },
  { key: 'dark', label: '3 · Dark', color: '#FF7A45', comp: HomeVistaOscura },
];

export default function HomeVariantes() {
  const [active, setActive] = useState(0);
  const ActiveComp = VARIANTS[active].comp;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.preview}>
        <ActiveComp />
      </View>
      <View style={styles.switchBar}>
        {VARIANTS.map((v, i) => {
          const selected = i === active;
          return (
            <Pressable
              key={v.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setActive(i)}
              style={({ pressed }) => [
                styles.switchChip,
                selected && { backgroundColor: v.color, borderColor: v.color },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.switchDot, selected && styles.switchDotActive]} />
              <Text style={[styles.switchLabel, selected && styles.switchLabelActive]}>{v.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E1219' },
  preview: { flex: 1 },
  switchBar: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(15,18,25,0.82)',
    borderRadius: 24,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  switchChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  switchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8A93A6' },
  switchDotActive: { backgroundColor: '#0E1219' },
  switchLabel: { fontSize: 12, fontWeight: '800', color: '#C6CDD8' },
  switchLabelActive: { color: '#0E1219' },
});