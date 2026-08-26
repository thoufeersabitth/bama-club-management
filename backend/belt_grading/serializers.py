from rest_framework import serializers
from .models import BeltGrading, ExamSchedule, GradingRegistration
from .services import get_exam_form_type
from students.serializers import StudentSerializer

class BeltGradingSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)

    class Meta:
        model = BeltGrading
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

        res_val = str(data.get('result', 'Pass')).capitalize()
        if res_val in ['Pass', 'Fail', 'Pending']:
            data['result'] = res_val
        else:
            data['result'] = 'Pass'

        return super().to_internal_value(data)


class ExamScheduleSerializer(serializers.ModelSerializer):
    total_registered = serializers.SerializerMethodField()
    form_type = serializers.SerializerMethodField()

    class Meta:
        model = ExamSchedule
        fields = '__all__'

    def get_total_registered(self, obj):
        return obj.registrations.count()

    def get_form_type(self, obj):
        return get_exam_form_type(obj.target_belt or obj.eligible_belt)


class GradingRegistrationSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)
    exam_schedule_detail = ExamScheduleSerializer(source='exam_schedule', read_only=True)

    class Meta:
        model = GradingRegistration
        fields = '__all__'

    def validate(self, attrs):
        # Automatically determine form_type based on target_belt or current_belt if not explicit
        target = attrs.get('target_belt') or attrs.get('current_belt')
        if target:
            attrs['form_type'] = get_exam_form_type(target)
        
        exam_sched = attrs.get('exam_schedule')
        if exam_sched and not attrs.get('applied_fee'):
            attrs['applied_fee'] = exam_sched.exam_fee
            attrs['exam_fee'] = exam_sched.exam_fee

        return attrs
