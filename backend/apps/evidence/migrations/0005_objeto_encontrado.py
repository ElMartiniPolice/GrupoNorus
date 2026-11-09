import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('evidence', '0004_evidenciafotografica_tarea_and_more'),
        ('users', '0002_supervisor'),
    ]

    operations = [
        migrations.CreateModel(
            name='ObjetoEncontrado',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=150, verbose_name='objeto')),
                ('descripcion', models.TextField(blank=True, verbose_name='descripción')),
                ('ubicacion', models.CharField(max_length=150, verbose_name='ubicación')),
                ('imagen', models.ImageField(upload_to='objetos_perdidos/%Y/%m/', verbose_name='imagen')),
                ('creado_en', models.DateTimeField(auto_now_add=True, verbose_name='fecha de registro')),
                ('encontrado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='objetos_encontrados', to='users.usuario', verbose_name='encontrado por')),
            ],
            options={
                'verbose_name': 'objeto encontrado',
                'verbose_name_plural': 'objetos encontrados',
                'db_table': 'objeto_encontrado',
                'ordering': ['-creado_en'],
            },
        ),
    ]