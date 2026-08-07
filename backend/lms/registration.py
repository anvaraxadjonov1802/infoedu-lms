from uuid import uuid4

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User


class RegisterView(APIView):
    """Public registration endpoint. Public users can only create student accounts."""

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        first_name = str(request.data.get('firstName', '')).strip()
        last_name = str(request.data.get('lastName', '')).strip()
        email = str(request.data.get('email', '')).strip().lower()
        phone = str(request.data.get('phone', '')).strip()
        university = str(request.data.get('university', '')).strip()
        faculty = str(request.data.get('faculty', '')).strip()
        group_name = str(request.data.get('groupName', '')).strip()
        student_id = str(request.data.get('studentId', '')).strip()
        password = str(request.data.get('password', ''))
        password_confirm = str(request.data.get('passwordConfirm', ''))

        missing = []
        if not first_name:
            missing.append('firstName')
        if not last_name:
            missing.append('lastName')
        if not email:
            missing.append('email')
        if not password:
            missing.append('password')
        if not password_confirm:
            missing.append('passwordConfirm')
        if missing:
            return Response(
                {'detail': 'Ism, familiya, email va parol maydonlarini to‘liq kiriting.', 'fields': missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(email)
        except ValidationError:
            return Response({'detail': 'Email manzili noto‘g‘ri formatda.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'detail': 'Bu email bilan foydalanuvchi allaqachon ro‘yxatdan o‘tgan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != password_confirm:
            return Response({'detail': 'Parollar bir xil emas.'}, status=status.HTTP_400_BAD_REQUEST)

        candidate = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role='student',
            phone=phone,
            university=university,
            faculty=faculty,
            group_name=group_name,
            student_id=student_id,
        )
        try:
            validate_password(password, user=candidate)
        except ValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=f'student-{uuid4().hex[:16]}',
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='student',
            phone=phone,
            university=university,
            faculty=faculty,
            group_name=group_name,
            student_id=student_id,
            is_active=True,
        )

        return Response(
            {
                'detail': 'Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi.',
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'firstName': user.first_name,
                    'lastName': user.last_name,
                    'role': user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )
