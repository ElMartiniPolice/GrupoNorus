# -*- coding: utf-8 -*-
"""Probe rapido: verifica que la ruta cambios_estado exista en el servidor vivo."""
import json
import urllib.request

BASE = 'http://localhost:8000/api'


def post_json(path, payload):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))


def get(path, token):
    req = urllib.request.Request(BASE + path, headers={'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode('utf-8'))
        except Exception:
            return e.code, {}


# 1. Login operario Ana Soto
st, data = post_json('/auth/login/', {'rut': '33333333-3', 'password': 'norus123'})
print('LOGIN operario:', st)
tok = data.get('access')

# 2. Ruta nueva: historial de cambios de la habitacion 102 (es suya)
st, body = get('/rooms/habitaciones/102/cambios_estado/', tok)
print('GET cambios_estado(102):', st, json.dumps(body)[:200])

# 3. Ruta nueva en habitacion ajena (101) -> debe ser 404 por scoping
st, body = get('/rooms/habitaciones/101/cambios_estado/', tok)
print('GET cambios_estado(101, ajena):', st, json.dumps(body)[:200])
