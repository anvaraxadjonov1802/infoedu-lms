from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'PostgreSQL dagi uzoq/ochiq transaction va LMS jadval locklarini diagnostika qiladi.'

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            self.stdout.write('PostgreSQL emas; diagnostika o‘tkazilmadi.')
            return

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    pid,
                    usename,
                    COALESCE(application_name, ''),
                    COALESCE(client_addr::text, ''),
                    state,
                    COALESCE(now() - xact_start, interval '0') AS xact_age,
                    COALESCE(now() - query_start, interval '0') AS query_age,
                    COALESCE(wait_event_type, ''),
                    COALESCE(wait_event, ''),
                    LEFT(REGEXP_REPLACE(query, E'[\\n\\r\\t]+', ' ', 'g'), 220)
                FROM pg_stat_activity
                WHERE datname = current_database()
                  AND pid <> pg_backend_pid()
                  AND xact_start IS NOT NULL
                ORDER BY xact_start NULLS LAST
                """
            )
            rows = cursor.fetchall()

        self.stdout.write('--- OPEN TRANSACTIONS ---')
        if not rows:
            self.stdout.write('Ochiq transaction topilmadi.')
        for row in rows:
            pid, user, app, addr, state, xact_age, query_age, wait_type, wait_event, query = row
            self.stdout.write(
                f'PID={pid} USER={user} APP={app or "-"} ADDR={addr or "-"} '
                f'STATE={state} XACT_AGE={xact_age} QUERY_AGE={query_age} '
                f'WAIT={wait_type or "-"}/{wait_event or "-"}'
            )
            self.stdout.write(f'QUERY: {query}')

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    a.pid,
                    a.state,
                    c.relname,
                    l.mode,
                    l.granted,
                    COALESCE(now() - a.xact_start, interval '0') AS xact_age,
                    LEFT(REGEXP_REPLACE(a.query, E'[\\n\\r\\t]+', ' ', 'g'), 180)
                FROM pg_locks l
                JOIN pg_stat_activity a ON a.pid = l.pid
                LEFT JOIN pg_class c ON c.oid = l.relation
                WHERE a.datname = current_database()
                  AND c.relname IN ('lms_course', 'lms_theorycontent')
                ORDER BY a.xact_start NULLS LAST, a.pid
                """
            )
            lock_rows = cursor.fetchall()

        self.stdout.write('--- LMS LOCKS ---')
        if not lock_rows:
            self.stdout.write('lms_course/lms_theorycontent uchun lock topilmadi.')
        for pid, state, table, mode, granted, xact_age, query in lock_rows:
            self.stdout.write(
                f'PID={pid} TABLE={table} MODE={mode} GRANTED={granted} '
                f'STATE={state} XACT_AGE={xact_age}'
            )
            self.stdout.write(f'QUERY: {query}')
