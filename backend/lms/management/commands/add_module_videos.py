from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import F

from lms.models import Course, Lesson, Video


VIDEO_SPECS = {
    1: {
        'title': '1-modul video darsi — Algoritm va dasturlash asoslari',
        'provider': 'youtube',
        'url': 'https://www.youtube.com/watch?v=EugLyZzJuj4',
        'duration_minutes': 20,
        'description': (
            'Algoritm nima, dasturlashda algoritmik fikrlash nima uchun kerak va '
            'masalani ketma-ket qadamlar orqali yechish qanday ishlashini mustahkamlaydi. '
            '1-moduldagi algoritm, chiziqli va tarmoqlanuvchi algoritmlar mavzulariga mos.'
        ),
        'source': 'Robotics Lab — Dasturlashga ALGORITM kerak emasmi?',
    },
    2: {
        'title': '2-modul video darsi — Scratch bilan ishlashni boshlash',
        'provider': 'vimeo',
        'url': 'https://vimeo.com/80961102',
        'duration_minutes': 10,
        'description': (
            'Scratch muhiti, sprite bilan ishlash va vizual bloklar orqali dastur tuzishni '
            'boshlash bo‘yicha kirish darsi. Takrorlanish va Scratch asoslari mavzularini '
            'amaliy ko‘rinishda mustahkamlaydi.'
        ),
        'source': 'Lifelong Kindergarten / MIT Media Lab — Getting Started with Scratch',
    },
    3: {
        'title': '3-modul video darsi — Scratch 3 da Pong o‘yini',
        'provider': 'vimeo',
        'url': 'https://vimeo.com/410678508',
        'duration_minutes': 20,
        'description': (
            'Scratch 3 da ikki o‘yinchili Pong o‘yinini yaratish orqali harakat, hodisalar, '
            'o‘zaro ta’sir va hisob yuritish kabi tushunchalarni bir loyiha ichida ko‘rsatadi. '
            '3-moduldagi animatsiya, eventlar va o‘yin yaratish mavzulariga mos.'
        ),
        'source': 'Ciarán Coughlan — Building a Pong game using Scratch 3',
    },
    4: {
        'title': '4-modul video darsi — Scratch Pen va geometrik shakllar',
        'provider': 'vimeo',
        'url': 'https://vimeo.com/314879021',
        'duration_minutes': 15,
        'description': (
            'Scratch Pen yordamida geometrik shakllarni dasturiy chizish, burilish burchaklari '
            'va takrorlanuvchi qadamlarni qo‘llashni ko‘rsatadi. 4-moduldagi qalam, geometriya '
            'va ko‘pburchaklar mavzulariga mos.'
        ),
        'source': 'Codified Concepts — Scratch Lesson 4: Turtle Drawing',
    },
}


class Command(BaseCommand):
    help = 'DAST-101 kursining har bir moduliga bittadan mos video dars qo‘shadi.'

    def add_arguments(self, parser):
        parser.add_argument('--course-code', default='DAST-101')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        course = Course.objects.filter(code=options['course_code']).first()
        if not course:
            raise CommandError(f'Kurs topilmadi: {options["course_code"]}')

        modules = list(course.modules.order_by('order'))
        if len(modules) != 4:
            raise CommandError(f'4 ta modul kutilgan edi, topildi: {len(modules)}')

        self.stdout.write(f'COURSE: {course.code} — {course.title}')
        for module in modules:
            spec = VIDEO_SPECS.get(module.order)
            if not spec:
                raise CommandError(f'{module.order}-modul uchun video konfiguratsiyasi yo‘q.')
            self.stdout.write(
                f'{module.order}-modul: {spec["title"]}\n'
                f'  Manba: {spec["source"]}\n'
                f'  URL: {spec["url"]}'
            )

        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS('DRY-RUN: bazaga o‘zgarish kiritilmadi.'))
            return

        created = updated = 0
        with transaction.atomic():
            for module in modules:
                spec = VIDEO_SPECS[module.order]
                tail_lessons = list(
                    Lesson.objects.filter(module=module, order__gte=16).order_by('order')
                )
                unexpected = [
                    lesson for lesson in tail_lessons
                    if lesson.lesson_type not in {'video', 'practical', 'independent'}
                ]
                if unexpected:
                    names = ', '.join(f'{item.order}:{item.title}' for item in unexpected)
                    raise CommandError(
                        f'{module.order}-modul oxirida kutilmagan darslar bor: {names}'
                    )

                # Free final module order slots first; this makes the command safe both
                # before and after a previous run without colliding with unique(module, order).
                Lesson.objects.filter(
                    module=module,
                    lesson_type__in=['video', 'practical', 'independent'],
                ).update(order=F('order') + 1000)

                video_lesson = (
                    Lesson.objects.filter(module=module, lesson_type='video')
                    .order_by('id')
                    .first()
                )
                if video_lesson:
                    video_lesson.title = spec['title']
                    video_lesson.duration_minutes = spec['duration_minutes']
                    video_lesson.order = 16
                    video_lesson.description = f'{module.order}-modul yakuniy video darsi.'
                    video_lesson.is_published = True
                    video_lesson.save(update_fields=[
                        'title', 'duration_minutes', 'order', 'description', 'is_published'
                    ])
                    updated += 1
                else:
                    video_lesson = Lesson.objects.create(
                        module=module,
                        title=spec['title'],
                        lesson_type='video',
                        duration_minutes=spec['duration_minutes'],
                        order=16,
                        description=f'{module.order}-modul yakuniy video darsi.',
                        is_published=True,
                    )
                    created += 1

                Video.objects.update_or_create(
                    lesson=video_lesson,
                    defaults={
                        'title': spec['title'],
                        'video_url': spec['url'],
                        'embed_type': spec['provider'],
                        'duration_seconds': 0,
                        'description': spec['description'],
                        'resources': [],
                        'transcript': '',
                    },
                )

                practical = (
                    Lesson.objects.filter(module=module, lesson_type='practical')
                    .order_by('id')
                    .first()
                )
                independent = (
                    Lesson.objects.filter(module=module, lesson_type='independent')
                    .order_by('id')
                    .first()
                )
                if practical:
                    Lesson.objects.filter(pk=practical.pk).update(order=17)
                if independent:
                    Lesson.objects.filter(pk=independent.pk).update(order=18)

                leftovers = Lesson.objects.filter(module=module, order__gte=1000)
                if leftovers.exists():
                    names = ', '.join(leftovers.values_list('title', flat=True)[:5])
                    raise CommandError(
                        f'{module.order}-modulda tartibga tushmagan dars qoldi: {names}'
                    )

        video_count = Video.objects.filter(lesson__module__course=course).count()
        lesson_count = Lesson.objects.filter(module__course=course).count()
        self.stdout.write(
            f'VIDEOS: {video_count}/4; LESSONS: {lesson_count}; '
            f'CREATED: {created}; UPDATED: {updated}'
        )
        if video_count == 4 and lesson_count == 71:
            self.stdout.write(self.style.SUCCESS('MODULE VIDEO AUDIT: OK (4/4)'))
        else:
            raise CommandError(
                f'Video audit mos kelmadi. VIDEOS={video_count}, LESSONS={lesson_count}'
            )
