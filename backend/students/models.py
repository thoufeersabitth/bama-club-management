import uuid
from django.db import models
from branches.models import Branch

class Student(models.Model):
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other')
    ]
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Suspended', 'Suspended')
    ]
    SHIFT_CHOICES = [
        ('Evening Batch (5:00 PM - 7:00 PM)', 'Evening Batch (5:00 PM - 7:00 PM)'),
        ('Morning Batch (6:00 AM - 7:30 AM)', 'Morning Batch (6:00 AM - 7:30 AM)'),
        ('Night / Late Evening Batch (7:00 PM - 8:30 PM)', 'Night / Late Evening Batch (7:00 PM - 8:30 PM)'),
        ('Weekend Special Batch (Sat & Sun: 7:00 AM - 9:00 AM)', 'Weekend Special Batch (Sat & Sun: 7:00 AM - 9:00 AM)'),
        ('Ladies Special Batch', 'Ladies Special Batch'),
        ('Kids Special Batch (4:00 PM - 5:00 PM)', 'Kids Special Batch (4:00 PM - 5:00 PM)'),
        ('Custom Shift / Flexible', 'Custom Shift / Flexible')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admission_no = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    photo = models.TextField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='Male')
    dob = models.DateField(blank=True, null=True)
    age = models.IntegerField(default=10)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    guardian_name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=50, default='Father')
    phone = models.CharField(max_length=20)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True, default='Pulikkal, Malappuram, Kerala')
    emergency_contact = models.CharField(max_length=20, blank=True, null=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, related_name='students')
    shift = models.CharField(max_length=100, choices=SHIFT_CHOICES, default='Evening Batch (5:00 PM - 7:00 PM)')
    instructor = models.CharField(max_length=255, default='Sensei Abdul Rahman')
    joining_date = models.DateField(blank=True, null=True)
    current_belt = models.CharField(max_length=50, default='White Belt')
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    initial_paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    fee_status = models.CharField(max_length=20, default='Pending')
    medical_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    qr_code = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.admission_no} - {self.name} ({self.current_belt}) [{self.shift}]"
