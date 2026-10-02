/**
 * HabitacionFormScreen — CP-HAB-01: Crear/editar habitaciones (ADMINISTRADOR o RECEPCION).
 * El número es único (10 caracteres) y el tipo sale del catálogo
 * (Simple, Doble, Matrimonial, Suite, ...). El estado NO se edita aquí:
 * los cambios de estado van por el flujo trazable del detalle
 * ("Cambiar estado"), que registra historial y fotografía.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { roomService } from '../../services/roomService';
import {
  Button,
  Card,
  ChipSelect,
  ErrorBanner,
  Input,
  Loading,
  Row,
  Screen,
  SectionTitle,
  makeErrorHandler,
} from '../../components/ui';

export default function HabitacionFormScreen({ route, navigation }) {
  const { id } = route.params || {};
  const esEditar = Boolean(id);
  const { logout } = useAuth();

  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState(null);
  const [estado, setEstado] = useState('DISPONIBLE');
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  useEffect(() => {
    (async () => {
      try {
        const ts = await roomService.tipos().catch(() => []);
        setTipos(Array.isArray(ts) ? ts : []);
        if (esEditar) {
          const h = await roomService.get(id);
          setNumero(h.numero ?? '');
          setTipo(h.tipo?.id ?? null);
          setEstado(h.estado ?? 'DISPONIBLE');
        }
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async () => {
    setError('');
    if (!numero.trim()) return setError('Ingrese el número de habitación.');
    if (!tipo) return setError('Seleccione el tipo de habitación.');

    const payload = { numero: numero.trim(), tipo };
    setSaving(true);
    try {
      if (esEditar) await roomService.update(id, payload);
      else await roomService.create(payload);
      navigation.goBack();
    } catch (e) {
      setError(onError(e) || '');
    } finally {
      setSaving(false);
    }
  };

  if (cargando) return <Loading label="Cargando habitación…" />;

  return (
    <Screen>
      <SectionTitle>{esEditar ? 'Editar habitación' : 'Nueva habitación'}</SectionTitle>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <Input
          label="Número"
          placeholder="205"
          maxLength={10}
          value={numero}
          onChangeText={setNumero}
        />
        <ChipSelect
          label="Tipo"
          options={tipos}
          value={tipo}
          onChange={setTipo}
          keyBy="id"
          labelKey="nombre"
        />
        {esEditar ? <Row label="Estado actual" value={estado} /> : null}
        <Button
          title={esEditar ? 'Guardar cambios' : 'Crear habitación'}
          onPress={guardar}
          loading={saving}
          disabled={saving}
        />
      </Card>
    </Screen>
  );
}
