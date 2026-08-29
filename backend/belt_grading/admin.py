from django.contrib import admin
from .models import BeltGrading, ExamSchedule, GradingRegistration

@admin.register(BeltGrading)
class BeltGradingAdmin(admin.ModelAdmin):
    list_display = ('student', 'previous_belt', 'target_belt', 'exam_date', 'result', 'certificate_no', 'examiner', 'created_at')
    list_filter = ('result', 'target_belt', 'previous_belt', 'exam_date')
    search_fields = ('student__name', 'certificate_no', 'examiner', 'remarks')
    ordering = ('-exam_date',)

@admin.register(ExamSchedule)
class ExamScheduleAdmin(admin.ModelAdmin):
    list_display = ('exam_name', 'exam_code', 'exam_date', 'venue', 'exam_fee', 'status', 'eligible_belt', 'max_candidates')
    list_filter = ('status', 'exam_date', 'venue')
    search_fields = ('exam_name', 'exam_code', 'venue', 'instructions')
    ordering = ('-exam_date',)

@admin.register(GradingRegistration)
class GradingRegistrationAdmin(admin.ModelAdmin):
    list_display = ('registration_no', 'student_name', 'branch_name', 'current_belt', 'target_belt', 'form_type', 'payment_status', 'exam_status', 'created_at')
    list_filter = ('form_type', 'payment_status', 'exam_status', 'current_belt', 'target_belt', 'branch_name')
    search_fields = ('registration_no', 'student_name', 'admission_no', 'phone', 'whatsapp', 'jka_member_no')
    ordering = ('-created_at',)

