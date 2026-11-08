/**
 * LoginScreen — Autenticación NORUS.
 * Lado izquierdo AZUL (#0B3C5D) con el logotipo de Norus.
 * Lado derecho BLANCO (#FFFFFF) con el formulario de inicio de sesión
 * y la frase exclusiva para colaboradores al pie del botón.
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { formatearRut, normalizarRut, validarRut } from '../../utils/rut';
import { colors, fonts, spacing, radius } from '../../theme';
import { Button, ErrorBanner, Input } from '../../components/ui';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 800;
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
    try {
      const res = await login(normalizarRut(rut), password);
      if (!res.ok) setError(res.message || 'Credenciales inválidas.');
    } catch (e) {
      setError('No fue posible iniciar sesión. Compruebe su conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.main} keyboardShouldPersistTaps="handled">
        <View style={[styles.shell, wide && styles.shellWide]}>
          {/* LADO IZQUIERDO: Fondo AZUL con el logo de Norus */}
          <View style={[styles.leftBrandPanel, wide && styles.leftBrandPanelWide]}>
            <Image
              source={require('../../../assets/norus-logo-white.png')}
              resizeMode="contain"
              style={styles.brandLogo}
              accessibilityLabel="Logo Norus Apartments"
            />
            <View style={styles.brandDivider} />
            <Text style={styles.brandTagline}>SISTEMA INTERNO DE GESTIÓN OPERATIVA</Text>
          </View>

          {/* LADO DERECHO: Fondo BLANCO con formulario de inicio de sesión */}
          <View style={styles.rightFormPanel}>
            <View style={styles.formInner}>
              <Text style={styles.formTitle}>Iniciar sesión</Text>
              <Text style={styles.formSubtitle}>
                Ingrese sus credenciales para acceder a la plataforma.
              </Text>

              <Input
                label="RUT"
                placeholder="12.345.678-9"
                autoCapitalize="characters"
                value={rut}
                onChangeText={(t) => setRut(formatearRut(t))}
                autoComplete="username"
              />
              <Input
                label="Contraseña"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoComplete="current-password"
              />

              {error ? <ErrorBanner message={error} /> : null}

              <Button
                title="Ingresar al sistema"
                variant="primary"
                onPress={submit}
                loading={loading}
                disabled={loading}
                style={{ marginTop: 8 }}
              />

              {/* Frase debajo del botón */}
              <View style={styles.colabContainer}>
                <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
                <Text style={styles.colabText}>Acceso exclusivo para colaboradores</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  main: {
    minHeight: '100%',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 10px 32px rgba(11,60,93,0.12)',
    elevation: 6,
  },
  shellWide: {
    flexDirection: 'row',
    minHeight: 490,
  },
  leftBrandPanel: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 34,
  },
  leftBrandPanelWide: {
    width: 360,
    padding: 40,
    justifyContent: 'center',
  },
  brandLogo: {
    width: 240,
    height: 110,
  },
  brandDivider: {
    width: 72,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
    marginTop: 20,
    marginBottom: 14,
  },
  brandTagline: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primarySoft,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  rightFormPanel: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 44,
  },
  formInner: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  formTitle: {
    fontFamily: fonts.title,
    color: colors.primary,
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  formSubtitle: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 26,
  },
  colabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  colabText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
});
