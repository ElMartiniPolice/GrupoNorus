/**
 * IncidenciaDetailScreen — Atender (POST .../atender/), Resolver (POST .../resolver/)
 * y evidencia fotográfica con diseño moderno NORUS y soporte multiplataforma (Web y Móvil).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { resolveMediaUrl } from '../../utils/media';
import { estadoInc } from './IncidenciasScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function evidenciaUri(ev) {
  if (!ev) return null;
  return resolveMediaUrl(ev.imagen ?? ev.archivo ?? ev.foto);
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
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

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
    setError('');
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
    setError('');
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

  // Selector de foto web directo y robusto
  const pickFotoWeb = async () => {
    // Si estamos en navegador web, usamos el input file nativo para máxima compatibilidad
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        setBusy(true);
        setError('');
        setMsg('');
        try {
          await evidenceService.subir(id, { file, name: file.name, type: file.type });
          setMsg('Evidencia subida correctamente.');
          load();
        } catch (err) {
          console.error('Error al subir evidencia:', err);
          setError(onError(err) || err?.message || 'Error al subir la evidencia fotográfica.');
        } finally {
          setBusy(false);
        }
      };
      input.click();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      setBusy(true);
      setError('');
      setMsg('');
      await evidenceService.subir(id, result.assets[0]);
      setMsg('Evidencia subida correctamente.');
      load();
    } catch (e) {
      console.error('Error al subir evidencia:', e);
      setError(onError(e) || e?.message || 'Error al subir la evidencia fotográfica.');
    } finally {
      setBusy(false);
    }
  };

  const openImagePicker = () => {
    if (Platform.OS === 'web') {
      pickFotoWeb();
      return;
    }
    setShowImagePicker(true);
  };

  const handleImagePicker = async (source) => {
    setShowImagePicker(false);
    setBusy(true);
    setError('');
    setMsg('');
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setError('Se requiere permiso para acceder a la cámara.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });
      }
      if (result.canceled || !result.assets?.length) return;
      await evidenceService.subir(id, result.assets[0]);
      setMsg('Evidencia subida correctamente.');
      load();
    } catch (e) {
      setError(onError(e) || 'Error al subir la evidencia fotográfica.');
    } finally {
      setBusy(false);
    }
  };

  const openFullscreenImage = (uri) => setSelectedImageUri(uri);
  const closeFullscreenImage = () => setSelectedImageUri(null);

  if (!inc && !error) return <Loading label="Cargando incidencia…" />;

  const estado = inc ? estadoInc(inc) : '';

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text style={styles.overline}>INCIDENCIAS / DETALLE</Text>
          <Text style={styles.introTitle}>{inc?.titulo || 'Incidencia'}</Text>
          <Text style={styles.introCaption}>
            {inc?.habitacion && habLabel(inc.habitacion) !== '—'
              ? `Habitación ${habLabel(inc.habitacion)}`
              : 'Área General / Áreas comunes'}{' '}
            · Severidad {inc?.severidad}
          </Text>
        </View>

      {error ? <ErrorBanner message={error} /> : null}
      {msg ? (
        <View style={styles.okBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primaryLight} />
          <Text style={styles.okText}>{msg}</Text>
        </View>
      ) : null}

      {!inc && !error && <Loading label="Cargando información de la incidencia…" />}

      {inc && (
        <>
          {/* Card Hero */}
          <Card elevationLevel="level2" style={styles.heroCard}>
            <View style={styles.heroHead}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name={inc.habitacion ? "alert-circle-outline" : "business-outline"}
                  size={28}
                  color={severityColor[inc.severidad] || colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>
                  {inc.habitacion && habLabel(inc.habitacion) !== '—' ? 'HABITACIÓN' : 'UBICACIÓN'}
                </Text>
                <Text style={styles.heroRoom}>
                  {inc.habitacion && habLabel(inc.habitacion) !== '—'
                    ? `Habitación ${habLabel(inc.habitacion)}`
                    : 'Área General (Sin habitación)'}
                </Text>
              </View>
              <Badge label={inc.severidad} color={severityColor[inc.severidad] || colors.textMuted} />
            </View>

            <View style={styles.infoGrid}>
              <Row
                label="Ubicación"
                value={
                  inc.habitacion && habLabel(inc.habitacion) !== '—'
                    ? `Habitación ${habLabel(inc.habitacion)}`
                    : 'Áreas comunes / General'
                }
              />
              <Row label="Estado" value={estadoLabel(estado)} />
              <Row label="Reportada por" value={userLabel(inc.reportada_por)} />
              {inc.reportada_por?.rol_nombre ? (
                <Row
                  label="Rol / Área"
                  value={[inc.reportada_por.rol_nombre, inc.reportada_por.area_nombre].filter(Boolean).join(' · ')}
                />
              ) : null}
              <Row label="Creada" value={formatFecha(inc.creada_en)} />
              {inc.atendida_en ? <Row label="Atendida" value={formatFecha(inc.atendida_en)} /> : null}
              {inc.resuelta_en ? <Row label="Resuelta" value={formatFecha(inc.resuelta_en)} /> : null}
              {slaText(inc.severidad) ? <Row label="SLA sugerido" value={slaText(inc.severidad)} /> : null}
            </View>

            {inc.descripcion ? (
              <View style={styles.descBox}>
                <Text style={styles.descLabel}>Descripción del problema</Text>
                <Text style={styles.descText}>{inc.descripcion}</Text>
              </View>
            ) : null}
          </Card>

          {/* Gestión / Resolución */}
          {estado !== 'RESUELTA' && (
            <Card elevationLevel="level2" style={styles.gestionCard}>
              <View style={styles.sectionHeading}>
                <Ionicons name="construct-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionHeadingTitle}>Gestión operativa</Text>
              </View>

              {estado === 'REPORTADA' && (
                <Button
                  title="Atender incidencia"
                  onPress={atender}
                  loading={busy}
                  disabled={busy}
                  style={{ marginBottom: spacing.md }}
                />
              )}

              <Input
                label="Comentario de resolución (opcional)"
                placeholder="Explique cómo se resolvió la incidencia…"
                value={comentario}
                onChangeText={setComentario}
                multiline
              />

              <Button
                title="Marcar como resuelta"
                variant="primary"
                onPress={resolver}
                loading={busy}
                disabled={busy}
                style={{ marginTop: 6 }}
              />
            </Card>
          )}

          {/* Evidencias fotográficas */}
          <Card elevationLevel="level2" style={styles.evCard}>
            <View style={styles.sectionHeading}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <Text style={styles.sectionHeadingTitle}>Evidencias fotográficas</Text>
            </View>

            {inc.requiere_evidencia ? (
              <View style={styles.requiereNotice}>
                <Ionicons name="warning-outline" size={16} color={colors.coral} />
                <Text style={styles.requiereText}>Esta incidencia requiere evidencia fotográfica obligatoria.</Text>
              </View>
            ) : null}

            <Button
              title="Adjuntar fotografía de evidencia"
              variant="secondary"
              onPress={openImagePicker}
              loading={busy}
              disabled={busy}
              style={styles.subirBtn}
            />

            {/* Modal de selección en móvil */}
            {showImagePicker && (
              <Modal visible={true} animationType="fade" transparent={true}>
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.pickerTitle}>Seleccionar fotografía</Text>
                    <Button
                      title="Tomar fotografía con cámara"
                      onPress={() => handleImagePicker('camera')}
                      loading={busy}
                      disabled={busy}
                      style={styles.pickerBtn}
                    />
                    <Button
                      title="Elegir de la galería"
                      variant="secondary"
                      onPress={() => handleImagePicker('library')}
                      loading={busy}
                      disabled={busy}
                      style={styles.pickerBtn}
                    />
                    <Button
                      title="Cancelar"
                      variant="ghost"
                      onPress={() => setShowImagePicker(false)}
                      disabled={busy}
                      style={styles.pickerBtn}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {/* Grid de fotos */}
            {evidencias.length === 0 ? (
              <Text style={styles.emptyEv}>No hay evidencias fotográficas registradas.</Text>
            ) : (
              <View style={styles.evGrid}>
                {evidencias.map((ev) => {
                  const uri = evidenciaUri(ev);
                  return (
                    <View key={ev.id} style={styles.evItem}>
                      {uri ? (
                        <TouchableOpacity onPress={() => openFullscreenImage(uri)} activeOpacity={0.8}>
                          <Image source={{ uri }} style={styles.evImg} />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.evImg, styles.evPlaceholder]}>
                          <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                        </View>
                      )}
                      <Text style={styles.evLabel}>Foto #{ev.id}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* Modal pantalla completa para fotos */}
          {selectedImageUri && (
            <Modal visible={true} transparent={true} animationType="fade">
              <TouchableOpacity
                style={styles.fullscreenOverlay}
                activeOpacity={1}
                onPress={closeFullscreenImage}
              >
                <View style={styles.fullscreenContainer}>
                  <Image
                    source={{ uri: selectedImageUri }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeFullscreenImage}
                  >
                    <Text style={styles.closeButtonText}>Cerrar ✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          )}
        </>
      )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  intro: { marginBottom: 18 },
  overline: {
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    color: colors.primaryLight,
    fontSize: 10,
    marginBottom: 5,
  },
  introTitle: { fontFamily: fonts.title, fontSize: 32, color: colors.primary },
  introCaption: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 3 },
  okBanner: {
    backgroundColor: `${colors.primaryLight}18`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  okText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13 },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.2,
    fontSize: 9,
    color: colors.textMuted,
  },
  heroRoom: { fontFamily: fonts.serif, color: colors.primary, fontSize: 22 },
  infoGrid: { marginTop: 4 },
  descBox: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.md,
    marginTop: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryLight,
  },
  descLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary, marginBottom: 4 },
  descText: { fontFamily: fonts.body, fontSize: 13, color: colors.text, lineHeight: 19 },
  gestionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.md,
    borderTopWidth: 3,
    borderTopColor: colors.primaryLight,
  },
  evCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.xl,
    borderTopWidth: 3,
    borderTopColor: colors.primarySoft,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionHeadingTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.primary },
  requiereNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: `${colors.coral}44`,
    padding: 10,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  requiereText: { fontFamily: fonts.body, fontSize: 12, color: colors.coral, flex: 1 },
  subirBtn: { marginBottom: 16 },
  emptyEv: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 14,
  },
  evGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  evItem: {
    width: 100,
    alignItems: 'center',
  },
  evImg: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  evPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  evLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 10,
  },
  pickerTitle: {
    fontFamily: fonts.title,
    fontSize: 20,
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerBtn: { width: '100%' },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH * 0.92,
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  closeButtonText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
});
