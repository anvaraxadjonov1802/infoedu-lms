from django.conf import settings
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserProfileSerializer


def lightweight_token_payload(user):
    """Return auth data without calculating course/test statistics twice.

    The frontend immediately requests the lean /bootstrap/ endpoint after login,
    which supplies authoritative progress/statistics. Login only needs identity
    fields so it can transition into the authenticated shell quickly.
    """
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': UserProfileSerializer(user).data,
    }


class FastLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        password = str(request.data.get('password', ''))
        user = authenticate(request, username=email, password=password)
        if not user or not user.is_active:
            return Response(
                {'detail': 'Email yoki parol noto‘g‘ri.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(lightweight_token_payload(user))


class FastDemoLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.DEMO_MODE:
            return Response({'detail': 'Demo rejim o‘chirilgan.'}, status=status.HTTP_404_NOT_FOUND)
        role = request.data.get('role', 'student')
        email_map = {
            'student': 'anvar.axadjonov@tuit.uz',
            'teacher': 'j.karimov@tuit.uz',
            'admin': 'admin@infoedu.uz',
        }
        user = get_object_or_404(User, email=email_map.get(role, email_map['student']))
        return Response(lightweight_token_payload(user))
