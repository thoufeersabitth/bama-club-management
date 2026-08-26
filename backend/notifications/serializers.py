from rest_framework import serializers, viewsets, permissions
from .models import WhatsAppLog

class WhatsAppLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppLog
        fields = '__all__'

class WhatsAppLogViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppLog.objects.all().order_by('-sent_at')
    serializer_class = WhatsAppLogSerializer
    permission_classes = [permissions.AllowAny]
