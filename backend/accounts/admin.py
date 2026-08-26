from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'assigned_branch_id', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('B.A.M.A. Custom Fields', {'fields': ('role', 'phone', 'whatsapp', 'assigned_branch_id')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('B.A.M.A. Custom Fields', {'fields': ('role', 'phone', 'whatsapp', 'assigned_branch_id')}),
    )
