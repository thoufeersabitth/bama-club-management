from django.contrib import admin
from .models import Student

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('admission_no', 'name', 'current_belt', 'branch', 'phone', 'fee_amount', 'fee_status', 'status')
    list_filter = ('status', 'current_belt', 'fee_status', 'branch', 'gender')
    search_fields = ('admission_no', 'name', 'guardian_name', 'phone', 'whatsapp')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
