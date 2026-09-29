/**
 * ui.js — Componentes compartidos con la identidad NORUS.
 * Manual de Marca: #0B3C5D / #328CC1 / #B3CDE0 / #ECECEC / #FFC858 / #F25F5C.
 * Tipografías: Cormorant SC (títulos), Lato (cuerpo y UI).
 */
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';
import { BRAND_NAME, BRAND_TAGLINE } from '../config';
import { apiErrorMessage } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

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
export function BrandMark({ size = 34, light = false, style }) {
  return (
    <View style={[styles.brandWrap, style]}>
      <Text
        style={[styles.brandName, { fontSize: size, color: light ? colors.white : colors.primary }]}
      >
        {BRAND_NAME}
      </Text>
      <Text style={styles.brandTag}>{BRAND_TAGLINE}</Text>
    </View>
  );
}

/** Tarjeta blanca con esquinas suaves (superficie del manual). */
export function Card({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {children}
    </Wrapper>
  );
}

/** Botón flotante de acción (FAB) dorado del manual. */
export function Fab({ onPress, label = 'Agregar' }) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.fabText}>+</Text>
    </TouchableOpacity>
  );
}

/** Píldora de estado/severidad/prioridad con color del theme. */
export function Badge({ label, color = colors.textMuted }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${color}1E`, borderColor: `${color}55` },
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

/** Botón con variantes de marca. */
export function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const v = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  return (
    <TouchableOpacity
      style={[styles.btn, v.btn, (disabled || loading) && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <Text style={[styles.btnText, v.text]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

/** Campo con etiqueta y error, estilo Lato sobre blanco. */
export function Input({ label, error, style, ...props }) {
  const a11yLabel = error ? [label, error].filter(Boolean).join('. ') : label;
  return (
    <View style={[styles.inputWrap, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        accessibilityLabel={a11yLabel}
        {...props}
      />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

/** Selector de chips (una opción activa a la vez). */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  keyBy = 'id',
  labelKey = 'nombre',
  plain = false,
}) {
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={styles.chipRow}>
        {(options || []).map((opt) => {
          const val = plain ? opt : opt[keyBy];
          const text = plain ? opt : opt[labelKey];
          const active = String(val) === String(value);
          return (
            <TouchableOpacity
              key={String(val)}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(val)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/** Título de sección en Cormorant SC. */
export function SectionTitle({ children, style }) {
  return (
    <Text style={[styles.sectionTitle, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Fila etiqueta–valor para pantallas de detalle. */
export function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value === null || value === undefined || value === '' ? '—' : String(value)}</Text>
    </View>
  );
}

export function EmptyState({ message = 'Sin registros por ahora.', icon = '✦' }) {
  return (
    <View style={styles.empty}>
      <Text
        style={styles.emptyIcon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {icon}
      </Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function Loading({ label = 'Cargando…' }) {
  return (
    <View style={styles.loadingWrap} accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/** Campana con badge de no leídas (CP-ALE-01). Va en el header. */
export function NotificationBell() {
  const { unreadCount, markAllRead } = useNotifications();
  return (
    <TouchableOpacity
      style={styles.bell}
      onPress={markAllRead}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'
      }
      accessibilityHint="Marca todas las notificaciones como leídas"
    >
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
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
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
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { fontSize: 30, color: colors.primary, fontFamily: fonts.bodyBold },
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
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 0.5 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  chipTextActive: { color: colors.white },
  sectionTitle: {
    fontFamily: fonts.title,
    fontSize: 22,
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, flex: 1 },
  rowValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
    flex: 1.4,
    textAlign: 'right',
  },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 34, color: colors.primarySoft, marginBottom: spacing.sm },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted, textAlign: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { fontFamily: fonts.body, color: colors.textMuted, marginTop: spacing.sm },
  errorBanner: {
    backgroundColor: `${colors.coral}1A`,
    borderWidth: 1,
    borderColor: `${colors.coral}55`,
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
