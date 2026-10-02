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
import { colors, fonts } from '../../theme';
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

      <View style={styles.sheet}>
        <Text style={styles.cardTitle}>Iniciar sesión</Text>
        <Text style={styles.hint}>Use el RUT asignado por administración.</Text>
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
        <View style={styles.buttonWrap}>
          <Button title="Ingresar" onPress={submit} loading={loading} disabled={loading} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.primary },
  brandArea: { alignItems: 'center', paddingTop: 34 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.primarySoft,
    marginTop: 10,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    marginTop: 26,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 22,
  },
  cardTitle: {
    fontFamily: fonts.title,
    fontSize: 19,
    color: colors.primary,
    marginBottom: 2,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.hint,
    marginBottom: 14,
  },
  buttonWrap: { marginTop: 'auto' },
});
