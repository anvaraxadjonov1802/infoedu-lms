import django.db.models.deletion
from django.db import migrations, models
import lms.models


class Migration(migrations.Migration):
    dependencies = [
        ('lms', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='course',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=64, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='module',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=64, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='lesson',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=64, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='theorycontent',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=64, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='presentation',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=64, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='video',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=64, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='test',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=64, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='question',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=64, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='notification',
            name='id',
            field=models.CharField(default=lms.models.generate_content_id, editable=False, max_length=80, primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='enrollment',
            name='student',
            field=models.ForeignKey(limit_choices_to={'role': 'student'}, on_delete=django.db.models.deletion.CASCADE, related_name='enrollments', to='lms.user'),
        ),
        migrations.AlterField(
            model_name='theorycontent',
            name='lesson',
            field=models.OneToOneField(limit_choices_to={'lesson_type': 'theory'}, on_delete=django.db.models.deletion.CASCADE, related_name='theory_content', to='lms.lesson'),
        ),
        migrations.AlterField(
            model_name='presentation',
            name='lesson',
            field=models.OneToOneField(limit_choices_to={'lesson_type': 'presentation'}, on_delete=django.db.models.deletion.CASCADE, related_name='presentation_content', to='lms.lesson'),
        ),
        migrations.AlterField(
            model_name='video',
            name='lesson',
            field=models.OneToOneField(limit_choices_to={'lesson_type': 'video'}, on_delete=django.db.models.deletion.CASCADE, related_name='video_content', to='lms.lesson'),
        ),
        migrations.AlterField(
            model_name='test',
            name='lesson',
            field=models.OneToOneField(limit_choices_to={'lesson_type': 'test'}, on_delete=django.db.models.deletion.CASCADE, related_name='test_content', to='lms.lesson'),
        ),
    ]
