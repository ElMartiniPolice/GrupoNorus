import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryService } from '../../services/inventoryService';
import { roomService } from '../../services/roomService';
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

export default function InventoryFormScreen({ navigation, route }) {
  const { id } = route.params || {};
  const esEditar = Boolean(id);
  const { logout } = useAuth();
  const onError = useMemo(() => makeErrorHandler(logout), [logout]);

  const [cargando, setCargando] = useState(esEditar);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [notas, setNotas] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [habitacionId, setHabitacionId] = useState('');
  const [sedes, setSedes] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);

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
      const item = await inventoryService.get(id);
      setNombre(item.nombre || '');
      setCategoria(item.categoria || '');
      setCantidad(item.cantidad != null ? String(item.cantidad) : '');
      setStockMinimo(
        item.stock_minimo != null ? String(item.stock_minimo) : '',
      );
      setNotas(item.notas || '');
      setSedeId(item.sede ? String(item.sede.id) : '');
      setHabitacionId(item.habitacion ? String(item.habitacion.id) : '');
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
    const cant = Number.parseInt(cantidad, 10);
    const minimo = Number.parseInt(stockMinimo, 10);
    if (Number.isNaN(cant) || cant < 0) {
      setError('La cantidad debe ser un número entero mayor o igual a 0.');
      return;
    }
    if (Number.isNaN(minimo) || minimo < 0) {
      setError('El stock mínimo debe ser un número entero mayor o igual a 0.');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        categoria: categoria.trim(),
        cantidad: cant,
        stock_minimo: minimo,
        notas: notas.trim(),
      };
      if (sedeId) payload.sede = sedeId;
      if (habitacionId) payload.habitacion = habitacionId;
      if (esEditar) {
        await inventoryService.update(id, payload);
      } else {
        await inventoryService.create(payload);
      }
      navigation.goBack();
    } catch (e) {
      const msg = onError(e);
      if (msg) setError(msg);
      setGuardando(false);
    }
  }, [
    nombre,
    categoria,
    cantidad,
    stockMinimo,
    notas,
    sedeId,
    habitacionId,
    esEditar,
    id,
    navigation,
    onError,
  ]);

  if (cargando) {
    return <Loading label="Cargando artículo…" />;
  }

  return (
    <Screen>
      <SectionTitle>
        {esEditar ? 'Editar artículo' : 'Nuevo artículo de inventario'}
      </SectionTitle>
      <ErrorBanner message={error} />
      <Input
        label="Nombre *"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej: Toallas de baño"
      />
      <Input
        label="Categoría"
        value={categoria}
        onChangeText={setCategoria}
        placeholder="Ej: Amoblado, blancos…"
      />
      <Input
        label="Cantidad"
        value={cantidad}
        onChangeText={setCantidad}
        keyboardType="number-pad"
      />
      <Input
        label="Stock mínimo"
        value={stockMinimo}
        onChangeText={setStockMinimo}
        keyboardType="number-pad"
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
      <Input label="Notas" value={notas} onChangeText={setNotas} multiline />
      <Button
        title={esEditar ? 'Guardar cambios' : 'Crear artículo'}
        onPress={guardar}
        loading={guardando}
      />
    </Screen>
  );
}
