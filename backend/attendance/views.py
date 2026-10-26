import uuid
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AttendanceRecord, BranchDayStatus
from .serializers import AttendanceRecordSerializer, BranchDayStatusSerializer
from branches.models import Branch
from students.models import Student

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all().order_by('-date')
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = AttendanceRecord.objects.all().select_related('student', 'branch').order_by('-date')
        date_param = self.request.query_params.get('date', None)
        branch_param = self.request.query_params.get('branch', None) or self.request.query_params.get('branch_id', None)
        student_id = self.request.query_params.get('student', None)

        user = self.request.user if self.request.user and self.request.user.is_authenticated else None

        if user and getattr(user, 'role', None) in ['BRANCH_ADMIN', 'INSTRUCTOR', 'STAFF'] and not getattr(user, 'is_super_admin', False):
            target_branch = user.assigned_branch
            if target_branch:
                queryset = queryset.filter(branch=target_branch)
            elif user.assigned_branch_id:
                queryset = queryset.filter(branch_id=user.assigned_branch_id)
        elif branch_param and str(branch_param).lower() != 'all':
            target_b = None
            try:
                b_uuid = uuid.UUID(str(branch_param).strip())
                target_b = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                target_b = Branch.objects.filter(code__iexact=str(branch_param).strip()).first() or Branch.objects.filter(name__icontains=str(branch_param).strip()).first()
            if target_b:
                queryset = queryset.filter(branch=target_b)

        if date_param:
            queryset = queryset.filter(date=date_param)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset

    def create(self, request, *args, **kwargs):
        """Resilient single create with automatic update_or_create to prevent unique_together crash."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        student = validated_data['student']
        date_val = validated_data['date']

        record, created = AttendanceRecord.objects.update_or_create(
            student=student,
            date=date_val,
            defaults={
                'branch': validated_data.get('branch'),
                'status': validated_data.get('status', 'Present'),
                'marked_by': validated_data.get('marked_by', 'Instructor'),
                'remarks': validated_data.get('remarks', '')
            }
        )
        return Response(self.get_serializer(record).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        """
        High-performance atomic bulk save & update for an entire branch or dojo batch.
        Saves day status (Holiday / Class) AND all cadet attendance in a single transaction.
        """
        data = request.data
        date_str = data.get('date')
        records = data.get('records', {})  # { student_id_or_adm_no: status }
        branch_param = data.get('branch')
        marked_by = data.get('marked_by', 'Sensei Master')
        day_status = data.get('day_status', 'CLASS')  # 'CLASS' or 'HOLIDAY'
        holiday_reason = data.get('holiday_reason', '')
        apply_all_branches = data.get('apply_all_branches', False)

        if not date_str:
            return Response({'error': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve target branch if provided
        target_branch = None
        if branch_param and str(branch_param).lower() != 'all':
            try:
                b_uuid = uuid.UUID(str(branch_param).strip())
                target_branch = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                target_branch = Branch.objects.filter(code__iexact=str(branch_param).strip()).first() or Branch.objects.filter(name__icontains=str(branch_param).strip()).first()

        saved_count = 0
        with transaction.atomic():
            # 1. Save Branch Day Status (Holiday or Class)
            if apply_all_branches:
                # Set for all branches (branch=None represents global)
                BranchDayStatus.objects.update_or_create(
                    branch=None,
                    date=date_str,
                    defaults={'status': day_status, 'reason': holiday_reason or ''}
                )
            else:
                # Branch-specific day status
                BranchDayStatus.objects.update_or_create(
                    branch=target_branch,
                    date=date_str,
                    defaults={'status': day_status, 'reason': holiday_reason or ''}
                )

            # 2. If it's a CLASS day, upsert student records
            if day_status != 'HOLIDAY' and records:
                for student_key, raw_stat in records.items():
                    std_obj = None
                    try:
                        std_uuid = uuid.UUID(str(student_key).strip())
                        std_obj = Student.objects.filter(id=std_uuid).first()
                    except (ValueError, TypeError, AttributeError):
                        pass
                    if not std_obj:
                        std_obj = Student.objects.filter(admission_no__iexact=str(student_key).strip()).first()
                    if not std_obj:
                        std_obj = Student.objects.filter(name__iexact=str(student_key).strip()).first()

                    if not std_obj:
                        continue

                    cadet_branch = target_branch or std_obj.branch or Branch.objects.filter(is_head_office=True).first() or Branch.objects.first()
                    formatted_stat = str(raw_stat or 'Present').capitalize()
                    if formatted_stat not in ['Present', 'Absent', 'Late', 'Leave']:
                        formatted_stat = 'Present'

                    AttendanceRecord.objects.update_or_create(
                        student=std_obj,
                        date=date_str,
                        defaults={
                            'branch': cadet_branch,
                            'status': formatted_stat,
                            'marked_by': marked_by
                        }
                    )
                    saved_count += 1

        return Response({
            'success': True,
            'date': date_str,
            'branch': target_branch.name if target_branch else 'All Branches',
            'day_status': day_status,
            'holiday_reason': holiday_reason,
            'saved_records': saved_count
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'post'], url_path='day-status')
    def day_status(self, request):
        """Get or set day status (CLASS / HOLIDAY) for a specific branch or all branches."""
        if request.method == 'POST':
            date_str = request.data.get('date')
            branch_param = request.data.get('branch')
            status_val = request.data.get('status', 'CLASS')
            reason = request.data.get('reason', '')
            apply_all = request.data.get('apply_all_branches', False)

            if not date_str:
                return Response({'error': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

            target_b = None
            if not apply_all and branch_param and str(branch_param).lower() != 'all':
                try:
                    b_uuid = uuid.UUID(str(branch_param).strip())
                    target_b = Branch.objects.filter(id=b_uuid).first()
                except (ValueError, TypeError, AttributeError):
                    target_b = Branch.objects.filter(code__iexact=str(branch_param).strip()).first() or Branch.objects.filter(name__icontains=str(branch_param).strip()).first()

            obj, _ = BranchDayStatus.objects.update_or_create(
                branch=target_b if not apply_all else None,
                date=date_str,
                defaults={'status': status_val, 'reason': reason}
            )
            return Response(BranchDayStatusSerializer(obj).data, status=status.HTTP_200_OK)

        # GET request
        date_str = request.query_params.get('date')
        branch_param = request.query_params.get('branch')
        if not date_str:
            return Response({'error': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        target_b = None
        if branch_param and str(branch_param).lower() != 'all':
            try:
                b_uuid = uuid.UUID(str(branch_param).strip())
                target_b = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                target_b = Branch.objects.filter(code__iexact=str(branch_param).strip()).first() or Branch.objects.filter(name__icontains=str(branch_param).strip()).first()

        status_obj = None
        if target_b:
            status_obj = BranchDayStatus.objects.filter(branch=target_b, date=date_str).first()
        if not status_obj:
            status_obj = BranchDayStatus.objects.filter(branch__isnull=True, date=date_str).first()

        if status_obj:
            return Response({
                'date': date_str,
                'branch': status_obj.branch.name if status_obj.branch else 'All Branches',
                'status': status_obj.status,
                'reason': status_obj.reason
            })
        return Response({
            'date': date_str,
            'branch': target_b.name if target_b else 'All Branches',
            'status': 'CLASS',
            'reason': ''
        })

    @action(detail=False, methods=['get'], url_path='monthly-statuses')
    def monthly_statuses(self, request):
        """Get all day statuses for a given month prefix (e.g. 2026-10)."""
        month_prefix = request.query_params.get('month', '')
        branch_param = request.query_params.get('branch', '')
        if not month_prefix:
            return Response({'error': 'Month prefix (YYYY-MM) is required.'}, status=status.HTTP_400_BAD_REQUEST)

        target_b = None
        if branch_param and str(branch_param).lower() != 'all':
            try:
                b_uuid = uuid.UUID(str(branch_param).strip())
                target_b = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                target_b = Branch.objects.filter(code__iexact=str(branch_param).strip()).first() or Branch.objects.filter(name__icontains=str(branch_param).strip()).first()

        qs = BranchDayStatus.objects.filter(date__startswith=month_prefix)
        if target_b:
            from django.db.models import Q
            qs = qs.filter(Q(branch=target_b) | Q(branch__isnull=True))

        res = {}
        for item in qs:
            d_str = str(item.date)
            # Branch specific takes precedence over global
            if item.branch is not None or d_str not in res:
                res[d_str] = {
                    'status': item.status,
                    'reason': item.reason,
                    'branch': item.branch.name if item.branch else 'All Branches'
                }
        return Response(res)


