from uuid import uuid4

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


def generate_content_id():
    """Stable string PK generator for LMS objects created from Django admin/API."""
    return uuid4().hex


class User(AbstractUser):
    ROLE_CHOICES = [('student', 'Talaba'), ('teacher', 'O‘qituvchi'), ('admin', 'Administrator')]
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default='student')
    student_id = models.CharField(max_length=64, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    university = models.CharField(max_length=255, blank=True)
    faculty = models.CharField(max_length=255, blank=True)
    group_name = models.CharField(max_length=64, blank=True)
    avatar_url = models.URLField(blank=True)
    title = models.CharField(max_length=128, blank=True)
    department = models.CharField(max_length=160, blank=True)
    study_streak_days = models.PositiveIntegerField(default=0)
    longest_streak_days = models.PositiveIntegerField(default=0)
    total_study_minutes = models.PositiveIntegerField(default=0)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.get_full_name() or self.email


class Course(models.Model):
    STATUS_CHOICES = [('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')]
    id = models.CharField(primary_key=True, max_length=64, default=generate_content_id, editable=False)
    title = models.CharField(max_length=255)
    code = models.CharField(max_length=64, unique=True)
    cover_image = models.URLField(blank=True)
    category = models.CharField(max_length=120, blank=True)
    level = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    teacher = models.ForeignKey(User, on_delete=models.PROTECT, related_name='courses_taught', limit_choices_to={'role__in': ['teacher', 'admin']})
    estimated_study_hours = models.PositiveIntegerField(default=0)
    tags = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='published')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f'{self.code} — {self.title}'


class Enrollment(models.Model):
    STATUS_CHOICES = [('not_started', 'Boshlanmagan'), ('in_progress', 'Jarayonda'), ('completed', 'Tugallangan')]
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments', limit_choices_to={'role': 'student'})
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='not_started')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    last_accessed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['student', 'course'], name='unique_enrollment')]

    def __str__(self):
        return f'{self.student} → {self.course}'


class Module(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_content_id, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['course_id', 'order']
        constraints = [models.UniqueConstraint(fields=['course', 'order'], name='unique_module_order')]

    def __str__(self):
        return f'{self.course.code} / {self.order}. {self.title}'


class Lesson(models.Model):
    TYPE_CHOICES = [('theory', 'Nazariya'), ('presentation', 'Taqdimot'), ('video', 'Video'), ('test', 'Test')]
    id = models.CharField(primary_key=True, max_length=64, default=generate_content_id, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    lesson_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    duration_minutes = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=1)
    description = models.TextField(blank=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ['module_id', 'order']
        constraints = [models.UniqueConstraint(fields=['module', 'order'], name='unique_lesson_order')]

    @property
    def course(self):
        return self.module.course

    def __str__(self):
        return f'{self.module.course.code} / {self.module.order}.{self.order} {self.title}'


class TheoryContent(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_content_id, editable=False)
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='theory_content', limit_choices_to={'lesson_type': 'theory'})
    reading_time_minutes = models.PositiveIntegerField(default=5)
    summary = models.TextField(blank=True)
    sections = models.JSONField(default=list, blank=True)
    attachments = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f'Nazariya — {self.lesson}'


class Presentation(models.Model):
    FILE_CHOICES = [('pdf', 'PDF'), ('pptx', 'PPTX')]
    id = models.CharField(primary_key=True, max_length=64, default=generate_content_id, editable=False)
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='presentation_content', limit_choices_to={'lesson_type': 'presentation'})
    title = models.CharField(max_length=255)
    file_type = models.CharField(max_length=8, choices=FILE_CHOICES, default='pdf')
    file_size = models.CharField(max_length=32, blank=True)
    file_url = models.URLField(blank=True)
    embed_url = models.URLField(blank=True)
    slides = models.JSONField(default=list, blank=True)
    uploaded_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title


class Video(models.Model):
    PROVIDER_CHOICES = [('youtube', 'YouTube'), ('vimeo', 'Vimeo'), ('direct', 'Direct')]
    id = models.CharField(primary_key=True, max_length=64, default=generate_content_id, editable=False)
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='video_content', limit_choices_to={'lesson_type': 'video'})
    title = models.CharField(max_length=255)
    video_url = models.URLField()
    embed_type = models.CharField(max_length=16, choices=PROVIDER_CHOICES, default='youtube')
    duration_seconds = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)
    resources = models.JSONField(default=list, blank=True)
    transcript = models.TextField(blank=True)

    def __str__(self):
        return self.title


class Test(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_content_id, editable=False)
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='test_content', limit_choices_to={'lesson_type': 'test'})
    title = models.CharField(max_length=255)
    time_limit_minutes = models.PositiveIntegerField(default=20)
    attempts_allowed = models.PositiveIntegerField(default=3)
    passing_score_percent = models.PositiveIntegerField(default=60)

    def __str__(self):
        return self.title


class Question(models.Model):
    TYPE_CHOICES = [
        ('single_choice', 'Single choice'),
        ('multiple_choice', 'Multiple choice'),
        ('true_false', 'True/False'),
        ('short_text', 'Short text'),
    ]
    id = models.CharField(primary_key=True, max_length=64, default=generate_content_id, editable=False)
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    options = models.JSONField(default=list, blank=True)
    correct_answer = models.JSONField()
    explanation = models.TextField(blank=True)
    points = models.PositiveIntegerField(default=1)
    code_snippet = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)
    topic = models.CharField(max_length=120, default='Umumiy')

    class Meta:
        ordering = ['test_id', 'order']
        constraints = [models.UniqueConstraint(fields=['test', 'order'], name='unique_question_order')]

    def __str__(self):
        return self.question_text[:80]


class LessonProgress(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='progress_records')
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_bookmarked = models.BooleanField(default=False)
    last_position_seconds = models.PositiveIntegerField(default=0)
    watched_percentage = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['student', 'lesson'], name='unique_lesson_progress')]

    def __str__(self):
        return f'{self.student} — {self.lesson}'


class TestAttempt(models.Model):
    id = models.CharField(primary_key=True, max_length=80)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='test_attempts')
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='attempts')
    attempt_number = models.PositiveIntegerField()
    score = models.PositiveIntegerField(default=0)
    max_score = models.PositiveIntegerField(default=0)
    percentage = models.PositiveIntegerField(default=0)
    is_passed = models.BooleanField(default=False)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    answer_reviews = models.JSONField(default=list, blank=True)
    topic_breakdowns = models.JSONField(default=list, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']
        constraints = [models.UniqueConstraint(fields=['student', 'test', 'attempt_number'], name='unique_test_attempt_number')]

    def __str__(self):
        return f'{self.student} — {self.test} #{self.attempt_number}'


class TestAnswer(models.Model):
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer = models.JSONField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    is_flagged = models.BooleanField(default=False)
    points_earned = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['attempt', 'question'], name='unique_attempt_answer')]


class Notification(models.Model):
    TYPE_CHOICES = [('lesson', 'Lesson'), ('test', 'Test'), ('result', 'Result'), ('announcement', 'Announcement'), ('system', 'System')]
    id = models.CharField(primary_key=True, max_length=80, default=generate_content_id, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=16, choices=TYPE_CHOICES, default='system')
    link_target = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} → {self.user}'
