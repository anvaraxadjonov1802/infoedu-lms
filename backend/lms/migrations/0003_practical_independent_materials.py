from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('lms', '0002_admin_content_ids'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lesson',
            name='lesson_type',
            field=models.CharField(
                choices=[
                    ('theory', 'Nazariya'),
                    ('practical', 'Amaliy ish'),
                    ('independent', 'Mustaqil ish'),
                    ('presentation', 'Taqdimot'),
                    ('video', 'Video'),
                    ('test', 'Test'),
                ],
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name='theorycontent',
            name='lesson',
            field=models.OneToOneField(
                limit_choices_to={'lesson_type__in': ['theory', 'practical', 'independent']},
                on_delete=models.deletion.CASCADE,
                related_name='theory_content',
                to='lms.lesson',
            ),
        ),
        migrations.AlterModelOptions(
            name='theorycontent',
            options={'verbose_name': 'Matnli material', 'verbose_name_plural': 'Matnli materiallar'},
        ),
    ]
