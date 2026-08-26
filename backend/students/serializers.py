import uuid
from rest_framework import serializers
from .models import Student
from branches.models import Branch
from branches.serializers import BranchSerializer

class StudentSerializer(serializers.ModelSerializer):
    branch_detail = BranchSerializer(source='branch', read_only=True)
    branch_name = serializers.SerializerMethodField()
    branch_id = serializers.UUIDField(source='branch.id', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'

    def get_branch_name(self, obj):
        if obj.branch:
            return obj.branch.name
        return "Pulikkal Branch (Head Office)"

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        
        # Strip non-UUID string IDs sent by local storage frontend
        if 'id' in data:
            try:
                uuid.UUID(str(data['id']))
            except (ValueError, TypeError):
                data.pop('id', None)

        branch_val = data.get('branch') or data.get('branch_id') or data.get('branch_name')
        if branch_val:
            branch_obj = None
            
            # 1. Try parsing as UUID primary key
            try:
                b_uuid = uuid.UUID(str(branch_val).strip())
                branch_obj = Branch.objects.filter(id=b_uuid).first()
            except (ValueError, TypeError, AttributeError):
                branch_obj = None
            
            # 2. Try lookup by branch code
            if not branch_obj and isinstance(branch_val, str):
                b_str = branch_val.strip()
                branch_obj = Branch.objects.filter(code__iexact=b_str).first()
            
            # 3. Try lookup by exact name
            if not branch_obj and isinstance(branch_val, str):
                b_str = branch_val.strip()
                branch_obj = Branch.objects.filter(name__iexact=b_str).first()
                
            # 4. Try fuzzy name lookup
            if not branch_obj and isinstance(branch_val, str):
                b_str = branch_val.strip().lower()
                if 'chungam' in b_str or b_str == '2' or 'dojo-02' in b_str:
                    branch_obj = Branch.objects.filter(name__icontains='chungam').first()
                elif 'mongam' in b_str or b_str == '3' or 'dojo-03' in b_str:
                    branch_obj = Branch.objects.filter(name__icontains='mongam').first()
                elif 'feroke' in b_str or b_str == '4':
                    branch_obj = Branch.objects.filter(name__icontains='feroke').first()
                elif 'pulikkal' in b_str or b_str == '1' or 'dojo-01' in b_str:
                    branch_obj = Branch.objects.filter(name__icontains='pulikkal').first()
                else:
                    branch_obj = Branch.objects.filter(name__icontains=b_str).first()
            
            if branch_obj:
                data['branch'] = str(branch_obj.id)
            else:
                head_office = Branch.objects.filter(is_head_office=True).first() or Branch.objects.first()
                if head_office:
                    data['branch'] = str(head_office.id)

        return super().to_internal_value(data)

