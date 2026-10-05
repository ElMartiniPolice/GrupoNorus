import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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

const REQUEST_TYPES = [
  { id: 'ACCESO', nombre: 'Acceso' },
  { id: 'RECTIFICACION', nombre: 'Rectificación' },
  { id: 'SUPRESION', nombre: 'Supresión' },
  { id: 'OPOSICION', nombre: 'Oposición' },
  { id: 'PORTABILIDAD', nombre: 'Portabilidad' },
];

const STATE_LABELS = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  RESUELTA: 'Resuelta',
  RECHAZADA: 'Rechazada',
};

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
  return (
    REQUEST_TYPES.find((item) => item.id === tipo)?.nombre ||
    String(tipo || '').replaceAll('_', ' ').toLowerCase()
  );
}

export default function PrivacyScreen({ navigation }) {
  const { user, logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  const [aviso, setAviso] = useState(null);
  const [consentimiento, setConsentimiento] = useState(null);
  const [pendiente, setPendiente] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [exportData, setExportData] = useState(null);
  const [tipo, setTipo] = useState('ACCESO');
  const [detalle, setDetalle] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(Boolean(silent));
      setError('');
      try {
        const [avisoRes, consentimientoRes, solicitudesRes] = await Promise.all([
          privacyService.getAviso(),
          privacyService.getConsentimientoActual(),
          privacyService.getMisSolicitudes(),
        ]);

        if (!avisoRes.ok) throw new Error(avisoRes.message);
        if (!consentimientoRes.ok) throw new Error(consentimientoRes.message);
        if (!solicitudesRes.ok) throw new Error(solicitudesRes.message);

        setAviso(avisoRes.data);
        setConsentimiento(consentimientoRes.data?.consentimiento ?? null);
        setPendiente(Boolean(consentimientoRes.data?.pendiente));
        setSolicitudes(Array.isArray(solicitudesRes.data) ? solicitudesRes.data : []);
      } catch (e) {
        const msg = onError(e) || 'No fue posible cargar la información de privacidad.';
        setError(msg);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [onError],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const crearSolicitud = async () => {
    if (!detalle.trim()) {
      setError('Describa la solicitud con un poco más de detalle.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await privacyService.crearSolicitud(tipo, detalle.trim());
      if (!res.ok) throw new Error(res.message);
      setDetalle('');
      await load(true);
    } catch (e) {
      setError(onError(e) || 'No fue posible registrar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const exportar = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await privacyService.exportarDatos();
      if (!res.ok) throw new Error(res.message);
      setExportData(res.data);
    } catch (e) {
      setError(onError(e) || 'No fue posible exportar los datos.');
    } finally {
      setSaving(false);
    }
  };

  const retirar = () => {
    Alert.alert(
      'Retirar consentimiento',
      'Si retiras el consentimiento, la aplicación volverá a solicitarlo para seguir usando el sistema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Retirar',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            setError('');
            try {
              const res = await privacyService.retirarConsentimiento();
              if (!res.ok) throw new Error(res.message);
              await load(true);
            } catch (e) {
              setError(onError(e) || 'No fue posible retirar el consentimiento.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <Loading label="Cargando privacidad…" />;
  }

  const isAdmin = user?.rol_nombre === 'ADMINISTRADOR';

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <SectionTitle>Privacidad y derechos</SectionTitle>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <Text style={styles.cardTitle}>{aviso?.titulo ?? 'Aviso de privacidad'}</Text>
        <Badge
          label={pendiente ? 'Consentimiento pendiente' : 'Consentimiento vigente'}
          color={pendiente ? colors.coral : colors.primaryLight}
        />
        <Text style={styles.cardText}>{aviso?.contenido}</Text>
        <Row label="Versión" value={aviso?.version} />
        <Row label="Vigente desde" value={formatFecha(aviso?.vigente_desde)} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Consentimiento actual</Text>
        <Row label="Estado" value={pendiente ? 'Pendiente' : 'Activo'} />
        <Row label="Aceptado" value={formatFecha(consentimiento?.aceptado_en)} />
        <Row label="Retirado" value={formatFecha(consentimiento?.retirado_en)} />
        <Button
          title="Retirar consentimiento"
          variant="danger"
          onPress={retirar}
          disabled={saving || pendiente}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Ejercer derechos</Text>
        <ChipSelect
          label="Tipo de solicitud"
          options={REQUEST_TYPES}
          value={tipo}
          onChange={setTipo}
          keyBy="id"
          labelKey="nombre"
        />
        <Input
          label="Detalle"
          placeholder="Explique qué necesita ejercer"
          value={detalle}
          onChangeText={setDetalle}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
        <Button
          title="Enviar solicitud"
          onPress={crearSolicitud}
          loading={saving}
          disabled={saving}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Exportar mis datos</Text>
        <Text style={styles.cardText}>
          Genera una copia estructurada de los datos personales registrados en la plataforma.
        </Text>
        <Button
          title="Exportar datos"
          variant="secondary"
          onPress={exportar}
          loading={saving}
          disabled={saving}
        />
        {exportData ? (
          <View style={styles.exportBlock}>
            <Text style={styles.exportTitle}>Resumen de exportación</Text>
            <Text style={styles.exportText}>
              Titular: {userLabel(exportData.titular)} · Tareas: {exportData.tareas?.length ?? 0}
              {'\n'}
              Incidencias: {exportData.incidencias?.length ?? 0} · Evidencias:{' '}
              {exportData.evidencias?.length ?? 0}
              {'\n'}
              Notificaciones: {exportData.notificaciones?.length ?? 0} · Consentimientos:{' '}
              {exportData.consentimientos?.length ?? 0}
              {'\n'}
              Solicitudes: {exportData.solicitudes_derechos?.length ?? 0}
            </Text>
          </View>
        ) : null}
      </Card>

      <SectionTitle>Mis solicitudes</SectionTitle>
      {solicitudes.length === 0 ? (
        <EmptyState message="Todavía no has ingresado solicitudes de derechos." />
      ) : (
        solicitudes.map((item) => (
          <Card key={item.id}>
            <View style={styles.rowHead}>
              <Text style={styles.cardTitle}>{requestTypeLabel(item.tipo)}</Text>
              <Badge label={STATE_LABELS[item.estado] ?? item.estado} color={stateColor(item.estado)} />
            </View>
            <Text style={styles.cardText}>{item.detalle}</Text>
            <Row label="Creada" value={formatFecha(item.creada_en)} />
            <Row label="Respuesta" value={item.respuesta || '—'} />
          </Card>
        ))
      )}

      {isAdmin ? (
        <Button
          title="Ir al panel de solicitudes"
          variant="ghost"
          onPress={() => navigation.navigate('AdminSolicitudes')}
          style={styles.adminButton}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontFamily: fonts.title,
    color: colors.primary,
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  cardText: {
    fontFamily: fonts.body,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  exportBlock: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: spacing.sm,
    backgroundColor: colors.surface,
  },
  exportTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  exportText: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    lineHeight: 20,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  adminButton: {
    marginTop: spacing.md,
  },
});
