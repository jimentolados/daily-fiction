from django.contrib import admin
from django.utils.html import format_html
from .models import GameSession, GuessAttempt


class GuessAttemptInline(admin.TabularInline):
    model = GuessAttempt
    extra = 0
    can_delete = False
    readonly_fields = ('clue_number', 'attempt_text', 'is_correct', 'attempted_at')
    fields = ('clue_number', 'attempt_text', 'is_correct', 'attempted_at')

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    inlines = [GuessAttemptInline]

    list_display = (
        'jugador', 'daily_test', 'resultado_badge',
        'final_score', 'clues_revealed', 'is_completed', 'started_at',
    )
    list_filter = ('is_completed', 'movie_guessed', 'daily_test__date')
    search_fields = ('user__username', 'user__email', 'session_key')
    ordering = ('-started_at',)
    readonly_fields = (
        'user', 'daily_test', 'session_key', 'started_at', 'completed_at',
        'is_completed', 'clues_revealed', 'final_score', 'movie_guessed', 'guessed_at_clue',
    )

    fieldsets = (
        ('Jugador', {
            'fields': ('user', 'session_key')
        }),
        ('Test', {
            'fields': ('daily_test',)
        }),
        ('Progreso', {
            'fields': (
                ('clues_revealed', 'is_completed'),
                ('movie_guessed', 'guessed_at_clue'),
                'final_score',
            )
        }),
        ('Tiempos', {
            'fields': ('started_at', 'completed_at'),
            'classes': ('collapse',),
        }),
    )

    def jugador(self, obj):
        if obj.user:
            return format_html('<strong>{}</strong>', obj.user.username)
        return format_html('<em style="color:#aaa;">Anónimo ({})</em>', obj.session_key[:8])
    jugador.short_description = 'Jugador'

    def resultado_badge(self, obj):
        if not obj.is_completed:
            return format_html('<span style="color:#888;">En curso</span>')
        if obj.movie_guessed:
            color = '#27ae60'
            texto = f'✓ Acertó (pista {obj.guessed_at_clue})'
        else:
            color = '#e74c3c'
            texto = '✗ No acertó'
        return format_html('<span style="color:{};font-weight:bold;">{}</span>', color, texto)
    resultado_badge.short_description = 'Resultado'

    def has_add_permission(self, request):
        return False


@admin.register(GuessAttempt)
class GuessAttemptAdmin(admin.ModelAdmin):
    list_display = ('game_session', 'clue_number', 'attempt_text', 'is_correct', 'attempted_at')
    list_filter = ('is_correct', 'clue_number')
    search_fields = ('attempt_text', 'game_session__user__username')
    ordering = ('-attempted_at',)
    readonly_fields = ('game_session', 'clue_number', 'attempt_text', 'is_correct', 'attempted_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
