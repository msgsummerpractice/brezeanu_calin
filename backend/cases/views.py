import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.throttling import AnonRateThrottle
from .models import Case
from .serializers import CaseCreateSerializer, CaseResponseSerializer
from .validators import validate_file_size, validate_file_type


class CaseCreationThrottle(AnonRateThrottle):
    rate = '10/hour'


class CaseCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CaseCreationThrottle]

    def post(self, request):
        # Parse JSON data from 'data' field
        raw_data = request.data.get('data')
        if not raw_data:
            return Response(
                {'data': ['This field is required.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
        except (json.JSONDecodeError, TypeError):
            return Response(
                {'data': ['Invalid JSON.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate files
        boarding_pass = request.FILES.get('boarding_pass')
        identity_document = request.FILES.get('identity_document')

        file_errors = []
        if not boarding_pass:
            file_errors.append('Boarding pass is required.')
        if not identity_document:
            file_errors.append('Identity document (ID card or passport) is required.')

        if file_errors:
            return Response(
                {'documents': file_errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size and type
        for file_field, label in [(boarding_pass, 'Boarding pass'), (identity_document, 'Identity document')]:
            try:
                validate_file_size(file_field)
                validate_file_type(file_field)
            except Exception as e:
                return Response(
                    {'documents': [f'{label}: {str(e)}']},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Validate and create case
        serializer = CaseCreateSerializer(
            data=data,
            context={
                'request': request,
                'files': {
                    'boarding_pass': boarding_pass,
                    'identity_document': identity_document,
                },
            },
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        case = serializer.save()

        # Create user account for passenger
        user_created = False
        try:
            from accounts.services import create_user_account
            _, user_created = create_user_account(case.passenger)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to create user account: {e}")

        response_serializer = CaseResponseSerializer(case)
        response_data = response_serializer.data
        response_data['user_created'] = user_created
        return Response(response_data, status=status.HTTP_201_CREATED)


class AdminCaseListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        cases = Case.objects.prefetch_related('flights').all()
        data = []
        for case in cases:
            first_flight = case.flights.first()
            data.append({
                'id': str(case.id),
                'case_date': case.created_at.strftime('%Y-%m-%d'),
                'flight_number': first_flight.flight_number if first_flight else '',
                'flight_date': first_flight.flight_date.strftime('%Y-%m-%d') if first_flight else '',
                'status': case.status,
            })
        return Response(data)


class AdminCaseDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({'detail': 'Case not found.'}, status=status.HTTP_404_NOT_FOUND)

        case.delete()
        return Response({'detail': 'Case deleted successfully.'}, status=status.HTTP_200_OK)
