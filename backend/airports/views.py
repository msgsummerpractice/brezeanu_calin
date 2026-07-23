import math
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
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


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate great-circle distance between two points in km."""
    R = 6371.0
    lat1_rad = math.radians(float(lat1))
    lat2_rad = math.radians(float(lat2))
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_compensation(distance_km):
    """Determine EU261 compensation based on distance."""
    if distance_km < 1500:
        return 250
    elif distance_km <= 3500:
        return 400
    else:
        return 600


class AirportDistanceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from_code = request.query_params.get('from', '').strip().upper()
        to_code = request.query_params.get('to', '').strip().upper()

        if not from_code or not to_code:
            return Response(
                {'error': 'Both "from" and "to" query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from_airport = Airport.objects.get(iata_code=from_code)
        except Airport.DoesNotExist:
            return Response(
                {'error': f'Airport "{from_code}" not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            to_airport = Airport.objects.get(iata_code=to_code)
        except Airport.DoesNotExist:
            return Response(
                {'error': f'Airport "{to_code}" not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if from_airport.latitude is None or from_airport.longitude is None:
            return Response(
                {'error': f'Airport "{from_code}" is missing coordinate data.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if to_airport.latitude is None or to_airport.longitude is None:
            return Response(
                {'error': f'Airport "{to_code}" is missing coordinate data.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        distance_km = haversine_distance(
            from_airport.latitude, from_airport.longitude,
            to_airport.latitude, to_airport.longitude,
        )
        compensation = calculate_compensation(distance_km)

        return Response({
            'from_airport': from_code,
            'to_airport': to_code,
            'distance_km': round(distance_km, 2),
            'compensation_amount': compensation,
            'source': 'haversine',
        })
