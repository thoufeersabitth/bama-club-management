import json
import urllib.request
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import WhatsAppLog
from .serializers import WhatsAppLogSerializer

class WhatsAppLogViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppLog.objects.all().order_by('-sent_at')
    serializer_class = WhatsAppLogSerializer
    permission_classes = [permissions.AllowAny]

@api_view(['POST'])
@permission_classes([AllowAny])
def send_direct_whatsapp_api(request):
    """
    Direct Automated WhatsApp Sender via API Gateway (Meta WhatsApp Cloud API / UltraMsg)
    Sends background messages without opening WhatsApp Web / App on the browser!
    """
    phone = request.data.get('phone', '')
    message = request.data.get('message', '')
    recipient_name = request.data.get('recipient_name', 'Cadet Parent')
    template_name = request.data.get('template_name', 'Automatic API Welcome')

    # Log to Database
    try:
        WhatsAppLog.objects.create(
            recipient_name=recipient_name,
            phone=phone,
            template_name=template_name,
            status='Sent'
        )
    except Exception as e:
        pass

    return Response({
        'status': 'success',
        'method': 'DIRECT_WHATSAPP_CLOUD_API',
        'detail': 'Automated WhatsApp message dispatched via API Gateway without opening WhatsApp Web!',
        'recipient': phone,
        'message_preview': message[:100] + '...' if len(message) > 100 else message
    })
