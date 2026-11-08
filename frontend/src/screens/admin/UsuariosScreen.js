/**
 * UsuariosScreen — CP-USR-01: Gestión de usuarios con diseño moderno NORUS.
 * Lista usuarios en tarjetas responsivas con filtro por rol y buscador.
 */
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { colors, fonts, spacing, radius } from '../../theme';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Loading,
  Screen,
  makeErrorHandler,
} from '../../components/ui';
import { formatearRut } from '../../utils/rut';

const ROLE_TILES = [
  { id: 'TODOS', text: 'Todos', icon: 'people-outline' },
  { id: 'ADMINISTRADOR', text: 'Administradores', icon: 'shield-checkmark-outline' },
  { id: 'RECEPCION', text: 'Recepción', icon: 'desktop-outline' },
  { id: 'OPERARIO', text: 'Operarios', icon: 'construct-outline' },
];

function rolColor(rol) {
  switch (rol) {
    case 'ADMINISTRADOR':
      return colors.primary;
    case 'RECEPCION':
      return colors.primaryLight;
    case 'OPERARIO':
      return colors.gold;
    default:
      return colors.textMuted;
  }
}

export default function UsuariosScreen({ navigation }) {
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const [usuarios, setUsuarios] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [rol, setRol] = useState('TODOS');
  const [search, setSearch] = useState('');
  const onError = useCallback(makeErrorHandler(logout), [logout]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setUsuarios(null);
      setRefreshing(true);
      try {
        const [us, rs] = await Promise.all([
          userService.list(),
          userService.roles().catch(() => []),
        ]);
        setUsuarios(Array.isArray(us) ? us : []);
        setRoles(Array.isArray(rs) ? rs : []);
        setError('');
      } catch (e) {
        const m = onError(e);
        if (m) setError(m);
      } finally {
        setRefreshing(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const counts = useMemo(() => {
    const tally = { TODOS: usuarios?.length || 0 };
    ROLE_TILES.slice(1).forEach((r) => {
      tally[r.id] = (usuarios || []).filter((u) => u.rol_nombre === r.id).length;
    });
    return tally;
  }, [usuarios]);

  const visibles = useMemo(() => {
    return (usuarios || []).filter((u) => {
      const matchRol = rol === 'TODOS' || u.rol_nombre === rol;
      const term = search.trim().toLowerCase();
      const fullName = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
      const matchSearch =
        !term ||
        fullName.includes(term) ||
        String(u.rut || '').toLowerCase().includes(term) ||
        String(u.area_nombre || '').toLowerCase().includes(term) ||
        String(u.email || '').toLowerCase().includes(term);
      return matchRol && matchSearch;
    });
  }, [usuarios, rol, search]);

  const cardWidth = width >= 1180 ? '31.8%' : width >= 720 ? '48.7%' : '100%';

  return (
    <View style={styles.wrap}>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        {/* Header Hero */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>ADMINISTRACIÓN / PERSONAL</Text>
            <Text style={styles.title}>Equipo y Usuarios</Text>
            <Text style={styles.description}>
              Control de acceso, roles y áreas operativas del personal hotelero.
            </Text>
          </View>
          <View style={styles.totalPill}>
            <Ionicons name="people-outline" size={17} color={colors.primary} />
            <Text style={styles.totalText}>{counts.TODOS} registrados</Text>
          </View>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {/* Tiles por Rol */}
        <View style={styles.countsRow}>
          {ROLE_TILES.map((r) => {
            const isSelected = rol === r.id;
            const tint = r.id === 'TODOS' ? colors.primary : rolColor(r.id);
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setRol(isSelected && r.id !== 'TODOS' ? 'TODOS' : r.id)}
                style={[styles.statusTile, isSelected && styles.selectedTile]}
              >
                <View style={[styles.statusIcon, { backgroundColor: tint + '1F' }]}>
                  <Ionicons name={r.icon} color={tint} size={18} />
                </View>
                <Text style={styles.statusNumber}>{counts[r.id] ?? 0}</Text>
                <Text style={styles.statusLabel}>{r.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Buscador */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Buscar por nombre, RUT, correo o área…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {!usuarios && !error ? <Loading label="Cargando usuarios…" /> : null}
        {usuarios && visibles.length === 0 && !error ? (
          <EmptyState message="No hay usuarios que coincidan con la búsqueda." />
        ) : null}

        {/* Grid de Tarjetas de Usuarios */}
        <View style={styles.grid}>
          {visibles.map((u) => {
            const tint = rolColor(u.rol_nombre);
            const rutTxt = u.rut ? formatearRut(u.rut) || u.rut : '—';
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.userCard, { width: cardWidth }]}
                onPress={() => navigation.navigate('UsuarioForm', { id: u.id })}
                activeOpacity={0.88}
              >
                <View style={[styles.cardStrip, { backgroundColor: tint }]} />
                <View style={styles.cardInner}>
                  <View style={styles.cardHead}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(u.nombre || u.username || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {[u.nombre, u.apellido].filter(Boolean).join(' ') || u.username}
                      </Text>
                      <Text style={styles.userRut}>RUT: {rutTxt}</Text>
                    </View>
                    <Badge
                      label={u.is_active !== false ? 'Activo' : 'Inactivo'}
                      color={u.is_active !== false ? colors.primaryLight : colors.textMuted}
                    />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardFoot}>
                    <View style={[styles.roleBadge, { backgroundColor: tint + '18' }]}>
                      <Text style={[styles.roleBadgeText, { color: tint }]}>
                        {u.rol_nombre || 'Sin rol'}
                      </Text>
                    </View>
                    {u.area_nombre ? (
                      <View style={styles.areaPill}>
                        <Ionicons name="business-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.areaPillText}>{u.area_nombre}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Screen>

      {/* FAB para crear usuario */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('UsuarioForm')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,
  },
  overline: {
    color: colors.primaryLight,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.7,
    marginBottom: 5,
  },
  title: { color: colors.primary, fontFamily: fonts.title, fontSize: 32 },
  description: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 3 },
  totalPill: {
    backgroundColor: colors.surfaceBrand,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 12 },
  countsRow: { flexDirection: 'row', gap: '1.5%', rowGap: 10, flexWrap: 'wrap', marginBottom: 18 },
  statusTile: {
    backgroundColor: colors.white,
    minWidth: 125,
    flexBasis: '23.5%',
    flexGrow: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    minHeight: 100,
  },
  selectedTile: { borderColor: colors.primaryLight, borderWidth: 2, backgroundColor: '#F4F9FC' },
  statusIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusNumber: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.primary },
  statusLabel: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  searchBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 42,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.primary,
    paddingVertical: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%', rowGap: 14 },
  userCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minWidth: 240,
    flexGrow: 1,
  },
  cardStrip: { height: 4 },
  cardInner: { padding: 16 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.primary,
  },
  userName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.primary,
  },
  userRut: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  roleBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  areaPillText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { fontSize: 30, color: colors.primary, fontFamily: fonts.bodyBold },
});
