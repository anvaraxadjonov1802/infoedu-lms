from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Course,
    Enrollment,
    LessonProgress,
    Notification,
    Presentation,
    Test,
    TestAttempt,
    TheoryContent,
    Video,
)
from .serializers import UserProfileSerializer
from .views import (
    attempt_dict,
    can_access_lesson,
    course_dict,
    notification_dict,
    presentation_dict,
)


def fast_accessible_courses(user):
    query = Course.objects.filter(status='published')
    if user.role == 'teacher':
        query = query.filter(Q(teacher=user) | Q(enrollments__student=user)).distinct()
    elif user.role == 'student':
        query = query.filter(enrollments__student=user).distinct()

    # Reverse one-to-one content IDs are used by course_dict(). Prefetch them so
    # rendering a 47-lesson course does not create one query per lesson.
    return query.select_related('teacher').prefetch_related(
        'modules__lessons__theory_content',
        'modules__lessons__presentation_content',
        'modules__lessons__video_content',
        'modules__lessons__test_content',
    )


def profile_from_loaded(user, courses, progresses):
    lesson_ids = [
        lesson.id
        for course in courses
        for module in course.modules.all()
        for lesson in module.lessons.all()
    ]
    total = len(lesson_ids)
    completed = sum(1 for lesson_id in lesson_ids if progresses.get(lesson_id) and progresses[lesson_id].is_completed)
    avg_score = (
        TestAttempt.objects.filter(student=user)
        .aggregate_from_db() if False else None
    )
    # Keep the aggregate as a tiny scalar query and never load JSON review fields.
    percentages = list(
        TestAttempt.objects.filter(student=user).values_list('percentage', flat=True)
    )
    average_score = round(sum(percentages) / len(percentages)) if percentages else 0

    if user.role == 'student':
        active_courses = Enrollment.objects.filter(
            student=user, status__in=['not_started', 'in_progress']
        ).count()
    else:
        active_courses = len(courses)

    data = UserProfileSerializer(user).data
    data.update({
        'overallProgress': round(completed / total * 100) if total else 0,
        'completedLessonsCount': completed,
        'totalLessonsCount': total,
        'averageScore': average_score,
        'activeCoursesCount': active_courses,
    })
    return data


def theory_summary_dict(item, progress):
    return {
        'id': item.id,
        'lessonId': item.lesson_id,
        'courseId': item.lesson.module.course_id,
        'title': item.lesson.title,
        'readingTimeMinutes': item.reading_time_minutes,
        'summary': '',
        'sections': [],
        'attachments': item.attachments or [],
        'notes': progress.notes if progress else '',
        'isBookmarked': progress.is_bookmarked if progress else False,
    }


def theory_detail_dict(item, progress):
    return {
        'id': item.id,
        'lessonId': item.lesson_id,
        'courseId': item.lesson.module.course_id,
        'title': item.lesson.title,
        'readingTimeMinutes': item.reading_time_minutes,
        'summary': item.summary,
        'sections': item.sections or [],
        'attachments': item.attachments or [],
        'notes': progress.notes if progress else '',
        'isBookmarked': progress.is_bookmarked if progress else False,
    }


def video_summary_dict(item, progress):
    lesson = item.lesson
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
        'videoUrl': item.video_url,
        'embedType': item.embed_type,
        'description': item.description,
        'lastPositionSeconds': progress.last_position_seconds if progress else 0,
        'watchedPercentage': progress.watched_percentage if progress else 0,
        'isCompleted': progress.is_completed if progress else False,
        'resources': item.resources or [],
        'transcript': item.transcript,
    }


def test_status_from_attempts(test, attempts):
    used = len(attempts)
    best = max((attempt.percentage for attempt in attempts), default=0)
    latest = max(attempts, key=lambda attempt: attempt.submitted_at, default=None)
    if not latest:
        status_value = 'not_started'
    elif latest.is_passed:
        status_value = 'passed'
    elif used >= test.attempts_allowed:
        status_value = 'submitted'
    else:
        status_value = 'retake_needed'
    return used, best, status_value


def test_summary_dict(test, attempts):
    used, best, status_value = test_status_from_attempts(test, attempts)
    lesson = test.lesson
    return {
        'id': test.id,
        'courseId': lesson.module.course_id,
        'courseName': lesson.module.course.title,
        'moduleId': lesson.module_id,
        'moduleName': lesson.module.title,
        'title': test.title,
        'questionCount': int(getattr(test, 'question_count', 0)),
        'timeLimitMinutes': test.time_limit_minutes,
        'attemptsAllowed': test.attempts_allowed,
        'attemptsUsed': used,
        'passingScorePercent': test.passing_score_percent,
        'bestScorePercent': best,
        'status': status_value,
        'questions': [],
    }


def test_detail_dict(test, attempts):
    used, best, status_value = test_status_from_attempts(test, attempts)
    questions = [
        {
            'id': question.id,
            'testId': test.id,
            'questionText': question.question_text,
            'type': question.question_type,
            'options': question.options or [],
            'explanation': '',
            'points': question.points,
            'codeSnippet': question.code_snippet or None,
        }
        for question in test.questions.all()
    ]
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


def attempt_summary_dict(attempt):
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
        'correctAnswersCount': 0,
        'incorrectAnswersCount': 0,
        'unansweredCount': 0,
        'topicBreakdowns': [],
        'answerReviews': [],
    }


def fast_weekly_activity_dict(user):
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

    lesson_rows = LessonProgress.objects.filter(
        student=user,
        is_completed=True,
        completed_at__date__gte=start_date,
        completed_at__date__lte=today,
    ).values('completed_at', 'lesson__lesson_type', 'lesson__duration_minutes')
    for progress in lesson_rows:
        completed_at = progress['completed_at']
        if not completed_at:
            continue
        day = timezone.localtime(completed_at).date()
        if day not in rows or progress['lesson__lesson_type'] == 'test':
            continue
        rows[day]['lessonsCompleted'] += 1
        rows[day]['minutesSpent'] += max(1, progress['lesson__duration_minutes'] or 0)

    attempt_rows = TestAttempt.objects.filter(
        student=user,
        submitted_at__date__gte=start_date,
        submitted_at__date__lte=today,
    ).values('submitted_at', 'time_spent_seconds')
    for attempt in attempt_rows:
        day = timezone.localtime(attempt['submitted_at']).date()
        if day not in rows:
            continue
        rows[day]['testsCompleted'] += 1
        rows[day]['minutesSpent'] += max(1, round((attempt['time_spent_seconds'] or 0) / 60))

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


class FastBootstrapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        courses = list(fast_accessible_courses(user))
        lesson_ids = [
            lesson.id
            for course in courses
            for module in course.modules.all()
            for lesson in module.lessons.all()
        ]
        progresses = {
            progress.lesson_id: progress
            for progress in LessonProgress.objects.filter(
                student=user, lesson_id__in=lesson_ids
            )
        }
        course_payload = [course_dict(course, user, progresses) for course in courses]
        course_ids = [course.id for course in courses]

        # Do not fetch large rich-text sections during application bootstrap.
        theories = TheoryContent.objects.filter(
            lesson__module__course_id__in=course_ids
        ).select_related('lesson__module__course').defer('sections', 'summary')

        presentations = Presentation.objects.filter(
            lesson__module__course_id__in=course_ids
        ).select_related('lesson__module__course')

        videos = Video.objects.filter(
            lesson__module__course_id__in=course_ids
        ).select_related('lesson__module__course__teacher')

        # Only test metadata + question count. The actual questions are fetched
        # from /tests/<id>/ when the student opens that test.
        tests = list(
            Test.objects.filter(
                lesson__module__course_id__in=course_ids
            )
            .select_related('lesson__module__course')
            .annotate(question_count=Count('questions'))
        )

        # Result review JSON can be large; keep only table/card metadata here.
        attempts = list(
            TestAttempt.objects.filter(
                student=user, test__lesson__module__course_id__in=course_ids
            )
            .select_related('test__lesson__module__course')
            .defer('answer_reviews', 'topic_breakdowns')
        )
        attempts_by_test = defaultdict(list)
        for attempt in attempts:
            attempts_by_test[attempt.test_id].append(attempt)

        notifications = Notification.objects.filter(user=user)[:100]

        return Response({
            'user': profile_from_loaded(user, courses, progresses),
            'courses': course_payload,
            'theoryLessons': {
                item.id: theory_summary_dict(item, progresses.get(item.lesson_id))
                for item in theories
            },
            'presentations': {item.id: presentation_dict(item) for item in presentations},
            'videos': {
                item.id: video_summary_dict(item, progresses.get(item.lesson_id))
                for item in videos
            },
            'tests': {
                item.id: test_summary_dict(item, attempts_by_test.get(item.id, []))
                for item in tests
            },
            'testResults': [attempt_summary_dict(item) for item in attempts],
            'notifications': [notification_dict(item) for item in notifications],
            'weeklyActivities': fast_weekly_activity_dict(user),
        })


class TheoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, theory_id):
        try:
            item = TheoryContent.objects.select_related(
                'lesson__module__course'
            ).get(id=theory_id)
        except TheoryContent.DoesNotExist:
            return Response({'detail': 'Material topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        if not can_access_lesson(request.user, item.lesson):
            return Response(
                {'detail': 'Ushbu dars hozircha yopiq yoki kirish huquqingiz yo‘q.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        progress = LessonProgress.objects.filter(student=request.user, lesson=item.lesson).first()
        return Response(theory_detail_dict(item, progress))


class TestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, test_id):
        try:
            test = Test.objects.select_related(
                'lesson__module__course'
            ).prefetch_related('questions').get(id=test_id)
        except Test.DoesNotExist:
            return Response({'detail': 'Test topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        if not can_access_lesson(request.user, test.lesson):
            return Response(
                {'detail': 'Test hali ochilmagan yoki kirish huquqingiz yo‘q.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        attempts = list(TestAttempt.objects.filter(student=request.user, test=test))
        return Response(test_detail_dict(test, attempts))


class TestResultDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, result_id):
        try:
            attempt = TestAttempt.objects.select_related(
                'test__lesson__module__course'
            ).get(id=result_id, student=request.user)
        except TestAttempt.DoesNotExist:
            return Response({'detail': 'Natija topilmadi.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(attempt_dict(attempt))
