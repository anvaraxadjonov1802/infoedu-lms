from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Course, Enrollment, Lesson, LessonProgress, Module, Notification, Presentation,
    Question, Test, TestAnswer, TestAttempt, TheoryContent, User, Video,
)


admin.site.site_header = 'InfoEdu boshqaruv paneli'
admin.site.site_title = 'InfoEdu Admin'
admin.site.index_title = 'Platformani boshqarish'


class PrettyJSONWidget(forms.Textarea):
    def __init__(self, attrs=None):
        defaults = {'rows': 8, 'style': 'font-family: monospace; width: 95%;'}
        defaults.update(attrs or {})
        super().__init__(defaults)


class TheoryContentAdminForm(forms.ModelForm):
    sections = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 14}),
        help_text=(
            'Nazariya bo‘limlari JSON ro‘yxat ko‘rinishida. Misol: '
            '[{"title":"Kirish","contentMarkdown":"Dars matni..."}]'
        ),
    )
    attachments = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 5}),
        help_text='Qo‘shimcha fayllar bo‘lmasa [] qoldiring.',
    )

    class Meta:
        model = TheoryContent
        fields = '__all__'


class PresentationAdminForm(forms.ModelForm):
    slides = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 10}),
        help_text=(
            'Agar PDF/PPTX URL ishlatilsa bo‘sh [] qoldirish mumkin. '
            'Ichki slaydlar uchun: [{"slideNumber":1,"title":"...","bulletPoints":["..."]}]'
        ),
    )

    class Meta:
        model = Presentation
        fields = '__all__'


class VideoAdminForm(forms.ModelForm):
    resources = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 6}),
        help_text='Qo‘shimcha resurslar bo‘lmasa [] qoldiring.',
    )

    class Meta:
        model = Video
        fields = '__all__'


class QuestionAdminForm(forms.ModelForm):
    options = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 7}),
        help_text=(
            'Variantli savol misoli: '
            '[{"id":"a","text":"1-javob"},{"id":"b","text":"2-javob"}]'
        ),
    )
    correct_answer = forms.JSONField(
        widget=PrettyJSONWidget(attrs={'rows': 3}),
        help_text='Single choice uchun masalan "a". Multiple choice uchun ["a","c"].',
    )

    class Meta:
        model = Question
        fields = '__all__'


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + ((
        'InfoEdu profili',
        {'fields': ('role', 'student_id', 'phone', 'university', 'faculty', 'group_name', 'avatar_url', 'title', 'department', 'study_streak_days', 'longest_streak_days', 'total_study_minutes')},
    ),)
    add_fieldsets = UserAdmin.add_fieldsets + ((
        'InfoEdu profili',
        {'fields': ('email', 'first_name', 'last_name', 'role', 'student_id', 'phone', 'university', 'faculty', 'group_name')},
    ),)
    list_display = ('email', 'first_name', 'last_name', 'role', 'group_name', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff', 'university', 'faculty')
    search_fields = ('email', 'first_name', 'last_name', 'student_id', 'group_name')
    ordering = ('email',)


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0
    fields = ('order', 'title', 'description')
    show_change_link = True


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'teacher', 'category', 'level', 'status', 'updated_at')
    list_filter = ('status', 'category', 'level')
    search_fields = ('code', 'title', 'description', 'teacher__email', 'teacher__first_name', 'teacher__last_name')
    autocomplete_fields = ('teacher',)
    list_editable = ('status',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Asosiy ma’lumot', {'fields': ('code', 'title', 'description', 'teacher', 'status')}),
        ('Katalog', {'fields': ('category', 'level', 'estimated_study_hours', 'tags', 'cover_image')}),
        ('Tizim', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
    inlines = [ModuleInline]


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ('order', 'lesson_type', 'title', 'duration_minutes', 'is_published')
    show_change_link = True


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order')
    list_filter = ('course',)
    search_fields = ('title', 'description', 'course__code', 'course__title')
    autocomplete_fields = ('course',)
    ordering = ('course', 'order')
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'lesson_type', 'order', 'duration_minutes', 'is_published')
    list_filter = ('lesson_type', 'is_published', 'module__course')
    search_fields = ('title', 'description', 'module__title', 'module__course__title')
    autocomplete_fields = ('module',)
    list_editable = ('is_published',)
    ordering = ('module', 'order')
    fieldsets = (
        ('Dars', {'fields': ('module', 'title', 'lesson_type', 'description')}),
        ('Tartib va holat', {'fields': ('order', 'duration_minutes', 'is_published')}),
    )


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'status', 'enrolled_at', 'last_accessed_at')
    list_filter = ('status', 'course', 'student__group_name')
    search_fields = ('student__email', 'student__first_name', 'student__last_name', 'student__student_id', 'course__code', 'course__title')
    autocomplete_fields = ('student', 'course')
    list_editable = ('status',)
    readonly_fields = ('enrolled_at',)


@admin.register(TheoryContent)
class TheoryContentAdmin(admin.ModelAdmin):
    form = TheoryContentAdminForm
    list_display = ('lesson', 'reading_time_minutes')
    search_fields = ('lesson__title', 'lesson__module__course__title', 'summary')
    autocomplete_fields = ('lesson',)
    fieldsets = (
        ('Qaysi darsga', {'fields': ('lesson',)}),
        ('Nazariya', {'fields': ('reading_time_minutes', 'summary', 'sections')}),
        ('Qo‘shimcha fayllar', {'fields': ('attachments',), 'classes': ('collapse',)}),
    )


@admin.register(Presentation)
class PresentationAdmin(admin.ModelAdmin):
    form = PresentationAdminForm
    list_display = ('title', 'lesson', 'file_type', 'uploaded_at')
    list_filter = ('file_type', 'lesson__module__course')
    search_fields = ('title', 'lesson__title', 'lesson__module__course__title')
    autocomplete_fields = ('lesson',)
    fieldsets = (
        ('Taqdimot', {'fields': ('lesson', 'title', 'file_type')}),
        ('Fayl', {'fields': ('file_url', 'embed_url', 'file_size')}),
        ('Ichki slaydlar', {'fields': ('slides',), 'classes': ('collapse',)}),
        ('Tizim', {'fields': ('uploaded_at',), 'classes': ('collapse',)}),
    )


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    form = VideoAdminForm
    list_display = ('title', 'lesson', 'embed_type', 'duration_seconds')
    list_filter = ('embed_type', 'lesson__module__course')
    search_fields = ('title', 'description', 'lesson__title', 'lesson__module__course__title')
    autocomplete_fields = ('lesson',)
    fieldsets = (
        ('Video', {'fields': ('lesson', 'title', 'video_url', 'embed_type', 'duration_seconds')}),
        ('Tavsif', {'fields': ('description', 'transcript')}),
        ('Qo‘shimcha resurslar', {'fields': ('resources',), 'classes': ('collapse',)}),
    )


class QuestionInline(admin.StackedInline):
    model = Question
    form = QuestionAdminForm
    extra = 1
    fields = ('order', 'topic', 'question_text', 'question_type', 'options', 'correct_answer', 'points', 'explanation', 'code_snippet')
    ordering = ('order',)
    show_change_link = True


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ('title', 'lesson', 'time_limit_minutes', 'attempts_allowed', 'passing_score_percent')
    list_filter = ('lesson__module__course',)
    search_fields = ('title', 'lesson__title', 'lesson__module__course__title')
    autocomplete_fields = ('lesson',)
    inlines = [QuestionInline]
    fieldsets = (
        ('Test', {'fields': ('lesson', 'title')}),
        ('Qoidalar', {'fields': ('time_limit_minutes', 'attempts_allowed', 'passing_score_percent')}),
    )


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    form = QuestionAdminForm
    list_display = ('short_question', 'test', 'question_type', 'topic', 'points', 'order')
    list_filter = ('test', 'question_type', 'topic')
    search_fields = ('question_text', 'test__title', 'topic')
    autocomplete_fields = ('test',)
    ordering = ('test', 'order')

    @admin.display(description='Savol')
    def short_question(self, obj):
        return obj.question_text[:90]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'user__email', 'user__first_name', 'user__last_name')
    autocomplete_fields = ('user',)
    readonly_fields = ('created_at',)


class ReadOnlyHistoryAdmin(admin.ModelAdmin):
    """Learning history is generated by students and should not be edited manually."""

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]


@admin.register(LessonProgress)
class LessonProgressAdmin(ReadOnlyHistoryAdmin):
    list_display = ('student', 'lesson', 'is_completed', 'watched_percentage', 'updated_at')
    list_filter = ('is_completed', 'lesson__module__course')
    search_fields = ('student__email', 'lesson__title')


@admin.register(TestAttempt)
class TestAttemptAdmin(ReadOnlyHistoryAdmin):
    list_display = ('student', 'test', 'attempt_number', 'percentage', 'is_passed', 'submitted_at')
    list_filter = ('is_passed', 'test__lesson__module__course')
    search_fields = ('student__email', 'test__title')


@admin.register(TestAnswer)
class TestAnswerAdmin(ReadOnlyHistoryAdmin):
    list_display = ('attempt', 'question', 'is_correct', 'points_earned', 'is_flagged')
    list_filter = ('is_correct', 'is_flagged')
    search_fields = ('attempt__student__email', 'question__question_text')
