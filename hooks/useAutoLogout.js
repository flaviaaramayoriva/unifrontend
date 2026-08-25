// hooks/useAutoLogout.js
import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cerrarSesion } from '../utils/auth'; // ajusta la ruta según tu estructura

const TIEMPO_INACTIVIDAD_MS = 30 * 60 * 1000; // 30 minutos totales
const AVISO_ANTES_MS = 60 * 1000;             // avisar 1 minuto antes de cerrar
const LAST_ACTIVITY_KEY = 'lastActivityTimestamp';

/**
 * Hook de auto-logout por inactividad, con aviso 1 minuto antes.
 * Úsalo UNA sola vez en el layout raíz (app/_layout.js), no en cada pantalla.
 *
 * @param {object} router - instancia de useRouter()
 * @param {boolean} activo - si hay sesión iniciada (evita correr el timer en login)
 *
 * @returns {{
 *   reiniciarTimer: () => void,     // llama esto en cualquier interacción manual
 *   mostrarAviso: boolean,          // true cuando falta <= 1 min para cerrar sesión
 *   segundosRestantes: number,      // cuenta regresiva a mostrar en el aviso
 *   seguirConectado: () => void,    // handler para el botón "Seguir conectado"
 * }}
 */
export const useAutoLogout = (router, activo = true) => {
  const timerLogoutRef = useRef(null);
  const timerAvisoRef = useRef(null);
  const intervalRef = useRef(null);

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(60);

  const guardarUltimaActividad = useCallback(async () => {
    const ahora = Date.now().toString();
    if (Platform.OS === 'web') {
      try { localStorage.setItem(LAST_ACTIVITY_KEY, ahora); } catch (e) {}
    } else {
      try { await AsyncStorage.setItem(LAST_ACTIVITY_KEY, ahora); } catch (e) {}
    }
  }, []);

  const limpiarTimers = useCallback(() => {
    if (timerLogoutRef.current) clearTimeout(timerLogoutRef.current);
    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const ejecutarLogout = useCallback(async () => {
    limpiarTimers();
    setMostrarAviso(false);
    console.log('⏰ Sesión cerrada automáticamente por inactividad');
    await cerrarSesion(router);
  }, [router, limpiarTimers]);

  const mostrarAvisoDeCierre = useCallback(() => {
    setMostrarAviso(true);
    setSegundosRestantes(60);

    // Cuenta regresiva visual de 60 → 0
    intervalRef.current = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cierre definitivo al cumplirse el minuto de gracia
    timerLogoutRef.current = setTimeout(ejecutarLogout, AVISO_ANTES_MS);
  }, [ejecutarLogout]);

  const reiniciarTimer = useCallback(() => {
    if (!activo) return;

    limpiarTimers();
    setMostrarAviso(false);
    guardarUltimaActividad();

    // Dispara el aviso 1 minuto antes del límite total
    timerAvisoRef.current = setTimeout(mostrarAvisoDeCierre, TIEMPO_INACTIVIDAD_MS - AVISO_ANTES_MS);
  }, [activo, limpiarTimers, guardarUltimaActividad, mostrarAvisoDeCierre]);

  // Botón "Seguir conectado" del modal de aviso
  const seguirConectado = useCallback(() => {
    reiniciarTimer();
  }, [reiniciarTimer]);

  // Verifica si, al volver del background (o al abrir la app), ya pasó el tiempo límite
  const verificarTiempoTranscurrido = useCallback(async () => {
    let ultimaActividad;
    if (Platform.OS === 'web') {
      ultimaActividad = localStorage.getItem(LAST_ACTIVITY_KEY);
    } else {
      ultimaActividad = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    }

    if (ultimaActividad) {
      const transcurrido = Date.now() - parseInt(ultimaActividad, 10);
      if (transcurrido >= TIEMPO_INACTIVIDAD_MS) {
        await ejecutarLogout();
        return;
      }
    }
    reiniciarTimer();
  }, [ejecutarLogout, reiniciarTimer]);

  // ── Web: escuchar actividad del usuario en el documento ──────────────────
  useEffect(() => {
    if (!activo || Platform.OS !== 'web') return;

    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    // Mientras se muestra el aviso, no reiniciamos con movimientos "pasivos" del mouse;
    // solo el botón "Seguir conectado" debe reiniciar en ese momento.
    const handler = () => {
      if (!mostrarAviso) reiniciarTimer();
    };
    eventos.forEach(ev => window.addEventListener(ev, handler));

    reiniciarTimer();

    return () => {
      eventos.forEach(ev => window.removeEventListener(ev, handler));
      limpiarTimers();
    };
  }, [activo, mostrarAviso, reiniciarTimer, limpiarTimers]);

  // ── Móvil / general: detectar cambios de AppState (background/foreground) ─
  useEffect(() => {
    if (!activo) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        verificarTiempoTranscurrido();
      } else if (nextState === 'background' || nextState === 'inactive') {
        guardarUltimaActividad();
      }
    });

    reiniciarTimer();

    return () => {
      subscription.remove();
      limpiarTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  return { reiniciarTimer, mostrarAviso, segundosRestantes, seguirConectado };
};