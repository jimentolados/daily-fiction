from rest_framework import serializers
from apps.movies.serializers import ClueSerializer, MovieResultSerializer
from .models import GameSession
from .scoring import MAX_FINAL_ATTEMPTS


class GameSessionSerializer(serializers.ModelSerializer):
    """
    Estado completo de la sesión del usuario para el test del día.
    Es lo que devuelve GET /quiz/today/.
    """
    revealed_clues = serializers.SerializerMethodField()
    remaining_final_attempts = serializers.SerializerMethodField()
    movie = serializers.SerializerMethodField()

    class Meta:
        model = GameSession
        fields = (
            'session_key',
            'is_completed',
            'movie_guessed',
            'final_score',
            'clues_revealed',
            'guessed_at_clue',
            'remaining_final_attempts',
            'revealed_clues',
            'movie',
        )

    def get_revealed_clues(self, obj):
        clues = obj.daily_test.clues.filter(
            order__lte=obj.clues_revealed
        ).order_by('order')
        return ClueSerializer(clues, many=True, context=self.context).data

    def get_remaining_final_attempts(self, obj):
        """Solo relevante cuando ya se mostraron las 4 pistas y no se acertó."""
        if obj.clues_revealed < 4 or obj.is_completed:
            return None
        used = obj.attempts.filter(clue_number=5).count()
        return MAX_FINAL_ATTEMPTS - used

    def get_movie(self, obj):
        """Solo se devuelve la película cuando la sesión está completada."""
        if not obj.is_completed:
            return None
        return MovieResultSerializer(obj.daily_test.movie, context=self.context).data
