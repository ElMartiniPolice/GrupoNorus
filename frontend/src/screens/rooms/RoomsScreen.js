/**
 * RoomsScreen — CU10: Monitoreo de habitaciones.
 * Estados: DISPONIBLE / OCUPADA / LIMPIEZA / MANTENCION (roomEstadoColor).
 * Tocar una habitación abre su detalle (check-in CU3 / check-out CU1).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { roomService } from '../../services/roomService';
import { colors, fonts, spacing, radius, roomEstadoColor } from '../../theme';
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  Loading,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel, tipoLabel } from '../../utils/labels';

const ESTADOS = ['TODAS', 'DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENCION'];

export default function RoomsScreen({ navigation }) {
  const { logout } = useAuth();
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [estado, setEstado] = useState('TODAS');
  const onError = makeErrorHandler(logout);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRooms(null);
      setRefreshing(true);
      try {
        const data = await roomService.list();
        setRooms(Array.isArray(data) ? data : []);
        setError('');
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      } finally {
        setRefreshing(false);
      }
    },
    [onError],
  );

  // Refresco silencioso al volver al foco (p. ej. tras un check-in/check-out).
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const visibles = (rooms || []).filter((r) => estado === 'TODAS' || r.estado === estado);

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <SectionTitle>Habitaciones</SectionTitle>

      <View style={styles.chips}>
        {ESTADOS.map((e) => (
          <TouchableOpacity
            key={e}
            style={[styles.chip, estado === e && styles.chipActive]}
            onPress={() => setEstado(e)}
          >
            <Text style={[styles.chipText, estado === e && styles.chipTextActive]}>
              {e === 'TODAS' ? 'Todas' : e}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      {!rooms && !error ? <Loading label="Cargando habitaciones…" /> : null}
      {rooms && visibles.length === 0 && !error ? (
        <EmptyState message="No hay habitaciones para mostrar." />
      ) : null}

      {visibles.map((r) => (
        <Card key={r.id} onPress={() => navigation.navigate('RoomDetail', { id: r.id })}>
          <View style={styles.cardHead}>
            <Text style={styles.titulo}>Habitación {habLabel(r)}</Text>
            <Badge
              label={r.estado ?? '—'}
              color={roomEstadoColor[r.estado] || colors.textMuted}
            />
          </View>
          <Text style={styles.meta}>Tipo: {tipoLabel(r.tipo)}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  chipTextActive: {
    color: colors.white,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 6,
  },
  titulo: {
    fontFamily: fonts.title,
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
});
