import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class UserRole(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
    BRANCH_ADMIN = 'BRANCH_ADMIN', 'Branch Admin'
    INSTRUCTOR = 'INSTRUCTOR', 'Instructor'

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.SUPER_ADMIN)
    phone = models.CharField(max_length=20, blank=True, null=True)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    assigned_branch_id = models.CharField(max_length=100, blank=True, null=True, help_text="Assigned branch code/id")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def assigned_branch(self):
        if not self.assigned_branch_id:
            return None
        from branches.models import Branch
        try:
            b_uuid = uuid.UUID(str(self.assigned_branch_id).strip())
            b_obj = Branch.objects.filter(id=b_uuid).first()
            if b_obj:
                return b_obj
        except (ValueError, TypeError, AttributeError):
            pass
        return Branch.objects.filter(code__iexact=str(self.assigned_branch_id).strip()).first() or Branch.objects.filter(name__icontains=str(self.assigned_branch_id).strip()).first()

    @property
    def is_super_admin(self):
        return self.is_superuser or self.role == UserRole.SUPER_ADMIN

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

