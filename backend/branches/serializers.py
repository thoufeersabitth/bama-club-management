from rest_framework import serializers, viewsets, permissions
from .models import Branch

class BranchSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = '__all__'

    def get_student_count(self, obj):
        return obj.students.count() if hasattr(obj, 'students') else 0

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all().order_by('-is_head_office', 'name')
    serializer_class = BranchSerializer
    permission_classes = [permissions.AllowAny]
