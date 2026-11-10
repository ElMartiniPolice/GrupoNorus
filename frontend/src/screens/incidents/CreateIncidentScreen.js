/**
 * CreateIncidentScreen — CU8: Reportar incidencia con diseño moderno NORUS.
 * POST /incidencias/incidencias/ {titulo, descripcion, habitacion, severidad, requiere_evidencia}.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { incidentService, SEVERIDADES } from '../../services/incidentService';
import { roomService } from '../../services/roomService';
import { colors, fonts, spacing, radius } from '../../theme';
import {
  Button,
  Card,
  ChipSelect,
  ErrorBanner,
  Input,
  Screen,
  makeErrorHandler,
} from '../../components/ui';
import { slaText } from '../../utils/sla';

export default function CreateIncidentScreen({ navigation, commonAreas = [] }) {
  const { logout } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoUbicacion, setTipoUbicacion] = useState('HABITACION');
  const [habitacion, setHabitacion] = useState(null);
  const [severidad, setSeveridad] = useState('MEDIO');
  const [requiereEvidencia, setRequiereEvidencia] = useState(false);
  const [habitaciones, setHabitaciones] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  useEffect(() => {
    (async () => {
      try {
        const h = await roomService.list();
        setHabitaciones(Array.isArray(h) ? h : []);
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      }
    })();
  }, [onError]);

  const guardar = async () => {
    setError('');
    if (!titulo.trim()) return setError('Ingrese un título para la incidencia.');
    if (tipoUbicacion === 'HABITACION' && !habitacion) {
      return setError('Seleccione la habitación afectada o elija Área General.');
    }
      if (tipoUbicacion === 'GENERAL' && !habitacion) {
        return setError('Seleccione el área común afectada.');
      }
      setSaving(true);
      try {
        await incidentService.create({
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          habitacion: tipoUbicacion === 'HABITACION' ? habitacion : null,
          severidad,
          requiere_evidencia: requiereEvidencia,
        });
        navigation.goBack();
      } catch (e) {
        setError(onError(e) || '');
      } finally {
        setSaving(false);
      }
    };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text style={styles.overline}>INCIDENCIAS / NUEVO REPORTE</Text>
          <Text style={styles.title}>Reportar incidencia</Text>
          <Text style={styles.description}>
            Registra un problema o falla para su pronta atención y seguimiento.
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <Card elevationLevel="level2" style={styles.card}>
        <Input
          label="Título de la incidencia"
          placeholder="Ej: Fuga de agua en lavamanos"
          value={titulo}
          onChangeText={setTitulo}
        />
        <Input
          label="Descripción detallada"
          placeholder="Explique lo ocurrido, ubicación exacta del problema…"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />
        <ChipSelect
          label="Ubicación de la incidencia"
          options={[
            { id: 'HABITACION', nombre: '🛏️ En una Habitación' },
            { id: 'GENERAL', nombre: '🏢 Área General / Instalaciones comunes' },
          ]}
          value={tipoUbicacion}
          onChange={(v) => {
            setTipoUbicacion(v);
            if (v === 'GENERAL') setHabitacion(null);
          }}
          keyBy="id"
          labelKey="nombre"
        />

                {tipoUbicacion === 'GENERAL' && commonAreas.length > 0 && (
                  <ChipSelect
                    label="Área común"
                    options={commonAreas}
                    value={habitacion}
                    onChange={setHabitacion}
                    keyBy="id"
                    labelKey="nombre"
                  />
                )}

                {tipoUbicacion === 'HABITACION' && (
          <ChipSelect
            label="Habitación afectada"
            options={habitaciones}
            value={habitacion}
            onChange={setHabitacion}
            keyBy="id"
            labelKey="numero"
          />
        )}
        <ChipSelect
          label="Severidad"
          options={SEVERIDADES}
          value={severidad}
          onChange={setSeveridad}
          plain
        />
        {slaText(severidad) ? (
          <View style={styles.slaBox}>
            <Text style={styles.slaText}>⏱ {slaText(severidad)}</Text>
          </View>
        ) : null}

        <ChipSelect
          label="¿Requiere evidencia fotográfica?"
          options={[
            { id: 'no', nombre: 'No obligatoria' },
            { id: 'si', nombre: 'Sí, requiere foto' },
          ]}
          value={requiereEvidencia ? 'si' : 'no'}
          onChange={(v) => setRequiereEvidencia(v === 'si')}
          keyBy="id"
          labelKey="nombre"
        />

        <Button
          title="Crear reporte de incidencia"
          onPress={guardar}
          loading={saving}
          disabled={saving}
          style={{ marginTop: spacing.md }}
        />
      </Card>
    </View>
  </Screen>
);
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  intro: { marginBottom: 20 },
  overline: {
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    color: colors.primaryLight,
    fontSize: 10,
    marginBottom: 5,
  },
  title: { color: colors.primary, fontFamily: fonts.title, fontSize: 32 },
  description: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 3 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slaBox: {
    backgroundColor: colors.surfaceBrand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  slaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.primary,
  },
});
