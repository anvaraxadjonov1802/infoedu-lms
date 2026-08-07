from rest_framework import serializers
from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    fullName = serializers.SerializerMethodField()
    studentId = serializers.CharField(source='student_id', required=False, allow_blank=True)
    group = serializers.CharField(source='group_name', required=False, allow_blank=True)
    avatarUrl = serializers.URLField(source='avatar_url', required=False, allow_blank=True)
    registrationDate = serializers.SerializerMethodField()
    overallProgress = serializers.IntegerField(read_only=True, default=0)
    completedLessonsCount = serializers.IntegerField(read_only=True, default=0)
    totalLessonsCount = serializers.IntegerField(read_only=True, default=0)
    averageScore = serializers.IntegerField(read_only=True, default=0)
    studyStreakDays = serializers.IntegerField(source='study_streak_days', read_only=True)
    longestStreakDays = serializers.IntegerField(source='longest_streak_days', read_only=True)
    totalStudyMinutes = serializers.IntegerField(source='total_study_minutes', read_only=True)
    activeCoursesCount = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            'id', 'fullName', 'studentId', 'email', 'phone', 'university', 'faculty', 'group',
            'role', 'avatarUrl', 'registrationDate', 'overallProgress', 'completedLessonsCount',
            'totalLessonsCount', 'averageScore', 'studyStreakDays', 'longestStreakDays',
            'totalStudyMinutes', 'activeCoursesCount',
        ]
        read_only_fields = ['id', 'email', 'role', 'registrationDate']

    def get_fullName(self, obj):
        return obj.get_full_name() or obj.username or obj.email

    def get_registrationDate(self, obj):
        return obj.date_joined.date().isoformat() if obj.date_joined else ''

    def update(self, instance, validated_data):
        full_name = self.initial_data.get('fullName')
        if full_name:
            parts = full_name.strip().split(maxsplit=1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''
        return super().update(instance, validated_data)
