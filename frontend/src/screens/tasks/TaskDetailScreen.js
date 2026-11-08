/**
 * TaskDetailScreen — CU6 (actualizar estado) y CU9 (validación por ADMINISTRADOR)
 * con diseño moderno NORUS y soporte multiplataforma.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { taskService, ESTADOS_TAREA } from '../../services/taskService';
import { evidenceService } from '../../services/evidenceService';
import { colors, fonts, spacing, radius, prioridadColor, taskEstadoColor } from '../../theme';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Loading,
  Row,
  Screen,
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel, userLabel, userDetalleLabel, estadoLabel } from '../../utils/labels';
import { resolveMediaUrl } from '../../utils/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ESTADO_ICONS = {
  PENDIENTE: 'hourglass-outline',
  EN_PROGRESO: 'play-outline',
  COMPLETADA: 'checkmark-circle-outline',
  CANCELADA: 'close-circle-outline',
};

function evidenciaUri(e) {
  if (!e) return null;
  return resolveMediaUrl(e.imagen ?? e.archivo ?? e.foto);
}

function historialLine(h) {
  const fecha = formatFecha(h.fecha);
  const estado = estadoLabel(h.estado_nuevo || h.estado);
  const usuario = userDetalleLabel(h.usuario || h.cambiado_por);
  return `${fecha} · ${estado} · ${usuario}`;
}

export default function TaskDetailScreen({ route }) {
  const { id } = route.params;
  const { user, logout } = useAuth();
  const esAdmin = user?.rol_nombre === 'ADMINISTRADOR';

  const [tarea, setTarea] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const load = useCallback(async () => {
    try {
      const [t, h, ev] = await Promise.all([
        taskService.get(id),
        taskService.historial(id).catch(() => []),
        evidenceService.porTarea(id).catch(() => []),
      ]);
      setTarea(t);
      setHistorial(Array.isArray(h) ? h : []);
      setEvidencias(Array.isArray(ev) ? ev : []);
      setError('');
    } catch (e) {
      const m = onError(e);
      if (m) setError(m);
    }
  }, [id, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const cambiarEstado = async (nuevoEstado) => {
    setBusy(true);
    setMsg('');
    try {
      await taskService.update(id, { estado: nuevoEstado });
      setMsg('Estado actualizado.');
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  const validar = async () => {
    setBusy(true);
    setMsg('');
    try {
      await taskService.validar(id);
      setMsg('Tarea validada correctamente.');
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  const pickFotoWeb = async () => {
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
          await evidenceService.subirTarea(id, { file, name: file.name, type: file.type });
          setMsg('Fotografía subida correctamente.');
          load();
        } catch (err) {
          console.error('Error al subir fotografía:', err);
          setError(onError(err) || err?.message || 'Error al subir la fotografía.');
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
      await evidenceService.subirTarea(id, result.assets[0]);
      setMsg('Fotografía subida correctamente.');
      load();
    } catch (e) {
      setError(onError(e) || e?.message || 'Error al subir la fotografía.');
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
      await evidenceService.subirTarea(id, result.assets[0]);
      setMsg('Fotografía subida correctamente.');
      load();
    } catch (e) {
      setError(onError(e) || 'Error al subir la fotografía.');
    } finally {
      setBusy(false);
    }
  };

  const openFullscreenImage = (uri) => setSelectedImageUri(uri);
  const closeFullscreenImage = () => setSelectedImageUri(null);

  if (!tarea && !error) return <Loading label="Cargando tarea…" />;

  const colorEstado = tarea ? taskEstadoColor[tarea.estado] || colors.textMuted : colors.textMuted;
  const colorPrio = tarea ? prioridadColor[tarea.prioridad] || colors.primaryLight : colors.primaryLight;

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text style={styles.overline}>TAREAS / DETALLE</Text>
          <Text style={styles.introTitle}>{tarea?.titulo || 'Tarea'}</Text>
          <Text style={styles.introCaption}>
            {tarea?.habitacion && habLabel(tarea.habitacion) !== '—'
              ? `Habitación ${habLabel(tarea.habitacion)}`
              : 'Área General / Áreas comunes'}{' '}
            · Prioridad {tarea?.prioridad}
          </Text>
        </View>

      {error ? <ErrorBanner message={error} /> : null}
      {msg ? (
        <View style={styles.okBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primaryLight} />
          <Text style={styles.okText}>{msg}</Text>
        </View>
      ) : null}

      {tarea && (
        <>
          {/* Hero Card */}
          <Card elevationLevel="level2" style={styles.heroCard}>
            <View style={styles.heroHead}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name={tarea.habitacion && habLabel(tarea.habitacion) !== '—' ? 'clipboard-outline' : 'business-outline'}
                  size={28}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>
                  {tarea.habitacion && habLabel(tarea.habitacion) !== '—' ? 'HABITACIÓN ASOCIADA' : 'UBICACIÓN'}
                </Text>
                <Text style={styles.heroRoom}>
                  {tarea.habitacion && habLabel(tarea.habitacion) !== '—'
                    ? `Habitación ${habLabel(tarea.habitacion)}`
                    : 'Área General (Sin habitación)'}
                </Text>
              </View>
              <Badge label={estadoLabel(tarea.estado)} color={colorEstado} />
            </View>

            <View style={styles.infoGrid}>
              <Row
                label="Ubicación"
                value={
                  tarea.habitacion && habLabel(tarea.habitacion) !== '—'
                    ? `Habitación ${habLabel(tarea.habitacion)}`
                    : 'Áreas comunes / Instalaciones generales'
                }
              />
              <Row label="Responsable" value={userLabel(tarea.asignado_a)} />
              {tarea.asignado_a?.rol_nombre ? (
                <Row label="Rol responsable" value={tarea.asignado_a.rol_nombre} />
              ) : null}
              {tarea.asignado_a?.area_nombre ? (
                <Row label="Área responsable" value={tarea.asignado_a.area_nombre} />
              ) : null}
              <Row label="Prioridad" value={`Prioridad ${tarea.prioridad}`} />
              <Row label="Fecha creación" value={formatFecha(tarea.creada_en)} />
            </View>

            {tarea.descripcion ? (
              <View style={styles.descBox}>
                <Text style={styles.descLabel}>Descripción del trabajo</Text>
                <Text style={styles.descText}>{tarea.descripcion}</Text>
              </View>
            ) : null}
          </Card>

          {/* Cambio de Estado */}
          <Card elevationLevel="level2" style={styles.estadoCard}>
            <View style={styles.sectionHeading}>
              <Ionicons name="swap-horizontal-outline" size={22} color={colors.primary} />
              <Text style={styles.sectionHeadingTitle}>Cambiar estado de la tarea</Text>
            </View>

            <View style={styles.estadoBtnGrid}>
              {ESTADOS_TAREA.map((e) => {
                const selected = tarea.estado === e;
                const color = taskEstadoColor[e] || colors.primaryLight;
                return (
                  <TouchableOpacity
                    key={e}
                    style={[styles.estadoTile, selected && styles.estadoTileActive]}
                    onPress={() => cambiarEstado(e)}
                    disabled={busy || selected}
                  >
                    <View style={[styles.tileIcon, { backgroundColor: color + '22' }]}>
                      <Ionicons name={ESTADO_ICONS[e] || 'ellipse'} size={18} color={color} />
                    </View>
                    <Text style={styles.tileText}>{estadoLabel(e)}</Text>
                    {selected ? (
                      <View style={styles.tileCheck}>
                        <Ionicons name="checkmark" size={13} color={colors.primary} />
                        <Text style={styles.tileCheckText}>Actual</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {esAdmin && tarea.estado !== 'COMPLETADA' && (
              <Button
                title="Validar y cerrar tarea (Admin)"
                variant="primary"
                onPress={validar}
                loading={busy}
                disabled={busy}
                style={{ marginTop: spacing.md }}
              />
            )}
          </Card>

          {/* Evidencias fotográficas de la tarea */}
          <Card elevationLevel="level2" style={styles.evCard}>
            <View style={styles.sectionHeading}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <Text style={styles.sectionHeadingTitle}>Evidencia fotográfica del trabajo</Text>
            </View>

            <Button
              title="Adjuntar fotografía de respaldo"
              variant="secondary"
              onPress={openImagePicker}
              loading={busy}
              disabled={busy}
              style={{ marginBottom: 14 }}
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

            {evidencias.length === 0 ? (
              <Text style={styles.emptyText}>No hay fotografías de respaldo adjuntas.</Text>
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

          {/* Historial de cambios */}
          <Card elevationLevel="level2" style={styles.histCard}>
            <View style={styles.sectionHeading}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
              <Text style={styles.sectionHeadingTitle}>Historial de cambios de estado</Text>
            </View>

            {historial.length === 0 ? (
              <Text style={styles.emptyText}>Sin registros de cambios.</Text>
            ) : (
              historial.map((e, i) => (
                <View key={i} style={styles.histItem}>
                  <Ionicons name="git-commit-outline" size={16} color={colors.primaryLight} />
                  <Text style={styles.histText}>{historialLine(e)}</Text>
                </View>
              ))
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
  estadoCard: {
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
    marginBottom: spacing.md,
    borderTopWidth: 3,
    borderTopColor: colors.primarySoft,
  },
  histCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.xl,
    borderTopWidth: 3,
    borderTopColor: colors.border,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionHeadingTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.primary },
  estadoBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  estadoTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  estadoTileActive: {
    borderColor: colors.primaryLight,
    borderWidth: 2,
    backgroundColor: '#F3F9FC',
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  tileCheck: {
    backgroundColor: colors.surfaceBrand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tileCheckText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primary,
  },
  emptyText: {
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
  histItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  histText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text,
    flex: 1,
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
