/**
 * DashboardScreen — Panel de KPIs (solo ADMINISTRADOR).
 * GET /core/kpis/ → { kpis: [...] } con campos exactos de apps/core/kpis.py.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { kpiService } from '../../services/kpiService';
import { colors, fonts, spacing, radius } from '../../theme';
import {
  Badge,
  Card,
  ErrorBanner,
  Loading,
  Row,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';

const ACTIONS = [
  { route: 'LostObjects', label: 'Objetos perdidos', icon: 'briefcase-outline' },
  { route: 'Inventario', label: 'Inventario', icon: 'cube-outline' },
  { route: 'Sedes', label: 'Sedes', icon: 'location-outline' },
];

const KPI_LABELS = {
  promedio_minutos: 'Promedio de respuesta',
  meta_minutos: 'Meta (min)',
  incidencias_mediciones: 'Incidencias medidas',
  registros_plataforma: 'Registros en plataforma',
  total_asignaciones: 'Asignaciones totales',
  sin_conflicto: 'Sin conflicto',
  porcentaje_sin_conflicto: '% sin conflicto',
  incidencias_con_evidencia_requerida: 'Requieren evidencia',
  con_foto: 'Con fotografía',
  porcentaje: 'Cumplimiento',
  usuarios_activos_hoy: 'Usuarios activos hoy',
  usuarios_totales: 'Usuarios totales',
  meta_porcentaje: 'Meta',
};

function fmtValue(key, v) {
  if (v === null || v === undefined) return '—';
  if (key.includes('porcentaje')) return `${v}%`;
  if (key.includes('minutos')) return `${v} min`;
  return String(v);
}

function KpiCard({ kpi }) {
  const entries = Object.entries(kpi || {}).filter(([key]) => key !== 'kpi');
  let pctKey = null;
  if (kpi.porcentaje !== undefined) pctKey = 'porcentaje';
  else if (kpi.porcentaje_sin_conflicto !== undefined) pctKey = 'porcentaje_sin_conflicto';
  const pct = pctKey !== null ? Number(kpi[pctKey]) : Number.NaN;
  const meta = Number(kpi.meta_porcentaje);
  const ok = !Number.isNaN(pct) && !Number.isNaN(meta) && pct >= meta;
  return (
    <Card>
      <Text style={styles.kpiTitle}>{kpi.kpi || 'KPI'}</Text>
      {pctKey !== null && !Number.isNaN(pct) && (
        <View style={styles.bar}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.max(0, Math.min(100, pct))}%`,
                backgroundColor: ok ? colors.primaryLight : colors.gold,
              },
            ]}
          />
        </View>
      )}
      {entries.map(([key, value]) => (
        <Row
          key={key}
          label={KPI_LABELS[key] || key.replaceAll('_', ' ')}
          value={fmtValue(key, value)}
        />
      ))}
    </Card>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const esAdmin = user?.rol_nombre === 'ADMINISTRADOR';
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  const load = useCallback(
    async (silent = false) => {
      if (!esAdmin) {
        setKpis([]);
        setError('');
        return;
      }
      if (!silent) setKpis(null);
      setRefreshing(true);
      try {
        const data = await kpiService.resumen();
        setKpis(Array.isArray(data) ? data : []);
        setError('');
      } catch (e) {
        const msg = onError(e);
        if (msg) setError(msg);
      } finally {
        setRefreshing(false);
      }
    },
    [esAdmin, onError],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (esAdmin && !kpis && !error) return <Loading label="Cargando panel…" />;

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Text style={styles.hello}>Hola, {user?.nombre || 'NORUS'}</Text>
      <Badge label={user?.rol_nombre || ''} color={colors.primaryLight} />

      <SectionTitle>Panel de acción</SectionTitle>
      <View style={styles.actionGrid}>
        {ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.route)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Ionicons name={action.icon} size={26} color={colors.primary} />
            <Text style={styles.actionLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {esAdmin ? (
        <>
          <SectionTitle>Panel de KPIs</SectionTitle>
          {error ? <ErrorBanner message={error} /> : null}
          {kpis?.length === 0 && !error && (
            <Text style={styles.empty}>Sin mediciones todavía.</Text>
          )}
          {kpis?.map((k, i) => (
            <KpiCard key={k.kpi || i} kpi={k} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  kpiTitle: {
    fontFamily: fonts.title,
    fontSize: 17,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  bar: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: radius.pill },
  empty: { fontFamily: fonts.body, color: colors.textMuted, textAlign: 'center' },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionCard: {
    width: '31.5%',
    minHeight: 86,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
    textAlign: 'center',
  },
});
