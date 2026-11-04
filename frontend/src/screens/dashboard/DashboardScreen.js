/**
 * DashboardScreen — Panel de KPIs (solo ADMINISTRADOR).
 * GET /core/kpis/ → { kpis: [...] } con campos exactos de apps/core/kpis.py.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
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
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const cargarUsuarios = useCallback(async () => {
    setCargandoUsuarios(true);
    try {
      const data = await kpiService.porUsuario();
      setUsuarios(data);
    } catch (e) {
      const msg = onError(e);
      if (msg) setError(msg);
    } finally {
      setCargandoUsuarios(false);
    }
  }, [onError]);

  const load = useCallback(
    async (silent = false, usuarioId = null) => {
      if (!silent) setKpis(null);
      setRefreshing(true);
      try {
        const data = await kpiService.resumen(usuarioId);
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
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Si hay un usuario seleccionado, cargar sus KPIs; si no, cargar todos
  useEffect(() => {
    if (usuarioSeleccionado) {
      load(false, usuarioSeleccionado.usuario.id);
    } else {
      load(false);
    }
  }, [usuarioSeleccionado]);

    // Memoize KPI cards to avoid re-renders - always call useMemo
    const kpiCards = useMemo(
      () => kpis?.map((k, i) => <KpiCard key={k.kpi || i} kpi={k} />),
      [kpis],
    );

    if (!kpis && !error && !cargandoUsuarios) return <Loading label="Cargando panel…" />;

    return (
    <Screen refreshing={refreshing} onRefresh={() => load(false)}>
      <View style={styles.header}>
        <Text style={styles.hello}>Hola, {user?.nombre || 'NORUS'}</Text>
        <Badge label={user?.rol_nombre || ''} color={colors.primaryLight} />
      </View>

      {/* Selector de persona */}
      {user?.rol_nombre === 'ADMINISTRADOR' ? (
        <View style={styles.personSelector}>
          <Text style={styles.personLabel}>Ver KPIs por:</Text>
          {cargandoUsuarios ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : usuarios.length === 0 ? (
            <Text style={styles.noUsers}>No hay usuarios registrados</Text>
          ) : (
            <View style={styles.userDropdown}>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setDropdownOpen(!dropdownOpen)}
              >
                <View style={styles.dropdownTriggerContent}>
                  <Text style={styles.dropdownTriggerText}>
                    {usuarioSeleccionado
                      ? usuarioSeleccionado.usuario.nombre_completo
                      : 'Todos los usuarios'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </View>
              </TouchableOpacity>
              {dropdownOpen && (
                <View style={styles.dropdownList}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.dropdownScrollContent}
                  >
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setUsuarioSeleccionado(null);
                        setDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>Todos los usuarios</Text>
                    </TouchableOpacity>
                    {usuarios.map((u) => (
                      <TouchableOpacity
                        key={u.usuario.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setUsuarioSeleccionado(u);
                          setDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {u.usuario.nombre_completo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>
      ) : null}

      <SectionTitle>Panel de KPIs</SectionTitle>
      {error ? <ErrorBanner message={error} /> : null}
      {kpis && kpis.length === 0 && !error && <Text style={styles.empty}>Sin mediciones todavía.</Text>}
      {kpiCards}
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
    fontFamily: fonts.serif,
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
  personSelector: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    borderRadius: radius.md,
  },
  personLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noUsers: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.md,
  },
  userDropdown: {
    marginTop: spacing.sm,
  },
  dropdownTrigger: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  dropdownTriggerText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  dropdownArrow: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.primaryLight,
  },
  dropdownList: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 240,
    overflow: 'hidden',
  },
  dropdownScrollContent: {
    paddingBottom: spacing.sm,
  },
  dropdownItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
});
