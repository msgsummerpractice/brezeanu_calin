from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    passenger = models.OneToOneField(
        'cases.Passenger', on_delete=models.SET_NULL, null=True, blank=True, related_name='user_profile'
    )
    must_change_password = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile for {self.user.email}"
