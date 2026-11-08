/**
 * PerfilScreen — Perfil del usuario autenticado con diseño moderno NORUS.
 * Permite ver datos personales, cambiar contraseña y política de privacidad.
 */
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { colors, fonts, spacing, radius } from '../../theme';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Input,
  Row,
  Screen,
  makeErrorHandler,
} from '../../components/ui';
import { formatearRut } from '../../utils/rut';

export default function PerfilScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const handleCambiarPassword = async () => {
    setError('');
    setMsg('');
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
      setMsg('Contraseña actualizada correctamente.');
    } catch (e) {
      setError(onError(e) || 'Error al cambiar la contraseña.');
    } finally {
      setCambiandoPassword(false);
    }
  };

  const rutFormateado = user?.rut ? formatearRut(user.rut) : '—';
  const nombreCompleto = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.username || 'Usuario';

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header Hero */}
        <View style={styles.intro}>
          <Text style={styles.overline}>MI CUENTA / PERFIL</Text>
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.description}>
            Información personal, rol institucional y gestión de credenciales.
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}
        {msg ? (
          <View style={styles.okBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primaryLight} />
            <Text style={styles.okText}>{msg}</Text>
          </View>
        ) : null}

        {/* Card Principal de Perfil */}
        <Card elevationLevel="level2" style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{nombreCompleto.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{nombreCompleto}</Text>
              <Text style={styles.profileRut}>RUT: {rutFormateado}</Text>
            </View>
            <Badge
              label={user?.is_active ? 'Activo' : 'Inactivo'}
              color={user?.is_active ? colors.primaryLight : colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <Row label="Rol en el sistema" value={user?.rol_nombre || '—'} />
          <Row label="Área asignada" value={user?.area_nombre || '—'} />
          <Row label="Teléfono de contacto" value={user?.telefono || '—'} />
          <Row label="Correo electrónico" value={user?.email || '—'} />
        </Card>

        {/* Sección de Seguridad / Contraseña */}
        <Card elevationLevel="level2" style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionHeadingTitle}>Seguridad y Credenciales</Text>
          </View>

          {!mostrarCambioPassword ? (
            <Button
              title="Cambiar mi contraseña"
              variant="secondary"
              onPress={() => setMostrarCambioPassword(true)}
            />
          ) : (
            <View style={styles.passwordForm}>
              <Input
                label="Contraseña actual"
                placeholder="Ingrese su contraseña actual"
                secureTextEntry
                value={passwordActual}
                onChangeText={setPasswordActual}
              />
              <Input
                label="Nueva contraseña"
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                value={passwordNueva}
                onChangeText={setPasswordNueva}
              />
              <Input
                label="Confirmar nueva contraseña"
                placeholder="Repita la nueva contraseña"
                secureTextEntry
                value={passwordConfirmar}
                onChangeText={setPasswordConfirmar}
              />
              <View style={styles.btnRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Actualizar contraseña"
                    onPress={handleCambiarPassword}
                    loading={cambiandoPassword}
                    disabled={cambiandoPassword}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Cancelar"
                    variant="ghost"
                    onPress={() => {
                      setMostrarCambioPassword(false);
                      setPasswordActual('');
                      setPasswordNueva('');
                      setPasswordConfirmar('');
                    }}
                    disabled={cambiandoPassword}
                  />
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Privacidad */}
        <Card elevationLevel="level2" style={styles.privacyCard}>
          <View style={styles.privacyHead}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryLight} />
            <Text style={styles.privacyTitle}>Privacidad de datos personales</Text>
          </View>
          <Text style={styles.privacyText}>
            Tus datos personales y de acceso se utilizan exclusivamente para la autenticación y gestión interna en la plataforma de Grupo Norus.
          </Text>
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
  okBanner: {
    backgroundColor: `${colors.primaryLight}18`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  okText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.primary,
  },
  profileName: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.primary,
  },
  profileRut: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeadingTitle: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.primary,
  },
  passwordForm: {
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  privacyCard: {
    backgroundColor: colors.surfaceBrand,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    marginBottom: spacing.xl,
  },
  privacyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  privacyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  privacyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
