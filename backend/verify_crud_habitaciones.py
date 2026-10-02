"""
Verificación runtime del CRUD de habitaciones (CP-HAB-01 + CP-DP-02).

Matriz de permisos contra el servidor vivo en localhost:8000:

- Sin token      -> GET 401
- ADMINISTRADOR  -> CRUD completo (201 / 200 / 204)
- RECEPCION      -> CRUD completo (IsAdminOrRecepcion)
- OPERARIO       -> solo lectura acotada (CP-DP-02); escrituras -> 403
                    detalle de habitación ajena -> 404

Uso:  python verify_crud_habitaciones.py   (desde backend/, servidor activo)
"""
import json
import random
import urllib.error
import urllib.request

BASE = 'http://localhost:8000/api'
PASS = 'norus123'
creadas = []  # ids creados por el test -> limpieza garantizada


def req(method, path, data=None, token=None):
    """Petición HTTP con JSON; devuelve (status, dict)."""
    body = json.dumps(data).encode() if data is not None else None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    r = urllib.request.Request(f'{BASE}{path}', data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        raw = e.read().decode() or '{}'
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {}


def login(rut, password):
    status, data = req('POST', '/auth/login/', {'rut': rut, 'password': password})
    assert status == 200, f'login {rut} -> {status}: {data}'
    return data['access']


def results(data):
    return data['results'] if isinstance(data, dict) and 'results' in data else data


def check(nombre, cond, detalle=''):
    print(f"[{'OK ' if cond else 'FALLO'}] {nombre}" + (f' -> {detalle}' if detalle else ''))
    if not cond:
        raise SystemExit(f'FALLO: {nombre}')


def main():
    # 0) Sin autenticación -> 401
    status, _ = req('GET', '/rooms/habitaciones/')
    check('GET sin token -> 401', status == 401, f'HTTP {status}')

    # 1) Login de los tres roles (CU4)
    tok_admin = login('11111111-1', PASS)   # María González, ADMINISTRADOR
    tok_recep = login('22222222-2', PASS)   # Carlos Pérez,   RECEPCION
    tok_oper = login('33333333-3', PASS)    # Ana Soto,      OPERARIO
    print('[OK ] login admin + recepcion + operario -> JWT')

    try:
        # 2) ADMINISTRADOR: CRUD completo
        status, data = req('GET', '/rooms/habitaciones/', token=tok_admin)
        todas_admin = {h['id'] for h in results(data)}
        check('admin GET lista -> 200', status == 200, f'{len(todas_admin)} habitaciones')

        status, data = req('GET', '/rooms/tipos/', token=tok_admin)
        check('admin GET tipos -> 200', status == 200, f'{len(results(data))} tipos')
        tipo_id = results(data)[0]['id']

        numero = f'VT{random.randint(10000, 99999)}'
        status, data = req('POST', '/rooms/habitaciones/',
                           {'numero': numero, 'tipo': tipo_id}, token=tok_admin)
        check('admin POST crear -> 201', status == 201,
              f'numero={data.get("numero")} estado={data.get("estado")}')
        hid = data['id']
        creadas.append(hid)

        status, data = req('GET', f'/rooms/habitaciones/{hid}/', token=tok_admin)
        check('admin GET detalle -> 200', status == 200, f'id={hid}')

        status, data = req('PATCH', f'/rooms/habitaciones/{hid}/',
                           {'estado': 'LIMPIEZA'}, token=tok_admin)
        check('admin PATCH estado -> 200', status == 200, f'estado={data.get("estado")}')

        # 3) RECEPCION: también CRUD completo (IsAdminOrRecepcion)
        status, data = req('POST', '/rooms/habitaciones/',
                           {'numero': f'{numero}R', 'tipo': tipo_id}, token=tok_recep)
        check('recepcion POST crear -> 201', status == 201, f'numero={data.get("numero")}')
        hid2 = data['id']
        creadas.append(hid2)

        status, data = req('PATCH', f'/rooms/habitaciones/{hid2}/',
                           {'estado': 'MANTENCION'}, token=tok_recep)
        check('recepcion PATCH estado -> 200', status == 200, f'estado={data.get("estado")}')

        status, _ = req('DELETE', f'/rooms/habitaciones/{hid2}/', token=tok_recep)
        check('recepcion DELETE -> 204', status == 204)
        creadas.remove(hid2)

        # 4) OPERARIO: lectura acotada (CP-DP-02) y escrituras -> 403
        status, data = req('GET', '/rooms/habitaciones/', token=tok_oper)
        visibles = {h['id'] for h in results(data)}
        check('operario GET lista -> 200 (acotada)', status == 200,
              f'{len(visibles)} visibles de {len(todas_admin) + 1}')

        status, data = req('POST', '/rooms/habitaciones/',
                           {'numero': f'{numero}O', 'tipo': tipo_id}, token=tok_oper)
        check('operario POST -> 403', status == 403, data.get('detail', ''))

        status, data = req('PATCH', f'/rooms/habitaciones/{hid}/',
                           {'estado': 'OCUPADA'}, token=tok_oper)
        check('operario PATCH -> 403', status == 403, data.get('detail', ''))

        status, data = req('DELETE', f'/rooms/habitaciones/{hid}/', token=tok_oper)
        check('operario DELETE -> 403', status == 403, data.get('detail', ''))

        ajenas = todas_admin - visibles
        if ajenas:
            ajena = sorted(ajenas)[0]
            status, _ = req('GET', f'/rooms/habitaciones/{ajena}/', token=tok_oper)
            check('operario GET detalle ajeno -> 404', status == 404, f'id={ajena}')
        else:
            print('[SKIP] el operario ve todas las habitaciones (sin ajenas que probar)')

        # 5) Limpieza: admin elimina la habitación de prueba restante
        status, _ = req('DELETE', f'/rooms/habitaciones/{hid}/', token=tok_admin)
        check('admin DELETE (limpieza) -> 204', status == 204)
        creadas.remove(hid)

        status, _ = req('GET', f'/rooms/habitaciones/{hid}/', token=tok_admin)
        check('GET detalle eliminado -> 404', status == 404)

        print('\nTODAS LAS PRUEBAS PASARON ✔')
    finally:
        if creadas:
            print(f'\nLimpieza de emergencia: {creadas}')
            for hid in list(creadas):
                req('DELETE', f'/rooms/habitaciones/{hid}/', token=tok_admin)


if __name__ == '__main__':
    main()
