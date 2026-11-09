import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('evidence', '0005_objeto_encontrado'),
        ('rooms', '0004_iteminventario'),
    ]

    operations = [
        migrations.AddField(
            model_name='objetoencontrado',
            name='habitacion',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='objetos_encontrados',
                to='rooms.habitacion',
                verbose_name='habitación',
            ),
        ),
    ]