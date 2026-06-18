import threading

from django.contrib import admin, messages
from django.http import JsonResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html
from .models import Movie, DailyTest, Clue, SelectedMovie, UsedMovie, MovieBackdrop


# ─── Inline: Fotogramas dentro del formulario de Movie ───────────────────────

class MovieBackdropInline(admin.TabularInline):
    model = MovieBackdrop
    extra = 0
    readonly_fields = ('preview', 'vote_average', 'vote_count', 'order', 'url')
    fields = ('order', 'preview', 'vote_average', 'vote_count', 'url')
    can_delete = False
    max_num = 0
    verbose_name = 'Fotograma'
    verbose_name_plural = 'Fotogramas descargados de TMDb (ordenados por relevancia)'

    def preview(self, obj):
        if obj.url:
            return format_html(
                '<img src="{}" style="height:80px;border-radius:3px;object-fit:cover;" />',
                obj.url
            )
        return '—'
    preview.short_description = 'Vista previa'


# ─── Inline: Pistas dentro del formulario de DailyTest ──────────────────────

class ClueInline(admin.StackedInline):
    model = Clue
    extra = 4
    max_num = 4
    min_num = 4
    verbose_name = 'Pista'
    verbose_name_plural = 'Pistas (exactamente 4, de más a menos difícil)'

    fields = (
        'clue_type',
        'content_text',
        'content_image',
        'content_audio',
    )

    class Media:
        js = ('movies/admin/js/backdrop_picker.js',)

    def get_extra(self, request, obj=None, **kwargs):
        # Si ya existen pistas creadas, no mostrar extras vacíos
        if obj and obj.clues.count() >= 4:
            return 0
        return 4 - (obj.clues.count() if obj else 0)


# ─── Movie ───────────────────────────────────────────────────────────────────

@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    inlines = [MovieBackdropInline]

    list_display = (
        'title', 'year', 'director', 'lead_actor',
        'rt_score', 'oscar_wins', 'poster_thumb', 'created_at',
    )
    list_filter = ('year',)
    search_fields = ('title', 'original_title', 'director', 'lead_actor')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'used_date', 'poster_preview')
    list_per_page = 30

    fieldsets = (
        ('Identificación', {
            'fields': (('tmdb_id', 'omdb_id'),)
        }),
        ('Información principal', {
            'fields': (
                ('title', 'original_title'),
                ('year', 'duration_min'),
                ('genre', 'production_country'),
                'synopsis',
            )
        }),
        ('Equipo artístico', {
            'fields': (
                ('director', 'lead_actor'),
                'screenwriter',
            )
        }),
        ('Puntuaciones y premios', {
            'fields': (
                ('rt_score', 'oscar_nominations', 'oscar_wins'),
            )
        }),
        ('Recursos multimedia', {
            'fields': (
                ('poster_url', 'poster_preview'),
                'iconic_quote',
                'spotify_track_id',
            )
        }),
        ('Estado en el sistema', {
            'fields': (
                ('is_candidate', 'is_selected', 'is_used'),
                ('used_date', 'created_at'),
            ),
            'classes': ('collapse',),
        }),
    )

    actions = ['marcar_seleccionada']

    def get_queryset(self, request):
        return super().get_queryset(request).filter(is_selected=False, is_used=False)

    # ── Reposición automática ─────────────────────────────────────────────────

    def _fetch_replacements(self, request, count):
        """Descarga `count` películas candidatas nuevas en un hilo en segundo plano."""
        user_id = request.user.id

        def _do_fetch():
            from django.core.cache import cache
            from django.db import connection
            from apps.integrations.tmdb_client import TMDbClient
            from apps.integrations.movie_builder import MovieBuilder
            try:
                existing_ids = set(Movie.objects.values_list('tmdb_id', flat=True))
                tmdb = TMDbClient()
                builder = MovieBuilder(fetch_spotify=True)
                candidate_ids = tmdb.discover_movies_mixed(
                    count=count * 3, existing_ids=existing_ids
                )
                fetched = 0
                for tmdb_id in candidate_ids:
                    if fetched >= count:
                        break
                    try:
                        movie, created = builder.build_from_tmdb_id(tmdb_id)
                        if movie and created:
                            fetched += 1
                    except Exception:
                        pass
                cache.set(
                    f'fetch_result_{user_id}',
                    ('ok', f'Descarga completada: {fetched} película(s) nueva(s) añadidas.'),
                    timeout=3600,
                )
            except Exception as e:
                cache.set(
                    f'fetch_result_{user_id}',
                    ('error', f'Error en la descarga de reemplazo: {e}'),
                    timeout=3600,
                )
            finally:
                connection.close()

        threading.Thread(target=_do_fetch, daemon=True).start()
        self.message_user(
            request,
            f'Descargando {count} película(s) de reemplazo en segundo plano.',
            messages.INFO,
        )

    def changelist_view(self, request, extra_context=None):
        from django.core.cache import cache
        result = cache.get(f'fetch_result_{request.user.id}')
        if result:
            cache.delete(f'fetch_result_{request.user.id}')
            level_str, msg = result
            level = messages.SUCCESS if level_str == 'ok' else messages.ERROR
            self.message_user(request, msg, level)
        return super().changelist_view(request, extra_context)

    def delete_model(self, request, obj):
        super().delete_model(request, obj)
        self._fetch_replacements(request, 1)

    def delete_queryset(self, request, queryset):
        count = queryset.count()
        super().delete_queryset(request, queryset)
        self._fetch_replacements(request, count)

    def poster_thumb(self, obj):
        if obj.poster_url:
            return format_html('<img src="{}" style="height:48px;border-radius:3px;" />', obj.poster_url)
        return '—'
    poster_thumb.short_description = 'Póster'

    def poster_preview(self, obj):
        if obj.poster_url:
            return format_html(
                '<img src="{}" style="max-height:120px;border-radius:4px;" />',
                obj.poster_url
            )
        return '(sin póster)'
    poster_preview.short_description = 'Vista previa póster'

    @admin.action(description='Aprobar para el calendario')
    def marcar_seleccionada(self, request, queryset):
        updated = queryset.update(is_selected=True, is_candidate=False)
        self.message_user(request, f'{updated} película(s) aprobadas para el calendario.')
        self._fetch_replacements(request, updated)


# ─── DailyTest ───────────────────────────────────────────────────────────────

@admin.register(DailyTest)
class DailyTestAdmin(admin.ModelAdmin):
    inlines = [ClueInline]

    list_display = ('fecha_programada', 'movie_link', 'pistas_completas', 'is_active', 'created_by')
    list_filter = ('is_active',)
    search_fields = ('movie__title', 'movie__director')
    ordering = ('date',)
    date_hierarchy = 'date'
    readonly_fields = ('created_at', 'created_by')

    def get_queryset(self, request):
        return super().get_queryset(request).filter(date__gte=timezone.localdate())

    def fecha_programada(self, obj):
        return obj.date
    fecha_programada.short_description = 'Fecha programada'
    fecha_programada.admin_order_field = 'date'

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'movie':
            kwargs['queryset'] = Movie.objects.filter(is_selected=True).order_by('title')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    fieldsets = (
        ('Test del día', {
            'fields': ('date', 'movie', 'is_active')
        }),
        ('Metadatos', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',),
        }),
    )

    def get_urls(self):
        urls = super().get_urls()
        extra = [
            path(
                'backdrops/<int:movie_id>/',
                self.admin_site.admin_view(self.backdrops_json),
                name='movies_dailytest_backdrops',
            ),
            path(
                'movie-data/<int:movie_id>/',
                self.admin_site.admin_view(self.movie_data_json),
                name='movies_dailytest_movie_data',
            ),
        ]
        return extra + urls

    @staticmethod
    def _oscar_categories_text(m):
        cats = m.oscar_categories or {}
        won = cats.get('won', [])
        nominated = cats.get('nominated', [])
        parts = []
        if won:
            parts.append('Ganó: ' + ', '.join(won))
        if nominated:
            parts.append('Nominada a: ' + ', '.join(nominated))
        return ' | '.join(parts) if parts else ''

    def backdrops_json(self, request, movie_id):
        """Devuelve los fotogramas de una película en formato JSON para el picker."""
        backdrops = (
            MovieBackdrop.objects
            .filter(movie_id=movie_id)
            .order_by('order')
            .values('url', 'vote_average', 'vote_count', 'order')
        )
        return JsonResponse({'backdrops': list(backdrops)})

    def movie_data_json(self, request, movie_id):
        """Devuelve los campos de la película para autorellenar las pistas."""
        try:
            m = Movie.objects.get(pk=movie_id)
        except Movie.DoesNotExist:
            return JsonResponse({}, status=404)

        if m.oscar_wins > 0:
            oscar_text = f'{m.oscar_wins} Oscar{"s" if m.oscar_wins != 1 else ""}'
            if m.oscar_nominations > m.oscar_wins:
                oscar_text += f' ({m.oscar_nominations} nominaciones)'
        elif m.oscar_nominations > 0:
            oscar_text = f'Nominada a {m.oscar_nominations} Oscar{"s" if m.oscar_nominations != 1 else ""}, 0 ganados'
        else:
            oscar_text = 'Sin nominaciones al Oscar'

        duration_text = f'{m.duration_min} minutos' if m.duration_min else ''

        return JsonResponse({
            'DIRECTOR':    m.director or '',
            'ACTOR':       m.lead_actor or '',
            'YEAR':        str(m.year) if m.year else '',
            'ROTTEN_TOMATOES':   f'{m.rt_score}%' if m.rt_score is not None else '',
            'OSCAR_CATEGORIES':  self._oscar_categories_text(m),
            'OSCARS':      oscar_text,
            'ICONIC_QUOTE': m.iconic_quote or '',
            'GENRE':       m.genre or '',
            'DURATION':    duration_text,
            'COUNTRY':     m.production_country or '',
            'SCREENWRITER': m.screenwriter or '',
        })

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
            obj.movie.is_used = True
            obj.movie.is_selected = False
            obj.movie.is_candidate = False
            obj.movie.used_date = obj.date
            obj.movie.save()
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        if formset.model is Clue:
            position = 1
            for subform in formset.forms:
                if not subform.cleaned_data or subform.cleaned_data.get('DELETE', False):
                    continue
                subform.instance.order = position
                position += 1
        super().save_formset(request, form, formset, change)

    def movie_link(self, obj):
        return format_html(
            '<strong>{}</strong> <span style="color:#888;">({}) </span>',
            obj.movie.title, obj.movie.year
        )
    movie_link.short_description = 'Película'

    def pistas_completas(self, obj):
        count = obj.clues.count()
        color = '#27ae60' if count == 4 else '#e74c3c'
        return format_html(
            '<span style="color:{};font-weight:bold;">{}/4</span>', color, count
        )
    pistas_completas.short_description = 'Pistas'


# ─── Películas seleccionadas ─────────────────────────────────────────────────

@admin.register(SelectedMovie)
class SelectedMovieAdmin(admin.ModelAdmin):
    list_display = ('title', 'year', 'director', 'genre', 'rt_score', 'oscar_wins', 'poster_thumb')
    search_fields = ('title', 'original_title', 'director')
    ordering = ('title',)
    list_per_page = 30
    actions = ['desmarcar_seleccion']

    def get_queryset(self, request):
        return super().get_queryset(request).filter(is_selected=True, is_used=False)

    def has_add_permission(self, request):
        return False

    def poster_thumb(self, obj):
        if obj.poster_url:
            return format_html('<img src="{}" style="height:48px;border-radius:3px;" />', obj.poster_url)
        return '—'
    poster_thumb.short_description = 'Póster'

    @admin.action(description='Devolver a candidatas')
    def desmarcar_seleccion(self, request, queryset):
        updated = queryset.update(is_selected=False, is_candidate=True)
        self.message_user(request, f'{updated} película(s) devueltas a candidatas.')


# ─── Películas usadas ─────────────────────────────────────────────────────────

@admin.register(UsedMovie)
class UsedMovieAdmin(admin.ModelAdmin):
    list_display = ('title', 'year', 'director', 'genre', 'used_date', 'poster_thumb')
    search_fields = ('title', 'original_title', 'director')
    ordering = ('-used_date',)
    list_per_page = 30
    date_hierarchy = 'used_date'

    def get_queryset(self, request):
        return super().get_queryset(request).filter(is_used=True)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def poster_thumb(self, obj):
        if obj.poster_url:
            return format_html('<img src="{}" style="height:48px;border-radius:3px;" />', obj.poster_url)
        return '—'
    poster_thumb.short_description = 'Póster'


# ─── Clue (vista independiente, solo para consultas) ─────────────────────────

@admin.register(Clue)
class ClueAdmin(admin.ModelAdmin):
    list_display = ('daily_test', 'order', 'clue_type', 'resumen_contenido')
    list_filter = ('clue_type',)
    search_fields = ('daily_test__movie__title',)
    ordering = ('-daily_test__date', 'order')
    readonly_fields = ('daily_test',)

    def resumen_contenido(self, obj):
        if obj.content_text:
            return obj.content_text[:60] + ('…' if len(obj.content_text) > 60 else '')
        if obj.content_image:
            return format_html('<em>🖼 Imagen: {}</em>', obj.content_image.name)
        if obj.content_audio:
            return format_html('<em>🎵 Audio: {}</em>', obj.content_audio.name)
        return '(vacía)'
    resumen_contenido.short_description = 'Contenido'
