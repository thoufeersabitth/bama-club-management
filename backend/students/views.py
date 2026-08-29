import uuid
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Student
from .serializers import StudentSerializer
from branches.models import Branch
from fees.services import get_applicable_monthly_fee, get_applicable_admission_fee

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('-created_at')
    serializer_class = StudentSerializer
    permission_classes = [permissions.AllowAny]

    def _resolve_branch(self, branch_input):
        if not branch_input:
            return None
        if isinstance(branch_input, Branch):
            return branch_input
        try:
            b_uuid = uuid.UUID(str(branch_input).strip())
            b_obj = Branch.objects.filter(id=b_uuid).first()
            if b_obj:
                return b_obj
        except (ValueError, TypeError, AttributeError):
            pass

        b_str = str(branch_input).strip()
        b_obj = Branch.objects.filter(code__iexact=b_str).first()
        if b_obj:
            return b_obj

        b_obj = Branch.objects.filter(name__iexact=b_str).first()
        if b_obj:
            return b_obj

        b_lower = b_str.lower()
        if 'chungam' in b_lower or b_lower == '2' or 'dojo-02' in b_lower:
            return Branch.objects.filter(name__icontains='chungam').first()
        elif 'mongam' in b_lower or b_lower == '3' or 'dojo-03' in b_lower:
            return Branch.objects.filter(name__icontains='mongam').first()
        elif 'feroke' in b_lower or b_lower == '4':
            return Branch.objects.filter(name__icontains='feroke').first()
        elif 'pulikkal' in b_lower or b_lower == '1' or 'dojo-01' in b_lower:
            return Branch.objects.filter(name__icontains='pulikkal').first()
        return Branch.objects.filter(name__icontains=b_str).first()

    def get_queryset(self):
        queryset = Student.objects.all().select_related('branch').order_by('-created_at')
        branch_param = self.request.query_params.get('branch', None) or self.request.query_params.get('branch_id', None)
        belt = self.request.query_params.get('belt', None)
        shift_param = self.request.query_params.get('shift', None)
        search = self.request.query_params.get('search', None)

        user = self.request.user if self.request.user and self.request.user.is_authenticated else None

        # RBAC Check:
        # If user is BRANCH_ADMIN or INSTRUCTOR or STAFF, strictly enforce their assigned branch!
        if user and getattr(user, 'role', None) in ['BRANCH_ADMIN', 'INSTRUCTOR', 'STAFF'] and not getattr(user, 'is_super_admin', False):
            target_branch = user.assigned_branch
            if target_branch:
                queryset = queryset.filter(branch=target_branch)
            elif user.assigned_branch_id:
                queryset = queryset.filter(branch_id=user.assigned_branch_id)
        elif branch_param and str(branch_param).lower() != 'all':
            # Super Admin filtering by a specific branch
            target_branch = self._resolve_branch(branch_param)
            if target_branch:
                queryset = queryset.filter(branch=target_branch)
            else:
                queryset = queryset.filter(branch_id=branch_param)

        if belt and belt.upper() != 'ALL':
            queryset = queryset.filter(current_belt__iexact=belt)
        if shift_param and shift_param.upper() != 'ALL':
            queryset = queryset.filter(shift__icontains=shift_param)
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(admission_no__icontains=search) |
                models.Q(phone__icontains=search) |
                models.Q(guardian_name__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        
        assigned_branch = None
        if user and getattr(user, 'role', None) in ['BRANCH_ADMIN', 'INSTRUCTOR', 'STAFF'] and not getattr(user, 'is_super_admin', False):
            assigned_branch = user.assigned_branch

        student = serializer.save(branch=assigned_branch) if assigned_branch else serializer.save()

        # Automatically generate initial FeeRecord for joining month
        try:
            from fees.models import FeeRecord
            from decimal import Decimal
            from django.utils import timezone
            now = timezone.now()
            month_name = now.strftime('%B')
            year_num = now.year
            fee_amt = Decimal(str(student.fee_amount or 500))
            init_paid = Decimal(str(student.initial_paid_amount or 0))
            pending = max(Decimal('0.00'), fee_amt - init_paid)
            f_status = 'Paid' if pending == Decimal('0.00') else ('Partial' if init_paid > 0 else 'Unpaid')

            FeeRecord.objects.get_or_create(
                student=student,
                month=month_name,
                year=year_num,
                defaults={
                    'amount': fee_amt,
                    'paid_amount': init_paid,
                    'pending_amount': pending,
                    'status': f_status,
                    'receipt_no': f"REC-{student.admission_no or student.id.hex[:8]}-{month_name[:3].upper()}{year_num}"
                }
            )
        except Exception:
            pass

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        student = None
        # 1. Try UUID lookup
        try:
            student = Student.objects.filter(id=pk).first()
        except Exception:
            pass
        # 2. Try admission_no lookup
        if not student and pk:
            student = Student.objects.filter(admission_no__iexact=str(pk).strip()).first()
        # 3. Try name lookup if passed
        if not student and pk:
            student = Student.objects.filter(name__iexact=str(pk).strip()).first()

        if student:
            student_name = student.name
            student.delete()
            return Response({'message': f'Cadet {student_name} permanently deleted from database.'}, status=status.HTTP_204_NO_CONTENT)
        
        return Response({'message': 'Cadet record already removed.'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='promote')
    def promote(self, request, pk=None):
        import random
        from datetime import date
        from rest_framework import status
        from rest_framework.response import Response

        student = self.get_object()
        target_belt = request.data.get('target_belt')
        exam_date = request.data.get('exam_date') or str(date.today())
        examiner = request.data.get('examiner', 'Sensei Abdul Rahman (5th Dan)')
        remarks = request.data.get('remarks', 'Promoted via Academy Portal')
        certificate_no = request.data.get('certificate_no') or f"CERT-{student.admission_no}-{random.randint(1000, 9999)}"

        if not target_belt:
            return Response({'error': 'target_belt is required'}, status=status.HTTP_400_BAD_REQUEST)

        previous_belt = student.current_belt
        student.current_belt = target_belt
        student.save()

        from belt_grading.models import BeltGrading
        from belt_grading.serializers import BeltGradingSerializer
        grading = BeltGrading.objects.create(
            student=student,
            previous_belt=previous_belt,
            target_belt=target_belt,
            exam_date=exam_date,
            result='Pass',
            examiner=examiner,
            certificate_no=certificate_no,
            remarks=remarks
        )

        return Response({
            'message': f"Cadet {student.name} promoted successfully to {target_belt}!",
            'student': StudentSerializer(student).data,
            'grading_record': BeltGradingSerializer(grading).data
        }, status=status.HTTP_200_OK)



