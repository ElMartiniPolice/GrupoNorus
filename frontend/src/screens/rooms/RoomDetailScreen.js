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
import { StyleSheet, Text, View, Image } from 'react-native';
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
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [huesped, setHuesped] = useState('');
  const [llegada, setLlegada] = useState(fechaISO(new Date()));
  const [salida, setSalida] = useState(fechaISO(new Date(Date.now() + 86400000)));
  const onError = makeErrorHandler('cargar la habitación');

  const load = useCallback(async () => {
    try {
      const [r, es, ev, ca] = await Promise.all([
        roomService.get(id),
        roomService.estadias({ habitacion: id }).catch(() => []),
        evidenceService.porHabitacion(id).catch(() => []),
        roomService.cambiosEstado(id).catch(() => []),
      ]);
      setRoom(r);
      setEstadias(Array.isArray(es) ? es : []);
      setEvidencias(Array.isArray(ev) ? ev : []);
      setCambios(Array.isArray(ca) ? ca : []);
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

      <Card>
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
        <Card>
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
        <Card>
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
        <Card>
          <View style={styles.head}>
            <Text style={styles.subtitulo}>Cambiar estado</Text>
          </View>
          <Button
            title={foto ? 'Cambiar fotografía adjunta' : 'Adjuntar fotografía (opcional)'}
            variant="ghost"
            onPress={pickFoto}
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
    backgroundColor: '#ECECEC',
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
});
