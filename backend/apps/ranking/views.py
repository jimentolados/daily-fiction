from datetime import date

from django.db.models import Window, F
from django.db.models.functions import Rank
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import MonthlyScore
from .serializers import RankingEntrySerializer


def _current_month():
    today = date.today()
    return today.year, today.month


class RankingPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class RankingView(APIView):
    """
    GET /api/v1/ranking/monthly/
    Ranking completo paginado (20 por página).
    Filtros opcionales: ?country=España&city=Madrid
    """
    permission_classes = [AllowAny]

    def get(self, request):
        year, month = _current_month()
        country = request.query_params.get('country', '').strip()
        city = request.query_params.get('city', '').strip()

        qs = MonthlyScore.objects.filter(
            year=year, month=month
        ).select_related('user').order_by('-total_score', 'user__username')

        if country:
            qs = qs.filter(user__country__iexact=country)
        if city:
            qs = qs.filter(user__city__iexact=city)

        qs = qs.annotate(
            rank=Window(expression=Rank(), order_by=[F('total_score').desc()])
        )

        paginator = RankingPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = RankingEntrySerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class RankingSummaryView(APIView):
    """
    GET /api/v1/ranking/monthly/summary/
    Vista compacta: top 3 + posición del usuario autenticado.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        year, month = _current_month()
        country = request.query_params.get('country', '').strip()
        city = request.query_params.get('city', '').strip()

        qs = MonthlyScore.objects.filter(
            year=year, month=month
        ).select_related('user').order_by('-total_score', 'user__username')

        if country:
            qs = qs.filter(user__country__iexact=country)
        if city:
            qs = qs.filter(user__city__iexact=city)

        total_players = qs.count()
        top3 = list(qs[:3])
        for i, s in enumerate(top3, 1):
            s.rank = i

        user_entry = None
        if request.user.is_authenticated:
            user_score = qs.filter(user=request.user).first()
            if user_score:
                user_score.rank = qs.filter(total_score__gt=user_score.total_score).count() + 1
                user_entry = user_score

        return Response({
            'top3': RankingEntrySerializer(top3, many=True).data,
            'user_position': RankingEntrySerializer(user_entry).data if user_entry else None,
            'total_players': total_players,
        })
