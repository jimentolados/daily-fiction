from django.urls import path
from .views import TodayTestView, SubmitGuessView, TodayResultView

urlpatterns = [
    path('today/',         TodayTestView.as_view(),   name='quiz-today'),
    path('today/guess/',   SubmitGuessView.as_view(),  name='quiz-guess'),
    path('today/result/',  TodayResultView.as_view(),  name='quiz-result'),
]
