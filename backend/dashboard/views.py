from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count
from datetime import date
from students.models import Student
from branches.models import Branch
from attendance.models import AttendanceRecord
from fees.models import FeeRecord
from belt_grading.models import BeltGrading

class SummaryStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = date.today()
        branch_param = request.query_params.get('branch', None) or request.query_params.get('branch_id', None)
        user = request.user if request.user and request.user.is_authenticated else None

        students_qs = Student.objects.all()
        attendance_qs = AttendanceRecord.objects.all()
        fees_qs = FeeRecord.objects.all()

        target_branch = None
        if user and getattr(user, 'role', None) in ['BRANCH_ADMIN', 'INSTRUCTOR', 'STAFF'] and not getattr(user, 'is_super_admin', False):
            target_branch = user.assigned_branch
        elif branch_param and str(branch_param).lower() != 'all':
            import uuid
            try:
                b_uuid = uuid.UUID(str(branch_param).strip())
                target_branch = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                target_branch = Branch.objects.filter(code__iexact=str(branch_param).strip()).first() or Branch.objects.filter(name__icontains=str(branch_param).strip()).first()

        if target_branch:
            students_qs = students_qs.filter(branch=target_branch)
            attendance_qs = attendance_qs.filter(branch=target_branch)
            fees_qs = fees_qs.filter(student__branch=target_branch)

        total_students = students_qs.count()
        active_students = students_qs.filter(status='Active').count()
        branch_count = 1 if target_branch else Branch.objects.count()

        # Attendance stats
        today_attendance = attendance_qs.filter(date=today)
        present_count = today_attendance.filter(status='Present').count()
        absent_count = today_attendance.filter(status='Absent').count()
        attendance_rate = round((present_count / total_students * 100), 1) if total_students > 0 else 100.0

        # Financial stats
        total_collection = fees_qs.aggregate(total=Sum('paid_amount'))['total'] or 0.00
        pending_fees = fees_qs.filter(status__in=['Unpaid', 'Partial']).aggregate(total=Sum('pending_amount'))['total'] or 0.00

        # Belt Distribution
        belt_counts = list(students_qs.values('current_belt').annotate(count=Count('id')))

        # Branch breakdown
        branch_counts = list(Branch.objects.values('name').annotate(student_count=Count('students')))

        return Response({
            'totalStudents': total_students,
            'activeStudents': active_students,
            'branchCount': branch_count,
            'todaysAttendanceRate': attendance_rate,
            'todaysAbsentCount': absent_count,
            'monthlyCollection': float(total_collection),
            'pendingFeesAmount': float(pending_fees),
            'upcomingBeltExams': 0,
            'beltDistribution': belt_counts,
            'branchDistribution': branch_counts
        })
