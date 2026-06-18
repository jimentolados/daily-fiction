from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0008_alter_movie_oscar_categories'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='movie',
            name='spotify_track_id',
        ),
        migrations.RemoveField(
            model_name='clue',
            name='content_audio',
        ),
    ]
