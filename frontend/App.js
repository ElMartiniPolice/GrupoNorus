/**
 * App — Punto de entrada de la aplicación (expo/AppEntry.js → componente App).
 *
 * Carga las seis fuentes de la marca (Cormorant SC, EB Garamond, Lato),
 * monta la cadena de providers (SafeArea → Auth → Notificaciones) y el
 * NavigationContainer. Sin sesión activa muestra LoginScreen (CU4); con
 * sesión muestra la navegación por rol (CP-DP-02).
 */
import React from 'react';
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
  const { user, initializing } = useAuth();

  // Degradación elegante: si una fuente falla, se continúa con las fuentes
  // del sistema en lugar de quedar atrapados en la pantalla de carga.
  const fontsReady = fontsLoaded || fontError;

  if (!fontsReady || initializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashBrand}>NORUS</Text>
        <Text style={styles.splashTag}>APARTMENTS</Text>
        <ActivityIndicator size="large" color={colors.gold} style={styles.splashSpinner} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <AppNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
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
});
