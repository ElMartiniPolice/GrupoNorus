/**
 * IncidenciaDetailScreen — Atender (POST .../atender/), Resolver (POST .../resolver/)
 * y evidencia fotográfica (multipart 'incidencia' + 'imagen', expo-image-picker).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { incidentService } from '../../services/incidentService';
import { evidenceService } from '../../services/evidenceService';
import { colors, fonts, spacing, radius, severityColor } from '../../theme';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Input,
  Loading,
  Row,
  Screen,
  SectionTitle,
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel, userLabel, estadoLabel } from '../../utils/labels';
import { slaText } from '../../utils/sla';
import { estadoInc } from './IncidenciasScreen';

function evidenciaUri(ev) {
  if (!ev) return null;
  if (typeof ev.imagen === 'string') return ev.imagen;
  if (ev.imagen && typeof ev.imagen === 'object') return ev.imagen.url ?? ev.imagen.image ?? null;
  return ev.archivo ?? ev.foto ?? null;
}

export default function IncidenciaDetailScreen({ route }) {
  const { id } = route.params;
  const { logout } = useAuth();
  const [inc, setInc] = useState(null);
  const [evidencias, setEvidencias] = useState([]);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const onError = makeErrorHandler(logout);

  const load = useCallback(async () => {
    try {
      const i = await incidentService.get(id);
      setInc(i);
      setError('');
      const ev = await evidenceService.porIncidencia(id).catch(() => []);
      setEvidencias(Array.isArray(ev) ? ev : []);
    } catch (e) {
      const m = onError(e);
      if (m) setError(m);
    }
  }, [id, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const atender = async () => {
    setBusy(true);
    setMsg('');
    try {
      await incidentService.atender(id);
      setMsg('Incidencia marcada como atendida.');
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  const resolver = async () => {
    setBusy(true);
    setMsg('');
    try {
      await incidentService.resolver(id, comentario.trim() ? { comentario: comentario.trim() } : {});
      setMsg('Incidencia resuelta.');
      setComentario('');
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  const subirEvidencia = async () => {
    setBusy(true);
    setMsg('');
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (r.canceled || !r.assets?.length) return;
      await evidenceService.subir(id, r.assets[0]);
      setMsg('Evidencia subida correctamente.');
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  if (!inc && !error) return <Loading label="Cargando incidencia…" />;

  const estado = inc ? estadoInc(inc) : '';
  const esOperario = true; // atender/resolver corresponde al personal interno

  return (
    <Screen>
      {error ? <ErrorBanner message={error} /> : null}
      {msg ? (
        <View style={styles.okBanner}>
          <Text style={styles.okText}>{msg}</Text>
        </View>
      ) : null}
      {inc && (
        <>
          <Card>
            <View style={styles.head}>
              <Text style={styles.titulo}>{inc.titulo}</Text>
              <Badge label={inc.severidad} color={severityColor[inc.severidad] || colors.textMuted} />
            </View>
            <Row label="Estado" value={estadoLabel(estado)} />
            <Row label="Habitación" value={habLabel(inc.habitacion)} />
            <Row label="Reportada por" value={userLabel(inc.reportada_por)} />
            <Row label="Creada" value={formatFecha(inc.creada_en)} />
            {inc.atendida_en ? <Row label="Atendida" value={formatFecha(inc.atendida_en)} /> : null}
            {slaText(inc.severidad) ? <Text style={styles.sla}>{slaText(inc.severidad)}</Text> : null}
            {inc.descripcion ? <Text style={styles.desc}>{inc.descripcion}</Text> : null}
          </Card>

          {estado !== 'RESUELTA' && (
            <>
              <SectionTitle>Gestión</SectionTitle>
              {estado === 'REPORTADA' && (
                <Button title="Atender incidencia" onPress={atender} loading={busy} disabled={busy} />
              )}
              <Input
                label="Comentario de resolución (opcional)"
                placeholder="Cómo se resolvió…"
                value={comentario}
                onChangeText={setComentario}
                multiline
              />
              <Button
                title="Marcar como resuelta"
                variant="gold"
                onPress={resolver}
                loading={busy}
                disabled={busy}
                style={styles.bloque}
              />
            </>
          )}

          <SectionTitle>Evidencia fotográfica</SectionTitle>
          {inc.requiere_evidencia ? (
            <Text style={styles.requiere}>Esta incidencia requiere evidencia fotográfica.</Text>
          ) : null}
          <Button
            title="Subir foto de evidencia"
            variant="secondary"
            onPress={subirEvidencia}
            loading={busy}
            disabled={busy}
          />
          <View style={styles.evGrid}>
            {evidencias.map((ev) => {
              const uri = evidenciaUri(ev);
              return (
                <View key={ev.id} style={styles.evItem}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.evImg} />
                  ) : (
                    <View style={[styles.evImg, styles.evPlaceholder]}>
                      <Text style={styles.evPlaceholderText}>?</Text>
                    </View>
                  )}
                  <Text style={styles.evLabel}>#{ev.id}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  titulo: { fontFamily: fonts.title, fontSize: 22, color: colors.primary, flex: 1 },
  sla: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  bloque: { marginTop: spacing.sm },
  requiere: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.coral,
    marginBottom: spacing.sm,
  },
  okBanner: {
    backgroundColor: `${colors.primaryLight}1E`,
    borderWidth: 1,
    borderColor: `${colors.primaryLight}55`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  okText: { color: colors.primary, fontFamily: fonts.body, fontSize: 13 },
  evGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  evItem: { alignItems: 'center' },
  evImg: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  evPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  evPlaceholderText: { color: colors.textMuted, fontFamily: fonts.body },
  evLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 4 },
});
