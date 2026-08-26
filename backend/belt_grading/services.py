from decimal import Decimal
from django.db import models
from students.models import Student
from .models import ExamFormType, ExamSchedule, GradingRegistration

def get_exam_form_type(belt_rank):
    """
    Centralized mapping of belt/rank to official examination form category:
    - JKK_WHITE_TO_BROWN_4: White, Yellow, Orange, Green, Blue, Purple, Brown-4
    - JKK_BROWN: Brown-3, Brown-2, Brown-1
    - JAPAN_DIRECT_BLACK_BELT: Black Belt, Dan levels (1st Dan, 2nd Dan, etc.)
    """
    b = str(belt_rank or '').strip().lower()

    if any(k in b for k in ['black', 'dan', 'shodan', 'nidan', 'sandan', 'yondan', 'godan']):
        return ExamFormType.JAPAN_DIRECT_BLACK_BELT

    if any(k in b for k in ['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu']):
        return ExamFormType.JKK_BROWN

    return ExamFormType.JKK_WHITE_TO_BROWN_4


def get_eligible_students(belt_filter=None, exam_schedule=None):
    """
    Returns queryset of students eligible for the specified belt or exam schedule.
    """
    queryset = Student.objects.filter(status='Active')
    target_belt = belt_filter

    if exam_schedule:
        if isinstance(exam_schedule, str):
            try:
                exam_schedule = ExamSchedule.objects.get(id=exam_schedule)
            except Exception:
                exam_schedule = None

        if exam_schedule and exam_schedule.eligible_belt and exam_schedule.eligible_belt.lower() != 'all belts':
            target_belt = exam_schedule.eligible_belt

    if target_belt and str(target_belt).strip() and str(target_belt).lower() != 'all belts':
        b_clean = str(target_belt).strip().lower()
        queryset = queryset.filter(
            models.Q(current_belt__icontains=b_clean) | models.Q(current_belt__iexact=b_clean)
        )

    return queryset


def validate_exam_eligibility(student_or_belt, exam_schedule):
    """
    Validates whether a student or belt rank is eligible for an exam schedule.
    Returns (is_eligible, error_message).
    """
    if not exam_schedule:
        return True, ""

    if isinstance(exam_schedule, str):
        try:
            exam_schedule = ExamSchedule.objects.get(id=exam_schedule)
        except Exception:
            return False, "Invalid examination schedule."

    if exam_schedule.status not in ['Active', 'Draft']:
        return False, f"Registration for this exam is currently {exam_schedule.status.lower()}."

    if exam_schedule.registration_end:
        from django.utils import timezone
        today = timezone.now().date()
        if today > exam_schedule.registration_end:
            return False, f"Registration closed on {exam_schedule.registration_end}."

    if exam_schedule.eligible_belt and exam_schedule.eligible_belt.lower() != 'all belts':
        cadet_belt = str(student_or_belt.current_belt if hasattr(student_or_belt, 'current_belt') else student_or_belt).strip().lower()
        allowed_belt = str(exam_schedule.eligible_belt).strip().lower()
        if allowed_belt not in cadet_belt and cadet_belt not in allowed_belt:
            return False, f"This exam is restricted to {exam_schedule.eligible_belt} candidates only."

    if exam_schedule.max_candidates > 0:
        current_count = GradingRegistration.objects.filter(exam_schedule=exam_schedule).count()
        if current_count >= exam_schedule.max_candidates:
            return False, "Maximum candidate capacity reached for this examination."

    return True, ""


def calculate_exam_fee(exam_schedule):
    """
    Returns applied examination fee for the schedule.
    """
    if not exam_schedule:
        return Decimal('1000.00')
    if isinstance(exam_schedule, str):
        try:
            exam_schedule = ExamSchedule.objects.get(id=exam_schedule)
        except Exception:
            return Decimal('1000.00')
    return Decimal(str(exam_schedule.exam_fee))
