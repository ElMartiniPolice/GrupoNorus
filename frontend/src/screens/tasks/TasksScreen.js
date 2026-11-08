/**
 * TasksScreen — CU2/CU5: Listado de tareas con diseño moderno NORUS.
 * OPERARIO ve solo las suyas (GET /tasks/tareas/?mias=true); el resto ve todas.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { taskService, ESTADOS_TAREA } from '../../services/taskService';
import { colors, fonts, spacing, radius, prioridadColor, taskEstadoColor } from '../../theme';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Loading,
  Screen,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel, userLabel, estadoLabel } from '../../utils/labels';

const TASK_STATUS_TILES = [
  { id: 'TODAS', text: 'Todas', icon: 'clipboard-outline' },
  { id: 'PENDIENTE', text: 'Pendientes', icon: 'hourglass-outline' },
  { id: 'EN_PROGRESO', text: 'En progreso', icon: 'play-outline' },
  { id: 'COMPLETADA', text: 'Completadas', icon: 'checkmark-circle-outline' },
  { id: 'CANCELADA', text: 'Canceladas', icon: 'close-circle-outline' },
];

export default function TasksScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [tareas, setTareas] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [estado, setEstado] = useState('TODAS');
  const [search, setSearch] = useState('');
  const esOperario = user?.rol_nombre === 'OPERARIO';
  const onError = useCallback(makeErrorHandler(logout), [logout]);

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

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const counts = useMemo(() => {
    const tally = { TODAS: tareas?.length || 0 };
    TASK_STATUS_TILES.slice(1).forEach((s) => {
      tally[s.id] = (tareas || []).filter((t) => t.estado === s.id).length;
    });
    return tally;
  }, [tareas]);

  const filteredTareas = useMemo(() => {
    return (tareas || []).filter((t) => {
      const matchEstado = estado === 'TODAS' || t.estado === estado;
      const term = search.trim().toLowerCase();
      const matchSearch =
        !term ||
        String(t.titulo || '').toLowerCase().includes(term) ||
        String(habLabel(t.habitacion)).toLowerCase().includes(term) ||
        String(userLabel(t.asignado_a)).toLowerCase().includes(term);
      return matchEstado && matchSearch;
    });
  }, [tareas, estado, search]);

  const cardWidth = width >= 1180 ? '31.8%' : width >= 720 ? '48.7%' : '100%';

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        {/* Header Hero */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>OPERACIONES Y ASIGNACIONES</Text>
            <Text style={styles.title}>{esOperario ? 'Mis Tareas' : 'Tareas'}</Text>
            <Text style={styles.description}>
              {esOperario
                ? 'Tareas asignadas a tu cargo para hoy.'
                : 'Asignación, seguimiento y control de tareas del equipo hotelero.'}
            </Text>
          </View>
          <View style={styles.totalPill}>
            <Ionicons name="clipboard-outline" size={17} color={colors.primary} />
            <Text style={styles.totalText}>{counts.TODAS} tareas</Text>
          </View>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {/* Status Tiles */}
        <View style={styles.countsRow}>
          {TASK_STATUS_TILES.slice(1).map((s) => {
            const color = taskEstadoColor[s.id] || colors.primaryLight;
            const isSelected = estado === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setEstado(isSelected ? 'TODAS' : s.id)}
                style={[styles.statusTile, isSelected && styles.selectedTile]}
              >
                <View style={[styles.statusIcon, { backgroundColor: color + '1F' }]}>
                  <Ionicons name={s.icon} color={color} size={18} />
                </View>
                <Text style={styles.statusNumber}>{counts[s.id]}</Text>
                <Text style={styles.statusLabel}>{s.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search & Filters */}
        <View style={styles.filtersPanel}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              placeholder="Buscar por título, habitación o responsable…"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filters}>
            {TASK_STATUS_TILES.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setEstado(s.id)}
                style={[styles.chip, estado === s.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, estado === s.id && styles.chipTextActive]}>
                  {s.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!tareas && !error && <Loading label="Cargando tareas…" />}

        {tareas && filteredTareas.length === 0 && !error && (
          <EmptyState message="No hay tareas que coincidan con la búsqueda." />
        )}

        {/* Grid de Tareas */}
        <View style={styles.grid}>
          {filteredTareas.map((t) => {
            const colorEstado = taskEstadoColor[t.estado] || colors.textMuted;
            const colorPrio = prioridadColor[t.prioridad] || colors.primaryLight;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.taskCard, { width: cardWidth }]}
                onPress={() => navigation.navigate('TaskDetail', { id: t.id })}
                activeOpacity={0.88}
              >
                <View style={[styles.cardStrip, { backgroundColor: colorPrio }]} />
                <View style={styles.cardInner}>
                  <View style={styles.cardHead}>
                    <View style={styles.roomBadgeWrap}>
                      <Ionicons
                        name={t.habitacion && habLabel(t.habitacion) !== '—' ? 'bed-outline' : 'business-outline'}
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.roomBadgeText}>
                        {t.habitacion && habLabel(t.habitacion) !== '—'
                          ? `Hab. ${habLabel(t.habitacion)}`
                          : 'Área General'}
                      </Text>
                    </View>
                    <Badge label={estadoLabel(t.estado)} color={colorEstado} />
                  </View>

                  <Text style={styles.cardTitulo} numberOfLines={2}>
                    {t.titulo}
                  </Text>

                  {t.descripcion ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {t.descripcion}
                    </Text>
                  ) : null}

                  <View style={styles.divider} />

                  <View style={styles.cardFoot}>
                    <Badge label={`Prioridad ${t.prioridad}`} color={colorPrio} />

                    {!esOperario && t.asignado_a ? (
                      <View style={styles.asignadoContainer}>
                        <Ionicons name="person-circle-outline" size={15} color={colors.primary} />
                        <Text style={styles.asignadoNombre} numberOfLines={1}>
                          {userLabel(t.asignado_a)}
                        </Text>
                        {(t.asignado_a.rol_nombre || t.asignado_a.area_nombre) ? (
                          <View style={styles.rolBadge}>
                            <Text style={styles.rolBadgeText}>
                              {[t.asignado_a.rol_nombre, t.asignado_a.area_nombre].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Screen>

      {/* FAB para crear nueva tarea si no es operario */}
      {!esOperario && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateTask')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
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
  totalPill: {
    backgroundColor: colors.surfaceBrand,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 12 },
  countsRow: { flexDirection: 'row', gap: '1.5%', rowGap: 10, flexWrap: 'wrap', marginBottom: 18 },
  statusTile: {
    backgroundColor: colors.white,
    minWidth: 130,
    flexBasis: '23.5%',
    flexGrow: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    minHeight: 105,
  },
  selectedTile: { borderColor: colors.primaryLight, borderWidth: 2, backgroundColor: '#F4F9FC' },
  statusIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusNumber: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.primary },
  statusLabel: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  filtersPanel: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  searchBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 42,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.primary,
    paddingVertical: 6,
  },
  filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  chipTextActive: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%', rowGap: 14 },
  taskCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minWidth: 240,
    flexGrow: 1,
  },
  cardStrip: { height: 4 },
  cardInner: { padding: 16 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  roomBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceBrand,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roomBadgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  cardTitulo: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.primary,
    lineHeight: 22,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: 6,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  asignadoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceBrand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 5,
    maxWidth: '75%',
  },
  asignadoNombre: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
  },
  rolBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  rolBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { fontSize: 30, color: colors.primary, fontFamily: fonts.bodyBold },
});
