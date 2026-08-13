from docx import Document

from lms.importers.test_parser_v3 import parse_test_questions_document
from lms.management.commands import import_course_materials as legacy


def parse_test_questions_v2(path):
    document = Document(str(path))
    return parse_test_questions_document(document)


class Command(legacy.Command):
    help = 'InfoEdu DOCX materiallarini robust v3 test parser bilan bulk import qiladi.'

    def handle(self, *args, **options):
        legacy.parse_test_questions = parse_test_questions_v2
        return super().handle(*args, **options)
