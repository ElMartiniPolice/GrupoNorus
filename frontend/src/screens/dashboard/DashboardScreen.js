/**
 * DashboardScreen — Panel de KPIs (solo ADMINISTRADOR).
 * GET /core/kpis/ → { kpis: [...] } con campos exactos de apps/core/kpis.py.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  const pctKey =
    kpi.porcentaje !== undefined
      ? 'porcentaje'
      : kpi.porcentaje_sin_conflicto !== undefined
        ? 'porcentaje_sin_conflicto'
        : null;
  const pct = pctKey !== null ? Number(kpi[pctKey]) : NaN;
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
        <Row key={key} label={KPI_LABELS[key] || key.replace(/_/g, ' ')} value={fmtValue(key, value)} />
      ))}
    </Card>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onError = makeErrorHandler(logout);

  const load = useCallback(
    async (silent = false) => {
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
    [onError],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!kpis && !error) return <Loading label="Cargando panel…" />;

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Text style={styles.hello}>Hola, {user?.nombre || 'NORUS'}</Text>
      <Badge label={user?.rol_nombre || ''} color={colors.primaryLight} />
      <SectionTitle>Panel de KPIs</SectionTitle>
      {error ? <ErrorBanner message={error} /> : null}
      {kpis && kpis.length === 0 && !error && (
        <Text style={styles.empty}>Sin mediciones todavía.</Text>
      )}
      {kpis?.map((k, i) => (
        <KpiCard key={k.kpi || i} kpi={k} />
      ))}
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
});
