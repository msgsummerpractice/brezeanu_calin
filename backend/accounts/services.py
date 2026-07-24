import secrets
import string
import logging
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from .models import UserProfile

logger = logging.getLogger(__name__)


def generate_password(length=12):
    alphabet = string.ascii_letters + string.digits + '!@#$%&*'
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in '!@#$%&*' for c in password)):
            return password


def create_user_account(passenger):
    email = passenger.email
    existing_user = User.objects.filter(email=email).first()

    if existing_user:
        profile, _ = UserProfile.objects.get_or_create(user=existing_user)
        if profile.passenger is None:
            profile.passenger = passenger
            profile.save()
        return existing_user, False

    password = generate_password()
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=passenger.first_name,
        last_name=passenger.last_name,
    )

    UserProfile.objects.create(
        user=user,
        passenger=passenger,
        must_change_password=True,
    )

    _send_credentials_email(passenger, email, password)

    return user, True


def _send_credentials_email(passenger, email, password):
    subject = 'Your SkyRefund Account Has Been Created'
    message = (
        f"Dear {passenger.first_name} {passenger.last_name},\n\n"
        f"Your compensation case has been registered with SkyRefund.\n"
        f"An account has been created for you to track your case progress.\n\n"
        f"Login credentials:\n"
        f"  Email: {email}\n"
        f"  Password: {password}\n\n"
        f"Please log in and change your password immediately.\n\n"
        f"Best regards,\n"
        f"SkyRefund Team"
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send credentials email to {email}: {e}")
