/**
 * AlertasScreen — CP-ALE-01: Alertas en tiempo real con diseño moderno NORUS.
 * Notificaciones en contenedor acotado y estilizado.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../context/NotificationContext';
import { colors, fonts, spacing, radius } from '../../theme';
import {
  Badge,
  Button,
  EmptyState,
  Screen,
  formatFecha,
} from '../../components/ui';

export default function AlertasScreen() {
  const { notifications, unreadCount, connected, markAllRead, markRead } =
    useNotifications();
  const lista = notifications || [];

  const unreadNotifications = useMemo(
    () => lista.filter((n) => !n.leida),
    [lista],
  );

  const readNotifications = useMemo(
    () => lista.filter((n) => n.leida),
    [lista],
  );

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header Hero */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>NOTIFICACIONES / SISTEMA</Text>
            <Text style={styles.title}>Alertas y Avisos</Text>
            <Text style={styles.description}>
              Mensajes operativos, avisos de asignación y alertas críticas en tiempo real.
            </Text>
          </View>
          <View style={styles.connectionBadge}>
            <View
              style={[
                styles.dot,
                { backgroundColor: connected ? '#10B981' : colors.textMuted },
              ]}
            />
            <Text style={styles.connectionText}>{connected ? 'En vivo' : 'Desconectado'}</Text>
          </View>
        </View>

        {unreadCount > 0 ? (
          <View style={styles.actionRow}>
            <View style={styles.actionLeft}>
              <Ionicons name="mail-unread-outline" size={20} color={colors.primary} />
              <Text style={styles.unreadSummary}>
                Tienes <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>{unreadCount}</Text> alerta(s) sin leer
              </Text>
            </View>
            <Button
              title="Marcar todas como leídas"
              variant="secondary"
              onPress={markAllRead}
              style={styles.markReadBtn}
            />
          </View>
        ) : null}

        {lista.length === 0 ? (
          <EmptyState message="No tienes alertas pendientes ni notificaciones registradas." icon="🔔" />
        ) : null}

        {/* Notificaciones no leídas */}
        {unreadNotifications.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Nuevas sin leer</Text>
            {unreadNotifications.map((n, idx) => (
              <TouchableOpacity
                key={n.id ?? idx}
                style={[styles.alertCard, styles.alertUnread]}
                onPress={() => markRead(n.id)}
                activeOpacity={0.85}
              >
                <View style={styles.alertIconWrap}>
                  <Ionicons name="notifications" size={20} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.alertHead}>
                    <Text style={styles.alertTitle}>{n.titulo ?? 'Alerta'}</Text>
                    <Badge label="Nueva" color={colors.coral} />
                  </View>
                  {n.mensaje ? <Text style={styles.alertMessage}>{n.mensaje}</Text> : null}
                  <Text style={styles.alertFecha}>{formatFecha(n.creada_en)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Notificaciones leídas */}
        {readNotifications.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Historial de alertas leídas</Text>
            {readNotifications.map((n, idx) => (
              <View key={n.id ?? idx} style={styles.alertCard}>
                <View style={[styles.alertIconWrap, { backgroundColor: colors.surface }]}>
                  <Ionicons name="notifications-outline" size={19} color={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.alertHead}>
                    <Text style={[styles.alertTitle, { color: colors.textMuted }]}>
                      {n.titulo ?? 'Notificación'}
                    </Text>
                    <Badge label="Leída" color={colors.textMuted} />
                  </View>
                  {n.mensaje ? <Text style={styles.alertMessage}>{n.mensaje}</Text> : null}
                  <Text style={styles.alertFecha}>{formatFecha(n.creada_en)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,
  },
  overline: {
    color: colors.primaryLight,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.7,
    marginBottom: 5,
  },
  title: { color: colors.primary, fontFamily: fonts.title, fontSize: 32 },
  description: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 3 },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: colors.surfaceBrand,
    borderWidth: 1,
    borderColor: `${colors.primaryLight}30`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    marginBottom: 20,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 200,
  },
  unreadSummary: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.primary,
  },
  markReadBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 38,
  },
  sectionBlock: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.primary,
    marginBottom: 10,
  },
  alertCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 14,
  },
  alertUnread: {
    borderColor: `${colors.gold}88`,
    backgroundColor: '#FFFCF5',
  },
  alertIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.gold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  alertTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primary,
    flex: 1,
  },
  alertMessage: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  alertFecha: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
