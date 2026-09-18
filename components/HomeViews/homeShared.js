import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import axios from 'axios';
import dayjs from 'dayjs';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://unibackend-production-a0f8.up.railway.app';

export const windowWidth = Dimensions.get('window').width;
export const IS_WIDE = windowWidth >= 780;

export const mockCategories = [
  { id: 1, name: 'Ingeniería', sigla: 'ING', icon: 'hardware-chip', image: require('../../assets/images/tec.jpg') },
  { id: 2, name: 'Cs. Económicas y Empresariales', sigla: 'ECO', icon: 'trending-up', image: require('../../assets/images/econ.jpg') },
  { id: 3, name: 'Cs. de la Salud', sigla: 'SAL', icon: 'medkit', image: require('../../assets/images/sal.jpg') },
  { id: 4, name: 'Diseño y Tecnología Crossmedia', sigla: 'DIS', icon: 'color-palette', image: require('../../assets/images/arqui.jpg') },
  { id: 5, name: 'Cs. Jurídicas y Sociales', sigla: 'DER', icon: 'scale', image: require('../../assets/images/der.jpg') },
];

export const getEventTitle = (ev) =>
  ev.nombreevento ?? ev.titulo ?? ev.title ?? ev.nombre ?? ev.name ?? 'Sin título';
export const getEventDescription = (ev) => ev.descripcion ?? ev.description ?? ev.detalle ?? '';
export const getEventFacultadId = (ev) =>
  ev.facultadId ?? ev.facultad_id ?? ev.faculty_id ?? ev.id_facultad ?? null;
export const getEventImage = (ev) => {
  const path = ev.imagen ?? ev.imagenUrl ?? ev.image ?? ev.foto ?? null;
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
};
export const getEventDate = (ev) => ev.fechaevento ?? ev.date ?? ev.fecha ?? ev.fechaInicio ?? null;
export const getEventLocation = (ev) => ev.lugar ?? ev.location ?? ev.ubicacion ?? ev.auditorio ?? '';
export const getEventHour = (ev) => ev.horaevento ?? ev.hora ?? ev.time ?? ev.horaInicio ?? '';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  let date;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) date = dayjs(dateStr, 'YYYY-MM-DD');
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) date = dayjs(dateStr, 'DD/MM/YYYY');
  else date = dayjs(dateStr);
  return date.isValid() ? date : null;
};

export const isEventActive = (ev) => {
  const date = parseDate(getEventDate(ev));
  if (!date) return true;
  return date.isSame(dayjs().startOf('day')) || date.isAfter(dayjs().startOf('day'));
};

export const getDateParts = (ev) => {
  const date = parseDate(getEventDate(ev));
  if (!date) return null;
  return { day: date.format('DD'), month: date.format('MMM').toUpperCase() };
};

export const getEventDateFull = (ev) => {
  const date = parseDate(getEventDate(ev));
  if (!date) return '';
  return date.format('DD MMM YYYY').toUpperCase();
};

export const getEventMeta = (ev) => {
  const location = getEventLocation(ev);
  const hour = getEventHour(ev);
  return [location, hour].filter(Boolean).join('  ·  ');
};

export const filterEventsByFaculty = (events, facultyId) =>
  Array.isArray(events)
    ? events.filter((ev) => getEventFacultadId(ev) === facultyId && isEventActive(ev))
    : [];

export const filterEventsByText = (events, text) => {
  const q = (text || '').trim().toLowerCase();
  if (!q) return events;
  return events.filter((ev) => {
    const title = getEventTitle(ev).toLowerCase();
    const desc = getEventDescription(ev).toLowerCase();
    return title.includes(q) || desc.includes(q);
  });
};

export function useHomeEvents() {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_BASE_URL}/eventos/con-facultad`)
      .then((res) => {
        if (!mounted) return;
        const data = res.data;
        setAllEvents(Array.isArray(data) ? data : data.data ?? data.eventos ?? data.events ?? []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        if (!mounted) return;
        setError('No se pudieron cargar los eventos');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { allEvents, loading, error };
}