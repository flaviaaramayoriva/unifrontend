import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{headerShown: false}}>
      {/* Rutas principales de admin */}
      <Stack.Screen name="admin" options={{headerShown: false}}>
        <Stack.Screen name="HomeAcademico" options={{headerShown: false}} />
        <Stack.Screen name="ProyectoEvento" options={{headerShown: false}} />
        <Stack.Screen name="EventosPendientes" options={{headerShown: false}} />
        <Stack.Screen name="EventosAprobados" options={{headerShown: false}} />
        <Stack.Screen name="EventosRechazados" options={{headerShown: false}} />
        <Stack.Screen name="EventosCompletados" options={{headerShown: false}} />
        <Stack.Screen name="EventosVencidos" options={{headerShown: false}} />
        <Stack.Screen name=" editUser" options={{headerShown: false}} />
        <Stack.Screen name="CrearUsuarioA" options={{headerShown: false}} />
        <Stack.Screen name="reportes" options={{headerShown: false}} />
      </Stack.Screen>

      {/* Rutas adicionales */}
      <Stack.Screen name="EventDetailScreen" options={{headerShown: false}} />
      <Stack.Screen name="EventDetailComite" options={{headerShown: false}} />
    </Stack>
  );
}