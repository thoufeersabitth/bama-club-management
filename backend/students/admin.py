from django.contrib import admin
from .models import Student

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        'admission_no', 'name', 'current_belt', 'branch', 'shift', 
        'fee_frequency', 'fee_amount', 'initial_paid_amount', 'pending_amount', 
        'admission_fee', 'admission_fee_paid', 'fee_status', 'status', 'phone'
    )
    list_filter = ('fee_frequency', 'status', 'current_belt', 'fee_status', 'admission_fee_paid', 'branch', 'gender')
    search_fields = ('admission_no', 'name', 'guardian_name', 'phone', 'whatsapp', 'address')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('admission_no', 'name', 'photo', 'dob', 'age', 'gender', 'blood_group', 'status', 'joining_date')
        }),
        ('Parent / Guardian Contact', {
            'fields': ('guardian_name', 'relationship', 'phone', 'whatsapp', 'address')
        }),
        ('Martial Arts & Dojo', {
            'fields': ('branch', 'shift', 'current_belt', 'attendance_rate')
        }),
        ('Financial & Billing Settings', {
            'fields': (
                'fee_frequency', 'fee_amount', 'initial_paid_amount', 'pending_amount', 
                'admission_fee', 'admission_fee_paid_amount', 'admission_fee_paid', 
                'fee_status', 'paid_months'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

