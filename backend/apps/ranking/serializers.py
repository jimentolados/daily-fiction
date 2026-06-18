from rest_framework import serializers
from .models import MonthlyScore


class RankingEntrySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    country = serializers.CharField(source='user.country', read_only=True)
    city = serializers.CharField(source='user.city', read_only=True)
    rank = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyScore
        fields = ('rank', 'username', 'country', 'city', 'total_score',
                  'games_played', 'correct_guesses')

    def get_rank(self, obj):
        # El rank se inyecta desde la vista via annotate o enumerate
        return getattr(obj, 'rank', None)
