from django.urls import path
from .views import LoginView, ChangePasswordView, MeView, AdminUserListView, AdminUserDetailView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
]
