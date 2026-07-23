import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
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
        response_serializer = CaseResponseSerializer(case)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
