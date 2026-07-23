import urllib3
from decimal import Decimal, InvalidOperation

import requests
from django.core.management.base import BaseCommand
from airports.models import Airport

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Sync airports from AirportGap API into the database'

    def _parse_coordinate(self, value):
        """Safely convert a coordinate string to Decimal, returning None if invalid."""
        if value is None:
            return None
        try:
            return Decimal(str(value).strip())
        except (InvalidOperation, ValueError):
            return None

    def handle(self, *args, **options):
        url = 'https://airportgap.com/api/airports'
        created_count = 0
        updated_count = 0
        total_fetched = 0

        while url:
            self.stdout.write(f'Fetching: {url}')
            response = requests.get(url, timeout=30, verify=False)
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
                        'name': (attrs.get('name') or '')[:255],
                        'city': (attrs.get('city') or '')[:255],
                        'country': (attrs.get('country') or '')[:255],
                        'latitude': self._parse_coordinate(attrs.get('latitude')),
                        'longitude': self._parse_coordinate(attrs.get('longitude')),
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
