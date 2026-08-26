from django.contrib import admin
from .models import Branch

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'branch_head', 'phone', 'is_head_office', 'status')
    list_filter = ('is_head_office', 'status')
    search_fields = ('name', 'code', 'branch_head', 'phone', 'email')
    readonly_fields = ('created_at', 'updated_at')
