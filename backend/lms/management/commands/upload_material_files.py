from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from lms.management.commands.import_course_materials import discover_files, file_attachment
from lms.models import Course, Lesson, TheoryContent


class Command(BaseCommand):
    help = 'Mavjud kurs materiallariga original DOCX fayllarni alohida yuklaydi.'

    def add_arguments(self, parser):
        parser.add_argument('--root', default='import_materials')
        parser.add_argument('--course-code', default='DAST-101')

    def handle(self, *args, **options):
        root = Path(options['root']).resolve()
        if connection.vendor == 'sqlite':
            raise CommandError('PostgreSQL DATABASE_URL kerak.')
        if not root.is_dir():
            raise CommandError(f'Papka topilmadi: {root}')
        course = Course.objects.filter(code=options['course_code']).first()
        if not course:
            raise CommandError('Kurs topilmadi.')

        files = discover_files(root)
        jobs = []
        for n, path in sorted(files['theory'].items()):
            m = ((n - 1) // 5) + 1
            order = ((n - 1) % 5) * 2 + 1
            jobs.append((f'{n}-mavzu', path, m, order, 'theory', f'courses/{course.code}/theory/topic-{n}'))
        for m, path in sorted(files['practical'].items()):
            jobs.append((f'{m}-modul amaliy', path, m, 11, 'practical', f'courses/{course.code}/practical/module-{m}'))
        for m, path in sorted(files['independent'].items()):
            jobs.append((f'{m}-modul mustaqil', path, m, 12, 'independent', f'courses/{course.code}/independent/module-{m}'))

        uploaded = skipped = 0
        errors = []
        for label, path, module_no, order, lesson_type, folder in jobs:
            try:
                lesson = Lesson.objects.get(module__course=course, module__order=module_no, order=order, lesson_type=lesson_type)
                content = TheoryContent.objects.get(lesson=lesson)
                if content.attachments:
                    skipped += 1
                    self.stdout.write(f'SKIP {label}')
                    continue
                item = file_attachment(path, folder, True)
                TheoryContent.objects.filter(pk=content.pk, attachments=[]).update(attachments=[item])
                uploaded += 1
                self.stdout.write(self.style.SUCCESS(f'OK {label}'))
            except Exception as exc:
                errors.append(f'{label}: {exc}')
                self.stdout.write(self.style.ERROR(f'XATO {label}: {exc}'))

        qs = TheoryContent.objects.filter(lesson__module__course=course)
        total = sum(len(x.attachments or []) for x in qs)
        missing = sum(1 for x in qs if not x.attachments)
        self.stdout.write(f'ATTACHMENTS: {total}; WITHOUT FILE: {missing}; UPLOADED: {uploaded}; SKIPPED: {skipped}')
        if errors:
            raise CommandError('Ba’zi fayllar yuklanmadi; commandni qayta ishga tushirish mumkin.')
        if total == 27 and missing == 0:
            self.stdout.write(self.style.SUCCESS('ATTACHMENT AUDIT: OK (27/27)'))
