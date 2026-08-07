import io
import os

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed InfoEdu demo data safely during deployment.'

    def handle(self, *args, **options):
        # Treat a missing or blank Render secret as unset so the demo remains usable.
        if not os.getenv('DEMO_PASSWORD'):
            os.environ['DEMO_PASSWORD'] = 'InfoEdu2026!'

        # seed_demo is idempotent. Suppress its output because it includes the demo password.
        output = io.StringIO()
        call_command('seed_demo', stdout=output)
        self.stdout.write(self.style.SUCCESS('InfoEdu demo data tayyor.'))
