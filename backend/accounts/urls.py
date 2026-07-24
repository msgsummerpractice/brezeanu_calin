from django.urls import path
from .views import LoginView, ChangePasswordView, MeView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
]
