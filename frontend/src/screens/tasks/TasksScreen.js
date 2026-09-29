/**
 * TasksScreen — CU2/CU5: Listado de tareas.
 * OPERARIO ve solo las suyas (GET /tasks/tareas/?mias=true); el resto ve todas.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { taskService, ESTADOS_TAREA } from '../../services/taskService';
import { colors, fonts, spacing, radius, prioridadColor, taskEstadoColor } from '../../theme';
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  Fab,
  Loading,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel, userLabel, estadoLabel } from '../../utils/labels';

export default function TasksScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [tareas, setTareas] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [estado, setEstado] = useState('TODAS');
  const esOperario = user?.rol_nombre === 'OPERARIO';
  const onError = makeErrorHandler(logout);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setTareas(null);
      setRefreshing(true);
      try {
        const data = esOperario ? await taskService.mias() : await taskService.list();
        setTareas(Array.isArray(data) ? data : []);
        setError('');
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      } finally {
        setRefreshing(false);
      }
    },
    [esOperario, onError],
  );

  // Refresco silencioso al volver al foco (p. ej. tras crear/editar una tarea).
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const visibles = (tareas || []).filter((t) => estado === 'TODAS' || t.estado === estado);

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <SectionTitle>Tareas</SectionTitle>
        <View style={styles.chips}>
          {['TODAS', ...ESTADOS_TAREA].map((e) => (
            <TouchableOpacity
              key={e}
              style={[styles.chip, estado === e && styles.chipActive]}
              onPress={() => setEstado(e)}
            >
              <Text style={[styles.chipText, estado === e && styles.chipTextActive]}>
                {e === 'TODAS' ? 'Todas' : estadoLabel(e)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {error ? <ErrorBanner message={error} /> : null}
        {!tareas && !error && <Loading label="Cargando tareas…" />}
        {tareas && visibles.length === 0 && !error && (
          <EmptyState message="No hay tareas para mostrar." />
        )}
        {visibles.map((t) => (
          <Card key={t.id} onPress={() => navigation.navigate('TaskDetail', { id: t.id })}>
            <View style={styles.cardHead}>
              <Text style={styles.titulo}>{t.titulo}</Text>
              <Badge label={estadoLabel(t.estado)} color={taskEstadoColor[t.estado] || colors.textMuted} />
            </View>
            <Text style={styles.meta}>Habitación: {habLabel(t.habitacion)}</Text>
            <View style={styles.cardFoot}>
              <Badge label={`Prioridad ${t.prioridad}`} color={prioridadColor[t.prioridad] || colors.textMuted} />
              {!esOperario && <Text style={styles.asignado}>{userLabel(t.asignado_a)}</Text>}
            </View>
          </Card>
        ))}
      </Screen>
      {!esOperario && <Fab onPress={() => navigation.navigate('CreateTask')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: spacing.sm,
  },
  titulo: { fontFamily: fonts.title, fontSize: 17, color: colors.primary, flex: 1 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  asignado: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, flex: 1, textAlign: 'right' },
});
