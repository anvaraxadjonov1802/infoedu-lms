from django.urls import path
from .registration import RegisterView
from .views import (
    AdminAnnouncementView,
    AdminStatsView,
    ChangePasswordView,
    BootstrapView,
    DemoLoginView,
    LessonCompleteView,
    LoginView,
    LogoutView,
    MeView,
    NotificationReadAllView,
    NotificationReadView,
    TestSubmitView,
    TheoryProgressView,
    VideoProgressView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/logout/', LogoutView.as_view()),
    path('auth/demo-login/', DemoLoginView.as_view()),
    path('auth/me/', MeView.as_view()),
    path('auth/change-password/', ChangePasswordView.as_view()),
    path('bootstrap/', BootstrapView.as_view()),
    path('lessons/<str:lesson_id>/complete/', LessonCompleteView.as_view()),
    path('theory/<str:theory_id>/progress/', TheoryProgressView.as_view()),
    path('videos/<str:video_id>/progress/', VideoProgressView.as_view()),
    path('tests/<str:test_id>/submit/', TestSubmitView.as_view()),
    path('notifications/<str:notification_id>/read/', NotificationReadView.as_view()),
    path('notifications/read-all/', NotificationReadAllView.as_view()),
    path('admin/stats/', AdminStatsView.as_view()),
    path('admin/announcements/', AdminAnnouncementView.as_view()),
]
