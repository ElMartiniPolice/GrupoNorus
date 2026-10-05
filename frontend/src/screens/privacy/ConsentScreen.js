import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../theme';
import { Badge, BrandMark, Button, Card, ErrorBanner, Loading, Screen } from '../../components/ui';

export default function ConsentScreen({
  aviso,
  error,
  loading = false,
  accepting = false,
  onAccept,
  onLogout,
  onRetry,
}) {
  if (loading && !aviso) {
    return <Loading label="Verificando aviso de privacidad…" />;
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandArea}>
          <BrandMark size={44} light />
          <Text style={styles.subtitle}>Aviso de privacidad y consentimiento informado</Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <Card style={styles.noticeCard}>
          <View style={styles.headingRow}>
            <Text style={styles.title}>{aviso?.titulo ?? 'Aviso de privacidad'}</Text>
            <Badge label={`V${aviso?.version ?? '—'}`} color={colors.primaryLight} />
          </View>
          <Text style={styles.meta}>
            Vigente desde{' '}
            {aviso?.vigente_desde ? new Date(aviso.vigente_desde).toLocaleDateString('es-CL') : '—'}
          </Text>
          <Text style={styles.body}>
            {aviso?.contenido ?? 'No fue posible cargar el contenido del aviso.'}
          </Text>
        </Card>

        <Card style={styles.noticeCard}>
          <Text style={styles.sectionTitle}>¿Por qué pedimos tu consentimiento?</Text>
          <Text style={styles.body}>
            La Ley N° 21.719 exige informar el tratamiento de datos personales,
            permitir su aceptación expresa y ofrecer mecanismos claros para
            ejercer derechos, retirar el consentimiento y revisar la trazabilidad.
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            title={accepting ? 'Aceptando…' : 'Aceptar aviso de privacidad'}
            onPress={onAccept}
            loading={accepting}
            disabled={accepting}
          />
          {onRetry ? (
            <Button
              title="Reintentar carga"
              variant="secondary"
              onPress={onRetry}
              style={styles.secondaryBtn}
            />
          ) : null}
          <Button title="Cerrar sesión" variant="ghost" onPress={onLogout} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  noticeCard: {
    marginBottom: spacing.md,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fonts.title,
    color: colors.primary,
    fontSize: 24,
  },
  meta: {
    fontFamily: fonts.body,
    color: colors.hint,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 22,
  },
  sectionTitle: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  secondaryBtn: {
    marginTop: spacing.xs,
  },
});
