import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { createNotificationSocket } from '../services/socket';
import { notificationService } from '../services/notificationService';

/**
 * NotificationContext — alertas en tiempo real (CP-ALE-01).
 * 1) Al iniciar sesión carga las no leídas vía REST.
 * 2) Mantiene un WebSocket a /ws/notifications/<user_id>/ con reconexión.
 * 3) Expone unreadCount para el badge de la barra inferior.
 * Debe montarse DENTRO de <AuthProvider> (consume useAuth).
 */
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const userId = user?.id ?? null;

  // Cargar historial no leído al (re)iniciar sesión.
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    let alive = true;
    notificationService
      .noLeidas()
      .then((list) => {
        if (!alive || !Array.isArray(list)) return;
        setNotifications(list);
        setUnreadCount(list.length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  // Canal WebSocket en vivo.
  useEffect(() => {
    if (!userId) {
      setConnected(false);
      return;
    }
    const socket = createNotificationSocket(userId, {
      onMessage: (payload) => {
        // El consumer puede enviar {type, data} o la notificación directa.
        const notification = payload && payload.data ? payload.data : payload;
        setNotifications((prev) => [notification, ...prev].slice(0, 50));
        setUnreadCount((n) => n + 1);
      },
      onStatusChange: (status) => setConnected(status === 'open'),
    });
    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.marcarTodas();
    } catch {
      // Si falla el REST, igual limpiamos el estado local.
    }
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await notificationService.marcarLeida(id);
    } catch {
      // ignorar
    }
    setUnreadCount((n) => Math.max(0, n - 1));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, connected, markAllRead, markRead }),
    [notifications, unreadCount, connected, markAllRead, markRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de <NotificationProvider>');
  }
  return ctx;
}
