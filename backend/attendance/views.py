import uuid
from rest_framework import viewsets, permissions
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer
from branches.models import Branch

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

