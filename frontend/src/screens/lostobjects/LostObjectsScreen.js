import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { lostObjectService } from '../../services/lostObjectService';
import { sedeService } from '../../services/sedeService';
import { imagenUri } from '../../utils/imagen';
import { sedeLabel } from '../../utils/labels';
import { colors, fonts, objetoEstadoColor, spacing } from '../../theme';
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
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';

const ESTADOS = [
  { id: 'EN_RESGUARDO', nombre: 'En resguardo' },
  { id: 'ENTREGADO', nombre: 'Entregado' },
  { id: 'DESCARTADO', nombre: 'Descartado' },
];

const ESTADO_LABELS = {
  EN_RESGUARDO: 'En resguardo',
  ENTREGADO: 'Entregado',
  DESCARTADO: 'Descartado',
};

export default function LostObjectsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);
  const puedeEditar =
    user?.rol_nombre === 'ADMINISTRADOR' || user?.rol_nombre === 'RECEPCION';

  const [objetos, setObjetos] = useState(null);
  const [sedes, setSedes] = useState([]);
  const [estado, setEstado] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setObjetos(null);
      setRefreshing(true);
      try {
        const params = {};
        if (estado) params.estado = estado;
        if (sedeId) params.sede = sedeId;
        if (query.trim()) params.search = query.trim();
        const data = await lostObjectService.list(params);
        setObjetos(data);
        setError('');
      } catch (e) {
        const msg = onError(e);
        if (msg) setError(msg);
      } finally {
        setRefreshing(false);
      }
    },
    [estado, sedeId, query, onError],
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

  let content = <Loading label="Cargando objetos…" />;
  if (objetos?.length === 0) {
    content = <EmptyState message="Sin objetos perdidos registrados." />;
  } else if (objetos?.length > 0) {
    content = objetos.map((obj) => {
      const uri = imagenUri(obj.imagen);
      return (
        <Card
          key={obj.id}
          onPress={() =>
            navigation.navigate('LostObjectDetail', { id: obj.id })
          }
        >
          <View style={styles.fila}>
            {uri ? (
              <Image source={{ uri }} style={styles.miniatura} />
            ) : (
              <View style={[styles.miniatura, styles.miniaturaVacia]}>
                <Ionicons name="briefcase-outline" size={24} color={colors.primarySoft} />
              </View>
            )}
            <View style={styles.datos}>
              <Text style={styles.titulo} numberOfLines={1}>
                {obj.titulo}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {obj.categoria || 'Sin categoría'} · {sedeLabel(obj.sede)}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                Encontrado: {formatFecha(obj.encontrado_en)}
              </Text>
            </View>
            <Badge
              label={ESTADO_LABELS[obj.estado] || obj.estado}
              color={objetoEstadoColor[obj.estado] || colors.textMuted}
            />
          </View>
        </Card>
      );
    });
  }

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <SectionTitle>Objetos perdidos</SectionTitle>
        <ErrorBanner message={error} />
        <Input
          label="Buscar"
          placeholder="Título, categoría o ubicación…"
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={() => setQuery(busqueda)}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <ChipSelect
          label="Estado"
          options={ESTADOS}
          value={estado}
          onChange={setEstado}
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
        <Fab onPress={() => navigation.navigate('LostObjectForm')} />
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
  miniatura: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  miniaturaVacia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniaturaIcono: {
    fontSize: 22,
  },
  datos: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  titulo: {
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
