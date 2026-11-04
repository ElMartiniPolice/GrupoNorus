/**
 * TaskDetailScreen — CU6 (actualizar estado) y CU9 (validación por ADMINISTRADOR).
 * PATCH /tasks/tareas/:id/ {estado} · POST /tasks/tareas/:id/validar/ · GET .../historial/
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View, Image, Modal, TouchableOpacity, Dimensions } from 'react-native';
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
  SectionTitle,
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel, userLabel, estadoLabel } from '../../utils/labels';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function evidenciaUri(e) {
  if (!e) return null;
  if (typeof e.imagen === 'string') return e.imagen;
  if (e.imagen && typeof e.imagen === 'object') return e.imagen.url ?? e.imagen.image ?? null;
  return e.archivo ?? e.foto ?? null;
}

function historialLine(h) {
  const fecha = formatFecha(h.fecha);
  const estado = estadoLabel(h.estado);
  const usuario = userLabel(h.cambiado_por);
  return `${fecha} · ${estado} · ${usuario}`;
}

export default function TaskDetailScreen({ route }) {
  const { id } = route.params;
  const { user, logout } = useAuth();
  const [tarea, setTarea] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const esAdmin = user?.rol_nombre === 'ADMINISTRADOR';
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const load = useCallback(async () => {
    try {
      const t = await taskService.get(id);
      setTarea(t);
      setError('');
      const h = await taskService.historial(id).catch(() => []);
      setHistorial(Array.isArray(h) ? h : []);
      const ev = await evidenceService.porTarea(id).catch(() => []);
      setEvidencias(Array.isArray(ev) ? ev : []);
    } catch (e) {
      const m = onError(e);
      if (m) setError(m);
    }
  }, [id, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const cambiarEstado = async (nuevo) => {
    setBusy(true);
    setMsg('');
    try {
      await taskService.cambiarEstado(id, nuevo);
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

  const openImagePicker = () => setShowImagePicker(true);

  const handleImagePicker = async (source) => {
    setShowImagePicker(false);
    setBusy(true);
    setMsg('');
    try {
      let result;
      if (source === 'camera') {
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
      setMsg('Foto subida correctamente.');
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  const openFullscreenImage = (uri) => setSelectedImageUri(uri);
  const closeFullscreenImage = () => setSelectedImageUri(null);

  if (!tarea && !error) return <Loading label="Cargando tarea…" />;

  return (
    <Screen>
      {error ? <ErrorBanner message={error} /> : null}
      {msg ? (
        <View style={styles.okBanner}>
          <Text style={styles.okText}>{msg}</Text>
        </View>
      ) : null}
      {tarea && (
        <>
          <Card elevationLevel="level2">
            <View style={styles.head}>
              <Text style={styles.titulo}>{tarea.titulo}</Text>
              <Badge label={estadoLabel(tarea.estado)} color={taskEstadoColor[tarea.estado] || colors.textMuted} />
            </View>
            <Row label="Habitación" value={habLabel(tarea.habitacion)} />
            <Row label="Responsable" value={userLabel(tarea.asignado_a)} />
            <Row label="Prioridad" value={tarea.prioridad} />
            <Row label="Creada" value={formatFecha(tarea.creada_en)} />
            {tarea.descripcion ? (
              <Text style={styles.desc}>{tarea.descripcion}</Text>
            ) : null}
          </Card>

          <SectionTitle>Cambiar estado</SectionTitle>
          <View style={styles.chips}>
            {ESTADOS_TAREA.map((e) => (
              <Button
                key={e}
                title={estadoLabel(e)}
                variant={tarea.estado === e ? 'primary' : 'secondary'}
                disabled={busy || tarea.estado === e}
                onPress={() => cambiarEstado(e)}
                style={styles.estadoBtn}
              />
            ))}
          </View>

          {esAdmin && (
            <Button
              title="Validar tarea (CU9)"
              variant="gold"
              loading={busy}
              disabled={busy || tarea.estado === 'COMPLETADA'}
              onPress={validar}
              style={styles.validarBtn}
            />
          )}

                    <SectionTitle>Registro fotográfico</SectionTitle>
                    <Button
                      title="Subir foto"
                      variant="secondary"
                      onPress={openImagePicker}
                      loading={busy}
                      disabled={busy}
                    />
                    {showImagePicker && (
                      <Modal visible={true} animationType="slide" transparent={true}>
                        <View style={styles.pickerOverlay}>
                          <View style={styles.pickerContainer}>
                            <Text style={styles.pickerTitle}>Seleccionar origen</Text>
                            <Button
                              title="Cámara"
                              onPress={() => handleImagePicker('camera')}
                              loading={busy}
                              disabled={busy}
                              style={styles.pickerBtn}
                            />
                            <Button
                              title="Galería"
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
                                <Text style={styles.evPlaceholderText}>?</Text>
                              </View>
                            )}
                            <Text style={styles.evLabel}>#{ev.id}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {selectedImageUri && (
                      <Modal visible={true} animationType="fade" transparent={true}>
                        <TouchableOpacity style={styles.fullscreenOverlay} onPress={closeFullscreenImage}>
                          <Image source={{ uri: selectedImageUri }} style={styles.fullscreenImage} resizeMode="contain" />
                          <TouchableOpacity style={styles.fullscreenClose} onPress={closeFullscreenImage}>
                            <Text style={{ color: colors.white, fontSize: 24, fontWeight: 'bold' }}>×</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </Modal>
                    )}

                    <SectionTitle>Historial</SectionTitle>
          {historial.length === 0 && (
            <Text style={styles.empty}>Sin registros de cambios.</Text>
          )}
          {historial.map((e, i) => (
            <View key={i} style={styles.histItem}>
              <Text style={styles.histText}>{historialLine(e)}</Text>
            </View>
          ))}
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
  desc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  estadoBtn: { minWidth: 140, flexGrow: 1 },
  validarBtn: { marginTop: spacing.md },
  okBanner: {
    backgroundColor: `${colors.primaryLight}1E`,
    borderWidth: 1,
    borderColor: `${colors.primaryLight}55`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  okText: { color: colors.primary, fontFamily: fonts.body, fontSize: 13 },
  empty: { fontFamily: fonts.body, color: colors.textMuted },
  histItem: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  histText: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pickerTitle: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pickerBtn: {
    marginHorizontal: 0,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.5,
    maxHeight: Dimensions.get('window').height * 0.9,
  },
  fullscreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
});
