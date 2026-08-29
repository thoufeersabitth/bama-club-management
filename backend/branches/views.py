from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Branch
from .serializers import BranchSerializer

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all().order_by('-is_head_office', 'name')
    serializer_class = BranchSerializer
    permission_classes = [permissions.AllowAny]

    def _ensure_defaults(self):
        defaults = [
            {
                'name': 'Pulikkal Branch (Head Office)',
                'code': 'PLK-01',
                'address': 'Main Road, Pulikkal, Malappuram, Kerala - 673637',
                'phone': '+91 95440 85442',
                'whatsapp': '+91 95440 85442',
                'email': 'pulikkal@bama.in',
                'branch_head': 'Sensei Abdul Rahman (5th Dan)',
                'is_head_office': True,
                'timings': 'Mon, Wed, Fri: 5:00 PM - 7:00 PM | Sat & Sun: 7:00 AM - 9:00 AM',
                'status': 'Active'
            },
            {
                'name': 'Chungam Branch Dojo',
                'code': 'CGM-02',
                'address': 'Main Road Junction, Chungam, Malappuram, Kerala - 673638',
                'phone': '+91 95440 85442',
                'whatsapp': '+91 95440 85442',
                'email': 'chungam@bama.in',
                'branch_head': 'Sensei Rahul Kumar (3rd Dan)',
                'is_head_office': False,
                'timings': 'Tue, Thu, Sat: 5:30 PM - 7:30 PM',
                'status': 'Active'
            },
            {
                'name': 'Mongam Branch Dojo',
                'code': 'MNG-03',
                'address': 'Dojo Complex, Near Bus Stand, Mongam, Malappuram, Kerala - 673642',
                'phone': '+91 98471 22334',
                'whatsapp': '+91 98471 22334',
                'email': 'mongam@bama.in',
                'branch_head': 'Sensei Muhammed Haneen (2nd Dan)',
                'is_head_office': False,
                'timings': 'Mon, Wed, Fri: 6:00 AM - 7:30 AM & 4:30 PM - 6:30 PM',
                'status': 'Active'
            },
            {
                'name': 'Feroke Branch',
                'code': 'FRK-04',
                'address': 'Station Road, Near Town Hall, Feroke, Kozhikode, Kerala - 673631',
                'phone': '+91 94462 88990',
                'whatsapp': '+91 94462 88990',
                'email': 'feroke@bama.in',
                'branch_head': 'Sensei Rajesh Kumar (4th Dan)',
                'is_head_office': False,
                'timings': 'Sat & Sun: 7:00 AM - 9:30 AM & 4:00 PM - 6:00 PM',
                'status': 'Active'
            }
        ]
        for b_data in defaults:
            code = b_data['code']
            name = b_data['name']
            obj = Branch.objects.filter(code=code).first() or Branch.objects.filter(name__icontains=name[:6]).first()
            if not obj:
                Branch.objects.create(**b_data)

    def get_queryset(self):
        if Branch.objects.count() < 4:
            self._ensure_defaults()
        return Branch.objects.all().order_by('-is_head_office', 'name')

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        code_val = data.get('code')
        name_val = data.get('name')
        
        branch_obj = None
        if code_val:
            branch_obj = Branch.objects.filter(code__iexact=str(code_val).strip()).first()
        if not branch_obj and name_val:
            branch_obj = Branch.objects.filter(name__iexact=str(name_val).strip()).first()

        if branch_obj:
            serializer = self.get_serializer(branch_obj, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get', 'post'], url_path='sync_defaults')
    def sync_defaults(self, request):
        self._ensure_defaults()
        branches = Branch.objects.all().order_by('-is_head_office', 'name')
        serializer = self.get_serializer(branches, many=True)
        return Response({'status': 'success', 'branches': serializer.data})

