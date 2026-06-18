from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from .models import MonthlyScore, Achievement, UserAchievement


@admin.register(MonthlyScore)
class MonthlyScoreAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'mes_año', 'total_score', 'games_played',
        'correct_guesses', 'porcentaje_acierto',
    )
    list_filter = ('year', 'month')
    search_fields = ('user__username', 'user__email', 'user__city', 'user__country')
    ordering = ('-year', '-month', '-total_score')
    readonly_fields = ('user', 'year', 'month', 'total_score', 'games_played', 'correct_guesses')
    list_per_page = 50

    def mes_año(self, obj):
        meses = [
            '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ]
        return f"{meses[obj.month]} {obj.year}"
    mes_año.short_description = 'Mes'
    mes_año.admin_order_field = 'month'

    def porcentaje_acierto(self, obj):
        if obj.games_played == 0:
            return '—'
        pct = round((obj.correct_guesses / obj.games_played) * 100)
        color = '#27ae60' if pct >= 70 else '#e67e22' if pct >= 40 else '#e74c3c'
        return format_html('<span style="color:{};">{}%</span>', color, pct)
    porcentaje_acierto.short_description = '% Acierto'

    def has_add_permission(self, request):
        return False


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'category', 'description_corta', 'veces_otorgado')
    list_filter = ('category',)
    search_fields = ('name', 'code', 'description')
    ordering = ('category', 'name')

    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'category', 'icon', 'description')
        }),
    )

    def description_corta(self, obj):
        return obj.description[:70] + ('…' if len(obj.description) > 70 else '')
    description_corta.short_description = 'Descripción'

    def veces_otorgado(self, obj):
        count = obj.user_achievements.count()
        return format_html('<strong>{}</strong>', count)
    veces_otorgado.short_description = 'Veces otorgado'


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ('user', 'achievement', 'nombre_dinamico', 'earned_at')
    list_filter = ('achievement__category', 'earned_at')
    search_fields = ('user__username', 'achievement__name')
    ordering = ('-earned_at',)
    readonly_fields = ('user', 'achievement', 'earned_at', 'metadata')

    def nombre_dinamico(self, obj):
        return obj.get_display_name()
    nombre_dinamico.short_description = 'Logro completo'

    def has_add_permission(self, request):
        # Los logros se otorgan automáticamente por la lógica de la app
        return False
