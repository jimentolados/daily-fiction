from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Movie
from .serializers import MovieSearchSerializer


class MovieSearchView(APIView):
    """
    Autocompletado de títulos de películas para el input de respuesta del quiz.
    GET /api/v1/movies/search/?q=incep  → lista de películas que coinciden
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response([])

        movies = Movie.objects.filter(
            Q(title__icontains=query) | Q(original_title__icontains=query)
        ).distinct().order_by('title')[:10]

        serializer = MovieSearchSerializer(movies, many=True, context={'request': request})
        return Response(serializer.data)
