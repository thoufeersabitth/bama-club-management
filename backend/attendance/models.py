import uuid
from django.db import models
from students.models import Student
from branches.models import Branch

class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ('Present', 'Present'),
        ('Absent', 'Absent'),
        ('Late', 'Late'),
        ('Leave', 'Leave')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Present')
    marked_by = models.CharField(max_length=255, default='Instructor')
    remarks = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'date')

    def __str__(self):
        return f"{self.student.name} - {self.date} ({self.status})"

class BranchDayStatus(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True, related_name='day_statuses')
    date = models.DateField()
    status = models.CharField(max_length=20, default='CLASS')  # 'CLASS' or 'HOLIDAY'
    reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('branch', 'date')

    def __str__(self):
        b_name = self.branch.name if self.branch else 'All Branches'
        return f"{b_name} - {self.date} ({self.status}: {self.reason})"

