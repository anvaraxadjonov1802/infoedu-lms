from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from .models import User
from .storage import _headers, _safe_filename, format_file_size


class LMSApiSmokeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_demo', verbosity=0)

    def setUp(self):
        self.client = APIClient()
        response = self.client.post('/api/auth/login/', {
            'email': 'anvar.axadjonov@tuit.uz',
            'password': 'InfoEdu2026!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_bootstrap_masks_test_answers(self):
        response = self.client.get('/api/bootstrap/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('courses', response.data)
        self.assertTrue(response.data['courses'])
        first_test = response.data['tests']['test-101']
        question = first_test['questions'][0]
        self.assertEqual(question.get('explanation'), '')
        self.assertNotIn('correctAnswer', question)

    def test_server_scores_attempt(self):
        response = self.client.post('/api/tests/test-101/submit/', {
            'answers': {
                'q-101-1': 'a',
                'q-101-2': 'b',
                'q-101-3': True,
            },
            'flaggedQuestionIds': [],
            'timeSpentSeconds': 95,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['percentage'], 100)
        self.assertTrue(response.data['isPassed'])
        self.assertEqual(len(response.data['answerReviews']), 3)

    def test_unenrolled_student_cannot_update_video(self):
        outsider = User.objects.create_user(
            username='outsider',
            email='outsider@example.com',
            password='SecurePass2026!',
            role='student',
        )
        self.client.force_authenticate(user=outsider)
        response = self.client.patch('/api/videos/vid-101/progress/', {
            'seconds': 120,
            'percentage': 50,
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_student_cannot_access_admin_stats(self):
        response = self.client.get('/api/admin/stats/')
        self.assertEqual(response.status_code, 403)


class SupabaseStorageUnitTests(TestCase):
    def test_modern_secret_key_is_only_api_key_header(self):
        headers = _headers('sb_secret_example')
        self.assertEqual(headers['apikey'], 'sb_secret_example')
        self.assertNotIn('Authorization', headers)

    def test_legacy_service_role_key_can_be_bearer(self):
        headers = _headers('eyJlegacy-service-role')
        self.assertEqual(headers['apikey'], 'eyJlegacy-service-role')
        self.assertEqual(headers['Authorization'], 'Bearer eyJlegacy-service-role')

    def test_uploaded_filename_is_sanitized_and_unique(self):
        safe = _safe_filename('1-MAVZU O‘zbekcha (final).docx')
        self.assertTrue(safe.endswith('.docx'))
        self.assertNotIn(' ', safe)
        self.assertNotIn('‘', safe)

    def test_file_size_label(self):
        self.assertEqual(format_file_size(1024), '1.0 KB')
