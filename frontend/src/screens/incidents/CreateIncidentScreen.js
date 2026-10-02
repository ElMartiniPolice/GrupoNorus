/**
 * CreateIncidentScreen — CU8: Reportar incidencia.
 * POST /incidents/incidencias/ {titulo, descripcion, habitacion, severidad, requiere_evidencia}.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { incidentService, SEVERIDADES } from '../../services/incidentService';
import { roomService } from '../../services/roomService';
import { colors, fonts } from '../../theme';
import {
  Button,
  ChipSelect,
  ErrorBanner,
  Input,
  Screen,
  makeErrorHandler,
} from '../../components/ui';
import { slaText } from '../../utils/sla';

export default function CreateIncidentScreen({ navigation }) {
  const { logout } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [habitacion, setHabitacion] = useState(null);
  const [severidad, setSeveridad] = useState('MEDIO');
  const [requiereEvidencia, setRequiereEvidencia] = useState(false);
  const [habitaciones, setHabitaciones] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async () => {
    setError('');
    if (!titulo.trim()) return setError('Ingrese un título para la incidencia.');
    if (!habitacion) return setError('Seleccione la habitación afectada.');
    setSaving(true);
    try {
      await incidentService.create({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        habitacion,
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
      {error ? <ErrorBanner message={error} /> : null}
      <Input
        label="Título"
        placeholder="Ej: Fuga de agua en baño"
        value={titulo}
        onChangeText={setTitulo}
      />
      <Input
        label="Descripción"
        placeholder="Detalle de lo ocurrido…"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />
      <ChipSelect
        label="Habitación"
        options={habitaciones}
        value={habitacion}
        onChange={setHabitacion}
        keyBy="id"
        labelKey="numero"
      />
      <ChipSelect
        label="Severidad"
        options={SEVERIDADES}
        value={severidad}
        onChange={setSeveridad}
        plain
      />
      {slaText(severidad) ? <Text style={styles.sla}>{slaText(severidad)}</Text> : null}
      <ChipSelect
        label="Requiere evidencia fotográfica"
        options={[
          { id: 'si', nombre: 'Sí' },
          { id: 'no', nombre: 'No' },
        ]}
        value={requiereEvidencia ? 'si' : 'no'}
        onChange={(v) => setRequiereEvidencia(v === 'si')}
        keyBy="id"
        labelKey="nombre"
      />
      <Button title="Reportar incidencia" onPress={guardar} loading={saving} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sla: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
});
