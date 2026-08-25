// app/academico/index.js
// (versión simplificada de EventosAprobados.js, pero para académicos)

const fetchApprovedEvents = async () => {
  const token = await getTokenAsync();
  // El backend debe devolver SOLO los eventos del usuario autenticado
  const response = await axios.get(`${API_BASE_URL}/eventos/mios/aprobados`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  // ... normaliza y muestra
};

const handleEventPress = (event) => {
  router.push({
    pathname: '/academico/EventDetailScreen',
    params: { eventId: event.id }
  });
};