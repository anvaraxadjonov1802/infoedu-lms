from collections import defaultdict
from datetime import timedelta
from uuid import uuid4
from urllib.parse import parse_qs, urlparse

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import connection, transaction
from django.db.models import Avg, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Course,
    Enrollment,
    Lesson,
    LessonProgress,
    Notification,
    Presentation,
    Question,
    Test,
    TestAnswer,
    TestAttempt,
    TheoryContent,
    User,
    Video,
)
from .serializers import UserProfileSerializer


def token_payload(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token), 'user': build_user_profile(user)}


def accessible_courses(user):
    if user.role in ('admin', 'teacher'):
        query = Course.objects.filter(status='published')
        if user.role == 'teacher':
            query = query.filter(Q(teacher=user) | Q(enrollments__student=user)).distinct()
        return query.select_related('teacher').prefetch_related('modules__lessons')
    return Course.objects.filter(status='published', enrollments__student=user).select_related('teacher').prefetch_related('modules__lessons').distinct()


def can_access_course(user, course):
    if user.role == 'admin':
        return True
    if user.role == 'teacher':
        return course.teacher_id == user.id
    return Enrollment.objects.filter(student=user, course=course).exists()


def can_access_lesson(user, lesson):
    course = lesson.module.course
    if not can_access_course(user, course):
        return False
    if user.role in ('admin', 'teacher'):
        return True
    completed_ids = set(
        LessonProgress.objects.filter(
            student=user,
            lesson__module__course=course,
            is_completed=True,
        ).values_list('lesson_id', flat=True)
    )
    previous_completed = True
    for candidate in Lesson.objects.filter(
        module__course=course, is_published=True
    ).order_by('module__order', 'order'):
        if candidate.id == lesson.id:
            return previous_completed or candidate.id in completed_ids
        previous_completed = candidate.id in completed_ids
    return False


def refresh_enrollment_status(user, course):
    """Keep enrollment state in sync with real lesson completion."""
    if user.role != 'student':
        return
    enrollment = Enrollment.objects.filter(student=user, course=course).first()
    if not enrollment:
        return
    total = Lesson.objects.filter(module__course=course, is_published=True).count()
    completed = LessonProgress.objects.filter(
        student=user, lesson__module__course=course, lesson__is_published=True, is_completed=True
    ).count()
    status_value = 'completed' if total and completed >= total else ('in_progress' if completed else 'not_started')
    enrollment.status = status_value
    enrollment.last_accessed_at = timezone.now()
    enrollment.save(update_fields=['status', 'last_accessed_at'])


def refresh_study_streak(user):
    """Recalculate current and longest streak from completed lessons/tests."""
    if user.role != 'student':
        return
    dates = set(
        LessonProgress.objects.filter(student=user, is_completed=True, completed_at__isnull=False)
        .values_list('completed_at__date', flat=True)
    )
    dates.update(
        TestAttempt.objects.filter(student=user).values_list('submitted_at__date', flat=True)
    )
    dates.discard(None)
    if not dates:
        current = longest = 0
    else:
        ordered = sorted(dates)
        longest = run = 1
        for previous, current_date in zip(ordered, ordered[1:]):
            if (current_date - previous).days == 1:
                run += 1
                longest = max(longest, run)
            else:
                run = 1
        today = timezone.localdate()
        cursor = today if today in dates else today - timedelta(days=1)
        current = 0
        while cursor in dates:
            current += 1
            cursor -= timedelta(days=1)
    user.study_streak_days = current
    user.longest_streak_days = max(user.longest_streak_days, longest)
    user.save(update_fields=['study_streak_days', 'longest_streak_days'])


def progress_map(user, lesson_ids):
    return {
        row.lesson_id: row
        for row in LessonProgress.objects.filter(student=user, lesson_id__in=lesson_ids)
    }


def build_user_profile(user):
    courses = list(accessible_courses(user)) if user.is_authenticated else []
    lesson_ids = [lesson.id for course in courses for module in course.modules.all() for lesson in module.lessons.all()]
    total = len(lesson_ids)
    completed = LessonProgress.objects.filter(student=user, lesson_id__in=lesson_ids, is_completed=True).count() if total else 0
    avg_score = TestAttempt.objects.filter(student=user).aggregate(v=Avg('percentage'))['v'] or 0
    active_courses = 0
    if user.role == 'student':
        active_courses = Enrollment.objects.filter(student=user, status__in=['not_started', 'in_progress']).count()
    else:
        active_courses = len(courses)
    data = UserProfileSerializer(user).data
    data.update({
        'overallProgress': round(completed / total * 100) if total else 0,
        'completedLessonsCount': completed,
        'totalLessonsCount': total,
        'averageScore': round(avg_score),
        'activeCoursesCount': active_courses,
    })
    return data


def teacher_dict(user):
    return {
        'id': str(user.id),
        'name': user.get_full_name() or user.email,
        'title': user.title or 'O‘qituvchi',
        'avatarUrl': user.avatar_url,
        'department': user.department,
        'email': user.email,
    }


def lesson_content_id(lesson):
    try:
        if lesson.lesson_type == 'theory':
            return 'theoryId', lesson.theory_content.id
        if lesson.lesson_type == 'presentation':
            return 'presentationId', lesson.presentation_content.id
        if lesson.lesson_type == 'video':
            return 'videoId', lesson.video_content.id
        if lesson.lesson_type == 'test':
            return 'testId', lesson.test_content.id
    except Exception:
        pass
    return None, None


def course_dict(course, user, progresses):
    modules_data = []
    total = 0
    completed = 0
    previous_completed = True
    current_assigned = False
    for module in course.modules.all():
        lessons = list(module.lessons.all())
        lesson_data = []
        for lesson in lessons:
            total += 1
            p = progresses.get(lesson.id)
            is_completed = bool(p and p.is_completed)
            if is_completed:
                completed += 1
            key, content_id = lesson_content_id(lesson)
            data = {
                'id': lesson.id,
                'courseId': course.id,
                'moduleId': module.id,
                'title': lesson.title,
                'type': lesson.lesson_type,
                'durationMinutes': lesson.duration_minutes,
                'order': lesson.order,
                'isCompleted': is_completed,
                'isLocked': False if user.role in ('admin', 'teacher') else (not previous_completed),
                'isCurrent': (not current_assigned and not is_completed and previous_completed),
                'description': lesson.description,
            }
            if key and content_id:
                data[key] = content_id
            lesson_data.append(data)
            if data['isCurrent']:
                current_assigned = True
            previous_completed = is_completed
        modules_data.append({
            'id': module.id,
            'courseId': course.id,
            'title': module.title,
            'description': module.description,
            'order': module.order,
            'lessons': lesson_data,
        })
    progress = round(completed / total * 100) if total else 0
    enrollment = Enrollment.objects.filter(student=user, course=course).first() if user.role == 'student' else None
    status_value = 'completed' if progress == 100 else ('in_progress' if progress > 0 else 'not_started')
    if enrollment and enrollment.status != status_value:
        enrollment.status = status_value
        enrollment.save(update_fields=['status'])
    last_accessed = enrollment.last_accessed_at if enrollment else course.updated_at
    return {
        'id': course.id,
        'title': course.title,
        'code': course.code,
        'coverImage': course.cover_image,
        'category': course.category,
        'level': course.level,
        'description': course.description,
        'teacher': teacher_dict(course.teacher),
        'totalModulesCount': len(modules_data),
        'totalLessonsCount': total,
        'estimatedStudyHours': course.estimated_study_hours,
        'progressPercentage': progress,
        'lastAccessedDate': last_accessed.astimezone().strftime('%Y-%m-%d %H:%M') if last_accessed else '',
        'status': status_value,
        'tags': course.tags or [],
        'modules': modules_data,
    }


def theory_dict(item, user):
    p = LessonProgress.objects.filter(student=user, lesson=item.lesson).first()
    return {
        'id': item.id,
        'lessonId': item.lesson_id,
        'courseId': item.lesson.module.course_id,
        'title': item.lesson.title,
        'readingTimeMinutes': item.reading_time_minutes,
        'summary': item.summary,
        'sections': item.sections or [],
        'attachments': item.attachments or [],
        'notes': p.notes if p else '',
        'isBookmarked': p.is_bookmarked if p else False,
    }


def normalize_video_url(url, embed_type):
    raw = (url or '').strip()
    if not raw:
        return raw
    try:
        parsed = urlparse(raw)
        host = parsed.netloc.lower().replace('www.', '')
        path_parts = [part for part in parsed.path.split('/') if part]
        if embed_type == 'youtube':
            video_id = None
            if host in ('youtu.be',):
                video_id = path_parts[0] if path_parts else None
            elif host in ('youtube.com', 'm.youtube.com', 'youtube-nocookie.com'):
                if parsed.path == '/watch':
                    video_id = parse_qs(parsed.query).get('v', [None])[0]
                elif path_parts and path_parts[0] in ('embed', 'shorts', 'live') and len(path_parts) > 1:
                    video_id = path_parts[1]
            if video_id:
                return f'https://www.youtube-nocookie.com/embed/{video_id}'
        if embed_type == 'vimeo':
            if host in ('vimeo.com', 'player.vimeo.com'):
                video_id = next((part for part in reversed(path_parts) if part.isdigit()), None)
                if video_id:
                    return f'https://player.vimeo.com/video/{video_id}'
    except Exception:
        return raw
    return raw


def presentation_dict(item):
    lesson = item.lesson
    return {
        'id': item.id,
        'lessonId': lesson.id,
        'courseId': lesson.module.course_id,
        'courseName': lesson.module.course.title,
        'moduleName': lesson.module.title,
        'title': item.title,
        'totalSlides': len(item.slides or []),
        'fileType': item.file_type,
        'fileSize': item.file_size,
        'uploadDate': item.uploaded_at.date().isoformat(),
        'downloadUrl': item.file_url,
        'embedUrl': item.embed_url,
        'slides': item.slides or [],
    }


def video_dict(item, user):
    lesson = item.lesson
    p = LessonProgress.objects.filter(student=user, lesson=lesson).first()
    return {
        'id': item.id,
        'lessonId': lesson.id,
        'courseId': lesson.module.course_id,
        'courseName': lesson.module.course.title,
        'moduleName': lesson.module.title,
        'title': item.title,
        'teacherName': lesson.module.course.teacher.get_full_name() or lesson.module.course.teacher.email,
        'durationMinutes': round(item.duration_seconds / 60) if item.duration_seconds else lesson.duration_minutes,
        'durationSeconds': item.duration_seconds,
        'videoUrl': normalize_video_url(item.video_url, item.embed_type),
        'embedType': item.embed_type,
        'description': item.description,
        'lastPositionSeconds': p.last_position_seconds if p else 0,
        'watchedPercentage': p.watched_percentage if p else 0,
        'isCompleted': p.is_completed if p else False,
        'resources': item.resources or [],
        'transcript': item.transcript,
    }


def test_dict(test, user):
    attempts_qs = TestAttempt.objects.filter(student=user, test=test)
    used = attempts_qs.count()
    best = attempts_qs.aggregate(v=Max('percentage'))['v'] or 0
    latest = attempts_qs.order_by('-submitted_at').first()
    if not latest:
        status_value = 'not_started'
    elif latest.is_passed:
        status_value = 'passed'
    elif used >= test.attempts_allowed:
        status_value = 'submitted'
    else:
        status_value = 'retake_needed'
    questions = []
    for q in test.questions.all():
        questions.append({
            'id': q.id,
            'testId': test.id,
            'questionText': q.question_text,
            'type': q.question_type,
            'options': q.options or [],
            'explanation': '',
            'points': q.points,
            'codeSnippet': q.code_snippet or None,
        })
    lesson = test.lesson
    return {
        'id': test.id,
        'courseId': lesson.module.course_id,
        'courseName': lesson.module.course.title,
        'moduleId': lesson.module_id,
        'moduleName': lesson.module.title,
        'title': test.title,
        'questionCount': len(questions),
        'timeLimitMinutes': test.time_limit_minutes,
        'attemptsAllowed': test.attempts_allowed,
        'attemptsUsed': used,
        'passingScorePercent': test.passing_score_percent,
        'bestScorePercent': best,
        'status': status_value,
        'questions': questions,
    }


def attempt_dict(attempt):
    return {
        'id': attempt.id,
        'testId': attempt.test_id,
        'testTitle': attempt.test.title,
        'courseName': attempt.test.lesson.module.course.title,
        'score': attempt.score,
        'maxScore': attempt.max_score,
        'percentage': attempt.percentage,
        'passingScorePercent': attempt.test.passing_score_percent,
        'isPassed': attempt.is_passed,
        'date': attempt.submitted_at.astimezone().strftime('%Y-%m-%d %H:%M'),
        'timeSpentSeconds': attempt.time_spent_seconds,
        'attemptNumber': attempt.attempt_number,
        'correctAnswersCount': sum(1 for r in attempt.answer_reviews if r.get('isCorrect')),
        'incorrectAnswersCount': sum(1 for r in attempt.answer_reviews if not r.get('isCorrect') and r.get('userAnswerText') != 'Belgilanmadi'),
        'unansweredCount': sum(1 for r in attempt.answer_reviews if r.get('userAnswerText') == 'Belgilanmadi'),
        'topicBreakdowns': attempt.topic_breakdowns or [],
        'answerReviews': attempt.answer_reviews or [],
    }


def weekly_activity_dict(user):
    today = timezone.localdate()
    start_date = today - timedelta(days=6)
    rows = {
        start_date + timedelta(days=offset): {
            'minutesSpent': 0,
            'lessonsCompleted': 0,
            'testsCompleted': 0,
        }
        for offset in range(7)
    }

    completed_lessons = LessonProgress.objects.filter(
        student=user,
        is_completed=True,
        completed_at__date__gte=start_date,
        completed_at__date__lte=today,
    ).select_related('lesson')
    for progress in completed_lessons:
        day = timezone.localtime(progress.completed_at).date()
        if day not in rows:
            continue
        if progress.lesson.lesson_type != 'test':
            rows[day]['lessonsCompleted'] += 1
            rows[day]['minutesSpent'] += max(1, progress.lesson.duration_minutes)

    attempts = TestAttempt.objects.filter(
        student=user,
        submitted_at__date__gte=start_date,
        submitted_at__date__lte=today,
    )
    for attempt in attempts:
        day = timezone.localtime(attempt.submitted_at).date()
        if day not in rows:
            continue
        rows[day]['testsCompleted'] += 1
        rows[day]['minutesSpent'] += max(1, round(attempt.time_spent_seconds / 60))

    uz_days = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
    uz_full_days = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']
    return [
        {
            'day': uz_full_days[day.weekday()],
            'dayShort': uz_days[day.weekday()],
            'minutesSpent': values['minutesSpent'],
            'lessonsCompleted': values['lessonsCompleted'],
            'testsCompleted': values['testsCompleted'],
            'dateStr': day.isoformat(),
        }
        for day, values in rows.items()
    ]


def notification_dict(item):
    local = timezone.localtime(item.created_at)
    return {
        'id': item.id,
        'title': item.title,
        'message': item.message,
        'date': local.date().isoformat(),
        'time': local.strftime('%H:%M'),
        'isRead': item.is_read,
        'type': item.notification_type,
        'linkTarget': item.link_target or None,
    }


def readable_answer(question, answer):
    if answer is None or answer == '' or answer == []:
        return 'Belgilanmadi'
    if question.question_type == 'single_choice':
        return next((o.get('text', str(answer)) for o in question.options if o.get('id') == answer), str(answer))
    if question.question_type == 'multiple_choice':
        values = answer if isinstance(answer, list) else []
        by_id = {o.get('id'): o.get('text', o.get('id')) for o in question.options}
        return ', '.join(str(by_id.get(v, v)) for v in values) or 'Belgilanmadi'
    if question.question_type == 'true_false':
        return 'Rost (True)' if bool(answer) else 'Yolg‘on (False)'
    return str(answer)


def is_answer_correct(question, answer):
    correct = question.correct_answer
    if answer is None or answer == '' or answer == []:
        return False
    if question.question_type == 'multiple_choice':
        return sorted(map(str, answer if isinstance(answer, list) else [])) == sorted(map(str, correct if isinstance(correct, list) else []))
    if question.question_type == 'short_text':
        return str(answer).strip().casefold() == str(correct).strip().casefold()
    if question.question_type == 'true_false':
        if isinstance(answer, str):
            answer = answer.lower() in ('true', '1', 'yes', 'rost')
        return bool(answer) is bool(correct)
    return str(answer) == str(correct)


class HealthView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        try:
            connection.ensure_connection()
        except Exception:
            return Response(
                {'status': 'error', 'service': 'InfoEdu API', 'database': 'unavailable'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({'status': 'ok', 'service': 'InfoEdu API', 'database': 'ok'})


class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        password = str(request.data.get('password', ''))
        user = authenticate(request, username=email, password=password)
        if not user or not user.is_active:
            return Response({'detail': 'Email yoki parol noto‘g‘ri.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(token_payload(user))


class DemoLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        if not settings.DEMO_MODE:
            return Response({'detail': 'Demo rejim o‘chirilgan.'}, status=status.HTTP_404_NOT_FOUND)
        role = request.data.get('role', 'student')
        email_map = {
            'student': 'anvar.axadjonov@tuit.uz',
            'teacher': 'j.karimov@tuit.uz',
            'admin': 'admin@infoedu.uz',
        }
        user = get_object_or_404(User, email=email_map.get(role, email_map['student']))
        return Response(token_payload(user))


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response(build_user_profile(request.user))
    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(build_user_profile(request.user))


class BootstrapView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        courses = list(accessible_courses(user))
        lesson_ids = [lesson.id for c in courses for m in c.modules.all() for lesson in m.lessons.all()]
        progresses = progress_map(user, lesson_ids)
        course_payload = [course_dict(course, user, progresses) for course in courses]
        course_ids = [course.id for course in courses]

        theories = TheoryContent.objects.filter(lesson__module__course_id__in=course_ids).select_related('lesson')
        presentations = Presentation.objects.filter(lesson__module__course_id__in=course_ids).select_related('lesson__module__course')
        videos = Video.objects.filter(lesson__module__course_id__in=course_ids).select_related('lesson__module__course__teacher')
        tests = Test.objects.filter(lesson__module__course_id__in=course_ids).select_related('lesson__module__course').prefetch_related('questions')
        attempts = TestAttempt.objects.filter(student=user, test__lesson__module__course_id__in=course_ids).select_related('test__lesson__module__course')
        notifications = Notification.objects.filter(user=user)[:100]

        return Response({
            'user': build_user_profile(user),
            'courses': course_payload,
            'theoryLessons': {item.id: theory_dict(item, user) for item in theories},
            'presentations': {item.id: presentation_dict(item) for item in presentations},
            'videos': {item.id: video_dict(item, user) for item in videos},
            'tests': {item.id: test_dict(item, user) for item in tests},
            'testResults': [attempt_dict(item) for item in attempts],
            'notifications': [notification_dict(item) for item in notifications],
            'weeklyActivities': weekly_activity_dict(user),
        })


class LessonCompleteView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, lesson_id):
        lesson = get_object_or_404(Lesson.objects.select_related('module__course'), id=lesson_id, is_published=True)
        if not can_access_lesson(request.user, lesson):
            return Response({'detail': 'Ushbu dars hozircha yopiq yoki kirish huquqingiz yo‘q.'}, status=status.HTTP_403_FORBIDDEN)
        progress, _ = LessonProgress.objects.get_or_create(student=request.user, lesson=lesson)
        was_completed = progress.is_completed
        progress.is_completed = True
        progress.completed_at = progress.completed_at or timezone.now()
        progress.save(update_fields=['is_completed', 'completed_at', 'updated_at'])
        if request.user.role == 'student' and not was_completed:
            request.user.total_study_minutes += max(1, lesson.duration_minutes)
            request.user.save(update_fields=['total_study_minutes'])
        refresh_enrollment_status(request.user, lesson.module.course)
        refresh_study_streak(request.user)
        return Response({'ok': True, 'totalStudyMinutes': request.user.total_study_minutes})


class TheoryProgressView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, theory_id):
        theory = get_object_or_404(TheoryContent.objects.select_related('lesson__module__course'), id=theory_id)
        if not can_access_lesson(request.user, theory.lesson):
            return Response({'detail': 'Ushbu dars hozircha yopiq yoki kirish huquqingiz yo‘q.'}, status=status.HTTP_403_FORBIDDEN)
        progress, _ = LessonProgress.objects.get_or_create(student=request.user, lesson=theory.lesson)
        if 'notes' in request.data:
            progress.notes = str(request.data.get('notes') or '')[:10000]
        if 'isBookmarked' in request.data:
            progress.is_bookmarked = bool(request.data.get('isBookmarked'))
        progress.save()
        return Response({'ok': True, 'notes': progress.notes, 'isBookmarked': progress.is_bookmarked})


class VideoProgressView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, video_id):
        video = get_object_or_404(Video.objects.select_related('lesson__module__course'), id=video_id)
        if not can_access_lesson(request.user, video.lesson):
            return Response({'detail': 'Ushbu video hozircha yopiq yoki kirish huquqingiz yo‘q.'}, status=status.HTTP_403_FORBIDDEN)
        progress, _ = LessonProgress.objects.get_or_create(student=request.user, lesson=video.lesson)
        seconds = max(0, int(request.data.get('seconds') or 0))
        percentage = min(100, max(0, int(request.data.get('percentage') or 0)))
        progress.last_position_seconds = seconds
        progress.watched_percentage = max(progress.watched_percentage, percentage)
        was_completed = progress.is_completed
        if bool(request.data.get('markCompleted')) or progress.watched_percentage >= 90:
            progress.is_completed = True
            progress.completed_at = progress.completed_at or timezone.now()
        progress.save()
        if request.user.role == 'student' and progress.is_completed and not was_completed:
            estimated_minutes = round(video.duration_seconds / 60) if video.duration_seconds else video.lesson.duration_minutes
            request.user.total_study_minutes += max(1, estimated_minutes)
            request.user.save(update_fields=['total_study_minutes'])
        if progress.is_completed:
            refresh_enrollment_status(request.user, video.lesson.module.course)
            refresh_study_streak(request.user)
        return Response({
            'ok': True,
            'lastPositionSeconds': progress.last_position_seconds,
            'watchedPercentage': progress.watched_percentage,
            'isCompleted': progress.is_completed,
            'totalStudyMinutes': request.user.total_study_minutes,
        })


class TestSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, test_id):
        test = get_object_or_404(Test.objects.select_related('lesson__module__course').prefetch_related('questions'), id=test_id)
        if not can_access_lesson(request.user, test.lesson):
            return Response({'detail': 'Ushbu test hozircha yopiq yoki kirish huquqingiz yo‘q.'}, status=status.HTTP_403_FORBIDDEN)

        used = TestAttempt.objects.filter(student=request.user, test=test).count()
        if used >= test.attempts_allowed:
            return Response({'detail': 'Bu test uchun urinishlar soni tugagan.'}, status=status.HTTP_400_BAD_REQUEST)

        answers = request.data.get('answers') or {}
        flagged = {str(x) for x in request.data.get('flaggedQuestionIds') or []}
        time_spent = max(0, min(int(request.data.get('timeSpentSeconds') or 0), test.time_limit_minutes * 60 + 30))

        earned = 0
        maximum = 0
        reviews = []
        topic_totals = defaultdict(lambda: {'score': 0, 'maxScore': 0})
        evaluated = []

        for question in test.questions.all():
            maximum += question.points
            answer = answers.get(question.id)
            correct = is_answer_correct(question, answer)
            points = question.points if correct else 0
            earned += points
            topic_totals[question.topic]['score'] += points
            topic_totals[question.topic]['maxScore'] += question.points
            reviews.append({
                'questionId': question.id,
                'questionText': question.question_text,
                'userAnswerText': readable_answer(question, answer),
                'correctAnswerText': readable_answer(question, question.correct_answer),
                'isCorrect': correct,
                'explanation': question.explanation,
            })
            evaluated.append((question, answer, correct, points))

        percentage = round(earned / maximum * 100) if maximum else 0
        passed = percentage >= test.passing_score_percent
        attempt_number = used + 1
        attempt = TestAttempt.objects.create(
            id=f'res-{uuid4().hex[:18]}',
            student=request.user,
            test=test,
            attempt_number=attempt_number,
            score=earned,
            max_score=maximum,
            percentage=percentage,
            is_passed=passed,
            time_spent_seconds=time_spent,
            answer_reviews=reviews,
            topic_breakdowns=[
                {
                    'topic': topic,
                    'score': values['score'],
                    'maxScore': values['maxScore'],
                    'percentage': round(values['score'] / values['maxScore'] * 100) if values['maxScore'] else 0,
                }
                for topic, values in topic_totals.items()
            ],
        )
        if request.user.role == 'student' and time_spent > 0:
            request.user.total_study_minutes += max(1, round(time_spent / 60))
            request.user.save(update_fields=['total_study_minutes'])

        TestAnswer.objects.bulk_create([
            TestAnswer(
                attempt=attempt,
                question=question,
                answer=answer,
                is_correct=correct,
                is_flagged=question.id in flagged,
                points_earned=points,
            )
            for question, answer, correct, points in evaluated
        ])

        if passed:
            progress, _ = LessonProgress.objects.get_or_create(student=request.user, lesson=test.lesson)
            progress.is_completed = True
            progress.completed_at = progress.completed_at or timezone.now()
            progress.save()

        refresh_enrollment_status(request.user, test.lesson.module.course)
        refresh_study_streak(request.user)

        Notification.objects.create(
            id=f'notif-{uuid4().hex[:18]}',
            user=request.user,
            title='Test natijasi tayyor',
            message=f'“{test.title}” testi bo‘yicha natijangiz: {percentage}%.',
            notification_type='result',
            link_target=f'test_result:{attempt.id}',
        )
        return Response(attempt_dict(attempt), status=status.HTTP_201_CREATED)


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, notification_id):
        item = get_object_or_404(Notification, id=notification_id, user=request.user)
        item.is_read = True
        item.save(update_fields=['is_read'])
        return Response({'ok': True})


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'ok': True})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_value = str(request.data.get('refresh') or '')
        if refresh_value:
            try:
                RefreshToken(refresh_value).blacklist()
            except Exception:
                pass
        return Response({'ok': True})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        old_password = str(request.data.get('oldPassword') or '')
        new_password = str(request.data.get('newPassword') or '')
        if not request.user.check_password(old_password):
            return Response({'detail': 'Joriy parol noto‘g‘ri.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user=request.user)
        except ValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'ok': True})


class AdminAnnouncementView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        if request.user.role not in ('admin', 'teacher'):
            return Response({'detail': 'Ruxsat yo‘q.'}, status=status.HTTP_403_FORBIDDEN)
        title = str(request.data.get('title') or '').strip()
        message = str(request.data.get('message') or '').strip()
        if not title or not message:
            return Response({'detail': 'Sarlavha va matn majburiy.'}, status=status.HTTP_400_BAD_REQUEST)
        students = User.objects.filter(role='student', is_active=True)
        if request.user.role == 'teacher':
            students = students.filter(enrollments__course__teacher=request.user).distinct()
        now = timezone.now()
        Notification.objects.bulk_create([
            Notification(
                id=f'notif-{uuid4().hex[:18]}', user=student, title=title, message=message,
                notification_type='announcement', created_at=now,
            ) for student in students
        ])
        return Response({'ok': True, 'sent': students.count()}, status=status.HTTP_201_CREATED)


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        if request.user.role not in ('admin', 'teacher'):
            return Response({'detail': 'Ruxsat yo‘q.'}, status=status.HTTP_403_FORBIDDEN)
        students = User.objects.filter(role='student')
        attempts = TestAttempt.objects.all()
        courses = Course.objects.filter(status='published')
        if request.user.role == 'teacher':
            courses = courses.filter(teacher=request.user)
            students = students.filter(enrollments__course__in=courses).distinct()
            attempts = attempts.filter(test__lesson__module__course__in=courses)
        student_rows = []
        for student in students[:200]:
            student_rows.append({
                'id': str(student.id),
                'fullName': student.get_full_name() or student.email,
                'studentId': student.student_id,
                'group': student.group_name,
                'faculty': student.faculty,
                'activeCourses': Enrollment.objects.filter(student=student).count(),
                'averageScore': round(TestAttempt.objects.filter(student=student).aggregate(v=Avg('percentage'))['v'] or 0),
                'status': 'active' if student.is_active else 'inactive',
            })
        announcement_rows = []
        seen_announcements = set()
        announcement_query = Notification.objects.filter(notification_type='announcement').order_by('-created_at')
        if request.user.role == 'teacher':
            announcement_query = announcement_query.filter(user__in=students)
        for item in announcement_query[:200]:
            key = (item.title, item.message, item.created_at.replace(second=0, microsecond=0))
            if key in seen_announcements:
                continue
            seen_announcements.add(key)
            announcement_rows.append(notification_dict(item))
            if len(announcement_rows) >= 20:
                break

        return Response({
            'totalStudents': students.count(),
            'activeStudents': students.filter(is_active=True).count(),
            'totalCourses': courses.count(),
            'submittedTests': attempts.count(),
            'averageScore': round(attempts.aggregate(v=Avg('percentage'))['v'] or 0, 1),
            'students': student_rows,
            'announcements': announcement_rows,
        })
