import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { privacyService } from '../../services/privacyService';
import { colors, fonts, spacing } from '../../theme';
import { userLabel } from '../../utils/labels';
import {
  Badge,
  Button,
  Card,
  ChipSelect,
  EmptyState,
  ErrorBanner,
  Input,
  Loading,
  Row,
  Screen,
  SectionTitle,
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';

const FILTERS = [
  { id: 'all', nombre: 'Todas' },
  { id: 'PENDIENTE', nombre: 'Pendientes' },
  { id: 'EN_PROCESO', nombre: 'En proceso' },
  { id: 'RESUELTA', nombre: 'Resueltas' },
  { id: 'RECHAZADA', nombre: 'Rechazadas' },
];

const STATE_OPTIONS = [
  { id: 'PENDIENTE', nombre: 'Pendiente' },
  { id: 'EN_PROCESO', nombre: 'En proceso' },
  { id: 'RESUELTA', nombre: 'Resuelta' },
  { id: 'RECHAZADA', nombre: 'Rechazada' },
];

function stateColor(state) {
  switch (state) {
    case 'RESUELTA':
      return colors.primaryLight;
    case 'RECHAZADA':
      return colors.coral;
    case 'EN_PROCESO':
      return colors.gold;
    default:
      return colors.textMuted;
  }
}

function requestTypeLabel(tipo) {
  return String(tipo || '').replaceAll('_', ' ').toLowerCase();
}

export default function AdminSolicitudesScreen() {
  const { user, logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  const [filter, setFilter] = useState('all');
  const [solicitudes, setSolicitudes] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(
    async (silent = false, filterValue = filter) => {
      if (!silent) setLoading(true);
      setRefreshing(Boolean(silent));
      setError('');
      try {
        const res = await privacyService.getSolicitudes(filterValue === 'all' ? undefined : filterValue);
        if (!res.ok) throw new Error(res.message);
        const items = Array.isArray(res.data) ? res.data : [];
        setSolicitudes(items);
        const nextDrafts = {};
        items.forEach((item) => {
          nextDrafts[item.id] = {
            estado: item.estado ?? 'PENDIENTE',
            respuesta: item.respuesta ?? '',
          };
        });
        setDrafts(nextDrafts);
      } catch (e) {
        setError(onError(e) || 'No fue posible cargar las solicitudes.');
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, onError],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const guardar = async (item) => {
    const draft = drafts[item.id] || {};
    setSavingId(item.id);
    setError('');
    try {
      const res = await privacyService.actualizarSolicitud(item.id, {
        estado: draft.estado,
        respuesta: draft.respuesta,
      });
      if (!res.ok) throw new Error(res.message);
      await load(true);
    } catch (e) {
      setError(onError(e) || 'No fue posible actualizar la solicitud.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <Loading label="Cargando solicitudes…" />;
  }

  if (user?.rol_nombre !== 'ADMINISTRADOR') {
    return (
      <Screen>
        <ErrorBanner message="No tiene permisos para ver este panel." />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <SectionTitle>Solicitudes de derechos</SectionTitle>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <ChipSelect
          label="Estado"
          options={FILTERS}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            load(false, value);
          }}
          keyBy="id"
          labelKey="nombre"
        />
      </Card>

      {solicitudes.length === 0 ? (
        <EmptyState message="No hay solicitudes para este filtro." />
      ) : (
        solicitudes.map((item) => {
          const draft = drafts[item.id] || { estado: item.estado, respuesta: item.respuesta || '' };
          return (
            <Card key={item.id}>
              <View style={styles.rowHead}>
                <Text style={styles.cardTitle}>{requestTypeLabel(item.tipo)}</Text>
                <Badge label={item.estado} color={stateColor(item.estado)} />
              </View>
              <Text style={styles.cardText}>{item.detalle}</Text>
              <Row label="Titular" value={userLabel(item.usuario)} />
              <Row label="Creada" value={formatFecha(item.creada_en)} />
              <Row label="Resuelta" value={formatFecha(item.resuelta_en)} />
              <ChipSelect
                label="Nuevo estado"
                options={STATE_OPTIONS}
                value={draft.estado}
                onChange={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [item.id]: { ...current[item.id], estado: value },
                  }))
                }
                keyBy="id"
                labelKey="nombre"
              />
              <Input
                label="Respuesta"
                placeholder="Redacte la respuesta al titular"
                value={draft.respuesta}
                onChangeText={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [item.id]: { ...current[item.id], respuesta: value },
                  }))
                }
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />
              <Button
                title={savingId === item.id ? 'Guardando…' : 'Guardar cambios'}
                onPress={() => guardar(item)}
                loading={savingId === item.id}
                disabled={savingId === item.id}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.title,
    color: colors.primary,
    fontSize: 19,
  },
  cardText: {
    fontFamily: fonts.body,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
