import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { inventoryService } from '../../services/inventoryService';
import { sedeService } from '../../services/sedeService';
import { sedeLabel } from '../../utils/labels';
import { colors, fonts, spacing } from '../../theme';
import {
  Badge,
  Card,
  ChipSelect,
  EmptyState,
  ErrorBanner,
  Fab,
  Input,
  Loading,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';

export default function InventoryScreen({ navigation }) {
  const { user, logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);
  const puedeEditar =
    user?.rol_nombre === 'ADMINISTRADOR' || user?.rol_nombre === 'RECEPCION';

  const [items, setItems] = useState(null);
  const [sedes, setSedes] = useState([]);
  const [sedeId, setSedeId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setItems(null);
      setRefreshing(true);
      try {
        const params = {};
        if (sedeId) params.sede = sedeId;
        if (query.trim()) params.search = query.trim();
        const data = await inventoryService.list(params);
        setItems(data);
        setError('');
      } catch (e) {
        const msg = onError(e);
        if (msg) setError(msg);
      } finally {
        setRefreshing(false);
      }
    },
    [sedeId, query, onError],
  );

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  useEffect(() => {
    let alive = true;
    sedeService
      .list()
      .then((data) => {
        if (alive) setSedes(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  let content = <Loading label="Cargando inventario…" />;
  if (items?.length === 0) {
    content = <EmptyState message="Sin artículos de inventario registrados." />;
  } else if (items?.length > 0) {
    content = items.map((item) => (
      <Card
        key={item.id}
        onPress={
          puedeEditar
            ? () => navigation.navigate('InventarioForm', { id: item.id })
            : undefined
        }
      >
        <View style={styles.fila}>
          <View style={styles.datos}>
            <Text style={styles.nombre} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.categoria || 'Sin categoría'} · {sedeLabel(item.sede)}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              Cantidad: {item.cantidad} · Stock mínimo: {item.stock_minimo}
            </Text>
          </View>
          {item.cantidad <= item.stock_minimo ? (
            <Badge label="Stock bajo" color={colors.coral} />
          ) : null}
        </View>
      </Card>
    ));
  }

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <SectionTitle>Inventario</SectionTitle>
        <ErrorBanner message={error} />
        <Input
          label="Buscar"
          placeholder="Nombre, categoría o notas…"
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={() => setQuery(busqueda)}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <ChipSelect
          label="Sede"
          options={sedes}
          value={sedeId}
          onChange={setSedeId}
        />
        {content}
      </Screen>
      {puedeEditar ? (
        <Fab onPress={() => navigation.navigate('InventarioForm')} />
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
    marginBottom: 2,
  },
});
