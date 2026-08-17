import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from lms.management.commands.import_presentations import (
    discover_presentations,
    lesson_topic_number,
    upload_path,
)
from lms.models import Course, Presentation


class Command(BaseCommand):
    help = (
        'Mavjud PPTX taqdimotlar uchun PDF previewlarni bittadan tiklaydi. '
        'Bitta fayl PowerPointda ochilmasa qolgan mavzular davom etadi.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--root', default='import_materials/Taqdimotlar')
        parser.add_argument('--course-code', default='DAST-101')
        parser.add_argument('--force-convert', action='store_true')
        parser.add_argument('--force-upload', action='store_true')

    def handle(self, *args, **options):
        if connection.vendor == 'sqlite':
            raise CommandError('PostgreSQL DATABASE_URL kerak.')
        if os.name != 'nt':
            raise CommandError('PDF preview tiklash uchun Windows + Microsoft PowerPoint kerak.')

        root = Path(options['root']).expanduser().resolve()
        if not root.is_dir():
            raise CommandError(f'Taqdimotlar papkasi topilmadi: {root}')

        course = Course.objects.filter(code=options['course_code']).first()
        if not course:
            raise CommandError(f'Kurs topilmadi: {options["course_code"]}')

        powershell = shutil.which('powershell') or shutil.which('pwsh')
        if not powershell:
            raise CommandError('PowerShell topilmadi.')

        selected, _duplicates, _extras = discover_presentations(root)
        missing_sources = [number for number in range(1, 21) if number not in selected]
        if missing_sources:
            raise CommandError(
                f'PPTX yetishmaydi: {", ".join(map(str, missing_sources))}-mavzu.'
            )

        presentations = list(
            Presentation.objects.filter(lesson__module__course=course)
            .select_related('lesson__module')
        )
        by_topic = {}
        for item in presentations:
            number = lesson_topic_number(item.lesson)
            if number:
                by_topic[number] = item

        missing_records = [number for number in range(1, 21) if number not in by_topic]
        if missing_records:
            raise CommandError(
                f'Presentation DB record yetishmaydi: {", ".join(map(str, missing_records))}-mavzu.'
            )

        cache_root = root.parent / '.presentation_cache' / course.code
        cache_root.mkdir(parents=True, exist_ok=True)

        converted = uploaded = skipped = 0
        failed = []

        for number in range(1, 21):
            source = selected[number]
            item = by_topic[number]
            output = cache_root / f'topic-{number}.pdf'

            if item.embed_url and not options['force_upload']:
                skipped += 1
                self.stdout.write(f'SKIP {number:02d}-mavzu: PDF preview allaqachon ulangan')
                continue

            needs_convert = (
                options['force_convert']
                or not output.exists()
                or output.stat().st_size == 0
            )
            if needs_convert:
                self.stdout.write(f'PDF {number:02d}/20: {source.name}')
                ok, detail = self._convert_one(powershell, source, output)
                if not ok:
                    failed.append((number, source.name, detail))
                    self.stdout.write(
                        self.style.ERROR(f'XATO {number:02d}-mavzu: {source.name} -> {detail}')
                    )
                    continue
                converted += 1

            if not output.exists() or output.stat().st_size == 0:
                failed.append((number, source.name, 'PDF fayl yaralmadi.'))
                self.stdout.write(self.style.ERROR(f'XATO {number:02d}-mavzu: PDF fayl yaralmadi'))
                continue

            try:
                info = upload_path(
                    output,
                    f'courses/{course.code}/presentations/topic-{number}/preview',
                )
                Presentation.objects.filter(pk=item.pk).update(embed_url=info['url'])
                uploaded += 1
                self.stdout.write(self.style.SUCCESS(f'OK {number:02d}-mavzu PDF preview'))
            except Exception as exc:
                failed.append((number, source.name, f'Upload: {exc}'))
                self.stdout.write(self.style.ERROR(f'XATO {number:02d}-mavzu upload: {exc}'))

        preview_count = Presentation.objects.filter(
            lesson__module__course=course
        ).exclude(embed_url='').count()

        self.stdout.write(
            f'PDF PREVIEWS: {preview_count}/20; CONVERTED: {converted}; '
            f'UPLOADED: {uploaded}; SKIPPED: {skipped}; FAILED: {len(failed)}; '
            f'CACHE: {cache_root}'
        )

        if failed:
            self.stdout.write(self.style.WARNING('--- OCHILMAGAN/YUKLANMAGAN FAYLLAR ---'))
            for number, name, detail in failed:
                self.stdout.write(self.style.WARNING(
                    f'{number:02d}-mavzu | {name} | {detail}'
                ))
            raise CommandError(
                f'{len(failed)} ta preview qolib ketdi. Yuqoridagi fayl nomlarini yuboring; qolganlari saqlandi.'
            )

        if preview_count == 20:
            self.stdout.write(self.style.SUCCESS('PRESENTATION PDF AUDIT: OK (20/20)'))

    def _convert_one(self, powershell, source, output):
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='infoedu-ppt-one-') as temp_dir:
            temp_dir = Path(temp_dir)
            script_path = temp_dir / 'convert-one.ps1'
            clean_input = temp_dir / 'source.pptx'
            shutil.copy2(source, clean_input)

            script_path.write_text(
                r'''param(
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class InfoEduPptPreviewWindow {
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@

$powerpoint = $null
$deck = $null
try {
    try { Unblock-File -LiteralPath $InputPath -ErrorAction SilentlyContinue } catch {}
    $powerpoint = New-Object -ComObject PowerPoint.Application
    try {
        $hwnd = [IntPtr]([int64]$powerpoint.HWND)
        if ($hwnd -ne [IntPtr]::Zero) {
            [InfoEduPptPreviewWindow]::ShowWindowAsync($hwnd, 0) | Out-Null
        }
    } catch {}

    try {
        # ReadOnly=true, Untitled=false, WithWindow=false
        $deck = $powerpoint.Presentations.Open($InputPath, -1, 0, 0)
    }
    catch {
        # Some decks reject read-only COM open; retry writable, still without a window.
        $deck = $powerpoint.Presentations.Open($InputPath, 0, 0, 0)
    }

    # ppSaveAsPDF = 32
    $deck.SaveAs($OutputPath, 32)
    Write-Output 'OK'
}
catch {
    Write-Error $_.Exception.Message
    exit 2
}
finally {
    if ($null -ne $deck) {
        try { $deck.Close() } catch {}
        try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($deck) } catch {}
    }
    if ($null -ne $powerpoint) {
        try { $powerpoint.Quit() } catch {}
        try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint) } catch {}
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
                    '-InputPath',
                    str(clean_input),
                    '-OutputPath',
                    str(output.resolve()),
                ],
                text=True,
                capture_output=True,
                encoding='utf-8',
                errors='replace',
            )

            if result.returncode == 0 and output.exists() and output.stat().st_size > 0:
                return True, ''

            detail = result.stderr.strip() or result.stdout.strip() or 'PowerPoint PDF conversion xatosi.'
            if len(detail) > 500:
                detail = detail[-500:]
            return False, detail
