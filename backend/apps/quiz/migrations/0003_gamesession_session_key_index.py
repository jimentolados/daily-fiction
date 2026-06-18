from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0002_remove_gamesession_unique_user_daily_test'),
    ]

    operations = [
        migrations.AlterField(
            model_name='gamesession',
            name='session_key',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Identificador de sesión anónima',
                max_length=64,
            ),
        ),
    ]
