from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import FeeRecord, FeeRateHistory, FeeConfiguration, FeeType
from .serializers import FeeRecordSerializer, FeeRateHistorySerializer, FeeConfigurationSerializer
from .services import (
    get_applicable_monthly_fee,
    get_applicable_admission_fee,
    set_new_fee_rate,
    generate_monthly_invoice,
    parse_billing_date
)
from students.models import Student

class FeeRecordViewSet(viewsets.ModelViewSet):
    queryset = FeeRecord.objects.all().order_by('-year', '-created_at')
    serializer_class = FeeRecordSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = FeeRecord.objects.all().select_related('student', 'student__branch').order_by('-year', '-created_at')
        
        # Auto-populate if empty and students exist
        if not queryset.exists() and Student.objects.exists():
            self._sync_cadets_fee_records()
            queryset = FeeRecord.objects.all().select_related('student', 'student__branch').order_by('-year', '-created_at')

        status_param = self.request.query_params.get('status', None)
        student_id = self.request.query_params.get('student', None)
        month_param = self.request.query_params.get('month', None)
        year_param = self.request.query_params.get('year', None)
        branch_param = self.request.query_params.get('branch', None) or self.request.query_params.get('branch_id', None)

        user = self.request.user if self.request.user and self.request.user.is_authenticated else None

        if user and getattr(user, 'role', None) in ['BRANCH_ADMIN', 'INSTRUCTOR', 'STAFF'] and not getattr(user, 'is_super_admin', False):
            target_branch = user.assigned_branch
            if target_branch:
                queryset = queryset.filter(student__branch=target_branch)
            elif user.assigned_branch_id:
                queryset = queryset.filter(student__branch_id=user.assigned_branch_id)
        elif branch_param and str(branch_param).lower() != 'all':
            from branches.models import Branch
            import uuid
            target_b = None
            try:
                b_uuid = uuid.UUID(str(branch_param).strip())
                target_b = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                target_b = Branch.objects.filter(code__iexact=str(branch_param).strip()).first() or Branch.objects.filter(name__icontains=str(branch_param).strip()).first()
            if target_b:
                queryset = queryset.filter(student__branch=target_b)

        if status_param:
            queryset = queryset.filter(status=status_param)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if month_param:
            queryset = queryset.filter(month__iexact=month_param)
        if year_param:
            queryset = queryset.filter(year=int(year_param))
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        std_val = data.get('student') or data.get('student_id')
        std_obj = None
        if std_val:
            try:
                std_obj = Student.objects.filter(id=std_val).first()
            except Exception:
                pass
            if not std_obj:
                std_obj = Student.objects.filter(admission_no__iexact=str(std_val)).first()
            if not std_obj:
                std_obj = Student.objects.filter(name__icontains=str(std_val)).first()

        if not std_obj:
            return Response({'error': 'Student not found'}, status=status.HTTP_400_BAD_REQUEST)

        month_val = data.get('month', 'August')
        year_val = int(data.get('year', 2026))
        amount_val = Decimal(str(data.get('amount', std_obj.fee_amount or 500)))
        paid_val = Decimal(str(data.get('paid_amount', 0)))
        pending_val = max(Decimal('0.00'), amount_val - paid_val)
        receipt_val = data.get('receipt_no') or f"REC-{int(timezone.now().timestamp())}"
        payment_method = data.get('payment_method', 'Cash')
        payment_date = data.get('payment_date') or timezone.now().date()

        fee_status = 'Paid' if pending_val == Decimal('0.00') else ('Partial' if paid_val > 0 else 'Unpaid')

        fee_record, created = FeeRecord.objects.update_or_create(
            student=std_obj,
            month=month_val,
            year=year_val,
            defaults={
                'amount': amount_val,
                'paid_amount': paid_val,
                'pending_amount': pending_val,
                'status': fee_status,
                'receipt_no': receipt_val,
                'payment_method': payment_method,
                'payment_date': payment_date
            }
        )

        if fee_status == 'Paid':
            existing_paid = list(std_obj.paid_months or [])
            month_year_key = f"{month_val} {year_val}"
            if month_year_key not in existing_paid and month_val not in existing_paid:
                existing_paid.append(month_year_key)
                std_obj.paid_months = existing_paid
                std_obj.save(update_fields=['paid_months'])

        serializer = self.get_serializer(fee_record)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def _sync_cadets_fee_records(self):
        now = timezone.now()
        month_name = now.strftime('%B')
        year_num = now.year
        created_count = 0
        for std in Student.objects.all():
            fee_amt = Decimal(str(std.fee_amount or 500))
            init_paid = Decimal(str(std.initial_paid_amount or 0))
            pending = max(Decimal('0.00'), fee_amt - init_paid)
            f_status = 'Paid' if pending == Decimal('0.00') else ('Partial' if init_paid > 0 else 'Unpaid')
            
            rec, was_created = FeeRecord.objects.get_or_create(
                student=std,
                month=month_name,
                year=year_num,
                defaults={
                    'amount': fee_amt,
                    'paid_amount': init_paid,
                    'pending_amount': pending,
                    'status': f_status,
                    'receipt_no': f"REC-{std.admission_no or std.id.hex[:8]}-{month_name[:3].upper()}{year_num}"
                }
            )
            if was_created:
                created_count += 1
        return created_count

    @action(detail=False, methods=['get', 'post'], url_path='sync_all_students')
    def sync_all_students(self, request):
        count = self._sync_cadets_fee_records()
        return Response({'status': 'success', 'synced_fee_records': count})



class FeeRateHistoryViewSet(viewsets.ModelViewSet):
    queryset = FeeRateHistory.objects.all().order_by('-effective_from', '-created_at')
    serializer_class = FeeRateHistorySerializer
    permission_classes = [permissions.AllowAny]

class FeeSettingsAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        config = FeeConfiguration.objects.first()
        if not config:
            config = FeeConfiguration.objects.create(
                default_monthly_fee=Decimal('500.00'),
                default_admission_fee=Decimal('1000.00'),
                effective_month='August 2026'
            )
        history = FeeRateHistory.objects.filter(is_active=True).order_by('-effective_from')
        return Response({
            'configuration': FeeConfigurationSerializer(config).data,
            'rate_history': FeeRateHistorySerializer(history, many=True).data
        })

    def post(self, request):
        default_monthly = request.data.get('default_monthly_fee')
        default_admission = request.data.get('default_admission_fee')
        effective_month = request.data.get('effective_month', 'August 2026')
        effective_from = request.data.get('effective_from')

        if not effective_from:
            effective_date = parse_billing_date(effective_month)
        else:
            effective_date = parse_billing_date(effective_from)

        try:
            if default_monthly is not None:
                set_new_fee_rate(
                    fee_type=FeeType.MONTHLY,
                    amount=default_monthly,
                    effective_from=effective_date,
                    note=f"Configured for {effective_month}"
                )
            if default_admission is not None:
                set_new_fee_rate(
                    fee_type=FeeType.ADMISSION,
                    amount=default_admission,
                    effective_from=date.today(),
                    note=f"Configured for {effective_month}"
                )

            config = FeeConfiguration.objects.first()
            if not config:
                config = FeeConfiguration.objects.create(
                    default_monthly_fee=Decimal(str(default_monthly or 500)),
                    default_admission_fee=Decimal(str(default_admission or 1000)),
                    effective_month=effective_month
                )
            else:
                if default_monthly is not None:
                    config.default_monthly_fee = Decimal(str(default_monthly))
                if default_admission is not None:
                    config.default_admission_fee = Decimal(str(default_admission))
                config.effective_month = effective_month
                config.save()

            history = FeeRateHistory.objects.filter(is_active=True).order_by('-effective_from')

            return Response({
                'message': 'Fee configuration updated successfully',
                'configuration': FeeConfigurationSerializer(config).data,
                'rate_history': FeeRateHistorySerializer(history, many=True).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ApplicableRateAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        month = request.query_params.get('month', 'August')
        year = request.query_params.get('year', 2026)
        branch_param = request.query_params.get('branch', None) or request.query_params.get('branch_id', None)
        
        monthly_fee = get_applicable_monthly_fee(month, year, branch=branch_param)
        admission_fee = get_applicable_admission_fee(branch=branch_param)

        config = FeeConfiguration.objects.first()
        if config:
            if config.default_admission_fee and (not branch_param or str(branch_param).lower() in ['all', 'none']):
                admission_fee = config.default_admission_fee
            if config.default_monthly_fee and (not branch_param or str(branch_param).lower() in ['all', 'none']):
                monthly_fee = config.default_monthly_fee

        return Response({
            'month': month,
            'year': int(year),
            'branch': branch_param,
            'applicable_monthly_fee': float(monthly_fee),
            'applicable_admission_fee': float(admission_fee)
        })

class GenerateInvoiceAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        student_id = request.data.get('student_id')
        month = request.data.get('month', 'August')
        year = request.data.get('year', 2026)

        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        invoice, created = generate_monthly_invoice(student, month, year)
        return Response({
            'message': 'Invoice generated' if created else 'Existing invoice retrieved',
            'created': created,
            'invoice': FeeRecordSerializer(invoice).data
        }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

