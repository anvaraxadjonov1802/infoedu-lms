from pathlib import Path
from uuid import uuid4

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Course, Enrollment, Lesson, LessonProgress, Module, Notification, Presentation,
    Question, Test, TestAnswer, TestAttempt, TheoryContent, User, Video,
)
from .storage import upload_admin_file


admin.site.site_header = 'InfoEdu boshqaruv paneli'
admin.site.site_title = 'InfoEdu Admin'
admin.site.index_title = 'Platformani boshqarish'


class PrettyJSONWidget(forms.Textarea):
    def __init__(self, attrs=None):
        defaults = {'rows': 8, 'style': 'font-family: monospace; width: 95%;'}
        defaults.update(attrs or {})
        super().__init__(defaults)


class CourseAdminForm(forms.ModelForm):
    cover_upload = forms.FileField(
        required=False,
        label='Kurs rasmi — fayldan yuklash',
        help_text='JPG, PNG, WEBP va boshqa rasm faylini tanlang. Save bosilganda Supabase Storage ga yuklanadi.',
        widget=forms.ClearableFileInput(attrs={'accept': 'image/*'}),
    )

    class Meta:
        model = Course
        fields = '__all__'

    def clean_cover_upload(self):
        uploaded = self.cleaned_data.get('cover_upload')
        if uploaded and not str(getattr(uploaded, 'content_type', '')).startswith('image/'):
            raise forms.ValidationError('Kurs rasmi uchun rasm faylini tanlang.')
        return uploaded


class TheoryContentAdminForm(forms.ModelForm):
    material_upload = forms.FileField(
        required=False,
        label='Material fayli — kompyuterdan yuklash',
        help_text='DOCX, PDF, PPTX, rasm yoki boshqa o‘quv faylini tanlang. U attachments ro‘yxatiga avtomatik qo‘shiladi.',
    )
    sections = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 14}),
        help_text=(
            'Nazariya, amaliy yoki mustaqil ish matnini bo‘limlarga ajrating. '
            'Eng sodda misol: [{"title":"Kirish","contentMarkdown":"Word fayldagi matn..."}]. '
            'ID kiritish shart emas — tizim o‘zi yaratadi.'
        ),
    )
    attachments = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 6}),
        help_text=(
            'Choose file orqali yuklangan fayl avtomatik qo‘shiladi. Qo‘lda link kerak bo‘lsa: '
            '[{"name":"1-MAVZU.docx","type":"docx","size":"88 KB","downloadUrl":"https://..."}].'
        ),
    )

    class Meta:
        model = TheoryContent
        fields = '__all__'

    def clean_sections(self):
        sections = self.cleaned_data.get('sections') or []
        normalized = []
        for index, item in enumerate(sections, start=1):
            if not isinstance(item, dict):
                raise forms.ValidationError('Har bir bo‘lim JSON object bo‘lishi kerak.')
            row = dict(item)
            row.setdefault('id', f'section-{uuid4().hex[:10]}')
            row.setdefault('title', f'{index}-bo‘lim')
            row.setdefault('contentMarkdown', '')
            normalized.append(row)
        return normalized

    def clean_attachments(self):
        attachments = self.cleaned_data.get('attachments') or []
        normalized = []
        for item in attachments:
            if not isinstance(item, dict):
                raise forms.ValidationError('Har bir fayl JSON object bo‘lishi kerak.')
            row = dict(item)
            row.setdefault('id', f'file-{uuid4().hex[:10]}')
            row.setdefault('name', 'Material')
            row.setdefault('type', 'file')
            row.setdefault('size', '')
            row.setdefault('downloadUrl', '')
            normalized.append(row)
        return normalized


class PresentationAdminForm(forms.ModelForm):
    presentation_upload = forms.FileField(
        required=False,
        label='Presentation fayli — kompyuterdan yuklash',
        help_text='PDF yoki PPTX fayl tanlang. Fayl URL va hajmi avtomatik yoziladi.',
        widget=forms.ClearableFileInput(attrs={'accept': '.pdf,.ppt,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation'}),
    )
    slides = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 10}),
        help_text=(
            'PDF/PPTX fayl yuklasangiz bo‘sh [] qoldirish mumkin. '
            'Ichki slaydlar uchun: [{"slideNumber":1,"title":"...","bulletPoints":["..."]}]'
        ),
    )

    class Meta:
        model = Presentation
        fields = '__all__'

    def clean_presentation_upload(self):
        uploaded = self.cleaned_data.get('presentation_upload')
        if uploaded:
            ext = Path(uploaded.name).suffix.lower()
            if ext not in ('.pdf', '.ppt', '.pptx'):
                raise forms.ValidationError('Presentation uchun PDF yoki PPTX fayl tanlang.')
        return uploaded


class VideoAdminForm(forms.ModelForm):
    resource_upload = forms.FileField(
        required=False,
        label='Qo‘shimcha resurs fayli',
        help_text='Video uchun konspekt, PDF, DOCX yoki boshqa kichik resurs faylini yuklash mumkin.',
    )
    resources = forms.JSONField(
        required=False,
        widget=PrettyJSONWidget(attrs={'rows': 6}),
        help_text='Choose file orqali yuklangan resurs avtomatik qo‘shiladi. Qo‘shimcha resurs bo‘lmasa [] qoldiring.',
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
    form = CourseAdminForm
    list_display = ('code', 'title', 'teacher', 'category', 'level', 'status', 'updated_at')
    list_filter = ('status', 'category', 'level')
    search_fields = ('code', 'title', 'description', 'teacher__email', 'teacher__first_name', 'teacher__last_name')
    autocomplete_fields = ('teacher',)
    list_editable = ('status',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Asosiy ma’lumot', {'fields': ('code', 'title', 'description', 'teacher', 'status')}),
        ('Katalog', {'fields': ('category', 'level', 'estimated_study_hours', 'tags', 'cover_upload', 'cover_image')}),
        ('Tizim', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
    inlines = [ModuleInline]

    def save_model(self, request, obj, form, change):
        uploaded = form.cleaned_data.get('cover_upload')
        if uploaded:
            stored = upload_admin_file(uploaded, folder=f'courses/{obj.code or "course"}/covers')
            obj.cover_image = stored['url']
        super().save_model(request, obj, form, change)


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
        ('Material', {'fields': ('module', 'title', 'lesson_type', 'description')}),
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
    list_display = ('lesson', 'material_type', 'reading_time_minutes')
    list_filter = ('lesson__lesson_type', 'lesson__module__course')
    search_fields = ('lesson__title', 'lesson__module__course__title', 'summary')
    autocomplete_fields = ('lesson',)
    fieldsets = (
        ('Qaysi darsga', {'fields': ('lesson',)}),
        ('Matnli material', {'fields': ('reading_time_minutes', 'summary', 'sections')}),
        ('Fayl yuklash', {'fields': ('material_upload',)}),
        ('Biriktirilgan fayllar / qo‘lda linklar', {'fields': ('attachments',), 'classes': ('collapse',)}),
    )

    @admin.display(description='Turi')
    def material_type(self, obj):
        return obj.lesson.get_lesson_type_display()

    def save_model(self, request, obj, form, change):
        uploaded = form.cleaned_data.get('material_upload')
        if uploaded:
            course_code = obj.lesson.module.course.code
            stored = upload_admin_file(uploaded, folder=f'courses/{course_code}/materials')
            attachments = list(obj.attachments or [])
            attachments.append({
                'id': f'file-{uuid4().hex[:10]}',
                'name': stored['name'],
                'type': stored['extension'],
                'size': stored['sizeLabel'],
                'downloadUrl': stored['url'],
            })
            obj.attachments = attachments
        super().save_model(request, obj, form, change)


@admin.register(Presentation)
class PresentationAdmin(admin.ModelAdmin):
    form = PresentationAdminForm
    list_display = ('title', 'lesson', 'file_type', 'uploaded_at')
    list_filter = ('file_type', 'lesson__module__course')
    search_fields = ('title', 'lesson__title', 'lesson__module__course__title')
    autocomplete_fields = ('lesson',)
    fieldsets = (
        ('Taqdimot', {'fields': ('lesson', 'title', 'file_type')}),
        ('Kompyuterdan yuklash', {'fields': ('presentation_upload',)}),
        ('Fayl URLlari', {'fields': ('file_url', 'embed_url', 'file_size'), 'classes': ('collapse',)}),
        ('Ichki slaydlar', {'fields': ('slides',), 'classes': ('collapse',)}),
        ('Tizim', {'fields': ('uploaded_at',), 'classes': ('collapse',)}),
    )

    def save_model(self, request, obj, form, change):
        uploaded = form.cleaned_data.get('presentation_upload')
        if uploaded:
            course_code = obj.lesson.module.course.code
            stored = upload_admin_file(uploaded, folder=f'courses/{course_code}/presentations')
            ext = Path(uploaded.name).suffix.lower()
            obj.file_type = 'pdf' if ext == '.pdf' else 'pptx'
            obj.file_url = stored['url']
            obj.file_size = stored['sizeLabel']
            obj.embed_url = stored['url'] if obj.file_type == 'pdf' else ''
        super().save_model(request, obj, form, change)


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
        ('Resurs faylini yuklash', {'fields': ('resource_upload',)}),
        ('Qo‘shimcha resurslar', {'fields': ('resources',), 'classes': ('collapse',)}),
    )

    def save_model(self, request, obj, form, change):
        uploaded = form.cleaned_data.get('resource_upload')
        if uploaded:
            course_code = obj.lesson.module.course.code
            stored = upload_admin_file(uploaded, folder=f'courses/{course_code}/video-resources')
            resources = list(obj.resources or [])
            resources.append({
                'id': f'resource-{uuid4().hex[:10]}',
                'title': stored['name'],
                'fileType': stored['extension'],
                'fileSize': stored['sizeLabel'],
                'downloadUrl': stored['url'],
            })
            obj.resources = resources
        super().save_model(request, obj, form, change)


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
