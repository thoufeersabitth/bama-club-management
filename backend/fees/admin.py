from django.contrib import admin
from .models import FeeRecord, FeeRateHistory, FeeConfiguration

@admin.register(FeeRecord)
class FeeRecordAdmin(admin.ModelAdmin):
    list_display = ('receipt_no', 'student', 'month', 'year', 'amount', 'paid_amount', 'pending_amount', 'status', 'payment_method', 'payment_date')
    list_filter = ('status', 'month', 'year', 'payment_method', 'created_at')
    search_fields = ('receipt_no', 'student__name', 'student__admission_no')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

@admin.register(FeeRateHistory)
class FeeRateHistoryAdmin(admin.ModelAdmin):
    list_display = ('fee_type', 'amount', 'effective_from', 'effective_to', 'is_active', 'note', 'created_at')
    list_filter = ('fee_type', 'is_active', 'effective_from')
    search_fields = ('note',)
    ordering = ('-effective_from',)

@admin.register(FeeConfiguration)
class FeeConfigurationAdmin(admin.ModelAdmin):
    list_display = ('default_monthly_fee', 'default_admission_fee', 'effective_month', 'apply_to_existing_cadets', 'updated_at')

