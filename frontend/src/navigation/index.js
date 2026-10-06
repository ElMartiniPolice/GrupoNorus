/**
 * navigation — Navegación por rol (CP-DP-02).
 *
 * ADMINISTRADOR: Panel (KPIs), Tareas, Incidencias, Habitaciones, Alertas, Usuarios.
 * RECEPCION: Tareas, Incidencias, Habitaciones, Alertas.
 * OPERARIO: Habitaciones (solo las suyas) y su registro fotográfico.
 *
 * Rutas de stack (nombres exigidos por las screens existentes):
 * TaskDetail, CreateTask, IncidentDetail, CreateIncident, RoomDetail,
 * HabitacionForm, UsuarioForm, Privacy, AdminSolicitudes.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
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
import HistorialHabitacionesScreen from '../screens/admin/HistorialHabitacionesScreen';
import PrivacyScreen from '../screens/privacy/PrivacyScreen';
import AdminSolicitudesScreen from '../screens/privacy/AdminSolicitudesScreen';

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

function makeTabBarIcon(icon, badge) {
  return function TabBarIconRenderer({ color }) {
    return <TabIcon icon={icon} color={color} badge={badge} />;
  };
}

function HeaderRight() {
  const { logout } = useAuth();
  const navigation = useNavigation();
  return (
    <View style={styles.headerRight}>
      <TouchableOpacity
        style={styles.privacyBtn}
        onPress={() => navigation.navigate('Privacy')}
        accessibilityLabel="Abrir privacidad"
        accessibilityRole="button"
      >
        <Text style={styles.privacyText}>Privacidad</Text>
      </TouchableOpacity>
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
  let badge = null;
  if (unreadCount > 0) {
    badge = unreadCount > 9 ? '9+' : String(unreadCount);
  }

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
            headerRight: HeaderRight,
            tabBarIcon: makeTabBarIcon(TAB_ICONS[name], name === 'Alertas' ? badge : null),
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
        name="HistorialHabitaciones"
        component={HistorialHabitacionesScreen}
        options={{ title: 'Historial de habitaciones' }}
      />
      <Stack.Screen
        name="UsuarioForm"
        component={UsuarioFormScreen}
        options={{ title: 'Usuario', presentation: 'modal' }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ title: 'Privacidad' }}
      />
      <Stack.Screen
        name="AdminSolicitudes"
        component={AdminSolicitudesScreen}
        options={{ title: 'Solicitudes de derechos' }}
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
  privacyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 4,
  },
  privacyText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.bodyBold,
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
