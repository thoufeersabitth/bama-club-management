import uuid
from django.db import models

class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    branch_head = models.CharField(max_length=255)
    opening_date = models.DateField(blank=True, null=True)
    is_head_office = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='Active')
    timings = models.CharField(max_length=255, default='Mon-Sat: 6 AM - 7 PM')
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Branch-specific monthly fee override")
    admission_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Branch-specific admission fee override")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Branches"

    def __str__(self):
        return f"{self.name} ({self.code})"

