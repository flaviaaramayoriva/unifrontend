// frontend/app/(tabs)/_layout.tsx // Asegúrate de que la extensión sea .tsx
import React from 'react';
import { Stack, Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ComponentProps } from 'react'; // Para obtener los tipos de props de un componente
import { Ionicons } from '@expo/vector-icons';

// Definir un tipo para las props que realmente nos importan para TabBarIcon
type TabBarIconProps = {
  name: ComponentProps<typeof FontAwesome>['name']; // Obtiene el tipo de la prop 'name' de FontAwesome
  color: string;
};

function TabBarIcon(props: TabBarIconProps) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
        tabBarActiveTintColor: '#FF5733',
        tabBarInactiveTintColor: 'gray',
         tabBarStyle: {
            backgroundColor: '#fff', // Fondo de la barra de pestañas
            borderTopWidth: 1,
            borderTopColor: '#f0f0f0',
        }
      }}>
    <Tabs.Screen
        name="index" // Esto hace referencia a app/(tabs)/index.tsx (tu componente Home)
        options={{
          title: 'Inicio', // Título para la pestaña
          headerShown: false, // Puedes ocultar el header si ya lo manejas en el _layout principal
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="Login"
        options={{
          title: 'Login',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
     
    </Tabs>
    
  );
}