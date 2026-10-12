import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sedeService } from '../../services/sedeService';
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

export default function SedeFormScreen({ navigation, route }) {
  const { id } = route.params || {};
  const esEditar = Boolean(id);
  const { logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  const [cargando, setCargando] = useState(esEditar);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [estadoSede, setEstadoSede] = useState('Activa');

  const load = useCallback(async () => {
    if (!esEditar) return;
    try {
      const sede = await sedeService.get(id);
      setNombre(sede.nombre || '');
      setDireccion(sede.direccion || '');
      setEstadoSede(sede.activo ? 'Activa' : 'Inactiva');
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

  const guardar = useCallback(async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        activo: estadoSede === 'Activa',
      };
      if (esEditar) {
        await sedeService.update(id, payload);
      } else {
        await sedeService.create(payload);
      }
      navigation.goBack();
    } catch (e) {
      const msg = onError(e);
      if (msg) setError(msg);
      setGuardando(false);
    }
  }, [nombre, direccion, estadoSede, esEditar, id, navigation, onError]);

  if (cargando) {
    return <Loading label="Cargando sede…" />;
  }

  return (
    <Screen>
      <SectionTitle>{esEditar ? 'Editar sede' : 'Nueva sede'}</SectionTitle>
      <ErrorBanner message={error} />
      <Input
        label="Nombre *"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej: Hotel Norus Centro"
      />
      <Input
        label="Dirección"
        value={direccion}
        onChangeText={setDireccion}
        placeholder="Dirección de la sede"
      />
      <ChipSelect
        label="Estado"
        options={['Activa', 'Inactiva']}
        value={estadoSede}
        onChange={setEstadoSede}
        plain
      />
      <Button
        title={esEditar ? 'Guardar cambios' : 'Crear sede'}
        onPress={guardar}
        loading={guardando}
      />
    </Screen>
  );
}
