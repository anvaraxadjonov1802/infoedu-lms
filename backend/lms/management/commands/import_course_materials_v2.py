from django.core.management.base import CommandError
from django.db import connection
from docx import Document

from lms.importers.test_parser_v4 import parse_test_questions_document
from lms.management.commands import import_course_materials as legacy


def parse_test_questions_v2(path):
    document = Document(str(path))
    return parse_test_questions_document(document)


class Command(legacy.Command):
    help = 'InfoEdu DOCX materiallarini robust v4 test parser bilan bulk import qiladi.'

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--allow-sqlite',
            action='store_true',
            help='Faqat ataylab local test import kerak bo‘lsa SQLite uchun himoyani o‘chiradi.',
        )

    def handle(self, *args, **options):
        legacy.parse_test_questions = parse_test_questions_v2

        if not options.get('dry_run') and connection.vendor == 'sqlite' and not options.get('allow_sqlite'):
            raise CommandError(
                'REAL IMPORT BLOKLANDI: hozirgi database SQLite. '
                'Production import uchun backend/.env ichida Supabase PostgreSQL DATABASE_URL ni sozlang, '
                'so‘ng audit_course_import bilan ENGINE/HOST ni tekshiring. '
                'Faqat local test uchun ataylab import qilmoqchi bo‘lsangiz --allow-sqlite ishlating.'
            )

        return super().handle(*args, **options)
