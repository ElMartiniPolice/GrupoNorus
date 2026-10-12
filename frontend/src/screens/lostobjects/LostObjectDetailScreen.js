import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { lostObjectService } from '../../services/lostObjectService';
import { imagenUri } from '../../utils/imagen';
import { habLabel, sedeLabel, userLabel } from '../../utils/labels';
import { colors, fonts, objetoEstadoColor, radius, spacing } from '../../theme';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Input,
  Loading,
  Row,
  Screen,
  SectionTitle,
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';

const ESTADO_LABELS = {
  EN_RESGUARDO: 'En resguardo',
  ENTREGADO: 'Entregado',
  DESCARTADO: 'Descartado',
};

export default function LostObjectDetailScreen({ navigation, route }) {
  const { id } = route.params || {};
  const { user, logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);
  const puedeEditar =
    user?.rol_nombre === 'ADMINISTRADOR' || user?.rol_nombre === 'RECEPCION';

  const [obj, setObj] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [entregadoA, setEntregadoA] = useState('');
  const [procesando, setProcesando] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setObj(null);
      setRefreshing(true);
      try {
        const data = await lostObjectService.get(id);
        setObj(data);
        setError('');
      } catch (e) {
        const msg = onError(e);
        if (msg) setError(msg);
      } finally {
        setRefreshing(false);
      }
    },
    [id, onError],
  );

  useEffect(() => {
    load();
  }, [load]);

  const adjuntar = useCallback(async () => {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (resultado.canceled || !resultado.assets?.length) return;
      setProcesando(true);
      await lostObjectService.adjuntarImagen(id, resultado.assets[0]);
      await load(true);
    } catch (e) {
      const msg = onError(e);
      if (msg) setError(msg);
    } finally {
      setProcesando(false);
    }
  }, [id, load, onError]);

  const entregar = useCallback(async () => {
    if (!entregadoA.trim()) {
      setError('Indica el nombre de quien retira el objeto.');
      return;
    }
    setProcesando(true);
    try {
      await lostObjectService.entregar(id, entregadoA.trim());
      setEntregadoA('');
      await load(true);
    } catch (e) {
      const msg = onError(e);
      if (msg) setError(msg);
    } finally {
      setProcesando(false);
    }
  }, [id, entregadoA, load, onError]);

  const descartar = useCallback(() => {
    Alert.alert(
      'Descartar objeto',
      '¿Seguro que quieres marcar este objeto como descartado? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            setProcesando(true);
            try {
              await lostObjectService.descartar(id);
              await load(true);
            } catch (e) {
              const msg = onError(e);
              if (msg) setError(msg);
            } finally {
              setProcesando(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [id, load, onError]);

  if (!obj && !error) {
    return <Loading label="Cargando objeto…" />;
  }

  const uri = imagenUri(obj?.imagen);
  const enResguardo = obj?.estado === 'EN_RESGUARDO';

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <ErrorBanner message={error} />
      {obj ? (
        <>
          {uri ? (
            <Image source={{ uri }} style={styles.imagen} />
          ) : (
            <View style={[styles.imagen, styles.imagenVacia]}>
              <Text style={styles.imagenVaciaTexto}>Sin imagen adjunta</Text>
            </View>
          )}
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>{obj.titulo}</Text>
            <Badge
              label={ESTADO_LABELS[obj.estado] || obj.estado}
              color={objetoEstadoColor[obj.estado] || colors.textMuted}
            />
          </View>
          <Card>
            <Row label="Categoría" value={obj.categoria} />
            <Row label="Sede" value={sedeLabel(obj.sede)} />
            <Row label="Habitación" value={habLabel(obj.habitacion)} />
            <Row label="Ubicación" value={obj.ubicacion} />
            <Row label="Descripción" value={obj.descripcion} />
            <Row label="Reportado por" value={userLabel(obj.reportado_por)} />
            <Row label="Encontrado" value={formatFecha(obj.encontrado_en)} />
            {obj.estado === 'ENTREGADO' ? (
              <>
                <Row label="Entregado a" value={obj.entregado_a} />
                <Row label="Fecha de entrega" value={formatFecha(obj.entregado_en)} />
              </>
            ) : null}
          </Card>

          {puedeEditar ? (
            <>
              <SectionTitle>Acciones</SectionTitle>
              <Card>
                {enResguardo ? (
                  <>
                    <Input
                      label="Entregado a"
                      placeholder="Nombre de quien retira el objeto"
                      value={entregadoA}
                      onChangeText={setEntregadoA}
                    />
                    <Button
                      title="Marcar como entregado"
                      onPress={entregar}
                      loading={procesando}
                      style={styles.boton}
                    />
                    <Button
                      title="Descartar objeto"
                      variant="danger"
                      onPress={descartar}
                      disabled={procesando}
                      style={styles.boton}
                    />
                  </>
                ) : null}
                <Button
                  title="Adjuntar imagen"
                  variant="secondary"
                  onPress={adjuntar}
                  disabled={procesando}
                  style={styles.boton}
                />
              </Card>
              <Button
                title="Editar"
                variant="gold"
                onPress={() => navigation.navigate('LostObjectForm', { id: obj.id })}
                style={styles.boton}
              />
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  imagen: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  imagenVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  imagenVaciaTexto: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.hint,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titulo: {
    flex: 1,
    marginRight: spacing.sm,
    fontFamily: fonts.title,
    fontSize: 20,
    color: colors.primary,
  },
  boton: {
    marginTop: spacing.sm,
  },
});
