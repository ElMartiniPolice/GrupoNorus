/**
 * TaskDetailScreen — CU6 (actualizar estado) y CU9 (validación por ADMINISTRADOR).
 * PATCH /tasks/tareas/:id/ {estado} · POST /tasks/tareas/:id/validar/ · GET .../historial/
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { taskService, ESTADOS_TAREA } from '../../services/taskService';
import { colors, fonts, spacing, radius, taskEstadoColor } from '../../theme';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Loading,
  Row,
  Screen,
  SectionTitle,
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel, userLabel, estadoLabel } from '../../utils/labels';

function historialLine(e) {
  if (!e) return { linea: '', meta: '' };
  if (typeof e !== 'object') return { linea: String(e), meta: '' };
  const estado = e.estado_nuevo ?? e.nuevo_estado ?? e.estado;
  const fecha = e.fecha ?? e.creada_en ?? e.fecha_cambio ?? e.modificada_en;
  const quien = e.usuario ?? e.cambiado_por ?? e.responsable;
  const linea = estado ? estadoLabel(estado) : JSON.stringify(e);
  const meta = [quien ? userLabel(quien) : '', fecha ? formatFecha(fecha) : '']
    .filter(Boolean)
    .join('\n');
  return { linea, meta };
}

export default function TaskDetailScreen({ route }) {
  const { id } = route.params;
  const { user, logout } = useAuth();
  const [tarea, setTarea] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const esAdmin = user?.rol_nombre === 'ADMINISTRADOR';
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  const load = useCallback(async () => {
    try {
      const t = await taskService.get(id);
      setTarea(t);
      setError('');
      const h = await taskService.historial(id).catch(() => []);
      setHistorial(Array.isArray(h) ? h : []);
    } catch (e) {
      const m = onError(e);
      if (m) setError(m);
    }
  }, [id, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const cambiarEstado = async (nuevo) => {
    setBusy(true);
    setMsg('');
    try {
      await taskService.cambiarEstado(id, nuevo);
      setMsg('Estado actualizado.');
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  const validar = async () => {
    setBusy(true);
    setMsg('');
    try {
      await taskService.validar(id);
      setMsg('Tarea validada correctamente.');
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  if (!tarea && !error) return <Loading label="Cargando tarea…" />;

  return (
    <Screen>
      {error ? <ErrorBanner message={error} /> : null}
      {msg ? (
        <View style={styles.okBanner}>
          <Text style={styles.okText}>{msg}</Text>
        </View>
      ) : null}
      {tarea && (
        <>
          <Card>
            <View style={styles.head}>
              <Text style={styles.titulo}>{tarea.titulo}</Text>
              <Badge label={estadoLabel(tarea.estado)} color={taskEstadoColor[tarea.estado] || colors.textMuted} />
            </View>
            <Row label="Habitación" value={habLabel(tarea.habitacion)} />
            <Row label="Responsable" value={userLabel(tarea.asignado_a)} />
            <Row label="Prioridad" value={tarea.prioridad} />
            <Row label="Creada" value={formatFecha(tarea.creada_en)} />
            {tarea.descripcion ? (
              <Text style={styles.desc}>{tarea.descripcion}</Text>
            ) : null}
          </Card>

          <SectionTitle>Cambiar estado</SectionTitle>
          <View style={styles.chips}>
            {ESTADOS_TAREA.map((e) => (
              <Button
                key={e}
                title={estadoLabel(e)}
                variant={tarea.estado === e ? 'primary' : 'secondary'}
                disabled={busy || tarea.estado === e}
                onPress={() => cambiarEstado(e)}
                style={styles.estadoBtn}
              />
            ))}
          </View>

          {esAdmin && (
            <Button
              title="Validar tarea"
              variant="gold"
              loading={busy}
              disabled={busy || tarea.estado === 'COMPLETADA'}
              onPress={validar}
              style={styles.validarBtn}
            />
          )}

          <SectionTitle>Historial</SectionTitle>
          {historial.length === 0 && (
            <Text style={styles.empty}>Sin registros de cambios.</Text>
          )}
          {historial.map((e, i) => {
            const h = historialLine(e);
            return (
              <View key={i} style={styles.histItem}>
                <Text style={styles.histText}>{h.linea}</Text>
                {h.meta ? <Text style={styles.histMeta}>{h.meta}</Text> : null}
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  titulo: { fontFamily: fonts.title, fontSize: 22, color: colors.primary, flex: 1 },
  desc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  estadoBtn: { minWidth: 140, flexGrow: 1 },
  validarBtn: { marginTop: spacing.md },
  okBanner: {
    backgroundColor: `${colors.primaryLight}1E`,
    borderWidth: 1,
    borderColor: `${colors.primaryLight}55`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  okText: { color: colors.primary, fontFamily: fonts.body, fontSize: 13 },
  empty: { fontFamily: fonts.body, color: colors.textMuted },
  histItem: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  histText: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  histMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
