# -*- coding: utf-8 -*-
"""Verificacion del historial global de cambios de estado (solo ADMINISTRADOR).

Usa django.test.Client (mismo proceso, sin TCP) para funcionar en el sandbox:
  1. Login admin (Maria Gonzalez) y operario (Ana Soto).
  2. Mapa numero -> id real via listado de habitaciones.
  3. GET /rooms/cambios-estado/ como admin   -> 200 (lista con campos).
  4. GET /rooms/cambios-estado/ como operario -> 403 (permiso IsAdmin).
  5. GET ?habitacion=<id> como admin         -> 200 (solo esa habitacion).
  6. GET ?estado_nuevo=LIMPIEZA como admin    -> 200 (solo ese estado).
"""
import json
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.ci')

import django  # noqa: E402

django.setup()

from django.test import Client  # noqa: E402


def _json(response):
    try:
        return json.loads(response.content.decode('utf-8'))
    except Exception:
        return {}


def post_json(path, payload):
    r = Client().post(path, data=json.dumps(payload), content_type='application/json')
    return r.status_code, _json(r)


def get(path, token):
    r = Client().get(path, HTTP_AUTHORIZATION='Bearer ' + token)
    return r.status_code, _json(r)


def results(body):
    return body.get('results', body) if isinstance(body, dict) else body


def main():
    ok = True

    # 1. Logins
    st, data = post_json('/api/auth/login/', {'rut': '11111111-1', 'password': 'norus123'})
    print('LOGIN admin (Maria):', st)
    tok_ad = data.get('access')

    st, data = post_json('/api/auth/login/', {'rut': '33333333-3', 'password': 'norus123'})
    print('LOGIN operario (Ana):', st)
    tok_op = data.get('access')

    # 2. Mapa numero -> id real (para el filtro por habitacion)
    st, body = get('/api/rooms/habitaciones/', tok_ad)
    rooms = {r['numero']: r for r in results(body)}
    id_102 = rooms['102']['id']
    print(f"Mapa ids: 102->{id_102}")

    # 3. Historial global como admin -> 200 con campos esperados
    st, body = get('/api/rooms/cambios-estado/', tok_ad)
    hist = results(body)
    print(f'GET cambios-estado admin: {st} -> {len(hist)} registros')
    if hist:
        c = hist[0]
        print('  Ejemplo:', json.dumps(c)[:220])
        ok &= set(c) >= {'id', 'habitacion', 'estado_anterior', 'estado_nuevo', 'fecha'}
        ok &= isinstance(c['habitacion'], dict) and 'numero' in c['habitacion']
    ok &= st == 200

    # 4. Historial global como operario -> 403 (IsAdmin)
    st, body = get('/api/rooms/cambios-estado/', tok_op)
    print('GET cambios-estado operario:', st, json.dumps(body)[:160])
    ok &= st == 403

    # 5. Filtro por habitacion -> solo registros de esa habitacion
    st, body = get(f'/api/rooms/cambios-estado/?habitacion={id_102}', tok_ad)
    hist_h = results(body)
    print(f'GET ?habitacion=102: {st} -> {len(hist_h)} registros')
    ok &= st == 200 and all(c['habitacion']['id'] == id_102 for c in hist_h)

    # 6. Filtro por estado_nuevo -> solo cambios hacia ese estado
    st, body = get('/api/rooms/cambios-estado/?estado_nuevo=LIMPIEZA', tok_ad)
    hist_e = results(body)
    print(f'GET ?estado_nuevo=LIMPIEZA: {st} -> {len(hist_e)} registros')
    ok &= st == 200 and all(c['estado_nuevo'] == 'LIMPIEZA' for c in hist_e)

    print('RESULTADO:', 'TODO OK' if ok else 'FALLOS DETECTADOS')


if __name__ == '__main__':
    main()
