from rest_framework import serializers
from .models import AttendanceRecord, BranchDayStatus
from students.serializers import StudentSerializer
from branches.serializers import BranchSerializer

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

class BranchDayStatusSerializer(serializers.ModelSerializer):
    branch_detail = BranchSerializer(source='branch', read_only=True)

    class Meta:
        model = BranchDayStatus
        fields = '__all__'

