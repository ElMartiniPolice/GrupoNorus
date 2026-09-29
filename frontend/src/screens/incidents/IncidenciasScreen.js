/**
 * IncidenciasScreen — CU8: Listado de incidencias reportadas.
 * Severidades masculinas: CRITICO / ALTO / MEDIO / BAJO (severityColor).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { incidentService, SEVERIDADES } from '../../services/incidentService';
import { colors, fonts, spacing, radius, severityColor } from '../../theme';
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  Fab,
  Loading,
  Screen,
  SectionTitle,
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

export default function IncidenciasScreen({ navigation }) {
  const { logout } = useAuth();
  const [incidencias, setIncidencias] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [severidad, setSeveridad] = useState('TODAS');
  const onError = makeErrorHandler(logout);

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

  // Refresco silencioso al volver al foco (p. ej. tras reportar una incidencia).
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const visibles = (incidencias || []).filter(
    (i) => severidad === 'TODAS' || i.severidad === severidad,
  );

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <SectionTitle>Incidencias</SectionTitle>
        <View style={styles.chips}>
          {['TODAS', ...SEVERIDADES].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, severidad === s && styles.chipActive]}
              onPress={() => setSeveridad(s)}
            >
              <Text style={[styles.chipText, severidad === s && styles.chipTextActive]}>
                {s === 'TODAS' ? 'Todas' : s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {error ? <ErrorBanner message={error} /> : null}
        {!incidencias && !error && <Loading label="Cargando incidencias…" />}
        {incidencias && visibles.length === 0 && !error && (
          <EmptyState message="No hay incidencias para mostrar." />
        )}
        {visibles.map((i) => (
          <Card key={i.id} onPress={() => navigation.navigate('IncidentDetail', { id: i.id })}>
            <View style={styles.cardHead}>
              <Text style={styles.titulo}>{i.titulo}</Text>
              <Badge label={i.severidad} color={severityColor[i.severidad] || colors.textMuted} />
            </View>
            <Text style={styles.meta}>
              Habitación: {habLabel(i.habitacion)} · {formatFecha(i.creada_en)}
            </Text>
            <View style={styles.cardFoot}>
              <Badge label={estadoLabel(estadoInc(i))} color={colors.primaryLight} />
              {slaText(i.severidad) ? (
                <Text style={styles.sla}>{slaText(i.severidad)}</Text>
              ) : null}
            </View>
          </Card>
        ))}
      </Screen>
      <Fab onPress={() => navigation.navigate('CreateIncident')} />
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
  sla: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, flex: 1, textAlign: 'right' },
});
