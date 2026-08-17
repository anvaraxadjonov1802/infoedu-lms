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
            module_no = ((n - 1) // 5) + 1
            jobs.append({
                'label': f'{n}-mavzu', 'path': path, 'module': module_no,
                'lesson_type': 'theory', 'topic': n,
                'folder': f'courses/{course.code}/theory/topic-{n}',
            })
        for module_no, path in sorted(files['practical'].items()):
            jobs.append({
                'label': f'{module_no}-modul amaliy', 'path': path, 'module': module_no,
                'lesson_type': 'practical', 'topic': None,
                'folder': f'courses/{course.code}/practical/module-{module_no}',
            })
        for module_no, path in sorted(files['independent'].items()):
            jobs.append({
                'label': f'{module_no}-modul mustaqil', 'path': path, 'module': module_no,
                'lesson_type': 'independent', 'topic': None,
                'folder': f'courses/{course.code}/independent/module-{module_no}',
            })

        uploaded = skipped = 0
        errors = []
        for job in jobs:
            try:
                lesson_qs = Lesson.objects.filter(
                    module__course=course,
                    module__order=job['module'],
                    lesson_type=job['lesson_type'],
                )
                if job['topic']:
                    lesson_qs = lesson_qs.filter(description__istartswith=f"{job['topic']}-mavzu")
                lesson = lesson_qs.first()
                if not lesson:
                    raise CommandError(f"Dars topilmadi: {job['label']}")

                content = TheoryContent.objects.get(lesson=lesson)
                attachments = list(content.attachments or [])
                has_original = any(
                    str(item.get('type', '')).lower() == 'docx'
                    for item in attachments
                )
                if has_original:
                    skipped += 1
                    self.stdout.write(f"SKIP {job['label']}")
                    continue

                item = file_attachment(job['path'], job['folder'], True)
                attachments.append(item)
                TheoryContent.objects.filter(pk=content.pk).update(attachments=attachments)
                uploaded += 1
                self.stdout.write(self.style.SUCCESS(f"OK {job['label']}"))
            except Exception as exc:
                errors.append(f"{job['label']}: {exc}")
                self.stdout.write(self.style.ERROR(f"XATO {job['label']}: {exc}"))

        contents = list(TheoryContent.objects.filter(lesson__module__course=course))
        original_count = sum(
            1 for content in contents
            if any(str(item.get('type', '')).lower() == 'docx' for item in (content.attachments or []))
        )
        missing = len(contents) - original_count
        self.stdout.write(
            f'ORIGINAL DOCX: {original_count}/{len(contents)}; WITHOUT DOCX: {missing}; '
            f'UPLOADED: {uploaded}; SKIPPED: {skipped}'
        )
        if errors:
            raise CommandError('Ba’zi fayllar yuklanmadi; commandni qayta ishga tushirish mumkin.')
        if original_count == 27 and missing == 0:
            self.stdout.write(self.style.SUCCESS('ATTACHMENT AUDIT: OK (27/27)'))
