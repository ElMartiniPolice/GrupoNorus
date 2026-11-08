/**
 * UsuarioFormScreen — CP-USR-01: Crear/editar usuarios con diseño moderno NORUS.
 * Formulario centrado y acotado para evitar componentes excesivamente anchos en Web.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { cleanRut, formatearRut, normalizarRut, validarRut } from '../../utils/rut';
import { colors, fonts, spacing, radius } from '../../theme';
import {
  Button,
  Card,
  ChipSelect,
  ErrorBanner,
  Input,
  Loading,
  Screen,
  makeErrorHandler,
} from '../../components/ui';

export default function UsuarioFormScreen({ route, navigation }) {
  const { id } = route.params || {};
  const esEditar = Boolean(id);
  const { logout } = useAuth();

  const [rut, setRut] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState(null);
  const [area, setArea] = useState(null);
  const [password, setPassword] = useState('');
  const [activo, setActivo] = useState(true);
  const [roles, setRoles] = useState([]);
  const [areas, setAreas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  useEffect(() => {
    (async () => {
      try {
        const [rs, as] = await Promise.all([
          userService.roles().catch(() => []),
          userService.areas().catch(() => []),
        ]);
        setRoles(Array.isArray(rs) ? rs : []);
        setAreas(Array.isArray(as) ? as : []);
        if (esEditar) {
          const u = await userService.get(id);
          setRut(u.rut ? formatearRut(u.rut) : '');
          setNombre(u.nombre ?? '');
          setApellido(u.apellido ?? '');
          setTelefono(u.telefono ?? '');
          setRol(u.rol ?? null);
          setArea(u.area ?? null);
          setActivo(u.is_active !== false);
        }
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      } finally {
        setCargando(false);
      }
    })();
  }, [esEditar, id, onError]);

  const guardar = async () => {
    setError('');
    if (!validarRut(rut)) return setError('RUT inválido. Revíselo e intente nuevamente.');
    if (!nombre.trim()) return setError('Ingrese el nombre.');
    if (!rol) return setError('Seleccione un rol.');
    if (!area) return setError('Seleccione un área.');
    if (password && password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (!esEditar && !password) {
      return setError('Ingrese una contraseña para el nuevo usuario.');
    }

    setSaving(true);
    const payload = {
      rut: normalizarRut(rut),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      rol,
      area,
      is_active: activo,
    };
    if (password) payload.password = password;

    try {
      if (esEditar) {
        await userService.update(id, payload);
      } else {
        await userService.create(payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = () => {
    Alert.alert(
      'Desactivar usuario',
      `¿Desea dar de baja la cuenta de ${nombre}? No podrá ingresar al sistema.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await userService.remove(id);
              navigation.goBack();
            } catch (e) {
              setError(onError(e) || '');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (cargando) return <Loading label="Cargando datos…" />;

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text style={styles.overline}>ADMINISTRACIÓN / USUARIO</Text>
          <Text style={styles.title}>{esEditar ? 'Editar usuario' : 'Nuevo usuario'}</Text>
          <Text style={styles.description}>
            {esEditar
              ? 'Modifica los permisos, rol o datos personales de la cuenta.'
              : 'Ingresa los datos para registrar un nuevo integrante del equipo.'}
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <Card elevationLevel="level2" style={styles.card}>
          <Input
            label="RUT"
            placeholder="12.345.678-9"
            autoCapitalize="characters"
            value={rut}
            onChangeText={(t) => setRut(formatearRut(t))}
            editable={!esEditar}
          />
          <Input
            label="Nombre"
            placeholder="Ej: Carlos"
            value={nombre}
            onChangeText={setNombre}
          />
          <Input
            label="Apellido"
            placeholder="Ej: Pérez"
            value={apellido}
            onChangeText={setApellido}
          />
          <Input
            label="Teléfono de contacto"
            placeholder="+56 9 1234 5678"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />
          <ChipSelect
            label="Rol en el hotel"
            options={roles}
            value={rol}
            onChange={setRol}
            keyBy="id"
            labelKey="nombre"
          />
          <ChipSelect
            label="Área de desempeño"
            options={areas}
            value={area}
            onChange={setArea}
            keyBy="id"
            labelKey="nombre"
          />
          <Input
            label={esEditar ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
            placeholder={esEditar ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <ChipSelect
            label="Estado de la cuenta"
            options={[
              { id: 'activo', nombre: 'Activo' },
              { id: 'inactivo', nombre: 'Inactivo / Bloqueado' },
            ]}
            value={activo ? 'activo' : 'inactivo'}
            onChange={(v) => setActivo(v === 'activo')}
            keyBy="id"
            labelKey="nombre"
          />

          <Button
            title={esEditar ? 'Guardar cambios' : 'Crear usuario'}
            onPress={guardar}
            loading={saving}
            disabled={saving}
            style={{ marginTop: spacing.md }}
          />

          {esEditar ? (
            <Button
              title="Desactivar usuario"
              variant="danger"
              onPress={eliminar}
              disabled={saving}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
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
});
