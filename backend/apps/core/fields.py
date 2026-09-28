"""
Campos personalizados de DRF — Grupo Norus.

NestedPKRelatedField — campo FK híbrido del contrato de API:
- Se LEE como objeto anidado (mini-serializer), p. ej. {id, numero}.
- Se ESCRIBE como ID plano (las pantallas usan ChipSelect keyBy="id").
"""
from rest_framework import serializers


class NestedPKRelatedField(serializers.PrimaryKeyRelatedField):
    """FK que se lee como objeto anidado y se escribe como ID plano."""

    def __init__(self, *args, serializer_class=None, **kwargs):
        assert serializer_class is not None, (
            'NestedPKRelatedField requiere serializer_class.'
        )
        self.serializer_class = serializer_class
        super().__init__(*args, **kwargs)

    def use_pk_only_optimization(self):
        # Necesitamos la instancia completa para serializarla anidada.
        return False

    def to_representation(self, value):
        if value is None:
            return None
        return self.serializer_class(value, context=self.context).data
