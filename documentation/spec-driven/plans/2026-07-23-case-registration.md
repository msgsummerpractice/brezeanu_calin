# CASE_01 – Case Registration Implementation Plan

> **Execution:** Use subagent-driven development to implement this plan task-by-task.

**Goal:** Implement the public case registration wizard allowing passengers to submit flight compensation claims.

**Architecture:** Django REST Framework backend with a single atomic case-creation endpoint and airport lookup. React TypeScript frontend with a multi-step wizard form. PostgreSQL with BLOB document storage.

**Tech Stack:** Django 5.x, Django REST Framework, React 18, TypeScript, Vite, PostgreSQL

**Design Spec:** `documentation/spec-driven/specs/2026-07-23-case-registration-design.md`

---

## File Structure

### Backend

| File | Responsibility |
|------|---------------|
| `backend/manage.py` | Django management entry point |
| `backend/config/__init__.py` | Package marker |
| `backend/config/settings.py` | Django settings (DB, apps, DRF, CORS, throttling) |
| `backend/config/urls.py` | Root URL routing |
| `backend/config/wsgi.py` | WSGI entry point |
| `backend/airports/__init__.py` | Package marker |
| `backend/airports/models.py` | Airport model |
| `backend/airports/serializers.py` | Airport serializer |
| `backend/airports/views.py` | Airport list/search view |
| `backend/airports/urls.py` | Airport URL routing |
| `backend/cases/__init__.py` | Package marker |
| `backend/cases/models.py` | Case, Passenger, Flight, Document, GdprConsent models |
| `backend/cases/validators.py` | File validation (magic bytes, size), phone regex, flight number regex |
| `backend/cases/serializers.py` | Nested case creation serializer |
| `backend/cases/views.py` | Case creation view |
| `backend/cases/urls.py` | Case URL routing |
| `backend/cases/management/__init__.py` | Package marker |
| `backend/cases/management/commands/__init__.py` | Package marker |
| `backend/cases/management/commands/sync_airports.py` | Airport sync management command |
| `backend/requirements.txt` | Python dependencies |

### Frontend

| File | Responsibility |
|------|---------------|
| `frontend/package.json` | Node dependencies and scripts |
| `frontend/tsconfig.json` | TypeScript configuration |
| `frontend/vite.config.ts` | Vite dev server + proxy config |
| `frontend/index.html` | HTML entry point |
| `frontend/src/main.tsx` | React DOM render entry |
| `frontend/src/App.tsx` | App shell, routes the wizard |
| `frontend/src/components/CaseWizard/types.ts` | TypeScript interfaces for form data |
| `frontend/src/components/CaseWizard/CaseWizard.tsx` | Wizard container, state, navigation |
| `frontend/src/components/CaseWizard/StepIndicator.tsx` | Visual step progress bar |
| `frontend/src/components/CaseWizard/steps/FlightItinerary.tsx` | Step 1: airports + connecting flights |
| `frontend/src/components/CaseWizard/steps/EmailGdpr.tsx` | Step 4: email + GDPR consent |
| `frontend/src/components/CaseWizard/steps/FlightDetails.tsx` | Step 5: flight date/number/airline per segment |
| `frontend/src/components/CaseWizard/steps/PassengerDetails.tsx` | Step 6: personal info + document uploads |
| `frontend/src/components/CaseWizard/steps/CaseGeneration.tsx` | Step 7: summary + submit |
| `frontend/src/services/api.ts` | API client functions |
| `frontend/src/utils/validation.ts` | Client-side validation rules |

---

## Task 1: Backend Project Setup & Configuration

**Files:**
- Create: `backend/manage.py`
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `backend/requirements.txt`

**Requirements:**
- Django 5.x project with PostgreSQL database configuration
- DRF installed with throttling (10/hour anonymous on case creation)
- CORS configured for `http://localhost:5173` (Vite dev server)
- Token authentication scaffolded but not enforced
- INSTALLED_APPS includes: airports, cases, rest_framework, corsheaders

**Implementation:**

`backend/requirements.txt`:
```
Django>=5.0,<6.0
djangorestframework>=3.14,<4.0
django-cors-headers>=4.0,<5.0
psycopg2-binary>=2.9,<3.0
requests>=2.31,<3.0
```

`backend/manage.py`:
```python
#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
```

`backend/config/__init__.py`:
```python
```

`backend/config/settings.py`:
```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production')

DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'airports',
    'cases',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'flight_compensation'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'case_creation': '10/hour',
    },
}

# CORS
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
]

# File upload limits
DATA_UPLOAD_MAX_MEMORY_SIZE = 15 * 1024 * 1024  # 15MB total (multiple files)
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB per file
```

`backend/config/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('airports.urls')),
    path('api/', include('cases.urls')),
]
```

`backend/config/wsgi.py`:
```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()
```

**Verification:**
- Run `cd backend && pip install -r requirements.txt`
- Run `python manage.py check` — should output "System check identified no issues."

---

## Task 2: Airport Model & API

**Files:**
- Create: `backend/airports/__init__.py`
- Create: `backend/airports/models.py`
- Create: `backend/airports/serializers.py`
- Create: `backend/airports/views.py`
- Create: `backend/airports/urls.py`

**Requirements:**
- Airport model with iata_code as primary key
- Search endpoint filtering by IATA code, name, or city (case-insensitive)
- Max 20 results per request
- Public access (no auth required)

**Implementation:**

`backend/airports/__init__.py`:
```python
```

`backend/airports/models.py`:
```python
from django.db import models


class Airport(models.Model):
    iata_code = models.CharField(max_length=3, primary_key=True)
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    country = models.CharField(max_length=255)

    class Meta:
        ordering = ['iata_code']

    def __str__(self):
        return f"{self.iata_code} - {self.name}"
```

`backend/airports/serializers.py`:
```python
from rest_framework import serializers
from .models import Airport


class AirportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airport
        fields = ['iata_code', 'name', 'city', 'country']
```

`backend/airports/views.py`:
```python
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
```

`backend/airports/urls.py`:
```python
from django.urls import path
from .views import AirportListView

urlpatterns = [
    path('airports/', AirportListView.as_view(), name='airport-list'),
]
```

**Verification:**
- Run `python manage.py makemigrations airports` — should create migration
- Run `python manage.py migrate`
- Run `python manage.py shell -c "from airports.models import Airport; Airport.objects.create(iata_code='AMS', name='Amsterdam Schiphol', city='Amsterdam', country='Netherlands'); print('OK')"`
- Start server and GET `http://localhost:8000/api/airports/?search=ams` — should return the airport

---

## Task 3: Airport Sync Management Command

**Files:**
- Create: `backend/cases/management/__init__.py`
- Create: `backend/cases/management/commands/__init__.py`
- Create: `backend/cases/management/commands/sync_airports.py`

**Requirements:**
- Fetches all airports from AirportGap API (paginated)
- Uses `update_or_create` for idempotent upserts
- Logs progress: total fetched, created, updated
- Handles API pagination (follows `next` page link)

**Implementation:**

`backend/cases/management/__init__.py`:
```python
```

`backend/cases/management/commands/__init__.py`:
```python
```

`backend/cases/management/commands/sync_airports.py`:
```python
import requests
from django.core.management.base import BaseCommand
from airports.models import Airport


class Command(BaseCommand):
    help = 'Sync airports from AirportGap API into the database'

    def handle(self, *args, **options):
        url = 'https://airportgap.com/api/airports'
        created_count = 0
        updated_count = 0
        total_fetched = 0

        while url:
            self.stdout.write(f'Fetching: {url}')
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            payload = response.json()

            airports_data = payload.get('data', [])
            for item in airports_data:
                attrs = item.get('attributes', {})
                iata = attrs.get('iata', '').strip()
                if not iata or len(iata) > 3:
                    continue

                _, created = Airport.objects.update_or_create(
                    iata_code=iata,
                    defaults={
                        'name': attrs.get('name', '')[:255],
                        'city': attrs.get('city', '')[:255],
                        'country': attrs.get('country', '')[:255],
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                total_fetched += 1

            # Follow pagination
            links = payload.get('links', {})
            url = links.get('next') if links.get('next') != url else None

        self.stdout.write(self.style.SUCCESS(
            f'Sync complete. Fetched: {total_fetched}, '
            f'Created: {created_count}, Updated: {updated_count}'
        ))
```

**Verification:**
- Run `python manage.py sync_airports`
- Should output progress and final counts
- Run `python manage.py shell -c "from airports.models import Airport; print(Airport.objects.count())"` — should show > 0

---

## Task 4: Case Models

**Files:**
- Create: `backend/cases/__init__.py`
- Create: `backend/cases/models.py`

**Requirements:**
- Case model with UUID primary key and status choices
- Passenger model (OneToOne with Case)
- Flight model (ForeignKey to Case and Airport)
- Document model with BinaryField for BLOB storage
- GdprConsent model (OneToOne with Case)

**Implementation:**

`backend/cases/__init__.py`:
```python
```

`backend/cases/models.py`:
```python
import uuid
from django.db import models


class CaseStatus(models.TextChoices):
    NEW = 'NEW', 'New'
    VALID = 'VALID', 'Valid'
    ASSIGNED = 'ASSIGNED', 'Assigned'
    INVALID = 'INVALID', 'Invalid'


class Case(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(
        max_length=10,
        choices=CaseStatus.choices,
        default=CaseStatus.NEW,
    )
    reservation_number = models.CharField(max_length=50)
    planned_departure_time = models.DateTimeField()
    planned_arrival_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Case {self.id} ({self.status})"


class Passenger(models.Model):
    case = models.OneToOneField(Case, on_delete=models.CASCADE, related_name='passenger')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    address = models.TextField()
    postal_code = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Flight(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='flights')
    flight_number = models.CharField(max_length=10)
    flight_date = models.DateField()
    airline = models.CharField(max_length=100)
    departure_airport = models.ForeignKey(
        'airports.Airport', on_delete=models.PROTECT, related_name='departures'
    )
    arrival_airport = models.ForeignKey(
        'airports.Airport', on_delete=models.PROTECT, related_name='arrivals'
    )
    is_connecting = models.BooleanField(default=False)
    is_problem_flight = models.BooleanField(default=False)
    sequence_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sequence_order']

    def __str__(self):
        return f"{self.flight_number} ({self.departure_airport_id} → {self.arrival_airport_id})"


class DocumentType(models.TextChoices):
    BOARDING_PASS = 'BOARDING_PASS', 'Boarding Pass'
    ID_CARD = 'ID_CARD', 'ID Card'
    PASSPORT = 'PASSPORT', 'Passport'


class Document(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    file_name = models.CharField(max_length=255)
    file_data = models.BinaryField()
    file_size = models.IntegerField()
    content_type = models.CharField(max_length=50)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.document_type}: {self.file_name}"


class GdprConsent(models.Model):
    case = models.OneToOneField(Case, on_delete=models.CASCADE, related_name='gdpr_consent')
    consented = models.BooleanField()
    consented_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"GDPR consent for Case {self.case_id}: {self.consented}"
```

**Verification:**
- Run `python manage.py makemigrations cases`
- Run `python manage.py migrate`
- Run `python manage.py shell -c "from cases.models import Case; print('Models loaded OK')"`

---

## Task 5: Case Validators

**Files:**
- Create: `backend/cases/validators.py`

**Requirements:**
- Phone number regex validation: `^\+?[0-9\s\-]{7,20}$`
- Flight number regex validation: `^[A-Z]{2,3}\d{1,4}$`
- File size validation (max 5MB)
- File content-type validation via magic bytes (PDF, JPEG, PNG)
- Date of birth must not be in the future

**Implementation:**

`backend/cases/validators.py`:
```python
import re
from datetime import date
from django.core.exceptions import ValidationError


PHONE_REGEX = re.compile(r'^\+?[0-9\s\-]{7,20}$')
FLIGHT_NUMBER_REGEX = re.compile(r'^[A-Z]{2,3}\d{1,4}$')

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

ALLOWED_CONTENT_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
}

# Magic bytes for file type detection
MAGIC_BYTES = {
    b'%PDF': 'application/pdf',
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG': 'image/png',
}


def validate_phone_number(value):
    if not PHONE_REGEX.match(value):
        raise ValidationError(
            'Enter a valid phone number (7-20 digits, optional + prefix).'
        )


def validate_flight_number(value):
    if not FLIGHT_NUMBER_REGEX.match(value):
        raise ValidationError(
            'Enter a valid flight number (e.g., KL1234 or UAE567).'
        )


def validate_date_of_birth(value):
    if value > date.today():
        raise ValidationError('Date of birth cannot be in the future.')


def validate_file_size(file):
    if file.size > MAX_FILE_SIZE:
        raise ValidationError(
            f'File size exceeds 5MB limit. Got {file.size} bytes.'
        )


def validate_file_type(file):
    # Check content type header
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError(
            f'Invalid file type: {file.content_type}. '
            f'Allowed: PDF, JPG, JPEG, PNG.'
        )

    # Check magic bytes
    file.seek(0)
    header = file.read(8)
    file.seek(0)

    detected_type = None
    for magic, content_type in MAGIC_BYTES.items():
        if header.startswith(magic):
            detected_type = content_type
            break

    if detected_type is None:
        raise ValidationError(
            'File content does not match an allowed type (PDF, JPG, PNG).'
        )

    if detected_type != file.content_type:
        raise ValidationError(
            'File extension does not match file content.'
        )
```

**Verification:**
- Run `python manage.py shell -c "from cases.validators import validate_phone_number; validate_phone_number('+31612345678'); print('OK')"`
- Run `python manage.py shell -c "from cases.validators import validate_phone_number; validate_phone_number('abc')"` — should raise ValidationError

---

## Task 6: Case Serializer & View

**Files:**
- Create: `backend/cases/serializers.py`
- Create: `backend/cases/views.py`
- Create: `backend/cases/urls.py`

**Requirements:**
- Nested serializer that validates the full case payload
- Accepts multipart/form-data with JSON `data` field + file fields
- Creates Case, Passenger, Flights, Documents, GdprConsent in a single transaction
- Returns case_id, status, created_at on success
- Returns field-level errors on validation failure
- Rate limited to 10/hour per IP

**Implementation:**

`backend/cases/serializers.py`:
```python
import json
from datetime import date
from rest_framework import serializers
from airports.models import Airport
from .models import Case, Passenger, Flight, Document, GdprConsent, DocumentType
from .validators import (
    validate_phone_number,
    validate_flight_number,
    validate_date_of_birth,
    validate_file_size,
    validate_file_type,
)


class ConnectingFlightSerializer(serializers.Serializer):
    departure_airport = serializers.CharField(max_length=3)
    arrival_airport = serializers.CharField(max_length=3)

    def validate_departure_airport(self, value):
        if not Airport.objects.filter(iata_code=value).exists():
            raise serializers.ValidationError(f'Airport {value} not found.')
        return value

    def validate_arrival_airport(self, value):
        if not Airport.objects.filter(iata_code=value).exists():
            raise serializers.ValidationError(f'Airport {value} not found.')
        return value


class FlightItinerarySerializer(serializers.Serializer):
    departure_airport = serializers.CharField(max_length=3)
    destination_airport = serializers.CharField(max_length=3)
    connecting_flights = ConnectingFlightSerializer(many=True, required=False, default=[])
    problem_flight_index = serializers.IntegerField(required=False, allow_null=True)

    def validate_departure_airport(self, value):
        if not Airport.objects.filter(iata_code=value).exists():
            raise serializers.ValidationError(f'Airport {value} not found.')
        return value

    def validate_destination_airport(self, value):
        if not Airport.objects.filter(iata_code=value).exists():
            raise serializers.ValidationError(f'Airport {value} not found.')
        return value

    def validate_connecting_flights(self, value):
        if len(value) > 4:
            raise serializers.ValidationError('Maximum 4 connecting flights allowed.')
        return value

    def validate(self, data):
        connecting = data.get('connecting_flights', [])
        problem_index = data.get('problem_flight_index')

        if connecting:
            if problem_index is None:
                raise serializers.ValidationError({
                    'problem_flight_index': 'Required when connecting flights exist.'
                })
            if problem_index < 0 or problem_index >= len(connecting):
                raise serializers.ValidationError({
                    'problem_flight_index': f'Must be between 0 and {len(connecting) - 1}.'
                })

        return data


class FlightSegmentSerializer(serializers.Serializer):
    flight_date = serializers.DateField()
    flight_number = serializers.CharField(max_length=10)
    airline = serializers.CharField(max_length=100)

    def validate_flight_number(self, value):
        validate_flight_number(value)
        return value


class FlightDetailsSerializer(serializers.Serializer):
    reservation_number = serializers.CharField(max_length=50)
    planned_departure_time = serializers.DateTimeField()
    planned_arrival_time = serializers.DateTimeField()
    flights = FlightSegmentSerializer(many=True)

    def validate_flights(self, value):
        if not value:
            raise serializers.ValidationError('At least one flight segment is required.')
        return value


class PassengerSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    date_of_birth = serializers.DateField()
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    address = serializers.CharField()
    postal_code = serializers.CharField(max_length=20)

    def validate_phone_number(self, value):
        validate_phone_number(value)
        return value

    def validate_date_of_birth(self, value):
        validate_date_of_birth(value)
        return value


class CaseCreateSerializer(serializers.Serializer):
    flight_itinerary = FlightItinerarySerializer()
    flight_details = FlightDetailsSerializer()
    passenger = PassengerSerializer()
    gdpr_consent = serializers.BooleanField()

    def validate_gdpr_consent(self, value):
        if not value:
            raise serializers.ValidationError('GDPR consent is required.')
        return value

    def validate(self, data):
        # Validate that number of flight segments matches itinerary
        itinerary = data['flight_itinerary']
        flights = data['flight_details']['flights']
        connecting = itinerary.get('connecting_flights', [])

        # Expected flight count: if connecting flights exist, one per connecting segment
        # If no connecting flights, expect 1 (direct flight)
        if connecting:
            expected_count = len(connecting)
        else:
            expected_count = 1

        if len(flights) != expected_count:
            raise serializers.ValidationError({
                'flight_details': {
                    'flights': f'Expected {expected_count} flight segment(s) based on itinerary.'
                }
            })

        return data

    def create(self, validated_data):
        from django.db import transaction

        files = self.context.get('files', {})
        itinerary = validated_data['flight_itinerary']
        flight_details = validated_data['flight_details']
        passenger_data = validated_data['passenger']
        connecting = itinerary.get('connecting_flights', [])
        problem_index = itinerary.get('problem_flight_index')

        with transaction.atomic():
            # Create Case
            case = Case.objects.create(
                reservation_number=flight_details['reservation_number'],
                planned_departure_time=flight_details['planned_departure_time'],
                planned_arrival_time=flight_details['planned_arrival_time'],
            )

            # Create Passenger
            Passenger.objects.create(case=case, **passenger_data)

            # Create Flights
            if connecting:
                for idx, (conn, segment) in enumerate(
                    zip(connecting, flight_details['flights'])
                ):
                    Flight.objects.create(
                        case=case,
                        flight_number=segment['flight_number'],
                        flight_date=segment['flight_date'],
                        airline=segment['airline'],
                        departure_airport_id=conn['departure_airport'],
                        arrival_airport_id=conn['arrival_airport'],
                        is_connecting=True,
                        is_problem_flight=(idx == problem_index),
                        sequence_order=idx,
                    )
            else:
                # Direct flight
                segment = flight_details['flights'][0]
                Flight.objects.create(
                    case=case,
                    flight_number=segment['flight_number'],
                    flight_date=segment['flight_date'],
                    airline=segment['airline'],
                    departure_airport_id=itinerary['departure_airport'],
                    arrival_airport_id=itinerary['destination_airport'],
                    is_connecting=False,
                    is_problem_flight=True,
                    sequence_order=0,
                )

            # Create Documents
            boarding_pass = files.get('boarding_pass')
            identity_document = files.get('identity_document')

            if boarding_pass:
                Document.objects.create(
                    case=case,
                    document_type=DocumentType.BOARDING_PASS,
                    file_name=boarding_pass.name,
                    file_data=boarding_pass.read(),
                    file_size=boarding_pass.size,
                    content_type=boarding_pass.content_type,
                )

            if identity_document:
                Document.objects.create(
                    case=case,
                    document_type=DocumentType.ID_CARD,
                    file_name=identity_document.name,
                    file_data=identity_document.read(),
                    file_size=identity_document.size,
                    content_type=identity_document.content_type,
                )

            # Create GDPR Consent
            GdprConsent.objects.create(
                case=case,
                consented=validated_data['gdpr_consent'],
            )

        return case


class CaseResponseSerializer(serializers.ModelSerializer):
    case_id = serializers.UUIDField(source='id')

    class Meta:
        model = Case
        fields = ['case_id', 'status', 'created_at']
```

`backend/cases/views.py`:
```python
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
```

`backend/cases/urls.py`:
```python
from django.urls import path
from .views import CaseCreateView

urlpatterns = [
    path('cases/', CaseCreateView.as_view(), name='case-create'),
]
```

**Verification:**
- Run `python manage.py check` — no errors
- Start server, POST to `/api/cases/` with valid multipart data — should return 201
- POST with missing fields — should return 400 with field-level errors

---

## Task 7: Frontend Project Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

**Requirements:**
- React 18 + TypeScript + Vite
- Proxy `/api` requests to Django backend at `localhost:8000`
- Minimal app shell rendering the CaseWizard component

**Implementation:**

`frontend/package.json`:
```json
{
  "name": "flight-compensation-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

`frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flight Compensation</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`frontend/src/App.tsx`:
```typescript
import { CaseWizard } from './components/CaseWizard/CaseWizard';

function App() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>Flight Compensation Claim</h1>
      <CaseWizard />
    </div>
  );
}

export default App;
```

**Verification:**
- Run `cd frontend && npm install && npm run dev`
- Open `http://localhost:5173` — should show the page title (CaseWizard not yet implemented)

---

## Task 8: Frontend Types & API Service

**Files:**
- Create: `frontend/src/components/CaseWizard/types.ts`
- Create: `frontend/src/services/api.ts`

**Requirements:**
- TypeScript interfaces for all form data
- API functions: searchAirports, submitCase
- Proper error handling and type safety

**Implementation:**

`frontend/src/components/CaseWizard/types.ts`:
```typescript
export interface ConnectingFlight {
  departure_airport: string;
  arrival_airport: string;
}

export interface FlightItineraryData {
  departure_airport: string;
  destination_airport: string;
  connecting_flights: ConnectingFlight[];
  problem_flight_index: number | null;
}

export interface FlightSegment {
  flight_date: string;
  flight_number: string;
  airline: string;
}

export interface FlightDetailsData {
  reservation_number: string;
  planned_departure_time: string;
  planned_arrival_time: string;
  flights: FlightSegment[];
}

export interface PassengerData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  address: string;
  postal_code: string;
}

export interface DocumentsData {
  boarding_pass: File | null;
  identity_document: File | null;
}

export interface EmailGdprData {
  email: string;
  gdpr_consent: boolean;
}

export interface CaseFormData {
  flightItinerary: FlightItineraryData;
  emailGdpr: EmailGdprData;
  flightDetails: FlightDetailsData;
  passenger: PassengerData;
  documents: DocumentsData;
}

export interface AirportOption {
  iata_code: string;
  name: string;
  city: string;
  country: string;
}

export interface CaseResponse {
  case_id: string;
  status: string;
  created_at: string;
}

export interface ValidationErrors {
  [key: string]: string[];
}

export const INITIAL_FORM_DATA: CaseFormData = {
  flightItinerary: {
    departure_airport: '',
    destination_airport: '',
    connecting_flights: [],
    problem_flight_index: null,
  },
  emailGdpr: {
    email: '',
    gdpr_consent: false,
  },
  flightDetails: {
    reservation_number: '',
    planned_departure_time: '',
    planned_arrival_time: '',
    flights: [],
  },
  passenger: {
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone_number: '',
    address: '',
    postal_code: '',
  },
  documents: {
    boarding_pass: null,
    identity_document: null,
  },
};
```

`frontend/src/services/api.ts`:
```typescript
import type { AirportOption, CaseFormData, CaseResponse } from '../components/CaseWizard/types';

export async function searchAirports(query: string): Promise<AirportOption[]> {
  if (!query || query.length < 2) return [];

  const response = await fetch(`/api/airports/?search=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch airports');
  }
  return response.json();
}

export async function submitCase(formData: CaseFormData): Promise<CaseResponse> {
  const payload = {
    flight_itinerary: formData.flightItinerary,
    flight_details: {
      ...formData.flightDetails,
      flights: formData.flightDetails.flights,
    },
    passenger: {
      ...formData.passenger,
      email: formData.emailGdpr.email,
    },
    gdpr_consent: formData.emailGdpr.gdpr_consent,
  };

  const body = new FormData();
  body.append('data', JSON.stringify(payload));

  if (formData.documents.boarding_pass) {
    body.append('boarding_pass', formData.documents.boarding_pass);
  }
  if (formData.documents.identity_document) {
    body.append('identity_document', formData.documents.identity_document);
  }

  const response = await fetch('/api/cases/', {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const errors = await response.json();
    throw errors;
  }

  return response.json();
}
```

**Verification:**
- TypeScript compilation: `npx tsc --noEmit` — should pass with no errors

---

## Task 9: Frontend Validation Utilities

**Files:**
- Create: `frontend/src/utils/validation.ts`

**Requirements:**
- Validation functions matching backend rules
- Returns error messages per field
- Used by each wizard step on "Next" click

**Implementation:**

`frontend/src/utils/validation.ts`:
```typescript
import type {
  FlightItineraryData,
  EmailGdprData,
  FlightDetailsData,
  PassengerData,
  DocumentsData,
} from '../components/CaseWizard/types';

export type FieldErrors = Record<string, string>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-]{7,20}$/;
const FLIGHT_NUMBER_REGEX = /^[A-Z]{2,3}\d{1,4}$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function validateFlightItinerary(data: FlightItineraryData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.departure_airport) {
    errors.departure_airport = 'Departure airport is required.';
  }
  if (!data.destination_airport) {
    errors.destination_airport = 'Destination airport is required.';
  }
  if (data.departure_airport && data.destination_airport && data.departure_airport === data.destination_airport) {
    errors.destination_airport = 'Destination must differ from departure.';
  }
  if (data.connecting_flights.length > 4) {
    errors.connecting_flights = 'Maximum 4 connecting flights allowed.';
  }
  for (let i = 0; i < data.connecting_flights.length; i++) {
    if (!data.connecting_flights[i].departure_airport) {
      errors[`connecting_${i}_departure`] = `Connecting flight ${i + 1}: departure airport required.`;
    }
    if (!data.connecting_flights[i].arrival_airport) {
      errors[`connecting_${i}_arrival`] = `Connecting flight ${i + 1}: arrival airport required.`;
    }
  }
  if (data.connecting_flights.length > 0 && data.problem_flight_index === null) {
    errors.problem_flight_index = 'Select the disrupted connecting flight.';
  }

  return errors;
}

export function validateEmailGdpr(data: EmailGdprData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!data.gdpr_consent) {
    errors.gdpr_consent = 'GDPR consent is required to proceed.';
  }

  return errors;
}

export function validateFlightDetails(data: FlightDetailsData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.reservation_number) {
    errors.reservation_number = 'Reservation number is required.';
  }
  if (!data.planned_departure_time) {
    errors.planned_departure_time = 'Planned departure time is required.';
  }
  if (!data.planned_arrival_time) {
    errors.planned_arrival_time = 'Planned arrival time is required.';
  }

  for (let i = 0; i < data.flights.length; i++) {
    const flight = data.flights[i];
    if (!flight.flight_date) {
      errors[`flight_${i}_date`] = `Flight ${i + 1}: date is required.`;
    }
    if (!flight.flight_number) {
      errors[`flight_${i}_number`] = `Flight ${i + 1}: flight number is required.`;
    } else if (!FLIGHT_NUMBER_REGEX.test(flight.flight_number)) {
      errors[`flight_${i}_number`] = `Flight ${i + 1}: invalid format (e.g., KL1234).`;
    }
    if (!flight.airline) {
      errors[`flight_${i}_airline`] = `Flight ${i + 1}: airline is required.`;
    }
  }

  return errors;
}

export function validatePassengerDetails(data: PassengerData, documents: DocumentsData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.first_name) errors.first_name = 'First name is required.';
  if (!data.last_name) errors.last_name = 'Last name is required.';
  if (!data.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required.';
  } else if (new Date(data.date_of_birth) > new Date()) {
    errors.date_of_birth = 'Date of birth cannot be in the future.';
  }
  if (!data.phone_number) {
    errors.phone_number = 'Phone number is required.';
  } else if (!PHONE_REGEX.test(data.phone_number)) {
    errors.phone_number = 'Enter a valid phone number.';
  }
  if (!data.address) errors.address = 'Address is required.';
  if (!data.postal_code) errors.postal_code = 'Postal code is required.';

  // Document validation
  if (!documents.boarding_pass) {
    errors.boarding_pass = 'Boarding pass is required.';
  } else {
    if (documents.boarding_pass.size > MAX_FILE_SIZE) {
      errors.boarding_pass = 'Boarding pass exceeds 5MB limit.';
    }
    if (!ALLOWED_FILE_TYPES.includes(documents.boarding_pass.type)) {
      errors.boarding_pass = 'Boarding pass must be PDF, JPG, or PNG.';
    }
  }

  if (!documents.identity_document) {
    errors.identity_document = 'ID card or passport is required.';
  } else {
    if (documents.identity_document.size > MAX_FILE_SIZE) {
      errors.identity_document = 'Identity document exceeds 5MB limit.';
    }
    if (!ALLOWED_FILE_TYPES.includes(documents.identity_document.type)) {
      errors.identity_document = 'Identity document must be PDF, JPG, or PNG.';
    }
  }

  return errors;
}
```

**Verification:**
- `npx tsc --noEmit` — no errors

---

## Task 10: CaseWizard Container & StepIndicator

**Files:**
- Create: `frontend/src/components/CaseWizard/CaseWizard.tsx`
- Create: `frontend/src/components/CaseWizard/StepIndicator.tsx`

**Requirements:**
- Manages form state and current step
- Navigation: Next/Back buttons with per-step validation
- Steps 2 and 3 skipped in navigation (shown as disabled in indicator)
- Step 7 shows "Submit" instead of "Next"

**Implementation:**

`frontend/src/components/CaseWizard/StepIndicator.tsx`:
```typescript
import React from 'react';

interface Step {
  label: string;
  disabled?: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div style={{ display: 'flex', marginBottom: '2rem', gap: '0.25rem' }}>
      {steps.map((step, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.5rem 0.25rem',
            borderBottom: `3px solid ${
              index === currentStep
                ? '#2563eb'
                : step.disabled
                ? '#d1d5db'
                : index < currentStep
                ? '#10b981'
                : '#e5e7eb'
            }`,
            opacity: step.disabled ? 0.5 : 1,
            fontSize: '0.75rem',
          }}
        >
          <div style={{ fontWeight: index === currentStep ? 'bold' : 'normal' }}>
            {index + 1}. {step.label}
          </div>
        </div>
      ))}
    </div>
  );
};
```

`frontend/src/components/CaseWizard/CaseWizard.tsx`:
```typescript
import React, { useState } from 'react';
import { StepIndicator } from './StepIndicator';
import { FlightItinerary } from './steps/FlightItinerary';
import { EmailGdpr } from './steps/EmailGdpr';
import { FlightDetails } from './steps/FlightDetails';
import { PassengerDetails } from './steps/PassengerDetails';
import { CaseGeneration } from './steps/CaseGeneration';
import type { CaseFormData, CaseResponse } from './types';
import { INITIAL_FORM_DATA } from './types';
import {
  validateFlightItinerary,
  validateEmailGdpr,
  validateFlightDetails,
  validatePassengerDetails,
} from '../../utils/validation';
import { submitCase } from '../../services/api';

const STEPS = [
  { label: 'Flight Itinerary' },
  { label: 'Disruption Details', disabled: true },
  { label: 'Disruption Motives', disabled: true },
  { label: 'Email & GDPR' },
  { label: 'Flight Details' },
  { label: 'Passenger Details' },
  { label: 'Case Generation' },
];

// Active step indices (skipping 1, 2 which are disabled)
const ACTIVE_STEPS = [0, 3, 4, 5, 6];

export const CaseWizard: React.FC = () => {
  const [formData, setFormData] = useState<CaseFormData>(INITIAL_FORM_DATA);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitResult, setSubmitResult] = useState<CaseResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = ACTIVE_STEPS[activeStepIndex];

  const validateCurrentStep = (): boolean => {
    let stepErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0:
        stepErrors = validateFlightItinerary(formData.flightItinerary);
        break;
      case 3:
        stepErrors = validateEmailGdpr(formData.emailGdpr);
        break;
      case 4:
        stepErrors = validateFlightDetails(formData.flightDetails);
        break;
      case 5:
        stepErrors = validatePassengerDetails(formData.passenger, formData.documents);
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setErrors({});

    // After flight itinerary, sync flight segments count
    if (currentStep === 0) {
      const connectingCount = formData.flightItinerary.connecting_flights.length;
      const segmentCount = connectingCount > 0 ? connectingCount : 1;
      const currentFlights = formData.flightDetails.flights;

      if (currentFlights.length !== segmentCount) {
        const flights = Array.from({ length: segmentCount }, (_, i) => (
          currentFlights[i] || { flight_date: '', flight_number: '', airline: '' }
        ));
        setFormData(prev => ({
          ...prev,
          flightDetails: { ...prev.flightDetails, flights },
        }));
      }
    }

    setActiveStepIndex(prev => Math.min(prev + 1, ACTIVE_STEPS.length - 1));
  };

  const handleBack = () => {
    setErrors({});
    setActiveStepIndex(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitCase(formData);
      setSubmitResult(result);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && !('message' in err)) {
        setSubmitError(JSON.stringify(err, null, 2));
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitResult) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Case Submitted Successfully!</h2>
        <p>Your case ID: <strong>{submitResult.case_id}</strong></p>
        <p>Status: {submitResult.status}</p>
        <p>Created: {new Date(submitResult.created_at).toLocaleString()}</p>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <FlightItinerary
            data={formData.flightItinerary}
            onChange={(data) => setFormData(prev => ({ ...prev, flightItinerary: data }))}
            errors={errors}
          />
        );
      case 3:
        return (
          <EmailGdpr
            data={formData.emailGdpr}
            onChange={(data) => setFormData(prev => ({ ...prev, emailGdpr: data }))}
            errors={errors}
          />
        );
      case 4:
        return (
          <FlightDetails
            data={formData.flightDetails}
            onChange={(data) => setFormData(prev => ({ ...prev, flightDetails: data }))}
            errors={errors}
          />
        );
      case 5:
        return (
          <PassengerDetails
            data={formData.passenger}
            documents={formData.documents}
            onChangePassenger={(data) => setFormData(prev => ({ ...prev, passenger: data }))}
            onChangeDocuments={(data) => setFormData(prev => ({ ...prev, documents: data }))}
            errors={errors}
          />
        );
      case 6:
        return (
          <CaseGeneration
            formData={formData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = activeStepIndex === ACTIVE_STEPS.length - 1;

  return (
    <div>
      <StepIndicator steps={STEPS} currentStep={currentStep} />
      {renderStep()}
      {!isLastStep && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button
            onClick={handleBack}
            disabled={activeStepIndex === 0}
            style={{ padding: '0.5rem 1.5rem' }}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
```

**Verification:**
- `npx tsc --noEmit` — no errors (after all steps are created)
- Visual check: stepper shows 7 steps, 2 greyed out

---

## Task 11: Step 1 — FlightItinerary Component

**Files:**
- Create: `frontend/src/components/CaseWizard/steps/FlightItinerary.tsx`

**Requirements:**
- Airport autocomplete for departure and destination (debounced 300ms)
- Add/remove connecting flights (max 4)
- Each connecting flight has departure/arrival airport autocomplete
- Problem flight dropdown (mandatory when connections exist)

**Implementation:**

`frontend/src/components/CaseWizard/steps/FlightItinerary.tsx`:
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import type { FlightItineraryData, AirportOption } from '../types';
import { searchAirports } from '../../../services/api';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: FlightItineraryData;
  onChange: (data: FlightItineraryData) => void;
  errors: FieldErrors;
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface AirportAutocompleteProps {
  value: string;
  onChange: (iataCode: string) => void;
  placeholder: string;
  error?: string;
}

const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({ value, onChange, placeholder, error }) => {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchAirports(debouncedQuery).then(setOptions).catch(() => setOptions([]));
    } else {
      setOptions([]);
    }
  }, [debouncedQuery]);

  const handleSelect = useCallback((airport: AirportOption) => {
    setQuery(`${airport.iata_code} - ${airport.name}`);
    onChange(airport.iata_code);
    setShowDropdown(false);
  }, [onChange]);

  return (
    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
          if (!e.target.value) onChange('');
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '0.5rem', border: error ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
      />
      {error && <div style={{ color: 'red', fontSize: '0.8rem' }}>{error}</div>}
      {showDropdown && options.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'white', border: '1px solid #ccc', listStyle: 'none',
          padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto', zIndex: 10
        }}>
          {options.map((airport) => (
            <li
              key={airport.iata_code}
              onMouseDown={() => handleSelect(airport)}
              style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              <strong>{airport.iata_code}</strong> — {airport.name}, {airport.city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const FlightItinerary: React.FC<Props> = ({ data, onChange, errors }) => {
  const addConnecting = () => {
    if (data.connecting_flights.length >= 4) return;
    onChange({
      ...data,
      connecting_flights: [...data.connecting_flights, { departure_airport: '', arrival_airport: '' }],
    });
  };

  const removeConnecting = (index: number) => {
    const updated = data.connecting_flights.filter((_, i) => i !== index);
    onChange({
      ...data,
      connecting_flights: updated,
      problem_flight_index: data.problem_flight_index === index ? null : data.problem_flight_index,
    });
  };

  const updateConnecting = (index: number, field: 'departure_airport' | 'arrival_airport', value: string) => {
    const updated = [...data.connecting_flights];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, connecting_flights: updated });
  };

  return (
    <div>
      <h2>Flight Itinerary</h2>

      <label>Departure Airport</label>
      <AirportAutocomplete
        value={data.departure_airport}
        onChange={(val) => onChange({ ...data, departure_airport: val })}
        placeholder="Search departure airport..."
        error={errors.departure_airport}
      />

      <label>Destination Airport</label>
      <AirportAutocomplete
        value={data.destination_airport}
        onChange={(val) => onChange({ ...data, destination_airport: val })}
        placeholder="Search destination airport..."
        error={errors.destination_airport}
      />

      <div style={{ marginTop: '1rem' }}>
        <h3>Connecting Flights</h3>
        {errors.connecting_flights && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.connecting_flights}</div>}

        {data.connecting_flights.map((conn, idx) => (
          <div key={idx} style={{ border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '0.5rem', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Connection {idx + 1}</strong>
              <button type="button" onClick={() => removeConnecting(idx)} style={{ color: 'red' }}>Remove</button>
            </div>
            <label>From</label>
            <AirportAutocomplete
              value={conn.departure_airport}
              onChange={(val) => updateConnecting(idx, 'departure_airport', val)}
              placeholder="Departure..."
              error={errors[`connecting_${idx}_departure`]}
            />
            <label>To</label>
            <AirportAutocomplete
              value={conn.arrival_airport}
              onChange={(val) => updateConnecting(idx, 'arrival_airport', val)}
              placeholder="Arrival..."
              error={errors[`connecting_${idx}_arrival`]}
            />
          </div>
        ))}

        {data.connecting_flights.length < 4 && (
          <button type="button" onClick={addConnecting} style={{ marginTop: '0.5rem' }}>
            + Add Connecting Flight
          </button>
        )}
      </div>

      {data.connecting_flights.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <label>Which connecting flight was disrupted?</label>
          <select
            value={data.problem_flight_index ?? ''}
            onChange={(e) => onChange({ ...data, problem_flight_index: e.target.value ? Number(e.target.value) : null })}
            style={{ width: '100%', padding: '0.5rem', border: errors.problem_flight_index ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">Select...</option>
            {data.connecting_flights.map((conn, idx) => (
              <option key={idx} value={idx}>
                Connection {idx + 1}: {conn.departure_airport || '?'} → {conn.arrival_airport || '?'}
              </option>
            ))}
          </select>
          {errors.problem_flight_index && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.problem_flight_index}</div>}
        </div>
      )}
    </div>
  );
};
```

**Verification:**
- Component renders with airport search inputs
- Adding/removing connecting flights works
- Problem flight dropdown appears when connections exist

---

## Task 12: Step 4 — EmailGdpr Component

**Files:**
- Create: `frontend/src/components/CaseWizard/steps/EmailGdpr.tsx`

**Requirements:**
- Email input with validation feedback
- GDPR policy text (scrollable)
- Consent checkbox required to proceed

**Implementation:**

`frontend/src/components/CaseWizard/steps/EmailGdpr.tsx`:
```typescript
import React from 'react';
import type { EmailGdprData } from '../types';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: EmailGdprData;
  onChange: (data: EmailGdprData) => void;
  errors: FieldErrors;
}

const GDPR_TEXT = `
Data Protection Policy

We collect and process your personal data solely for the purpose of handling your flight compensation claim. This includes:

- Personal identification information (name, date of birth, contact details)
- Flight and travel information
- Supporting documents (boarding pass, identification)

Your data will be:
- Processed in accordance with GDPR (EU Regulation 2016/679)
- Stored securely and accessed only by authorized personnel
- Retained only for the duration necessary to process your claim
- Not shared with third parties without your explicit consent, except as required by law

You have the right to:
- Access your personal data
- Request rectification or erasure of your data
- Object to or restrict processing
- Data portability
- Lodge a complaint with a supervisory authority

By providing your consent below, you agree to the processing of your personal data as described above for the purpose of handling your flight compensation claim.
`.trim();

export const EmailGdpr: React.FC<Props> = ({ data, onChange, errors }) => {
  return (
    <div>
      <h2>Email & GDPR Compliance</h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <label>Email Address</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          placeholder="your.email@example.com"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: errors.email ? '1px solid red' : '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        {errors.email && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.email}</div>}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label>GDPR Data Protection Policy</label>
        <div
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: '#f9fafb',
            whiteSpace: 'pre-wrap',
            fontSize: '0.85rem',
            marginTop: '0.5rem',
          }}
        >
          {GDPR_TEXT}
        </div>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={data.gdpr_consent}
            onChange={(e) => onChange({ ...data, gdpr_consent: e.target.checked })}
          />
          I agree to the processing of my personal data as described above
        </label>
        {errors.gdpr_consent && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.gdpr_consent}</div>}
      </div>
    </div>
  );
};
```

**Verification:**
- Email input shows validation error for invalid format
- Cannot proceed without checking consent box

---

## Task 13: Step 5 — FlightDetails Component

**Files:**
- Create: `frontend/src/components/CaseWizard/steps/FlightDetails.tsx`

**Requirements:**
- Dynamically shows flight segments based on itinerary (one per connecting flight, or one for direct)
- Per segment: flight date, flight number, airline
- Global: reservation number, planned departure time, planned arrival time

**Implementation:**

`frontend/src/components/CaseWizard/steps/FlightDetails.tsx`:
```typescript
import React from 'react';
import type { FlightDetailsData } from '../types';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: FlightDetailsData;
  onChange: (data: FlightDetailsData) => void;
  errors: FieldErrors;
}

export const FlightDetails: React.FC<Props> = ({ data, onChange, errors }) => {
  const updateFlight = (index: number, field: string, value: string) => {
    const updated = [...data.flights];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, flights: updated });
  };

  return (
    <div>
      <h2>Flight Details</h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <label>Reservation Number</label>
        <input
          type="text"
          value={data.reservation_number}
          onChange={(e) => onChange({ ...data, reservation_number: e.target.value })}
          placeholder="e.g., ABC123"
          style={{
            width: '100%', padding: '0.5rem',
            border: errors.reservation_number ? '1px solid red' : '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        {errors.reservation_number && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.reservation_number}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label>Planned Departure Time</label>
          <input
            type="datetime-local"
            value={data.planned_departure_time}
            onChange={(e) => onChange({ ...data, planned_departure_time: e.target.value })}
            style={{
              width: '100%', padding: '0.5rem',
              border: errors.planned_departure_time ? '1px solid red' : '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          {errors.planned_departure_time && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.planned_departure_time}</div>}
        </div>
        <div>
          <label>Planned Arrival Time</label>
          <input
            type="datetime-local"
            value={data.planned_arrival_time}
            onChange={(e) => onChange({ ...data, planned_arrival_time: e.target.value })}
            style={{
              width: '100%', padding: '0.5rem',
              border: errors.planned_arrival_time ? '1px solid red' : '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          {errors.planned_arrival_time && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.planned_arrival_time}</div>}
        </div>
      </div>

      <h3>Flight Segments</h3>
      {data.flights.map((flight, idx) => (
        <div key={idx} style={{ border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <h4>Segment {idx + 1}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label>Flight Date</label>
              <input
                type="date"
                value={flight.flight_date}
                onChange={(e) => updateFlight(idx, 'flight_date', e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem',
                  border: errors[`flight_${idx}_date`] ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              {errors[`flight_${idx}_date`] && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors[`flight_${idx}_date`]}</div>}
            </div>
            <div>
              <label>Flight Number</label>
              <input
                type="text"
                value={flight.flight_number}
                onChange={(e) => updateFlight(idx, 'flight_number', e.target.value.toUpperCase())}
                placeholder="e.g., KL1234"
                style={{
                  width: '100%', padding: '0.5rem',
                  border: errors[`flight_${idx}_number`] ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              {errors[`flight_${idx}_number`] && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors[`flight_${idx}_number`]}</div>}
            </div>
            <div>
              <label>Airline</label>
              <input
                type="text"
                value={flight.airline}
                onChange={(e) => updateFlight(idx, 'airline', e.target.value)}
                placeholder="e.g., KLM"
                style={{
                  width: '100%', padding: '0.5rem',
                  border: errors[`flight_${idx}_airline`] ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              {errors[`flight_${idx}_airline`] && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors[`flight_${idx}_airline`]}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

**Verification:**
- Renders correct number of segments based on itinerary
- Validation errors shown per field

---

## Task 14: Step 6 — PassengerDetails Component

**Files:**
- Create: `frontend/src/components/CaseWizard/steps/PassengerDetails.tsx`

**Requirements:**
- Personal info fields: first name, last name, DOB, phone, address, postal code
- Document uploads: boarding pass + ID/passport (required)
- File validation: type + size with preview of filename
- Remove file button

**Implementation:**

`frontend/src/components/CaseWizard/steps/PassengerDetails.tsx`:
```typescript
import React from 'react';
import type { PassengerData, DocumentsData } from '../types';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: PassengerData;
  documents: DocumentsData;
  onChangePassenger: (data: PassengerData) => void;
  onChangeDocuments: (data: DocumentsData) => void;
  errors: FieldErrors;
}

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PassengerDetails: React.FC<Props> = ({
  data,
  documents,
  onChangePassenger,
  onChangeDocuments,
  errors,
}) => {
  return (
    <div>
      <h2>Passenger Details</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>First Name</label>
          <input
            type="text"
            value={data.first_name}
            onChange={(e) => onChangePassenger({ ...data, first_name: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: errors.first_name ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.first_name && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.first_name}</div>}
        </div>
        <div>
          <label>Last Name</label>
          <input
            type="text"
            value={data.last_name}
            onChange={(e) => onChangePassenger({ ...data, last_name: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: errors.last_name ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.last_name && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.last_name}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>Date of Birth</label>
          <input
            type="date"
            value={data.date_of_birth}
            onChange={(e) => onChangePassenger({ ...data, date_of_birth: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: errors.date_of_birth ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.date_of_birth && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.date_of_birth}</div>}
        </div>
        <div>
          <label>Phone Number</label>
          <input
            type="tel"
            value={data.phone_number}
            onChange={(e) => onChangePassenger({ ...data, phone_number: e.target.value })}
            placeholder="+31612345678"
            style={{ width: '100%', padding: '0.5rem', border: errors.phone_number ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.phone_number && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.phone_number}</div>}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Address</label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => onChangePassenger({ ...data, address: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', border: errors.address ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
        />
        {errors.address && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.address}</div>}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label>Postal Code</label>
        <input
          type="text"
          value={data.postal_code}
          onChange={(e) => onChangePassenger({ ...data, postal_code: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', border: errors.postal_code ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
        />
        {errors.postal_code && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.postal_code}</div>}
      </div>

      <h3>Documents</h3>

      <div style={{ marginBottom: '1rem' }}>
        <label>Boarding Pass (PDF, JPG, or PNG — max 5MB)</label>
        {documents.boarding_pass ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '4px' }}>
            <span>{documents.boarding_pass.name} ({formatFileSize(documents.boarding_pass.size)})</span>
            <button type="button" onClick={() => onChangeDocuments({ ...documents, boarding_pass: null })} style={{ color: 'red' }}>
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onChangeDocuments({ ...documents, boarding_pass: file });
            }}
            style={{ display: 'block', marginTop: '0.25rem' }}
          />
        )}
        {errors.boarding_pass && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.boarding_pass}</div>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>ID Card or Passport (PDF, JPG, or PNG — max 5MB)</label>
        {documents.identity_document ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '4px' }}>
            <span>{documents.identity_document.name} ({formatFileSize(documents.identity_document.size)})</span>
            <button type="button" onClick={() => onChangeDocuments({ ...documents, identity_document: null })} style={{ color: 'red' }}>
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onChangeDocuments({ ...documents, identity_document: file });
            }}
            style={{ display: 'block', marginTop: '0.25rem' }}
          />
        )}
        {errors.identity_document && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.identity_document}</div>}
      </div>
    </div>
  );
};
```

**Verification:**
- All passenger fields render and validate
- File selection shows filename/size, remove button works
- Validation errors displayed inline

---

## Task 15: Step 7 — CaseGeneration Component

**Files:**
- Create: `frontend/src/components/CaseWizard/steps/CaseGeneration.tsx`

**Requirements:**
- Read-only summary of all entered data
- Submit button calls API
- Shows loading state during submission
- Shows errors returned from backend

**Implementation:**

`frontend/src/components/CaseWizard/steps/CaseGeneration.tsx`:
```typescript
import React from 'react';
import type { CaseFormData } from '../types';

interface Props {
  formData: CaseFormData;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export const CaseGeneration: React.FC<Props> = ({ formData, onSubmit, isSubmitting, submitError }) => {
  const { flightItinerary, emailGdpr, flightDetails, passenger, documents } = formData;

  return (
    <div>
      <h2>Review & Submit</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Please review your information below before submitting.
      </p>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Flight Itinerary</h3>
        <p><strong>From:</strong> {flightItinerary.departure_airport} <strong>To:</strong> {flightItinerary.destination_airport}</p>
        {flightItinerary.connecting_flights.length > 0 && (
          <>
            <p><strong>Connecting Flights:</strong></p>
            <ul>
              {flightItinerary.connecting_flights.map((conn, idx) => (
                <li key={idx}>
                  {conn.departure_airport} → {conn.arrival_airport}
                  {idx === flightItinerary.problem_flight_index && <strong> (Disrupted)</strong>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Flight Details</h3>
        <p><strong>Reservation:</strong> {flightDetails.reservation_number}</p>
        <p><strong>Departure:</strong> {flightDetails.planned_departure_time}</p>
        <p><strong>Arrival:</strong> {flightDetails.planned_arrival_time}</p>
        {flightDetails.flights.map((flight, idx) => (
          <p key={idx}>
            Segment {idx + 1}: {flight.flight_number} ({flight.airline}) on {flight.flight_date}
          </p>
        ))}
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Passenger</h3>
        <p><strong>Name:</strong> {passenger.first_name} {passenger.last_name}</p>
        <p><strong>DOB:</strong> {passenger.date_of_birth}</p>
        <p><strong>Email:</strong> {emailGdpr.email}</p>
        <p><strong>Phone:</strong> {passenger.phone_number}</p>
        <p><strong>Address:</strong> {passenger.address}, {passenger.postal_code}</p>
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Documents</h3>
        <p><strong>Boarding Pass:</strong> {documents.boarding_pass?.name || 'Not uploaded'}</p>
        <p><strong>ID/Passport:</strong> {documents.identity_document?.name || 'Not uploaded'}</p>
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>GDPR Consent</h3>
        <p>{emailGdpr.gdpr_consent ? '✓ Consented' : '✗ Not consented'}</p>
      </section>

      {submitError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Submission Error:</strong>
          <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{submitError}</pre>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: isSubmitting ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Case'}
      </button>
    </div>
  );
};
```

**Verification:**
- Summary displays all form data correctly
- Submit button calls API and shows success/error states
- Loading state disables button during submission

---
