from django.contrib import admin
from .models import FeeRecord

@admin.register(FeeRecord)
class FeeRecordAdmin(admin.ModelAdmin):
    list_display = ('receipt_no', 'student', 'month', 'year', 'amount', 'paid_amount', 'pending_amount', 'status', 'payment_date')
    list_filter = ('status', 'month', 'year', 'payment_method')
    search_fields = ('receipt_no', 'student__name', 'student__admission_no')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
