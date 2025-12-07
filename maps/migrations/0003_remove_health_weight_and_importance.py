# Generated manually - удаление полей health_weight и health_importance

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('maps', '0002_change_moderation_status_default_to_pending'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='poicategory',
            name='health_weight',
        ),
        migrations.RemoveField(
            model_name='poicategory',
            name='health_importance',
        ),
    ]
