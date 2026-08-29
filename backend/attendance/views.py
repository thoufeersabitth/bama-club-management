import uuid
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer
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
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        std_val = data.get('student')
        date_val = data.get('date')
        status_val = str(data.get('status', 'Present')).capitalize()
        if status_val not in ['Present', 'Absent', 'Late', 'Leave']:
            status_val = 'Present'

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

        branch_obj = None
        branch_val = data.get('branch')
        if branch_val:
            try:
                branch_obj = Branch.objects.filter(id=branch_val).first()
            except Exception:
                pass
            if not branch_obj:
                branch_obj = Branch.objects.filter(name__icontains=str(branch_val)).first()

        if not branch_obj:
            branch_obj = std_obj.branch or Branch.objects.first()

        record, created = AttendanceRecord.objects.update_or_create(
            student=std_obj,
            date=date_val,
            defaults={
                'branch': branch_obj,
                'status': status_val,
                'marked_by': data.get('marked_by', 'Sensei Master'),
                'remarks': data.get('remarks', '')
            }
        )

        serializer = self.get_serializer(record)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        date_val = request.data.get('date')
        records = request.data.get('records', {})
        marked_by = request.data.get('marked_by', 'Sensei Master')

        if not date_val:
            return Response({'error': 'Date is required'}, status=status.HTTP_400_BAD_REQUEST)

        saved_count = 0
        for std_key, stat in records.items():
            stat_clean = str(stat).capitalize()
            if stat_clean not in ['Present', 'Absent', 'Late', 'Leave']:
                stat_clean = 'Present'

            std_obj = None
            try:
                std_obj = Student.objects.filter(id=std_key).first()
            except Exception:
                pass
            if not std_obj:
                std_obj = Student.objects.filter(admission_no__iexact=str(std_key)).first()
            if not std_obj:
                std_obj = Student.objects.filter(name__icontains=str(std_key)).first()

            if std_obj:
                branch_obj = std_obj.branch or Branch.objects.first()
                AttendanceRecord.objects.update_or_create(
                    student=std_obj,
                    date=date_val,
                    defaults={
                        'branch': branch_obj,
                        'status': stat_clean,
                        'marked_by': marked_by
                    }
                )
                saved_count += 1

        return Response({'success': True, 'saved_count': saved_count})


