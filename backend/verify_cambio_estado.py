# -*- coding: utf-8 -*-
"""Verificacion completa: operario cambia estado de habitacion adjuntando foto.

Prueba contra el servidor vivo (:8000):
  1. Login operario (Ana Soto) y admin (Maria Gonzalez).
  2. Mapa numero -> id real via listado (los PK de ruta son ids de BD, NO numeros).
  3. GET cambios_estado en habitacion propia  -> 200 (lista).
  4. GET cambios_estado en habitacion ajena  -> 404 (scoping).
  5. POST cambiar_estado con foto PNG (multipart) en propia -> 201 + foto URL.
  6. POST cambiar_estado en habitacion ajena -> 404 (scoping).
  7. POST cambiar_estado con estado invalido -> 400.
  8. Restaurar estado original (round-trip) y verificar historial + estado final.
"""
import io
import json
import urllib.error
import urllib.request

from PIL import Image

BASE = 'http://localhost:8000/api'


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


def post_json(path, payload):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    return _run(req)


def get(path, token):
    req = urllib.request.Request(BASE + path, headers={'Authorization': 'Bearer ' + token})
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


def results(body):
    return body.get('results', body) if isinstance(body, dict) else body


def main():
    ok = True

    # 1. Logins
    st, data = post_json('/auth/login/', {'rut': '33333333-3', 'password': 'norus123'})
    print('LOGIN operario (Ana):', st)
    tok_op = data.get('access')

    st, data = post_json('/auth/login/', {'rut': '11111111-1', 'password': 'norus123'})
    print('LOGIN admin (Maria):', st)
    tok_ad = data.get('access')

    # 2. Mapa numero -> id real (admin ve todas)
    st, body = get('/rooms/habitaciones/', tok_ad)
    rooms = {r['numero']: r for r in results(body)}
    id_102 = rooms['102']['id']
    id_105 = rooms['105']['id']
    estado_102 = rooms['102']['estado']
    print(f"Mapa ids: 102->{id_102} ({estado_102}), 105->{id_105}")

    # 3. Historial en habitacion propia (Ana ve 102 y 103)
    st, body = get(f'/rooms/habitaciones/{id_102}/cambios_estado/', tok_op)
    print(f'GET cambios_estado propia(102): {st} -> {len(results(body))} registros')
    ok &= st == 200

    # 4. Historial en habitacion ajena -> 404 por scoping
    st, body = get(f'/rooms/habitaciones/{id_105}/cambios_estado/', tok_op)
    print('GET cambios_estado ajena(105):', st, body)
    ok &= st == 404

    # 5. POST con foto en habitacion propia
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_102}/cambiar_estado/',
        {'estado': 'LIMPIEZA'},
        {'imagen': ('test.png', 'image/png', png_bytes())},
        tok_op,
    )
    print('POST cambiar_estado propia con foto:', st, json.dumps(body)[:300])
    ok &= st in (200, 201) and body.get('estado_nuevo') == 'LIMPIEZA' and bool(body.get('foto'))

    # 6. POST en habitacion ajena -> 404 por scoping
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_105}/cambiar_estado/',
        {'estado': 'DISPONIBLE'},
        {},
        tok_op,
    )
    print('POST cambiar_estado ajena(105):', st, body)
    ok &= st == 404

    # 7. Estado invalido -> 400
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_102}/cambiar_estado/',
        {'estado': 'ESTADO_FALSO'},
        {},
        tok_op,
    )
    print('POST estado invalido:', st, body)
    ok &= st == 400

    # 8. Restaurar estado original de 102 (sin foto)
    st, body = post_multipart(
        f'/rooms/habitaciones/{id_102}/cambiar_estado/',
        {'estado': estado_102},
        {},
        tok_op,
    )
    print(f'POST restaurar 102 a {estado_102}:', st)
    ok &= st in (200, 201)

    # 9. Historial final + estado de la habitacion
    st, body = get(f'/rooms/habitaciones/{id_102}/cambios_estado/', tok_op)
    hist = results(body)
    primero = json.dumps(hist[0])[:200] if hist else '-'
    print(f'Historial 102: {len(hist)} registros; mas reciente: {primero}')
    ok &= st == 200 and len(hist) >= 2

    st, body = get(f'/rooms/habitaciones/{id_102}/', tok_op)
    print('Estado final 102:', body.get('estado'))
    ok &= body.get('estado') == estado_102

    print('RESULTADO:', 'TODO OK' if ok else 'FALLOS DETECTADOS')


if __name__ == '__main__':
    main()
