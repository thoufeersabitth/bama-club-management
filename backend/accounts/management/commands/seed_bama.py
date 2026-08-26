from django.core.management.base import BaseCommand
from accounts.models import User, UserRole
from branches.models import Branch
from students.models import Student
from attendance.models import AttendanceRecord
from fees.models import FeeRecord
from belt_grading.models import BeltGrading
from website.models import HeroBanner, Announcement, FAQ, Testimonial
from datetime import date, timedelta

class Command(BaseCommand):
    help = 'Seeds initial BAMA Club Management System data'

    def handle(self, *args, **options):
        self.stdout.write("Seeding B.A.M.A. Club Management System database...")

        # 1. Create Branches
        b_pulikkal, _ = Branch.objects.get_or_create(
            code='PLK-01',
            defaults={
                'name': 'Pulikkal Branch (Head Office)',
                'address': 'Andiyoorkunnu Road, Pulikkal, Malappuram, Kerala - 673637',
                'phone': '+91 95440 85442',
                'whatsapp': '+91 95440 85442',
                'email': 'pulikkal@bama.org',
                'branch_head': 'Sensei Abdul Rahman (5th Dan)',
                'is_head_office': True,
                'status': 'Active',
                'timings': 'Mon, Wed, Fri: 6:00 AM - 7:30 AM & 5:00 PM - 7:00 PM'
            }
        )

        b_chungam, _ = Branch.objects.get_or_create(
            code='CGM-02',
            defaults={
                'name': 'Chungam Branch',
                'address': 'Main Road Junction, Chungam, Malappuram, Kerala - 673638',
                'phone': '+91 98471 22334',
                'whatsapp': '+91 98471 22334',
                'email': 'chungam@bama.org',
                'branch_head': 'Sensei Muhammad Shafi (3rd Dan)',
                'is_head_office': False,
                'status': 'Active',
                'timings': 'Tue, Thu, Sat: 5:00 PM - 7:00 PM'
            }
        )

        b_feroke, _ = Branch.objects.get_or_create(
            code='FRK-03',
            defaults={
                'name': 'Feroke Branch',
                'address': 'Station Road, Near Town Hall, Feroke, Kozhikode, Kerala - 673631',
                'phone': '+91 94462 88990',
                'whatsapp': '+91 94462 88990',
                'email': 'feroke@bama.org',
                'branch_head': 'Sensei Rajesh Kumar (4th Dan)',
                'is_head_office': False,
                'status': 'Active',
                'timings': 'Sat & Sun: 7:00 AM - 9:30 AM & 4:00 PM - 6:00 PM'
            }
        )

        # 2. Create Single Official Super Admin User
        users_data = [
            ('nafih', 'Pulikkal@1', UserRole.SUPER_ADMIN, 'Sensei Nafih', 'braveacademypkl@gmail.com', '+919544085442', 'PLK-01'),
        ]

        for username, password, role, name, email, phone, branch_id in users_data:
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    first_name=name,
                    email=email,
                    role=role,
                    phone=phone,
                    assigned_branch_id=branch_id
                )
                if role == UserRole.SUPER_ADMIN:
                    user.is_superuser = True
                    user.is_staff = True
                    user.save()

        # 3. Clean database - No dummy students seeded for production ready setup
        created_students = []

        # 4. Create Fee Records & Attendance
        for s in created_students:
            FeeRecord.objects.get_or_create(
                student=s,
                month='August',
                year=2026,
                defaults={
                    'amount': s.fee_amount,
                    'paid_amount': s.fee_amount if s.admission_no != 'BAMA-2024-002' else 0,
                    'receipt_no': f'REC-{s.admission_no}-2026-08',
                    'due_date': date.today() + timedelta(days=5)
                }
            )

            # Attendance for last 5 days
            for d in range(5):
                AttendanceRecord.objects.get_or_create(
                    student=s,
                    date=date.today() - timedelta(days=d),
                    defaults={
                        'branch': s.branch,
                        'status': 'Present' if d != 2 else 'Absent',
                        'marked_by': s.instructor
                    }
                )

            # Belt Grading history
            BeltGrading.objects.get_or_create(
                student=s,
                target_belt=s.current_belt,
                defaults={
                    'previous_belt': 'White Belt' if s.current_belt != 'White Belt' else 'Novice',
                    'exam_date': date.today() - timedelta(days=60),
                    'result': 'Pass',
                    'certificate_no': f'CERT-BAMA-{s.admission_no}',
                    'examiner': 'Sensei Abdul Rahman (5th Dan)'
                }
            )

        # 5. Website CMS Defaults
        HeroBanner.objects.get_or_create(
            title='Brave Academy of Martial Arts',
            defaults={
                'subtitle': 'Discipline • Respect • Strength • Excellence. Train under certified Senseis affiliated with JKA India, KKA, and Kick Boxing Association of Kerala.',
                'button_text': 'Explore Programs',
                'button_link': '/programs',
                'order': 1
            }
        )

        FAQ.objects.get_or_create(
            question='What age group can join B.A.M.A.?',
            defaults={
                'answer': 'We welcome students from age 5 upwards. We have special Kids Karate, Adults, and Women’s Self Defence programs tailored to every skill level.',
                'order': 1
            }
        )

        Testimonial.objects.get_or_create(
            name='Dr. Anver Sadath',
            defaults={
                'role': 'Parent of Kid Cadet',
                'comment': 'B.A.M.A. transformed my son’s confidence and physical agility. The Senseis are extremely dedicated to character building and discipline.',
                'rating': 5
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded B.A.M.A. database!"))
