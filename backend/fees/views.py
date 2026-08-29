from decimal import Decimal
from rest_framework import viewsets, permissions, status
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

