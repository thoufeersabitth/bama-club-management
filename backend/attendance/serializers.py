from rest_framework import serializers, viewsets, permissions
from .models import AttendanceRecord
from students.serializers import StudentSerializer

class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        std_val = data.get('student')
        if std_val:
            from students.models import Student
            from branches.models import Branch
            std_obj = None
            try:
                std_obj = Student.objects.filter(id=std_val).first()
            except Exception:
                pass
            if not std_obj:
                std_obj = Student.objects.filter(admission_no__iexact=str(std_val)).first()
            if not std_obj:
                std_obj = Student.objects.filter(name__icontains=str(std_val)).first()
            
            if std_obj:
                data['student'] = str(std_obj.id)
                if not data.get('branch') or data.get('branch') == 'null':
                    data['branch'] = str(std_obj.branch_id if std_obj.branch else Branch.objects.first().id)
            else:
                head_office = Branch.objects.filter(is_head_office=True).first() or Branch.objects.first()
                if head_office and (not data.get('branch') or data.get('branch') == 'null'):
                    data['branch'] = str(head_office.id)

        status_val = str(data.get('status', 'Present')).capitalize()
        if status_val in ['Present', 'Absent', 'Late', 'Leave']:
            data['status'] = status_val
        else:
            data['status'] = 'Present'

        return super().to_internal_value(data)

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all().order_by('-date')
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        date_param = self.request.query_params.get('date', None)
        branch_id = self.request.query_params.get('branch', None)
        student_id = self.request.query_params.get('student', None)

        if date_param:
            queryset = queryset.filter(date=date_param)
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset
