import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { sedeService } from '../../services/sedeService';
import { colors, fonts, spacing } from '../../theme';
import {
  Badge,
  Card,
  ChipSelect,
  EmptyState,
  ErrorBanner,
  Fab,
  Loading,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';

const FILTROS = [
  { id: '', nombre: 'Todas' },
  { id: 'true', nombre: 'Activas' },
  { id: 'false', nombre: 'Inactivas' },
];

export default function SedesScreen({ navigation }) {
  const { user, logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);
  const esAdmin = user?.rol_nombre === 'ADMINISTRADOR';

  const [sedes, setSedes] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setSedes(null);
      setRefreshing(true);
      try {
        const params = {};
        if (filtro) params.activo = filtro;
        const data = await sedeService.list(params);
        setSedes(data);
        setError('');
      } catch (e) {
        const msg = onError(e);
        if (msg) setError(msg);
      } finally {
        setRefreshing(false);
      }
    },
    [filtro, onError],
  );

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  let content = <Loading label="Cargando sedes…" />;
  if (sedes?.length === 0) {
    content = <EmptyState message="Sin sedes registradas." />;
  } else if (sedes?.length > 0) {
    content = sedes.map((s) => (
      <Card
        key={s.id}
        onPress={
          esAdmin
            ? () => navigation.navigate('SedeForm', { id: s.id })
            : undefined
        }
      >
        <View style={styles.fila}>
          <View style={styles.datos}>
            <Text style={styles.nombre} numberOfLines={1}>
              {s.nombre}
            </Text>
            <Text style={styles.meta} numberOfLines={2}>
              {s.direccion || 'Sin dirección registrada'}
            </Text>
          </View>
          <Badge
            label={s.activo ? 'Activa' : 'Inactiva'}
            color={s.activo ? '#2E7D32' : colors.textMuted}
          />
        </View>
      </Card>
    ));
  }

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <SectionTitle>Sedes</SectionTitle>
        <ErrorBanner message={error} />
        <ChipSelect
          label="Mostrar"
          options={FILTROS}
          value={filtro}
          onChange={setFiltro}
        />
        {content}
      </Screen>
      {esAdmin ? (
        <Fab onPress={() => navigation.navigate('SedeForm')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datos: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nombre: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
