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
import React, { useCallback, useState, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { roomService } from '../../services/roomService';
import { evidenceService } from '../../services/evidenceService';
import { colors, fonts, spacing, radius, roomEstadoColor } from '../../theme';
import checklistTypes from '../../checklistTypes';
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
import ChecklistComponent from '../../components/ChecklistComponent';
import { habLabel } from '../../utils/labels';
import { resolveMediaUrl } from '../../utils/media';

const ESTADOS_HABITACION = ['DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENCION'];
const ESTADO_ICON = { DISPONIBLE: 'checkmark-circle-outline', OCUPADA: 'bed-outline', LIMPIEZA: 'sparkles-outline', MANTENCION: 'construct-outline' };
const ESTADO_TEXTO = { DISPONIBLE: 'Disponible', OCUPADA: 'Ocupada', LIMPIEZA: 'Limpieza', MANTENCION: 'Mantención' };

const CATEGORIA_LABELS = {
  BLANQUERIA: 'Blanquería',
  ELECTRODOMESTICOS: 'Electrodomésticos',
  MENAJE: 'Menaje y Cocina',
  BANO: 'Artículos de Baño',
  MOBILIARIO: 'Mobiliario',
  OTROS: 'Otros',
};

const CATEGORIA_ICONS = {
  BLANQUERIA: 'bed-outline',
  ELECTRODOMESTICOS: 'tv-outline',
  MENAJE: 'restaurant-outline',
  BANO: 'water-outline',
  MOBILIARIO: 'home-outline',
  OTROS: 'cube-outline',
};

function tipoLabel(t) {
  if (t === null || t === undefined || t === '') return '—';
  if (typeof t === 'object') return t.nombre ?? '—';
  return String(t);
}

function evidenciaUri(e) {
  if (!e) return null;
  return resolveMediaUrl(e.imagen ?? e.foto ?? e.archivo);
}

function fechaISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export default function RoomDetailScreen({ route }) {
  const { id } = route.params;
  const { user, logout } = useAuth();
  const esAdmin = user?.rol_nombre === 'ADMINISTRADOR';
  const esRecepcion = user?.rol_nombre === 'RECEPCION' || user?.rol_nombre === 'SUPERVISOR';
  const esOperario = user?.rol_nombre === 'OPERARIO';
  const puedeGestionar = esAdmin || esRecepcion;
  const puedeCambiarEstado = puedeGestionar || esOperario;

  const [room, setRoom] = useState(null);
  const [checklistHabitacion, setChecklistHabitacion] = useState([]);
  const [checklistArea, setChecklistArea] = useState([]);
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [checklistTipo, setChecklistTipo] = useState('');
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
  const carouselRef = useRef(null);
  const [scrollPos, setScrollPos] = useState(0);
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

        /** HU-10/HU-11: Cargar checklist según tipo de habitación */
        if (r && r.tipo) {
          const tipoHabitacion = r.tipo.nombre || r.tipo || 'ESTANDAR';
          const checklist = checklistTypes.getChecklistHabitacion(tipoHabitacion);
          setChecklistHabitacion(checklistTypes.crearEstadoChecklist(checklist));
          setChecklistTipo(tipoHabitacion);
        }

        /** HU-12: Cargar checklist del área si el usuario es de ese área */
        if (r && r.area_nombre && (esRecepcion || esOperario)) {
          const area = r.area_nombre;
          const areaChecklist = checklistTypes.getChecklistArea(area);
          setChecklistArea(checklistTypes.crearEstadoChecklist(areaChecklist));
        }

        setError('');
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      }
    }, [id, onError, esRecepcion, esOperario]);

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
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        setFoto({ file, uri: URL.createObjectURL(file), name: file.name, type: file.type });
      };
      input.click();
      return;
    }
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
    if (Platform.OS === 'web') { pickFoto(); return; }
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

      /** HU-11: Validar checklist antes de permitir DISPONIBLE */
      if (nuevo === 'DISPONIBLE' && checklistTipo) {
        const requiere = checklistTypes.requiereChecklistParaDisponible(checklistTipo);
        if (requiere && !todosCompletados(checklistHabitacion)) {
          setMsg('Debe completar el checklist de limpieza antes de cambiar el estado a Disponible.');
          return;
        }
      }

      accion(
        async () => {
          await roomService.cambiarEstado(id, nuevo, foto);
          setFoto(null);
          /** HU-11: Después de cambiar a LIMPIEZA, mostrar checklist */
          if (nuevo === 'LIMPIEZA') {
            setChecklistVisible(true);
          }
          /** HU-11: Después de completar, marcar checklist como done */
          if (nuevo === 'DISPONIBLE') {
            setChecklistVisible(false);
            setMsg('Habitación disponible. Checklist verificado.');
          }
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
      <View style={styles.container}>
        <View style={styles.detailIntro}><Text style={styles.detailOverline}>HABITACIONES / DETALLE</Text><Text style={styles.detailIntroTitle}>Habitación {habLabel(room)}</Text><Text style={styles.detailIntroCaption}>Información, estadías, inventario y registro de actividades.</Text></View>
        {error ? <ErrorBanner message={error} /> : null}
        {msg ? (
          <View style={styles.okBanner}>
            <Text style={styles.okText}>{msg}</Text>
          </View>
        ) : null}

        <Card elevationLevel="level2" style={styles.roomHero}>
          <View style={styles.heroIcon}><Ionicons name="bed-outline" size={28} color={colors.primary} /></View>
          <View style={styles.roomHeroText}>
            <Text style={styles.heroLabel}>TIPO DE HABITACIÓN</Text>
            <Text style={styles.heroRoomName}>{tipoLabel(room.tipo)}</Text>
            <Text style={styles.heroRoomDetail}>Habitación N.º {habLabel(room)}</Text>
          </View>
          <View style={styles.roomHeroStatus}>
            <Text style={styles.heroLabel}>ESTADO ACTUAL</Text>
            <Badge label={ESTADO_TEXTO[room.estado] || room.estado || '—'} color={roomEstadoColor[room.estado] || colors.textMuted} />
          </View>
        </Card>

        <Card elevationLevel="level1" style={styles.assignmentCard}>
          <Row
            label="Housekeeping asignada"
            value={room.asignada_a
              ? `${room.asignada_a.nombre || ''} ${room.asignada_a.apellido || ''}`.trim()
              : 'Sin asignar'}
          />
        </Card>

        {activa && puedeGestionar ? (
          <Card elevationLevel="level2" style={styles.stayCard}>
            <View style={styles.head}>
              <Text style={styles.subtitulo}>Estadía activa</Text>
              {activa.conflicto ? <Badge label="Conflicto" color={colors.coral} /> : null}
            </View>
            <Row label="Huésped" value={activa.huesped ?? '—'} />
            <Row label="Llegada" value={formatFecha(activa.llegada)} />
            <Row label="Salida prevista" value={formatFecha(activa.salida_prevista)} />
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
          <Card elevationLevel="level2" style={styles.checkinCard}>
            <View style={styles.head}>
              <View style={styles.sectionHeading}><Ionicons name="log-in-outline" size={22} color={colors.primaryLight} /><Text style={styles.subtitulo}>Registro de check-in</Text></View>
            </View>
            {room.estado !== 'DISPONIBLE' ? <Text style={styles.stateNotice}>La habitación no figura como disponible. Comprueba su estado antes de registrar un huésped.</Text> : null}
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
          <Card elevationLevel="level2" style={styles.stateCard}>
            <View style={styles.head}>
              <View style={styles.sectionHeading}><Ionicons name="options-outline" size={22} color={colors.primaryLight} /><Text style={styles.subtitulo}>Actualizar estado</Text></View>
            </View>
            <Text style={styles.helpText}>Selecciona el nuevo estado. Se registrará el cambio en el historial de la habitación.</Text>
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
              {ESTADOS_HABITACION.map((estado) => {
                const selected = room.estado === estado;
                const color = roomEstadoColor[estado] || colors.primaryLight;
                return (
                  <TouchableOpacity
                    key={estado}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busy || selected, selected }}
                    style={[styles.estadoBtn, selected && styles.estadoBtnActual]}
                    onPress={() => cambiarEstado(estado)}
                    disabled={busy || selected}
                  >
                    <View style={[styles.estadoIcon, { backgroundColor: color + '20' }]}><Ionicons name={ESTADO_ICON[estado]} size={21} color={estado === 'OCUPADA' ? '#926410' : color} /></View>
                    <Text style={styles.estadoName}>{ESTADO_TEXTO[estado]}</Text>
                    {selected ? <View style={styles.actualPill}><Ionicons name="checkmark" size={12} color={colors.primary} /><Text style={styles.actualLabel}>Actual</Text></View> : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        ) : null}

        {/* ================= SECCIÓN DE INVENTARIO ================= */}
        <Card elevationLevel="level2" style={styles.invCard}>
          <View style={styles.head}>
            <View style={styles.sectionHeading}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subtitulo}>Inventario de la habitación</Text>
                <Text style={styles.invSubtexto}>
                  {inventario.filter((i) => i.estado === 'SOLICITADO' || i.estado === 'FALTANTE').length > 0
                    ? `${inventario.filter((i) => i.estado === 'SOLICITADO' || i.estado === 'FALTANTE').length} faltante(s) de ${inventario.length} artículos`
                    : `${inventario.length} artículos en orden`}
                </Text>
              </View>
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

          {/* Carrusel de artículos */}
          {inventario.length === 0 ? (
            <EmptyState message="No hay artículos registrados en el inventario de esta habitación." />
          ) : (
            (() => {
              const itemsFiltrados = inventario.filter((item) =>
                filtroCategoria === 'TODAS' ? true : item.categoria === filtroCategoria,
              );
              return (
                <View>
                  <View style={styles.carouselHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="swap-horizontal" size={16} color={colors.primaryLight} />
                      <Text style={styles.carouselHelperText}>
                        Carrusel de inventario ({itemsFiltrados.length} artículos)
                      </Text>
                    </View>
                    <View style={styles.carouselArrows}>
                      <TouchableOpacity
                        style={styles.arrowBtn}
                        onPress={() => carouselRef.current?.scrollTo({ x: Math.max(0, scrollPos - 280), animated: true })}
                      >
                        <Ionicons name="chevron-back" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.arrowBtn}
                        onPress={() => carouselRef.current?.scrollTo({ x: scrollPos + 280, animated: true })}
                      >
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView
                    ref={carouselRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.invCarouselTrack}
                    onScroll={(e) => setScrollPos(e.nativeEvent.contentOffset.x)}
                    scrollEventThrottle={16}
                  >
                    {itemsFiltrados.map((item) => {
                      const estaFaltante = item.estado === 'SOLICITADO' || item.estado === 'FALTANTE';
                      const estaDanado = item.estado === 'DANADO';
                      const pidiendo = solicitandoId === item.id;
                      const iconName = CATEGORIA_ICONS[item.categoria] || 'cube-outline';

                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.invCardItem,
                            estaFaltante ? styles.invCardItemFaltante : styles.invCardItemCompleto,
                          ]}
                        >
                          <View>
                            <View style={styles.invCardTop}>
                              <View style={styles.invCategoryIconWrap}>
                                <Ionicons
                                  name={iconName}
                                  size={18}
                                  color={estaFaltante ? colors.coral : colors.primary}
                                />
                              </View>
                              <Badge
                                label={estaFaltante ? 'Faltante' : estaDanado ? 'Dañado' : 'Completo'}
                                color={estaFaltante ? colors.coral : estaDanado ? colors.gold : colors.primaryLight}
                              />
                            </View>

                            <Text style={styles.invCardNombre} numberOfLines={2}>
                              {item.nombre}
                            </Text>
                            <Text style={styles.invCardCantidad}>Cantidad: x{item.cantidad}</Text>
                            <Text style={styles.invCardCat}>{CATEGORIA_LABELS[item.categoria] || item.categoria}</Text>

                            {/* Detalle si está solicitado */}
                            {estaFaltante && (item.solicitado_en || item.solicitado_por || item.notas) ? (
                              <View style={styles.invSolicitadoBox}>
                                <Text style={styles.invSolicitadoMeta} numberOfLines={2}>
                                  Solicitado por {item.solicitado_por?.nombre || 'Personal'}
                                </Text>
                                {item.notas ? (
                                  <Text style={styles.invSolicitadoNotas} numberOfLines={2}>
                                    "{item.notas}"
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}
                          </View>

                          {/* Acciones del artículo */}
                          <View style={styles.invCardBottom}>
                            {estaFaltante ? (
                              <Button
                                title=" Marcar como repuesto"
                                variant="primary"
                                onPress={() => reponerItem(item.id)}
                                disabled={busy}
                              />
                            ) : (
                              <>
                                {!pidiendo ? (
                                  <Button
                                    title=" Solicitar reposición "
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
                                      label="Observación:"
                                      placeholder="Ej. Faltan 2..."
                                      value={notasSolicitud}
                                      onChangeText={setNotasSolicitud}
                                    />
                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                      <View style={{ flex: 1 }}>
                                        <Button
                                          title="Confirmar"
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
                    })}
                  </ScrollView>
                </View>
              );
            })()
          )}
        </Card>

        <Card elevationLevel="level2" style={styles.fotoSectionCard}>
          <View style={styles.sectionHeading}>
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
            <Text style={styles.sectionHeadingTitle}>Registro fotográfico</Text>
          </View>
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
                      {ev.incidencia?.titulo ?? 'Evidencia'}
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
        </Card>

        <Card elevationLevel="level2" style={styles.histSectionCard}>
          <View style={styles.sectionHeading}>
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <Text style={styles.sectionHeadingTitle}>Historial de cambios de estado</Text>
          </View>
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
        </Card>

        {puedeGestionar ? (
          <Card elevationLevel="level2" style={styles.estadiasSectionCard}>
            <View style={styles.sectionHeading}>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              <Text style={styles.sectionHeadingTitle}>Historial de estadías</Text>
            </View>
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
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  detailIntro: { marginBottom: 20 },
  detailOverline: { fontFamily: fonts.bodyBold, letterSpacing: 2, color: colors.primaryLight, fontSize: 10, marginBottom: 5 },
  detailIntroTitle: { fontFamily: fonts.title, fontSize: 34, color: colors.primary },
  detailIntroCaption: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 3 },
  roomHero: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 15, backgroundColor: colors.surfaceBrand, borderWidth: 1, borderColor: colors.primarySoft, padding: 22 },
  heroIcon: { width: 62, height: 62, backgroundColor: colors.white, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  roomHeroText: { flex: 1, minWidth: 160 },
  heroLabel: { fontFamily: fonts.bodyBold, letterSpacing: 1.2, fontSize: 10, color: colors.textMuted, marginBottom: 7 },
  heroRoomName: { fontFamily: fonts.serif, color: colors.primary, fontSize: 24 },
  heroRoomDetail: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, marginTop: 3 },
  roomHeroStatus: { alignItems: 'flex-start', minWidth: 120 },
  stayCard: { borderLeftWidth: 4, borderLeftColor: colors.gold },
  checkinCard: { borderTopWidth: 3, borderTopColor: colors.primaryLight },
  stateCard: { borderTopWidth: 3, borderTopColor: colors.primarySoft },
  invCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: colors.primaryLight,
    marginBottom: spacing.md,
  },
  fotoSectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  histSectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  estadiasSectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: colors.gold,
    marginBottom: spacing.md,
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginBottom: 14 },
  sectionHeadingTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.primary },
  helpText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 19 },
  stateNotice: { fontFamily: fonts.body, color: '#865713', fontSize: 12, backgroundColor: '#FFF5DD', padding: 11, borderRadius: 9, marginBottom: 13 },
  estadoIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  estadoName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  actualPill: { backgroundColor: colors.surfaceBrand, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 2 },
  actualLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
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
  estadoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, marginBottom: 4 },
  fotoPreviewWrap: {
    marginTop: spacing.sm,
  },
  estadoBtn: { flexBasis: '47%', flexGrow: 1, minWidth: 180, minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  estadoBtnActual: { borderColor: colors.primaryLight, backgroundColor: colors.surfaceAlt },
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
  carouselHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  carouselHelperText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  carouselArrows: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  invCarouselTrack: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 14,
  },
  invCardItem: {
    width: 270,
    minHeight: 280,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
    boxShadow: '0 2px 10px rgba(11, 60, 93, 0.06)',
  },
  invCardItemFaltante: {
    borderColor: `${colors.coral}88`,
    backgroundColor: '#FFFBFB',
    borderTopWidth: 3,
    borderTopColor: colors.coral,
  },
  invCardItemCompleto: {
    borderTopWidth: 3,
    borderTopColor: colors.primaryLight,
  },
  invCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invCategoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invCardNombre: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.primary,
    marginBottom: 3,
  },
  invCardCantidad: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primaryLight,
  },
  invCardCat: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  invCardBottom: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
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
  solicitarFormWrap: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  invDeleteBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs + 2,
  },
  invDeleteBtnText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.coral,
  },
});
