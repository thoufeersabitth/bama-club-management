import os
import django
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bama_core.settings')
django.setup()

from branches.models import Branch
from students.models import Student
from attendance.models import AttendanceRecord
from fees.models import FeeRecord, FeeStatus

# Ensure main branches exist
pulikkal, _ = Branch.objects.get_or_create(
    code='BAMA-DOJO-01',
    defaults={
        'name': 'Pulikkal Branch (Head Office)',
        'address': 'Andiyoorkunnu Road, Pulikkal, Malappuram',
        'phone': '+91 95440 85442',
        'branch_head': 'Sensei Abdul Rahman (5th Dan)',
        'is_head_office': True
    }
)

chungam, _ = Branch.objects.get_or_create(
    code='BAMA-DOJO-02',
    defaults={
        'name': 'Chungam Branch Dojo',
        'address': 'Main Road Junction, Chungam, Malappuram',
        'phone': '+91 98471 22334',
        'branch_head': 'Sensei Rahul Kumar (3rd Dan)'
    }
)

mongam, _ = Branch.objects.get_or_create(
    code='BAMA-DOJO-03',
    defaults={
        'name': 'Mongam Branch Dojo',
        'address': 'Main Road, Mongam, Malappuram',
        'phone': '+91 97450 67890',
        'branch_head': 'Sensei Muhammed Haneen (2nd Dan)'
    }
)

STUDENT_DATA = [
    {
        'admission_no': 'BAMA-2024-001',
        'name': 'Fathima Riya',
        'gender': 'Female',
        'age': 11,
        'dob': '2015-04-12',
        'guardian_name': 'Musthafa K.',
        'phone': '9847122334',
        'whatsapp': '9847122334',
        'branch': pulikkal,
        'shift': 'Kids Special Batch (4:00 PM - 5:00 PM)',
        'current_belt': 'Orange Belt',
        'fee_amount': 500,
        'fee_status': 'Paid'
    },
    {
        'admission_no': 'BAMA-2024-002',
        'name': 'Adithya Suresh',
        'gender': 'Male',
        'age': 14,
        'dob': '2012-08-20',
        'guardian_name': 'Suresh Kumar',
        'phone': '9544085442',
        'whatsapp': '9544085442',
        'branch': pulikkal,
        'shift': 'Evening Batch (5:00 PM - 7:00 PM)',
        'current_belt': 'Green Belt',
        'fee_amount': 600,
        'fee_status': 'Paid'
    },
    {
        'admission_no': 'BAMA-2024-003',
        'name': 'Muhammed Ameen',
        'gender': 'Male',
        'age': 13,
        'dob': '2013-01-15',
        'guardian_name': 'Abdul Hameed',
        'phone': '9961576993',
        'whatsapp': '9961576993',
        'branch': chungam,
        'shift': 'Evening Batch (5:00 PM - 7:00 PM)',
        'current_belt': 'Blue Belt',
        'fee_amount': 700,
        'fee_status': 'Pending'
    },
    {
        'admission_no': 'BAMA-2024-004',
        'name': 'Ananya Nair',
        'gender': 'Female',
        'age': 10,
        'dob': '2016-09-05',
        'guardian_name': 'Ramesh Nair',
        'phone': '9745067890',
        'whatsapp': '9745067890',
        'branch': pulikkal,
        'shift': 'Kids Special Batch (4:00 PM - 5:00 PM)',
        'current_belt': 'Yellow Belt',
        'fee_amount': 500,
        'fee_status': 'Paid'
    },
    {
        'admission_no': 'BAMA-2024-005',
        'name': 'Zayan Ahmed',
        'gender': 'Male',
        'age': 15,
        'dob': '2011-11-28',
        'guardian_name': 'Ahmed Koya',
        'phone': '9846011223',
        'whatsapp': '9846011223',
        'branch': mongam,
        'shift': 'Night / Late Evening Batch (7:00 PM - 8:30 PM)',
        'current_belt': 'Purple Belt',
        'fee_amount': 800,
        'fee_status': 'Paid'
    },
    {
        'admission_no': 'BAMA-2026-8706',
        'name': 'kanjali',
        'gender': 'Female',
        'age': 12,
        'dob': '2014-06-18',
        'guardian_name': 'Moideen V.',
        'phone': '7356310450',
        'whatsapp': '7356310450',
        'branch': pulikkal,
        'shift': 'Evening Batch (5:00 PM - 7:00 PM)',
        'current_belt': 'Orange Belt',
        'fee_amount': 600,
        'fee_status': 'Paid'
    },
    {
        'admission_no': 'BAMA-2026-3944',
        'name': 'hhh',
        'gender': 'Male',
        'age': 9,
        'dob': '2017-03-10',
        'guardian_name': 'Hassan K.',
        'phone': '7356310450',
        'whatsapp': '7356310450',
        'branch': pulikkal,
        'shift': 'Kids Special Batch (4:00 PM - 5:00 PM)',
        'current_belt': 'White Belt',
        'fee_amount': 500,
        'fee_status': 'Pending'
    }
]

created_students = []
for s in STUDENT_DATA:
    std, _ = Student.objects.update_or_create(
        admission_no=s['admission_no'],
        defaults={
            'name': s['name'],
            'gender': s['gender'],
            'age': s['age'],
            'dob': s['dob'],
            'guardian_name': s['guardian_name'],
            'phone': s['phone'],
            'whatsapp': s['whatsapp'],
            'branch': s['branch'],
            'shift': s['shift'],
            'current_belt': s['current_belt'],
            'fee_amount': s['fee_amount'],
            'pending_amount': 0 if s['fee_status'] == 'Paid' else s['fee_amount'],
            'fee_status': s['fee_status'],
            'status': 'Active'
        }
    )
    created_students.append(std)

# Seed Attendance for today and past 5 days
today = date.today()
for i in range(5):
    att_date = today - timedelta(days=i)
    for std in created_students:
        status = 'Present' if (random.random() > 0.15) else 'Absent'
        AttendanceRecord.objects.update_or_create(
            student=std,
            date=att_date,
            defaults={
                'branch': std.branch or pulikkal,
                'status': status,
                'marked_by': 'Sensei Abdul Rahman'
            }
        )

# Seed Monthly Fee Records for current month
for std in created_students:
    is_paid = (std.fee_status == 'Paid')
    FeeRecord.objects.update_or_create(
        student=std,
        month='August',
        year=2026,
        defaults={
            'amount': std.fee_amount,
            'paid_amount': std.fee_amount if is_paid else 0,
            'pending_amount': 0 if is_paid else std.fee_amount,
            'status': FeeStatus.PAID if is_paid else FeeStatus.UNPAID,
            'receipt_no': f"REC-2026-{random.randint(1000, 9999)}" if is_paid else None,
            'payment_method': 'GPay / UPI' if is_paid else 'Cash'
        }
    )

from fees.models import FeeRecord, FeeStatus, FeeRateHistory, FeeConfiguration, FeeType

# Seed Fee Rate History & Configuration
FeeRateHistory.objects.update_or_create(
    fee_type=FeeType.MONTHLY,
    effective_from=date(2026, 1, 1),
    defaults={'amount': 500.00, 'is_active': True, 'note': 'Base historical rate'}
)
FeeRateHistory.objects.update_or_create(
    fee_type=FeeType.MONTHLY,
    effective_from=date(2026, 9, 1),
    defaults={'amount': 1000.00, 'is_active': True, 'note': 'Effective September 2026 fee increase'}
)
FeeRateHistory.objects.update_or_create(
    fee_type=FeeType.ADMISSION,
    effective_from=date(2026, 1, 1),
    defaults={'amount': 2000.00, 'is_active': True, 'note': 'Default admission fee'}
)
FeeConfiguration.objects.update_or_create(
    id='00000000-0000-0000-0000-000000000001',
    defaults={
        'default_monthly_fee': 1000.00,
        'default_admission_fee': 2000.00,
        'effective_month': 'September 2026',
        'apply_to_existing_cadets': True
    }
)

print(f"FULL MORNING SYSTEM DATA RESTORED SUCCESSFULLY! Students: {Student.objects.count()}, Attendance: {AttendanceRecord.objects.count()}, Fees: {FeeRecord.objects.count()}")
