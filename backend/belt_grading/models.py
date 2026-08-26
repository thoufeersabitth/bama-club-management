import uuid
from django.db import models
from students.models import Student

class BeltGrading(models.Model):
    RESULT_CHOICES = [
        ('Pass', 'Pass'),
        ('Fail', 'Fail'),
        ('Pending', 'Pending')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grading_history')
    previous_belt = models.CharField(max_length=50)
    target_belt = models.CharField(max_length=50)
    exam_date = models.DateField()
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, default='Pass')
    examiner = models.CharField(max_length=255, default='Sensei Abdul Rahman (5th Dan)')
    certificate_no = models.CharField(max_length=100, blank=True, null=True, unique=True)
    remarks = models.TextField(blank=True, null=True)
    next_eligible_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.name}: {self.previous_belt} -> {self.target_belt} ({self.result})"


class ExamFormType(models.TextChoices):
    JKK_WHITE_TO_BROWN_4 = 'JKK_WHITE_TO_BROWN_4', 'JKK White to Brown-4 Application Form'
    JKK_BROWN = 'JKK_BROWN', 'JKK Brown Kyu Registration Form (Brown-3 to Brown-1)'
    JAPAN_DIRECT_BLACK_BELT = 'JAPAN_DIRECT_BLACK_BELT', 'Japan Direct Black Belt Examination Form'
    # Backward compatibility choices
    JKK_KERALA = 'JKK_KERALA', 'JKK Kerala Kyu Registration (White to Brown-4)'
    JKA_JAPAN = 'JKA_JAPAN', 'JKA Japan Senior Kyu & Dan Registration'


class ExamSchedule(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Active', 'Active'),
        ('Closed', 'Closed'),
        ('Completed', 'Completed')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam_name = models.CharField(max_length=255)
    exam_code = models.CharField(max_length=50, unique=True)
    exam_date = models.DateField()
    registration_start = models.DateField(blank=True, null=True)
    registration_end = models.DateField(blank=True, null=True)
    venue = models.CharField(max_length=255, default='Main Dojo, Pulikkal')
    exam_fee = models.DecimalField(max_digits=10, decimal_places=2, default=1000.00)
    currency = models.CharField(max_length=10, default='INR')
    eligible_belt = models.CharField(max_length=100, default='All Belts')
    target_belt = models.CharField(max_length=100, blank=True, null=True)
    max_candidates = models.IntegerField(default=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    payment_required = models.BooleanField(default=True)
    instructions = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-exam_date', '-created_at']

    def __str__(self):
        return f"{self.exam_name} ({self.exam_code}) - {self.exam_date} [{self.status}]"


class GradingRegistration(models.Model):
    PAYMENT_MODE_CHOICES = [
        ('UPI / GPay / PhonePe', 'UPI / GPay / PhonePe'),
        ('Cash at Dojo / Club', 'Cash at Dojo / Club')
    ]
    PAYMENT_STATUS_CHOICES = [
        ('Unpaid', 'Unpaid'),
        ('Pending', 'Pending'),
        ('Partially Paid', 'Partially Paid'),
        ('Paid / Verified', 'Paid / Verified'),
        ('Paid', 'Paid'),
        ('Refunded', 'Refunded')
    ]
    EXAM_STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Submitted', 'Submitted'),
        ('Pending Payment', 'Pending Payment'),
        ('Registered', 'Registered'),
        ('Under Review', 'Under Review'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Exam Completed', 'Exam Completed'),
        ('Passed', 'Passed'),
        ('Failed', 'Failed'),
        ('Probation', 'Probation'),
        ('Absent', 'Absent'),
        ('Result Published', 'Result Published')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam_schedule = models.ForeignKey(ExamSchedule, on_delete=models.SET_NULL, null=True, blank=True, related_name='registrations')
    registration_no = models.CharField(max_length=50, unique=True)
    form_type = models.CharField(max_length=50, choices=ExamFormType.choices, default=ExamFormType.JKK_WHITE_TO_BROWN_4)
    
    # Candidate Student Info
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name='exam_registrations')
    admission_no = models.CharField(max_length=50, blank=True, null=True)
    student_name = models.CharField(max_length=255)
    photo = models.TextField(blank=True, null=True)
    photo_secondary = models.TextField(blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    age = models.IntegerField(default=10)
    gender = models.CharField(max_length=10, default='Male')
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, default=140.0)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=1, default=35.0)
    nationality = models.CharField(max_length=50, default='INDIAN')
    organization = models.CharField(max_length=100, default='JKK / JKA')
    
    # Contact & Dojo Info
    branch_name = models.CharField(max_length=255, default='Pulikkal Dojo')
    school_or_employer = models.CharField(max_length=255, blank=True, null=True)
    employer_address = models.TextField(blank=True, null=True)
    class_or_occupation = models.CharField(max_length=100, blank=True, null=True)
    guardian_name = models.CharField(max_length=255)
    guardian_relationship = models.CharField(max_length=50, default='Father')
    phone = models.CharField(max_length=20)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    # Belt Exam Details
    current_belt = models.CharField(max_length=50, default='White Belt')
    current_kyu = models.CharField(max_length=20, default='10th Kyu')
    target_belt = models.CharField(max_length=50, default='Yellow Belt')
    target_kyu_or_dan = models.CharField(max_length=20, default='9th Kyu')
    belt_size = models.CharField(max_length=50, default='Size 3 (160 cm)')
    training_period_years = models.CharField(max_length=50, default='1 Year 0 Months')
    years_months_training = models.CharField(max_length=50, blank=True, null=True)
    present_rank = models.CharField(max_length=50, blank=True, null=True)
    date_of_confirmation = models.DateField(blank=True, null=True)
    current_qualifications = models.TextField(blank=True, null=True)
    
    # Special JKA / JKK Japan Fields
    jka_member_no = models.CharField(max_length=100, blank=True, null=True)
    jka_nationality = models.CharField(max_length=50, default='INDIAN')
    jka_organization = models.CharField(max_length=100, default='JKA INDIA')
    instructor_reference_name = models.CharField(max_length=255, default='Sensei Abdul Rahman')
    instructor_reference_address = models.TextField(blank=True, null=True, default='Pulikkal, Malappuram')
    instructor_reference_phone = models.CharField(max_length=20, default='9961576993')
    dan_kyu_certificate_no = models.CharField(max_length=100, blank=True, null=True)
    date_of_last_conferral = models.DateField(blank=True, null=True)
    instructor_qualification = models.CharField(max_length=50, blank=True, null=True)
    examiner_qualification = models.CharField(max_length=50, blank=True, null=True)
    judge_qualification = models.CharField(max_length=50, blank=True, null=True)
    
    # Financial & Fee Details
    exam_fee = models.DecimalField(max_digits=10, decimal_places=2, default=1000.00)
    applied_fee = models.DecimalField(max_digits=10, decimal_places=2, default=1000.00)
    payment_mode = models.CharField(max_length=50, choices=PAYMENT_MODE_CHOICES, default='UPI / GPay / PhonePe')
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='Pending')
    registration_status = models.CharField(max_length=30, choices=EXAM_STATUS_CHOICES, default='Submitted')
    
    # Evaluation & Exam Result Details
    exam_date = models.DateField(blank=True, null=True)
    exam_status = models.CharField(max_length=30, choices=EXAM_STATUS_CHOICES, default='Submitted')
    kihon_score = models.CharField(max_length=20, blank=True, null=True)
    kata_score = models.CharField(max_length=20, blank=True, null=True)
    kumite_score = models.CharField(max_length=20, blank=True, null=True)
    adaptation_score = models.CharField(max_length=20, blank=True, null=True)
    examiner_remarks = models.TextField(blank=True, null=True)
    examiner_signature = models.CharField(max_length=255, default='Sensei Abdul Rahman (5th Dan)')
    
    form_data_json = models.JSONField(blank=True, null=True)
    qr_code = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.applied_fee:
            self.applied_fee = self.exam_fee
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.registration_no} - {self.student_name} ({self.current_belt} -> {self.target_belt}) [{self.payment_status}]"


