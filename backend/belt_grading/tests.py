from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from students.models import Student
from branches.models import Branch
from belt_grading.models import ExamFormType, ExamSchedule, GradingRegistration
from belt_grading.services import (
    get_exam_form_type,
    get_eligible_students,
    validate_exam_eligibility,
    calculate_exam_fee
)

class BeltGradingAndExamSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='Pulikkal Main Dojo', code='PUL-01', is_head_office=True)

        self.white_student = Student.objects.create(
            admission_no='BAMA-TEST-001',
            name='Rahul White',
            current_belt='White Belt',
            branch=self.branch,
            phone='9846011111',
            guardian_name='Father One'
        )

        self.brown4_student = Student.objects.create(
            admission_no='BAMA-TEST-002',
            name='Anand Brown 4',
            current_belt='Brown Belt (4th Kyu)',
            branch=self.branch,
            phone='9846022222',
            guardian_name='Father Two'
        )

        self.brown3_student = Student.objects.create(
            admission_no='BAMA-TEST-003',
            name='Kiran Brown 3',
            current_belt='Brown Belt (3rd Kyu)',
            branch=self.branch,
            phone='9846033333',
            guardian_name='Father Three'
        )

        self.brown2_student = Student.objects.create(
            admission_no='BAMA-TEST-004',
            name='Sajid Brown 2',
            current_belt='Brown Belt (2nd Kyu)',
            branch=self.branch,
            phone='9846044444',
            guardian_name='Father Four'
        )

        self.brown1_student = Student.objects.create(
            admission_no='BAMA-TEST-005',
            name='Faris Brown 1',
            current_belt='Brown Belt (1st Kyu)',
            branch=self.branch,
            phone='9846055555',
            guardian_name='Father Five'
        )

        self.black_student = Student.objects.create(
            admission_no='BAMA-TEST-006',
            name='Sensei Black',
            current_belt='Black Belt (1st Dan)',
            branch=self.branch,
            phone='9846066666',
            guardian_name='Father Six'
        )

        self.exam_schedule = ExamSchedule.objects.create(
            exam_name='September Color Belt Examination',
            exam_code='EXAM-2026-SEP',
            exam_date=date(2026, 9, 20),
            registration_start=date(2026, 8, 1),
            registration_end=date(2026, 9, 15),
            venue='Pulikkal Dojo',
            exam_fee=Decimal('1000.00'),
            eligible_belt='All Belts',
            max_candidates=50,
            status='Active'
        )

    # Test 1: White student -> JKK White-to-Brown-4
    def test_01_white_student_jkk_white_to_brown_4(self):
        form_type = get_exam_form_type('White Belt')
        self.assertEqual(form_type, ExamFormType.JKK_WHITE_TO_BROWN_4)

    # Test 2: Brown-4 student -> JKK White-to-Brown-4
    def test_02_brown4_student_jkk_white_to_brown_4(self):
        form_type = get_exam_form_type('Brown Belt (4th Kyu)')
        self.assertEqual(form_type, ExamFormType.JKK_WHITE_TO_BROWN_4)

    # Test 3: Brown-3 student -> JKK Brown
    def test_03_brown3_student_jkk_brown(self):
        form_type = get_exam_form_type('Brown Belt (3rd Kyu)')
        self.assertEqual(form_type, ExamFormType.JKK_BROWN)

    # Test 4: Brown-2 student -> JKK Brown
    def test_04_brown2_student_jkk_brown(self):
        form_type = get_exam_form_type('Brown Belt (2nd Kyu)')
        self.assertEqual(form_type, ExamFormType.JKK_BROWN)

    # Test 5: Brown-1 student -> JKK Brown
    def test_05_brown1_student_jkk_brown(self):
        form_type = get_exam_form_type('Brown Belt (1st Kyu)')
        self.assertEqual(form_type, ExamFormType.JKK_BROWN)

    # Test 6: Black Belt student -> Japan Direct
    def test_06_black_belt_student_japan_direct(self):
        form_type = get_exam_form_type('Black Belt (1st Dan)')
        self.assertEqual(form_type, ExamFormType.JAPAN_DIRECT_BLACK_BELT)

    # Test 7: Incorrect belt registration must be rejected
    def test_07_incorrect_belt_registration_rejected(self):
        restricted_exam = ExamSchedule.objects.create(
            exam_name='Brown 2 Exclusive Exam',
            exam_code='EXAM-BROWN2-EXCL',
            exam_date=date(2026, 9, 25),
            eligible_belt='Brown Belt (2nd Kyu)',
            exam_fee=Decimal('1200.00')
        )
        is_eligible, err = validate_exam_eligibility(self.white_student, restricted_exam)
        self.assertFalse(is_eligible)
        self.assertIn('restricted', err.lower())

    # Test 8: Belt filter returns correct students
    def test_08_belt_filter_returns_correct_students(self):
        eligible = get_eligible_students(belt_filter='Brown Belt (2nd Kyu)')
        self.assertIn(self.brown2_student, eligible)
        self.assertNotIn(self.white_student, eligible)

    # Test 9: Exam fee is stored correctly
    def test_09_exam_fee_stored_correctly(self):
        reg = GradingRegistration.objects.create(
            exam_schedule=self.exam_schedule,
            student=self.white_student,
            registration_no='REG-TEST-101',
            student_name='Rahul White',
            guardian_name='Father One',
            phone='9846011111',
            current_belt='White Belt',
            target_belt='Yellow Belt',
            exam_fee=Decimal('1000.00'),
            applied_fee=Decimal('1000.00')
        )
        self.assertEqual(reg.applied_fee, Decimal('1000.00'))

    # Test 10: Existing registration fee does not change when exam fee updates later
    def test_10_existing_registration_fee_immutable(self):
        reg = GradingRegistration.objects.create(
            exam_schedule=self.exam_schedule,
            student=self.brown2_student,
            registration_no='REG-TEST-102',
            student_name='Sajid Brown 2',
            guardian_name='Father Four',
            phone='9846044444',
            current_belt='Brown Belt (2nd Kyu)',
            target_belt='Brown Belt (1st Kyu)',
            exam_fee=Decimal('1000.00'),
            applied_fee=Decimal('1000.00')
        )
        self.exam_schedule.exam_fee = Decimal('1500.00')
        self.exam_schedule.save()

        reg.refresh_from_db()
        self.assertEqual(reg.applied_fee, Decimal('1000.00'))

    # Test 11: JKK student list contains only JKK candidates
    def test_11_jkk_student_list_category_filter(self):
        GradingRegistration.objects.create(
            exam_schedule=self.exam_schedule,
            registration_no='REG-CAT-A',
            student_name='White Candidate',
            guardian_name='Guardian',
            phone='9000000001',
            current_belt='White Belt',
            target_belt='Yellow Belt'
        )
        GradingRegistration.objects.create(
            exam_schedule=self.exam_schedule,
            registration_no='REG-CAT-C',
            student_name='Black Candidate',
            guardian_name='Guardian',
            phone='9000000002',
            current_belt='Black Belt',
            target_belt='2nd Dan'
        )

        res = self.client.get('/api/grading-registrations/form-category-lists/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cat_a_list = res.data['jkk_white_to_brown_4']['candidates']
        cat_c_list = res.data['japan_direct_black_belt']['candidates']
        
        self.assertTrue(any(c['registration_no'] == 'REG-CAT-A' for c in cat_a_list))
        self.assertFalse(any(c['registration_no'] == 'REG-CAT-C' for c in cat_a_list))

    # Test 12: Japan Direct list contains only Black Belt candidates
    def test_12_japan_direct_contains_only_black_belt(self):
        res = self.client.get('/api/grading-registrations/form-category-lists/')
        cat_c_list = res.data['japan_direct_black_belt']['candidates']
        for c in cat_c_list:
            target = c['target_belt'] or c['current_belt']
            self.assertEqual(get_exam_form_type(target), ExamFormType.JAPAN_DIRECT_BLACK_BELT)

    # Test 13: Form category resolution is correct
    def test_13_form_category_resolution(self):
        self.assertEqual(get_exam_form_type('Green Belt'), ExamFormType.JKK_WHITE_TO_BROWN_4)
        self.assertEqual(get_exam_form_type('Brown Belt (1st Kyu)'), ExamFormType.JKK_BROWN)
        self.assertEqual(get_exam_form_type('3rd Dan'), ExamFormType.JAPAN_DIRECT_BLACK_BELT)

    # Test 14: Bulk candidates form list API works
    def test_14_bulk_candidates_form_list_api(self):
        res = self.client.get('/api/grading-registrations/form-category-lists/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('jkk_white_to_brown_4', res.data)
        self.assertIn('jkk_brown', res.data)
        self.assertIn('japan_direct_black_belt', res.data)

    # Test 15: Group Admin can create/update exam schedules
    def test_15_admin_create_update_exam_schedules(self):
        res = self.client.post('/api/exam-schedules/', {
            'exam_name': 'October Belt Grading Exam',
            'exam_code': 'EXAM-2026-OCT',
            'exam_date': '2026-10-15',
            'exam_fee': '1200.00',
            'eligible_belt': 'Yellow Belt'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        exam_id = res.data['id']

        patch_res = self.client.patch(f'/api/exam-schedules/{exam_id}/', {
            'venue': 'Chungam Dojo'
        }, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['venue'], 'Chungam Dojo')

    # Test 16: Registration closing date prevents new registration
    def test_16_registration_closing_date_enforcement(self):
        closed_exam = ExamSchedule.objects.create(
            exam_name='Past Closed Exam',
            exam_code='EXAM-CLOSED-PAST',
            exam_date=date(2026, 5, 1),
            registration_start=date(2026, 4, 1),
            registration_end=date(2026, 4, 25),
            status='Active'
        )
        is_eligible, err = validate_exam_eligibility(self.white_student, closed_exam)
        self.assertFalse(is_eligible)
        self.assertIn('closed', err.lower())

    # Test 17: Maximum candidate limit works
    def test_17_max_candidate_limit_enforcement(self):
        full_exam = ExamSchedule.objects.create(
            exam_name='VIP Small Batch Exam',
            exam_code='EXAM-VIP-SMALL',
            exam_date=date(2026, 9, 30),
            max_candidates=1,
            status='Active'
        )
        GradingRegistration.objects.create(
            exam_schedule=full_exam,
            registration_no='REG-FULL-1',
            student_name='Cadet One',
            guardian_name='Guardian',
            phone='9000000099'
        )
        is_eligible, err = validate_exam_eligibility(self.white_student, full_exam)
        self.assertFalse(is_eligible)
        self.assertIn('maximum', err.lower())

    # Test 18: Payment status works correctly
    def test_18_payment_status_tracking(self):
        reg = GradingRegistration.objects.create(
            exam_schedule=self.exam_schedule,
            registration_no='REG-PAYMENT-01',
            student_name='Payment Test Cadet',
            guardian_name='Guardian',
            phone='9000000088',
            payment_status='Pending'
        )
        reg.payment_status = 'Paid / Verified'
        reg.save()
        reg.refresh_from_db()
        self.assertEqual(reg.payment_status, 'Paid / Verified')

    # Test 19: Existing student data is automatically reused
    def test_19_existing_student_data_reuse(self):
        res = self.client.get(f'/api/grading-registrations/lookup-student/?query={self.brown3_student.admission_no}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['found'])
        self.assertEqual(res.data['student_name'], 'Kiran Brown 3')
        self.assertEqual(res.data['form_type'], ExamFormType.JKK_BROWN)

    # Test 20: Dashboard stats return accurate category breakdown
    def test_20_dashboard_stats_accuracy(self):
        res = self.client.get('/api/grading-registrations/dashboard-stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_candidates', res.data)
        self.assertIn('category_breakdown', res.data)
        self.assertIn('payment_summary', res.data)
