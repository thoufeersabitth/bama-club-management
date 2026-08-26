from rest_framework import serializers
from .models import FeeRecord, FeeRateHistory, FeeConfiguration
from students.serializers import StudentSerializer

class FeeRateHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeRateHistory
        fields = '__all__'

class FeeConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeConfiguration
        fields = '__all__'

class FeeRecordSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)

    class Meta:
        model = FeeRecord
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        std_val = data.get('student')
        if std_val:
            from students.models import Student
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

        status_val = str(data.get('status', 'Unpaid')).capitalize()
        if status_val in ['Paid', 'Unpaid', 'Partial']:
            data['status'] = status_val
        elif status_val == 'Pending':
            data['status'] = 'Unpaid'

        return super().to_internal_value(data)
