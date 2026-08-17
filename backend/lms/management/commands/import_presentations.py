import json
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
from collections import defaultdict
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.db.models import F

from lms.models import Course, Lesson, Presentation
from lms.storage import upload_admin_file, format_file_size


TOPIC_FILE_RE = re.compile(r'^\s*(20|1[0-9]|[1-9])(?:\s*[-_. ]*\s*)?(?:mavzu)?', re.IGNORECASE)
TOPIC_TEXT_RE = re.compile(r'(?<!\d)(20|1[0-9]|[1-9])\s*[- ]?\s*mavzu\b', re.IGNORECASE)


def topic_number_from_pptx(path):
    match = TOPIC_FILE_RE.match(path.stem)
    return int(match.group(1)) if match else None


def discover_presentations(root):
    grouped = defaultdict(list)
    extras = []
    for path in root.rglob('*.pptx'):
        if path.name.startswith('~$'):
            continue
        number = topic_number_from_pptx(path)
        if number and 1 <= number <= 20:
            grouped[number].append(path)
        else:
            extras.append(path)

    selected = {}
    duplicates = {}
    for number, candidates in grouped.items():
        ranked = sorted(candidates, key=lambda item: item.stat().st_size, reverse=True)
        selected[number] = ranked[0]
        if len(ranked) > 1:
            duplicates[number] = ranked[1:]
    return selected, duplicates, extras


def upload_path(path, folder):
    content_type = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    with path.open('rb') as raw:
        wrapped = File(raw, name=path.name)
        wrapped.content_type = content_type
        return upload_admin_file(wrapped, folder=folder)


def lesson_topic_number(lesson):
    value = f'{lesson.description or ""} {lesson.title or ""}'
    match = TOPIC_TEXT_RE.search(value)
    return int(match.group(1)) if match else None


def clean_topic_title(value, topic_number):
    title = str(value or '').strip()
    title = re.sub(r'\s*[—–-]\s*Test\s*$', '', title, flags=re.IGNORECASE).strip()
    title = re.sub(r'\s+testi\s*$', '', title, flags=re.IGNORECASE).strip()
    return title or f'{topic_number}-mavzu'


class Command(BaseCommand):
    help = (
        'DAST-101 uchun 1–20 mavzu PPTX taqdimotlarini import qiladi, '
        'Nazariya -> Taqdimot -> Test tartibini yaratadi va PowerPoint orqali PDF preview tayyorlaydi.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--root', default='import_materials/Taqdimotlar')
        parser.add_argument('--course-code', default='DAST-101')
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--skip-pdf', action='store_true', help='PowerPoint -> PDF preview konvertatsiyasini o‘tkazib yuboradi.')
        parser.add_argument('--force-convert', action='store_true')
        parser.add_argument('--force-upload', action='store_true')

    def handle(self, *args, **options):
        if connection.vendor == 'sqlite' and not options['dry_run']:
            raise CommandError('Real import uchun PostgreSQL DATABASE_URL kerak.')

        root = Path(options['root']).expanduser().resolve()
        if not root.is_dir():
            raise CommandError(f'Taqdimotlar papkasi topilmadi: {root}')

        course = Course.objects.filter(code=options['course_code']).first()
        if not course:
            raise CommandError(f'Kurs topilmadi: {options["course_code"]}')

        selected, duplicates, extras = discover_presentations(root)
        missing = [number for number in range(1, 21) if number not in selected]

        self.stdout.write(f'TOPILDI: {sum(1 for _ in root.rglob("*.pptx"))} PPTX; MAVZUGA TANLANDI: {len(selected)}/20')
        for number in sorted(selected):
            chosen = selected[number]
            self.stdout.write(f'{number:02d}-mavzu: {chosen.name} ({format_file_size(chosen.stat().st_size)})')
            if number in duplicates:
                names = ', '.join(item.name for item in duplicates[number])
                self.stdout.write(self.style.WARNING(f'  DUBLIKAT SKIP: {names}'))
        for path in extras:
            self.stdout.write(self.style.WARNING(f'RAQAMSIZ/EXTRA SKIP: {path.name}'))
        if missing:
            self.stdout.write(self.style.WARNING(f'YETISHMAYDI: {", ".join(map(str, missing))}-mavzu'))

        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS('DRY-RUN: bazaga va Storage ga o‘zgarish kiritilmadi.'))
            return
        if missing:
            raise CommandError('20 mavzuning hammasi topilmadi. Fayl nomlarini tekshiring yoki --dry-run bilan mappingni ko‘ring.')

        # Prepare high-fidelity PDF previews before touching lesson order. If PowerPoint
        # is unavailable the import still succeeds with PPTX files; the frontend can use
        # Google Docs Viewer as a fallback.
        pdf_paths = {}
        if not options['skip_pdf']:
            pdf_paths = self._prepare_pdf_previews(course, root, selected, options['force_convert'])

        topic_titles, presentation_lessons = self._reorder_and_prepare_lessons(course)

        uploaded_source = uploaded_preview = skipped_source = skipped_preview = 0
        errors = []
        for topic_number in range(1, 21):
            source_path = selected[topic_number]
            lesson = presentation_lessons[topic_number]
            presentation, _ = Presentation.objects.get_or_create(
                lesson=lesson,
                defaults={
                    'title': f'{topic_titles[topic_number]} — Taqdimot',
                    'file_type': 'pptx',
                    'file_size': format_file_size(source_path.stat().st_size),
                    'slides': [],
                },
            )

            file_url = presentation.file_url
            embed_url = presentation.embed_url
            try:
                if file_url and not options['force_upload']:
                    skipped_source += 1
                else:
                    source_info = upload_path(
                        source_path,
                        f'courses/{course.code}/presentations/topic-{topic_number}/source',
                    )
                    file_url = source_info['url']
                    uploaded_source += 1

                pdf_path = pdf_paths.get(topic_number)
                if pdf_path and pdf_path.exists() and pdf_path.stat().st_size > 0:
                    if embed_url and not options['force_upload']:
                        skipped_preview += 1
                    else:
                        preview_info = upload_path(
                            pdf_path,
                            f'courses/{course.code}/presentations/topic-{topic_number}/preview',
                        )
                        embed_url = preview_info['url']
                        uploaded_preview += 1

                Presentation.objects.filter(pk=presentation.pk).update(
                    title=f'{topic_titles[topic_number]} — Taqdimot',
                    file_type='pptx',
                    file_size=format_file_size(source_path.stat().st_size),
                    file_url=file_url or '',
                    embed_url=embed_url or '',
                    slides=[],
                )
                self.stdout.write(self.style.SUCCESS(
                    f'OK {topic_number}-mavzu: PPTX' + (' + PDF preview' if embed_url else '')
                ))
            except Exception as exc:
                errors.append(f'{topic_number}-mavzu: {exc}')
                self.stdout.write(self.style.ERROR(f'XATO {topic_number}-mavzu: {exc}'))

        count = Presentation.objects.filter(lesson__module__course=course).count()
        lessons_count = Lesson.objects.filter(module__course=course).count()
        self.stdout.write(
            f'PRESENTATIONS: {count}/20; LESSONS: {lessons_count}; '
            f'PPTX UPLOADED: {uploaded_source}; PPTX SKIPPED: {skipped_source}; '
            f'PDF UPLOADED: {uploaded_preview}; PDF SKIPPED: {skipped_preview}'
        )
        if errors:
            raise CommandError('Ba’zi taqdimotlar yuklanmadi. Commandni qayta ishga tushirish xavfsiz.')
        if count == 20:
            self.stdout.write(self.style.SUCCESS('PRESENTATION AUDIT: OK (20/20)'))

    def _reorder_and_prepare_lessons(self, course):
        lessons = list(
            Lesson.objects.filter(module__course=course)
            .select_related('module')
            .order_by('module__order', 'order')
        )
        topic_map = defaultdict(dict)
        module_tail = defaultdict(dict)
        topic_titles = {}

        for lesson in lessons:
            topic_number = lesson_topic_number(lesson)
            if topic_number and lesson.lesson_type in {'theory', 'presentation', 'test'}:
                topic_map[topic_number][lesson.lesson_type] = lesson
                if lesson.lesson_type == 'theory':
                    topic_titles[topic_number] = clean_topic_title(lesson.title, topic_number)
                elif topic_number not in topic_titles and lesson.lesson_type == 'test':
                    topic_titles[topic_number] = clean_topic_title(lesson.title, topic_number)
            elif lesson.lesson_type in {'practical', 'independent'}:
                module_tail[lesson.module.order][lesson.lesson_type] = lesson

        for topic_number in range(1, 21):
            topic_titles.setdefault(topic_number, f'{topic_number}-mavzu')
            if 'test' not in topic_map[topic_number]:
                raise CommandError(f'{topic_number}-mavzu test darsi topilmadi; lesson tartibini o‘zgartirish to‘xtatildi.')

        presentation_lessons = {}
        with transaction.atomic():
            # Free all low order slots first so the unique(module, order) constraint can
            # never collide while switching from 2-step to 3-step topic sequencing.
            Lesson.objects.filter(module__course=course).update(order=F('order') + 1000)

            for topic_number in range(1, 21):
                module_number = ((topic_number - 1) // 5) + 1
                within_module = (topic_number - 1) % 5
                base_order = within_module * 3 + 1

                theory = topic_map[topic_number].get('theory')
                if theory:
                    Lesson.objects.filter(pk=theory.pk).update(order=base_order)

                presentation_lesson = topic_map[topic_number].get('presentation')
                if presentation_lesson:
                    Lesson.objects.filter(pk=presentation_lesson.pk).update(
                        order=base_order + 1,
                        title=f'{topic_titles[topic_number]} — Taqdimot',
                        duration_minutes=15,
                        description=f'{topic_number}-mavzu taqdimoti.',
                        is_published=True,
                    )
                    presentation_lesson.refresh_from_db()
                else:
                    module = course.modules.get(order=module_number)
                    presentation_lesson = Lesson.objects.create(
                        module=module,
                        title=f'{topic_titles[topic_number]} — Taqdimot',
                        lesson_type='presentation',
                        duration_minutes=15,
                        order=base_order + 1,
                        description=f'{topic_number}-mavzu taqdimoti.',
                        is_published=True,
                    )
                presentation_lessons[topic_number] = presentation_lesson

                test = topic_map[topic_number]['test']
                Lesson.objects.filter(pk=test.pk).update(order=base_order + 2)

            for module_number in range(1, 5):
                practical = module_tail[module_number].get('practical')
                independent = module_tail[module_number].get('independent')
                if practical:
                    Lesson.objects.filter(pk=practical.pk).update(order=16)
                if independent:
                    Lesson.objects.filter(pk=independent.pk).update(order=17)

            leftovers = Lesson.objects.filter(module__course=course, order__gte=1000)
            if leftovers.exists():
                names = ', '.join(leftovers.values_list('title', flat=True)[:8])
                raise CommandError(f'Tartibga tushmagan darslar bor: {names}')

        return topic_titles, presentation_lessons

    def _prepare_pdf_previews(self, course, root, selected, force_convert):
        if os.name != 'nt':
            self.stdout.write(self.style.WARNING('PDF preview skip: Windows kerak. PPTX import davom etadi.'))
            return {}

        powershell = shutil.which('powershell') or shutil.which('pwsh')
        if not powershell:
            self.stdout.write(self.style.WARNING('PDF preview skip: PowerShell topilmadi.'))
            return {}

        cache_root = root.parent / '.presentation_cache' / course.code
        cache_root.mkdir(parents=True, exist_ok=True)
        jobs = []
        pdf_paths = {}
        for number, source in sorted(selected.items()):
            output = cache_root / f'topic-{number}.pdf'
            pdf_paths[number] = output
            if force_convert or not output.exists() or output.stat().st_size == 0:
                jobs.append({'input': str(source.resolve()), 'output': str(output.resolve())})

        if not jobs:
            self.stdout.write('POWERPOINT -> PDF: cache tayyor, konvertatsiya skip qilindi.')
            return pdf_paths

        self.stdout.write(f'POWERPOINT -> PDF: {len(jobs)} ta fayl konvertatsiya qilinadi...')
        try:
            self._convert_with_powerpoint(powershell, jobs)
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f'PDF preview yaratilmadi: {exc}. PPTX import davom etadi.'))
            return {}

        return {
            number: path for number, path in pdf_paths.items()
            if path.exists() and path.stat().st_size > 0
        }

    def _convert_with_powerpoint(self, powershell, jobs):
        with tempfile.TemporaryDirectory(prefix='infoedu-ppt-preview-') as temp_dir:
            temp_dir = Path(temp_dir)
            jobs_path = temp_dir / 'jobs.json'
            script_path = temp_dir / 'convert.ps1'
            jobs_path.write_text(json.dumps(jobs, ensure_ascii=False), encoding='utf-8')
            script_path.write_text(
                r'''param([Parameter(Mandatory=$true)][string]$JobsPath)
$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class InfoEduPptWindow {
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@

$items = Get-Content -Raw -LiteralPath $JobsPath | ConvertFrom-Json
$powerpoint = $null
try {
    $powerpoint = New-Object -ComObject PowerPoint.Application
    try {
        $hwnd = [IntPtr]([int64]$powerpoint.HWND)
        if ($hwnd -ne [IntPtr]::Zero) { [InfoEduPptWindow]::ShowWindowAsync($hwnd, 0) | Out-Null }
    } catch {}

    foreach ($item in $items) {
        $inputPath = [string]$item.input
        $outputPath = [string]$item.output
        $parent = Split-Path -Parent $outputPath
        if (!(Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
        $deck = $null
        try {
            # Open(FileName, ReadOnly, Untitled, WithWindow). WithWindow=0 prevents
            # PowerPoint from flashing on screen while preserving native rendering.
            $deck = $powerpoint.Presentations.Open($inputPath, -1, 0, 0)
            # ppSaveAsPDF = 32
            $deck.SaveAs($outputPath, 32)
            Write-Output ("OK`t" + $inputPath)
        }
        finally {
            if ($null -ne $deck) {
                try { $deck.Close() } catch {}
                [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($deck)
            }
        }
    }
}
finally {
    if ($null -ne $powerpoint) {
        try { $powerpoint.Quit() } catch {}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint)
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
                details = result.stderr.strip() or result.stdout.strip() or 'Microsoft PowerPoint COM konvertatsiya xatosi.'
                raise CommandError(details)
