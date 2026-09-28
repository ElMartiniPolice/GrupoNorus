"""
Serializers de usuarios — Grupo Norus.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.users.models import Area, Rol, Usuario


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id', 'nombre']


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ['id', 'nombre']


class UsuarioMiniSerializer(serializers.ModelSerializer):
    """
    Representación anidada mínima de usuario para FKs:
    {id, nombre, apellido, rut} — contrato del frontend.
    """

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'apellido', 'rut']


class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)
    area_nombre = serializers.CharField(source='area.nombre', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'rut', 'nombre', 'apellido', 'telefono',
            'rol', 'rol_nombre', 'area', 'area_nombre',
            'is_active', 'ultimo_acceso',
        ]
        read_only_fields = ['ultimo_acceso']


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """CP-USR-01: creación de usuario con rol y área."""
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = Usuario
        fields = ['id', 'rut', 'nombre', 'apellido', 'telefono',
                  'rol', 'area', 'password', 'is_active']

    def validate_rut(self, value):
        from apps.utils.rut import validar_rut
        value = value.upper().strip()
        if not validar_rut(value):
            raise serializers.ValidationError('RUT inválido.')
        if Usuario.objects.filter(rut=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este RUT.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """
    CU4 — login con RUT + contraseña.
    Añade datos del usuario al payload del token y a la respuesta.
    """
    username_field = 'rut'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['rut'] = user.rut
        token['rol'] = user.rol.nombre
        token['area'] = user.area.nombre
        token['nombre'] = f'{user.nombre} {user.apellido}'
        return token

    def validate(self, attrs):
        from django.utils import timezone

        rut = attrs.get(self.username_field, '').upper().strip()
        try:
            user = Usuario.objects.get(rut=rut)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError({'detail': 'Credenciales inválidas.'})

        if user.esta_bloqueado:
            raise serializers.ValidationError({
                'detail': f'Cuenta bloqueada temporalmente hasta '
                          f'{user.bloqueado_hasta.strftime("%H:%M")}. Intente más tarde.'
            })

        data = super().validate(attrs)
        user.registrar_acceso()
        data['user'] = UsuarioSerializer(user).data
        return data
