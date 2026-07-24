from django.urls import path
from .views import CaseCreateView, AdminCaseListView, AdminCaseDeleteView

urlpatterns = [
    path('cases/', CaseCreateView.as_view(), name='case-create'),
    path('admin/cases/', AdminCaseListView.as_view(), name='admin-case-list'),
    path('admin/cases/<uuid:pk>/', AdminCaseDeleteView.as_view(), name='admin-case-delete'),
]
