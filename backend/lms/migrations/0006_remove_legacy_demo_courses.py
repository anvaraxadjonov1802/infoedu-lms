from django.db import migrations


def remove_legacy_demo_data(apps, schema_editor):
    Course = apps.get_model('lms', 'Course')
    Notification = apps.get_model('lms', 'Notification')

    # These records were created by the old seed_demo/seed_deploy flow.
    # Keep real imported courses such as DAST-101 untouched.
    Course.objects.filter(code__in=['SE-301', 'DB-202', 'WEB-303']).delete()
    Course.objects.filter(id__in=['course-1', 'course-2', 'course-3']).delete()
    Notification.objects.filter(id__in=['notif-1', 'notif-2', 'notif-3']).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('lms', '0005_alter_user_options_alter_user_groups'),
    ]

    operations = [
        migrations.RunPython(remove_legacy_demo_data, migrations.RunPython.noop),
    ]
