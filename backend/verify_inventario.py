"""
Verificación de funcionalidad de Inventario de Habitaciones.
Prueba el ciclo de vida:
  1. Login como Operario (o Admin).
  2. Consulta de inventario de una habitación.
  3. Solicitud de reposición / marcar faltante.
  4. Verificación de alerta/notificación generada.
  5. Reposición del artículo a estado COMPLETO.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from rest_framework.test import APIClient
from apps.users.models import Usuario
from apps.rooms.models import Habitacion, ItemInventario
from apps.notifications.models import Notificacion


def run_verification():
    print("=== INICIO DE VERIFICACIÓN DE INVENTARIO ===")

    # 1. Obtener usuarios de prueba
    admin = Usuario.objects.filter(rol__nombre='ADMINISTRADOR').first()
    operario = Usuario.objects.filter(rol__nombre='OPERARIO').first()
    assert admin is not None, "Debe existir un usuario ADMINISTRADOR"
    print(f"✓ Usuario Admin: {admin.nombre} {admin.apellido} ({admin.rut})")
    if operario:
        print(f"✓ Usuario Operario: {operario.nombre} {operario.apellido} ({operario.rut})")

    user_test = operario or admin
    client = APIClient()
    client.force_authenticate(user=user_test)

    # 2. Obtener una habitación accesible para el usuario de prueba
    if operario and user_test == operario:
        from apps.rooms.services import habitaciones_del_operario
        hab_qs = habitaciones_del_operario(operario)
        hab = hab_qs.first() or Habitacion.objects.first()
    else:
        hab = Habitacion.objects.first()

    assert hab is not None, "Debe existir al menos una habitación"
    print(f"✓ Probando sobre Habitación: {hab.numero} (ID: {hab.id})")

    # 3. Consultar inventario
    resp = client.get(f"/api/rooms/habitaciones/{hab.id}/inventario/")
    assert resp.status_code == 200, f"Error al consultar inventario: {resp.status_code}"
    items = resp.data
    assert len(items) > 0, "La habitación debería tener artículos de inventario cargados"
    print(f"✓ Inventario consultado con éxito: {len(items)} artículos encontrados.")

    # 4. Seleccionar un artículo y marcarlo como faltante / solicitado
    item = items[0]
    item_id = item['id']
    item_nombre = item['nombre']
    notif_count_before = Notificacion.objects.count()

    print(f"✓ Solicitando reposición de: '{item_nombre}' (ID: {item_id})...")
    nota_test = "Falta en la habitación tras limpieza."
    resp_solicitar = client.post(
        f"/api/rooms/inventario/{item_id}/solicitar/",
        {"notas": nota_test},
        format="json",
    )
    assert resp_solicitar.status_code == 200, f"Error al solicitar: {resp_solicitar.status_code}"
    assert resp_solicitar.data['estado'] == 'SOLICITADO', "El estado debe ser SOLICITADO"
    assert resp_solicitar.data['notas'] == nota_test, "La nota debe coincidir"
    print(f"✓ Artículo marcado como SOLICITADO con éxito. Nota registrada: '{nota_test}'")

    # 5. Verificar que se emitió la notificación para los coordinadores
    notif_count_after = Notificacion.objects.count()
    assert notif_count_after > notif_count_before, "Se debió registrar al menos una notificación"
    ultima_notif = Notificacion.objects.order_by('-id').first()
    print(f"✓ Notificación registrada para {ultima_notif.usuario.nombre}: '{ultima_notif.titulo}' -> '{ultima_notif.mensaje}'")

    # 6. Verificar que el contador de faltantes de la habitación lo refleja
    resp_hab = client.get(f"/api/rooms/habitaciones/{hab.id}/")
    assert resp_hab.status_code == 200
    assert resp_hab.data.get('items_faltantes_count', 0) > 0, "items_faltantes_count debe ser > 0"
    print(f"✓ HabitacionSerializer refleja {resp_hab.data['items_faltantes_count']} faltante(s) en la lista general.")

    # 7. Reponer el artículo a COMPLETO
    print(f"✓ Marcando artículo '{item_nombre}' como repuesto (COMPLETO)...")
    resp_reponer = client.post(f"/api/rooms/inventario/{item_id}/reponer/")
    assert resp_reponer.status_code == 200, f"Error al reponer: {resp_reponer.status_code}"
    assert resp_reponer.data['estado'] == 'COMPLETO', "El estado debe volver a COMPLETO"
    assert resp_reponer.data['solicitado_en'] is None, "solicitado_en debe quedar en null"
    print("✓ Artículo restaurado a estado COMPLETO con éxito.")

    print("\n=== TODAS LAS PRUEBAS DE INVENTARIO PASARON EXITOSAMENTE ===")


if __name__ == '__main__':
    run_verification()
