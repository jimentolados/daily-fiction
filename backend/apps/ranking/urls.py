from django.urls import path
from .views import RankingView, RankingSummaryView

urlpatterns = [
    path('monthly/',         RankingView.as_view(),        name='ranking-monthly'),
    path('monthly/summary/', RankingSummaryView.as_view(), name='ranking-summary'),
]
