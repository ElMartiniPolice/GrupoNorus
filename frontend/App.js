/**
 * App — Punto de entrada de la aplicación (expo/AppEntry.js → componente App).
 * Las fuentes de Google Fonts se cargan vía CSS en web/index.html para mejor rendimiento.
 * En nativo, useFonts las registra automáticamente.
 */
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
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
  const { user, initializing } = useAuth();

  // En web, las fuentes ya están cargadas vía CSS @font-face en web/index.html
  // En nativo, useFonts las registra. No bloqueamos el renderizado.
  if (Platform.OS !== 'web') {
    useFonts({
      'CormorantSC_700Bold': require('@expo-google-fonts/cormorant-sc/CormorantSC_700Bold.ttf'),
      'CormorantSC_600SemiBold': require('@expo-google-fonts/cormorant-sc/CormorantSC_600SemiBold.ttf'),
      'EBGaramond_600SemiBold': require('@expo-google-fonts/eb-garamond/EBGaramond_600SemiBold.ttf'),
      'EBGaramond_400Regular': require('@expo-google-fonts/eb-garamond/EBGaramond_400Regular.ttf'),
      'Lato_400Regular': require('@expo-google-fonts/lato/Lato_400Regular.ttf'),
      'Lato_700Bold': require('@expo-google-fonts/lato/Lato_700Bold.ttf'),
    });
  }

  if (initializing) {
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
