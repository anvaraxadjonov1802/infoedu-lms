from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Course, Enrollment, User


@receiver(post_save, sender=User)
def auto_enroll_student(sender, instance, **kwargs):
    """Every student automatically gets access to all published courses."""
    if instance.role != 'student' or not instance.is_active:
        return

    published_course_ids = Course.objects.filter(status='published').values_list('id', flat=True)
    Enrollment.objects.bulk_create(
        [Enrollment(student=instance, course_id=course_id) for course_id in published_course_ids],
        ignore_conflicts=True,
    )


@receiver(post_save, sender=Course)
def auto_enroll_published_course(sender, instance, **kwargs):
    """When a course is published, make it available to every active student."""
    if instance.status != 'published':
        return

    student_ids = User.objects.filter(role='student', is_active=True).values_list('id', flat=True)
    Enrollment.objects.bulk_create(
        [Enrollment(student_id=student_id, course=instance) for student_id in student_ids],
        ignore_conflicts=True,
    )
