# -*- coding: utf-8 -*-
"""Verificacion end-to-end de CP-FOT-01: validacion de imagenes subidas.

Requisito CP-FOT-01: solo se aceptan imagenes reales (JPG/PNG/WEBP) bajo
el limite de MAX_IMAGE_UPLOAD_MB (5 MB en config/settings/base.py) en
AMBOS endpoints de subida de fotos:

  1. POST /api/rooms/habitaciones/{id}/cambiar_estado/  (foto opcional)
  2. POST /api/evidence/evidencias/                      (imagen obligatoria)

Casos negativos por endpoint (los tres deben responder 400):
  - Contenido falso: bytes de texto con nombre test.png
  - Extension no permitida: PNG real con nombre test.gif
  - Exceso de tamano: PNG real de ruido > 5 MB

Nota: en el endpoint de evidencias el ImageField de DRF valida el
contenido con Pillow ANTES del hook validate_imagen, por lo que el caso de
contenido falso puede responder con el mensaje de DRF ("Upload a valid
image..." en ingles o "Adjunte una imagen valida..." al estar
LANGUAGE_CODE en es-cl) en lugar del mensaje propio; ese test acepta
todos.

Uso (servidor corriendo en localhost:8000):
    python verify_cp_fot01.py
"""
import io
import json
import os
import urllib.error
import urllib.request

from PIL import Image

BASE = 'http://localhost:8000/api'

# Mensajes exactos de apps/core/uploads.py (CP-FOT-01).
MSG_EXT = 'La imagen debe ser JPG, PNG o WEBP.'
MSG_SIZE = 'La imagen supera el máximo de 5 MB.'
MSG_FAKE = 'El archivo no es una imagen válida.'


def _json(raw):
    try:
        return json.loads(raw.decode('utf-8'))
    except Exception:
        return {}


def _run(req):
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, _json(r.read())
    except urllib.error.HTTPError as e:
        return e.code, _json(e.read())


def post_json(path, payload, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST',
    )
    return _run(req)


def get(path, token):
    req = urllib.request.Request(BASE + path, headers={'Authorization': 'Bearer ' + token})
    return _run(req)


def delete(path, token):
    req = urllib.request.Request(
        BASE + path,
        headers={'Authorization': 'Bearer ' + token},
        method='DELETE',
    )
    return _run(req)


def post_multipart(path, fields, files, token):
    boundary = '----GrupoNorusProbeBoundary9f8e7d6c'
    body = b''
    for name, value in fields.items():
        body += (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f'{value}\r\n'
        ).encode('utf-8')
    for name, (filename, content_type, content) in files.items():
        body += (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
            f'Content-Type: {content_type}\r\n\r\n'
        ).encode('utf-8') + content + b'\r\n'
    body += f'--{boundary}--\r\n'.encode('utf-8')
    req = urllib.request.Request(
        BASE + path,
        data=body,
        headers={
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
            'Authorization': 'Bearer ' + token,
        },
        method='POST',
    )
    return _run(req)


def png_bytes(color=(79, 138, 198)):
    img = Image.new('RGB', (16, 16), color)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def big_png_bytes():
    """PNG real de ruido aleatorio que supera los 5 MB (el ruido comprime mal)."""
    lado = 1600
    img = Image.frombytes('RGB', (lado, lado), os.urandom(lado * lado * 3))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    data = buf.getvalue()
    if len(data) <= 5 * 1024 * 1024:
        raise RuntimeError(f'PNG de prueba demasiado pequeño: {len(data)} bytes')
    return data


def results(body):
    return body.get('results', body) if isinstance(body, dict) else body


def _msgs(body):
    """Concatena los mensajes de error de un cuerpo DRF (detail o campos)."""
    if not isinstance(body, dict):
        return str(body)
    partes = []
    for valor in body.values():
        if isinstance(valor, list):
            partes.extend(str(v) for v in valor)
        else:
            partes.append(str(valor))
    return ' '.join(partes)


def obtener_incidencia(tok_op, tok_ad):
    """Devuelve (id de incidencia para las pruebas, creada_por_este_script)."""
    st, body = get('/incidents/incidencias/', tok_op)
    lista = results(body)
    if st == 200 and lista:
        return lista[0]['id'], False
    # Lista vacia: crear una (reportado_por se asigna al usuario autenticado).
    for tok in (tok_op, tok_ad):
        st, body = post_json(
            '/incidents/incidencias/',
            {'titulo': 'Verificación CP-FOT-01', 'severidad': 'MEDIO'},
            token=tok,
        )
        if st in (200, 201) and body.get('id'):
            return body['id'], True
    return None, False


def main():
    ok = True
    id_evidencia = None

    # 1. Logins
    st, data = post_json('/auth/login/', {'rut': '33333333-3', 'password': 'norus123'})
    print('LOGIN operario (Ana):', st)
    tok_op = data.get('access')
    ok &= st == 200 and bool(tok_op)

    st, data = post_json('/auth/login/', {'rut': '11111111-1', 'password': 'norus123'})
    print('LOGIN admin (Maria):', st)
    tok_ad = data.get('access')
    ok &= st == 200 and bool(tok_ad)
    if not ok:
        print('RESULTADO: FALLOS DETECTADOS (login)')
        return

    # 2. Mapa numero -> id real (admin ve todas) + estado original de 102
    st, body = get('/rooms/habitaciones/', tok_ad)
    rooms = {r['numero']: r for r in results(body)}
    id_102 = rooms['102']['id']
    estado_102 = rooms['102']['estado']
    print(f'Habitacion 102: id={id_102}, estado original={estado_102}')

    # 3. Incidencia para las pruebas de evidencias (existente o creada)
    id_inc, inc_creada = obtener_incidencia(tok_op, tok_ad)
    print(f'Incidencia de prueba: {id_inc}{" (creada)" if inc_creada else ""}')

    # ---- Endpoint 1: cambiar_estado (rooms) ----
    print('\n--- POST /rooms/habitaciones/{id}/cambiar_estado/ ---')

    # (a) PNG valido -> 201 + foto
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_102}/cambiar_estado/',
        {'estado': 'LIMPIEZA'},
        {'imagen': ('test.png', 'image/png', png_bytes())},
        tok_op,
    )
    print('(a) PNG valido:', st, json.dumps(body, ensure_ascii=False)[:200])
    ok &= st in (200, 201) and body.get('estado_nuevo') == 'LIMPIEZA' and bool(body.get('foto'))

    # (b) Contenido falso -> 400 con mensaje propio
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_102}/cambiar_estado/',
        {'estado': 'LIMPIEZA'},
        {'imagen': ('test.png', 'image/png', b'esto no es una imagen')},
        tok_op,
    )
    print('(b) contenido falso:', st, json.dumps(body, ensure_ascii=False)[:200])
    ok &= st == 400 and MSG_FAKE in _msgs(body)

    # (c) Extension no permitida -> 400 con mensaje propio
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_102}/cambiar_estado/',
        {'estado': 'LIMPIEZA'},
        {'imagen': ('test.gif', 'image/gif', png_bytes())},
        tok_op,
    )
    print('(c) extension .gif:', st, json.dumps(body, ensure_ascii=False)[:200])
    ok &= st == 400 and MSG_EXT in _msgs(body)

    # (d) Exceso de tamano -> 400 con mensaje propio
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_102}/cambiar_estado/',
        {'estado': 'LIMPIEZA'},
        {'imagen': ('test.png', 'image/png', big_png_bytes())},
        tok_op,
    )
    print('(d) PNG > 5 MB:', st, json.dumps(body, ensure_ascii=False)[:200])
    ok &= st == 400 and MSG_SIZE in _msgs(body)

    # ---- Endpoint 2: evidencias (evidence) ----
    print('\n--- POST /evidence/evidencias/ ---')
    if id_inc is None:
        print('AVISO: no se pudo obtener ni crear una incidencia; se omiten estas pruebas.')
    else:
        # (a) PNG valido -> 201 + URL de imagen
        st, body = post_multipart(
            '/evidence/evidencias/',
            {'incidencia': str(id_inc)},
            {'imagen': ('test.png', 'image/png', png_bytes())},
            tok_op,
        )
        print('(a) PNG valido:', st, json.dumps(body, ensure_ascii=False)[:200])
        ok &= st in (200, 201) and bool(body.get('imagen'))
        id_evidencia = body.get('id')

        # (b) Contenido falso -> 400 (mensaje de DRF o propio; ver docstring)
        st, body = post_multipart(
            '/evidence/evidencias/',
            {'incidencia': str(id_inc)},
            {'imagen': ('test.png', 'image/png', b'esto no es una imagen')},
            tok_op,
        )
        print('(b) contenido falso:', st, json.dumps(body, ensure_ascii=False)[:200])
        texto = _msgs(body).lower()
        ok &= st == 400 and (
            'upload a valid image' in texto
            or 'adjunte una imagen válida' in texto  # DRF localizado (es-cl)
            or MSG_FAKE.lower() in texto
        )

        # (c) Extension no permitida -> 400 con mensaje propio
        #     (DRF ImageField no valida extension: llega a validar_imagen)
        st, body = post_multipart(
            '/evidence/evidencias/',
            {'incidencia': str(id_inc)},
            {'imagen': ('test.gif', 'image/gif', png_bytes())},
            tok_op,
        )
        print('(c) extension .gif:', st, json.dumps(body, ensure_ascii=False)[:200])
        ok &= st == 400 and MSG_EXT in _msgs(body)

        # (d) Exceso de tamano -> 400 con mensaje propio
        #     (DRF ImageField no valida tamano: llega a validar_imagen)
        st, body = post_multipart(
            '/evidence/evidencias/',
            {'incidencia': str(id_inc)},
            {'imagen': ('test.png', 'image/png', big_png_bytes())},
            tok_op,
        )
        print('(d) PNG > 5 MB:', st, json.dumps(body, ensure_ascii=False)[:200])
        ok &= st == 400 and MSG_SIZE in _msgs(body)

    # Limpieza: restaurar estado de 102 y borrar recursos creados
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_102}/cambiar_estado/',
        {'estado': estado_102},
        {},
        tok_op,
    )
    print(f'\nRestaurar 102 a {estado_102}:', st)
    ok &= st in (200, 201)

    st, body = get(f'/rooms/habitaciones/{id_102}/', tok_op)
    print('Estado final 102:', body.get('estado'))
    ok &= body.get('estado') == estado_102

    if id_evidencia:
        st, _ = delete(f'/evidence/evidencias/{id_evidencia}/', tok_op)
        print('DELETE evidencia creada:', st, '(best-effort)')
    if inc_creada and id_inc:
        st, _ = delete(f'/incidents/incidencias/{id_inc}/', tok_ad)
        print('DELETE incidencia creada:', st, '(best-effort)')

    print('\nRESULTADO:', 'TODO OK' if ok else 'FALLOS DETECTADOS')


if __name__ == '__main__':
    main()
