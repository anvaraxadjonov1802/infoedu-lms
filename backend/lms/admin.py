from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Course, Enrollment, Lesson, LessonProgress, Module, Notification, Presentation,
    Question, Test, TestAnswer, TestAttempt, TheoryContent, User, Video,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + ((
        'InfoEdu',
        {'fields': ('role', 'student_id', 'phone', 'university', 'faculty', 'group_name', 'avatar_url', 'title', 'department', 'study_streak_days', 'longest_streak_days', 'total_study_minutes')},
    ),)
    add_fieldsets = UserAdmin.add_fieldsets + ((
        'InfoEdu',
        {'fields': ('email', 'role', 'student_id')},
    ),)
    list_display = ('email', 'first_name', 'last_name', 'role', 'group_name', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name', 'student_id', 'group_name')


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'teacher', 'status', 'updated_at')
    list_filter = ('status', 'category')
    search_fields = ('code', 'title')
    inlines = [ModuleInline]


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order')
    list_filter = ('course',)
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'lesson_type', 'order', 'is_published')
    list_filter = ('lesson_type', 'is_published', 'module__course')
    search_fields = ('title',)


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ('title', 'lesson', 'time_limit_minutes', 'attempts_allowed', 'passing_score_percent')


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'test', 'question_type', 'points', 'order')
    list_filter = ('test', 'question_type')


admin.site.register(Enrollment)
admin.site.register(TheoryContent)
admin.site.register(Presentation)
admin.site.register(Video)
admin.site.register(LessonProgress)
admin.site.register(TestAttempt)
admin.site.register(TestAnswer)
admin.site.register(Notification)
