/** NORUS | Centro de operaciones. Datos reales del endpoint actual /core/kpis/. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { kpiService } from '../../services/kpiService';
import { colors, fonts, radius, spacing } from '../../theme';
import { Badge, Card, ErrorBanner, Loading, Row, Screen, makeErrorHandler } from '../../components/ui';

const LABELS = {
  promedio_minutos: 'Tiempo promedio', meta_minutos: 'Meta de respuesta', incidencias_mediciones: 'Incidencias medidas',
  registros_plataforma: 'Registros en plataforma', total_asignaciones: 'Asignaciones', sin_conflicto: 'Sin conflictos',
  porcentaje_sin_conflicto: 'Asignaciones sin conflicto', incidencias_con_evidencia_requerida: 'Requieren respaldo',
  con_foto: 'Con fotografía', porcentaje: 'Cumplimiento', usuarios_activos_hoy: 'Activos hoy',
  usuarios_totales: 'Usuarios totales', meta_porcentaje: 'Meta de cumplimiento', activo_hoy: 'Activo hoy',
};
const fmt = (key, value) => {
  if (value === null || value === undefined) return 'Sin datos';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (key.includes('porcentaje')) return `${value}%`;
  if (key.endsWith('minutos')) return `${value} min`;
  return String(value);
};

function SummaryTile({ icon, label, value, detail, tint, width }) {
  return (
    <View style={[styles.metric, { width }]}>
      <View style={[styles.metricIcon, { backgroundColor: tint + '1C' }]}>
        <Ionicons name={icon} size={21} color={tint} />
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricDetail} numberOfLines={2}>{detail}</Text>
    </View>
  );
}

function KpiCard({ kpi, width }) {
  const fields = Object.entries(kpi || {}).filter(([key]) => key !== 'kpi');
  const value = kpi.porcentaje ?? kpi.porcentaje_sin_conflicto;
  const percentage = value === null || value === undefined ? null : Number(value);
  const target = kpi.meta_porcentaje;
  const met = percentage !== null && Number.isFinite(percentage) &&
    target !== undefined && percentage >= Number(target);
  return (
    <Card style={[styles.detailCard, { width }]}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>{kpi.kpi || 'Indicador'}</Text>
        {percentage !== null && Number.isFinite(percentage) && target !== undefined ? (
          <Badge label={met ? 'Meta alcanzada' : 'Bajo meta'} color={met ? colors.primaryLight : '#926410'} />
        ) : null}
      </View>
      {percentage !== null && Number.isFinite(percentage) ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, percentage))}%`, backgroundColor: met ? colors.primaryLight : colors.gold }]} />
        </View>
      ) : null}
      {fields.map(([key, value]) => <Row key={key} label={LABELS[key] || key.replace(/_/g, ' ')} value={fmt(key, value)} />)}
    </Card>
  );
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const onError = useCallback(makeErrorHandler(logout), [logout]);
  const desktop = width >= 1000;
  const tablet = width >= 620;

  const cargarUsuarios = useCallback(async () => {
    setCargandoUsuarios(true);
    try {
      const data = await kpiService.porUsuario();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      const m = onError(e); if (m) setError(m);
    } finally { setCargandoUsuarios(false); }
  }, [onError]);

  const load = useCallback(async (selectedId = null, clear = true) => {
    if (clear) setKpis(null);
    setRefreshing(true);
    try {
      const data = await kpiService.resumen(selectedId);
      setKpis(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      const m = onError(e); if (m) setError(m);
    } finally { setRefreshing(false); }
  }, [onError]);

  useEffect(() => { if (user?.rol_nombre === 'ADMINISTRADOR') cargarUsuarios(); }, [cargarUsuarios, user?.rol_nombre]);
  useEffect(() => { load(seleccion?.usuario?.id ?? null); }, [seleccion, load]);

  const metrics = useMemo(() => {
    if (!kpis) return [];
    const find = (n) => kpis.find((k) => k.kpi?.startsWith(`KPI ${n}`)) || {};
    const one = find(1), two = find(2), three = find(3), four = find(4), five = find(5);
    const percent = (v) => v === null || v === undefined ? '—' : `${v}%`;
    return [
      { icon: 'timer-outline', label: 'Tiempo de respuesta', value: fmt('promedio_minutos', one.promedio_minutos), detail: `Meta: ${fmt('meta_minutos', one.meta_minutos)}`, tint: colors.primaryLight },
      { icon: 'layers-outline', label: 'Registros gestionados', value: fmt('registros_plataforma', two.registros_plataforma), detail: 'Tareas e incidencias registradas', tint: colors.primary },
      { icon: 'bed-outline', label: 'Asignaciones sin conflicto', value: percent(three.porcentaje_sin_conflicto), detail: `Meta: ${percent(three.meta_porcentaje)}`, tint: colors.primaryLight },
      { icon: 'camera-outline', label: 'Respaldo fotográfico', value: percent(four.porcentaje), detail: `Meta: ${percent(four.meta_porcentaje)}`, tint: '#926410' },
      { icon: 'people-outline', label: 'Adopción del sistema', value: percent(five.porcentaje), detail: `Meta: ${percent(five.meta_porcentaje)}`, tint: colors.primary },
    ];
  }, [kpis]);

  if (!kpis && !error) return <Loading label="Cargando indicadores…" />;
  const metricWidth = desktop ? '18.8%' : tablet ? '31.5%' : '48%';
  const detailWidth = tablet ? '48.8%' : '100%';
  return (
    <Screen refreshing={refreshing} onRefresh={() => load(seleccion?.usuario?.id ?? null, false)}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>NORUS / OPERACIONES</Text>
          <Text style={styles.hello}>Hola, {user?.nombre || 'equipo Norus'}</Text>
          <Text style={styles.subline}>Una visión clara del rendimiento operativo del hotel.</Text>
        </View>
        <View style={styles.heroBadge}><Ionicons name="shield-checkmark-outline" color={colors.white} size={17} /><Text style={styles.heroBadgeText}>{user?.rol_nombre || 'COLABORADOR'}</Text></View>
      </View>

      {user?.rol_nombre === 'ADMINISTRADOR' ? (
        <View style={styles.selector}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectorTitle}>Indicadores por colaborador</Text>
            <Text style={styles.selectorHint}>Selecciona una persona o consulta el resumen general.</Text>
          </View>
          <View style={styles.selectArea}>
            {cargandoUsuarios ? <ActivityIndicator color={colors.primary} /> : (
              <>
                <TouchableOpacity accessibilityRole="button" style={styles.selectBtn} onPress={() => setDropdownOpen(!dropdownOpen)}>
                  <Text style={styles.selectText} numberOfLines={1}>{seleccion?.usuario?.nombre_completo || 'Todos los usuarios'}</Text>
                  <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primaryLight} />
                </TouchableOpacity>
                {dropdownOpen ? (
                  <View style={styles.options}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {[{ usuario: { id: null, nombre_completo: 'Todos los usuarios' } }, ...usuarios].map((u, idx) => (
                        <TouchableOpacity key={u.usuario?.id || `all-${idx}`} style={styles.option} onPress={() => { setSeleccion(u.usuario?.id ? u : null); setDropdownOpen(false); }}>
                          <Text style={styles.optionText}>{u.usuario?.nombre_completo}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Resumen de indicadores</Text>
        <Text style={styles.sectionNote}>Datos de la plataforma</Text>
      </View>
      {kpis?.length ? (
        <>
          <View style={styles.metricsRow}>{metrics.map((m) => <SummaryTile key={m.label} {...m} width={metricWidth} />)}</View>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Detalle de los KPI</Text><Text style={styles.sectionNote}>Metas y resultados</Text></View>
          <View style={styles.detailsRow}>{kpis.map((k, idx) => <KpiCard key={k.kpi || idx} kpi={k} width={detailWidth} />)}</View>
        </>
      ) : (
        <Card><Text style={styles.sectionNote}>Aún no hay indicadores disponibles para esta selección.</Text></Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, padding: 28, borderRadius: radius.lg, marginBottom: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  heroText: { flex: 1, minWidth: 210 },
  eyebrow: { color: colors.primarySoft, letterSpacing: 2, fontFamily: fonts.bodyBold, fontSize: 10, marginBottom: 9 },
  hello: { color: colors.white, fontFamily: fonts.title, fontSize: 31 },
  subline: { color: '#D4E4F0', fontFamily: fonts.body, fontSize: 13, marginTop: 6, lineHeight: 20 },
  heroBadge: { backgroundColor: '#215575', borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBadgeText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 11 },
  selector: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 20, zIndex: 2 },
  selectorTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
  selectorHint: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, marginTop: 5 },
  selectArea: { minWidth: 205, flexGrow: 1, maxWidth: 350, position: 'relative' },
  selectBtn: { borderWidth: 1, borderColor: colors.primarySoft, borderRadius: radius.md, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.surface },
  selectText: { flex: 1, fontFamily: fonts.bodyBold, color: colors.primary, fontSize: 13 },
  options: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, zIndex: 9, elevation: 10, boxShadow: '0 6px 18px rgba(11,60,93,0.18)' },
  option: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  optionText: { color: colors.primary, fontFamily: fonts.body, fontSize: 13 },
  sectionHead: { marginTop: 7, marginBottom: 13, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 9 },
  sectionTitle: { fontFamily: fonts.title, fontSize: 25, color: colors.primary },
  sectionNote: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: '1.5%', rowGap: 12, marginBottom: 27 },
  metric: { minWidth: 145, flexGrow: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 18, minHeight: 168 },
  metricIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 13 },
  metricValue: { fontFamily: fonts.bodyBold, color: colors.primary, fontSize: 24 },
  metricLabel: { fontFamily: fonts.bodyBold, color: colors.primary, fontSize: 12, marginTop: 5 },
  metricDetail: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 11, marginTop: 5, lineHeight: 16 },
  detailsRow: { flexDirection: 'row', gap: '2.4%', flexWrap: 'wrap' },
  detailCard: { minWidth: 230, flexGrow: 1, padding: 20 },
  detailHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  detailTitle: { fontFamily: fonts.serif, fontSize: 19, color: colors.primary, flexGrow: 1 },
  progressTrack: { height: 7, backgroundColor: colors.surfaceAlt, borderRadius: 9, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 9 },
});
