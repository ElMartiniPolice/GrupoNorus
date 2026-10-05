"""
Verificación end-to-end de cumplimiento base de la Ley N° 21.719.

Uso:
  $env:DJANGO_SETTINGS_MODULE='config.settings.ci'
  $env:VERIFICAR_SIN_WS_PUSH='1'   # solo en entornos con loopback restringido
  python verify_ley_21719.py

El script ejerce el flujo:
  aviso → login → consentimiento → solicitud de derechos → exportación
  → panel admin → retiro de consentimiento → seguridad.

Corre dentro de una transacción atómica con rollback para no alterar la DB.
"""
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.ci")
sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

import django

django.setup()

from django.db import transaction
from rest_framework.test import APIClient

from apps.users.models import Area, Rol, Usuario

import apps.privacy.views as _privacy_views
from apps.notifications.models import Notificacion as _Notificacion


def _notificar_sin_push(usuario_id, titulo, mensaje):
    if not usuario_id:
        return None
    return _Notificacion.objects.create(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
    )


if os.environ.get("VERIFICAR_SIN_WS_PUSH"):
    _privacy_views.notificar = _notificar_sin_push

OK = "  [OK]"
FAIL = "  [FAIL]"
fallos = []


def check(nombre, cond, extra=""):
    marca = OK if cond else FAIL
    print(f"{marca} {nombre}{(' — ' + str(extra)) if extra else ''}")
    if not cond:
        fallos.append(nombre)


client = APIClient()

RUT_OP = "SMOKE-OP1"
RUT_AD = "SMOKE-AD1"
CLAVE = "ClaveTest123"
CONSENTIMIENTO_URL = "/api/privacy/consentimiento/actual/"

with transaction.atomic():
    rol_admin, _ = Rol.objects.get_or_create(nombre="ADMINISTRADOR")
    rol_op, _ = Rol.objects.get_or_create(nombre="OPERARIO")
    area, _ = Area.objects.get_or_create(nombre="RECEPCION")
    Usuario.objects.filter(rut__in=[RUT_OP, RUT_AD]).delete()

    Usuario.objects.create_user(
        rut=RUT_OP,
        password=CLAVE,
        nombre="Operario",
        apellido="Test",
        rol=rol_op,
        area=area,
    )
    Usuario.objects.create_user(
        rut=RUT_AD,
        password=CLAVE,
        nombre="Admin",
        apellido="Test",
        rol=rol_admin,
        area=area,
    )

    print("== 1. Aviso de privacidad (público, sin auth) ==")
    r = client.get("/api/privacy/aviso/")
    check("GET /aviso/ → 200", r.status_code == 200, r.status_code)
    aviso = r.json()
    check("aviso.version = 1.0", aviso.get("version") == "1.0", aviso.get("version"))
    check("aviso tiene contenido", bool(aviso.get("contenido")))

    print("== 2. Login JWT (RUT + contraseña) ==")
    r = client.post("/api/auth/login/", {"rut": RUT_OP, "password": CLAVE}, format="json")
    check("login operario → 200", r.status_code == 200, r.status_code)
    token_op = r.json().get("access")
    check("devuelve access token", bool(token_op))
    r = client.post("/api/auth/login/", {"rut": RUT_AD, "password": CLAVE}, format="json")
    check("login admin → 200", r.status_code == 200, r.status_code)
    token_ad = r.json().get("access")

    print("== 3. Gate de consentimiento ==")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_op}")
    r = client.get(CONSENTIMIENTO_URL)
    check("GET /actual/ → 200", r.status_code == 200, r.status_code)
    check("pendiente=True antes de aceptar", r.json().get("pendiente") is True, r.json())

    print("== 4. Aceptar consentimiento ==")
    r = client.post("/api/privacy/consentimiento/aceptar/", {}, format="json")
    check("POST /aceptar/ → 201", r.status_code == 201, r.status_code)
    r = client.get(CONSENTIMIENTO_URL)
    check("pendiente=False tras aceptar", r.json().get("pendiente") is False, r.json())

    print("== 5. Derechos del titular ==")
    r = client.post(
        "/api/privacy/derechos/solicitudes/",
        {"tipo": "ACCESO", "detalle": "Solicito acceso a mis datos personales."},
        format="json",
    )
    check("POST /solicitudes/ → 201", r.status_code == 201, r.status_code)
    sol_id = r.json().get("id")
    r = client.get("/api/privacy/derechos/mis-solicitudes/")
    check(
        "GET /mis-solicitudes/ → 200 con 1 solicitud",
        r.status_code == 200 and len(r.json()) == 1,
        r.json(),
    )

    print("== 6. Portabilidad: exportar datos ==")
    r = client.get("/api/privacy/derechos/exportar/")
    check("GET /exportar/ → 200", r.status_code == 200, r.status_code)
    exp = r.json()
    check("export incluye titular", exp.get("titular", {}).get("rut") == RUT_OP)
    check("export incluye generado_en", bool(exp.get("generado_en")))

    print("== 7. Panel de administración ==")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_ad}")
    r = client.get("/api/privacy/admin/solicitudes/")
    check("GET /admin/solicitudes/ → 200", r.status_code == 200, r.status_code)
    check("admin ve la solicitud", len(r.json()) == 1, r.json())
    r = client.patch(
        f"/api/privacy/admin/solicitudes/{sol_id}/",
        {"estado": "RESUELTA", "respuesta": "Datos entregados."},
        format="json",
    )
    check("PATCH /admin/solicitudes/<id>/ → 200", r.status_code == 200, r.status_code)
    check("estado quedó RESUELTA", r.json().get("estado") == "RESUELTA", r.json())
    r = client.get("/api/privacy/admin/auditoria/")
    check("GET /admin/auditoria/ → 200", r.status_code == 200, r.status_code)
    acciones = {reg["accion"] for reg in r.json()}
    esperadas = {
        "CONSENTIMIENTO_ACEPTADO",
        "SOLICITUD_DERECHO_CREADA",
        "DATOS_EXPORTADOS",
        "SOLICITUD_DERECHO_ACTUALIZADA",
    }
    check("bitácora registra las 4 acciones", esperadas.issubset(acciones), acciones)

    print("== 8. Retirar consentimiento ==")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_op}")
    r = client.post("/api/privacy/consentimiento/retirar/", {}, format="json")
    check("POST /retirar/ → 200", r.status_code == 200, r.status_code)
    r = client.get(CONSENTIMIENTO_URL)
    check("pendiente=True tras retirar", r.json().get("pendiente") is True, r.json())

    print("== 9. Seguridad: operario no accede al panel admin ==")
    r = client.get("/api/privacy/admin/solicitudes/")
    check("operario → 403 en /admin/solicitudes/", r.status_code == 403, r.status_code)

    transaction.set_rollback(True)

print()
if fallos:
    print(f"RESULTADO: {len(fallos)} FALLOS")
    sys.exit(1)
print("RESULTADO: TODO OK — API de privacidad verificada end-to-end")
