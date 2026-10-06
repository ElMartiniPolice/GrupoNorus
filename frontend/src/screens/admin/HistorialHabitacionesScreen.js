import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
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
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';

const ESTADOS = ['TODAS', 'DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENCION'];

/**
 * Página histórica de actualizaciones de habitaciones — ADMINISTRADOR.
 * Lista todos los cambios de estado registrados (habitación, transición,
 * responsable, fecha y foto opcional) con filtro por estado resultante.
 */
export default function HistorialHabitacionesScreen() {
  const { user, logout } = useAuth();
  const esAdmin = user?.rol_nombre === 'ADMINISTRADOR';
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);
  const [cambios, setCambios] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [estado, setEstado] = useState('TODAS');

  const load = useCallback(async (silent = false) => {
    if (!esAdmin) return;
    if (!silent) setCambios(null);
    setError('');
    setRefreshing(true);
    try {
      const params = estado === 'TODAS' ? {} : { estado_nuevo: estado };
      const data = await roomService.historialCambios(params);
      setCambios(data);
    } catch (e) {
      setError(onError(e) ?? 'No se pudo cargar el historial.');
    } finally {
      setRefreshing(false);
    }
  }, [esAdmin, estado, onError]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  if (!esAdmin) {
    return (
      <Screen>
        <EmptyState message="Esta sección es solo para administradores." />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <SectionTitle>Historial de habitaciones</SectionTitle>
      <Text style={styles.meta}>
        Registro global de cambios de estado, con responsable y fotografía.
      </Text>
      <ErrorBanner message={error} />
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
      {cambios === null ? (
        <Loading />
      ) : cambios.length === 0 ? (
        <EmptyState message="Sin cambios de estado registrados." />
      ) : (
        cambios.map((c) => (
          <Card key={c.id}>
            <View style={styles.cardHead}>
              <Text style={styles.habText}>
                Habitación {c.habitacion?.numero ?? '—'}
              </Text>
              <Badge
                label={c.estado_nuevo ?? '—'}
                color={roomEstadoColor[c.estado_nuevo] || colors.textMuted}
              />
            </View>
            <Text style={styles.cambioText}>
              {c.estado_anterior ?? '—'} → {c.estado_nuevo ?? '—'}
            </Text>
            <Text style={styles.histMeta}>{formatFecha(c.fecha)}</Text>
            {c.cambiado_por?.nombre ? (
              <Text style={styles.histMeta}>Por {c.cambiado_por.nombre}</Text>
            ) : null}
            {c.foto ? (
              <Image source={{ uri: c.foto }} style={styles.fotoImg} />
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  chipTextActive: { color: colors.white },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 2,
  },
  habText: { fontFamily: fonts.title, fontSize: 16, color: colors.primary, flex: 1 },
  cambioText: { fontFamily: fonts.body, fontSize: 13, color: colors.text, marginTop: 4 },
  histMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  fotoImg: {
    width: '100%',
    height: 140,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
});
