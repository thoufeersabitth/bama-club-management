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
    admission_no = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    photo = models.TextField(blank=True, null=True)
    gender = models.CharField(max_length=50, default='Male', blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    age = models.IntegerField(default=10, blank=True, null=True)
    blood_group = models.CharField(max_length=20, blank=True, null=True, default='O+')
    guardian_name = models.CharField(max_length=255, blank=True, null=True, default='Parent')
    relationship = models.CharField(max_length=50, default='Father', blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True, default='+91 9544085442')
    whatsapp = models.CharField(max_length=30, blank=True, null=True, default='+91 9544085442')
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True, default='Pulikkal, Malappuram, Kerala')
    emergency_contact = models.CharField(max_length=30, blank=True, null=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    shift = models.CharField(max_length=200, default='Evening Batch (5:00 PM - 7:00 PM)', blank=True, null=True)
    instructor = models.CharField(max_length=255, default='Sensei Abdul Rahman', blank=True, null=True)
    joining_date = models.DateField(blank=True, null=True)
    current_belt = models.CharField(max_length=100, default='White Belt', blank=True, null=True)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=500.00, blank=True, null=True)
    initial_paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, blank=True, null=True)
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, default=500.00, blank=True, null=True)
    fee_status = models.CharField(max_length=50, default='Pending', blank=True, null=True)
    medical_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Active', blank=True, null=True)
    qr_code = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.admission_no} - {self.name} ({self.current_belt}) [{self.shift}]"
