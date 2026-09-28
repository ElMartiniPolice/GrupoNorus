"""Verificacion temporal: scoping CP-DP-02 (operario) + logout."""
import json
import urllib.error
import urllib.request

BASE = 'http://localhost:8000/api'


def req(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    r = urllib.request.Request(
        BASE + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers=headers,
        method=method,
    )
    try:
        resp = urllib.request.urlopen(r)
        body = resp.read()
        return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body.decode(errors='replace')


def login(rut, password):
    status, data = req('POST', '/auth/login/', {'rut': rut, 'password': password})
    assert status == 200, f'login {rut} -> {status}: {data}'
    return data


def results(data):
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data or []


print('=== 1) OPERARIO 33333333-3 (Ana Soto) ===')
op = login('33333333-3', 'norus123')
print('   rol:', op['user']['rol_nombre'], '| area:', op['user'].get('area_nombre'))

st, data = req('GET', '/rooms/habitaciones/', token=op['access'])
habs = results(data)
print(f'   GET /rooms/habitaciones/ -> {st} | {len(habs)} habitaciones (solo suyas):')
for h in habs:
    print('      -', h['numero'], h['estado'])

print('   Registro fotografico por habitacion:')
for h in habs:
    st, ev = req('GET', f'/evidence/evidencias/?habitacion={h["id"]}', token=op['access'])
    evs = results(ev)
    print(f'      Hab {h["numero"]}: {len(evs)} evidencias')

st, ev = req('GET', '/evidence/evidencias/', token=op['access'])
print(f'   GET /evidence/evidencias/ (sin filtro) -> {st} | {len(results(ev))} evidencias')

print()
print('=== 2) Detalle de habitacion ajena debe dar 404 ===')
adm = login('11111111-1', 'norus123')
st, data = req('GET', '/rooms/habitaciones/', token=adm['access'])
todas = results(data)
prohibidas = [h for h in todas if h['id'] not in {x['id'] for x in habs}]
print(f'   Admin ve {len(todas)} habitaciones; operario ve {len(habs)}; ajenas: {len(prohibidas)}')
if prohibidas:
    st, data = req('GET', f'/rooms/habitaciones/{prohibidas[0]["id"]}/', token=op['access'])
    print(f'   GET detalle de hab {prohibidas[0]["numero"]} como operario -> {st} (esperado 404)')

print()
print('=== 3) Logout ===')
st, data = req('POST', '/auth/logout/', {'refresh': op['refresh']}, token=op['access'])
print(f'   POST /auth/logout/ operario -> {st} | {data}')
st, data = req('POST', '/auth/logout/', {'refresh': adm['refresh']}, token=adm['access'])
print(f'   POST /auth/logout/ admin -> {st} | {data}')

print()
print('=== 4) Otros operarios: cuantas habitaciones ve cada uno ===')
for rut in ('44444444-4', '55555555-5', '66666666-6'):
    try:
        u = login(rut, 'norus123')
        st, data = req('GET', '/rooms/habitaciones/', token=u['access'])
        hs = results(data)
        print(f'   {rut} ({u["user"]["nombre"]}): {len(hs)} habitaciones')
        req('POST', '/auth/logout/', {'refresh': u['refresh']}, token=u['access'])
    except AssertionError as e:
        print('  ', rut, '->', e)

print()
print('OK: verificacion completada.')
