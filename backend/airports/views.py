from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Airport
from .serializers import AirportSerializer


class AirportListView(generics.ListAPIView):
    serializer_class = AirportSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Airport.objects.all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(iata_code__icontains=search) |
                Q(name__icontains=search) |
                Q(city__icontains=search)
            )
        return queryset[:20]
