from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import F

from lms.models import Course, Lesson, Video


VIDEO_SPECS = {
    1: {
        'title': '1-modul video darsi — Algoritm nima va nima uchun kerak?',
        'provider': 'youtube',
        'url': 'https://www.youtube.com/watch?v=CvSOaYi89B4',
        'duration_minutes': 5,
        'description': (
            'Algoritm tushunchasi, masalani qadamlarga ajratish va kompyuter dasturlarida '
            'algoritmlarning ahamiyatini tushuntiradi. 1-moduldagi algoritm, chiziqli va '
            'tarmoqlanuvchi algoritmlar mavzulariga mos.'
        ),
        'source': 'Khan Academy Computing — What is an algorithm and why should you care?',
    },
    2: {
        'title': '2-modul video darsi — Scratch bilan ishlashni boshlash',
        'provider': 'youtube',
        'url': 'https://www.youtube.com/watch?v=0Qb9UFiwH64',
        'duration_minutes': 5,
        'description': (
            'Scratch muhiti va vizual dasturlash bilan tanishtiradi. 2-moduldagi '
            'takrorlanish, Scratch muhiti va bloklar bilan ishlash mavzulariga mos.'
        ),
        'source': 'Scratch Foundation — Getting Started with Scratch',
    },
    3: {
        'title': '3-modul video darsi — Scratch’da Catch Game yaratish',
        'provider': 'youtube',
        'url': 'https://www.youtube.com/watch?v=7NN5v2wSL4U',
        'duration_minutes': 10,
        'description': (
            'Scratch’da interaktiv Catch Game yaratish orqali harakat, hodisalar, '
            'shartlar, takrorlanish, operatorlar va hisob yuritishni amalda ko‘rsatadi. '
            '3-moduldagi animatsiya, eventlar va o‘yin logikasiga mos.'
        ),
        'source': 'Scratch Team — How to Make a Catch Game in Scratch',
    },
    4: {
        'title': '4-modul video darsi — Scratch’da Pong Game yaratish',
        'provider': 'youtube',
        'url': 'https://www.youtube.com/watch?v=BlmBDrnhd2I',
        'duration_minutes': 15,
        'description': (
            'Scratch’da yakuniy loyiha sifatida Pong o‘yini yaratishni ko‘rsatadi: '
            'harakat, hisob, Game Over va darajalar bilan ishlash. 4-moduldagi '
            'murakkabroq Scratch loyihalari va yakuniy loyiha mavzulariga mos.'
        ),
        'source': 'Scratch Team — How to Make a Pong Game in Scratch',
    },
}


class Command(BaseCommand):
    help = 'DAST-101 kursining har bir moduliga bittadan mos YouTube video dars qo‘shadi yoki yangilaydi.'

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
                    video_lesson.description = f'{module.order}-modul yakuniy YouTube video darsi.'
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
                        description=f'{module.order}-modul yakuniy YouTube video darsi.',
                        is_published=True,
                    )
                    created += 1

                Video.objects.update_or_create(
                    lesson=video_lesson,
                    defaults={
                        'title': spec['title'],
                        'video_url': spec['url'],
                        'embed_type': 'youtube',
                        'duration_seconds': spec['duration_minutes'] * 60,
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

        videos = list(
            Video.objects.filter(lesson__module__course=course)
            .select_related('lesson__module')
            .order_by('lesson__module__order')
        )
        youtube_count = sum(
            1 for item in videos
            if item.embed_type == 'youtube' and 'youtube.com/watch?v=' in item.video_url
        )
        lesson_count = Lesson.objects.filter(module__course=course).count()

        self.stdout.write(
            f'VIDEOS: {len(videos)}/4; YOUTUBE: {youtube_count}/4; LESSONS: {lesson_count}; '
            f'CREATED: {created}; UPDATED: {updated}'
        )
        for item in videos:
            self.stdout.write(
                f'{item.lesson.module.order}-modul -> {item.video_url} [{item.embed_type}]'
            )

        if len(videos) == 4 and youtube_count == 4 and lesson_count == 71:
            self.stdout.write(self.style.SUCCESS('YOUTUBE VIDEO AUDIT: OK (4/4)'))
        else:
            raise CommandError(
                f'Video audit mos kelmadi. VIDEOS={len(videos)}, YOUTUBE={youtube_count}, LESSONS={lesson_count}'
            )
