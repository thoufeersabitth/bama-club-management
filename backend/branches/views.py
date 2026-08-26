from rest_framework import viewsets, permissions
from .models import Branch
from .serializers import BranchSerializer

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all().order_by('-is_head_office', 'name')
    serializer_class = BranchSerializer
    permission_classes = [permissions.AllowAny]
