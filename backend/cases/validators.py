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
