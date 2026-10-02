/**
 * UsuarioFormScreen — CP-USR-01: Crear/editar usuarios (solo ADMINISTRADOR).
 * RUT validado con módulo 11; la contraseña es obligatoria al crear y
 * opcional al editar (sin cambio = se mantiene la actual).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { cleanRut, formatearRut, validarRut } from '../../utils/rut';
import { colors, fonts, spacing } from '../../theme';
import {
  Button,
  Card,
  ChipSelect,
  ErrorBanner,
  Input,
  Loading,
  Screen,
  SectionTitle,
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
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async () => {
    setError('');
    if (!validarRut(rut)) return setError('RUT inválido. Revíselo e intente nuevamente.');
    if (!nombre.trim()) return setError('Ingrese el nombre.');
    if (!rol) return setError('Seleccione un rol.');
    if (!area) return setError('Seleccione un área.');
    if (password && password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (!esEditar && password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }

    const payload = {
      rut: cleanRut(rut),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      rol,
      area,
      is_active: activo,
    };
    if (!esEditar || password) payload.password = password;

    setSaving(true);
    try {
      if (esEditar) await userService.update(id, payload);
      else await userService.create(payload);
      navigation.goBack();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = () => {
    Alert.alert(
      'Eliminar usuario',
      '¿Confirma eliminar este usuario? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
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

  if (cargando) return <Loading label="Cargando usuario…" />;

  return (
    <Screen>
      <SectionTitle>{esEditar ? 'Editar usuario' : 'Nuevo usuario'}</SectionTitle>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <Input
          label="RUT"
          placeholder="12.345.678-9"
          autoCapitalize="characters"
          value={rut}
          onChangeText={(t) => setRut(formatearRut(t))}
        />
        <Input label="Nombre" placeholder="María" value={nombre} onChangeText={setNombre} />
        <Input
          label="Apellido"
          placeholder="Pérez"
          value={apellido}
          onChangeText={setApellido}
        />
        <Input
          label="Teléfono"
          placeholder="+56 9 1234 5678"
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={setTelefono}
        />
        <ChipSelect
          label="Rol"
          options={roles}
          value={rol}
          onChange={setRol}
          keyBy="id"
          labelKey="nombre"
        />
        <ChipSelect
          label="Área"
          options={areas}
          value={area}
          onChange={setArea}
          keyBy="id"
          labelKey="nombre"
        />
        <Input
          label={esEditar ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <ChipSelect
          label="Activo"
          options={[
            { id: 'si', nombre: 'Sí' },
            { id: 'no', nombre: 'No' },
          ]}
          value={activo ? 'si' : 'no'}
          onChange={(v) => setActivo(v === 'si')}
          plain
        />
        <Button
          title={esEditar ? 'Guardar cambios' : 'Crear usuario'}
          onPress={guardar}
          loading={saving}
          disabled={saving}
        />
        {esEditar ? (
          <Button
            title="Eliminar usuario"
            variant="danger"
            onPress={eliminar}
            disabled={saving}
            style={styles.borrarBtn}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  borrarBtn: {
    marginTop: spacing.sm,
  },
});
