from datetime import date

from django.core.management.base import BaseCommand
from django.db.models import Max

from apps.ranking.models import MonthlyScore, Achievement, UserAchievement
from apps.users.models import CustomUser


class Command(BaseCommand):
    help = (
        'Cierra el mes: calcula el ranking final, otorga logros a los ganadores '
        'y deja limpio el sistema para el mes nuevo. '
        'Se ejecuta automáticamente el día 1 de cada mes a las 00:01.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--year', type=int, help='Año del mes a cerrar (por defecto: mes anterior al actual)'
        )
        parser.add_argument(
            '--month', type=int, help='Mes a cerrar (por defecto: mes anterior al actual)'
        )

    def handle(self, *args, **options):
        today = date.today()

        # Por defecto, cerrar el mes anterior
        if options.get('year') and options.get('month'):
            year, month = options['year'], options['month']
        else:
            if today.month == 1:
                year, month = today.year - 1, 12
            else:
                year, month = today.year, today.month - 1

        month_names = [
            '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ]
        month_str = f'{month_names[month]} {year}'

        self.stdout.write(self.style.NOTICE(f'\nCerrando ranking de {month_str}...'))

        scores = MonthlyScore.objects.filter(
            year=year, month=month
        ).select_related('user').order_by('-total_score')

        if not scores.exists():
            self.stdout.write(self.style.WARNING('  No hay puntuaciones para este mes.'))
            return

        self.stdout.write(f'  → {scores.count()} jugadores participaron.')

        # ── Ranking global ────────────────────────────────────────────────────
        self._award_ranking_achievements(
            scores=scores,
            scope_label=month_str,
            metadata_extra={},
        )

        # ── Ranking por país ──────────────────────────────────────────────────
        countries = CustomUser.objects.filter(
            monthly_scores__year=year,
            monthly_scores__month=month,
        ).values_list('country', flat=True).distinct()

        for country in countries:
            if not country:
                continue
            country_scores = scores.filter(user__country=country)
            self._award_ranking_achievements(
                scores=country_scores,
                scope_label=f'{month_str} ({country})',
                metadata_extra={'country': country},
                codes=('CHAMPION_COUNTRY', 'PODIUM_COUNTRY'),
            )

        # ── Ranking por ciudad ────────────────────────────────────────────────
        cities = CustomUser.objects.filter(
            monthly_scores__year=year,
            monthly_scores__month=month,
        ).values_list('city', 'country').distinct()

        for city, country in cities:
            if not city:
                continue
            city_scores = scores.filter(user__city=city, user__country=country)
            self._award_ranking_achievements(
                scores=city_scores,
                scope_label=f'{month_str} ({city})',
                metadata_extra={'city': city, 'country': country},
                codes=('CHAMPION_CITY',),
            )

        self.stdout.write(self.style.SUCCESS(f'\n✓ Ranking de {month_str} cerrado correctamente.'))

    def _award_ranking_achievements(self, scores, scope_label, metadata_extra,
                                    codes=('CHAMPION_GLOBAL', 'PODIUM_GLOBAL', 'TOP10_GLOBAL')):
        """
        Otorga los logros de ranking a los mejores jugadores del scope dado.
        codes: tupla de achievement codes a otorgar (en orden: 1º, top3, top10).
        """
        today = date.today()
        if today.month == 1:
            year, month = today.year - 1, 12
        else:
            year, month = today.year, today.month - 1

        month_names = [
            '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ]
        metadata_base = {
            'month': month_names[month],
            'year': year,
            **metadata_extra,
        }

        scores_list = list(scores)
        if not scores_list:
            return

        achievements = {a.code: a for a in Achievement.objects.filter(code__in=codes)}

        def award(user, code):
            achievement = achievements.get(code)
            if achievement:
                UserAchievement.objects.create(
                    user=user,
                    achievement=achievement,
                    metadata=metadata_base,
                )
                self.stdout.write(
                    f'  ✓ Logro "{achievement.name}" → {user.username} [{scope_label}]'
                )

        # 1º puesto
        if len(codes) >= 1 and scores_list:
            award(scores_list[0].user, codes[0])

        # Top 3 (podio)
        if len(codes) >= 2:
            for score in scores_list[1:3]:
                award(score.user, codes[1])

        # Top 10
        if len(codes) >= 3:
            for score in scores_list[3:10]:
                award(score.user, codes[2])
