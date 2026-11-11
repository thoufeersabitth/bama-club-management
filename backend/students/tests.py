from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from branches.models import Branch
from students.models import Student
from accounts.models import User, UserRole

class StudentBranchTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.pulikkal = Branch.objects.create(
            name='Pulikkal Branch (Head Office)',
            code='BAMA-DOJO-01',
            address='Pulikkal',
            phone='9544085442',
            is_head_office=True
        )
        self.chungam = Branch.objects.create(
            name='Chungam Branch Dojo',
            code='BAMA-DOJO-02',
            address='Chungam',
            phone='9847122334',
            monthly_fee=Decimal('750.00'),
            admission_fee=Decimal('1500.00')
        )
        self.mongam = Branch.objects.create(
            name='Mongam Branch Dojo',
            code='BAMA-DOJO-03',
            address='Mongam',
            phone='9745067890'
        )

        # Create Branch Admin user
        self.chungam_admin = User.objects.create_user(
            username='chungam_admin',
            password='password123',
            role=UserRole.BRANCH_ADMIN,
            assigned_branch_id=str(self.chungam.id)
        )

    def test_student_creation_with_branch_uuid(self):
        payload = {
            'admission_no': 'BAMA-2026-CH01',
            'name': 'Rahul VK',
            'guardian_name': 'Vinod',
            'phone': '9847012345',
            'branch': str(self.chungam.id),
            'fee_amount': 750.00
        }
        res = self.client.post('/api/students/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data['branch'], str(self.chungam.id))
        self.assertEqual(data['branch_name'], 'Chungam Branch Dojo')

    def test_student_creation_with_branch_name_string_mismatch(self):
        payload = {
            'admission_no': 'BAMA-2026-CH02',
            'name': 'Fathima',
            'guardian_name': 'Ali',
            'phone': '9847055566',
            'branch': 'Chungam Branch',
            'fee_amount': 750.00
        }
        res = self.client.post('/api/students/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data['branch'], str(self.chungam.id))
        self.assertEqual(data['branch_name'], 'Chungam Branch Dojo')

    def test_branch_filtering_query(self):
        s1 = Student.objects.create(
            admission_no='BAMA-P01',
            name='Student Pulikkal',
            branch=self.pulikkal,
            phone='9000000001'
        )
        s2 = Student.objects.create(
            admission_no='BAMA-C01',
            name='Student Chungam',
            branch=self.chungam,
            phone='9000000002'
        )

        # Filter by Chungam Branch UUID
        res = self.client.get(f'/api/students/?branch={self.chungam.id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()
        if isinstance(results, dict) and 'results' in results:
            results = results['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['admission_no'], 'BAMA-C01')

        # Filter by string name "Chungam Branch"
        res_name = self.client.get('/api/students/?branch=Chungam Branch')
        self.assertEqual(res_name.status_code, status.HTTP_200_OK)
        results_name = res_name.json()
        if isinstance(results_name, dict) and 'results' in results_name:
            results_name = results_name['results']
        self.assertEqual(len(results_name), 1)
        self.assertEqual(results_name[0]['admission_no'], 'BAMA-C01')

    def test_rbac_superadmin_and_branch_staff_cross_visibility(self):
        # 1. Superadmin user
        super_admin = User.objects.create_superuser(
            username='super_admin',
            password='password123',
            email='admin@bama.org'
        )

        # 2. Mongam branch admin
        mongam_admin = User.objects.create_user(
            username='mongam_admin',
            password='password123',
            role=UserRole.BRANCH_ADMIN,
            assigned_branch_id=str(self.mongam.id)
        )

        # Superadmin creates student in Chungam
        self.client.force_authenticate(user=super_admin)
        res_create = self.client.post('/api/students/', {
            'admission_no': 'BAMA-2026-CH03',
            'name': 'Superadmin Added Chungam Cadet',
            'guardian_name': 'Karim P',
            'phone': '9847111222',
            'branch': str(self.chungam.id)
        }, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)

        # Chungam Admin logs in and fetches students -> MUST SEE THIS CADET!
        self.client.force_authenticate(user=self.chungam_admin)
        res_chungam = self.client.get('/api/students/')
        self.assertEqual(res_chungam.status_code, status.HTTP_200_OK)
        ch_results = res_chungam.json()
        if isinstance(ch_results, dict) and 'results' in ch_results:
            ch_results = ch_results['results']
        self.assertTrue(any(s['admission_no'] == 'BAMA-2026-CH03' for s in ch_results))

        # Mongam Admin logs in and fetches students -> MUST NOT SEE CHUNGAM CADET!
        self.client.force_authenticate(user=mongam_admin)
        res_mongam = self.client.get('/api/students/')
        self.assertEqual(res_mongam.status_code, status.HTTP_200_OK)
        mg_results = res_mongam.json()
        if isinstance(mg_results, dict) and 'results' in mg_results:
            mg_results = mg_results['results']
        self.assertFalse(any(s['admission_no'] == 'BAMA-2026-CH03' for s in mg_results))

        # Chungam Admin creates student -> automatically belongs to Chungam
        self.client.force_authenticate(user=self.chungam_admin)
        res_ch_create = self.client.post('/api/students/', {
            'admission_no': 'BAMA-2026-CH04',
            'name': 'Chungam Staff Added Cadet',
            'guardian_name': 'Salma K',
            'phone': '9847333444'
        }, format='json')
        self.assertEqual(res_ch_create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_ch_create.json()['branch'], str(self.chungam.id))

        # Superadmin fetches All Branches -> MUST SEE BOTH!
        self.client.force_authenticate(user=super_admin)
        res_all = self.client.get('/api/students/')
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        all_results = res_all.json()
        if isinstance(all_results, dict) and 'results' in all_results:
            all_results = all_results['results']
        self.assertTrue(any(s['admission_no'] == 'BAMA-2026-CH04' for s in all_results))
        self.assertTrue(any(s['admission_no'] == 'BAMA-2026-CH03' for s in all_results))

    def test_cadet_belt_promotion(self):
        cadet = Student.objects.create(
            admission_no='BAMA-TEST-PROM',
            name='Promotion Candidate',
            branch=self.pulikkal,
            phone='9847999888',
            current_belt='White Belt'
        )

        res = self.client.post(f'/api/students/{cadet.id}/promote/', {
            'target_belt': 'Yellow Belt',
            'examiner': 'Sensei Abdul Rahman (5th Dan)',
            'exam_date': '2026-08-26',
            'remarks': 'Outstanding performance in Kihon & Kata'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['student']['current_belt'], 'Yellow Belt')
        
        # Verify student record in DB
        cadet.refresh_from_db()
        self.assertEqual(cadet.current_belt, 'Yellow Belt')

        # Verify BeltGrading record created in DB
        from belt_grading.models import BeltGrading
        grading = BeltGrading.objects.filter(student=cadet).first()
        self.assertIsNotNone(grading)
        self.assertEqual(grading.previous_belt, 'White Belt')
        self.assertEqual(grading.target_belt, 'Yellow Belt')
        self.assertEqual(grading.result, 'Pass')

    def test_partial_patch_preserves_admission_no_and_branch(self):
        cadet = Student.objects.create(
            admission_no='BAMA-2026-KEEP',
            name='Shift Change Cadet',
            branch=self.chungam,
            phone='9847000111',
            shift='Evening Batch',
            address='Real House, Chungam'
        )
        res = self.client.patch(f'/api/students/{cadet.id}/', {
            'shift': 'Morning Batch'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cadet.refresh_from_db()
        self.assertEqual(cadet.admission_no, 'BAMA-2026-KEEP')
        self.assertEqual(cadet.branch_id, self.chungam.id)
        self.assertEqual(cadet.shift, 'Morning Batch')
        self.assertEqual(cadet.address, 'Real House, Chungam')

    def test_dob_validation_and_auto_age(self):
        import datetime
        cadet = Student.objects.create(
            admission_no='BAMA-2026-DOB1',
            name='DOB Guard Cadet',
            branch=self.pulikkal,
            phone='9847000222',
            age=15
        )
        # Out-of-range year like 0011-06-05 must be rejected
        bad_res = self.client.patch(f'/api/students/{cadet.id}/', {
            'dob': '0011-06-05'
        }, format='json')
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Future DOB must be rejected
        future_dob = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
        future_res = self.client.patch(f'/api/students/{cadet.id}/', {
            'dob': future_dob
        }, format='json')
        self.assertEqual(future_res.status_code, status.HTTP_400_BAD_REQUEST)

        # DD/MM/YYYY format works and recalculates age automatically
        good_res = self.client.patch(f'/api/students/{cadet.id}/', {
            'dob': '01/05/2020'
        }, format='json')
        self.assertEqual(good_res.status_code, status.HTTP_200_OK)
        cadet.refresh_from_db()
        self.assertEqual(cadet.dob, datetime.date(2020, 5, 1))
        expected_age = datetime.date.today().year - 2020 - (
            (datetime.date.today().month, datetime.date.today().day) < (5, 1)
        )
        self.assertEqual(cadet.age, expected_age)

        # Clearing DOB with empty string converts cleanly to None
        clear_res = self.client.patch(f'/api/students/{cadet.id}/', {
            'dob': ''
        }, format='json')
        self.assertEqual(clear_res.status_code, status.HTTP_200_OK)
        cadet.refresh_from_db()
        self.assertIsNone(cadet.dob)

    def test_placeholder_keyboard_mash_protection(self):
        cadet = Student.objects.create(
            admission_no='BAMA-2026-ADDR1',
            name='Address Protection Cadet',
            branch=self.pulikkal,
            phone='9847000333',
            address='Aramthodi(H) kottappuram, Andiyoor kunnu (po)',
            guardian_name='Abdu Rafeeq TA'
        )
        for bad_val in ['SDFGHJK', 'TYWEYGYFYYG', 'FRDDUYJHILYYURTRED', 'Chvchcccy', 'N/A', 'FGHJ']:
            res = self.client.patch(f'/api/students/{cadet.id}/', {
                'address': bad_val
            }, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, msg=f'Should reject {bad_val}')

        res_bad_guard = self.client.patch(f'/api/students/{cadet.id}/', {
            'guardian_name': 'DFGHJK'
        }, format='json')
        self.assertEqual(res_bad_guard.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid Kerala names, initials, and addresses with acronyms must succeed
        for good_addr, good_guard in [
            ('NEAR GHSS PULIKKAL, Malappuram', 'Vyshnav K.P'),
            ('Cheruthadathil (H) Muthuvallur PO', 'Prashanthi k'),
            ('Pulikkal House, Kondotty', 'ASHWJITH T.A'),
        ]:
            ok_res = self.client.patch(f'/api/students/{cadet.id}/', {
                'address': good_addr,
                'guardian_name': good_guard
            }, format='json')
            self.assertEqual(ok_res.status_code, status.HTTP_200_OK, msg=f'Should accept {good_addr} / {good_guard}')

    def test_phone_and_generic_guardian_protection(self):
        cadet = Student.objects.create(
            admission_no='BAMA-2026-PH01',
            name='Phone Protection Cadet',
            branch=self.pulikkal,
            phone='9847123456',
            guardian_name='Kareem P'
        )
        for bad_phone in ['+91 9544085442', '9544085442', '9', '99388559290', '0000000000', '1234567890']:
            res = self.client.patch(f'/api/students/{cadet.id}/', {'phone': bad_phone}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, msg=f'Should reject phone {bad_phone}')

        res_wa = self.client.patch(f'/api/students/{cadet.id}/', {'whatsapp': '9'}, format='json')
        self.assertEqual(res_wa.status_code, status.HTTP_400_BAD_REQUEST)

        for bad_guard in ['Paren', 'Parent', 'Father', 'Mother', 'Guardian']:
            res_g = self.client.patch(f'/api/students/{cadet.id}/', {'guardian_name': bad_guard}, format='json')
            self.assertEqual(res_g.status_code, status.HTTP_400_BAD_REQUEST, msg=f'Should reject guardian {bad_guard}')

        # Clearing stale corrupt values and setting valid domestic/international phones must succeed
        res_clear = self.client.patch(f'/api/students/{cadet.id}/', {
            'phone': '',
            'whatsapp': '',
            'guardian_name': '',
            'address': ''
        }, format='json')
        self.assertEqual(res_clear.status_code, status.HTTP_200_OK)

        for ok_phone in ['9847012345', '+91 98470 12345', '09847012345', '+971501234567']:
            ok_res = self.client.patch(f'/api/students/{cadet.id}/', {'phone': ok_phone}, format='json')
            self.assertEqual(ok_res.status_code, status.HTTP_200_OK, msg=f'Should accept {ok_phone}')



