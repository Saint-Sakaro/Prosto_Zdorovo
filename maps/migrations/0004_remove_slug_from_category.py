# Generated manually - удаление поля slug из POICategory

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('maps', '0003_remove_health_weight_and_importance'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='poicategory',
            name='slug',
        ),
    ]
