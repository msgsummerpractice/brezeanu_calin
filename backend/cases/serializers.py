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


class DisruptionSerializer(serializers.Serializer):
    disruption_type = serializers.ChoiceField(choices=[
        ('CANCELLATION', 'Cancellation'),
        ('DELAY', 'Delay'),
        ('DENIED_BOARDING', 'Denied Boarding'),
    ])
    cancellation_notice_period = serializers.ChoiceField(
        choices=[
            ('MORE_THAN_14_DAYS', 'More than 14 days'),
            ('LESS_THAN_14_DAYS', 'Less than 14 days'),
            ('ON_FLIGHT_DAY', 'On flight day'),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    delay_arrival = serializers.ChoiceField(
        choices=[
            ('LESS_THAN_3H', 'Less than 3 hours'),
            ('MORE_THAN_3H', 'More than 3 hours'),
            ('CONNECTION_LOST', 'Connection flight lost'),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    denied_boarding_voluntary = serializers.BooleanField(required=False, allow_null=True)
    denied_boarding_reason = serializers.ChoiceField(
        choices=[
            ('OVERBOOKED', 'Flight overbooked'),
            ('AGGRESSIVE', 'Aggressive behavior with staff'),
            ('INTOXICATION', 'Intoxication'),
            ('UNSPECIFIED', 'Unspecified reason'),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    airline_mentioned_motive = serializers.ChoiceField(
        choices=[
            ('YES', 'Yes'),
            ('NO', 'No'),
            ('DONT_KNOW', "I don't know"),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    airline_motive = serializers.ChoiceField(
        choices=[
            ('TECHNICAL', 'Technical problem'),
            ('METEOROLOGICAL', 'Meteorological conditions'),
            ('STRIKE', 'Strike'),
            ('AIRPORT_PROBLEMS', 'Problems with airport'),
            ('CREW_PROBLEMS', 'Crew problems'),
            ('OTHER', 'Other motives'),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    incident_description = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True,
    )


class CaseCreateSerializer(serializers.Serializer):
    flight_itinerary = FlightItinerarySerializer()
    flight_details = FlightDetailsSerializer()
    passenger = PassengerSerializer()
    gdpr_consent = serializers.BooleanField()
    distance_km = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True, default=None)
    compensation_amount = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True, default=None)
    disruption = DisruptionSerializer()

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
        disruption_data = validated_data.get('disruption', {})
        connecting = itinerary.get('connecting_flights', [])
        problem_index = itinerary.get('problem_flight_index')

        with transaction.atomic():
            # Create Case
            case = Case.objects.create(
                reservation_number=flight_details['reservation_number'],
                planned_departure_time=flight_details['planned_departure_time'],
                planned_arrival_time=flight_details['planned_arrival_time'],
                distance_km=validated_data.get('distance_km'),
                compensation_amount=validated_data.get('compensation_amount'),
                disruption_type=disruption_data.get('disruption_type'),
                cancellation_notice_period=disruption_data.get('cancellation_notice_period') or None,
                delay_arrival=disruption_data.get('delay_arrival') or None,
                denied_boarding_voluntary=disruption_data.get('denied_boarding_voluntary'),
                denied_boarding_reason=disruption_data.get('denied_boarding_reason') or None,
                airline_mentioned_motive=disruption_data.get('airline_mentioned_motive') or None,
                airline_motive=disruption_data.get('airline_motive') or None,
                incident_description=disruption_data.get('incident_description') or None,
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
        fields = ['case_id', 'status', 'colleague', 'created_at']
