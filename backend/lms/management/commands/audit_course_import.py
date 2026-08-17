from django.conf import settings
from django.core.management.base import BaseCommand

from lms.models import Course, Lesson, Module, Presentation, Question, Test, TheoryContent


class Command(BaseCommand):
    help = 'Bulk import qilingan kursni va aktiv database manzilini xavfsiz audit qiladi.'

    def add_arguments(self, parser):
        parser.add_argument('--course-code', default='DAST-101')

    def handle(self, *args, **options):
        db = settings.DATABASES['default']
        self.stdout.write('--- DATABASE ---')
        self.stdout.write(f"ENGINE: {db.get('ENGINE', '')}")
        self.stdout.write(f"NAME: {db.get('NAME', '')}")
        self.stdout.write(f"HOST: {db.get('HOST', '')}")
        self.stdout.write(f"PORT: {db.get('PORT', '')}")

        course = Course.objects.filter(code=options['course_code']).first()
        if not course:
            self.stdout.write(self.style.WARNING(f"Kurs topilmadi: {options['course_code']}"))
            return

        modules = Module.objects.filter(course=course)
        lessons = Lesson.objects.filter(module__course=course)
        tests = Test.objects.filter(lesson__module__course=course)
        questions = Question.objects.filter(test__lesson__module__course=course)
        materials = TheoryContent.objects.filter(lesson__module__course=course)
        presentations = Presentation.objects.filter(lesson__module__course=course)

        self.stdout.write('--- COURSE ---')
        self.stdout.write(f"CODE: {course.code}")
        self.stdout.write(f"TITLE: {course.title}")
        self.stdout.write(f"STATUS: {course.status}")
        self.stdout.write(f"MODULES: {modules.count()}")
        self.stdout.write(f"LESSONS: {lessons.count()}")
        self.stdout.write(f"TEXT MATERIALS: {materials.count()}")
        self.stdout.write(f"PRESENTATIONS: {presentations.count()}")
        self.stdout.write(f"TESTS: {tests.count()}")
        self.stdout.write(f"QUESTIONS: {questions.count()}")

        missing_content = lessons.filter(
            lesson_type__in=['theory', 'practical', 'independent'],
            theory_content__isnull=True,
        ).count()
        missing_presentation_files = presentations.filter(file_url='').count()
        tests_without_questions = tests.filter(questions__isnull=True).distinct().count()
        self.stdout.write(f"TEXT LESSONS WITHOUT CONTENT: {missing_content}")
        self.stdout.write(f"PRESENTATIONS WITHOUT FILE: {missing_presentation_files}")
        self.stdout.write(f"TESTS WITHOUT QUESTIONS: {tests_without_questions}")

        expected = {
            'modules': 4,
            'lessons': 67,
            'materials': 27,
            'presentations': 20,
            'tests': 20,
            'questions': 485,
        }
        actual = {
            'modules': modules.count(),
            'lessons': lessons.count(),
            'materials': materials.count(),
            'presentations': presentations.count(),
            'tests': tests.count(),
            'questions': questions.count(),
        }
        ok = all(actual[key] == value for key, value in expected.items())
        ok = ok and missing_content == 0 and missing_presentation_files == 0 and tests_without_questions == 0

        if ok:
            self.stdout.write(self.style.SUCCESS('AUDIT: OK'))
        else:
            self.stdout.write(self.style.WARNING(
                f"AUDIT: CHECK REQUIRED. Expected={expected}, Actual={actual}"
            ))
