from decimal import Decimal
from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from students.models import Student
from fees.models import FeeRecord, FeeRateHistory, FeeConfiguration, FeeStatus, FeeType
from fees.services import (
    get_applicable_monthly_fee,
    get_applicable_admission_fee,
    set_new_fee_rate,
    generate_monthly_invoice
)

class FeeRateManagementTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Initialize default historical fee rates (Base rate ₹500 effective before Sept 2026)
        set_new_fee_rate(
            fee_type=FeeType.MONTHLY,
            amount=Decimal('500.00'),
            effective_from=date(2026, 1, 1),
            note='Initial historical rate'
        )
        set_new_fee_rate(
            fee_type=FeeType.ADMISSION,
            amount=Decimal('2000.00'),
            effective_from=date(2026, 1, 1),
            note='Initial admission rate'
        )
        
        self.cadet_a = Student.objects.create(
            admission_no='BAMA-TEST-001',
            name='Test Cadet A',
            phone='9846000001',
            fee_amount=Decimal('500.00'),
            initial_paid_amount=Decimal('0.00'),
            pending_amount=Decimal('500.00'),
            fee_status='Pending'
        )
        
        self.cadet_b = Student.objects.create(
            admission_no='BAMA-TEST-002',
            name='Test Cadet B',
            phone='9846000002',
            fee_amount=Decimal('500.00'),
            initial_paid_amount=Decimal('0.00'),
            pending_amount=Decimal('500.00'),
            fee_status='Pending'
        )

    def test_scenario_1_applicable_fee_by_month(self):
        """
        TEST 1:
        Current fee = ₹500
        Effective new rate = ₹1000 from September 2026
        August invoice: ₹500
        September invoice: ₹1000
        """
        set_new_fee_rate(
            fee_type=FeeType.MONTHLY,
            amount=Decimal('1000.00'),
            effective_from=date(2026, 9, 1),
            note='Fee hike for Sept 2026'
        )

        aug_rate = get_applicable_monthly_fee('August', 2026)
        sept_rate = get_applicable_monthly_fee('September', 2026)

        self.assertEqual(aug_rate, Decimal('500.00'))
        self.assertEqual(sept_rate, Decimal('1000.00'))

        inv_aug, _ = generate_monthly_invoice(self.cadet_a, 'August', 2026)
        inv_sept, _ = generate_monthly_invoice(self.cadet_a, 'September', 2026)

        self.assertEqual(inv_aug.amount, Decimal('500.00'))
        self.assertEqual(inv_sept.amount, Decimal('1000.00'))

    def test_scenario_2_historical_invoice_immutability(self):
        """
        TEST 2:
        August invoice already generated for ₹500.
        Change default to ₹1000 from September.
        August invoice must remain ₹500.
        """
        inv_aug, _ = generate_monthly_invoice(self.cadet_a, 'August', 2026)
        self.assertEqual(inv_aug.amount, Decimal('500.00'))

        set_new_fee_rate(
            fee_type=FeeType.MONTHLY,
            amount=Decimal('1000.00'),
            effective_from=date(2026, 9, 1)
        )

        # Refresh invoice from DB and verify base amount is untouched
        inv_aug.refresh_from_db()
        self.assertEqual(inv_aug.amount, Decimal('500.00'))

    def test_scenario_3_pending_amount_calculation(self):
        """
        TEST 3:
        August pending = ₹500, September pending = ₹1000.
        """
        set_new_fee_rate(
            fee_type=FeeType.MONTHLY,
            amount=Decimal('1000.00'),
            effective_from=date(2026, 9, 1)
        )

        inv_aug, _ = generate_monthly_invoice(self.cadet_a, 'August', 2026)
        inv_sept, _ = generate_monthly_invoice(self.cadet_a, 'September', 2026)

        self.assertEqual(inv_aug.pending_amount, Decimal('500.00'))
        self.assertEqual(inv_sept.pending_amount, Decimal('1000.00'))

    def test_scenario_4_partial_payment(self):
        """
        TEST 4:
        September paid ₹500.
        Fee = ₹1000, Paid = ₹500, Pending = ₹500, Status = Partial
        """
        set_new_fee_rate(
            fee_type=FeeType.MONTHLY,
            amount=Decimal('1000.00'),
            effective_from=date(2026, 9, 1)
        )

        inv_sept, _ = generate_monthly_invoice(self.cadet_a, 'September', 2026)
        inv_sept.paid_amount = Decimal('500.00')
        inv_sept.save()

        self.assertEqual(inv_sept.amount, Decimal('1000.00'))
        self.assertEqual(inv_sept.paid_amount, Decimal('500.00'))
        self.assertEqual(inv_sept.pending_amount, Decimal('500.00'))
        self.assertEqual(inv_sept.status, FeeStatus.PARTIAL)

    def test_scenario_5_full_payment(self):
        """
        TEST 5:
        October paid fully ₹1000.
        Pending = ₹0, Status = Paid
        """
        set_new_fee_rate(
            fee_type=FeeType.MONTHLY,
            amount=Decimal('1000.00'),
            effective_from=date(2026, 9, 1)
        )

        inv_oct, _ = generate_monthly_invoice(self.cadet_a, 'October', 2026)
        inv_oct.paid_amount = Decimal('1000.00')
        inv_oct.save()

        self.assertEqual(inv_oct.pending_amount, Decimal('0.00'))
        self.assertEqual(inv_oct.status, FeeStatus.PAID)

    def test_scenario_6_new_admission_fee_change(self):
        """
        TEST 6:
        New admission after admission fee changes.
        New admission gets new default admission fee. Old admission remains unchanged.
        """
        old_adm_fee = get_applicable_admission_fee(date(2026, 8, 1))
        self.assertEqual(old_adm_fee, Decimal('2000.00'))

        set_new_fee_rate(
            fee_type=FeeType.ADMISSION,
            amount=Decimal('2500.00'),
            effective_from=date(2026, 9, 1)
        )

        new_adm_fee = get_applicable_admission_fee(date(2026, 9, 1))
        self.assertEqual(new_adm_fee, Decimal('2500.00'))

        past_adm_fee = get_applicable_admission_fee(date(2026, 8, 1))
        self.assertEqual(past_adm_fee, Decimal('2000.00'))

    def test_scenario_7_multiple_fee_rate_stepped_history(self):
        """
        TEST 7:
        Changing monthly default again:
        September 2026 → ₹1000
        January 2027 → ₹1200

        Expected:
        August 2026 = ₹500
        September 2026 = ₹1000
        October 2026 = ₹1000
        November 2026 = ₹1000
        December 2026 = ₹1000
        January 2027 = ₹1200
        """
        set_new_fee_rate(FeeType.MONTHLY, Decimal('1000.00'), date(2026, 9, 1))
        set_new_fee_rate(FeeType.MONTHLY, Decimal('1200.00'), date(2027, 1, 1))

        self.assertEqual(get_applicable_monthly_fee('August', 2026), Decimal('500.00'))
        self.assertEqual(get_applicable_monthly_fee('September', 2026), Decimal('1000.00'))
        self.assertEqual(get_applicable_monthly_fee('October', 2026), Decimal('1000.00'))
        self.assertEqual(get_applicable_monthly_fee('November', 2026), Decimal('1000.00'))
        self.assertEqual(get_applicable_monthly_fee('December', 2026), Decimal('1000.00'))
        self.assertEqual(get_applicable_monthly_fee('January', 2027), Decimal('1200.00'))

    def test_scenario_8_filters_and_reports(self):
        """
        TEST 8:
        Filters and reports return exact historical amounts.
        """
        set_new_fee_rate(FeeType.MONTHLY, Decimal('1000.00'), date(2026, 9, 1))

        inv_aug, _ = generate_monthly_invoice(self.cadet_a, 'August', 2026)
        inv_sept, _ = generate_monthly_invoice(self.cadet_a, 'September', 2026)

        response_aug = self.client.get('/api/fees/?month=August&year=2026')
        self.assertEqual(response_aug.status_code, status.HTTP_200_OK)
        results_aug = response_aug.json()
        if isinstance(results_aug, dict) and 'results' in results_aug:
            results_aug = results_aug['results']
        self.assertEqual(float(results_aug[0]['amount']), 500.0)

        response_sept = self.client.get('/api/fees/?month=September&year=2026')
        self.assertEqual(response_sept.status_code, status.HTTP_200_OK)
        results_sept = response_sept.json()
        if isinstance(results_sept, dict) and 'results' in results_sept:
            results_sept = results_sept['results']
        self.assertEqual(float(results_sept[0]['amount']), 1000.0)

    def test_scenario_9_multiple_active_cadets(self):
        """
        TEST 9:
        Multiple active cadets each use the correct applicable rate.
        """
        set_new_fee_rate(FeeType.MONTHLY, Decimal('1000.00'), date(2026, 9, 1))

        inv_a, _ = generate_monthly_invoice(self.cadet_a, 'September', 2026)
        inv_b, _ = generate_monthly_invoice(self.cadet_b, 'September', 2026)

        self.assertEqual(inv_a.amount, Decimal('1000.00'))
        self.assertEqual(inv_b.amount, Decimal('1000.00'))

    def test_scenario_10_unpaid_historical_invoice_remains_unchanged(self):
        """
        TEST 10:
        Existing unpaid historical invoice must NOT change after a future fee update.
        """
        inv_aug, _ = generate_monthly_invoice(self.cadet_a, 'August', 2026)
        self.assertEqual(inv_aug.status, FeeStatus.UNPAID)
        self.assertEqual(inv_aug.amount, Decimal('500.00'))

        # Change rate in November
        set_new_fee_rate(FeeType.MONTHLY, Decimal('1500.00'), date(2026, 11, 1))

        inv_aug.refresh_from_db()
        self.assertEqual(inv_aug.amount, Decimal('500.00'))
        self.assertEqual(inv_aug.pending_amount, Decimal('500.00'))
        self.assertEqual(inv_aug.status, FeeStatus.UNPAID)

    def test_scenario_11_branch_fee_override_and_fallback(self):
        """
        TEST 11:
        Branch-specific fee override vs Global default fallback hierarchy:
        1. If branch has monthly_fee / admission_fee, use it.
        2. Otherwise fallback to global configuration.
        """
        from branches.models import Branch

        branch_custom = Branch.objects.create(
            name='Feroke Custom Fee Branch',
            code='BAMA-DOJO-FEROKE',
            address='Feroke',
            phone='9847000000',
            monthly_fee=Decimal('750.00'),
            admission_fee=Decimal('1800.00')
        )
        branch_default = Branch.objects.create(
            name='Regular Branch',
            code='BAMA-DOJO-REGULAR',
            address='Calicut',
            phone='9847000001'
        )

        # 1. Custom branch uses custom rates
        custom_monthly = get_applicable_monthly_fee(branch=branch_custom)
        custom_adm = get_applicable_admission_fee(branch=branch_custom)
        self.assertEqual(custom_monthly, Decimal('750.00'))
        self.assertEqual(custom_adm, Decimal('1800.00'))

        # 2. Regular branch falls back to global default
        default_monthly = get_applicable_monthly_fee(branch=branch_default)
        default_adm = get_applicable_admission_fee(branch=branch_default)
        self.assertEqual(default_monthly, Decimal('500.00'))
        self.assertEqual(default_adm, Decimal('2000.00'))

        # 3. Applicable rate API endpoint returns branch rates
        res_custom = self.client.get(f'/api/fees/applicable-rate/?branch={branch_custom.id}')
        self.assertEqual(res_custom.status_code, status.HTTP_200_OK)
        self.assertEqual(res_custom.json()['applicable_monthly_fee'], 750.0)
        self.assertEqual(res_custom.json()['applicable_admission_fee'], 1800.0)

