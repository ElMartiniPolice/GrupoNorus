/**
 * PerfilScreen — Perfil del usuario autenticado (solo lectura para no-admins).
 * Permite ver datos personales y cambiar contraseña.
 */
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { colors, fonts, spacing, radius } from '../../theme';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Input,
  Loading,
  Row,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';
import { formatearRut } from '../../utils/rut';

export default function PerfilScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);
  const onError = makeErrorHandler(logout);

  const handleCambiarPassword = async () => {
    setError('');
    if (!passwordActual.trim()) return setError('Ingrese su contraseña actual.');
    if (!passwordNueva.trim()) return setError('Ingrese la nueva contraseña.');
    if (passwordNueva.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
    if (passwordNueva !== passwordConfirmar) return setError('Las contraseñas no coinciden.');

    setCambiandoPassword(true);
    try {
      await userService.cambiarPassword(passwordActual, passwordNueva);
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirmar('');
      setMostrarCambioPassword(false);
      Alert.alert('Éxito', 'Contraseña actualizada correctamente.');
    } catch (e) {
      setError(onError(e) || 'Error al cambiar la contraseña.');
    } finally {
      setCambiandoPassword(false);
    }
  };

  const rutFormateado = user?.rut ? formatearRut(user.rut) : '—';

  return (
    <Screen>
      <SectionTitle>Mi Perfil</SectionTitle>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <Row label="Nombre" value={`${user?.nombre || ''} ${user?.apellido || ''}`} />
        <Row label="RUT" value={rutFormateado} />
        <Row label="Teléfono" value={user?.telefono || '—'} />
        <Row label="Rol" value={user?.rol_nombre || '—'} />
        <Row label="Área" value={user?.area_nombre || '—'} />
        <Row label="Estado" value={user?.is_active ? 'Activo' : 'Inactivo'} />
      </Card>

      <SectionTitle style={{ marginTop: spacing.lg }}>Seguridad</SectionTitle>

      {!mostrarCambioPassword ? (
        <Button
          title="Cambiar contraseña"
          variant="secondary"
          onPress={() => setMostrarCambioPassword(true)}
        />
      ) : (
        <Card>
          <Input
            label="Contraseña actual"
            placeholder="••••••••"
            secureTextEntry
            value={passwordActual}
            onChangeText={setPasswordActual}
          />
          <Input
            label="Nueva contraseña"
            placeholder="••••••••"
            secureTextEntry
            value={passwordNueva}
            onChangeText={setPasswordNueva}
          />
          <Input
            label="Confirmar nueva contraseña"
            placeholder="••••••••"
            secureTextEntry
            value={passwordConfirmar}
            onChangeText={setPasswordConfirmar}
          />
          <Button
            title="Guardar cambios"
            onPress={handleCambiarPassword}
            loading={cambiandoPassword}
            disabled={cambiandoPassword}
          />
          <Button
            title="Cancelar"
            variant="ghost"
            onPress={() => {
              setMostrarCambioPassword(false);
              setPasswordActual('');
              setPasswordNueva('');
              setPasswordConfirmar('');
              setError('');
            }}
            disabled={cambiandoPassword}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      )}

      <SectionTitle style={{ marginTop: spacing.lg }}>Sesión</SectionTitle>
      <Button
        title="Cerrar sesión"
        variant="danger"
        onPress={logout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({});