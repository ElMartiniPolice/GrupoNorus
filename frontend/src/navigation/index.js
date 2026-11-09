/**
 * navigation — Navegación por rol (CP-DP-02).
 *
 * ADMINISTRADOR: Panel (KPIs), Tareas, Incidencias, Habitaciones, Alertas, Usuarios.
 * RECEPCION: Tareas, Incidencias, Habitaciones, Alertas.
 * OPERARIO: Habitaciones (solo las suyas) y su registro fotográfico.
 *
 * Rutas de stack (nombres exigidos por las screens existentes):
 * TaskDetail, CreateTask, IncidentDetail, CreateIncident, RoomDetail, UsuarioForm.
 * La barra inferior muestra el badge de alertas no leídas (NotificationContext).
 * El header muestra la campana de notificaciones y el botón "Salir", que
 * cierra la sesión actual (invalida el refresh token en el servidor y
 * limpia la sesión local → vuelve a la pantalla de login).
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform, useWindowDimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { NotificationBell } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import CreateTaskScreen from '../screens/tasks/CreateTaskScreen';
import IncidenciasScreen from '../screens/incidents/IncidenciasScreen';
import IncidenciaDetailScreen from '../screens/incidents/IncidenciaDetailScreen';
import CreateIncidentScreen from '../screens/incidents/CreateIncidentScreen';
import RoomsScreen from '../screens/rooms/RoomsScreen';
import RoomDetailScreen from '../screens/rooms/RoomDetailScreen';
import ObjetosPerdidosScreen from '../screens/rooms/ObjetosPerdidosScreen';
import AlertasScreen from '../screens/alertas/AlertasScreen';
import UsuariosScreen from '../screens/admin/UsuariosScreen';
import UsuarioFormScreen from '../screens/admin/UsuarioFormScreen';
import PerfilScreen from '../screens/auth/PerfilScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Icon names from @expo/vector-icons (Ionicons subset)
// Professional icon mapping using vector icons (fallback to emoji if font fails)
const TAB_ICONS = {
  Panel: 'home',
  Tareas: 'clipboard',
  Incidencias: 'alert',
  Habitaciones: 'bed',
  'Objetos perdidos': 'cube',
  Alertas: 'notifications',
  Usuarios: 'people',
  Perfil: 'person',
};

const TAB_SCREENS = {
  Panel: DashboardScreen,
  Tareas: TasksScreen,
  Habitaciones: RoomsScreen,
  Incidencias: IncidenciasScreen,
  Alertas: AlertasScreen,
  Usuarios: UsuariosScreen,
  'Objetos perdidos': ObjetosPerdidosScreen,
  Perfil: PerfilScreen,
};

function tabsForRole(rol) {
  if (rol === 'ADMINISTRADOR') {
    return ['Panel', 'Tareas', 'Habitaciones', 'Incidencias', 'Objetos perdidos', 'Alertas', 'Usuarios', 'Perfil'];
  }
  if (rol === 'RECEPCION' || rol === 'SUPERVISOR') {
    return ['Tareas', 'Habitaciones', 'Incidencias', 'Objetos perdidos', 'Alertas', 'Perfil'];
  }
  return ['Tareas', 'Incidencias', 'Objetos perdidos', 'Alertas', 'Habitaciones', 'Perfil'];
}

function TabIcon({ icon, color, badge }) {
  // Map our icon names to Ionicons names
  const iconMap = {
    home: 'home',
    clipboard: 'clipboard',
    alert: 'alert',
    bed: 'bed',
    cube: 'search-outline',
    notifications: 'notifications',
    people: 'people',
    person: 'person',
  };

  const ioniconName = iconMap[icon] || 'home';

  return (
    <View style={styles.iconWrap}>
      <Ionicons name={ioniconName} size={24} color={color} />
      {badge ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function HeaderRight() {
  const { logout } = useAuth();
  return (
    <View style={styles.headerRight}>
      <NotificationBell />
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={logout}
        accessibilityLabel="Cerrar sesión"
        accessibilityRole="button"
      >
        <Text style={styles.logoutText}>Salir</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Menú lateral visible en web ancho; permite navegar entre las rutas reales. */
function DesktopSidebar({ state, descriptors, navigation, unreadCount }) {
  const { user, logout } = useAuth();
  return (
    <View style={styles.sidebar} accessibilityLabel="Navegación principal">
      <View style={styles.sidebarBrand}>
        <Text style={styles.sidebarLogo}>NORUS</Text>
        <Text style={styles.sidebarLogoSmall}>A P A R T M E N T S</Text>
        <View style={styles.sidebarLine} />
        <Text style={styles.sidebarOverline}>CENTRO DE OPERACIONES</Text>
      </View>
      <View style={styles.sidebarLinks}>
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const label = descriptors[route.key]?.options?.title || route.name;
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={[styles.sideLink, selected && styles.sideLinkActive]}
            >
              <Ionicons name={TAB_ICONS[route.name] || 'grid-outline'} size={19} color={selected ? colors.primary : colors.primarySoft} />
              <Text style={[styles.sideLinkText, selected && styles.sideLinkTextActive]} numberOfLines={1}>{label}</Text>
              {route.name === 'Alertas' && unreadCount > 0 ? (
                <View style={styles.sideCount}><Text style={styles.sideCountText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.sidebarBottom}>
        <View style={styles.sidebarProfile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.nombre || 'N').charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.nombre || 'Usuario'}</Text>
            <Text style={styles.profileRole} numberOfLines={1}>{user?.rol_nombre || 'NORUS'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} accessibilityRole="button" style={styles.signOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.primarySoft} />
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024;
  const rol = user?.rol_nombre;
  const badge = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  return (
    <Tab.Navigator
      tabBar={(props) => desktop
        ? <DesktopSidebar {...props} unreadCount={unreadCount} />
        : <BottomTabBar {...props} />}
      sceneContainerStyle={desktop ? { marginLeft: 244 } : undefined}
      screenOptions={({ route }) => ({
        headerShown: !desktop,
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.title, fontSize: 20, letterSpacing: 1 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: desktop
          ? { position: 'absolute', left: 0, top: 0, bottom: 0, width: 244, height: '100%', borderTopWidth: 0 }
          : { backgroundColor: colors.white, borderTopColor: colors.border, height: 66, paddingTop: 5 },
        tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 11 },
        tabBarIcon: ({ color }) => (
          <TabIcon icon={TAB_ICONS[route.name]} color={color} badge={route.name === 'Alertas' ? badge : null} />
        ),
      })}
    >
      {tabsForRole(rol).map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={TAB_SCREENS[name]}
          options={{
            title: rol === 'OPERARIO' && name === 'Habitaciones' ? 'Mis Habitaciones' : name,
            headerRight: name === 'Perfil' ? undefined : () => <HeaderRight />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontFamily: fonts.title,
          fontSize: 20,
          letterSpacing: 2,
        },
        contentStyle: { backgroundColor: colors.surface },
        // Back navigation fixes
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        headerBackVisible: true,
        headerBackTitleVisible: false,
        headerBackTitle: 'Atrás',
        cardStyleInterpolator: ({ current: { progress } }) => {
          const opacity = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });
          const translateX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          });
          return {
            cardStyle: { opacity, transform: [{ translateX }] },
          };
        },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Detalle de tarea' }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ title: 'Nueva tarea', presentation: 'modal' }}
      />
      <Stack.Screen
        name="IncidentDetail"
        component={IncidenciaDetailScreen}
        options={{ title: 'Detalle de incidencia' }}
      />
      <Stack.Screen
        name="IncidenciaDetail"
        component={IncidenciaDetailScreen}
        options={{ title: 'Detalle de incidencia' }}
      />
      <Stack.Screen
        name="CreateIncident"
        component={CreateIncidentScreen}
        options={{ title: 'Nueva incidencia', presentation: 'modal' }}
      />
      <Stack.Screen
        name="RoomDetail"
        component={RoomDetailScreen}
        options={{ title: 'Habitación' }}
      />
      <Stack.Screen
        name="UsuarioForm"
        component={UsuarioFormScreen}
        options={{ title: 'Usuario', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  sidebar: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 244, zIndex: 3, backgroundColor: colors.primary, paddingHorizontal: 16, paddingTop: 34, paddingBottom: 22 },
  sidebarBrand: { paddingHorizontal: 16, marginBottom: 30 },
  sidebarLogo: { fontFamily: fonts.title, fontSize: 38, color: colors.white, letterSpacing: 3 },
  sidebarLogoSmall: { fontFamily: fonts.bodyBold, fontSize: 9, color: colors.primarySoft, letterSpacing: 2, marginTop: -4 },
  sidebarLine: { height: 1, backgroundColor: '#52758D', marginVertical: 23 },
  sidebarOverline: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.4, color: colors.primarySoft },
  sidebarLinks: { flex: 1, gap: 5 },
  sideLink: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 46, borderRadius: 11, paddingHorizontal: 15 },
  sideLinkActive: { backgroundColor: colors.white },
  sideLinkText: { flex: 1, fontFamily: fonts.bodyBold, color: '#D3E5F1', fontSize: 14 },
  sideLinkTextActive: { color: colors.primary },
  sideCount: { backgroundColor: colors.coral, minWidth: 21, minHeight: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sideCountText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 11 },
  sidebarBottom: { borderTopWidth: 1, borderTopColor: '#52758D', paddingTop: 20 },
  sidebarProfile: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginBottom: 15 },
  avatar: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white },
  profileName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white },
  profileRole: { fontFamily: fonts.body, fontSize: 10, color: colors.primarySoft },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  signOutText: { fontFamily: fonts.body, color: colors.primarySoft, fontSize: 13 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textMuted,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 30,
  },
  icon: {
    fontSize: 18,
  },
  iconFallback: {
    fontSize: 24,
  },
  iconBadge: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: colors.coral,
    borderRadius: 999,
    minWidth: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fonts.bodyBold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 4,
  },
  logoutText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.bodyBold,
  },
});
