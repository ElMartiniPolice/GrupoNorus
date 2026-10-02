/**
 * navigation — Navegación por rol (CP-DP-02).
 *
 * ADMINISTRADOR: Panel (KPIs), Tareas, Incidencias, Habitaciones, Alertas, Usuarios.
 * RECEPCION: Tareas, Incidencias, Habitaciones, Alertas.
 * OPERARIO: Habitaciones (solo las suyas) y su registro fotográfico.
 *
 * Rutas de stack (nombres exigidos por las screens existentes):
 * TaskDetail, CreateTask, IncidentDetail, CreateIncident, RoomDetail,
 * HabitacionForm, UsuarioForm.
 * La barra inferior muestra el badge de alertas no leídas (NotificationContext).
 * El header muestra la campana de notificaciones y el botón "Salir", que
 * cierra la sesión actual (invalida el refresh token en el servidor y
 * limpia la sesión local → vuelve a la pantalla de login).
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import HabitacionFormScreen from '../screens/rooms/HabitacionFormScreen';
import AlertasScreen from '../screens/alertas/AlertasScreen';
import UsuariosScreen from '../screens/admin/UsuariosScreen';
import UsuarioFormScreen from '../screens/admin/UsuarioFormScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Panel: '✦',
  Tareas: '✓',
  Incidencias: '⚠',
  Habitaciones: '⌂',
  Alertas: '🔔',
  Usuarios: '👤',
};

const TAB_SCREENS = {
  Panel: DashboardScreen,
  Tareas: TasksScreen,
  Incidencias: IncidenciasScreen,
  Habitaciones: RoomsScreen,
  Alertas: AlertasScreen,
  Usuarios: UsuariosScreen,
};

function tabsForRole(rol) {
  if (rol === 'ADMINISTRADOR') {
    return ['Panel', 'Tareas', 'Incidencias', 'Habitaciones', 'Alertas', 'Usuarios'];
  }
  if (rol === 'RECEPCION') {
    return ['Tareas', 'Incidencias', 'Habitaciones', 'Alertas'];
  }
  // CP-DP-02 — OPERARIO: solo sus habitaciones y su registro fotográfico.
  return ['Habitaciones'];
}

function TabIcon({ icon, color, badge }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
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

function MainTabs() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const rol = user?.rol_nombre;
  const badge = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontFamily: fonts.title,
          fontSize: 20,
          letterSpacing: 2,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: '#DCE2E6',
          height: 60,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 11 },
      }}
    >
      {tabsForRole(rol).map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={TAB_SCREENS[name]}
          options={{
            title:
              rol === 'OPERARIO' && name === 'Habitaciones'
                ? 'Mis Habitaciones'
                : name,
            headerRight: () => <HeaderRight />,
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={TAB_ICONS[name]}
                color={color}
                badge={name === 'Alertas' ? badge : null}
              />
            ),
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
        name="HabitacionForm"
        component={HabitacionFormScreen}
        options={{ title: 'Habitación', presentation: 'modal' }}
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
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 30,
  },
  icon: {
    fontSize: 18,
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
