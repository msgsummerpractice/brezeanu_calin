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
