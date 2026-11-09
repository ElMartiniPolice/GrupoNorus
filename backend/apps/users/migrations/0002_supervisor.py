from django.db import migrations


def crear_rol_supervisor(apps, schema_editor):
    Rol = apps.get_model('users', 'Rol')
    Rol.objects.get_or_create(nombre='SUPERVISOR')


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(crear_rol_supervisor, migrations.RunPython.noop),
    ]