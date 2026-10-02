"""
Validación de archivos subidos — Grupo Norus.

CP-FOT-01: las evidencias y fotos de cambio de estado deben ser
imágenes reales (contenido verificado con Pillow, no solo la
extensión) y no superar el límite de tamaño.
"""
from django.conf import settings
from django.core.exceptions import ValidationError

from PIL import Image, UnidentifiedImageError

EXTENSIONES_PERMITIDAS = {'jpg', 'jpeg', 'png', 'webp'}


def validar_imagen(archivo):
    """
    Valida un archivo subido como imagen; acepta None (foto opcional).

    - Extensión dentro de EXTENSIONES_PERMITIDAS.
    - Tamaño <= settings.MAX_IMAGE_UPLOAD_MB.
    - Contenido decodificable como imagen (Pillow verify).
    """
    if archivo is None:
        return
    extension = archivo.name.rsplit('.', 1)[-1].lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        raise ValidationError('La imagen debe ser JPG, PNG o WEBP.')
    if archivo.size > settings.MAX_IMAGE_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(
            f'La imagen supera el máximo de {settings.MAX_IMAGE_UPLOAD_MB} MB.'
        )
    try:
        with Image.open(archivo) as imagen:
            imagen.verify()
    except (UnidentifiedImageError, OSError):
        raise ValidationError('El archivo no es una imagen válida.')
    finally:
        # verify() consume el stream: rebobinar para que el guardado posterior funcione.
        archivo.seek(0)
