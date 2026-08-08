from django.apps import AppConfig


class LmsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'lms'

    def ready(self):
        # Load automatic enrollment signals once Django has initialized models.
        from . import signals  # noqa: F401
