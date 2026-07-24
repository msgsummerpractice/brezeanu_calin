from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from .models import UserProfile
from .serializers import LoginSerializer, ChangePasswordSerializer, AdminUserSerializer, AdminUserUpdateSerializer, CreateColleagueSerializer
from .services import generate_password, create_colleague_account


class LoginThrottle(AnonRateThrottle):
    rate = '5/minute'


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)
        profile = UserProfile.objects.filter(user=user).first()
        must_change = profile.must_change_password if profile else False

        return Response({
            'token': token.key,
            'must_change_password': must_change,
            'user': {
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
            },
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': ['Incorrect password.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        profile = UserProfile.objects.filter(user=user).first()
        if profile:
            profile.must_change_password = False
            profile.save()

        Token.objects.filter(user=user).delete()
        new_token = Token.objects.create(user=user)

        return Response({
            'detail': 'Password changed successfully.',
            'token': new_token.key,
        })


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.filter(user=request.user).first()
        return Response({
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
            'must_change_password': profile.must_change_password if profile else False,
        })


def _get_user_role(user):
    if user.is_superuser:
        return 'Admin'
    elif user.is_staff:
        return 'Agent'
    return 'User'


class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.annotate(
            assigned_case_count=Count('assigned_cases')
        ).order_by('id')

        data = []
        for user in users:
            data.append({
                'id': user.id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'role': _get_user_role(user),
                'assigned_case_count': user.assigned_case_count,
            })

        return Response(data)

    def post(self, request):
        serializer = CreateColleagueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # Check email uniqueness
        if User.objects.filter(email=data['email']).exists():
            return Response(
                {'email': ['A user with this email already exists.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user, password = create_colleague_account(
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data['email'],
            role=data['role'],
        )

        return Response({
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'role': _get_user_role(user),
            'generated_password': password,
        }, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        try:
            user = User.objects.annotate(
                assigned_case_count=Count('assigned_cases')
            ).get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminUserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # Check email uniqueness
        if User.objects.filter(email=data['email']).exclude(pk=pk).exists():
            return Response(
                {'email': ['A user with this email already exists.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.first_name = data['first_name']
        user.last_name = data['last_name']
        user.email = data['email']
        user.username = data['email']

        # Set role flags
        role = data['role']
        if role == 'Admin':
            user.is_superuser = True
            user.is_staff = True
        elif role == 'Agent':
            user.is_superuser = False
            user.is_staff = True
        else:
            user.is_superuser = False
            user.is_staff = False

        # Password reset
        if data.get('reset_password'):
            new_password = generate_password()
            user.set_password(new_password)
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.must_change_password = True
            profile.save()

            # Log password for dev (in production would send email)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Password reset for {user.email}: {new_password}")
        else:
            user.save()

        return Response({
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'role': _get_user_role(user),
            'assigned_case_count': user.assigned_case_count,
        })

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.is_superuser:
            return Response(
                {'detail': 'Admin users cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
