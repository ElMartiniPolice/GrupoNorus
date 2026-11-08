/**
 * IncidenciasScreen — CU8: Listado de incidencias reportadas con diseño moderno NORUS.
 * Severidades: CRITICO / ALTO / MEDIO / BAJO (severityColor).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { incidentService, SEVERIDADES } from '../../services/incidentService';
import { colors, fonts, spacing, radius, severityColor } from '../../theme';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Loading,
  Screen,
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel, estadoLabel } from '../../utils/labels';
import { slaText } from '../../utils/sla';

export function estadoInc(inc) {
  if (inc.estado) return inc.estado;
  if (inc.resuelta_en || inc.resuelta) return 'RESUELTA';
  if (inc.atendida_en) return 'ATENDIDA';
  return 'REPORTADA';
}

const SEVERITY_TILES = [
  { id: 'TODAS', text: 'Todas', icon: 'list-outline' },
  { id: 'CRITICO', text: 'Críticas', icon: 'alert-circle-outline' },
  { id: 'ALTO', text: 'Altas', icon: 'warning-outline' },
  { id: 'MEDIO', text: 'Medias', icon: 'information-circle-outline' },
  { id: 'BAJO', text: 'Bajas', icon: 'checkmark-circle-outline' },
];

export default function IncidenciasScreen({ navigation }) {
  const { logout, user } = useAuth();
  const { width } = useWindowDimensions();
  const [incidencias, setIncidencias] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [severidad, setSeveridad] = useState('TODAS');
  const [search, setSearch] = useState('');
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIncidencias(null);
      setRefreshing(true);
      try {
        const data = await incidentService.list();
        setIncidencias(Array.isArray(data) ? data : []);
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

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const counts = useMemo(() => {
    const tally = { TODAS: incidencias?.length || 0 };
    SEVERITY_TILES.slice(1).forEach((s) => {
      tally[s.id] = (incidencias || []).filter((i) => i.severidad === s.id).length;
    });
    return tally;
  }, [incidencias]);

  const filtered = useMemo(() => {
    return (incidencias || []).filter((i) => {
      const matchSev = severidad === 'TODAS' || i.severidad === severidad;
      const term = search.trim().toLowerCase();
      const matchSearch =
        !term ||
        String(i.titulo || '').toLowerCase().includes(term) ||
        String(habLabel(i.habitacion)).toLowerCase().includes(term);
      return matchSev && matchSearch;
    });
  }, [incidencias, severidad, search]);

  const cardWidth = width >= 1180 ? '31.8%' : width >= 720 ? '48.7%' : '100%';

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        {/* Header Hero */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>GESTIÓN OPERATIVA</Text>
            <Text style={styles.title}>Incidencias</Text>
            <Text style={styles.description}>
              Reporte, seguimiento y resolución de incidencias en habitaciones.
            </Text>
          </View>
          <View style={styles.totalPill}>
            <Ionicons name="alert-circle-outline" size={17} color={colors.primary} />
            <Text style={styles.totalText}>{counts.TODAS} registradas</Text>
          </View>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {/* Severity Tiles */}
        <View style={styles.countsRow}>
          {SEVERITY_TILES.slice(1).map((s) => {
            const color = severityColor[s.id] || colors.primaryLight;
            const isSelected = severidad === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSeveridad(isSelected ? 'TODAS' : s.id)}
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
              placeholder="Buscar por título o número de habitación…"
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
            {SEVERITY_TILES.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSeveridad(s.id)}
                style={[styles.chip, severidad === s.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, severidad === s.id && styles.chipTextActive]}>
                  {s.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!incidencias && !error && <Loading label="Cargando incidencias…" />}

        {incidencias && filtered.length === 0 && !error && (
          <EmptyState message="No hay incidencias que coincidan con la búsqueda." />
        )}

        {/* Grid de Incidencias */}
        <View style={styles.grid}>
          {filtered.map((inc) => {
            const estado = estadoInc(inc);
            const colorSev = severityColor[inc.severidad] || colors.textMuted;
            const sla = slaText(inc.severidad);
            return (
              <TouchableOpacity
                key={inc.id}
                style={[styles.incCard, { width: cardWidth }]}
                onPress={() => navigation.navigate('IncidenciaDetail', { id: inc.id })}
                activeOpacity={0.88}
              >
                <View style={[styles.cardStrip, { backgroundColor: colorSev }]} />
                <View style={styles.cardInner}>
                  <View style={styles.cardHead}>
                    <View style={styles.roomBadgeWrap}>
                      <Ionicons
                        name={inc.habitacion ? 'bed-outline' : 'business-outline'}
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.roomBadgeText}>
                        {inc.habitacion && habLabel(inc.habitacion) !== '—'
                          ? `Hab. ${habLabel(inc.habitacion)}`
                          : 'Área General'}
                      </Text>
                    </View>
                    <Badge label={inc.severidad} color={colorSev} />
                  </View>

                  <Text style={styles.cardTitulo} numberOfLines={2}>
                    {inc.titulo}
                  </Text>

                  {sla ? (
                    <View style={styles.slaWrap}>
                      <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.slaText}>{sla}</Text>
                    </View>
                  ) : null}

                  <View style={styles.divider} />

                  <View style={styles.cardFoot}>
                    <View style={styles.reporterInfo}>
                      <Text style={styles.reporterName} numberOfLines={1}>
                        👤 {inc.reportada_por?.nombre || inc.reportado_por?.nombre || 'Personal'}
                      </Text>
                      {(inc.reportada_por?.rol_nombre || inc.reportada_por?.area_nombre) ? (
                        <View style={styles.rolPill}>
                          <Text style={styles.rolPillText}>
                            {[inc.reportada_por.rol_nombre, inc.reportada_por.area_nombre].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Badge
                      label={estadoLabel(estado)}
                      color={estado === 'RESUELTA' ? colors.primary : estado === 'ATENDIDA' ? colors.primaryLight : colors.gold}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Screen>

      {/* FAB para reportar nueva incidencia */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateIncident')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  incCard: {
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
    marginBottom: 6,
  },
  slaWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  slaText: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  reporterInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  reporterName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  rolPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  rolPillText: {
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
