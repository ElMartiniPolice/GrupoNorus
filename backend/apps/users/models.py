"""
Modelos de usuarios — Grupo Norus.

USUARIO: login con RUT (o credencial) + contraseña. No se usa email.
ROL: ADMINISTRADOR, OPERARIO, RECEPCION.
AREA: RECEPCION, MANTENCION, HOUSEKEEPING.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UsuarioManager(BaseUserManager):
    """Manager con RUT como identificador principal (CU4)."""

    def create_user(self, rut, password=None, **extra_fields):
        if not rut:
            raise ValueError('El RUT es obligatorio.')
        user = self.model(rut=rut.upper().strip(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, rut, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(rut, password, **extra_fields)


class Rol(models.Model):
    """Rol operativo del usuario (CP-DP-02)."""
    nombre = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'rol'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.nombre


class Area(models.Model):
    """Área operativa del hotel."""
    nombre = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'area'
        verbose_name = 'Área'
        verbose_name_plural = 'Áreas'

    def __str__(self):
        return self.nombre


class Usuario(AbstractBaseUser, PermissionsMixin):
    """
    Usuario del sistema — CU4 (iniciar sesión con RUT).
    CP-AUT-02: bloqueo temporal tras intentos fallidos.
    """
    rut = models.CharField(max_length=12, unique=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True)

    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, related_name='usuarios')
    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name='usuarios')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # CP-AUT-02 — control de intentos fallidos
    intentos_fallidos = models.PositiveIntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    ultimo_acceso = models.DateTimeField(null=True, blank=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'rut'
    REQUIRED_FIELDS = ['nombre', 'apellido']

    class Meta:
        db_table = 'usuario'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f'{self.nombre} {self.apellido} ({self.rut})'

    @property
    def esta_bloqueado(self):
        return bool(self.bloqueado_hasta and self.bloqueado_hasta > timezone.now())

    def registrar_intento_fallido(self):
        """CP-AUT-02: tras MAX_LOGIN_ATTEMPTS fallidos, bloquear temporalmente."""
        from django.conf import settings
        self.intentos_fallidos += 1
        if self.intentos_fallidos >= settings.MAX_LOGIN_ATTEMPTS:
            self.bloqueado_hasta = timezone.now() + timedelta(
                minutes=settings.LOGIN_BLOCK_MINUTES
            )
            self.intentos_fallidos = 0
        self.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])

    def registrar_acceso(self):
        self.intentos_fallidos = 0
        self.bloqueado_hasta = None
        self.ultimo_acceso = timezone.now()
        self.save(update_fields=['intentos_fallidos', 'bloqueado_hasta', 'ultimo_acceso'])


# Import tardío para evitar circularidad
from django.utils import timezone  # noqa: E402
from datetime import timedelta  # noqa: E402
