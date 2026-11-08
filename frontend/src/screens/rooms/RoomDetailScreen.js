/**
 * RoomDetailScreen — CU10/CU1/CU3: Detalle de habitación.
 * Recepción/Administración registran check-in (CU3) y check-out (CU1);
 * el check-out cierra la estadía activa y deja la habitación en LIMPIEZA.
 * El estado de la habitación puede cambiarse manualmente (p. ej. tras aseo),
 * adjuntando una fotografía opcional que queda registrada en el historial.
 * CP-DP-02: el OPERARIO accede solo a sus habitaciones — puede cambiar su
 * estado adjuntando fotografía y ver el registro fotográfico y el historial
 * de cambios (sin datos de huéspedes ni estadías).
 */
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { roomService } from '../../services/roomService';
import { evidenceService } from '../../services/evidenceService';
import { colors, fonts, spacing, radius, roomEstadoColor } from '../../theme';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  Loading,
  Row,
  Screen,
  SectionTitle,
  formatFecha,
  makeErrorHandler,
} from '../../components/ui';
import { habLabel } from '../../utils/labels';

const ESTADOS_HABITACION = ['DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENCION'];

const CATEGORIA_LABELS = {
  BLANQUERIA: 'Blanquería',
  ELECTRODOMESTICOS: 'Electrodomésticos',
  MENAJE: 'Menaje y Cocina',
  BANO: 'Artículos de Baño',
  MOBILIARIO: 'Mobiliario',
  OTROS: 'Otros',
};

function tipoLabel(t) {
  if (t === null || t === undefined || t === '') return '—';
  if (typeof t === 'object') return t.nombre ?? '—';
  return String(t);
}

function evidenciaUri(e) {
  const img = e?.imagen;
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.url || img.image || null;
}

function fechaISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export default function RoomDetailScreen({ route }) {
  const { id } = route.params;
  const { user, logout } = useAuth();
  const esAdmin = user?.rol_nombre === 'ADMINISTRADOR';
  const esRecepcion = user?.rol_nombre === 'RECEPCION';
  const esOperario = user?.rol_nombre === 'OPERARIO';
  const puedeGestionar = esAdmin || esRecepcion;
  const puedeCambiarEstado = puedeGestionar || esOperario;

  const [room, setRoom] = useState(null);
  const [cambios, setCambios] = useState([]);
  const [foto, setFoto] = useState(null);
  const [estadias, setEstadias] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [solicitandoId, setSolicitandoId] = useState(null);
  const [notasSolicitud, setNotasSolicitud] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [nuevoItemOpen, setNuevoItemOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCategoria, setNuevoCategoria] = useState('BLANQUERIA');
  const [nuevaCantidad, setNuevaCantidad] = useState('1');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [huesped, setHuesped] = useState('');
  const [llegada, setLlegada] = useState(fechaISO(new Date()));
  const [salida, setSalida] = useState(fechaISO(new Date(Date.now() + 86400000)));
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const load = useCallback(async () => {
    try {
      const [r, es, ev, ca, inv] = await Promise.all([
        roomService.get(id),
        roomService.estadias({ habitacion: id }).catch(() => []),
        evidenceService.porHabitacion(id).catch(() => []),
        roomService.cambiosEstado(id).catch(() => []),
        roomService.inventario(id).catch(() => []),
      ]);
      setRoom(r);
      setEstadias(Array.isArray(es) ? es : []);
      setEvidencias(Array.isArray(ev) ? ev : []);
      setCambios(Array.isArray(ca) ? ca : []);
      setInventario(Array.isArray(inv) ? inv : []);
      setError('');
    } catch (e) {
      const m = onError(e);
      if (m) setError(m);
    }
  }, [id, onError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activa = estadias.find((e) => !e.salida);

  const accion = async (fn, okMsg) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      setMsg(okMsg);
      setCheckinOpen(false);
      load();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setBusy(false);
    }
  };

  const checkout = () =>
    accion(
      () => roomService.checkout(activa.id),
      'Check-out registrado. La habitación quedó en LIMPIEZA.',
    );

  const guardarCheckin = () => {
    setError('');
    if (!huesped.trim()) return setError('Ingrese el nombre del huésped.');
    if (!llegada.trim()) return setError('Ingrese la fecha de llegada.');
    if (!salida.trim()) return setError('Ingrese la fecha de salida.');
    accion(
      () =>
        roomService.crearEstadia({
          habitacion: id,
          huesped: huesped.trim(),
          llegada: llegada.trim(),
          salida: salida.trim(),
        }),
      'Check-in registrado.',
    );
  };

  const pickFoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (r.canceled || !r.assets?.length) return;
    setFoto(r.assets[0]);
  };

    const pickFotoFromCamera = async () => {
      const r = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (r.canceled || !r.assets?.length) return;
      setFoto(r.assets[0]);
    };

    const showImagePicker = () => {
      Alert.alert(
        'Seleccionar origen',
        '¿De dónde quieres tomar la foto?',
        [
          { text: 'Cámara', onPress: pickFotoFromCamera },
          { text: 'Galería', onPress: pickFoto },
          { text: 'Cancelar', style: 'cancel' },
        ],
        { cancelable: true },
      );
    };

  const cambiarEstado = (nuevo) => {
    if (room.estado === nuevo) return;
    accion(
      async () => {
        await roomService.cambiarEstado(id, nuevo, foto);
        setFoto(null);
      },
      'Estado actualizado.',
    );
  };

  const solicitarItem = (itemId) => {
    accion(
      async () => {
        await roomService.solicitarItem(itemId, notasSolicitud);
        setSolicitandoId(null);
        setNotasSolicitud('');
      },
      'Solicitud de reposición registrada y notificada a coordinación.',
    );
  };

  const reponerItem = (itemId) => {
    accion(
      () => roomService.reponerItem(itemId),
      'Artículo marcado como completo / repuesto.',
    );
  };

  const guardarNuevoItem = () => {
    if (!nuevoNombre.trim()) {
      return setError('Ingrese el nombre del artículo.');
    }
    const cant = parseInt(nuevaCantidad, 10);
    if (isNaN(cant) || cant <= 0) {
      return setError('Ingrese una cantidad válida mayor a 0.');
    }
    accion(
      async () => {
        await roomService.crearItem({
          habitacion: id,
          nombre: nuevoNombre.trim(),
          categoria: nuevoCategoria,
          cantidad: cant,
        });
        setNuevoNombre('');
        setNuevaCantidad('1');
        setNuevoItemOpen(false);
      },
      'Artículo agregado al inventario de la habitación.',
    );
  };

  const confirmarEliminarItem = (item) => {
    Alert.alert(
      'Eliminar artículo',
      `¿Desea eliminar "${item.nombre}" del inventario de esta habitación?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            accion(
              () => roomService.eliminarItem(item.id),
              'Artículo eliminado del inventario.',
            ),
        },
      ],
    );
  };

  if (!room && !error) return <Loading label="Cargando habitación…" />;
  if (!room) {
    return (
      <Screen>
        <ErrorBanner message={error} />
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? <ErrorBanner message={error} /> : null}
      {msg ? (
        <View style={styles.okBanner}>
          <Text style={styles.okText}>{msg}</Text>
        </View>
      ) : null}

      <Card elevationLevel="level2">
        <View style={styles.head}>
          <Text style={styles.titulo}>Habitación {habLabel(room)}</Text>
          <Badge
            label={room.estado ?? '—'}
            color={roomEstadoColor[room.estado] || colors.textMuted}
          />
        </View>
        <Row label="Tipo" value={tipoLabel(room.tipo)} />
        <Row label="Estado" value={room.estado ?? '—'} />
      </Card>

      {activa && puedeGestionar ? (
        <Card elevationLevel="level2">
          <View style={styles.head}>
            <Text style={styles.subtitulo}>Estadía activa</Text>
            {activa.conflicto ? <Badge label="Conflicto" color={colors.coral} /> : null}
          </View>
          <Row label="Huésped" value={activa.huesped ?? '—'} />
          <Row label="Llegada" value={formatFecha(activa.llegada)} />
          <Row label="Salida prevista" value={formatFecha(activa.salida)} />
          <Button
            title="Check-out (CU1)"
            variant="danger"
            onPress={checkout}
            loading={busy}
            disabled={busy}
          />
        </Card>
      ) : null}

      {puedeGestionar && !activa ? (
        <Card elevationLevel="level2">
          <View style={styles.head}>
            <Text style={styles.subtitulo}>Check-in (CU3)</Text>
          </View>
          {!checkinOpen ? (
            <Button title="Registrar check-in" onPress={() => setCheckinOpen(true)} />
          ) : (
            <>
              <Input
                label="Huésped"
                placeholder="Nombre del huésped"
                value={huesped}
                onChangeText={setHuesped}
              />
              <Input
                label="Llegada (AAAA-MM-DD)"
                placeholder="2026-09-29"
                value={llegada}
                onChangeText={setLlegada}
              />
              <Input
                label="Salida (AAAA-MM-DD)"
                placeholder="2026-09-30"
                value={salida}
                onChangeText={setSalida}
              />
              <Button
                title="Confirmar check-in"
                onPress={guardarCheckin}
                loading={busy}
                disabled={busy}
              />
              <Button
                title="Cancelar"
                variant="ghost"
                onPress={() => setCheckinOpen(false)}
                disabled={busy}
              />
            </>
          )}
        </Card>
      ) : null}

      {puedeCambiarEstado ? (
        <Card elevationLevel="level2">
          <View style={styles.head}>
            <Text style={styles.subtitulo}>Cambiar estado</Text>
          </View>
          <Button
            title={foto ? 'Cambiar fotografía adjunta' : 'Adjuntar fotografía (opcional)'}
            variant="ghost"
                      onPress={showImagePicker}
            disabled={busy}
          />
          {foto ? (
            <View style={styles.fotoPreviewWrap}>
              <Image source={{ uri: foto.uri }} style={styles.fotoImg} />
              <Button
                title="Quitar fotografía"
                variant="ghost"
                onPress={() => setFoto(null)}
                disabled={busy}
              />
            </View>
          ) : null}
          <View style={styles.estadoRow}>
            {ESTADOS_HABITACION.map((estado) => (
              <View key={estado} style={styles.estadoBtn}>
                <Button
                  title={estado}
                  variant={room.estado === estado ? 'primary' : 'secondary'}
                  onPress={() => cambiarEstado(estado)}
                  disabled={busy || room.estado === estado}
                />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* ================= SECCIÓN DE INVENTARIO ================= */}
      <Card elevationLevel="level2">
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtitulo}>Inventario de la habitación</Text>
            <Text style={styles.invSubtexto}>
              {inventario.filter((i) => i.estado === 'SOLICITADO' || i.estado === 'FALTANTE').length > 0
                ? `${inventario.filter((i) => i.estado === 'SOLICITADO' || i.estado === 'FALTANTE').length} faltante(s) de ${inventario.length} artículos`
                : `${inventario.length} artículos en orden`}
            </Text>
          </View>
          {inventario.filter((i) => i.estado === 'SOLICITADO' || i.estado === 'FALTANTE').length > 0 ? (
            <Badge
              label={`${inventario.filter((i) => i.estado === 'SOLICITADO' || i.estado === 'FALTANTE').length} Faltantes`}
              color={colors.coral}
            />
          ) : (
            <Badge label="Completo" color={colors.primaryLight} />
          )}
        </View>

        {puedeGestionar ? (
          <View style={{ marginBottom: spacing.sm }}>
            <Button
              title={nuevoItemOpen ? 'Cerrar formulario' : '+ Agregar artículo al inventario'}
              variant="ghost"
              onPress={() => setNuevoItemOpen(!nuevoItemOpen)}
              disabled={busy}
            />
          </View>
        ) : null}

        {nuevoItemOpen && puedeGestionar ? (
          <View style={styles.nuevoItemCard}>
            <Text style={styles.nuevoItemTitulo}>Nuevo artículo de inventario</Text>
            <Input
              label="Nombre del artículo"
              placeholder="Ej. Toallas de baño, Control TV..."
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
            />
            <Input
              label="Cantidad estándar"
              placeholder="1"
              keyboardType="numeric"
              value={nuevaCantidad}
              onChangeText={setNuevaCantidad}
            />
            <Text style={styles.invLabelText}>Categoría:</Text>
            <View style={styles.catChipsRow}>
              {['BLANQUERIA', 'ELECTRODOMESTICOS', 'MENAJE', 'BANO', 'MOBILIARIO', 'OTROS'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    nuevoCategoria === cat && styles.catChipActive,
                  ]}
                  onPress={() => setNuevoCategoria(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      nuevoCategoria === cat && styles.catChipTextActive,
                    ]}
                  >
                    {CATEGORIA_LABELS[cat] || cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <Button
                title="Guardar artículo"
                onPress={guardarNuevoItem}
                loading={busy}
                disabled={busy}
              />
            </View>
          </View>
        ) : null}

        {/* Filtros de categoría */}
        {inventario.length > 0 ? (
          <View style={styles.filtroScrollWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilterScroll}>
              {['TODAS', 'BLANQUERIA', 'ELECTRODOMESTICOS', 'MENAJE', 'BANO', 'MOBILIARIO', 'OTROS'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.filterChip,
                    filtroCategoria === c && styles.filterChipActive,
                  ]}
                  onPress={() => setFiltroCategoria(c)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filtroCategoria === c && styles.filterChipTextActive,
                    ]}
                  >
                    {c === 'TODAS' ? 'Todos' : CATEGORIA_LABELS[c] || c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Lista de artículos */}
        {inventario.length === 0 ? (
          <EmptyState message="No hay artículos registrados en el inventario de esta habitación." />
        ) : (
          inventario
            .filter((item) => (filtroCategoria === 'TODAS' ? true : item.categoria === filtroCategoria))
            .map((item) => {
              const estaFaltante = item.estado === 'SOLICITADO' || item.estado === 'FALTANTE';
              const estaDanado = item.estado === 'DANADO';
              const pidiendo = solicitandoId === item.id;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.invItemRow,
                    estaFaltante && styles.invItemRowFaltante,
                  ]}
                >
                  <View style={styles.invItemHead}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                        <Text style={styles.invItemNombre}>{item.nombre}</Text>
                        <Text style={styles.invItemCantidad}>(x{item.cantidad})</Text>
                      </View>
                      <Text style={styles.invItemCat}>{CATEGORIA_LABELS[item.categoria] || item.categoria}</Text>
                    </View>
                    <Badge
                      label={estaFaltante ? 'Faltante / Solicitado' : estaDanado ? 'Dañado' : 'Completo'}
                      color={estaFaltante ? colors.coral : estaDanado ? colors.gold : colors.primaryLight}
                    />
                  </View>

                  {/* Detalle si está solicitado */}
                  {estaFaltante && (item.solicitado_en || item.solicitado_por || item.notas) ? (
                    <View style={styles.invSolicitadoBox}>
                      <Text style={styles.invSolicitadoMeta}>
                        Solicitado por {item.solicitado_por?.nombre || 'Personal'}
                        {item.solicitado_en ? ` · ${formatFecha(item.solicitado_en)}` : ''}
                      </Text>
                      {item.notas ? (
                        <Text style={styles.invSolicitadoNotas}>Nota: "{item.notas}"</Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Acciones */}
                  <View style={styles.invActionsWrap}>
                    {estaFaltante ? (
                      <Button
                        title="✓ Marcar como repuesto / Completo"
                        variant="primary"
                        onPress={() => reponerItem(item.id)}
                        disabled={busy}
                      />
                    ) : (
                      <>
                        {!pidiendo ? (
                          <Button
                            title="! Marcar faltante / Solicitar reposición"
                            variant="secondary"
                            onPress={() => {
                              setSolicitandoId(item.id);
                              setNotasSolicitud('');
                            }}
                            disabled={busy}
                          />
                        ) : (
                          <View style={styles.solicitarFormWrap}>
                            <Input
                              label="Observación (opcional):"
                              placeholder="Ej. Faltan 2 toallas, control sin pilas..."
                              value={notasSolicitud}
                              onChangeText={setNotasSolicitud}
                            />
                            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                              <View style={{ flex: 1 }}>
                                <Button
                                  title="Confirmar solicitud"
                                  variant="danger"
                                  onPress={() => solicitarItem(item.id)}
                                  loading={busy}
                                  disabled={busy}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Button
                                  title="Cancelar"
                                  variant="ghost"
                                  onPress={() => {
                                    setSolicitandoId(null);
                                    setNotasSolicitud('');
                                  }}
                                  disabled={busy}
                                />
                              </View>
                            </View>
                          </View>
                        )}
                      </>
                    )}

                    {puedeGestionar ? (
                      <TouchableOpacity
                        style={styles.invDeleteBtn}
                        onPress={() => confirmarEliminarItem(item)}
                        disabled={busy}
                      >
                        <Text style={styles.invDeleteBtnText}>Eliminar artículo</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
        )}
      </Card>

      <SectionTitle>Registro fotográfico</SectionTitle>
      {evidencias.length === 0 ? (
        <EmptyState message="Sin registros fotográficos para esta habitación." />
      ) : (
        <View style={styles.fotoGrid}>
          {evidencias.map((ev) => {
            const uri = evidenciaUri(ev);
            return (
              <View key={ev.id} style={styles.fotoCard}>
                {uri ? <Image source={{ uri }} style={styles.fotoImg} /> : null}
                <Text style={styles.fotoTitulo} numberOfLines={1}>
                  {ev.incidencia?.titulo ?? 'Incidencia'}
                </Text>
                <Text style={styles.fotoMeta}>
                  {formatFecha(ev.subida_en || ev.creada_en)}
                  {ev.subida_por?.nombre ? ` · ${ev.subida_por.nombre}` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <SectionTitle>Historial de cambios de estado</SectionTitle>
      {cambios.length === 0 ? (
        <EmptyState message="Sin cambios de estado registrados." />
      ) : (
        cambios.map((c) => (
          <View key={c.id} style={styles.histItem}>
            {c.foto ? <Image source={{ uri: c.foto }} style={styles.fotoImg} /> : null}
            <Text style={styles.histText}>
              {c.estado_anterior} → {c.estado_nuevo} · {formatFecha(c.fecha)}
              {c.cambiado_por?.nombre ? ` · ${c.cambiado_por.nombre}` : ''}
            </Text>
          </View>
        ))
      )}

      {puedeGestionar ? (
        <>
          <SectionTitle>Estadías</SectionTitle>
          {estadias.length === 0 ? (
            <EmptyState message="Sin estadías registradas." />
          ) : null}
          {estadias.map((e) => (
            <View key={e.id} style={styles.histItem}>
              <Text style={styles.histText}>
                {e.huesped ?? '—'} · {formatFecha(e.llegada)} →{' '}
                {e.salida ? formatFecha(e.salida) : 'En curso'}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  titulo: {
    fontFamily: fonts.title,
    fontSize: 22,
    color: colors.primary,
    flex: 1,
  },
  subtitulo: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.primary,
    flex: 1,
  },
  okBanner: {
    backgroundColor: `${colors.primaryLight}1E`,
    borderWidth: 1,
    borderColor: `${colors.primaryLight}55`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  okText: {
    color: colors.primary,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  estadoRow: {
    marginBottom: spacing.md,
  },
  fotoPreviewWrap: {
    marginTop: spacing.sm,
  },
  estadoBtn: {
    marginBottom: spacing.sm,
  },
  histItem: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  histText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  fotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fotoCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  fotoImg: {
    width: '100%',
    height: 110,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  fotoTitulo: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    marginTop: spacing.xs,
  },
  fotoMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  invSubtexto: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  nuevoItemCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  nuevoItemTitulo: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  invLabelText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  catChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.text,
  },
  catChipTextActive: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
  },
  filtroScrollWrap: {
    marginBottom: spacing.md,
  },
  catFilterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.primary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
  },
  invItemRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invItemRowFaltante: {
    borderColor: `${colors.coral}88`,
    backgroundColor: '#FFF9F9',
  },
  invItemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  invItemNombre: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  invItemCantidad: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  invItemCat: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.primaryLight,
    marginTop: 2,
  },
  invSolicitadoBox: {
    backgroundColor: `${colors.coral}15`,
    borderRadius: radius.sm,
    padding: spacing.xs + 2,
    marginVertical: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
  },
  invSolicitadoMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.coral,
    fontWeight: 'bold',
  },
  invSolicitadoNotas: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 2,
  },
  invActionsWrap: {
    marginTop: spacing.xs,
  },
  solicitarFormWrap: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  invDeleteBtn: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  invDeleteBtnText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.coral,
  },
});
