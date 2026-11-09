from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('evidence', '0006_objetoencontrado_habitacion'),
    ]

    operations = [
        migrations.AlterField(
            model_name='objetoencontrado',
            name='imagen',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='objetos_perdidos/%Y/%m/',
                verbose_name='imagen',
            ),
        ),
    ]