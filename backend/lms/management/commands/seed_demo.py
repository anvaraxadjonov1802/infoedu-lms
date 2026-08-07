import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from lms.models import (
    Course, Enrollment, Lesson, LessonProgress, Module, Notification, Presentation,
    Question, Test, TestAttempt, TheoryContent, User, Video,
)

PASSWORD = os.getenv('DEMO_PASSWORD', 'InfoEdu2026!')


class Command(BaseCommand):
    help = 'Create idempotent demo data for InfoEdu LMS.'

    def handle(self, *args, **options):
        teacher = self.user(
            'j.karimov@tuit.uz', 'jamshid', 'Jamshid', 'Karimov', 'teacher',
            title='Katta o‘qituvchi', department='Dasturiy injiniring',
        )
        admin = self.user(
            'admin@infoedu.uz', 'infoedu-admin', 'InfoEdu', 'Admin', 'admin',
            title='Platforma administratori', department='Academic IT', is_staff=True, is_superuser=True,
        )
        student = self.user(
            'anvar.axadjonov@tuit.uz', 'anvar', 'Anvar', 'Axadjonov', 'student',
            student_id='SE-301-8842', phone='+998 90 123 45 67',
            university='PDP University', faculty='Software Engineering', group_name='SE-301',
            study_streak_days=7, longest_streak_days=14, total_study_minutes=1420,
        )

        course_specs = [
            {
                'id': 'course-1', 'code': 'SE-301', 'title': 'Dasturiy Injiniring va Algoritmlar',
                'category': 'Dasturlash', 'level': 'O‘rta daraja', 'hours': 32,
                'cover': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
                'description': 'Algoritmlar tahlili, ma’lumotlar tuzilmalari va zamonaviy dasturiy injiniring tamoyillari.',
                'module_id': 'mod-101', 'module': '1-Modul: Algoritmlar murakkabligi va Big-O',
                'module_desc': 'Vaqt/xotira murakkabligi, asimptotik analiz va asosiy ma’lumotlar tuzilmalari.',
                'prefix': '10',
            },
            {
                'id': 'course-2', 'code': 'DB-202', 'title': 'PostgreSQL va Ma’lumotlar Bazasi',
                'category': 'Ma’lumotlar bazasi', 'level': 'Boshlang‘ich–O‘rta', 'hours': 24,
                'cover': 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop&q=80',
                'description': 'Relyatsion model, SQL, indekslash, tranzaksiyalar va ma’lumotlar bazasi dizayni.',
                'module_id': 'mod-201', 'module': '1-Modul: Relatsion MB va SQL asoslari',
                'module_desc': 'Jadval, primary/foreign key, SELECT, JOIN va PostgreSQL amaliyoti.',
                'prefix': '20',
            },
            {
                'id': 'course-3', 'code': 'WEB-303', 'title': 'Zamonaviy Web Dasturlash',
                'category': 'Web-dasturlash', 'level': 'O‘rta–Yuqori', 'hours': 30,
                'cover': 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&auto=format&fit=crop&q=80',
                'description': 'React frontend, REST API va full-stack web ilovalar arxitekturasi.',
                'module_id': 'mod-301', 'module': '1-Modul: React va REST arxitekturasi',
                'module_desc': 'Komponentlar, state, API integratsiyasi va ishlab chiqarish arxitekturasi.',
                'prefix': '30',
            },
        ]

        for idx, spec in enumerate(course_specs, start=1):
            course, _ = Course.objects.update_or_create(
                id=spec['id'],
                defaults={
                    'title': spec['title'], 'code': spec['code'], 'cover_image': spec['cover'],
                    'category': spec['category'], 'level': spec['level'], 'description': spec['description'],
                    'teacher': teacher, 'estimated_study_hours': spec['hours'],
                    'tags': ['LMS', spec['category'], 'Amaliyot'], 'status': 'published',
                },
            )
            enrollment, _ = Enrollment.objects.update_or_create(student=student, course=course, defaults={'status': 'in_progress'})
            module, _ = Module.objects.update_or_create(
                id=spec['module_id'],
                defaults={'course': course, 'title': spec['module'], 'description': spec['module_desc'], 'order': 1},
            )
            self.create_module_content(course, module, spec['prefix'], idx)

        # Meaningful initial progress for the demo student.
        for lesson_id in ['les-101', 'les-102', 'les-103', 'les-201', 'les-202', 'les-301']:
            lesson = Lesson.objects.filter(id=lesson_id).first()
            if lesson:
                LessonProgress.objects.update_or_create(
                    student=student, lesson=lesson,
                    defaults={'is_completed': True, 'completed_at': timezone.now(), 'watched_percentage': 100 if lesson.lesson_type == 'video' else 0},
                )

        # Seed a historical result so charts/tables are populated before the first new attempt.
        test = Test.objects.get(id='test-101')
        TestAttempt.objects.update_or_create(
            id='res-seed-101',
            defaults={
                'student': student, 'test': test, 'attempt_number': 1, 'score': 4, 'max_score': 5,
                'percentage': 80, 'is_passed': True, 'time_spent_seconds': 612,
                'answer_reviews': [
                    {'questionId': 'q-101-1', 'questionText': 'Big-O nimani ifodalaydi?', 'userAnswerText': 'Algoritm murakkabligining yuqori chegarasini', 'correctAnswerText': 'Algoritm murakkabligining yuqori chegarasini', 'isCorrect': True, 'explanation': 'Big-O asimptotik yuqori chegarani ifodalaydi.'},
                    {'questionId': 'q-101-2', 'questionText': 'Binary search murakkabligi?', 'userAnswerText': 'O(log n)', 'correctAnswerText': 'O(log n)', 'isCorrect': True, 'explanation': 'Har qadamda qidiruv oralig‘i ikki baravar qisqaradi.'},
                ],
                'topic_breakdowns': [{'topic': 'Algoritmlar', 'score': 4, 'maxScore': 5, 'percentage': 80}],
            },
        )

        notif_specs = [
            ('notif-1', 'Yangi video dars', 'Web dasturlash kursiga yangi video dars qo‘shildi.', 'lesson'),
            ('notif-2', 'Test muddati', 'Algoritmlar modul testini shu hafta yakunlang.', 'test'),
            ('notif-3', 'Natija tayyor', 'Oldingi test natijangiz 80% bilan saqlandi.', 'result'),
        ]
        for i, (nid, title, message, kind) in enumerate(notif_specs):
            Notification.objects.update_or_create(
                id=nid,
                defaults={'user': student, 'title': title, 'message': message, 'notification_type': kind, 'is_read': i == 2, 'created_at': timezone.now()},
            )

        self.stdout.write(self.style.SUCCESS('InfoEdu demo data tayyor.'))
        self.stdout.write(f'Student: anvar.axadjonov@tuit.uz / {PASSWORD}')
        self.stdout.write(f'Teacher: j.karimov@tuit.uz / {PASSWORD}')
        self.stdout.write(f'Admin: admin@infoedu.uz / {PASSWORD}')

    def user(self, email, username, first, last, role, **extra):
        defaults = {
            'username': username, 'first_name': first, 'last_name': last, 'role': role,
            'is_staff': extra.pop('is_staff', role == 'admin'), 'is_superuser': extra.pop('is_superuser', False),
            'is_active': True, **extra,
        }
        user, created = User.objects.update_or_create(email=email, defaults=defaults)
        user.set_password(PASSWORD)
        user.save()
        return user

    def create_module_content(self, course, module, prefix, course_index):
        # IDs intentionally match the frontend's original Google AI Studio demo IDs.
        n = int(prefix)
        theory_id = f'th-{prefix}1'
        pres_id = f'pres-{prefix}1'
        video_id = f'vid-{prefix}1'
        test_id = f'test-{prefix}1'
        lesson_ids = [f'les-{prefix}1', f'les-{prefix}2', f'les-{prefix}3', f'les-{prefix}4']
        titles = [
            f'{course.title}: nazariy asoslar',
            f'{course.title}: taqdimot',
            f'{course.title}: video dars',
            f'{course.title}: modul testi',
        ]
        types = ['theory', 'presentation', 'video', 'test']
        durations = [25, 15, 30, 20]
        lessons = []
        for order, (lid, title, typ, duration) in enumerate(zip(lesson_ids, titles, types, durations), start=1):
            lesson, _ = Lesson.objects.update_or_create(
                id=lid,
                defaults={'module': module, 'title': title, 'lesson_type': typ, 'duration_minutes': duration, 'order': order, 'is_published': True},
            )
            lessons.append(lesson)

        TheoryContent.objects.update_or_create(
            id=theory_id,
            defaults={
                'lesson': lessons[0], 'reading_time_minutes': 12,
                'summary': f'{course.title} bo‘yicha asosiy tushunchalar va amaliy yondashuvlar.',
                'sections': [
                    {
                        'id': f's-{prefix}-1', 'title': 'Asosiy tushunchalar',
                        'contentMarkdown': f'**{course.title}** mavzusida muammoni qismlarga ajratish, aniq model tuzish va natijani tekshirish muhim. Ushbu darsda tushunchalarni real misollar bilan bog‘laymiz.',
                        'callout': {'type': 'tip', 'title': 'Tavsiya', 'text': 'Nazariyani o‘qigach, taqdimot va video darsni ketma-ket ko‘ring.'},
                    },
                    {
                        'id': f's-{prefix}-2', 'title': 'Amaliy misol',
                        'contentMarkdown': 'Masalani kichik bosqichlarga ajrating, har bosqich natijasini tekshiring va keyin optimallashtiring.',
                        'codeSnippet': {'language': 'text', 'code': 'input -> model -> process -> verify -> improve'},
                    },
                ],
                'attachments': [],
            },
        )

        slides = [
            {'slideNumber': 1, 'title': course.title, 'subtitle': module.title, 'bulletPoints': ['Modul maqsadlari', 'Asosiy atamalar', 'Amaliy natija']},
            {'slideNumber': 2, 'title': 'Asosiy g‘oya', 'bulletPoints': ['Tushunchalarni modelga aylantirish', 'Misollar orqali tekshirish', 'Natijani o‘lchash']},
            {'slideNumber': 3, 'title': 'Amaliy tavsiyalar', 'bulletPoints': ['Kichik qadamlar bilan ishlang', 'Xatolarni qayd eting', 'Mustaqil mashq qiling']},
        ]
        Presentation.objects.update_or_create(
            id=pres_id,
            defaults={
                'lesson': lessons[1], 'title': f'{course.title} — modul taqdimoti', 'file_type': 'pdf',
                'file_size': '1.2 MB',
                'file_url': 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                'embed_url': 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                'slides': slides,
            },
        )

        video_ids = ['8mAITcNt710', 'HXV3zeQKqGY', 'SqcY0GlETPk']
        Video.objects.update_or_create(
            id=video_id,
            defaults={
                'lesson': lessons[2], 'title': f'{course.title} — video dars',
                'video_url': f'https://www.youtube-nocookie.com/embed/{video_ids[(course_index - 1) % len(video_ids)]}',
                'embed_type': 'youtube', 'duration_seconds': durations[2] * 60,
                'description': 'Video dars nazariya va amaliy misollarni birlashtiradi. Video avtomatik ijro etilmaydi.',
                'resources': [{'id': f'res-{prefix}-1', 'title': 'Dars konspekti', 'fileType': 'pdf', 'fileSize': '420 KB', 'downloadUrl': '#'}],
                'transcript': 'Ushbu darsda modulning asosiy tushunchalari, amaliy yondashuv va yakuniy tekshiruv haqida gaplashamiz.',
            },
        )

        test, _ = Test.objects.update_or_create(
            id=test_id,
            defaults={'lesson': lessons[3], 'title': f'{course.title} — modul testi', 'time_limit_minutes': 20, 'attempts_allowed': 3, 'passing_score_percent': 60},
        )
        question_specs = self.questions_for(course_index, test_id)
        for order, spec in enumerate(question_specs, start=1):
            Question.objects.update_or_create(
                id=spec['id'],
                defaults={
                    'test': test, 'question_text': spec['text'], 'question_type': spec['type'],
                    'options': spec.get('options', []), 'correct_answer': spec['correct'],
                    'explanation': spec['explanation'], 'points': spec.get('points', 1),
                    'order': order, 'topic': spec.get('topic', 'Umumiy'),
                },
            )

    def questions_for(self, idx, test_id):
        if idx == 1:
            return [
                {'id': 'q-101-1', 'text': 'Big-O notatsiyasi asosan nimani ifodalaydi?', 'type': 'single_choice', 'options': [{'id': 'a', 'text': 'Algoritm murakkabligining yuqori chegarasini'}, {'id': 'b', 'text': 'Faqat xotira hajmini'}, {'id': 'c', 'text': 'Dasturlash tilini'}], 'correct': 'a', 'explanation': 'Big-O asimptotik o‘sishning yuqori chegarasini ifodalaydi.', 'points': 2, 'topic': 'Algoritmlar'},
                {'id': 'q-101-2', 'text': 'Binary search o‘rtacha vaqt murakkabligi qaysi?', 'type': 'single_choice', 'options': [{'id': 'a', 'text': 'O(n)'}, {'id': 'b', 'text': 'O(log n)'}, {'id': 'c', 'text': 'O(n²)'}], 'correct': 'b', 'explanation': 'Qidiruv oralig‘i har qadamda ikkiga bo‘linadi.', 'points': 2, 'topic': 'Algoritmlar'},
                {'id': 'q-101-3', 'text': 'Saralangan massiv binary search uchun zarur.', 'type': 'true_false', 'correct': True, 'explanation': 'Klassik binary search saralangan ma’lumot talab qiladi.', 'points': 1, 'topic': 'Algoritmlar'},
            ]
        if idx == 2:
            return [
                {'id': 'q-201-1', 'text': 'Primary key vazifasi nima?', 'type': 'single_choice', 'options': [{'id': 'a', 'text': 'Har bir qatorni noyob aniqlash'}, {'id': 'b', 'text': 'Faqat jadval rangini saqlash'}, {'id': 'c', 'text': 'Serverni o‘chirish'}], 'correct': 'a', 'explanation': 'Primary key qatorning noyob identifikatoridir.', 'points': 2, 'topic': 'SQL'},
                {'id': 'q-201-2', 'text': 'JOIN bir nechta jadval ma’lumotlarini bog‘lash uchun ishlatiladi.', 'type': 'true_false', 'correct': True, 'explanation': 'JOIN munosabatlar orqali qatorlarni birlashtiradi.', 'points': 1, 'topic': 'SQL'},
                {'id': 'q-201-3', 'text': 'PostgreSQLda ma’lumot olish uchun asosiy buyruq?', 'type': 'short_text', 'correct': 'SELECT', 'explanation': 'SELECT ma’lumotlarni o‘qish uchun ishlatiladi.', 'points': 2, 'topic': 'SQL'},
            ]
        return [
            {'id': 'q-301-1', 'text': 'React komponentining holati uchun qaysi hook ishlatiladi?', 'type': 'single_choice', 'options': [{'id': 'a', 'text': 'useState'}, {'id': 'b', 'text': 'usePaint'}, {'id': 'c', 'text': 'useSQL'}], 'correct': 'a', 'explanation': 'useState komponent holatini boshqaradi.', 'points': 2, 'topic': 'React'},
            {'id': 'q-301-2', 'text': 'REST API HTTP metodlaridan foydalanadi.', 'type': 'true_false', 'correct': True, 'explanation': 'GET, POST, PATCH, DELETE kabi metodlar RESTda keng qo‘llanadi.', 'points': 1, 'topic': 'API'},
            {'id': 'q-301-3', 'text': 'Frontendda API javoblarini JSON formatida olish mumkin.', 'type': 'true_false', 'correct': True, 'explanation': 'JSON web APIlar uchun eng keng tarqalgan formatlardan biridir.', 'points': 2, 'topic': 'API'},
        ]
