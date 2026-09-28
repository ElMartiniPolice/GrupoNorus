/**
 * AlertasScreen — CP-ALE-01: Alertas en tiempo real.
 * Lista las notificaciones del contexto (cargadas vía REST y recibidas por
 * WebSocket). Tocar una alerta la marca como leída; "Marcar todas" limpia
 * el contador del badge de la barra inferior.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '../../context/NotificationContext';
import { colors, fonts, spacing } from '../../theme';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  SectionTitle,
  formatFecha,
} from '../../components/ui';

export default function AlertasScreen() {
  const { notifications, unreadCount, connected, markAllRead, markRead } =
    useNotifications();
  const lista = notifications || [];

  return (
    <Screen>
      <SectionTitle>Alertas</SectionTitle>

      <View style={styles.statusRow}>
        <Badge
          label={connected ? 'En vivo' : 'Sin conexión'}
          color={connected ? colors.primaryLight : colors.textMuted}
        />
        {unreadCount > 0 ? (
          <Button title="Marcar todas" variant="secondary" onPress={markAllRead} />
        ) : null}
      </View>

      {lista.length === 0 ? <EmptyState message="Sin alertas por ahora." icon="🔔" /> : null}

      {lista.map((n, idx) => (
        <Card
          key={n.id ?? idx}
          onPress={n.leida ? undefined : () => markRead(n.id)}
        >
          <View style={styles.cardHead}>
            <Text style={styles.titulo}>{n.titulo ?? 'Alerta'}</Text>
            <Badge
              label={n.leida ? 'Leída' : 'Nueva'}
              color={n.leida ? colors.textMuted : colors.coral}
            />
          </View>
          {n.mensaje ? <Text style={styles.meta}>{n.mensaje}</Text> : null}
          <Text style={styles.fecha}>{formatFecha(n.creada_en)}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 6,
  },
  titulo: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.primary,
    flex: 1,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
  },
  fecha: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
