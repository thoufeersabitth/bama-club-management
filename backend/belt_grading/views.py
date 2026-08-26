import random
from decimal import Decimal
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import BeltGrading, ExamSchedule, GradingRegistration, ExamFormType
from .serializers import BeltGradingSerializer, ExamScheduleSerializer, GradingRegistrationSerializer
from .services import get_exam_form_type, get_eligible_students, validate_exam_eligibility, calculate_exam_fee
from students.models import Student

class BeltGradingViewSet(viewsets.ModelViewSet):
    queryset = BeltGrading.objects.all().order_by('-exam_date')
    serializer_class = BeltGradingSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.result == 'Pass' and instance.student and instance.target_belt:
            student = instance.student
            student.current_belt = instance.target_belt
            student.save()



class ExamScheduleViewSet(viewsets.ModelViewSet):
    queryset = ExamSchedule.objects.all().order_by('-exam_date', '-created_at')
    serializer_class = ExamScheduleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        belt_param = self.request.query_params.get('belt')
        if status_param:
            qs = qs.filter(status__iexact=status_param)
        if belt_param:
            qs = qs.filter(eligible_belt__icontains=belt_param)
        return qs

    @action(detail=True, methods=['get'], url_path='eligible-students')
    def eligible_students(self, request, pk=None):
        exam = self.get_object()
        eligible_qs = get_eligible_students(exam_schedule=exam)
        data = [{
            'id': str(s.id),
            'admission_no': s.admission_no,
            'name': s.name,
            'current_belt': s.current_belt,
            'target_belt': exam.target_belt or 'Next Kyu/Dan',
            'branch': s.branch.name if s.branch else 'Pulikkal Dojo',
            'phone': s.phone,
            'instructor': s.instructor,
            'form_type': get_exam_form_type(exam.target_belt or exam.eligible_belt)
        } for s in eligible_qs]
        return Response({
            'exam_id': str(exam.id),
            'exam_name': exam.exam_name,
            'eligible_count': len(data),
            'students': data
        })


class GradingRegistrationViewSet(viewsets.ModelViewSet):
    queryset = GradingRegistration.objects.all().order_by('-created_at')
    serializer_class = GradingRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        exam_id = self.request.query_params.get('exam') or self.request.query_params.get('exam_schedule')
        belt = self.request.query_params.get('belt')
        form_type = self.request.query_params.get('form_type')
        payment_status = self.request.query_params.get('payment_status')
        reg_status = self.request.query_params.get('registration_status') or self.request.query_params.get('status')

        if exam_id:
            qs = qs.filter(exam_schedule_id=exam_id)
        if belt:
            qs = qs.filter(models.Q(current_belt__icontains=belt) | models.Q(target_belt__icontains=belt))
        if form_type:
            qs = qs.filter(form_type__iexact=form_type)
        if payment_status:
            qs = qs.filter(payment_status__iexact=payment_status)
        if reg_status:
            qs = qs.filter(registration_status__iexact=reg_status)

        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Resilient student resolution
        student_val = data.get('student')
        if student_val:
            st_obj = None
            try:
                st_obj = Student.objects.filter(id=student_val).first()
            except Exception:
                pass
            if not st_obj:
                st_obj = Student.objects.filter(admission_no__iexact=str(student_val)).first()
            if not st_obj:
                st_obj = Student.objects.filter(name__icontains=str(student_val)).first()
            data['student'] = str(st_obj.id) if st_obj else None
        else:
            data['student'] = None

        # Determine form_type automatically based on target or current belt
        target_belt = data.get('target_belt') or data.get('current_belt') or 'Yellow Belt'
        data['form_type'] = get_exam_form_type(target_belt)

        # Check exam schedule fee if linked
        exam_id = data.get('exam_schedule') or data.get('exam')
        if exam_id:
            try:
                exam = ExamSchedule.objects.get(id=exam_id)
                data['exam_schedule'] = str(exam.id)
                if not data.get('applied_fee'):
                    data['applied_fee'] = str(exam.exam_fee)
                if not data.get('exam_fee'):
                    data['exam_fee'] = str(exam.exam_fee)
            except Exception:
                pass

        if not data.get('applied_fee'):
            data['applied_fee'] = data.get('exam_fee', '1000.00')

        if not data.get('registration_no'):
            rand_num = random.randint(1000, 9999)
            data['registration_no'] = f"EXAM-2026-{rand_num}"
            
        if not data.get('qr_code'):
            data['qr_code'] = f"BAMA-EXAM-QR-{data['registration_no']}"
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['post'], url_path='public-register')
    def public_register(self, request):
        """
        Public endpoint for student exam registration with automatic eligibility validation and data reuse.
        """
        data = request.data.copy()
        student_id = data.get('student_id') or data.get('student')
        query = data.get('admission_no') or data.get('query')

        student = None
        if student_id:
            student = Student.objects.filter(id=student_id).first()
        elif query:
            student = Student.objects.filter(models.Q(admission_no__iexact=query) | models.Q(phone__icontains=query)).first()

        if student:
            data['student'] = str(student.id)
            data['admission_no'] = student.admission_no
            data['student_name'] = data.get('student_name') or student.name
            data['guardian_name'] = data.get('guardian_name') or student.guardian_name
            data['phone'] = data.get('phone') or student.phone
            data['whatsapp'] = data.get('whatsapp') or student.whatsapp or student.phone
            data['address'] = data.get('address') or student.address
            data['branch_name'] = data.get('branch_name') or (student.branch.name if student.branch else 'Pulikkal Dojo')
            data['current_belt'] = student.current_belt

        exam_id = data.get('exam_schedule') or data.get('exam_id')
        exam = None
        if exam_id:
            exam = ExamSchedule.objects.filter(id=exam_id).first()
            if exam:
                data['exam_schedule'] = str(exam.id)
                data['exam_fee'] = str(exam.exam_fee)
                data['applied_fee'] = str(exam.exam_fee)
                
                # Eligibility Validation
                is_eligible, err = validate_exam_eligibility(student or data.get('current_belt', 'White Belt'), exam)
                if not is_eligible:
                    return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        target_belt = data.get('target_belt') or 'Yellow Belt'
        data['form_type'] = get_exam_form_type(target_belt)

        if not data.get('registration_no'):
            rand_num = random.randint(1000, 9999)
            data['registration_no'] = f"EXAM-2026-{rand_num}"

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='form-category-lists')
    def form_category_lists(self, request):
        """
        Returns candidates grouped by the 3 official form categories:
        1. JKK White to Brown-4
        2. JKK Brown-3 to Brown-1
        3. Japan Direct Black Belt
        """
        exam_id = request.query_params.get('exam')
        qs = self.get_queryset()
        if exam_id:
            qs = qs.filter(exam_schedule_id=exam_id)

        cat_a = []
        cat_b = []
        cat_c = []

        for reg in qs:
            data = GradingRegistrationSerializer(reg).data
            target = reg.target_belt or reg.current_belt
            form_cat = get_exam_form_type(target)

            if form_cat == ExamFormType.JAPAN_DIRECT_BLACK_BELT:
                cat_c.append(data)
            elif form_cat == ExamFormType.JKK_BROWN:
                cat_b.append(data)
            else:
                cat_a.append(data)

        return Response({
            'jkk_white_to_brown_4': {
                'count': len(cat_a),
                'form_name': 'JKK White to Brown-4 Application Form',
                'candidates': cat_a
            },
            'jkk_brown': {
                'count': len(cat_b),
                'form_name': 'JKK Brown Kyu Registration Form (Brown-3 to Brown-1)',
                'candidates': cat_b
            },
            'japan_direct_black_belt': {
                'count': len(cat_c),
                'form_name': 'Japan Direct Black Belt Examination Form',
                'candidates': cat_c
            }
        })

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def dashboard_stats(self, request):
        exam_id = request.query_params.get('exam')
        qs = self.get_queryset()
        if exam_id:
            qs = qs.filter(exam_schedule_id=exam_id)

        total_candidates = qs.count()
        cat_a_count = 0
        cat_b_count = 0
        cat_c_count = 0

        paid_count = 0
        pending_payment_count = 0
        partially_paid_count = 0

        total_fee_collected = Decimal('0.00')
        total_fee_expected = Decimal('0.00')

        for reg in qs:
            target = reg.target_belt or reg.current_belt
            form_cat = get_exam_form_type(target)

            if form_cat == ExamFormType.JAPAN_DIRECT_BLACK_BELT:
                cat_c_count += 1
            elif form_cat == ExamFormType.JKK_BROWN:
                cat_b_count += 1
            else:
                cat_a_count += 1

            p_stat = (reg.payment_status or '').lower()
            fee = reg.applied_fee or reg.exam_fee or Decimal('1000.00')
            total_fee_expected += Decimal(str(fee))

            if 'paid' in p_stat and 'part' not in p_stat:
                paid_count += 1
                total_fee_collected += Decimal(str(fee))
            elif 'part' in p_stat:
                partially_paid_count += 1
                total_fee_collected += Decimal(str(fee)) / Decimal('2.0')
            else:
                pending_payment_count += 1

        return Response({
            'total_candidates': total_candidates,
            'category_breakdown': {
                'jkk_white_to_brown_4': cat_a_count,
                'jkk_brown': cat_b_count,
                'japan_direct_black_belt': cat_c_count
            },
            'payment_summary': {
                'paid': paid_count,
                'pending': pending_payment_count,
                'partially_paid': partially_paid_count,
                'total_expected': float(total_fee_expected),
                'total_collected': float(total_fee_collected),
                'total_pending_fee': float(total_fee_expected - total_fee_collected)
            }
        })

    @action(detail=False, methods=['get'], url_path='lookup-student')
    def lookup_student(self, request):
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response({'error': 'Query parameter required'}, status=status.HTTP_400_BAD_REQUEST)
            
        clean_query = query.replace(' ', '').replace('-', '')

        student = Student.objects.filter(
            models.Q(admission_no__icontains=query) | 
            models.Q(admission_no__icontains=clean_query) |
            models.Q(phone__icontains=query) | 
            models.Q(phone__icontains=clean_query) |
            models.Q(name__icontains=query)
        ).first()

        if not student:
            reg = GradingRegistration.objects.filter(
                models.Q(admission_no__icontains=query) | 
                models.Q(admission_no__icontains=clean_query) |
                models.Q(phone__icontains=query) |
                models.Q(student_name__icontains=query)
            ).first()
            if reg:
                target = reg.target_belt or reg.current_belt or 'Yellow Belt'
                form_type = get_exam_form_type(target)
                return Response({
                    'found': True,
                    'student_id': str(reg.student.id) if reg.student else '',
                    'admission_no': reg.admission_no,
                    'student_name': reg.student_name,
                    'gender': reg.gender or 'Male',
                    'dob': str(reg.dob) if reg.dob else '',
                    'age': reg.age or 10,
                    'guardian_name': reg.guardian_name,
                    'relationship': reg.guardian_relationship or 'Father',
                    'phone': reg.phone,
                    'whatsapp': reg.whatsapp or reg.phone,
                    'address': reg.address,
                    'branch_name': reg.branch_name or 'Pulikkal Dojo',
                    'current_belt': reg.current_belt or 'White Belt',
                    'target_belt': target,
                    'form_type': form_type
                })
            return Response({'found': False, 'message': f"No cadet record found matching '{query}'"}, status=status.HTTP_200_OK)

        belt_order = [
            'White Belt', 'Yellow Belt', 'Orange Belt', 'Green Belt',
            'Blue Belt', 'Purple Belt', 'Brown Belt (3rd Kyu)', 'Brown Belt (2nd Kyu)',
            'Brown Belt (1st Kyu)', 'Black Belt (1st Dan)'
        ]
        
        curr = student.current_belt or 'White Belt'
        next_belt = 'Yellow Belt'
        for idx, b in enumerate(belt_order):
            if b.lower() in curr.lower():
                if idx + 1 < len(belt_order):
                    next_belt = belt_order[idx + 1]
                else:
                    next_belt = 'Black Belt (Dan Candidate)'
                break

        form_type = get_exam_form_type(next_belt)

        return Response({
            'found': True,
            'student_id': str(student.id),
            'admission_no': student.admission_no,
            'student_name': student.name,
            'gender': student.gender,
            'dob': student.dob,
            'age': student.age,
            'guardian_name': student.guardian_name,
            'relationship': student.relationship,
            'phone': student.phone,
            'whatsapp': student.whatsapp or student.phone,
            'address': student.address,
            'branch_name': student.branch.name if student.branch else 'Pulikkal Dojo',
            'current_belt': student.current_belt,
            'target_belt': next_belt,
            'form_type': form_type
        })

    @action(detail=True, methods=['patch'], url_path='promote-belt')
    def promote_belt(self, request, pk=None):
        registration = self.get_object()
        exam_result = request.data.get('exam_status', 'Passed')
        
        registration.exam_status = exam_result
        if request.data.get('payment_status'):
            registration.payment_status = request.data.get('payment_status')
        registration.save()

        if exam_result == 'Passed' and registration.student:
            student = registration.student
            student.current_belt = registration.target_belt
            student.save()
            
            BeltGrading.objects.create(
                student=student,
                previous_belt=registration.current_belt,
                target_belt=registration.target_belt,
                exam_date=registration.exam_date or registration.created_at.date(),
                result='Pass',
                examiner=registration.examiner_signature or 'Sensei Abdul Rahman (5th Dan)',
                remarks=f"Promoted via Exam Registration #{registration.registration_no}"
            )

        return Response({
            'status': 'success',
            'message': f"Registration updated. Exam result: {exam_result}",
            'registration': GradingRegistrationSerializer(registration).data
        })
