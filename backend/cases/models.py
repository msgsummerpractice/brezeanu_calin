import uuid
from django.db import models


class CaseStatus(models.TextChoices):
    NEW = 'NEW', 'New'
    VALID = 'VALID', 'Valid'
    ASSIGNED = 'ASSIGNED', 'Assigned'
    INVALID = 'INVALID', 'Invalid'


class DisruptionType(models.TextChoices):
    CANCELLATION = 'CANCELLATION', 'Cancellation'
    DELAY = 'DELAY', 'Delay'
    DENIED_BOARDING = 'DENIED_BOARDING', 'Denied Boarding'


class CancellationNoticePeriod(models.TextChoices):
    MORE_THAN_14_DAYS = 'MORE_THAN_14_DAYS', 'More than 14 days'
    LESS_THAN_14_DAYS = 'LESS_THAN_14_DAYS', 'Less than 14 days'
    ON_FLIGHT_DAY = 'ON_FLIGHT_DAY', 'On flight day'


class DelayArrival(models.TextChoices):
    LESS_THAN_3H = 'LESS_THAN_3H', 'Less than 3 hours'
    MORE_THAN_3H = 'MORE_THAN_3H', 'More than 3 hours'
    CONNECTION_LOST = 'CONNECTION_LOST', 'Connection flight lost'


class DeniedBoardingReason(models.TextChoices):
    OVERBOOKED = 'OVERBOOKED', 'Flight overbooked'
    AGGRESSIVE = 'AGGRESSIVE', 'Aggressive behavior with staff'
    INTOXICATION = 'INTOXICATION', 'Intoxication'
    UNSPECIFIED = 'UNSPECIFIED', 'Unspecified reason'


class AirlineMentionedMotive(models.TextChoices):
    YES = 'YES', 'Yes'
    NO = 'NO', 'No'
    DONT_KNOW = 'DONT_KNOW', "I don't know"


class AirlineMotive(models.TextChoices):
    TECHNICAL = 'TECHNICAL', 'Technical problem'
    METEOROLOGICAL = 'METEOROLOGICAL', 'Meteorological conditions'
    STRIKE = 'STRIKE', 'Strike'
    AIRPORT_PROBLEMS = 'AIRPORT_PROBLEMS', 'Problems with airport'
    CREW_PROBLEMS = 'CREW_PROBLEMS', 'Crew problems'
    OTHER = 'OTHER', 'Other motives'


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
    distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    compensation_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    disruption_type = models.CharField(
        max_length=20, choices=DisruptionType.choices, null=True, blank=True
    )
    cancellation_notice_period = models.CharField(
        max_length=20, choices=CancellationNoticePeriod.choices, null=True, blank=True
    )
    delay_arrival = models.CharField(
        max_length=20, choices=DelayArrival.choices, null=True, blank=True
    )
    denied_boarding_voluntary = models.BooleanField(null=True, blank=True)
    denied_boarding_reason = models.CharField(
        max_length=20, choices=DeniedBoardingReason.choices, null=True, blank=True
    )
    airline_mentioned_motive = models.CharField(
        max_length=10, choices=AirlineMentionedMotive.choices, null=True, blank=True
    )
    airline_motive = models.CharField(
        max_length=20, choices=AirlineMotive.choices, null=True, blank=True
    )
    incident_description = models.TextField(max_length=500, null=True, blank=True)
    colleague = models.CharField(max_length=255, blank=True, default='')
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
