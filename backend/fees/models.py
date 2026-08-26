import uuid
from decimal import Decimal
from django.db import models
from students.models import Student

class FeeStatus(models.TextChoices):
    PAID = 'Paid', 'Paid'
    UNPAID = 'Unpaid', 'Unpaid'
    PARTIAL = 'Partial', 'Partial'

class FeeType(models.TextChoices):
    MONTHLY = 'MONTHLY', 'Monthly Cadet Fee'
    ADMISSION = 'ADMISSION', 'One-Time Admission Fee'

class FeeRateHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fee_type = models.CharField(max_length=20, choices=FeeType.choices, default=FeeType.MONTHLY)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    note = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-effective_from', '-created_at']
        verbose_name_plural = 'Fee rate histories'

    def __str__(self):
        return f"{self.get_fee_type_display()} - ₹{self.amount} (Effective: {self.effective_from})"

class FeeConfiguration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    default_admission_fee = models.DecimalField(max_digits=10, decimal_places=2, default=1000.00)
    default_monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    effective_month = models.CharField(max_length=50, default='August 2026')
    apply_to_existing_cadets = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Academy Fee Settings (Monthly: ₹{self.default_monthly_fee}, Admission: ₹{self.default_admission_fee})"

class FeeRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='fee_records')
    month = models.CharField(max_length=20)
    year = models.IntegerField(default=2026)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    status = models.CharField(max_length=20, choices=FeeStatus.choices, default=FeeStatus.UNPAID)
    receipt_no = models.CharField(max_length=100, blank=True, null=True, unique=True)
    due_date = models.DateField(blank=True, null=True)
    payment_date = models.DateField(blank=True, null=True)
    payment_method = models.CharField(max_length=50, default='Cash')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        amt = Decimal(str(self.amount or 0))
        disc = Decimal(str(self.discount or 0))
        paid = Decimal(str(self.paid_amount or 0))
        
        pending = max(Decimal('0.00'), amt - disc - paid)
        self.pending_amount = pending
        
        if pending == Decimal('0.00'):
            self.status = FeeStatus.PAID
        elif paid > Decimal('0.00'):
            self.status = FeeStatus.PARTIAL
        else:
            self.status = FeeStatus.UNPAID
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.name} - {self.month} {self.year} ({self.status})"

