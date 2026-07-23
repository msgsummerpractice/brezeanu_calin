from django.urls import path
from .views import AirportListView, AirportDistanceView

urlpatterns = [
    path('airports/', AirportListView.as_view(), name='airport-list'),
    path('airports/distance/', AirportDistanceView.as_view(), name='airport-distance'),
]
