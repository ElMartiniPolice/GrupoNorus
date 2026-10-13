#!/bin/sh
# Entrypoint del contenedor — migraciones y estáticos antes de levantar la app.
set -e

echo "==> Aplicando migraciones..."
python manage.py migrate --noinput

echo "==> Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

echo "==> Iniciando servidor..."
exec "$@"
