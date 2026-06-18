from rest_framework import serializers
from .models import Movie, Clue, DailyTest


class ClueSerializer(serializers.ModelSerializer):
    """Pista revelada al usuario. Nunca incluye datos de la película."""
    clue_type_display = serializers.CharField(source='get_clue_type_display', read_only=True)
    content_image = serializers.SerializerMethodField()

    class Meta:
        model = Clue
        fields = (
            'order', 'clue_type', 'clue_type_display',
            'content_text', 'content_image',
        )

    def get_content_image(self, obj):
        # Archivo subido (ImageField)
        if obj.content_image:
            request = self.context.get('request')
            url = obj.content_image.url
            return request.build_absolute_uri(url) if request else url
        # URL externa almacenada en content_text (backdrops de TMDb)
        if obj.clue_type == 'IMAGE' and obj.content_text:
            return obj.content_text
        return None


class MovieResultSerializer(serializers.ModelSerializer):
    """Datos de la película revelados al completar el test."""
    class Meta:
        model = Movie
        fields = (
            'title', 'original_title', 'year', 'director',
            'lead_actor', 'synopsis', 'poster_url',
            'rt_score', 'oscar_wins', 'genre',
        )


class MovieSearchSerializer(serializers.ModelSerializer):
    """Resultado del autocompletado al escribir en el input de respuesta."""
    class Meta:
        model = Movie
        fields = ('id', 'title', 'original_title', 'year', 'poster_url')
