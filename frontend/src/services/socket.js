import { wsNotificationsUrl } from '../config';

/**
 * Cliente WebSocket nativo con reconexión exponencial (CP-ALE-01).
 * Canal: /ws/notifications/<user_id>/
 *
 * Uso:
 *   const socket = createNotificationSocket(user.id, { onMessage, onStatusChange });
 *   socket.close(); // al cerrar sesión o desmontar
 */
export function createNotificationSocket(userId, { onMessage, onStatusChange } = {}) {
  let ws = null;
  let closedByUser = false;
  let attempts = 0;
  let reconnectTimer = null;

  const clearTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  function connect() {
    if (closedByUser) return;
    try {
      ws = new WebSocket(wsNotificationsUrl(userId));
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      attempts = 0;
      onStatusChange?.('open');
    };

    ws.onmessage = (event) => {
      let payload = event.data;
      try {
        payload = JSON.parse(payload);
      } catch {
        // El backend podría enviar texto plano; se entrega tal cual.
      }
      onMessage?.(payload);
    };

    ws.onerror = () => {
      // onclose se dispara después; la reconexión se maneja ahí.
    };

    ws.onclose = () => {
      onStatusChange?.('closed');
      if (!closedByUser) scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** attempts, 30000); // 1s → 30s máx.
    attempts += 1;
    clearTimer();
    reconnectTimer = setTimeout(connect, delay);
  }

  connect();

  return {
    close() {
      closedByUser = true;
      clearTimer();
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      ws = null;
    },
  };
}
