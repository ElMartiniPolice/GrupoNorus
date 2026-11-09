import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('rooms', '0004_iteminventario'),
        ('users', '0002_supervisor'),
    ]

    operations = [
        migrations.AddField(
            model_name='habitacion',
            name='asignada_a',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='habitaciones_asignadas',
                to='users.usuario',
                verbose_name='responsable de housekeeping',
            ),
        ),
    ]