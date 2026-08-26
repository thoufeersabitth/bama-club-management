from django.contrib import admin
from .models import BeltGrading

@admin.register(BeltGrading)
class BeltGradingAdmin(admin.ModelAdmin):
    list_display = ('student', 'previous_belt', 'target_belt', 'exam_date', 'result', 'certificate_no', 'examiner')
    list_filter = ('result', 'target_belt', 'exam_date')
    search_fields = ('student__name', 'certificate_no', 'examiner')
    ordering = ('-exam_date',)
