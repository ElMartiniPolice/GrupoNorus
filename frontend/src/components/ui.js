/**
 * ui.js — Componentes compartidos con la identidad NORUS.
 * Manual de Marca: #0B3C5D / #328CC1 / #B3CDE0 / #ECECEC / #FFC858 / #F25F5C.
 * Tipografías: Cormorant SC (títulos), EB Garamond (serif), Lato (cuerpo).
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Easing,
} from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';
import { BRAND_NAME, BRAND_TAGLINE } from '../config';
import { apiErrorMessage } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

// Card elevation levels — layered depth system
const CARD_ELEVATION = {
  level1: {  // Default list cards
    boxShadow: '0 2px 10px rgba(11, 60, 93, 0.06)',
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  level2: {  // Detail screens, modals
    boxShadow: '0 4px 16px rgba(11, 60, 93, 0.1)',
    elevation: 4,
    borderWidth: 0,
  },
  level3: {  // Floating actions, bottom sheets
    boxShadow: '0 8px 24px rgba(11, 60, 93, 0.15)',
    elevation: 8,
    borderWidth: 0,
  },
};

/** Contenedor base de pantalla (fondo gris claro del manual). */
export function Screen({ children, scroll = true, style, contentStyle, refreshing, onRefresh }) {
  if (!scroll) {
    return <View style={[styles.screen, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={[styles.content, contentStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Wordmark NORUS APARTMENTS (Cormorant SC + Lato con tracking dorado). */
export function BrandMark({ size = 34, light = false, style, logo = false }) {
  return (
    <View style={[styles.brandWrap, style]}>
      {logo && !light ? (
        <Image source={require('../../assets/norus-logo.png')} resizeMode="contain" style={{ width: size * 4.3, height: size * 1.35 }} accessibilityLabel="Logo Norus" />
      ) : (
      <Text
        style={[styles.brandName, { fontSize: size, color: light ? colors.white : colors.primary }]}
      >
        {BRAND_NAME}
      </Text>)}
      <Text style={[styles.brandTag, logo && !light && { color: colors.primaryLight }]}>{BRAND_TAGLINE}</Text>
    </View>
  );
}

/** Tarjeta blanca con esquinas suaves (superficie del manual). 
 *  elevationLevel: 'level1' (default list), 'level2' (detail/modal), 'level3' (floating)
 */
export function Card({ children, style, onPress, elevationLevel = 'level1' }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.card, CARD_ELEVATION[elevationLevel], style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
    >
      {children}
    </Wrapper>
  );
}

/** Píldora de estado/severidad/prioridad con color del theme. */
export function Badge({ label, color = colors.textMuted }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${color}1E`, borderColor: `${color}55`, boxShadow: 'none' },
      ]}
    >
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const BTN_VARIANTS = {
  primary: {
    btn: { backgroundColor: colors.primary },
    text: { color: colors.white },
    spinner: colors.white,
  },
  secondary: {
    btn: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary },
    text: { color: colors.primary },
    spinner: colors.primary,
  },
  gold: {
    btn: { backgroundColor: colors.gold },
    text: { color: colors.primary },
    spinner: colors.primary,
  },
  danger: {
    btn: { backgroundColor: colors.coral },
    text: { color: colors.white },
    spinner: colors.white,
  },
  ghost: {
    btn: { backgroundColor: 'transparent' },
    text: { color: colors.primaryLight },
    spinner: colors.primaryLight,
  },
};

// useNativeDriver no está soportado en web
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** Botón con variantes de marca y animación de press táctil. */
export function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const v = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  const scale = useRef(new Animated.Value(1)).current;
  const PRESS_SCALE = 0.97;
  const USE_NATIVE_DRIVER = Platform.OS !== 'web';

  const onPressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scale, {
        toValue: PRESS_SCALE,
        tension: 300,
        friction: 20,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  };

  const onPressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(scale, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  };

  const animatedStyle = {
    transform: [{ scale }],
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.btn, v.btn, (disabled || loading) && styles.btnDisabled, style]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={1} // We handle opacity via scale
      >
        {loading ? (
          <ActivityIndicator color={v.spinner} />
        ) : (
          <Text style={[styles.btnText, v.text]}>{title.toUpperCase()}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Campo con etiqueta y error, estilo Lato sobre blanco. Con focus ring animado. */
export function Input({ label, error, style, light = false, ...props }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const borderColor = error
    ? colors.coral
    : focused
      ? colors.primaryLight
      : colors.border;

  const borderWidth = error || focused ? 1.5 : 1;

  const shadowStyle = focused && !error
      ? {
      boxShadow: `0 0 8px ${colors.primaryLight}`,
      elevation: 3,
    }
      : error
    ? {
        boxShadow: `0 0 8px ${colors.coral}`,
        elevation: 2,
      }
    : {};

  return (
    <View style={[styles.inputWrap, style]}>
      {label ? (
        <Text style={[styles.inputLabel, light && { color: colors.white }]}>{label}</Text>
      ) : null}
      <Animated.View
        style={[
          styles.input,
          { borderColor, borderWidth, ...shadowStyle },
        ]}
      >
        <TextInput
          style={{ flex: 1, fontSize: 15, color: colors.text, fontFamily: fonts.body }}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </Animated.View>
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

/** Selector de chips (una opción activa a la vez). Con animación de press táctil. */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  keyBy = 'id',
  labelKey = 'nombre',
  plain = false,
}) {
  const chipScales = useRef(
    (options || []).map(() => new Animated.Value(1))
  ).current;

  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={styles.chipRow}>
        {(options || []).map((opt, index) => {
          let val, text, key;
          if (plain) {
            if (typeof opt === 'object' && opt !== null) {
              val = opt.id ?? opt.value ?? opt;
              text = opt.nombre ?? opt.name ?? opt.label ?? opt.title ?? String(opt);
            } else {
              val = opt;
              text = String(opt);
            }
            key = `plain-${index}`;
          } else {
            val = opt[keyBy];
            text = opt[labelKey];
            key = String(val);
          }
          const active = String(val) === String(value);
          const scale = chipScales[index] || new Animated.Value(1);

          const onPressIn = () => {
            Animated.spring(scale, {
              toValue: 0.94,
              tension: 300,
              friction: 20,
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start();
          };

          const onPressOut = () => {
            Animated.spring(scale, {
              toValue: 1,
              tension: 300,
              friction: 20,
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start();
          };

          return (
            <Animated.View
              key={key}
              style={{
                transform: [{ scale }],
              }}
            >
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChange(val)}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                activeOpacity={1}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/** Título de sección en Cormorant SC. */
export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

/** Fila etiqueta–valor para pantallas de detalle. Con divider sutil opcional. */
export function Row({ label, value, showDivider = true }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value === null || value === undefined || value === '' ? '—' : String(value)}</Text>
    </View>
  );
}

export function RowWithDivider({ label, value, showDivider = true }) {
  return (
    <>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value === null || value === undefined || value === '' ? '—' : String(value)}</Text>
      </View>
      {showDivider && <View style={styles.rowDivider} />}
    </>
  );
}

export function EmptyState({ message = 'Sin registros por ahora.', icon = '✦' }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function Loading({ label = 'Cargando…' }) {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/** Campana con badge de no leídas (CP-ALE-01). Va en el header. */
export function NotificationBell() {
  const { unreadCount, markAllRead } = useNotifications();
  return (
    <TouchableOpacity style={styles.bell} onPress={markAllRead} activeOpacity={0.7}>
      <Text style={styles.bellIcon}>🔔</Text>
      {unreadCount > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Manejo uniforme de errores de API en pantallas:
 * si la sesión expiró (api.js marcó sessionExpired) cierra sesión;
 * en otro caso devuelve el mensaje legible del backend.
 */
export function makeErrorHandler(logout) {
  return (e) => {
    if (e?.sessionExpired) {
      logout();
      return null;
    }
    return apiErrorMessage(e);
  };
}

/** Fecha/hora legible en es-CL; tolera valores vacíos. */
export function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.xl + 16,
    width: '100%',
    maxWidth: 1160,
    alignSelf: 'center',
  },
  brandWrap: { alignItems: 'center' },
  brandName: { fontFamily: fonts.title, letterSpacing: 4 },
  brandTag: {
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 6,
    color: colors.gold,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5 },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.15 },
  inputWrap: { marginBottom: spacing.md },
  inputLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.body,
  },
  inputError: { color: colors.coral, fontSize: 12, marginTop: 4, fontFamily: fonts.body },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, rowGap: spacing.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.white,
    minWidth: 72,
  },
  chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      boxShadow: '0 2px 8px rgba(11, 60, 93, 0.2)',
      elevation: 3,
    },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  chipTextActive: { color: colors.white },
  sectionTitle: {
    fontFamily: fonts.title,
    fontSize: 24,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: -spacing.lg,
    opacity: 0.5,
  },
  rowLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, flex: 1 },
  rowValue: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    flex: 1.4,
    textAlign: 'right',
  },
  empty: { alignItems: 'center', padding: spacing.xl * 1.5 },
  emptyIcon: { fontSize: 40, color: colors.primarySoft, marginBottom: spacing.md, opacity: 0.7, boxShadow: 'none' },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { fontFamily: fonts.body, color: colors.textMuted, marginTop: spacing.sm },
  errorBanner: {
    backgroundColor: `${colors.coral}14`,
    borderWidth: 1,
    borderColor: `${colors.coral}33`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.coral, fontFamily: fonts.body, fontSize: 13 },
  bell: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginRight: spacing.xs },
  bellIcon: { fontSize: 20 },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 2,
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    minWidth: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  bellBadgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.bodyBold },
});
