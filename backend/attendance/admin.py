from django.contrib import admin
from .models import AttendanceRecord

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('student', 'branch', 'date', 'status', 'marked_by', 'remarks')
    list_filter = ('status', 'date', 'branch')
    search_fields = ('student__name', 'student__admission_no', 'marked_by', 'remarks')
    ordering = ('-date',)
