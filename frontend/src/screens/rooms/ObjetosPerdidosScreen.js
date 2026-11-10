import React, { useCallback, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { lostFoundService } from '../../services/lostFoundService';
import { roomService } from '../../services/roomService';
import { colors, fonts, spacing } from '../../theme';
import { Button, Card, ChipSelect, EmptyState, ErrorBanner, Input, Loading, Screen, formatFecha, makeErrorHandler } from '../../components/ui';
import { resolveMediaUrl } from '../../utils/media';

export default function ObjetosPerdidosScreen() {
  const { user, logout } = useAuth();
  const puedeRegistrar = Boolean(user);
  const [objetos, setObjetos] = useState(null);
  const [habitaciones, setHabitaciones] = useState([]);
  const [formulario, setFormulario] = useState(false);
  const [nombre, setNombre] = useState('');
  const [habitacion, setHabitacion] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [data, listaHabitaciones] = await Promise.all([
        lostFoundService.list(),
        roomService.catalogoObjetosPerdidos(),
      ]);
      setObjetos(Array.isArray(data) ? data : []);
      setHabitaciones(Array.isArray(listaHabitaciones) ? listaHabitaciones : []);
      setError('');
    } catch (e) {
      const message = onError(e);
      if (message) setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [onError]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const seleccionarFoto = async (origen = 'galeria') => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event) => {
          const file = event.target?.files?.[0];
          if (file) setFoto({ file, uri: URL.createObjectURL(file), name: file.name, type: file.type });
        };
        input.click();
        return;
      }
      if (origen === 'camara') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') return setError('Se requiere permiso para acceder a la cámara.');
      }
      const resultado = origen === 'camara'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
      if (!resultado.canceled && resultado.assets?.length) setFoto(resultado.assets[0]);
    } catch (e) {
      const message = onError(e);
      if (message) setError(message);
    }
  };

  const abrirSelector = () => {
    if (Platform.OS === 'web') return seleccionarFoto();
    Alert.alert('Agregar fotografía', 'Selecciona el origen de la imagen.', [
      { text: 'Cámara', onPress: () => seleccionarFoto('camara') },
      { text: 'Galería', onPress: () => seleccionarFoto('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const guardar = async () => {
    setError('');
    if (!nombre.trim()) return setError('Ingrese el nombre del objeto.');
    if (!habitacion) return setError('Seleccione la habitación donde se encontró.');
    setBusy(true);
    try {
      await lostFoundService.crear({ nombre: nombre.trim(), habitacion, descripcion: descripcion.trim() }, foto);
      setNombre('');
      setHabitacion(null);
      setDescripcion('');
      setFoto(null);
      setFormulario(false);
      await load();
    } catch (e) {
      const message = onError(e);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.overline}>GESTIÓN OPERATIVA</Text>
            <Text style={styles.title}>Objetos perdidos</Text>
            <Text style={styles.description}>Registro de objetos encontrados en las instalaciones.</Text>
          </View>
          {puedeRegistrar ? (
            <TouchableOpacity style={styles.addButton} onPress={() => setFormulario((open) => !open)} accessibilityRole="button" accessibilityLabel="Registrar objeto encontrado">
              <Ionicons name={formulario ? 'close' : 'add'} size={22} color={colors.white} />
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {formulario ? (
          <Card elevationLevel="level2" style={styles.formCard}>
            <Text style={styles.formTitle}>Registrar objeto encontrado</Text>
            <Input label="Objeto" placeholder="Ej: teléfono negro" value={nombre} onChangeText={setNombre} />
            <ChipSelect
              label="Habitación donde se encontró"
              options={habitaciones}
              value={habitacion}
              onChange={setHabitacion}
              keyBy="id"
              labelKey="numero"
            />
            <Input label="Descripción" placeholder="Detalles que ayuden a identificarlo" value={descripcion} onChangeText={setDescripcion} multiline />
            <TouchableOpacity style={styles.photoButton} onPress={abrirSelector} accessibilityRole="button">
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.photoButtonText}>{foto ? 'Cambiar imagen' : 'Agregar imagen'}</Text>
            </TouchableOpacity>
            {foto?.uri ? <Image source={{ uri: foto.uri }} style={styles.preview} resizeMode="cover" /> : null}
            <Button title="Registrar objeto" onPress={guardar} loading={busy} disabled={busy} />
          </Card>
        ) : null}

        {!objetos && !error ? <Loading label="Cargando objetos…" /> : null}
        {objetos?.length === 0 && !error ? <EmptyState message="Aún no hay objetos encontrados registrados." /> : null}
        <View style={styles.list}>
          {(objetos || []).map((objeto) => (
            <Card key={objeto.id} style={styles.itemCard}>
              {objeto.imagen ? (
                <Image source={{ uri: resolveMediaUrl(objeto.imagen) }} style={styles.itemImage} resizeMode="cover" />
              ) : null}
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{objeto.nombre}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={15} color={colors.primaryLight} />
                  <Text style={styles.itemLocation}>{objeto.ubicacion}</Text>
                </View>
                {objeto.descripcion ? <Text style={styles.itemDescription}>{objeto.descripcion}</Text> : null}
                <Text style={styles.itemMeta}>{objeto.encontrado_por?.nombre || 'Equipo'} · {formatFecha(objeto.creado_en)}</Text>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 1050, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.md },
  titleCopy: { flex: 1 },
  overline: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primaryLight },
  title: { fontFamily: fonts.title, fontSize: 30, color: colors.primary },
  description: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  addButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  formCard: { marginBottom: spacing.lg, padding: spacing.lg, gap: spacing.sm },
  formTitle: { fontFamily: fonts.titleAlt, fontSize: 22, color: colors.primary, marginBottom: spacing.sm },
  photoButton: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  photoButtonText: { fontFamily: fonts.bodyBold, color: colors.primary, fontSize: 14 },
  preview: { width: '100%', height: 210, borderRadius: 8, marginBottom: spacing.md, backgroundColor: colors.surfaceAlt },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  itemCard: { width: '100%', maxWidth: 500, overflow: 'hidden', padding: 0 },
  itemImage: { width: '100%', height: 220, backgroundColor: colors.surfaceAlt },
  itemContent: { padding: spacing.md },
  itemName: { fontFamily: fonts.titleAlt, fontSize: 22, color: colors.primary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  itemLocation: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryLight },
  itemDescription: { fontFamily: fonts.body, fontSize: 14, color: colors.text, marginTop: spacing.sm },
  itemMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.md },
});