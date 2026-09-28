"""
Middlewares personalizados del proyecto (solo desarrollo).
"""
from django.http import HttpResponse


class PrivateNetworkAccessMiddleware:
    """
    Dev-only: habilita el flujo de Chrome "Private Network Access" (PNA).

    Cuando el frontend se sirve desde un origen público HTTPS (p. ej. un
    túnel de VS Code como https://xxxx-8081.brs.devtunnels.ms) pero llama a
    esta API local en http://localhost:8000, Chrome envía un preflight
    OPTIONS con el header `Access-Control-Request-Private-Network: true` y
    bloquea la petición ("Permission was denied for this request to access
    the loopback address space") salvo que la respuesta incluya:

        Access-Control-Allow-Private-Network: true

    django-cors-headers no emite ese header, así que lo agregamos acá.
    IMPORTANTE: este middleware debe estar ANTES (encima) de
    `corsheaders.middleware.CorsMiddleware` en MIDDLEWARE, porque
    CorsMiddleware corta-circuita los preflights OPTIONS y los middlewares
    interiores nunca los ven; siendo exterior, podemos decorar la respuesta
    al volver de la cadena.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Solo los preflights PNA traen este header; el resto pasa intacto.
        if request.headers.get('Access-Control-Request-Private-Network') == 'true':
            response['Access-Control-Allow-Private-Network'] = 'true'
        return response
