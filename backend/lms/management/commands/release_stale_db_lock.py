from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = 'Faqat uzoq vaqt idle in transaction holatida qolgan PostgreSQL sessionni xavfsiz terminate qiladi.'

    def add_arguments(self, parser):
        parser.add_argument('--pid', type=int, required=True)
        parser.add_argument('--min-age-seconds', type=int, default=120)

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            raise CommandError('Bu command faqat PostgreSQL uchun.')

        target_pid = options['pid']
        min_age = max(30, options['min_age_seconds'])

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    pid,
                    usename,
                    state,
                    EXTRACT(EPOCH FROM (now() - xact_start))::bigint AS age_seconds,
                    COALESCE(application_name, ''),
                    COALESCE(client_addr::text, ''),
                    LEFT(REGEXP_REPLACE(query, E'[\\n\\r\\t]+', ' ', 'g'), 260)
                FROM pg_stat_activity
                WHERE datname = current_database()
                  AND pid = %s
                  AND pid <> pg_backend_pid()
                """,
                [target_pid],
            )
            row = cursor.fetchone()

        if not row:
            self.stdout.write(self.style.WARNING(f'PID {target_pid} topilmadi yoki allaqachon yopilgan.'))
            return

        pid, user, state, age_seconds, app, addr, query = row
        self.stdout.write(
            f'PID={pid} USER={user} STATE={state} AGE={age_seconds}s '
            f'APP={app or "-"} ADDR={addr or "-"}'
        )
        self.stdout.write(f'LAST QUERY: {query}')

        if state != 'idle in transaction':
            raise CommandError(
                f'Xavfsizlik uchun terminate qilinmadi: PID {pid} holati {state!r}, '
                'idle in transaction emas.'
            )

        if age_seconds is None or age_seconds < min_age:
            raise CommandError(
                f'Xavfsizlik uchun terminate qilinmadi: transaction yoshi {age_seconds}s, '
                f'kamida {min_age}s bo‘lishi kerak.'
            )

        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_terminate_backend(%s)', [pid])
            terminated = bool(cursor.fetchone()[0])

        if not terminated:
            raise CommandError(f'PID {pid} terminate qilinmadi. DB ruxsatlarini tekshiring.')

        self.stdout.write(self.style.SUCCESS(f'PID {pid} stale transaction terminate qilindi. Locklar bo‘shatilishi kerak.'))
