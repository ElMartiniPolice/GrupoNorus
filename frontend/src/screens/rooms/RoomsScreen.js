/** NORUS — Gestión de habitaciones: búsqueda y filtros sobre la API real. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { roomService } from '../../services/roomService';
import { colors, fonts, spacing, radius, roomEstadoColor } from '../../theme';
import { Badge, Card, EmptyState, ErrorBanner, Loading, Screen, makeErrorHandler } from '../../components/ui';
import { habLabel } from '../../utils/labels';

const STATES = [
  { id: 'TODAS', text: 'Todas', icon: 'grid-outline' },
  { id: 'DISPONIBLE', text: 'Disponibles', icon: 'checkmark-circle-outline' },
  { id: 'OCUPADA', text: 'Ocupadas', icon: 'bed-outline' },
  { id: 'LIMPIEZA', text: 'En limpieza', icon: 'sparkles-outline' },
  { id: 'MANTENCION', text: 'Mantención', icon: 'construct-outline' },
];
const tipoLabel = (tipo) => typeof tipo === 'object' ? (tipo?.nombre || '—') : (tipo || '—');

export default function RoomsScreen({ navigation }) {
  const { logout, user } = useAuth();
  const { width } = useWindowDimensions();
  const [rooms, setRooms] = useState(null);
  const [estado, setEstado] = useState('TODAS');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRooms(null);
    setRefreshing(true);
    try {
      const data = await roomService.list();
      setRooms(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) { const m = onError(e); if (m) setError(m); }
    finally { setRefreshing(false); }
  }, [onError]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const counts = useMemo(() => {
    const tally = { TODAS: rooms?.length || 0 };
    STATES.slice(1).forEach((s) => { tally[s.id] = (rooms || []).filter((r) => r.estado === s.id).length; });
    return tally;
  }, [rooms]);

  const filtered = useMemo(() => (rooms || []).filter((r) => {
    const matchEstado = estado === 'TODAS' || r.estado === estado;
    const matchSearch = String(habLabel(r)).toLowerCase().includes(search.trim().toLowerCase());
    return matchEstado && matchSearch;
  }), [rooms, estado, search]);

  const gridWidth = width >= 1180 ? '31.8%' : width >= 710 ? '48.7%' : '100%';
  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>CONTROL OPERATIVO</Text>
          <Text style={styles.title}>{user?.rol_nombre === 'OPERARIO' ? 'Mis habitaciones' : 'Habitaciones'}</Text>
          <Text style={styles.description}>Consulta disponibilidad, inventario y cambios de estado.</Text>
        </View>
        <View style={styles.totalPill}><Ionicons name="bed-outline" size={17} color={colors.primary} /><Text style={styles.totalText}>{counts.TODAS} habitaciones</Text></View>
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.countsRow}>
        {STATES.slice(1).map((s) => (
          <TouchableOpacity key={s.id} accessibilityRole="button" onPress={() => setEstado(estado === s.id ? 'TODAS' : s.id)} style={[styles.statusTile, estado === s.id && styles.selectedTile]}>
            <View style={[styles.statusIcon, { backgroundColor: roomEstadoColor[s.id] + '1D' }]}><Ionicons name={s.icon} color={roomEstadoColor[s.id]} size={18} /></View>
            <Text style={styles.statusNumber}>{counts[s.id]}</Text>
            <Text style={styles.statusLabel}>{s.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filtersPanel}>
        <View style={styles.searchBox}><Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput accessibilityLabel="Buscar habitación" placeholder="Buscar por número de habitación" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} style={styles.searchInput} />
          {search ? <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Limpiar búsqueda"><Ionicons name="close-circle" size={17} color={colors.textMuted} /></TouchableOpacity> : null}
        </View>
        <View style={styles.filters}>
          {STATES.map((s) => (
            <TouchableOpacity key={s.id} onPress={() => setEstado(s.id)} accessibilityRole="button" accessibilityState={{ selected: estado === s.id }} style={[styles.chip, estado === s.id && styles.chipActive]}>
              <Text style={[styles.chipText, estado === s.id && styles.chipTextActive]}>{s.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.resultHead}><Text style={styles.results}>Habitaciones encontradas: {filtered.length}</Text><Text style={styles.results}>Selecciona una para ver el detalle</Text></View>
      {!rooms && !error ? <Loading label="Cargando habitaciones…" /> : null}
      {rooms && filtered.length === 0 && !error ? <EmptyState message="No encontramos habitaciones con estos filtros." icon="⌕" /> : null}
      <View style={styles.grid}>
        {filtered.map((r) => {
          const color = roomEstadoColor[r.estado] || colors.primaryLight;
          const stateMeta = STATES.find(s => s.id === r.estado);
          return (
            <TouchableOpacity key={r.id} style={[styles.roomCard, { width: gridWidth }]} activeOpacity={0.75} accessibilityRole="button" onPress={() => navigation.navigate('RoomDetail', { id: r.id })}>
              <View style={[styles.roomStrip, { backgroundColor: color }]} />
              <View style={styles.roomInner}>
                <View style={styles.roomHeader}>
                  <View style={styles.roomIcon}><Ionicons name="bed-outline" size={21} color={colors.primary} /></View>
                  <Badge label={stateMeta?.text || r.estado || '—'} color={color} />
                </View>
                <Text style={styles.roomName}>Habitación {habLabel(r)}</Text>
                <Text style={styles.roomType}>{tipoLabel(r.tipo)}</Text>
                <View style={styles.divider} />
                <View style={styles.roomBottom}>
                  <View style={styles.roomInventory}><Ionicons name={r.items_faltantes_count > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={16} color={r.items_faltantes_count > 0 ? colors.coral : colors.primaryLight} />
                    <Text style={styles.inventoryText}>{r.items_faltantes_count > 0 ? `${r.items_faltantes_count} faltante(s)` : 'Inventario OK'}</Text>
                  </View>
                  <View style={styles.openAction}><Text style={styles.openText}>Ver detalle</Text><Ionicons name="arrow-forward" size={15} color={colors.primaryLight} /></View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 15, marginBottom: 23 },
  overline: { color: colors.primaryLight, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.7, marginBottom: 6 },
  title: { color: colors.primary, fontFamily: fonts.title, fontSize: 34 },
  description: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  totalPill: { backgroundColor: colors.surfaceBrand, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 12 },
  countsRow: { flexDirection: 'row', gap: '1.5%', rowGap: 10, flexWrap: 'wrap', marginBottom: 20 },
  statusTile: { backgroundColor: colors.white, minWidth: 140, flexBasis: '23.8%', flexGrow: 1, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 16, minHeight: 115 },
  selectedTile: { borderColor: colors.primaryLight, borderWidth: 2, backgroundColor: '#F4F9FC' },
  statusIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 9 },
  statusNumber: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.primary },
  statusLabel: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  filtersPanel: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 15, marginBottom: 17, gap: 12 },
  searchBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 13, minHeight: 44, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.primary, paddingVertical: 8, outlineStyle: 'none' },
  filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  chipTextActive: { color: colors.white },
  resultHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  results: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%', rowGap: 13 },
  roomCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', minWidth: 240, flexGrow: 1 },
  roomStrip: { height: 5 }, roomInner: { padding: 19 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  roomIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: colors.surfaceBrand, alignItems: 'center', justifyContent: 'center' },
  roomName: { fontFamily: fonts.serif, fontSize: 22, color: colors.primary },
  roomType: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  roomBottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  roomInventory: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  inventoryText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  openAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  openText: { fontFamily: fonts.bodyBold, color: colors.primaryLight, fontSize: 12 },
});
