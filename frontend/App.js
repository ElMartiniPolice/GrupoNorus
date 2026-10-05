/**
 * App — Punto de entrada de la aplicación (expo/AppEntry.js → componente App).
 *
 * Carga las seis fuentes de la marca (Cormorant SC, EB Garamond, Lato),
 * monta la cadena de providers (SafeArea → Auth → Notificaciones) y el
 * NavigationContainer. Sin sesión activa muestra LoginScreen (CU4); con
 * sesión valida el consentimiento de privacidad antes de entrar al app shell.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  CormorantSC_700Bold,
  CormorantSC_600SemiBold,
} from '@expo-google-fonts/cormorant-sc';
import {
  EBGaramond_600SemiBold,
  EBGaramond_400Regular,
} from '@expo-google-fonts/eb-garamond';
import {
  Lato_400Regular,
  Lato_700Bold,
} from '@expo-google-fonts/lato';

import { colors } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import LoginScreen from './src/screens/auth/LoginScreen';
import AppNavigator from './src/navigation';
import ConsentScreen from './src/screens/privacy/ConsentScreen';
import { privacyService } from './src/services/privacyService';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.surface,
    card: colors.white,
    text: colors.text,
    border: colors.border,
    notification: colors.coral,
  },
};

function Root() {
  // Las fuentes se registran bajo su nombre real (shorthand ES6) para que
  // coincidan exactamente con los strings de fontFamily definidos en
  // src/theme/index.js. Nunca usar claves como 'serif': son familias
  // genéricas de CSS y el navegador las rechaza en new FontFace(),
  // dejando useFonts sin resolver (splash eterno en web).
  const [fontsLoaded, fontError] = useFonts({
    CormorantSC_700Bold,
    CormorantSC_600SemiBold,
    EBGaramond_600SemiBold,
    EBGaramond_400Regular,
    Lato_400Regular,
    Lato_700Bold,
  });
  const { user, initializing, logout } = useAuth();
  const [consentState, setConsentState] = useState({
    loading: false,
    pending: false,
    aviso: null,
    error: '',
  });
  const [accepting, setAccepting] = useState(false);

  // Degradación elegante: si una fuente falla, se continúa con las fuentes
  // del sistema en lugar de quedar atrapados en la pantalla de carga.
  const fontsReady = fontsLoaded || fontError;

  const refreshConsent = useCallback(async () => {
    setConsentState((current) => ({
      ...current,
      loading: true,
      error: '',
    }));

    const result = await privacyService.getConsentimientoActual();
    if (result.ok) {
      setConsentState({
        loading: false,
        pending: Boolean(result.data?.pendiente),
        aviso: result.data?.aviso ?? null,
        error: '',
      });
      return;
    }

    setConsentState({
      loading: false,
      pending: true,
      aviso: null,
      error: result.message || 'No fue posible verificar el consentimiento.',
    });
  }, []);

  useEffect(() => {
    let active = true;

    if (!user) {
      setConsentState({
        loading: false,
        pending: false,
        aviso: null,
        error: '',
      });
      setAccepting(false);
      return undefined;
    }

    setConsentState((current) => ({
      ...current,
      loading: true,
      error: '',
    }));

    void (async () => {
      const result = await privacyService.getConsentimientoActual();
      if (!active) return;
      if (result.ok) {
        setConsentState({
          loading: false,
          pending: Boolean(result.data?.pendiente),
          aviso: result.data?.aviso ?? null,
          error: '',
        });
        return;
      }
      setConsentState({
        loading: false,
        pending: true,
        aviso: null,
        error: result.message || 'No fue posible verificar el consentimiento.',
      });
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const handleAcceptConsent = useCallback(async () => {
    setAccepting(true);
    setConsentState((current) => ({ ...current, error: '' }));
    const result = await privacyService.aceptarConsentimiento();
    setAccepting(false);

    if (result.ok) {
      setConsentState((current) => ({
        ...current,
        pending: false,
        aviso: result.data?.aviso ?? current.aviso,
        error: '',
      }));
      return;
    }

    setConsentState((current) => ({
      ...current,
      pending: true,
      error: result.message || 'No fue posible registrar el consentimiento.',
    }));
  }, []);

  const handleLogout = useCallback(() => {
    setConsentState({
      loading: false,
      pending: false,
      aviso: null,
      error: '',
    });
    logout();
  }, [logout]);

  // En caso de error cargando consentimiento, permitimos reintentar sin
  // volver a la pantalla de login.
  const handleRetryConsent = useCallback(() => {
    refreshConsent();
  }, [refreshConsent]);

  if (!fontsReady || initializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashBrand}>NORUS</Text>
        <Text style={styles.splashTag}>APARTMENTS</Text>
        <ActivityIndicator size="large" color={colors.gold} style={styles.splashSpinner} />
      </View>
    );
  }

  if (user && consentState.loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashBrand}>NORUS</Text>
        <Text style={styles.splashTag}>APARTMENTS</Text>
        <ActivityIndicator size="large" color={colors.gold} style={styles.splashSpinner} />
        <Text style={styles.splashText}>Verificando consentimiento de privacidad…</Text>
      </View>
    );
  }

  const showConsent = user && (consentState.pending || consentState.error);
  let content = <LoginScreen />;

  if (user) {
    content = showConsent ? (
      <ConsentScreen
        aviso={consentState.aviso}
        error={consentState.error}
        loading={consentState.loading}
        accepting={accepting}
        onAccept={handleAcceptConsent}
        onLogout={handleLogout}
        onRetry={handleRetryConsent}
      />
    ) : (
      <AppNavigator />
    );
  }

  return <NavigationContainer theme={navTheme}>{content}</NavigationContainer>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <Root />
        </NotificationProvider>
      </AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashBrand: {
    fontSize: 42,
    letterSpacing: 6,
    color: colors.white,
  },
  splashTag: {
    fontSize: 14,
    letterSpacing: 8,
    color: colors.gold,
    marginTop: 4,
  },
  splashSpinner: {
    marginTop: 32,
  },
  splashText: {
    marginTop: 14,
    color: colors.white,
    fontSize: 13,
    fontFamily: 'Lato_400Regular',
  },
});
