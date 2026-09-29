/**
 * UsuariosScreen — CP-USR-01: Gestión de usuarios (solo ADMINISTRADOR).
 * Lista usuarios con filtro por rol; el FAB crea uno nuevo y cada tarjeta
 * abre el formulario de edición.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { colors, fonts, spacing, radius } from '../../theme';
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  Fab,
  Loading,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';
import { userLabel } from '../../utils/labels';
import { formatearRut } from '../../utils/rut';

export default function UsuariosScreen({ navigation }) {
  const { logout } = useAuth();
  const [usuarios, setUsuarios] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [rol, setRol] = useState('TODOS');
  const onError = makeErrorHandler(logout);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setUsuarios(null);
      setRefreshing(true);
      try {
        const [us, rs] = await Promise.all([
          userService.list(),
          userService.roles().catch(() => []),
        ]);
        setUsuarios(Array.isArray(us) ? us : []);
        setRoles(Array.isArray(rs) ? rs : []);
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

  // Refresco silencioso al volver al foco (p. ej. tras crear/editar un usuario).
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const visibles = (usuarios || []).filter((u) => rol === 'TODOS' || u.rol_nombre === rol);
  const rutTxt = (u) => (u.rut ? formatearRut(u.rut) || u.rut : '—');

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <SectionTitle>Usuarios</SectionTitle>

        <View style={styles.chips}>
          {['TODOS', ...roles.map((r) => r.nombre)].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, rol === r && styles.chipActive]}
              onPress={() => setRol(r)}
            >
              <Text style={[styles.chipText, rol === r && styles.chipTextActive]}>
                {r === 'TODOS' ? 'Todos' : r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <ErrorBanner message={error} /> : null}
        {!usuarios && !error ? <Loading label="Cargando usuarios…" /> : null}
        {usuarios && visibles.length === 0 && !error ? (
          <EmptyState message="No hay usuarios para mostrar." />
        ) : null}

        {visibles.map((u) => (
          <Card key={u.id} onPress={() => navigation.navigate('UsuarioForm', { id: u.id })}>
            <View style={styles.cardHead}>
              <Text style={styles.titulo}>{userLabel(u)}</Text>
              <Badge label={u.rol_nombre ?? '—'} color={colors.primaryLight} />
            </View>
            <Text style={styles.meta}>RUT: {rutTxt(u)}</Text>
            <View style={styles.cardFoot}>
              <Badge label={u.area_nombre ?? '—'} color={colors.primarySoft} />
              <Badge
                label={u.is_active ? 'Activo' : 'Inactivo'}
                color={u.is_active ? colors.primaryLight : colors.textMuted}
              />
            </View>
          </Card>
        ))}
      </Screen>

      <Fab label="Crear usuario" onPress={() => navigation.navigate('UsuarioForm')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  chipTextActive: {
    color: colors.white,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 6,
  },
  titulo: {
    fontFamily: fonts.title,
    fontSize: 17,
    color: colors.primary,
    flex: 1,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
