from django.db import models


class Airport(models.Model):
    iata_code = models.CharField(max_length=3, primary_key=True)
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    country = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ['iata_code']

    def __str__(self):
        return f"{self.iata_code} - {self.name}"
