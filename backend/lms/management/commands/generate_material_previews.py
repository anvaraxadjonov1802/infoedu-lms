import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from lms.management.commands.import_course_materials import discover_files, file_attachment
from lms.models import Course, Lesson, TheoryContent


class Command(BaseCommand):
    help = (
        'Windows Microsoft Word orqali original DOCX materiallardan yuqori fidelity PDF preview yaratadi, '
        'Supabase Storage ga yuklaydi va mavjud TheoryContent attachmentlariga bog‘laydi.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--root', default='import_materials')
        parser.add_argument('--course-code', default='DAST-101')
        parser.add_argument('--force-convert', action='store_true')
        parser.add_argument('--force-upload', action='store_true')

    def handle(self, *args, **options):
        if connection.vendor == 'sqlite':
            raise CommandError('PostgreSQL DATABASE_URL kerak.')
        if os.name != 'nt':
            raise CommandError('Bu command Windows + Microsoft Word o‘rnatilgan kompyuterda ishlaydi.')

        root = Path(options['root']).resolve()
        if not root.is_dir():
            raise CommandError(f'Papka topilmadi: {root}')

        course = Course.objects.filter(code=options['course_code']).first()
        if not course:
            raise CommandError(f'Kurs topilmadi: {options["course_code"]}')

        powershell = shutil.which('powershell') or shutil.which('pwsh')
        if not powershell:
            raise CommandError('PowerShell topilmadi.')

        files = discover_files(root)
        cache_root = root.parent / '.preview_cache' / course.code
        cache_root.mkdir(parents=True, exist_ok=True)

        jobs = []
        for n, path in sorted(files['theory'].items()):
            module_no = ((n - 1) // 5) + 1
            order = ((n - 1) % 5) * 2 + 1
            jobs.append({
                'label': f'{n}-mavzu',
                'path': path,
                'module': module_no,
                'order': order,
                'lesson_type': 'theory',
                'storage_folder': f'courses/{course.code}/previews/theory/topic-{n}',
                'cache_name': f'theory-topic-{n}.pdf',
            })
        for module_no, path in sorted(files['practical'].items()):
            jobs.append({
                'label': f'{module_no}-modul amaliy',
                'path': path,
                'module': module_no,
                'order': 11,
                'lesson_type': 'practical',
                'storage_folder': f'courses/{course.code}/previews/practical/module-{module_no}',
                'cache_name': f'practical-module-{module_no}.pdf',
            })
        for module_no, path in sorted(files['independent'].items()):
            jobs.append({
                'label': f'{module_no}-modul mustaqil',
                'path': path,
                'module': module_no,
                'order': 12,
                'lesson_type': 'independent',
                'storage_folder': f'courses/{course.code}/previews/independent/module-{module_no}',
                'cache_name': f'independent-module-{module_no}.pdf',
            })

        if not jobs:
            raise CommandError('Preview uchun DOCX topilmadi.')

        convert_jobs = []
        for job in jobs:
            output = cache_root / job['cache_name']
            job['pdf_path'] = output
            if options['force_convert'] or not output.exists() or output.stat().st_size == 0:
                convert_jobs.append({
                    'input': str(job['path'].resolve()),
                    'output': str(output.resolve()),
                })

        if convert_jobs:
            self.stdout.write(f'WORD -> PDF: {len(convert_jobs)} ta fayl konvertatsiya qilinadi...')
            self._convert_with_word(powershell, convert_jobs)
        else:
            self.stdout.write('WORD -> PDF: cache tayyor, konvertatsiya skip qilindi.')

        for job in jobs:
            pdf_path = job['pdf_path']
            if not pdf_path.exists() or pdf_path.stat().st_size == 0:
                raise CommandError(f'PDF yaralmadi: {job["label"]} -> {pdf_path}')

        uploaded = skipped = 0
        errors = []
        for job in jobs:
            try:
                lesson = Lesson.objects.get(
                    module__course=course,
                    module__order=job['module'],
                    order=job['order'],
                    lesson_type=job['lesson_type'],
                )
                content = TheoryContent.objects.get(lesson=lesson)
                attachments = list(content.attachments or [])
                existing_pdf = next(
                    (
                        item for item in attachments
                        if str(item.get('type', '')).lower() == 'pdf'
                        and str(item.get('previewFor', '')) == job['path'].name
                    ),
                    None,
                )
                if existing_pdf and not options['force_upload']:
                    skipped += 1
                    self.stdout.write(f'SKIP {job["label"]} preview')
                    continue

                item = file_attachment(job['pdf_path'], job['storage_folder'], True)
                item['previewFor'] = job['path'].name
                item['kind'] = 'word-preview'

                attachments = [
                    attachment for attachment in attachments
                    if not (
                        str(attachment.get('type', '')).lower() == 'pdf'
                        and str(attachment.get('previewFor', '')) == job['path'].name
                    )
                ]
                attachments.append(item)
                TheoryContent.objects.filter(pk=content.pk).update(attachments=attachments)
                uploaded += 1
                self.stdout.write(self.style.SUCCESS(f'OK {job["label"]} PDF preview'))
            except Exception as exc:
                errors.append(f'{job["label"]}: {exc}')
                self.stdout.write(self.style.ERROR(f'XATO {job["label"]}: {exc}'))

        contents = list(TheoryContent.objects.filter(lesson__module__course=course))
        previews = sum(
            1
            for content in contents
            if any(str(item.get('kind', '')) == 'word-preview' for item in (content.attachments or []))
        )
        self.stdout.write(
            f'PDF PREVIEWS: {previews}/27; UPLOADED: {uploaded}; SKIPPED: {skipped}; CACHE: {cache_root}'
        )
        if errors:
            raise CommandError('Ba’zi PDF previewlar yuklanmadi; commandni qayta ishga tushirish mumkin.')
        if previews == 27:
            self.stdout.write(self.style.SUCCESS('PDF PREVIEW AUDIT: OK (27/27)'))

    def _convert_with_word(self, powershell, jobs):
        with tempfile.TemporaryDirectory(prefix='infoedu-word-preview-') as temp_dir:
            temp_dir = Path(temp_dir)
            jobs_path = temp_dir / 'jobs.json'
            script_path = temp_dir / 'convert.ps1'
            jobs_path.write_text(json.dumps(jobs, ensure_ascii=False), encoding='utf-8')
            script_path.write_text(
                r'''param([Parameter(Mandatory=$true)][string]$JobsPath)
$ErrorActionPreference = 'Stop'
$items = Get-Content -Raw -LiteralPath $JobsPath | ConvertFrom-Json
$word = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    foreach ($item in $items) {
        $inputPath = [string]$item.input
        $outputPath = [string]$item.output
        $parent = Split-Path -Parent $outputPath
        if (!(Test-Path -LiteralPath $parent)) {
            New-Item -ItemType Directory -Force -Path $parent | Out-Null
        }
        $doc = $null
        try {
            $doc = $word.Documents.Open($inputPath, $false, $true)
            # wdExportFormatPDF = 17. Microsoft Word performs the layout/rendering,
            # preserving pictures, floating shapes, SmartArt and Word drawing objects.
            $doc.ExportAsFixedFormat($outputPath, 17)
            Write-Output ("OK`t" + $inputPath)
        }
        finally {
            if ($null -ne $doc) {
                $doc.Close(0)
                [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc)
            }
        }
    }
}
finally {
    if ($null -ne $word) {
        $word.Quit()
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
''',
                encoding='utf-8-sig',
            )
            result = subprocess.run(
                [
                    powershell,
                    '-NoProfile',
                    '-NonInteractive',
                    '-ExecutionPolicy',
                    'Bypass',
                    '-File',
                    str(script_path),
                    '-JobsPath',
                    str(jobs_path),
                ],
                text=True,
                capture_output=True,
                encoding='utf-8',
                errors='replace',
            )
            if result.stdout.strip():
                self.stdout.write(result.stdout.strip())
            if result.returncode != 0:
                details = result.stderr.strip() or result.stdout.strip() or 'Microsoft Word COM konvertatsiya xatosi.'
                raise CommandError(details)
