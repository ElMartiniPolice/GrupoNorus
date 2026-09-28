"""
Utilidades compartidas — Grupo Norus.
"""


def validar_rut(rut):
    """
    Valida un RUT chileno en formato 12345678-9 (o con puntos).
    Retorna True/False. No considera 'K' minúscula (se normaliza antes).
    """
    import re

    rut = (rut or '').upper().replace('.', '').replace('-', '').strip()
    if not rut or not rut[:-1].isdigit() or len(rut) < 2:
        return False

    cuerpo, dv = rut[:-1], rut[-1]
    if dv not in '0123456789K':
        return False

    suma, multiplo, d = 0, 2, 0
    for r in reversed(cuerpo):
        suma += int(r) * multiplo
        multiplo = 2 if multiplo == 7 else multiplo + 1

    resto = 11 - (suma % 11)
    dv_esperado = {11: '0', 10: 'K'}.get(resto, str(resto))
    return dv == dv_esperado


def formatear_rut(rut):
    """Formatea RUT a 12.345.678-9 (para mostrar en el frontend)."""
    rut = (rut or '').upper().replace('.', '').replace('-', '').strip()
    if len(rut) < 2:
        return rut
    cuerpo, dv = rut[:-1], rut[-1]
    cuerpo_fmt = ''
    while len(cuerpo) > 3:
        cuerpo_fmt = '.' + cuerpo[-3:] + cuerpo_fmt
        cuerpo = cuerpo[:-3]
    return f'{cuerpo}{cuerpo_fmt}-{dv}'
