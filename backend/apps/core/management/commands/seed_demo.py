"""
Comando de carga de datos demo — Grupo Norus.

Pobla la base de datos con roles, áreas, usuarios, habitaciones,
estadías, tareas, incidencias, evidencias y notificaciones de
ejemplo, permitiendo probar los casos de uso (CU1–CU10), las
alertas en tiempo real (CP-ALE-01) y el panel de KPIs (CP-ADM-01).

Uso:
    python manage.py seed_demo

Es idempotente: puede ejecutarse varias veces sin duplicar datos.
Todos los usuarios demo usan la contraseña «norus123».
"""
from datetime import timedelta
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone
from PIL import Image

from apps.evidence.models import EvidenciaFotografica
from apps.incidents.models import Incidencia
from apps.notifications.models import Notificacion
from apps.rooms.models import Habitacion, ItemInventario, PlantillaInventario, RegistroEstadia, TipoHabitacion
from apps.rooms.services import aplicar_plantilla_a_habitacion
from apps.tasks.models import AsignacionTarea, HistorialEstadoTarea
from apps.users.models import Area, Rol, Usuario

PASSWORD_DEMO = 'norus123'


class Command(BaseCommand):
    """Carga datos demo idempotentes para pruebas y presentación (CP-ADM-01)."""

    help = (
        'Carga datos demo: roles, áreas, usuarios, habitaciones, estadías, '
        'tareas, incidencias, evidencias y notificaciones.'
    )

    def handle(self, *args, **options):
        hoy = timezone.localdate()
        ahora = timezone.now()

        # ------------------------------------------------------------------
        # 1. Roles y áreas (CP-USR-01)
        # ------------------------------------------------------------------
        rol_admin, _ = Rol.objects.get_or_create(nombre='ADMINISTRADOR')
        rol_operario, _ = Rol.objects.get_or_create(nombre='OPERARIO')
        rol_recepcion, _ = Rol.objects.get_or_create(nombre='RECEPCION')

        area_recepcion, _ = Area.objects.get_or_create(nombre='RECEPCION')
        area_mantencion, _ = Area.objects.get_or_create(nombre='MANTENCION')
        area_housekeeping, _ = Area.objects.get_or_create(nombre='HOUSEKEEPING')

        # ------------------------------------------------------------------
        # 2. Usuarios demo (CP-AUT-01) — contraseña: norus123
        # ------------------------------------------------------------------
        def crear_usuario(rut, nombre, apellido, rol, area, telefono='', is_staff=False):
            usuario = Usuario.objects.filter(rut=rut).first()
            if usuario is None:
                usuario = Usuario.objects.create_user(
                    rut=rut,
                    password=PASSWORD_DEMO,
                    nombre=nombre,
                    apellido=apellido,
                    telefono=telefono,
                    rol=rol,
                    area=area,
                    is_staff=is_staff,
                )
            return usuario

        admin = crear_usuario(
            '11111111-1', 'María', 'González', rol_admin, area_recepcion,
            '+56 9 1111 1111', is_staff=True)
        recepcionista = crear_usuario(
            '22222222-2', 'Carlos', 'Pérez', rol_recepcion, area_recepcion,
            '+56 9 2222 2222')
        luisa = crear_usuario(
            '33333333-3', 'Luisa', 'Soto', rol_operario, area_housekeeping,
            '+56 9 3333 3333')
        jorge = crear_usuario(
            '44444444-4', 'Jorge', 'Ramírez', rol_operario, area_mantencion,
            '+56 9 4444 4444')
        valentina = crear_usuario(
            '55555555-5', 'Valentina', 'Muñoz', rol_operario, area_housekeeping,
            '+56 9 5555 5555')
        pedro = crear_usuario(
            '66666666-6', 'Pedro', 'Castillo', rol_operario, area_mantencion,
            '+56 9 6666 6666')

        # KPI5: acceso reciente para la mayoría de usuarios activos (CP-ADM-01)
        for usuario in (admin, recepcionista, luisa, jorge, valentina):
            usuario.registrar_acceso()

        # ------------------------------------------------------------------
        # 3. Tipos de habitación y habitaciones (CU1)
        # ------------------------------------------------------------------
        tipo_simple, _ = TipoHabitacion.objects.get_or_create(nombre='Simple')
        tipo_doble, _ = TipoHabitacion.objects.get_or_create(nombre='Doble')
        tipo_matrimonial, _ = TipoHabitacion.objects.get_or_create(nombre='Matrimonial')
        tipo_suite, _ = TipoHabitacion.objects.get_or_create(nombre='Suite')

        def crear_habitacion(numero, tipo, estado):
            habitacion, _ = Habitacion.objects.get_or_create(
                numero=numero,
                defaults={'tipo': tipo, 'estado': estado},
            )
            return habitacion

        h101 = crear_habitacion('101', tipo_simple, 'DISPONIBLE')
        h102 = crear_habitacion('102', tipo_doble, 'OCUPADA')
        h103 = crear_habitacion('103', tipo_simple, 'LIMPIEZA')
        h104 = crear_habitacion('104', tipo_matrimonial, 'MANTENCION')
        h105 = crear_habitacion('105', tipo_suite, 'DISPONIBLE')
        h106 = crear_habitacion('106', tipo_doble, 'OCUPADA')
        h107 = crear_habitacion('107', tipo_simple, 'DISPONIBLE')
        h108 = crear_habitacion('108', tipo_matrimonial, 'LIMPIEZA')
        h109 = crear_habitacion('109', tipo_doble, 'DISPONIBLE')
        h110 = crear_habitacion('110', tipo_suite, 'OCUPADA')

        # Asignar operarias de housekeeping para demo
        Habitacion.objects.filter(pk=h101.pk).update(asignada_a=luisa)
        Habitacion.objects.filter(pk=h102.pk).update(asignada_a=valentina)
        Habitacion.objects.filter(pk=h103.pk).update(asignada_a=luisa)
        Habitacion.objects.filter(pk=h105.pk).update(asignada_a=valentina)

        # ------------------------------------------------------------------
        # 3.1 Plantillas de inventario predeterminadas por tipo
        # ------------------------------------------------------------------
        def crear_plantilla(tipo, nombre, categoria, cantidad):
            PlantillaInventario.objects.get_or_create(
                tipo_habitacion=tipo,
                nombre=nombre,
                defaults={'categoria': categoria, 'cantidad': cantidad},
            )

        dotacion_comun = [
            ('Toallas de baño', 'BANO', 2),
            ('Toallas de mano', 'BANO', 2),
            ('Almohadas estándar', 'BLANQUERIA', 2),
            ('Juego de sábanas', 'BLANQUERIA', 1),
            ('Frazada térmica', 'BLANQUERIA', 1),
            ('Vasos de vidrio', 'MENAJE', 2),
            ('Tazas de café', 'MENAJE', 2),
            ('Hervidor eléctrico', 'ELECTRODOMESTICOS', 1),
            ('Frigobar', 'ELECTRODOMESTICOS', 1),
            ('Televisor + Control', 'ELECTRODOMESTICOS', 1),
            ('Secador de pelo', 'BANO', 1),
        ]

        for nombre, cat, cant in dotacion_comun:
            crear_plantilla(tipo_simple, nombre, cat, cant)

        for nombre, cat, cant in dotacion_comun:
            cant_doble = cant * 2 if cat in ('BANO', 'BLANQUERIA', 'MENAJE') and cant > 1 else cant
            crear_plantilla(tipo_doble, nombre, cat, cant_doble)
            crear_plantilla(tipo_matrimonial, nombre, cat, cant_doble)

        # Suite: incluye artículos premium adicionales
        dotacion_suite = [
            ('Toallas de baño', 'BANO', 4),
            ('Toallas de mano', 'BANO', 4),
            ('Batas de baño', 'BANO', 2),
            ('Almohadas de pluma', 'BLANQUERIA', 4),
            ('Juego de sábanas satén', 'BLANQUERIA', 1),
            ('Edredón nórdico', 'BLANQUERIA', 1),
            ('Copas de vino', 'MENAJE', 2),
            ('Vasos de cristal', 'MENAJE', 4),
            ('Vajilla completa', 'MENAJE', 4),
            ('Cafetera Nespresso', 'ELECTRODOMESTICOS', 1),
            ('Hervidor eléctrico', 'ELECTRODOMESTICOS', 1),
            ('Frigobar ejecutivo', 'ELECTRODOMESTICOS', 1),
            ('Smart TV 55" + Control', 'ELECTRODOMESTICOS', 2),
            ('Secador de pelo iónico', 'BANO', 1),
            ('Plancha y tabla de planchar', 'ELECTRODOMESTICOS', 1),
            ('Caja fuerte digital', 'MOBILIARIO', 1),
        ]
        for nombre, cat, cant in dotacion_suite:
            crear_plantilla(tipo_suite, nombre, cat, cant)

        # Aplicar dotación estándar a todas las habitaciones
        todas_habs = [h101, h102, h103, h104, h105, h106, h107, h108, h109, h110]
        for hab in todas_habs:
            aplicar_plantilla_a_habitacion(hab, sobrescribir_cantidades=False, notificar_operario=False)

        # Crear faltante de ejemplo en Hab. 103 (limpieza)
        item_toallas_103 = ItemInventario.objects.filter(habitacion=h103, nombre='Toallas de baño').first()
        if item_toallas_103:
            item_toallas_103.cantidad_actual = 1
            item_toallas_103.estado = 'FALTANTE'
            item_toallas_103.notas = 'Falta 1 toalla de baño tras último check-out.'
            item_toallas_103.solicitado_en = ahora - timedelta(hours=3)
            item_toallas_103.solicitado_por = luisa
            item_toallas_103.save()

        # Crear ítem pendiente de validación en Hab. 102 (marcado como repuesto por Valentina)
        item_almohadas_102 = ItemInventario.objects.filter(habitacion=h102, nombre='Almohadas estándar').first()
        if item_almohadas_102:
            item_almohadas_102.estado = 'PENDIENTE_VALIDACION'
            item_almohadas_102.cantidad_actual = item_almohadas_102.cantidad_esperada
            item_almohadas_102.notas = 'Almohadas repuestas por camarera.'
            item_almohadas_102.repuesto_en = ahora - timedelta(hours=1)
            item_almohadas_102.repuesto_por = valentina
            item_almohadas_102.save()

        # ------------------------------------------------------------------
        # 4. Estadías (CU1/CU3) — salida NULL = estadía activa
        # ------------------------------------------------------------------
        def crear_estadia(habitacion, huesped, llegada, salida=None,
                          salida_prevista=None, conflicto=False):
            RegistroEstadia.objects.get_or_create(
                habitacion=habitacion,
                huesped=huesped,
                llegada=llegada,
                defaults={
                    'salida': salida,
                    'salida_prevista': salida_prevista,
                    'conflicto': conflicto,
                },
            )

        # Estadía activa (check-in vigente)
        crear_estadia(h102, 'Familia Rojas', hoy - timedelta(days=2),
                      salida_prevista=hoy + timedelta(days=3))
        # Doble reserva activa → conflicto para KPI3
        crear_estadia(h106, 'Ana Vergara', hoy - timedelta(days=3),
                      salida_prevista=hoy + timedelta(days=1), conflicto=True)
        crear_estadia(h106, 'Juan Andrade', hoy - timedelta(days=1),
                      salida_prevista=hoy + timedelta(days=2), conflicto=True)
        # Estadía histórica cerrada
        crear_estadia(h103, 'Diego Salazar', hoy - timedelta(days=10),
                      salida=hoy - timedelta(days=7),
                      salida_prevista=hoy - timedelta(days=7))

        # ------------------------------------------------------------------
        # 5. Tareas e historial de estados (CU2/CU5/CU6)
        # ------------------------------------------------------------------
        def crear_tarea(titulo, descripcion, asignado_a, habitacion=None,
                        prioridad='MEDIA', estado='PENDIENTE', hace_horas=24,
                        transiciones=()):
            tarea, creada = AsignacionTarea.objects.get_or_create(
                titulo=titulo,
                defaults={
                    'descripcion': descripcion,
                    'habitacion': habitacion,
                    'asignado_a': asignado_a,
                    'prioridad': prioridad,
                    'estado': estado,
                },
            )
            if creada:
                inicio = ahora - timedelta(hours=hace_horas)
                # creada_en es auto_now_add: se retrocede vía queryset.update()
                AsignacionTarea.objects.filter(pk=tarea.pk).update(creada_en=inicio)

                # Historial: estado inicial + transiciones (CU6)
                historial = HistorialEstadoTarea.objects.create(
                    tarea=tarea, estado_nuevo='PENDIENTE', usuario=admin)
                HistorialEstadoTarea.objects.filter(pk=historial.pk).update(fecha=inicio)
                for estado_nuevo, horas in transiciones:
                    historial = HistorialEstadoTarea.objects.create(
                        tarea=tarea, estado_nuevo=estado_nuevo,
                        usuario=tarea.asignado_a)
                    HistorialEstadoTarea.objects.filter(pk=historial.pk).update(
                        fecha=inicio + timedelta(hours=horas))
            return tarea

        crear_tarea(
            'Limpieza completa habitación 103',
            'Limpieza profunda post check-out (CU5).',
            asignado_a=luisa, habitacion=h103, prioridad='ALTA',
            estado='PENDIENTE', hace_horas=5)
        crear_tarea(
            'Reparar aire acondicionado habitación 104',
            'El equipo no enfría. Revisar compresor y filtro.',
            asignado_a=jorge, habitacion=h104, prioridad='CRITICA',
            estado='EN_PROGRESO', hace_horas=30,
            transiciones=[('EN_PROGRESO', 2)])
        crear_tarea(
            'Cambio de sábanas habitación 102',
            'Servicio de amenities solicitado por el huésped.',
            asignado_a=valentina, habitacion=h102, prioridad='MEDIA',
            estado='COMPLETADA', hace_horas=50,
            transiciones=[('EN_PROGRESO', 1), ('COMPLETADA', 3)])
        crear_tarea(
            'Inspección mensual de extintores',
            'Recorrido por pisos 1 a 3 verificando recarga y vencimiento.',
            asignado_a=pedro, prioridad='BAJA', estado='PENDIENTE',
            hace_horas=72)
        crear_tarea(
            'Reparar ducha habitación 108',
            'El agua sale fría; revisar termostato.',
            asignado_a=jorge, habitacion=h108, prioridad='ALTA',
            estado='EN_PROGRESO', hace_horas=20,
            transiciones=[('EN_PROGRESO', 4)])
        crear_tarea(
            'Reponer insumos de housekeeping',
            'Toallas y amenities en bodega del piso 2.',
            asignado_a=luisa, prioridad='BAJA', estado='CANCELADA',
            hace_horas=96, transiciones=[('CANCELADA', 6)])

        # ------------------------------------------------------------------
        # 6. Incidencias (CU8) — SLA por severidad (CP-SLA-01)
        # ------------------------------------------------------------------
        def crear_incidencia(titulo, descripcion, reportada_por, habitacion=None,
                             severidad='MEDIO', requiere_evidencia=False,
                             hace_horas=24, atendida_min=None,
                             resuelta_horas=None, comentario=''):
            creada_en = ahora - timedelta(hours=hace_horas)
            defaults = {
                'descripcion': descripcion,
                'habitacion': habitacion,
                'severidad': severidad,
                'reportado_por': reportada_por,
                'requiere_evidencia': requiere_evidencia,
                'comentario_resolucion': comentario,
            }
            if atendida_min is not None:
                defaults['atendida_en'] = creada_en + timedelta(minutes=atendida_min)
            if resuelta_horas is not None:
                defaults['resuelta_en'] = creada_en + timedelta(hours=resuelta_horas)
            incidencia, creada = Incidencia.objects.get_or_create(
                titulo=titulo, defaults=defaults)
            if creada:
                # creada_en es auto_now_add: se retrocede vía queryset.update()
                Incidencia.objects.filter(pk=incidencia.pk).update(creada_en=creada_en)
            return incidencia

        inc_fuga = crear_incidencia(
            'Fuga de agua en baño habitación 104',
            'El agua escurre bajo el lavatorio; aislar el paso de agua.',
            reportada_por=recepcionista, habitacion=h104, severidad='CRITICO',
            requiere_evidencia=True, hace_horas=72, atendida_min=12,
            resuelta_horas=2,
            comentario='Se reemplazó la válvula del cálido y se selló el paso de agua.')
        crear_incidencia(
            'TV sin señal habitación 106',
            'El huésped reporta la pantalla sin canales.',
            reportada_por=recepcionista, habitacion=h106, severidad='MEDIO',
            hace_horas=48, atendida_min=25, resuelta_horas=4,
            comentario='Se reconfiguró el decodificador.')
        crear_incidencia(
            'Mancha en alfombra habitación 102',
            'Mancha de café junto a la mesa de centro.',
            reportada_por=luisa, habitacion=h102, severidad='BAJO',
            hace_horas=8)
        crear_incidencia(
            'Cierre defectuoso de puerta principal',
            'La chapa no asegura al cerrar.',
            reportada_por=recepcionista, severidad='ALTO',
            hace_horas=30, atendida_min=40)
        crear_incidencia(
            'Olor fuerte en habitación 108',
            'Posible humedad en las cortinas.',
            reportada_por=valentina, habitacion=h108, severidad='MEDIO',
            hace_horas=6)
        crear_incidencia(
            'Alarma de humo con batería baja',
            'Pitidos intermitentes en el pasillo del piso 1.',
            reportada_por=jorge, severidad='ALTO',
            hace_horas=100, atendida_min=15, resuelta_horas=1,
            comentario='Batería reemplazada.')

        # ------------------------------------------------------------------
        # 7. Evidencia fotográfica (CP-FOT-01 / KPI4)
        # ------------------------------------------------------------------
        if not EvidenciaFotografica.objects.filter(incidencia=inc_fuga).exists():
            imagen = Image.new('RGB', (64, 64), color=(11, 60, 93))
            buffer = BytesIO()
            imagen.save(buffer, format='PNG')
            evidencia = EvidenciaFotografica(incidencia=inc_fuga, subida_por=jorge)
            evidencia.imagen.save(
                f'evidencia_demo_{inc_fuga.pk}.png',
                ContentFile(buffer.getvalue()),
                save=True,
            )

        # ------------------------------------------------------------------
        # 8. Notificaciones (CP-ALE-01)
        # ------------------------------------------------------------------
        def crear_notificacion(usuario, titulo, mensaje, leida=False):
            if not Notificacion.objects.filter(usuario=usuario, titulo=titulo).exists():
                Notificacion.objects.create(
                    usuario=usuario, titulo=titulo, mensaje=mensaje, leida=leida)

        crear_notificacion(
            luisa, 'Nueva tarea asignada',
            'Se le asignó la tarea «Limpieza completa habitación 103».')
        crear_notificacion(
            jorge, 'Nueva tarea asignada',
            'Se le asignó la tarea «Reparar aire acondicionado habitación 104».')
        crear_notificacion(
            admin, 'Incidencia crítica reportada',
            'Fuga de agua en baño habitación 104 (CRÍTICO).')
        crear_notificacion(
            recepcionista, 'Incidencia crítica reportada',
            'Fuga de agua en baño habitación 104 (CRÍTICO).')
        crear_notificacion(
            valentina, 'Tarea completada',
            'La tarea «Cambio de sábanas habitación 102» fue validada.',
            leida=True)
        crear_notificacion(
            luisa, 'Faltante en tu Hab. 103',
            'Se reportó un faltante en tu habitación 103: Toallas de baño (hay 1 de 2, faltan 1). Obs: Falta 1 toalla de baño tras último check-out.')
        crear_notificacion(
            admin, 'Validar reposición Hab. 102',
            'Valentina Muñoz marcó como repuesto "Almohadas estándar" en la habitación 102. Requiere validación de coordinación.')
        crear_notificacion(
            recepcionista, 'Validar reposición Hab. 102',
            'Valentina Muñoz marcó como repuesto "Almohadas estándar" en la habitación 102. Requiere validación de coordinación.')

        # ------------------------------------------------------------------
        # Resumen
        # ------------------------------------------------------------------
        self.stdout.write(self.style.SUCCESS('Datos demo cargados correctamente.'))
        self.stdout.write(f'  Usuarios:        {Usuario.objects.count()}')
        self.stdout.write(f'  Habitaciones:    {Habitacion.objects.count()}')
        self.stdout.write(f'  Estadías:        {RegistroEstadia.objects.count()}')
        self.stdout.write(f'  Tareas:          {AsignacionTarea.objects.count()}')
        self.stdout.write(f'  Incidencias:     {Incidencia.objects.count()}')
        self.stdout.write(f'  Evidencias:      {EvidenciaFotografica.objects.count()}')
        self.stdout.write(f'  Notificaciones:  {Notificacion.objects.count()}')
        self.stdout.write('')
        self.stdout.write(f'Accesos demo (contraseña: {PASSWORD_DEMO}):')
        self.stdout.write('  ADMINISTRADOR : 11111111-1 (María González)')
        self.stdout.write('  RECEPCION     : 22222222-2 (Carlos Pérez)')
        self.stdout.write('  OPERARIO      : 33333333-3 / 44444444-4 / 55555555-5 / 66666666-6')
