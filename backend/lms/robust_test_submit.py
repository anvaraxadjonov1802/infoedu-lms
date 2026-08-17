import hashlib
import logging
import re
import time
from collections import defaultdict
from uuid import uuid4

from django.db import InterfaceError, OperationalError, connections, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LessonProgress, Notification, Test, TestAnswer, TestAttempt, User
from .views import (
    attempt_dict,
    can_access_lesson,
    is_answer_correct,
    readable_answer,
    refresh_enrollment_status,
    refresh_study_streak,
)

logger = logging.getLogger(__name__)


def _submission_key(value):
    raw = str(value or '').strip()
    cleaned = re.sub(r'[^A-Za-z0-9_-]+', '', raw)[:64]
    return cleaned or uuid4().hex


def _attempt_id(user_id, test_id, submission_key):
    digest = hashlib.sha256(
        f'{user_id}:{test_id}:{submission_key}'.encode('utf-8')
    ).hexdigest()[:40]
    return f'res-{digest}'


class RobustTestSubmitView(APIView):
    """Idempotent test submit that tolerates one transient Render/Postgres disconnect."""

    permission_classes = [IsAuthenticated]

    def post(self, request, test_id):
        submission_key = _submission_key(request.data.get('submissionId'))

        for retry_index in range(2):
            try:
                return self._submit_once(request, test_id, submission_key)
            except (OperationalError, InterfaceError) as exc:
                # A pooled PostgreSQL connection can occasionally disappear between
                # Render and Supabase. Close it and retry once. Because the attempt ID
                # is deterministic, an uncertain commit cannot create a duplicate attempt.
                connections['default'].close()
                if retry_index == 0:
                    logger.warning(
                        'Transient DB disconnect during test submit; retrying once. test=%s user=%s error=%s',
                        test_id,
                        request.user.pk,
                        exc,
                    )
                    time.sleep(0.2)
                    continue

                logger.exception(
                    'Test submit failed after DB reconnect retry. test=%s user=%s',
                    test_id,
                    request.user.pk,
                )
                return Response(
                    {
                        'detail': (
                            'Server bilan vaqtinchalik aloqa uzildi. Javoblaringiz yo‘qolmagan bo‘lishi mumkin; '
                            'bir necha soniyadan keyin yana yuboring.'
                        )
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

    def _submit_once(self, request, test_id, submission_key):
        with transaction.atomic():
            # Serialize a single student's submissions so two rapid clicks/retries cannot
            # race on attempt_number.
            user = User.objects.select_for_update().get(pk=request.user.pk)
            attempt_id = _attempt_id(user.pk, test_id, submission_key)

            existing = (
                TestAttempt.objects.select_related('test__lesson__module__course')
                .filter(id=attempt_id, student=user, test_id=test_id)
                .first()
            )
            if existing:
                return Response(attempt_dict(existing), status=status.HTTP_200_OK)

            test = get_object_or_404(
                Test.objects.select_related('lesson__module__course').prefetch_related('questions'),
                id=test_id,
            )
            if not can_access_lesson(user, test.lesson):
                return Response(
                    {'detail': 'Ushbu test hozircha yopiq yoki kirish huquqingiz yo‘q.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            used = TestAttempt.objects.filter(student=user, test=test).count()
            if used >= test.attempts_allowed:
                return Response(
                    {'detail': 'Bu test uchun urinishlar soni tugagan.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            answers = request.data.get('answers') or {}
            if not isinstance(answers, dict):
                return Response(
                    {'detail': 'Test javoblari noto‘g‘ri formatda yuborildi.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            flagged = {str(value) for value in (request.data.get('flaggedQuestionIds') or [])}
            try:
                raw_time_spent = int(request.data.get('timeSpentSeconds') or 0)
            except (TypeError, ValueError):
                raw_time_spent = 0
            time_spent = max(
                0,
                min(raw_time_spent, test.time_limit_minutes * 60 + 30),
            )

            earned = 0
            maximum = 0
            reviews = []
            topic_totals = defaultdict(lambda: {'score': 0, 'maxScore': 0})
            evaluated = []

            for question in test.questions.all():
                maximum += question.points
                answer = answers.get(str(question.id), answers.get(question.id))
                correct = is_answer_correct(question, answer)
                points = question.points if correct else 0
                earned += points
                topic = question.topic or 'Umumiy'
                topic_totals[topic]['score'] += points
                topic_totals[topic]['maxScore'] += question.points
                reviews.append(
                    {
                        'questionId': question.id,
                        'questionText': question.question_text,
                        'userAnswerText': readable_answer(question, answer),
                        'correctAnswerText': readable_answer(question, question.correct_answer),
                        'isCorrect': correct,
                        'explanation': question.explanation,
                    }
                )
                evaluated.append((question, answer, correct, points))

            percentage = round(earned / maximum * 100) if maximum else 0
            passed = percentage >= test.passing_score_percent
            attempt_number = used + 1

            attempt = TestAttempt.objects.create(
                id=attempt_id,
                student=user,
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
                        'percentage': (
                            round(values['score'] / values['maxScore'] * 100)
                            if values['maxScore']
                            else 0
                        ),
                    }
                    for topic, values in topic_totals.items()
                ],
            )

            if user.role == 'student' and time_spent > 0:
                user.total_study_minutes += max(1, round(time_spent / 60))
                user.save(update_fields=['total_study_minutes'])

            TestAnswer.objects.bulk_create(
                [
                    TestAnswer(
                        attempt=attempt,
                        question=question,
                        answer=answer,
                        is_correct=correct,
                        is_flagged=str(question.id) in flagged,
                        points_earned=points,
                    )
                    for question, answer, correct, points in evaluated
                ]
            )

            if passed:
                progress, _ = LessonProgress.objects.get_or_create(student=user, lesson=test.lesson)
                progress.is_completed = True
                progress.completed_at = progress.completed_at or timezone.now()
                progress.save()

            refresh_enrollment_status(user, test.lesson.module.course)
            refresh_study_streak(user)

            Notification.objects.create(
                id=f'notif-{uuid4().hex[:18]}',
                user=user,
                title='Test natijasi tayyor',
                message=f'“{test.title}” testi bo‘yicha natijangiz: {percentage}%.',
                notification_type='result',
                link_target=f'test_result:{attempt.id}',
            )

            payload = attempt_dict(attempt)

        return Response(payload, status=status.HTTP_201_CREATED)
