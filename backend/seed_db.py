"""
Script de poblamiento de la base de datos — Grupo Norus.

Uso:
    python seed_db.py

Crea datos de demostración idempotentes (get_or_create / update_or_create):
sedes, roles, áreas, usuarios, tipos de habitación, habitaciones,
estadías, tareas, incidencias, inventario, objetos perdidos,
aviso de privacidad y notificaciones.
"""
import os
from datetime import date, timedelta

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.utils import timezone  # noqa: E402

from apps.users.models import Area, Rol, Usuario  # noqa: E402
from apps.sedes.models import Sede  # noqa: E402
from apps.rooms.models import (  # noqa: E402
    CambioEstadoHabitacion,
    Habitacion,
    RegistroEstadia,
    TipoHabitacion,
)
from apps.tasks.models import AsignacionTarea, HistorialEstadoTarea  # noqa: E402
from apps.incidents.models import Incidencia  # noqa: E402
from apps.inventory.models import InventarioItem  # noqa: E402
from apps.lostobjects.models import ObjetoPerdido  # noqa: E402
from apps.notifications.models import Notificacion  # noqa: E402
from apps.privacy.models import AvisoPrivacidad, Consentimiento  # noqa: E402


def run():
    # ------------------------------------------------------------------ Sedes
    sede_centro, _ = Sede.objects.get_or_create(
        nombre='Sede Centro',
        defaults={'direccion': 'Av. Libertador 1234, Santiago'},
    )
    sede_norte, _ = Sede.objects.get_or_create(
        nombre='Sede Norte',
        defaults={'direccion': 'Calle Los Aromos 456, Huechuraba'},
    )

    # ------------------------------------------------------------------ Roles
    rol_admin, _ = Rol.objects.get_or_create(nombre='ADMINISTRADOR')
    rol_operario, _ = Rol.objects.get_or_create(nombre='OPERARIO')
    rol_recepcion, _ = Rol.objects.get_or_create(nombre='RECEPCION')

    # ------------------------------------------------------------------ Áreas
    area_recepcion, _ = Area.objects.get_or_create(nombre='RECEPCION')
    area_mantencion, _ = Area.objects.get_or_create(nombre='MANTENCION')
    area_housekeeping, _ = Area.objects.get_or_create(nombre='HOUSEKEEPING')

    # --------------------------------------------------------------- Usuarios
    def crear_usuario(rut, nombre, apellido, rol, area, sede, password,
                      staff=False, superuser=False):
        usuario, creado = Usuario.objects.get_or_create(
            rut=rut,
            defaults={
                'nombre': nombre,
                'apellido': apellido,
                'rol': rol,
                'area': area,
                'sede': sede,
                'is_staff': staff,
                'is_superuser': superuser,
            },
        )
        if creado:
            usuario.set_password(password)
            usuario.save()
        return usuario

    admin = crear_usuario(
        '11111111-1', 'Ana', 'Administradora', rol_admin, area_recepcion,
        sede_centro, 'admin123', staff=True, superuser=True,
    )
    recep = crear_usuario(
        '22222222-2', 'Rosa', 'Recepcionista', rol_recepcion, area_recepcion,
        sede_centro, 'recep123',
    )
    operario1 = crear_usuario(
        '33333333-3', 'Oscar', 'Operario', rol_operario, area_housekeeping,
        sede_centro, 'oper123',
    )
    operario2 = crear_usuario(
        '44444444-4', 'Mario', 'Mantenedor', rol_operario, area_mantencion,
        sede_norte, 'oper123',
    )

    # ------------------------------------------------------- Tipos habitación
    tipo_simple, _ = TipoHabitacion.objects.get_or_create(nombre='Simple')
    tipo_doble, _ = TipoHabitacion.objects.get_or_create(nombre='Doble')
    tipo_suite, _ = TipoHabitacion.objects.get_or_create(nombre='Suite')

    # ------------------------------------------------------------ Habitaciones
    habitaciones = []
    for sede, prefijo in ((sede_centro, '1'), (sede_norte, '2')):
        for i in range(1, 7):
            numero = f'{prefijo}0{i}'
            tipo = tipo_simple if i <= 3 else (tipo_doble if i <= 5 else tipo_suite)
            hab, _ = Habitacion.objects.get_or_create(
                sede=sede,
                numero=numero,
                defaults={'tipo': tipo, 'estado': 'DISPONIBLE'},
            )
            habitaciones.append(hab)

    # Estados variados de demostración
    habitaciones[1].estado = 'OCUPADA'
    habitaciones[1].save()
    habitaciones[2].estado = 'LIMPIEZA'
    habitaciones[2].save()
    habitaciones[7].estado = 'MANTENCION'
    habitaciones[7].save()

    # ---------------------------------------------------------------- Estadías
    hoy = date.today()
    RegistroEstadia.objects.get_or_create(
        habitacion=habitaciones[1],
        huesped='Juan Pérez',
        llegada=hoy - timedelta(days=1),
        salida=None,
        defaults={'salida_prevista': hoy + timedelta(days=2)},
    )
    RegistroEstadia.objects.get_or_create(
        habitacion=habitaciones[0],
        huesped='María González',
        llegada=hoy - timedelta(days=5),
        salida=hoy - timedelta(days=2),
        defaults={'salida_prevista': hoy - timedelta(days=2)},
    )

    # ------------------------------------------------- Historial cambios estado
    CambioEstadoHabitacion.objects.get_or_create(
        habitacion=habitaciones[2],
        estado_anterior='OCUPADA',
        estado_nuevo='LIMPIEZA',
        cambiado_por=operario1,
    )

    # ------------------------------------------------------------------ Tareas
    tarea1, _ = AsignacionTarea.objects.get_or_create(
        titulo='Limpieza profunda habitación 103',
        habitacion=habitaciones[2],
        asignado_a=operario1,
        defaults={
            'descripcion': 'Limpieza completa tras check-out.',
            'prioridad': 'ALTA',
            'estado': 'EN_PROGRESO',
        },
    )
    tarea2, _ = AsignacionTarea.objects.get_or_create(
        titulo='Reparar grifería habitación 202',
        habitacion=habitaciones[7],
        asignado_a=operario2,
        defaults={
            'descripcion': 'La ducha gotea constantemente.',
            'prioridad': 'CRITICA',
            'estado': 'PENDIENTE',
        },
    )
    HistorialEstadoTarea.objects.get_or_create(
        tarea=tarea1, estado_nuevo='EN_PROGRESO', usuario=operario1,
    )

    # ------------------------------------------------------------- Incidencias
    Incidencia.objects.get_or_create(
        titulo='Aire acondicionado no funciona',
        habitacion=habitaciones[7],
        reportado_por=recep,
        defaults={
            'descripcion': 'El equipo no enciende desde ayer.',
            'severidad': 'CRITICO',
            'requiere_evidencia': True,
        },
    )
    Incidencia.objects.get_or_create(
        titulo='Ampolleta quemada en baño',
        habitacion=habitaciones[0],
        reportado_por=operario1,
        defaults={'severidad': 'BAJO'},
    )

    # -------------------------------------------------------------- Inventario
    InventarioItem.objects.get_or_create(
        nombre='Toallas de baño',
        sede=sede_centro,
        defaults={'categoria': 'Ropa de cama', 'cantidad': 50, 'stock_minimo': 20},
    )
    InventarioItem.objects.get_or_create(
        nombre='Jabón de tocador',
        sede=sede_centro,
        defaults={'categoria': 'Amenities', 'cantidad': 15, 'stock_minimo': 30},
    )
    InventarioItem.objects.get_or_create(
        nombre='Destornillador Phillips',
        sede=sede_norte,
        defaults={'categoria': 'Herramientas', 'cantidad': 4, 'stock_minimo': 2},
    )

    # ---------------------------------------------------------- Objetos perdidos
    ObjetoPerdido.objects.get_or_create(
        titulo='Cargador de celular USB-C',
        sede=sede_centro,
        habitacion=habitaciones[0],
        defaults={
            'descripcion': 'Encontrado bajo la cama tras check-out.',
            'categoria': 'Electrónica',
            'ubicacion': 'Recepción',
            'reportado_por': operario1,
        },
    )

    # ------------------------------------------------- Aviso de privacidad (L21.719)
    aviso, _ = AvisoPrivacidad.objects.get_or_create(
        version='1.0',
        defaults={
            'titulo': 'Aviso de Privacidad Grupo Norus',
            'contenido': (
                'En cumplimiento de la Ley N° 21.719, informamos que los '
                'datos personales recopilados serán utilizados exclusivamente '
                'para la gestión operativa del apart-hotel.'
            ),
            'vigente_desde': timezone.now(),
            'activo': True,
        },
    )
    Consentimiento.objects.get_or_create(usuario=admin, aviso=aviso)

    # ------------------------------------------------------------ Notificaciones
    Notificacion.objects.get_or_create(
        usuario=admin,
        sede=sede_norte,
        titulo='Incidencia crítica reportada',
        defaults={'mensaje': 'Aire acondicionado no funciona en habitación 202.'},
    )

    # ------------------------------------------------------------------ Resumen
    print('Seed completado:')
    print(f'  Sedes:          {Sede.objects.count()}')
    print(f'  Usuarios:       {Usuario.objects.count()}')
    print(f'  Habitaciones:   {Habitacion.objects.count()}')
    print(f'  Estadías:       {RegistroEstadia.objects.count()}')
    print(f'  Tareas:         {AsignacionTarea.objects.count()}')
    print(f'  Incidencias:    {Incidencia.objects.count()}')
    print(f'  Inventario:     {InventarioItem.objects.count()}')
    print(f'  Objetos perd.:  {ObjetoPerdido.objects.count()}')
    print(f'  Notificaciones: {Notificacion.objects.count()}')
    print()
    print('Credenciales de prueba (RUT / contraseña):')
    print('  11111111-1 / admin123  (ADMINISTRADOR)')
    print('  22222222-2 / recep123  (RECEPCION)')
    print('  33333333-3 / oper123   (OPERARIO - housekeeping)')
    print('  44444444-4 / oper123   (OPERARIO - mantención)')


if __name__ == '__main__':
    run()
