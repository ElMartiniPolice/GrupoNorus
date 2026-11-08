/**
 * CreateTaskScreen — CU2: Asignar tarea (ADMINISTRADOR/RECEPCION).
 * POST /tasks/tareas/ {titulo, descripcion, habitacion, asignado_a, prioridad, estado}.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { taskService, PRIORIDADES } from '../../services/taskService';
import { roomService } from '../../services/roomService';
import { userService } from '../../services/userService';
import { colors, fonts, spacing, radius } from '../../theme';
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
  const [tipoUbicacion, setTipoUbicacion] = useState('HABITACION');
  const [habitacion, setHabitacion] = useState(null);
  const [asignado, setAsignado] = useState(null);
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [habitaciones, setHabitaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroArea, setFiltroArea] = useState('TODAS');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  useEffect(() => {
    (async () => {
      try {
        const [h, u] = await Promise.all([roomService.list(), userService.list()]);
        setHabitaciones(Array.isArray(h) ? h : []);
        setUsuarios(
          (Array.isArray(u) ? u : []).map((x) => ({
            ...x,
            nombre_completo: [x.nombre, x.apellido].filter(Boolean).join(' ') || x.username,
          })),
        );
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const areas = ['TODAS', ...new Set(usuarios.map((u) => u.area_nombre).filter(Boolean))];
  const usuariosFiltrados =
    filtroArea === 'TODAS'
      ? usuarios
      : usuarios.filter((u) => u.area_nombre === filtroArea);

  const guardar = async () => {
    setError('');
    if (!titulo.trim()) return setError('Ingrese un título para la tarea.');
    if (tipoUbicacion === 'HABITACION' && !habitacion) {
      return setError('Seleccione una habitación o elija Área General.');
    }
    if (!asignado) return setError('Seleccione un responsable.');
    setSaving(true);
    try {
      await taskService.create({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        habitacion: tipoUbicacion === 'HABITACION' ? habitacion : null,
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

  const seleccionado = usuarios.find((u) => u.id === asignado);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text style={styles.overline}>TAREAS / ASIGNACIÓN</Text>
          <Text style={styles.title}>Nueva tarea</Text>
          <Text style={styles.description}>
            Asigna una tarea a un responsable según su área y disponibilidad.
          </Text>
        </View>
        {error ? <ErrorBanner message={error} /> : null}
        <Card elevationLevel="level2" style={styles.formCard}>
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
          label="Ubicación de la tarea"
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

        {tipoUbicacion === 'HABITACION' && (
          <ChipSelect
            label="Habitación"
            options={habitaciones}
            value={habitacion}
            onChange={setHabitacion}
            keyBy="id"
            labelKey="numero"
          />
        )}

        {/* ---- SELECTOR DE RESPONSABLE MEJORADO ---- */}
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Responsable</Text>

          {seleccionado ? (
            <View style={styles.seleccionadoCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.seleccionadoNombre}>
                  {seleccionado.nombre_completo}
                </Text>
                <Text style={styles.seleccionadoMeta}>
                  {seleccionado.rol_nombre || '—'} · {seleccionado.area_nombre || '—'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAsignado(null)}>
                <Text style={styles.cambiarBtn}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!seleccionado ? (
            <>
              <Text style={styles.filtroLabel}>Filtrar por área:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.areaScroll}>
                {areas.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[
                      styles.areaChip,
                      filtroArea === a && styles.areaChipActive,
                    ]}
                    onPress={() => setFiltroArea(a)}
                  >
                    <Text
                      style={[
                        styles.areaChipText,
                        filtroArea === a && styles.areaChipTextActive,
                      ]}
                    >
                      {a === 'TODAS' ? 'Todas las áreas' : a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {usuariosFiltrados.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay usuarios en esta área.
                </Text>
              ) : null}

              {usuariosFiltrados.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[
                    styles.userCard,
                    asignado === u.id && styles.userCardActive,
                  ]}
                  onPress={() => setAsignado(u.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userNombre}>{u.nombre_completo}</Text>
                    <View style={styles.userMetaRow}>
                      <View style={[styles.rolBadge, rolBadgeColor(u.rol_nombre)]}>
                        <Text style={styles.rolBadgeText}>{u.rol_nombre || '—'}</Text>
                      </View>
                      <Text style={styles.areaBadge}>{u.area_nombre || '—'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : null}
        </View>

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
    </View>
  </Screen>
  );
}

function rolBadgeColor(rol) {
  switch (rol) {
    case 'ADMINISTRADOR':
      return { backgroundColor: `${colors.primary}22`, borderColor: colors.primary };
    case 'RECEPCION':
      return { backgroundColor: `${colors.primaryLight}22`, borderColor: colors.primaryLight };
    case 'OPERARIO':
      return { backgroundColor: `${colors.gold}22`, borderColor: colors.gold };
    default:
      return { backgroundColor: `${colors.textMuted}22`, borderColor: colors.textMuted };
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  nota: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  inputWrap: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  filtroLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  areaScroll: {
    marginBottom: spacing.sm,
  },
  areaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  areaChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  areaChipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.primary,
  },
  areaChipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  userCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primaryLight}12`,
  },
  userNombre: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  rolBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  rolBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.text,
  },
  areaBadge: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  seleccionadoCard: {
    backgroundColor: `${colors.primaryLight}12`,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seleccionadoNombre: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primary,
  },
  seleccionadoMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  cambiarBtn: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryLight,
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
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
