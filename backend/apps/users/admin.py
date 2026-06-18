from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name = 'Estadísticas'
    fields = (
        ('movies_solved_count', 'total_points_all_time'),
        ('current_streak', 'max_streak'),
        'last_played_date',
    )
    readonly_fields = (
        'movies_solved_count', 'total_points_all_time',
        'current_streak', 'max_streak', 'last_played_date',
    )


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    inlines = [UserProfileInline]

    list_display = ('username', 'email', 'full_name', 'country', 'city', 'is_staff', 'date_joined')
    list_filter = ('is_staff', 'is_active', 'country')
    search_fields = ('username', 'email', 'full_name', 'city')
    ordering = ('-date_joined',)

    fieldsets = (
        ('Cuenta', {
            'fields': ('email', 'username', 'password')
        }),
        ('Información personal', {
            'fields': ('full_name', 'country', 'city', 'google_id')
        }),
        ('Permisos', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',),
        }),
        ('Fechas', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',),
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'full_name', 'country', 'city', 'password1', 'password2'),
        }),
    )

    readonly_fields = ('last_login', 'date_joined')
