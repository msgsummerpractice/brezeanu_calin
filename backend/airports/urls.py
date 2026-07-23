from django.urls import path
from .views import AirportListView

urlpatterns = [
    path('airports/', AirportListView.as_view(), name='airport-list'),
]
