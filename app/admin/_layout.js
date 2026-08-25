import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{
      headerShown:false,
    }}>
      <Stack.Screen
        name="EventDetailScreen"
        options={{ headerShown: false }} // ← También aquí
      />
      <Stack.Screen
      name="EventosPendientes"
      options={{headerShown:false}}
      />
      <Stack.Screen
      name="HomeAdministradorScreen"
      options={{headerShown:false}}
      />
      <Stack.Screen
      name="HomeAcademico"
      options={{headerShown:false}}
      />
      <Stack.Screen 
      name="admin/ProyectoEvento" 
      options={{headerShown:false}}/>
      <Stack.Screen
      name="admin/editUser"
      options={{headerShown:false}}
      />
    </Stack>
  );
}