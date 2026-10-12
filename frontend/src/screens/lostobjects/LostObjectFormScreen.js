import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { lostObjectService } from '../../services/lostObjectService';
import { roomService } from '../../services/roomService';
import { sedeService } from '../../services/sedeService';
import { imagenUri } from '../../utils/imagen';
import { colors, fonts, spacing } from '../../theme';
import {
  Button,
  ChipSelect,
  ErrorBanner,
  Input,
  Loading,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';

export default function LostObjectFormScreen({ navigation, route }) {
  const { id } = route.params || {};
  const esEditar = Boolean(id);
  const { logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  const [cargando, setCargando] = useState(esEditar);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [habitacionId, setHabitacionId] = useState('');
  const [sedes, setSedes] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [foto, setFoto] = useState(null);
  const [imagenActual, setImagenActual] = useState(null);

  useEffect(() => {
    let alive = true;
    sedeService
      .list()
      .then((data) => {
        if (alive) setSedes(data);
      })
      .catch(() => {});
    roomService
      .list()
      .then((data) => {
        if (alive) setHabitaciones(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!esEditar) return;
    try {
      const obj = await lostObjectService.get(id);
      setTitulo(obj.titulo || '');
      setDescripcion(obj.descripcion || '');
      setCategoria(obj.categoria || '');
      setUbicacion(obj.ubicacion || '');
      setSedeId(obj.sede ? String(obj.sede.id) : '');
      setHabitacionId(obj.habitacion ? String(obj.habitacion.id) : '');
      setImagenActual(obj.imagen || null);
    } catch (e) {
      const msg = onError(e);
      if (msg) setError(msg);
    } finally {
      setCargando(false);
    }
  }, [id, esEditar, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const elegirImagen = useCallback(async (usarCamara) => {
    try {
      if (usarCamara) {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
          setError('Se necesita permiso de cámara para tomar la foto.');
          return;
        }
      }
      const opciones = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      };
      const resultado = usarCamara
        ? await ImagePicker.launchCameraAsync(opciones)
        : await ImagePicker.launchImageLibraryAsync(opciones);
      if (resultado.canceled || !resultado.assets?.length) return;
      setFoto(resultado.assets[0]);
      setError('');
    } catch (e) {
      const msg = onError(e);
      setError(msg || 'No se pudo cargar la imagen.');
    }
  }, [onError]);

  const guardar = useCallback(async () => {
    if (!titulo.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria: categoria.trim(),
        ubicacion: ubicacion.trim(),
      };
      if (sedeId) payload.sede = sedeId;
      if (habitacionId) payload.habitacion = habitacionId;
      if (foto) payload.imagen = foto;
      if (esEditar) {
        await lostObjectService.update(id, payload);
      } else {
        await lostObjectService.create(payload);
      }
      navigation.goBack();
    } catch (e) {
      const msg = onError(e);
      if (msg) setError(msg);
      setGuardando(false);
    }
  }, [
    titulo,
    descripcion,
    categoria,
    ubicacion,
    sedeId,
    habitacionId,
    foto,
    esEditar,
    id,
    navigation,
    onError,
  ]);

  if (cargando) {
    return <Loading label="Cargando objeto…" />;
  }

  const previewUri = foto?.uri || imagenUri(imagenActual);

  return (
    <Screen>
      <SectionTitle>
        {esEditar ? 'Editar objeto perdido' : 'Registrar objeto perdido'}
      </SectionTitle>
      <ErrorBanner message={error} />
      <Input
        label="Título *"
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Ej: Cartera de cuero"
      />
      <Input
        label="Categoría"
        value={categoria}
        onChangeText={setCategoria}
        placeholder="Ej: Documentos, electrónica…"
      />
      <Input
        label="Ubicación"
        value={ubicacion}
        onChangeText={setUbicacion}
        placeholder="Dónde se encontró"
      />
      <Input
        label="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />
      <ChipSelect
        label="Sede"
        options={sedes}
        value={sedeId}
        onChange={setSedeId}
      />
      <ChipSelect
        label="Habitación"
        options={habitaciones}
        value={habitacionId}
        onChange={setHabitacionId}
        keyBy="id"
        labelKey="numero"
      />

      <Text style={styles.imagenTitulo}>Imagen del objeto</Text>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.vistaPrevia} />
      ) : (
        <View style={[styles.vistaPrevia, styles.vistaPreviaVacia]}>
          <Text style={styles.vistaPreviaTexto}>Sin imagen adjunta</Text>
        </View>
      )}
      <View style={styles.imagenBotones}>
        <Button
          title="Galería"
          variant="secondary"
          onPress={() => elegirImagen(false)}
          style={styles.botonImagen}
        />
        <Button
          title="Cámara"
          variant="secondary"
          onPress={() => elegirImagen(true)}
          style={styles.botonImagen}
        />
      </View>

      <Button
        title={esEditar ? 'Guardar cambios' : 'Registrar objeto'}
        onPress={guardar}
        loading={guardando}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  imagenTitulo: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  vistaPrevia: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  vistaPreviaVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  vistaPreviaTexto: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.hint,
  },
  imagenBotones: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  botonImagen: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});
