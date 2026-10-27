"""
Vistas de autenticación y usuarios — Grupo Norus.

CU4: login con RUT + contraseña → JWT.
CP-AUT-01: login exitoso.
CP-AUT-02: bloqueo tras intentos fallidos.
CP-USR-01: creación de usuarios (solo ADMINISTRADOR).
"""
from django.contrib.auth import authenticate
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.permissions import IsAdmin, IsAdminOrRecepcion
from apps.users.models import Area, Rol, Usuario
from apps.users.serializers import (
    AreaSerializer,
    LoginSerializer,
    RolSerializer,
    UsuarioCreateSerializer,
    UsuarioSerializer,
)


class LoginView(TokenObtainPairView):
    """
    CU4 — Iniciar sesión con RUT y contraseña.
    Devuelve access/refresh JWT + datos del usuario.
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        rut = (request.data.get('rut') or '').upper().strip()
        password = request.data.get('password') or ''

        try:
            user = Usuario.objects.get(rut=rut)
        except Usuario.DoesNotExist:
            return Response(
                {'detail': 'Credenciales inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # CP-AUT-02 — cuenta bloqueada temporalmente
        if user.esta_bloqueado:
            return Response(
                {'detail': 'Cuenta bloqueada temporalmente por intentos fallidos. '
                           'Intente más tarde.'},
                status=status.HTTP_423_LOCKED,
            )

        user_auth = authenticate(request, rut=rut, password=password)
        if user_auth is None:
            # CP-AUT-02 — registrar intento fallido
            user.registrar_intento_fallido()
            return Response(
                {'detail': 'Credenciales inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Cierra sesión invalidando el refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data['refresh']).blacklist()
        except Exception:
            pass
        return Response({'detail': 'Sesión cerrada.'})


class PerfilView(APIView):
    """Datos del usuario autenticado (para el contexto del frontend)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)


class CambiarPasswordView(APIView):
    """
    Permite al usuario autenticado cambiar su propia contraseña.
    Requiere contraseña actual y nueva contraseña (mínimo 6 caracteres).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        password_actual = request.data.get('password_actual')
        password_nueva = request.data.get('password_nueva')

        if not password_actual or not password_nueva:
            return Response(
                {'detail': 'Se requiere contraseña actual y nueva contraseña.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password_nueva) < 6:
            return Response(
                {'detail': 'La nueva contraseña debe tener al menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password_actual):
            return Response(
                {'detail': 'La contraseña actual es incorrecta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password_nueva)
        user.save(update_fields=['password'])
        return Response({'detail': 'Contraseña actualizada correctamente.'})


class RolViewSet(viewsets.ReadOnlyModelViewSet):
    """Catálogo de roles (para formularios del admin)."""
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [IsAuthenticated]


class AreaViewSet(viewsets.ReadOnlyModelViewSet):
    """Catálogo de áreas (para formularios del admin)."""
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [IsAuthenticated]


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    Gestión de usuarios — CP-USR-01.
    Lecturas: ADMINISTRADOR o RECEPCION. Escrituras: solo ADMINISTRADOR.
    """
    queryset = Usuario.objects.all().select_related('rol', 'area')

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), IsAdminOrRecepcion()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return UsuarioCreateSerializer
        return UsuarioSerializer
