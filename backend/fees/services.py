import uuid
from decimal import Decimal
from datetime import date
from django.db import transaction
from .models import FeeRateHistory, FeeConfiguration, FeeRecord, FeeStatus, FeeType
from students.models import Student

MONTH_NAME_TO_NUM = {
    'january': 1, 'jan': 1,
    'february': 2, 'feb': 2,
    'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'may': 5,
    'june': 6, 'jun': 6,
    'july': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sept': 9, 'sep': 9,
    'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12
}

NUM_TO_MONTH_NAME = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
    7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
}

def parse_billing_date(month_input, year_input=2026):
    """
    Normalizes month and year input into a date object corresponding to the 1st of that month.
    """
    if isinstance(month_input, date):
        return date(month_input.year, month_input.month, 1)
    
    if isinstance(month_input, int):
        y = int(year_input) if year_input else 2026
        return date(y, month_input, 1)
    
    month_str = str(month_input).strip().lower()
    
    if '-' in month_str:
        parts = month_str.split('-')
        if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
            return date(int(parts[0]), int(parts[1]), 1)
            
    words = month_str.split()
    found_month = None
    found_year = int(year_input) if year_input else 2026
    
    for word in words:
        if word.isdigit() and len(word) == 4:
            found_year = int(word)
        elif word in MONTH_NAME_TO_NUM:
            found_month = MONTH_NAME_TO_NUM[word]
            
    if not found_month:
        for key, val in MONTH_NAME_TO_NUM.items():
            if key in month_str:
                found_month = val
                break
                
    if not found_month:
        found_month = 1
        
    return date(found_year, found_month, 1)


def get_applicable_monthly_fee(billing_month_input=None, year_input=2026, branch=None):
    """
    Finds the applicable monthly fee rate according to the Fallback Hierarchy:
    1. If a specific Branch monthly fee is defined, use it.
    2. Check FeeRateHistory on or before billing date.
    3. Fallback to FeeConfiguration.default_monthly_fee.
    4. Fallback default: Decimal('500.00').
    """
    if branch:
        branch_obj = None
        if hasattr(branch, 'monthly_fee'):
            branch_obj = branch
        elif isinstance(branch, (str, uuid.UUID)):
            from branches.models import Branch
            try:
                b_uuid = uuid.UUID(str(branch).strip())
                branch_obj = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                branch_obj = Branch.objects.filter(code__iexact=str(branch).strip()).first() or Branch.objects.filter(name__iexact=str(branch).strip()).first()
        
        if branch_obj and branch_obj.monthly_fee is not None and branch_obj.monthly_fee > Decimal('0.00'):
            return Decimal(str(branch_obj.monthly_fee))

    billing_date = parse_billing_date(billing_month_input, year_input) if billing_month_input else date.today()
    
    history = FeeRateHistory.objects.filter(
        fee_type=FeeType.MONTHLY,
        is_active=True,
        effective_from__lte=billing_date
    ).order_by('-effective_from', '-created_at').first()
    
    if history:
        return Decimal(str(history.amount))
    
    config = FeeConfiguration.objects.first()
    if config and config.default_monthly_fee:
        return Decimal(str(config.default_monthly_fee))
        
    return Decimal('500.00')


def get_applicable_admission_fee(date_input=None, branch=None):
    """
    Finds the applicable default one-time admission fee according to the Fallback Hierarchy:
    1. If a specific Branch admission fee is defined, use it.
    2. Check FeeRateHistory on or before target date.
    3. Fallback to FeeConfiguration.default_admission_fee.
    4. Fallback default: Decimal('1000.00').
    """
    if branch:
        branch_obj = None
        if hasattr(branch, 'admission_fee'):
            branch_obj = branch
        elif isinstance(branch, (str, uuid.UUID)):
            from branches.models import Branch
            try:
                b_uuid = uuid.UUID(str(branch).strip())
                branch_obj = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                branch_obj = Branch.objects.filter(code__iexact=str(branch).strip()).first() or Branch.objects.filter(name__iexact=str(branch).strip()).first()
        
        if branch_obj and branch_obj.admission_fee is not None and branch_obj.admission_fee > Decimal('0.00'):
            return Decimal(str(branch_obj.admission_fee))

    target_date = date_input or date.today()
    if isinstance(target_date, str):
        target_date = parse_billing_date(target_date)
        
    history = FeeRateHistory.objects.filter(
        fee_type=FeeType.ADMISSION,
        is_active=True,
        effective_from__lte=target_date
    ).order_by('-effective_from', '-created_at').first()
    
    if history:
        return Decimal(str(history.amount))
        
    config = FeeConfiguration.objects.first()
    if config and config.default_admission_fee:
        return Decimal(str(config.default_admission_fee))
        
    return Decimal('1000.00')


def set_new_fee_rate(fee_type, amount, effective_from=None, note='', update_config=True):
    """
    Atomically creates or updates a fee rate history record and updates FeeConfiguration.
    Validates amounts and effective dates.
    """
    amount_dec = Decimal(str(amount))
    if amount_dec <= Decimal('0.00'):
        raise ValueError("Fee amount must be greater than zero.")
        
    if not effective_from:
        effective_date = date.today()
    elif isinstance(effective_from, str):
        effective_date = parse_billing_date(effective_from)
    else:
        effective_date = effective_from

    with transaction.atomic():
        rate_record, _ = FeeRateHistory.objects.update_or_create(
            fee_type=fee_type,
            effective_from=effective_date,
            defaults={
                'amount': amount_dec,
                'is_active': True,
                'note': note or f"Rate updated to {amount_dec}"
            }
        )
        
        if update_config:
            config, _ = FeeConfiguration.objects.get_or_create(
                id=uuid.UUID('00000000-0000-0000-0000-000000000001'),
                defaults={'default_monthly_fee': amount_dec}
            )
            if fee_type == FeeType.MONTHLY:
                config.default_monthly_fee = amount_dec
                config.effective_month = effective_date.strftime('%B %Y')
            elif fee_type == FeeType.ADMISSION:
                config.default_admission_fee = amount_dec
            config.save()
            
    return rate_record


def generate_monthly_invoice(student, month_str, year=2026):
    """
    Generates a monthly invoice for a cadet for a specific month and year if it doesn't already exist.
    If invoice already exists, returns existing invoice WITHOUT overwriting its historical base amount.
    """
    billing_date = parse_billing_date(month_str, year)
    month_name = NUM_TO_MONTH_NAME.get(billing_date.month, str(month_str).capitalize())
    
    existing = FeeRecord.objects.filter(
        student=student,
        month__iexact=month_name,
        year=billing_date.year
    ).first()
    
    if existing:
        return existing, False
        
    applicable_rate = get_applicable_monthly_fee(billing_date, year, branch=student.branch)
    receipt_no = f"REC-{student.admission_no}-{billing_date.year}-{billing_date.month:02d}"
    
    invoice = FeeRecord.objects.create(
        student=student,
        month=month_name,
        year=billing_date.year,
        amount=applicable_rate,
        paid_amount=Decimal('0.00'),
        discount=Decimal('0.00'),
        pending_amount=applicable_rate,
        status=FeeStatus.UNPAID,
        receipt_no=receipt_no
    )
    
    return invoice, True

