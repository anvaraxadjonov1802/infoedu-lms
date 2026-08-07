from django.test import TestCase
from rest_framework.test import APIClient

from .models import User


class RegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.payload = {
            'firstName': 'Test',
            'lastName': 'Student',
            'email': 'new.student@example.com',
            'phone': '+998901234567',
            'university': 'InfoEdu University',
            'faculty': 'Software Engineering',
            'groupName': 'SE-101',
            'studentId': 'SE-101-001',
            'password': 'J7!mQ2#vL9@x',
            'passwordConfirm': 'J7!mQ2#vL9@x',
        }

    def test_public_user_can_register_student(self):
        response = self.client.post('/api/auth/register/', self.payload, format='json')
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='new.student@example.com')
        self.assertEqual(user.role, 'student')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.group_name, 'SE-101')
        self.assertTrue(user.check_password('J7!mQ2#vL9@x'))

    def test_registration_never_allows_role_escalation(self):
        payload = {**self.payload, 'role': 'admin'}
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.get(email='new.student@example.com').role, 'student')

    def test_duplicate_email_is_rejected_case_insensitively(self):
        User.objects.create_user(
            username='existing-user',
            email='new.student@example.com',
            password='J7!mQ2#vL9@x',
            role='student',
        )
        payload = {**self.payload, 'email': 'NEW.STUDENT@example.com'}
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_password_confirmation_must_match(self):
        payload = {**self.payload, 'passwordConfirm': 'DifferentPass2026!'}
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='new.student@example.com').exists())
