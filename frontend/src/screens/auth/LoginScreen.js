/**
 * LoginScreen — CU4: Autenticación por RUT + contraseña (CP-AUT-01).
 * 401 → "Credenciales inválidas." | 423 → cuenta bloqueada (mensajes del backend).
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { formatearRut, normalizarRut, validarRut } from '../../utils/rut';
import { colors, fonts, spacing, radius } from '../../theme';
import { BrandMark, Button, ErrorBanner, Input } from '../../components/ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!validarRut(rut)) {
      setError('RUT inválido. Revíselo e intente nuevamente.');
      return;
    }
    if (!password) {
      setError('Ingrese su contraseña.');
      return;
    }
    setLoading(true);
    const res = await login(normalizarRut(rut), password);
    if (!res.ok) setError(res.message || 'Credenciales inválidas.');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.bg}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandArea}>
        <BrandMark size={44} light />
        <Text style={styles.subtitle}>Gestión hotelera en tiempo real</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Iniciar sesión</Text>
        <Input
          label="RUT"
          placeholder="12.345.678-9"
          autoCapitalize="characters"
          value={rut}
          onChangeText={(t) => setRut(formatearRut(t))}
        />
        <Input
          label="Contraseña"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <ErrorBanner message={error} /> : null}
        <Button title="Ingresar" onPress={submit} loading={loading} disabled={loading} />
        <Text style={styles.hint}>Use el RUT asignado por administración.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.primary },
  brandArea: { alignItems: 'center', paddingTop: 80, paddingBottom: spacing.xl },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.primarySoft,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardTitle: {
    fontFamily: fonts.title,
    fontSize: 24,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
