// frontend/app/admin/statistics.js
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const Usuario = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Estadísticas</Text>
        <Text>Aquí se mostrarán las estadísticas de la aplicación.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
});
export default Usuario;