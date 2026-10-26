"""
Serializadores de habitaciones y estadías — Grupo Norus.

Contrato de API (según las pantallas del frontend):
- Las FK se LEEN como objetos anidados ({id, numero} / {id, nombre})
  y se ESCRIBEN como IDs planos.
"""
from rest_framework import serializers

from apps.core.fields import NestedPKRelatedField
from apps.sedes.models import Sede
from apps.sedes.serializers import SedeMiniSerializer
from apps.users.serializers import UsuarioMiniSerializer
from .models import (
    CambioEstadoHabitacion,
    Habitacion,
    RegistroEstadia,
    TipoHabitacion,
)


class TipoHabitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoHabitacion
        fields = ['id', 'nombre']


class HabitacionMiniSerializer(serializers.ModelSerializer):
    """Versión mínima para anidar en tareas/incidencias: {id, numero, sede}."""

    sede = SedeMiniSerializer(read_only=True)

    class Meta:
        model = Habitacion
        fields = ['id', 'numero', 'sede']


class HabitacionSerializer(serializers.ModelSerializer):
    tipo = NestedPKRelatedField(
        queryset=TipoHabitacion.objects.all(),
        serializer_class=TipoHabitacionSerializer,
    )
    # La sede NUNCA la envía el cliente: la fija el servidor.
    sede = SedeMiniSerializer(read_only=True)

    class Meta:
        model = Habitacion
        fields = ['id', 'numero', 'tipo', 'sede', 'estado']

    def validate(self, attrs):
        # Al ser sede read_only, DRF omite el UniqueTogetherValidator,
        # así que validamos la unicidad (sede, numero) a mano.
        request = self.context.get('request')
        if self.instance is not None:
            sede_id = self.instance.sede_id
        else:
            sede_id = getattr(request.user, 'sede_id', None) if request else None
        numero = attrs.get('numero', getattr(self.instance, 'numero', None))
        if numero is not None:
            qs = Habitacion.objects.filter(sede_id=sede_id, numero=numero)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'numero': 'Ya existe una habitación con ese número en esta sede.'}
                )
        return attrs


class RegistroEstadiaSerializer(serializers.ModelSerializer):
    # ... (campos y Meta sin cambios)

    def validate_habitacion(self, habitacion):
        request = self.context.get('request')
        if request and habitacion.sede_id != request.user.sede_id:
            raise serializers.ValidationError(
                'La habitación no pertenece a su sede.'
            )
        return habitacion

class CambioEstadoHabitacionSerializer(serializers.ModelSerializer):
    """
    Cambio de estado de una habitación (historial con foto opcional).

    - `habitacion` y `cambiado_por` se LEEN anidados; el registro se
      crea desde la acción `cambiar_estado` (no por POST directo).
    - `foto` (ImageField) se lee como URL absoluta gracias al
      `context={'request': request}` de la vista.
    """
    habitacion = HabitacionMiniSerializer(read_only=True)
    cambiado_por = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = CambioEstadoHabitacion
        fields = [
            'id', 'habitacion', 'estado_anterior', 'estado_nuevo',
            'foto', 'cambiado_por', 'fecha',
        ]
