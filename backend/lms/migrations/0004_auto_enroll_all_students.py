from django.db import migrations


def backfill_enrollments(apps, schema_editor):
    User = apps.get_model('lms', 'User')
    Course = apps.get_model('lms', 'Course')
    Enrollment = apps.get_model('lms', 'Enrollment')

    student_ids = list(
        User.objects.filter(role='student', is_active=True).values_list('id', flat=True)
    )
    course_ids = list(
        Course.objects.filter(status='published').values_list('id', flat=True)
    )

    Enrollment.objects.bulk_create(
        [
            Enrollment(student_id=student_id, course_id=course_id)
            for student_id in student_ids
            for course_id in course_ids
        ],
        ignore_conflicts=True,
        batch_size=1000,
    )


class Migration(migrations.Migration):
    dependencies = [
        ('lms', '0003_practical_independent_materials'),
    ]

    operations = [
        migrations.RunPython(backfill_enrollments, migrations.RunPython.noop),
    ]
