/**
 * CreateTaskScreen — CU2: Asignar tarea (ADMINISTRADOR/RECEPCION).
 * POST /tasks/tareas/ {titulo, descripcion, habitacion, asignado_a, prioridad, estado}.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { taskService, PRIORIDADES } from '../../services/taskService';
import { roomService } from '../../services/roomService';
import { userService } from '../../services/userService';
import { colors, fonts, spacing } from '../../theme';
import {
  Button,
  Card,
  ChipSelect,
  ErrorBanner,
  Input,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';

export default function CreateTaskScreen({ navigation }) {
  const { logout } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [habitacion, setHabitacion] = useState(null);
  const [asignado, setAsignado] = useState(null);
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [habitaciones, setHabitaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  useEffect(() => {
    (async () => {
      try {
        const [h, u] = await Promise.all([roomService.list(), userService.list()]);
        setHabitaciones(Array.isArray(h) ? h : []);
        setUsuarios(
          (Array.isArray(u) ? u : []).map((x) => ({
            ...x,
            nombre: [x.nombre, x.apellido].filter(Boolean).join(' '),
          })),
        );
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async () => {
    setError('');
    if (!titulo.trim()) return setError('Ingrese un título para la tarea.');
    if (!habitacion) return setError('Seleccione una habitación.');
    if (!asignado) return setError('Seleccione un responsable.');
    setSaving(true);
    try {
      await taskService.create({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        habitacion,
        asignado_a: asignado,
        prioridad,
        estado: 'PENDIENTE',
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
      <SectionTitle>Nueva tarea</SectionTitle>
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <Input
          label="Título"
          placeholder="Ej: Reparación de calefacción"
          value={titulo}
          onChangeText={setTitulo}
        />
        <Input
          label="Descripción"
          placeholder="Detalle del trabajo a realizar…"
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
          label="Responsable"
          options={usuarios}
          value={asignado}
          onChange={setAsignado}
          keyBy="id"
          labelKey="nombre"
        />
        <ChipSelect
          label="Prioridad"
          options={PRIORIDADES}
          value={prioridad}
          onChange={setPrioridad}
          plain
        />
        <Text style={styles.nota}>
          La tarea se creará en estado PENDIENTE y notificará al responsable.
        </Text>
        <Button title="Asignar tarea" onPress={guardar} loading={saving} disabled={saving} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nota: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
});
